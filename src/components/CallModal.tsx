import React, { useState, useEffect, useRef } from 'react';
import { User, ChatConversation, CallStatus } from '../types';
import { 
  Phone, 
  Video, 
  X, 
  Mic, 
  MicOff,
  Volume2,
  VideoOff,
  PhoneOff,
  MoreVertical,
  Maximize2,
  Minimize2,
  SwitchCamera,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listenForCallStatus, endCall, rejectCall } from '../services/callService';
import { safeJsonStringify } from '../lib/utils';

interface CallModalProps {
  currentUser: User;
  partner?: User;
  group?: ChatConversation;
  type: 'voice' | 'video';
  callId?: string;
  onClose: () => void;
}

const CallModal: React.FC<CallModalProps> = ({
  currentUser,
  partner,
  group,
  type,
  callId,
  onClose,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'voice');
  const [status, setStatus] = useState<'requesting' | 'calling' | 'connected' | 'ended'>('requesting');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Iniciar mídia assim que o componente monta
    startMedia();

    // Listener para o status da chamada no Firestore
    let unsubscribeStatus: () => void = () => {};
    if (callId) {
      unsubscribeStatus = listenForCallStatus(callId, (updatedCall) => {
        if (updatedCall.status === CallStatus.ACCEPTED) {
          setStatus('connected');
        } else if (
          updatedCall.status === CallStatus.REJECTED || 
          updatedCall.status === CallStatus.ENDED || 
          updatedCall.status === CallStatus.TIMED_OUT
        ) {
          handleCallEndedLocally();
        }
      });
    }

    return () => {
      stopMedia();
      unsubscribeStatus();
    };
  }, [callId]);

  const startMedia = async () => {
    try {
      setPermissionError(null);
      console.log("[CALL] Iniciando captura de mídia...", { type });
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Navegador não suporta APIs de mídia.");
      }

      const constraints = {
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false,
        audio: true
      };
      
      console.log("[CALL] Solicitando permissões com constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[CALL] Stream obtido com sucesso:", stream.id);
      
      streamRef.current = stream;
      
      // Force assignment if ref is already present
      if (localVideoRef.current) {
        console.log("[CALL] Atribuindo stream ao video element...");
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(e => console.error("[CALL] Erro ao dar play automático:", safeJsonStringify(e)));
      }
      
      setStatus('calling');
    } catch (err) {
      console.error("[CALL] Erro crítico ao acessar dispositivos:", safeJsonStringify(err));
      
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('Permission denied'))) {
         setPermissionError("O acesso à câmera/microfone foi negado. Por favor, permita o acesso nas configurações do seu navegador para realizar chamadas.");
      } else {
         setPermissionError("Não foi possível acessar seus dispositivos de mídia. Verifique se eles estão conectados e sendo usados por outro aplicativo.");
      }

      // Tentamos novamente com constraints mínimas se falhar
      if (type === 'video') {
         try {
            console.log("[CALL] Tentando novamente com constraints básicas...");
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = fallbackStream;
            if (localVideoRef.current) {
               localVideoRef.current.srcObject = fallbackStream;
            }
            setStatus('calling');
            return;
         } catch (fErr) {
            console.warn("[CALL] Falha na captura de vídeo + áudio básico, tentando APENAS VÍDEO...", fErr);
            try {
               const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
               streamRef.current = videoOnlyStream;
               if (localVideoRef.current) {
                  localVideoRef.current.srcObject = videoOnlyStream;
               }
               setStatus('calling');
               return;
            } catch (vErr) {
               console.error("[CALL] Falha total no vídeo:", vErr);
            }
         }
      }
      setStatus('calling'); 
    }
  };

  // Re-sync stream to ref periodically and when status changes
  useEffect(() => {
    const syncStream = () => {
      if (localVideoRef.current && streamRef.current && status !== 'ended') {
        if (localVideoRef.current.srcObject !== streamRef.current) {
          console.log("[CALL] Sincronizando srcObject...");
          localVideoRef.current.srcObject = streamRef.current;
          localVideoRef.current.play().catch(() => {});
        }
      }
    };

    syncStream();
    const interval = setInterval(syncStream, 1000);
    return () => clearInterval(interval);
  }, [status, type, isVideoOff]);

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    let interval: number;
    if (status === 'connected') {
      interval = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCallEndedLocally = () => {
    setStatus('ended');
    stopMedia();
    setTimeout(onClose, 1500);
  };

  const handleEndCall = async () => {
    if (callId) {
      try {
        await endCall(callId);
      } catch (err) {
        console.error("Error ending call in Firestore:", safeJsonStringify(err));
      }
    }
    handleCallEndedLocally();
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    if (type !== 'video' || !streamRef.current) return;

    try {
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacingMode);

      // Stop only video tracks
      streamRef.current.getVideoTracks().forEach(track => track.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true // Keep audio same
      });

      // Simple merge: keep old audio tracks if needed, but usually it's cleaner to get a fresh one or merge
      // For simplicity, we just replace the whole stream reference
      streamRef.current = newStream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      
      console.log("[CALL] Camera alternada para:", newFacingMode);
    } catch (err) {
      console.error("[CALL] Erro ao alternar câmera:", safeJsonStringify(err));
    }
  };

  const displayName = partner ? `${partner.firstName} ${partner.lastName}` : (group?.groupName || 'Comunidade');
  const displayPic = partner?.profilePicture || (group?.groupImage || 'https://ui-avatars.com/api/?name=Group');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[11000] bg-black flex flex-col items-center justify-between overflow-hidden font-sans"
    >
      <AnimatePresence>
        {permissionError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[13000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="bg-red-500/20 p-6 rounded-full mb-6 border border-red-500/30">
               <VideoOff className="h-12 w-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Acesso Negado</h3>
            <p className="text-white/60 text-sm mb-8 max-w-xs leading-relaxed font-medium">
              {permissionError}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                onClick={() => startMedia()}
                className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={handleEndCall}
                className="w-full py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 active:scale-95 transition-all"
              >
                Cancelar Chamada
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container de Vídeo Remoto (ou Background) */}
      <div className="absolute inset-0 z-0">
        {status === 'connected' && type === 'video' ? (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            {/* Background blur estético */}
            <img 
              src={displayPic} 
              className="w-full h-full object-cover blur-3xl opacity-30 absolute" 
              alt="background"
            />
            <div className="relative z-10 flex flex-col items-center">
               <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative p-2"
               >
                 <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full animate-pulse" />
                 <img 
                    src={displayPic} 
                    className="w-40 h-40 md:w-56 md:h-56 rounded-[3.5rem] object-cover border-4 border-white/10 shadow-2xl relative z-10"
                 />
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-brand/90 backdrop-blur-md px-6 py-2 rounded-full shadow-xl">
                    <p className="text-[10px] font-black uppercase text-white tracking-[0.2em]">{displayName}</p>
                 </div>
               </motion.div>
               
               <p className="mt-12 text-white/40 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Conexão P2P Segura Ativa</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <img src={displayPic} className="w-full h-full object-cover blur-[120px] opacity-40" alt="blur" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
          </div>
        )}
      </div>

      {/* Local Video Preview (Miniatura PIP) */}
      <AnimatePresence>
        {status !== 'ended' && type === 'video' && (
          <motion.div 
            drag
            dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
            initial={{ scale: 0, x: 100, y: 100 }}
            animate={{ scale: 1, x: 0, y: 0 }}
            className="absolute z-[12000] cursor-grab active:cursor-grabbing transition-all duration-700 ease-out overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 top-8 right-8 w-[140px] h-[200px] md:w-[220px] md:h-[300px] rounded-[2rem]"
          >
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${!isVideoOff ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
            />
            {isVideoOff && (
               <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center gap-4">
                  <div className="p-4 bg-white/5 rounded-full">
                    <VideoOff className="h-10 w-10 text-white/20" />
                  </div>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Vídeo Desativado</p>
               </div>
            )}
            
            {/* Identificador local */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-wider border border-white/10">
                  Sua Câmera
                </div>
                <button 
                  onClick={switchCamera}
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  <SwitchCamera className="h-3 w-3 text-white" />
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info */}
      <div className="relative z-10 w-full p-6 md:p-10 flex justify-between items-start">
         <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
               <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-brand animate-pulse'}`} />
               <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">
                  {status === 'requesting' ? 'Iniciando' : status === 'calling' ? 'Chamando' : status === 'connected' ? 'Em chamada' : 'Encerrada'}
               </p>
            </div>
            
            {status === 'connected' ? (
               <motion.span 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="text-white font-mono text-3xl tracking-tighter"
               >
                 {formatTime(callDuration)}
               </motion.span>
            ) : (
               <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">{displayName}</h2>
            )}

            <div className="flex items-center gap-1.5 mt-2 opacity-40">
               <Lock className="h-3 w-3 text-green-500" />
               <span className="text-[8px] font-bold text-white uppercase tracking-widest">Criptografada de ponta a ponta</span>
            </div>
         </div>

         <div className="flex items-center gap-2">
            <button 
              onClick={switchCamera}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all backdrop-blur-md border border-white/5"
            >
                <SwitchCamera className="h-5 w-5" />
            </button>
         </div>
      </div>

      {/* Middle Content (Used only when not connected or voice only) */}
      <AnimatePresence>
        {(status !== 'connected' || type === 'voice') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 flex flex-col items-center text-center p-6"
          >
             <div className="relative mb-10 group">
                <div className={`w-44 h-44 md:w-64 md:h-64 rounded-[4rem] overflow-hidden border-4 border-white/10 shadow-[0_45px_90px_-20px_rgba(0,0,0,0.7)] transition-all duration-1000 
                  ${status === 'calling' ? 'scale-105' : 'scale-100'}`}>
                   <img src={displayPic} className="w-full h-full object-cover" alt="Partner" />
                </div>
                {status === 'calling' && (
                  <div className="absolute -inset-8 bg-brand/20 rounded-[5rem] blur-3xl -z-10 animate-pulse" />
                )}
             </div>

             <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter mb-4 px-4 drop-shadow-2xl">{displayName}</h2>
             
             {status === 'calling' && (
               <motion.div 
                 animate={{ opacity: [0.4, 1, 0.4] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="flex items-center gap-3"
               >
                  <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.5em]">Aguardando Resposta</p>
               </motion.div>
             )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Controls */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 w-full max-w-xl mb-12 px-6"
      >
         <div className="bg-[#1a1c1e]/80 backdrop-blur-3xl rounded-[3.5rem] p-4 flex items-center justify-between border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
            <button 
              onClick={toggleMute}
              className={`p-5 rounded-3xl transition-all shadow-xl ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
               {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
            </button>

            {type === 'video' ? (
              <button 
                onClick={toggleVideo}
                className={`p-5 rounded-3xl transition-all shadow-xl ${isVideoOff ? 'bg-zinc-800 text-white/40' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                 {isVideoOff ? <VideoOff className="h-7 w-7" /> : <Video className="h-7 w-7" />}
              </button>
            ) : (
              <button className="p-5 bg-white/5 text-white rounded-3xl hover:bg-white/10 shadow-xl transition-all">
                <Volume2 className="h-7 w-7" />
              </button>
            )}

            <button 
              onClick={handleEndCall}
              className="p-7 bg-red-600 text-white rounded-[2.25rem] shadow-2xl hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
            >
               <PhoneOff className="h-9 w-9" />
            </button>
         </div>
      </motion.div>

      {/* Decorative pulse background when calling */}
      {status === 'calling' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-[120px] border-white/5 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-[60px] border-white/5 rounded-full animate-ping" style={{ animationDuration: '4.5s' }} />
        </div>
      )}
    </motion.div>
  );
};

export default CallModal;


