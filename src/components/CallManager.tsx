import React, { useState, useEffect } from 'react';
import { User, Call, CallStatus, CallType } from '../types';
import { listenForCalls, acceptCall, rejectCall, endCall, timeoutCall } from '../services/callService';
import CallModal from './CallModal';
import { useDialog } from '../services/DialogContext';
import { Phone, Video, X, PhoneOff, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CallManagerProps {
  currentUser: User | null;
}

const CallManager: React.FC<CallManagerProps> = ({ currentUser }) => {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const { showAlert } = useDialog();

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = listenForCalls(currentUser.id, (call) => {
      // Se for uma chamada nova e não temos uma ativa (ou se for a mesma que acabou de ser criada)
      if (!activeCall || activeCall.id === call.id) {
        setActiveCall(call);
        setIsIncoming(call.receiverId === currentUser.id);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id, activeCall?.id]);

  const handleAccept = async () => {
    if (!activeCall) return;
    try {
      await acceptCall(activeCall.id);
      // O listener de status no CallModal cuidará do resto
    } catch (err) {
      showAlert("Erro ao atender chamada.");
    }
  };

  const handleReject = async () => {
    if (!activeCall) return;
    try {
      await rejectCall(activeCall.id);
      setActiveCall(null);
    } catch (err) {
      showAlert("Erro ao rejeitar chamada.");
    }
  };

  const handleEnd = async () => {
    if (!activeCall) return;
    try {
      await endCall(activeCall.id);
      setActiveCall(null);
    } catch (err) {
      showAlert("Erro ao encerrar chamada.");
    }
  };

  if (!currentUser || !activeCall) return null;

  // Se for uma chamada recebida e ainda está tocando (RINGING), mostra o overlay de atendimento
  if (isIncoming && activeCall.status === CallStatus.RINGING) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[11000] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-between p-12 text-white"
      >
        <div className="flex flex-col items-center mt-24 text-center">
          <div className="relative mb-12">
            <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-44 h-44 md:w-60 md:h-60 rounded-[4rem] overflow-hidden border-4 border-white/10 shadow-[0_45px_90px_-20px_rgba(0,0,0,0.5)] relative z-10"
            >
                <img src={activeCall.callerProfilePic || 'https://ui-avatars.com/api/?name=User'} className="w-full h-full object-cover" alt="Caller" />
            </motion.div>
            <div className="absolute -inset-10 bg-brand/10 blur-3xl rounded-full -z-0 animate-pulse" />
          </div>
          
          <h2 className="text-4xl md:text-7xl font-bold tracking-tighter mb-4">{activeCall.callerName}</h2>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-black text-brand uppercase tracking-[0.4em] animate-pulse">
                CHAMADA DE {activeCall.type === CallType.VIDEO ? 'VÍDEO' : 'ÁUDIO'}
            </p>
            <div className="flex items-center gap-1.5 opacity-30 mt-4">
                <Lock className="h-3 w-3 text-green-500" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-white">Segurança de ponta a ponta</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm flex items-center justify-around mb-20 px-8">
           <div className="flex flex-col items-center gap-4">
              <button 
                onClick={handleReject}
                className="p-8 bg-red-600 text-white rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all"
              >
                  <PhoneOff className="h-9 w-9" />
              </button>
              <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Recusar</span>
           </div>

           <div className="flex flex-col items-center gap-4">
              <button 
                onClick={handleAccept}
                className="p-8 bg-green-500 text-white rounded-[2.5rem] shadow-2xl shadow-green-500/20 hover:scale-110 active:scale-95 transition-all"
              >
                  {activeCall.type === CallType.VIDEO ? <Video className="h-9 w-9" /> : <Phone className="h-9 w-9" />}
              </button>
              <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">Atender</span>
           </div>
        </div>
      </motion.div>
    );
  }

  // Se já foi aceita ou nós que iniciamos, mostra o Modal de chamada completo
  return (
    <CallModal 
      currentUser={currentUser}
      partner={{
        id: isIncoming ? activeCall.callerId : activeCall.receiverId,
        firstName: isIncoming ? activeCall.callerName?.split(' ')[0] : activeCall.receiverName?.split(' ')[0],
        lastName: isIncoming ? activeCall.callerName?.split(' ').slice(1).join(' ') : activeCall.receiverName?.split(' ').slice(1).join(' '),
        profilePicture: isIncoming ? activeCall.callerProfilePic : activeCall.receiverProfilePic,
      } as User}
      type={activeCall.type === CallType.VIDEO ? 'video' : 'voice'}
      callId={activeCall.id}
      onClose={() => setActiveCall(null)}
    />
  );
};

export default CallManager;

