import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Post, User, Page } from '../types';
import { 
  subscribeToLivePost, 
  sendLiveMessage, 
  manageLiveViewers, 
  pulseLiveHeart, 
  processDonation, 
  findUserById, 
  updatePost,
  getUsers
} from '../services/storageService';
import { useDialog } from '../services/DialogContext';
import { DEFAULT_PROFILE_PIC, ANONYMOUS_PROFILE_PIC } from '../data/constants';
import { doc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebaseClient';
import { 
  Heart, 
  Send, 
  Volume2, 
  VolumeX, 
  Video, 
  VideoOff, 
  Sparkles, 
  Users, 
  X, 
  Radio, 
  Mic, 
  MicOff, 
  Coins, 
  MessageSquare, 
  AlertTriangle,
  ArrowLeft,
  Tv,
  Eye,
  Flag,
  RotateCcw,
  CheckCircle2,
  Zap
} from 'lucide-react';

interface LiveStreamViewerProps {
  currentUser: User;
  postId: string;
  onNavigate: (page: Page, params?: any) => void;
  refreshUser: () => Promise<void>;
}

// Interface para animação de corações flutuantes
interface FloatingHeart {
  id: string;
  color: string;
  emoji: string;
  left: number;
}

const LIVE_FILTERS = [
  { id: 'none', name: 'Original', class: '' },
  { id: 'cyber', name: 'Cyber HUD', class: 'hue-rotate-60 saturate-150 contrast-125' },
  { id: 'vapor', name: 'Vapor Neon', class: 'hue-rotate-180 contrast-110 saturate-125 brightness-95' },
  { id: 'mono', name: 'Monocromático', class: 'grayscale contrast-150' },
  { id: 'glitch', name: 'Night Vision', class: 'brightness-110 contrast-125 grayscale hue-rotate-[120deg] animate-pulse' }
];

const DONATION_TIERS = [
  { amount: 10, name: 'Cyber Bite 🍕', desc: 'Apoio iniciante' },
  { amount: 50, name: 'Neon Charge ⚡', desc: 'Sinal de fã' },
  { amount: 100, name: 'Quantum Matrix 🌀', desc: 'Super incentivo' },
  { amount: 500, name: 'Supernova Spark ⭐', desc: 'Patrocinador oficial' }
];

const CHAT_SIMULATOR_MESSAGES = [
  "KZ para a lua! 🚀",
  "Esse stream de Luanda tá insano!",
  "Qual é o teu headphone, bro? 🎧",
  "Top de som e vídeo! 🔥",
  "Alguém aceita trade na store dele?",
  "A velocidade do CyberPhone está fenomenal",
  "Manda salve para o Lubango! 👋",
  "O modo anônimo me salvou hoje haha",
  "Que setup futurista brutal! 🌌",
  "Sempre assistindo do Benguela 🌊"
];

const createSilentAudioTrack = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dst = ctx.createMediaStreamDestination();
    const oscillator = ctx.createOscillator();
    oscillator.frequency.value = 440;
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0; // Complete silence
    oscillator.connect(gainNode);
    gainNode.connect(dst);
    oscillator.start();
    return dst.stream.getAudioTracks()[0];
  } catch (e) {
    console.warn("[WebRTC] Silent audio track creation failed:", e);
    return null;
  }
};

const createSimulatedVideoStream = (userName: string, profilePicUrl: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Carregar imagem de perfil em memória
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = profilePicUrl;

  let animId: number;
  let tVal = 0;
  const particles: Array<{ x: number; y: number; vy: number; size: number; alpha: number }> = [];
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * 640,
      y: Math.random() * 360,
      vy: 0.5 + Math.random() * 1.5,
      size: 1 + Math.random() * 2,
      alpha: 0.1 + Math.random() * 0.4
    });
  }

  const render = () => {
    if (!ctx) return;
    
    // Desenhar fundo
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, 640, 360);

    // Desenhar linhas da grade cibernética para estética avançada
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = (360 / 12) * i + Math.sin(tVal * 0.05 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const x = (640 / 12) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }

    // Partículas flutuantes de dados de rede
    particles.forEach((p) => {
      p.y -= p.vy;
      if (p.y < 0) {
        p.y = 360;
        p.x = Math.random() * 640;
      }
      ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ondas senoidais animadas representativas de áudio
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < 640; x += 10) {
      const y = 180 + Math.sin(x * 0.02 + tVal * 0.08) * 12 * Math.sin(tVal * 0.03);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Desenhar avatar principal
    ctx.save();
    const centerX = 320;
    const centerY = 180;
    const radius = 50;

    // Pulsação neon ao redor do avatar
    const pulseRadius = radius + 4 + Math.sin(tVal * 0.08) * 6;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Recortar em círculo
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    try {
      if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, centerX - radius, centerY - radius, radius * 2, radius * 2);
      } else {
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(userName.substring(0, 2).toUpperCase(), centerX, centerY);
      }
    } catch (e) {
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    }
    ctx.restore();

    // Linha de contorno do avatar
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Indicadores eletrônicos de texto HUD
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`● VIRTUAL STREAMING`, 30, 45);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(`USER: ${userName.toUpperCase()}`, 30, 65);
    ctx.fillText(`STATUS: BROADCASTING`, 30, 85);

    tVal++;
    animId = requestAnimationFrame(render);
  };

  render();

  const canvasStream = (canvas as any).captureStream 
    ? (canvas as any).captureStream(15) 
    : (canvas as any).webkitCaptureStream 
      ? (canvas as any).webkitCaptureStream(15) 
      : null;

  if (canvasStream) {
    (canvasStream as any).stopSimulation = () => {
      cancelAnimationFrame(animId);
    };
  }
  return canvasStream;
};

const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({
  currentUser,
  postId,
  onNavigate,
  refreshUser
}) => {
  const { t } = useTranslation();
  const { showAlert, showConfirm, showSuccess, showError } = useDialog();

  const [post, setPost] = useState<Post | null>(null);
  const [hostProfile, setHostProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [comments, setComments] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  
  // Controles de Mídia
  const [videoActive, setVideoActive] = useState<boolean>(true);
  const [audioActive, setAudioActive] = useState<boolean>(true);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [currentFilter, setCurrentFilter] = useState<string>('cyber');
  
  // Co-Hosting (Go Live Together)
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [inviteSearch, setInviteSearch] = useState<string>('');
  
  const [guestVideoActive, setGuestVideoActive] = useState<boolean>(true);
  const [guestAudioActive, setGuestAudioActive] = useState<boolean>(true);
  
  // Elementos do Viewer
  const [donationModalOpen, setDonationModalOpen] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');

  // Super Chat states
  const [superChatModalOpen, setSuperChatModalOpen] = useState<boolean>(false);
  const [customSCAmount, setCustomSCAmount] = useState<string>('500');
  const [superChatText, setSuperChatText] = useState<string>('');
  const [submittingSuperChat, setSubmittingSuperChat] = useState<boolean>(false);
  const [selectedActiveSuperChat, setSelectedActiveSuperChat] = useState<any>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Effect to progress Super Chat expiry countdown ticks in real-time
  useEffect(() => {
    const t = setInterval(() => {
      setNowTick(Date.now());
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Helper to determine theme classes and active stickiness durations for Super Chat amounts
  const getSuperChatTheme = useCallback((amount: number) => {
    if (amount < 500) {
      return {
        bgHeader: 'bg-blue-600',
        bgBody: 'bg-blue-700',
        textHeader: 'text-white/80',
        textBody: 'text-white',
        accentColor: 'text-cyan-300',
        colorName: 'blue',
        duration: 30000 // 30 seconds
      };
    } else if (amount < 1500) {
      return {
        bgHeader: 'bg-teal-600',
        bgBody: 'bg-teal-700',
        textHeader: 'text-white/80',
        textBody: 'text-white',
        accentColor: 'text-green-300',
        colorName: 'green',
        duration: 60000 // 1 minute
      };
    } else if (amount < 3000) {
      return {
        bgHeader: 'bg-yellow-600 dark:bg-amber-600',
        bgBody: 'bg-yellow-700 dark:bg-amber-700',
        textHeader: 'text-white/80',
        textBody: 'text-white',
        accentColor: 'text-amber-100 font-black',
        colorName: 'amber',
        duration: 180000 // 3 minutes
      };
    } else if (amount < 6000) {
      return {
        bgHeader: 'bg-purple-600',
        bgBody: 'bg-purple-700',
        textHeader: 'text-white/80',
        textBody: 'text-white',
        accentColor: 'text-pink-300',
        colorName: 'purple',
        duration: 300000 // 5 minutes
      };
    } else {
      return {
        bgHeader: 'bg-red-600',
        bgBody: 'bg-red-700',
        textHeader: 'text-white/80',
        textBody: 'text-white',
        accentColor: 'text-yellow-300',
        colorName: 'red',
        duration: 600000 // 10 minutes
      };
    }
  }, []);

  const activeSuperChats = useMemo(() => {
    return comments.filter((c: any) => {
      if (!c.isSuperChat) return false;
      const theme = getSuperChatTheme(c.superChatAmount || 0);
      const duration = c.superChatDuration || theme.duration;
      return c.timestamp + duration > nowTick;
    });
  }, [comments, nowTick, getSuperChatTheme]);
  
  const [donationAlert, setDonationAlert] = useState<{ donor: string; amount: number; message: string } | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);
  const alertTimerRef = useRef<any>(null);
  
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState<boolean>(false);
  const [isSimulatingGuestCamera, setIsSimulatingGuestCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [guestCameraError, setGuestCameraError] = useState<string | null>(null);
  const lastHeartCountRef = useRef<number>(0);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteGuestStream, setRemoteGuestStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const hostConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const viewerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isViewerInitialized = useRef(false);
  const viewerCandidatesProcessed = useRef<Set<string>>(new Set());
  const hostCandidatesProcessed = useRef<Set<string>>(new Set());
  const hostCandidatesQueuesRef = useRef<Record<string, string[]>>({});
  const viewerCandidatesQueueRef = useRef<string[]>([]);
  const processedReadyViewersRef = useRef<Record<string, boolean>>({});
  
  const computedLiveViewerCount = useMemo(() => {
    if (!post) return 0;
    const now = Date.now();
    const viewers = post.liveViewersMap || {};
    const activeViewers = Object.entries(viewers).filter(([uid, timestamp]) => {
      if (uid.startsWith('legacy-user') || uid.includes('simulated') || uid === post.userId) {
        return false;
      }
      return (now - (timestamp as number)) < 25000;
    });
    return activeViewers.length;
  }, [post]);

  // Referências
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const guestVideoRef = useRef<HTMLVideoElement | null>(null);
  const guestStreamRef = useRef<MediaStream | null>(null);

  const isHost = post ? post.userId === currentUser.id : false;

  const isJoinedGuest = useMemo(() => {
    if (!post || !post.liveStream?.guests) return false;
    return post.liveStream.guests.some(g => g.userId === currentUser.id && g.status === 'JOINED');
  }, [post, currentUser.id]);

  // Callback refs para lidar com a montagem condicional das tags de vídeo graciosamente:
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      const targetStream = isHost ? (localStream || streamRef.current) : remoteStream;
      if (targetStream) {
        if (el.srcObject !== targetStream) {
          console.log("[LiveStream] Vinculando stream...");
          el.srcObject = targetStream;
          el.play().catch(e => console.warn("Erro ao reproduzir vídeo:", e));
        }
      }
    }
  }, [isHost, remoteStream, localStream]);

  const setGuestVideoRef = useCallback((el: HTMLVideoElement | null) => {
    guestVideoRef.current = el;
    if (el && guestStreamRef.current) {
      if (el.srcObject !== guestStreamRef.current) {
        el.srcObject = guestStreamRef.current;
        el.play().catch(e => console.warn("Erro ao reproduzir guestStream:", e));
      }
    }
  }, []);

  // Sincronizadores resilientes em segundo plano para manter as tags sincronizadas caso o React não recrie os refs
  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      const targetStream = isHost ? (localStream || streamRef.current) : remoteStream;
      if (targetStream) {
        if (el.srcObject !== targetStream) {
          console.log("[LiveStream] Sincronizando stream via useEffect...");
          el.srcObject = targetStream;
          el.play().catch(e => console.warn("Erro ao reproduzir stream via useEffect:", e));
        }
      } else {
        if (el.srcObject) {
          el.srcObject = null;
        }
      }
    }
  }, [isHost, localStream, remoteStream]);

  useEffect(() => {
    const el = guestVideoRef.current;
    const stream = guestStreamRef.current;
    if (el) {
      if (stream) {
        if (el.srcObject !== stream) {
          console.log("[LiveStream] Sincronizando guestStream via useEffect...");
          el.srcObject = stream;
          el.play().catch(e => console.warn("Erro ao reproduzir guestStream via useEffect:", e));
        }
      } else {
        if (el.srcObject) {
          el.srcObject = null;
        }
      }
    }
  }, [isJoinedGuest, guestVideoActive]);

  // Sincronizadores resilientes de renegociação
  const isSelfGuest = useMemo(() => {
    if (!post || !post.liveStream?.guests) return false;
    return post.liveStream.guests.some((g: any) => g.userId === currentUser.id && g.status === 'JOINED');
  }, [post, currentUser.id]);

  const guestMediaStreamActive = !!(guestStreamRef.current || localStream);

  // 1. Viewer side renegotiation
  useEffect(() => {
    if (isHost) return;
    if (!postId || !db) return;

    if (viewerConnectionRef.current) {
      console.log("[WebRTC-Live-Viewer] Estado de Co-Host/Guest mudou (isSelfGuest:", isSelfGuest, "stream:", guestMediaStreamActive, "). Reiniciando conexão WebRTC...");
      
      try {
        viewerConnectionRef.current.close();
      } catch (e) {}
      viewerConnectionRef.current = null;
      
      const docRef = doc(db, 'posts', postId);
      updateDoc(docRef, {
        [`liveStream.signaling.${currentUser.id}`]: {
          status: 'ready',
          viewerCandidates: [],
          hostCandidates: []
        }
      }).catch(err => {
        console.warn("[WebRTC-Live-Viewer] Erro ao sinalizar reinício de conexão:", err);
      });
    }
  }, [isSelfGuest, guestMediaStreamActive, isHost, postId, db]);

  // 2. Host side renegotiation upon local camera restart
  const lastLocalStreamIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isHost || !localStream || !postId || !db) return;
    
    const streamId = localStream.id;
    if (lastLocalStreamIdRef.current && lastLocalStreamIdRef.current !== streamId) {
      console.log("[WebRTC-Live-Host] Novo fluxo de câmera local detectado. Reiniciando conexões de todos os viewers...");
      const docRef = doc(db, 'posts', postId);
      
      Object.keys(hostConnectionsRef.current).forEach(viewerId => {
        try {
          hostConnectionsRef.current[viewerId].close();
        } catch (e) {}
        delete hostConnectionsRef.current[viewerId];
        delete hostCandidatesQueuesRef.current[viewerId];
        processedReadyViewersRef.current[viewerId] = false;
        
        updateDoc(docRef, {
          [`liveStream.signaling.${viewerId}`]: {
            status: 'ready',
            viewerCandidates: [],
            hostCandidates: []
          }
        }).catch(() => {});
      });
    }
    lastLocalStreamIdRef.current = streamId;
  }, [localStream, isHost, postId, db]);

  // WebRTC Live-streaming signaling
  useEffect(() => {
    if (!postId || !db || !post) return;

    const docRef = doc(db, 'posts', postId);

    if (isHost) {
      // Host side: watch signaling map inside post
      const signaling = post.liveStream?.signaling || {};
      
      Object.keys(signaling).forEach(async (viewerId) => {
        const entry = signaling[viewerId];
        if (!entry) return;

        // Reset the processed ref if status is no longer ready
        if (entry.status !== 'ready') {
          processedReadyViewersRef.current[viewerId] = false;
        }

        // If viewer wants to connect ('ready') and we don't have a peer connection yet, or connection needs restart
        if (entry.status === 'ready') {
          // If we already initiated connection setup for this ready cycle, skip to prevent infinite loop
          if (processedReadyViewersRef.current[viewerId]) {
            return;
          }

          if (!localStream) {
            console.log("[WebRTC-Live-Host] Câmera do host ainda não está pronta, aguardando...");
            return;
          }

          processedReadyViewersRef.current[viewerId] = true;

          if (hostConnectionsRef.current[viewerId]) {
            console.log("[WebRTC-Live-Host] Fechando conexão anterior obsoleta para o viewer:", viewerId);
            try { hostConnectionsRef.current[viewerId].close(); } catch (e) {}
            delete hostConnectionsRef.current[viewerId];
            delete hostCandidatesQueuesRef.current[viewerId];
          }

          console.log("[WebRTC-Live-Host] Nova solicitação de stream do viewer:", viewerId);

          // Clear processed candidates for this viewerId before starting anew
          for (const key of Array.from(viewerCandidatesProcessed.current)) {
            if (key.startsWith(`${viewerId}-`)) {
              viewerCandidatesProcessed.current.delete(key);
            }
          }

          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          });
          hostConnectionsRef.current[viewerId] = pc;

          // Add our local tracks
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
          });

          // Also set up ontrack in case this viewer is a Co-Host / Guest sending their feed
          pc.ontrack = (event) => {
            console.log(`[WebRTC-Live-Host] Feed de track recebido do participante ${viewerId}:`, event.streams[0]);
            let stream = event.streams && event.streams[0];
            if (!stream && event.track) {
              stream = new MediaStream([event.track]);
            }
            if (stream) {
              setRemoteGuestStream(stream);
            }
          };

          // Handle local candidates
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candStr = JSON.stringify(event.candidate);
              updateDoc(docRef, {
                [`liveStream.signaling.${viewerId}.hostCandidates`]: arrayUnion(candStr)
              }).catch(e => console.warn("Erro ao salvar host candidate:", e));
            }
          };

          // Create offer
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await updateDoc(docRef, {
              [`liveStream.signaling.${viewerId}.offer`]: JSON.stringify(offer),
              [`liveStream.signaling.${viewerId}.status`]: 'offered',
              [`liveStream.signaling.${viewerId}.answer`]: ""
            });
            console.log("[WebRTC-Live-Host] Offer para", viewerId, "salvo.");
          } catch (e) {
            console.error("[WebRTC-Live-Host] Erro ao criar offer:", e);
          }
        }

        // See if viewer provided their answer
        const pc = hostConnectionsRef.current[viewerId];
        if (pc && entry.status === 'answered' && entry.answer && !pc.remoteDescription) {
          try {
            console.log("[WebRTC-Live-Host] Resposta recebida do viewer:", viewerId);
            const sdp = new RTCSessionDescription(JSON.parse(entry.answer));
            await pc.setRemoteDescription(sdp);
            console.log("[WebRTC-Live-Host] Conectado e transmitindo para:", viewerId);

            // Flush buffered candidates
            const queue = hostCandidatesQueuesRef.current[viewerId] || [];
            while (queue.length > 0) {
              const candStr = queue.shift();
              if (candStr) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
                } catch (e) {
                  console.warn("[WebRTC-Live-Host] Erro ao carregar candidato do buffer:", e);
                }
              }
            }
            delete hostCandidatesQueuesRef.current[viewerId];
          } catch (e) {
            console.error("[WebRTC-Live-Host] Erro ao carregar resposta do viewer:", e);
          }
        }

        // Apply viewer ICE Candidates if remote description is set, else queue
        if (pc && entry.viewerCandidates && Array.isArray(entry.viewerCandidates)) {
          const queue = hostCandidatesQueuesRef.current[viewerId] || [];
          for (const candStr of entry.viewerCandidates) {
            const key = `${viewerId}-${candStr}`;
            if (viewerCandidatesProcessed.current.has(key)) continue;
            viewerCandidatesProcessed.current.add(key);

            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
              } catch (e) {
                console.warn("[WebRTC-Live-Host] Erro ao carregar viewer candidate no host:", e);
              }
            } else {
              queue.push(candStr);
            }
          }
          if (queue.length > 0) {
            hostCandidatesQueuesRef.current[viewerId] = queue;
          }
        }
      });

      // Regular cleanup of disconnected viewers from signaling map
      const activeViewers = Object.keys(post.liveViewersMap || {});
      Object.keys(hostConnectionsRef.current).forEach(viewerId => {
        if (!activeViewers.includes(viewerId) && !signaling[viewerId]) {
          console.log("[WebRTC-Live-Host] Limpando conexão inativa de:", viewerId);
          try {
            hostConnectionsRef.current[viewerId].close();
          } catch (e) {}
          delete hostConnectionsRef.current[viewerId];
          delete hostCandidatesQueuesRef.current[viewerId];
        }
      });

    } else {
      // Viewer side: request connection and handle offers
      const mySignaling = post.liveStream?.signaling?.[currentUser.id];

      // Step 1: Request connection
      if (!mySignaling && !isViewerInitialized.current) {
        isViewerInitialized.current = true;
        console.log("[WebRTC-Live-Viewer] Solicitando ingresso no fluxo de mídia...");
        updateDoc(docRef, {
          [`liveStream.signaling.${currentUser.id}`]: {
            status: 'ready',
            viewerCandidates: [],
            hostCandidates: []
          }
        }).catch(err => {
          console.warn("[WebRTC-Live-Viewer] Erro ao sinalizar entrada:", err);
          isViewerInitialized.current = false;
        });
      }

      // Step 2: Receive Host's Offer
      if (mySignaling && mySignaling.status === 'offered' && mySignaling.offer && !viewerConnectionRef.current) {
        console.log("[WebRTC-Live-Viewer] Offer recebido do Host, inicializando peer connection...");
        
        // Clear processed candidates lists for the new connection
        hostCandidatesProcessed.current.clear();
        viewerCandidatesQueueRef.current = [];

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        });
        viewerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          console.log("[WebRTC-Live-Viewer] Feed de vídeo remota do host recebido!", event.streams[0]);
          let stream = event.streams && event.streams[0];
          if (!stream && event.track) {
            stream = new MediaStream([event.track]);
          }
          if (stream) {
            setRemoteStream(stream);
            setIsSimulatingCamera(false); // Desativar simulação para mostrar o feed real
          }
        };

        // If we are a joined guest (Co-Host), let's attach our local camera/mic stream tracks so the host can see/hear us!
        const isSelfGuest = post.liveStream?.guests?.some((g: any) => g.userId === currentUser.id && g.status === 'JOINED');
        const activeLocalGuestStream = guestStreamRef.current || localStream;
        if (isSelfGuest && activeLocalGuestStream) {
          console.log("[WebRTC-Live-Viewer] Convidado anexando stream local de câmera/áudio real para transmitir ao host...");
          activeLocalGuestStream.getTracks().forEach(track => {
            pc.addTrack(track, activeLocalGuestStream);
          });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candStr = JSON.stringify(event.candidate);
            updateDoc(docRef, {
              [`liveStream.signaling.${currentUser.id}.viewerCandidates`]: arrayUnion(candStr)
            }).catch(e => console.warn("Erro ao salvar viewer candidate:", e));
          }
        };

        // Handle answer handshake
        const runHandshake = async () => {
          try {
            const sdp = new RTCSessionDescription(JSON.parse(mySignaling.offer));
            await pc.setRemoteDescription(sdp);
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            await updateDoc(docRef, {
              [`liveStream.signaling.${currentUser.id}.answer`]: JSON.stringify(answer),
              [`liveStream.signaling.${currentUser.id}.status`]: 'answered'
            });
            console.log("[WebRTC-Live-Viewer] Answer enviado com sucesso para o Host.");

            // Flush buffered candidates
            while (viewerCandidatesQueueRef.current.length > 0) {
              const candStr = viewerCandidatesQueueRef.current.shift();
              if (candStr) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
                } catch (e) {
                  console.warn("[WebRTC-Live-Viewer] Erro ao carregar candidato pós-handshake:", e);
                }
              }
            }
          } catch (e) {
            console.error("[WebRTC-Live-Viewer] Erro no handshake:", e);
          }
        };
        runHandshake();
      }

      // Step 3: Apply host's ICE candidates
      const pc = viewerConnectionRef.current;
      if (pc && mySignaling && mySignaling.hostCandidates && Array.isArray(mySignaling.hostCandidates)) {
        mySignaling.hostCandidates.forEach((candStr: string) => {
          if (hostCandidatesProcessed.current.has(candStr)) return;
          hostCandidatesProcessed.current.add(candStr);
          
          if (pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr))).catch(err => {
              console.warn("Erro ao carregar host candidate no viewer:", err);
            });
          } else {
            viewerCandidatesQueueRef.current.push(candStr);
          }
        });
      }
    }
  }, [postId, isHost, post, localStream]);

  // Cleanup on unmount for viewer
  useEffect(() => {
    return () => {
      if (!isHost && postId && db) {
        // Deletar nosso slot de sinalização ao sair da live
        const docRef = doc(db, 'posts', postId);
        updateDoc(docRef, {
          [`liveStream.signaling.${currentUser.id}`]: null
        }).catch(() => {});
      }
      if (viewerConnectionRef.current) {
        try { viewerConnectionRef.current.close(); } catch(e) {}
        viewerConnectionRef.current = null;
      }
      Object.values(hostConnectionsRef.current).forEach(pc => {
        try { pc.close(); } catch(e) {}
      });
      hostConnectionsRef.current = {};
    };
  }, [postId, isHost]);

  // 1. Carregar Post e se inscrever no Firebase em tempo real
  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    // Entrar na live com presença real-time baseada em ID
    manageLiveViewers(postId, currentUser.id, 'join');

    const unsubscribe = subscribeToLivePost(postId, (updatedPost: any) => {
      if (updatedPost) {
        setPost(updatedPost);
        setComments(updatedPost.liveChat || []);
        
        // Disparar corações se o número aumentou
        const currentHeartCount = updatedPost.liveHeartCount || 0;
        const diff = currentHeartCount - lastHeartCountRef.current;
        if (diff > 0 && lastHeartCountRef.current > 0) {
          triggerHearts(diff > 5 ? 5 : diff);
        }
        lastHeartCountRef.current = currentHeartCount;

        // Se o host encerrou a stream, alertar o viewer
        if (updatedPost.liveStream?.status === 'ENDED' && updatedPost.userId !== currentUser.id) {
          showAlert(t('live_ended_alert', 'A transmissão foi encerrada pelo anfitrião.'), {
            title: t('live_ended_title', 'Transmissão Encerrada'),
            type: 'alert'
          });
          onNavigate('feed');
        }
      } else {
        showError(t('live_not_found', 'Transmissão não encontrada.'));
        onNavigate('feed');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      manageLiveViewers(postId, currentUser.id, 'leave');
    };
  }, [postId]);

  // 1b. Presence heartbeat interval to keep the viewer count completely real in real-time
  useEffect(() => {
    if (!postId || !currentUser?.id) return;
    
    // Heartbeat real-time de 10 em 10 segundos
    const interval = setInterval(() => {
      manageLiveViewers(postId, currentUser.id, 'heartbeat');
    }, 10000);
    
    return () => clearInterval(interval);
  }, [postId, currentUser?.id]);

  // 2. Carregar perfil do Host
  useEffect(() => {
    if (post && post.userId) {
      findUserById(post.userId).then((u) => {
        if (u) {
          setHostProfile(u);
        }
      });
    }
  }, [post]);

  // 3. Autoinicialização do fluxo de câmera/vídeo para o Host
  useEffect(() => {
    if (isHost && videoActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isHost, videoActive]);

  // 3b. Autoinicialização do fluxo de câmera/vídeo para o Co-Host/Convidado
  useEffect(() => {
    if (isJoinedGuest && guestVideoActive) {
      startGuestCamera();
    } else {
      stopGuestCamera();
    }
    return () => {
      stopGuestCamera();
    };
  }, [isJoinedGuest, guestVideoActive]);

  const startGuestCamera = async () => {
    try {
      let stream: MediaStream;
      try {
        // Try ideal (high-res video + audio)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: guestAudioActive ? { echoCancellation: true, noiseSuppression: true } : false
        });
      } catch (err) {
        console.warn("Guest high-res constraints failed, trying simple video and audio...", err);
        try {
          // Try standard video + audio
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: guestAudioActive
          });
        } catch (audioErr) {
          console.warn("Guest audio/mic acquisition failed, falling back to VIDEO-ONLY stream...", audioErr);
          // Fall back to video-only (critical for devices/VMs with no active microphone)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }
      if (guestStreamRef.current && (guestStreamRef.current as any).stopSimulation) {
        (guestStreamRef.current as any).stopSimulation();
      }
      guestStreamRef.current = stream;
      if (guestVideoRef.current) {
        if (guestVideoRef.current.srcObject !== stream) {
          guestVideoRef.current.srcObject = stream;
          guestVideoRef.current.play().catch(e => console.warn("Erro autoplay guest:", e));
        }
      }
      setIsSimulatingGuestCamera(false);
      setGuestCameraError(null);
    } catch (e: any) {
      console.warn("Guest camera access failed completely, fallback to animation mode", e);
      setIsSimulatingGuestCamera(true);
      setGuestCameraError(e?.message || String(e));

      if (guestStreamRef.current && (guestStreamRef.current as any).stopSimulation) {
        (guestStreamRef.current as any).stopSimulation();
      }

      // GERAR STREAM VIRTUAL PARA ENVIAR VIA WebRTC
      const simulatedStream = createSimulatedVideoStream(
        `${currentUser.firstName} ${currentUser.lastName}`,
        currentUser.profilePicture || DEFAULT_PROFILE_PIC
      );
      if (simulatedStream) {
        const silentAudio = createSilentAudioTrack();
        if (silentAudio) {
          simulatedStream.addTrack(silentAudio);
        }
        guestStreamRef.current = simulatedStream;
        if (guestVideoRef.current) {
          if (guestVideoRef.current.srcObject !== simulatedStream) {
            guestVideoRef.current.srcObject = simulatedStream;
            guestVideoRef.current.play().catch(e => console.warn("Erro autoplay guest fallback:", e));
          }
        }
      }
    }
  };

  const stopGuestCamera = () => {
    if (guestStreamRef.current) {
      guestStreamRef.current.getTracks().forEach((track) => track.stop());
      if ((guestStreamRef.current as any).stopSimulation) {
        (guestStreamRef.current as any).stopSimulation();
      }
      guestStreamRef.current = null;
    }
    setIsSimulatingGuestCamera(false);
  };

  // 3c. Filtra co-hosts ativos que estão participando ao vivo (status === 'JOINED')
  const activeGuests = useMemo(() => {
    if (!post || !post.liveStream?.guests) return [];
    return post.liveStream.guests.filter((g: any) => g.status === 'JOINED');
  }, [post]);

  // Convite pendente para o usuário atual
  const pendingInvitation = useMemo(() => {
    if (!post || !post.liveStream?.guests) return null;
    return post.liveStream.guests.find((g: any) => g.userId === currentUser.id && g.status === 'INVITED');
  }, [post, currentUser.id]);

  // Carregar lista de usuários da plataforma para o host convidar
  const loadPlatformUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await getUsers(currentUser);
      setPlatformUsers(users.filter((u: any) => u.id !== currentUser.id));
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (inviteModalOpen) {
      loadPlatformUsers();
    }
  }, [inviteModalOpen]);

  // Enviar convite de Co-Host
  const handleInviteUser = async (targetUser: User) => {
    if (!post) return;

    const currentGuests = post.liveStream?.guests || [];
    const isAlreadyInvited = currentGuests.some((g: any) => g.userId === targetUser.id && (g.status === 'INVITED' || g.status === 'JOINED'));
    if (isAlreadyInvited) {
      showAlert(`${targetUser.firstName} já tem um convite ativo ou está participando.`, { type: 'alert' });
      return;
    }

    const updatedGuests = [
      ...currentGuests.filter((g: any) => g.userId !== targetUser.id),
      {
        userId: targetUser.id,
        userName: `${targetUser.firstName} ${targetUser.lastName || ''}`,
        profilePic: targetUser.profilePicture || DEFAULT_PROFILE_PIC,
        status: 'INVITED' as const,
        audioMuted: false,
        videoMuted: false
      }
    ];

    const updatedPost = {
      ...post,
      liveStream: {
        ...post.liveStream,
        title: post.liveStream?.title || 'Cyber Transmissão',
        description: post.liveStream?.description || '',
        guests: updatedGuests
      }
    };

    await updatePost(updatedPost);

    // Enviar mensagem no chat anunciando o convite
    await sendLiveMessage(post.id, {
      id: 'invite-' + Date.now() + Math.random().toString(36).substr(2, 5),
      userId: 'system-invite',
      userName: '★ CyberPhone ★',
      profilePic: DEFAULT_PROFILE_PIC,
      text: `🎟️ O host convidou ${targetUser.firstName} para participar da live! Aguardando resposta...`,
      timestamp: Date.now()
    });

    showSuccess(`Convite enviado para ${targetUser.firstName}!`);
  };

  // Aceitar convite de Co-Host
  const handleAcceptInvite = async () => {
    if (!post || !post.liveStream?.guests) return;

    const updatedGuests = post.liveStream.guests.map((g: any) => {
      if (g.userId === currentUser.id) {
        return { ...g, status: 'JOINED' as const };
      }
      return g;
    });

    const updatedPost = {
      ...post,
      liveStream: {
        ...post.liveStream,
        title: post.liveStream?.title || 'Cyber Transmissão',
        description: post.liveStream?.description || '',
        guests: updatedGuests
      }
    };

    await updatePost(updatedPost);

    // Mensagem no chat
    await sendLiveMessage(post.id, {
      id: 'accept-' + Date.now(),
      userId: 'system-accept',
      userName: '★ CyberPhone ★',
      profilePic: DEFAULT_PROFILE_PIC,
      text: `🎤 ${currentUser.firstName} aceitou o convite e está AO VIVO! 🔴`,
      timestamp: Date.now()
    });

    showSuccess("Você entrou ao vivo como Co-Host!");
  };

  // Recusar convite de Co-Host
  const handleDeclineInvite = async () => {
    if (!post || !post.liveStream?.guests) return;

    const updatedGuests = post.liveStream.guests.map((g: any) => {
      if (g.userId === currentUser.id) {
        return { ...g, status: 'DECLINED' as const };
      }
      return g;
    });

    const updatedPost = {
      ...post,
      liveStream: {
        ...post.liveStream,
        title: post.liveStream?.title || 'Cyber Transmissão',
        description: post.liveStream?.description || '',
        guests: updatedGuests
      }
    };

    await updatePost(updatedPost);

    // Mensagem no chat
    await sendLiveMessage(post.id, {
      id: 'decline-' + Date.now(),
      userId: 'system-decline',
      userName: '★ CyberPhone ★',
      profilePic: DEFAULT_PROFILE_PIC,
      text: `🚫 Convite para live recusado por ${currentUser.firstName}.`,
      timestamp: Date.now()
    });
  };

  // Sair da Live como Co-Host
  const handleLeaveAsGuest = async () => {
    if (!post || !post.liveStream?.guests) return;

    const confirm = await showConfirm(
      "Deseja realmente sair da transmissão ao vivo?",
      { title: "Sair da Live", confirmText: "Sair da Live", cancelText: "Cancelar" }
    );

    if (confirm) {
      const updatedGuests = post.liveStream.guests.map((g: any) => {
        if (g.userId === currentUser.id) {
          return { ...g, status: 'LEFT' as const };
        }
        return g;
      });

      const updatedPost = {
        ...post,
        liveStream: {
          ...post.liveStream,
          title: post.liveStream?.title || 'Cyber Transmissão',
          description: post.liveStream?.description || '',
          guests: updatedGuests
        }
      };

      await updatePost(updatedPost);

      // Mensagem no chat
      await sendLiveMessage(post.id, {
        id: 'leave-' + Date.now(),
        userId: 'system-leave',
        userName: '★ CyberPhone ★',
        profilePic: DEFAULT_PROFILE_PIC,
        text: `🚪 ${currentUser.firstName} saiu da transmissão ao vivo.`,
        timestamp: Date.now()
      });

      showSuccess("Você saiu da live.");
    }
  };

  // Host remove convidado
  const handleRemoveGuest = async (guestId: string, guestName: string) => {
    if (!post || !post.liveStream?.guests) return;

    const confirm = await showConfirm(
      `Deseja realmente remover ${guestName} da transmissão ao vivo?`,
      { title: "Remover Participante", confirmText: "Remover", cancelText: "Cancelar" }
    );

    if (confirm) {
      const updatedGuests = post.liveStream.guests.map((g: any) => {
        if (g.userId === guestId) {
          return { ...g, status: 'LEFT' as const };
        }
        return g;
      });

      const updatedPost = {
        ...post,
        liveStream: {
          ...post.liveStream,
          title: post.liveStream?.title || 'Cyber Transmissão',
          description: post.liveStream?.description || '',
          guests: updatedGuests
        }
      };

      await updatePost(updatedPost);

      // Mensagem no chat
      await sendLiveMessage(post.id, {
        id: 'remove-' + Date.now(),
        userId: 'system-remove',
        userName: '★ CyberPhone ★',
        profilePic: DEFAULT_PROFILE_PIC,
        text: `🚫 O anfitrião removeu ${guestName} da live.`,
        timestamp: Date.now()
      });

      showSuccess(`${guestName} foi removido.`);
    }
  };

  // 4. Efeito para rolar o chat até o fim ao receber nova mensagem e detectar doações
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    if (comments.length > 0) {
      const lastComment = comments[comments.length - 1];
      if (lastComment.isDonation && lastComment.id !== lastAlertIdRef.current) {
        lastAlertIdRef.current = lastComment.id;
        
        let displayMessage = 'Sem mensagem';
        const rawText = lastComment.text || '';
        // Extract content inside double quotes if possible
        const quoteMatch = rawText.match(/"([^"]+)"/);
        if (quoteMatch && quoteMatch[1]) {
          displayMessage = quoteMatch[1];
        } else {
          displayMessage = rawText;
        }

        setDonationAlert({
          donor: lastComment.userName || 'Doador Secreto',
          amount: lastComment.amount || 0,
          message: displayMessage
        });
        
        // Citar o nome do doador e o valor em voz alta (Speech Synthesis)
        try {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Cancel any existing speech
            const donorName = lastComment.userName || 'Um doador';
            const donorAmount = lastComment.amount || 0;
            const speechText = `${donorName} enviou uma gorjeta de ${donorAmount} Kwanzas! Mensagem: ${displayMessage}`;
            const utterance = new SpeechSynthesisUtterance(speechText);
            utterance.lang = 'pt-PT'; // Portuguese audio
            window.speechSynthesis.speak(utterance);
          }
        } catch (speechErr) {
          console.warn('Silent fallback for SpeechSynthesis error', speechErr);
        }

        // Ativar estrelas douradas/corações de comemoração
        triggerHearts(6);
        
        // Cancel previous timer
        if (alertTimerRef.current) {
          clearTimeout(alertTimerRef.current);
        }

        // Auto-dismiss após 10 segundos
        alertTimerRef.current = setTimeout(() => {
          setDonationAlert(null);
          alertTimerRef.current = null;
        }, 10000);
      }
    }

    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
    };
  }, [comments]);

  // Total acumulado em gorjetas durante esta sessão
  const totalTipsSession = useMemo(() => {
    return comments
      .filter((c: any) => c.isDonation)
      .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
  }, [comments]);

  // 5. Canvas Simulado para Cyberpunk Grid / Visualizador Ambientador (Viewers)
  useEffect(() => {
    if ((isHost && !isSimulatingCamera) || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = 640);
    let height = (canvas.height = 360);

    const particles: Array<{ x: number; y: number; vy: number; size: number; alpha: number }> = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 3,
        alpha: 0.1 + Math.random() * 0.5
      });
    }

    let tVal = 0;

    const render = () => {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      // Desnhar grade cyber
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.15)';
      ctx.lineWidth = 1;
      
      // Linhas horizontais com perspectiva simulada
      const lines = 12;
      for (let i = 0; i < lines; i++) {
        const y = (height / lines) * i + Math.sin(tVal * 0.05 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Linhas verticais
      for (let i = 0; i < lines; i++) {
        const x = (width / lines) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Desenhar ondas de áudio simuladas (HUD cibernético)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 5) {
        const y = height / 2 + Math.sin(x * 0.03 + tVal * 0.1) * 15 * Math.sin(tVal * 0.02);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Partículas flutuantes de dados
      particles.forEach((p) => {
        p.y -= p.vy;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // HUD texto e decorações
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`DATA STREAM // SPEED: 94.2 MBPS`, 15, 25);
      ctx.fillText(`PING: 14MS // CODEC: AV1-CYBER`, 15, 40);
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      const streamLabel = '● ENTRADA AUDIO/VIDEO OK';
      ctx.fillStyle = '#10b981';
      ctx.fillText(streamLabel, width - 150, 25);

      tVal++;
      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isHost, isSimulatingCamera, post?.id]);

  // No simulated viewer interactions to ensure 100% genuine real-time activity
  useEffect(() => {
    // Fictional chat simulator disabled to guarantee 100% real-time authenticity
  }, []);

  // Iniciar câmera do Host
  const startCamera = async () => {
    try {
      let stream: MediaStream;
      try {
        // Try ideal (high-res video + audio)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: audioActive ? { echoCancellation: true, noiseSuppression: true } : false
        });
      } catch (err) {
        console.warn("Host high-res constraints failed, trying simple video and audio...", err);
        try {
          // Try standard video + audio
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: audioActive
          });
        } catch (audioErr) {
          console.warn("Host audio/mic acquisition failed, falling back to VIDEO-ONLY stream...", audioErr);
          // Fall back to video-only if micro/audio device fails or doesn't exist
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }
      // Se já houver um simulador ativo rodando, paramos antes de começar o novo real
      if (streamRef.current && (streamRef.current as any).stopSimulation) {
        (streamRef.current as any).stopSimulation();
      }
      streamRef.current = stream;
      setLocalStream(stream);
      if (videoRef.current) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("Erro autoplay host:", e));
        }
      }
      setIsSimulatingCamera(false);
      setCameraError(null);
    } catch (e: any) {
      console.warn("Camera access failed completely, falling back to simulated cyber stream", e);
      setIsSimulatingCamera(true);
      setCameraError(e?.message || String(e));

      // Parar simulação anterior se houver
      if (streamRef.current && (streamRef.current as any).stopSimulation) {
        (streamRef.current as any).stopSimulation();
      }

      // GERAR STREAM DE MULTIMÍDIA VIRTUAL TOTALMENTE CAPAZ DE TRANSMISSÃO WebRTC
      const simulatedStream = createSimulatedVideoStream(
        `${currentUser.firstName} ${currentUser.lastName}`,
        currentUser.profilePicture || DEFAULT_PROFILE_PIC
      );
      if (simulatedStream) {
        const silentAudio = createSilentAudioTrack();
        if (silentAudio) {
          simulatedStream.addTrack(silentAudio);
        }
        streamRef.current = simulatedStream;
        setLocalStream(simulatedStream);
        if (videoRef.current) {
          if (videoRef.current.srcObject !== simulatedStream) {
            videoRef.current.srcObject = simulatedStream;
            videoRef.current.play().catch(e => console.warn("Erro autoplay fallback:", e));
          }
        }
      }
    }
  };

  // Parar câmera do Host
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      if ((streamRef.current as any).stopSimulation) {
        (streamRef.current as any).stopSimulation();
      }
      streamRef.current = null;
    }
    setLocalStream(null);
    setIsSimulatingCamera(false);
  };

  // Funcionalidade de mandar chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !post) return;

    const newComment = {
      id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5),
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      profilePic: currentUser.profilePicture || DEFAULT_PROFILE_PIC,
      text: chatInput.trim(),
      timestamp: Date.now()
    };

    setChatInput('');
    await sendLiveMessage(post.id, newComment);
  };

  // Funcionalidade do botão likes/hearts
  const handlePulseHeart = () => {
    if (!post) return;
    pulseLiveHeart(post.id);
    triggerHearts(1);
  };

  // Desparador de efeitos visuais de corações flutuantes (locais)
  const triggerHearts = (count: number) => {
    const emojis = ['❤️', '🔥', '👾', '🚀', '⭐', '✨', '💎'];
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    const newHearts: FloatingHeart[] = [];

    for (let i = 0; i < count; i++) {
      newHearts.push({
        id: `${Date.now()}-${Math.random()}`,
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        left: 20 + Math.random() * 60 // Posição de 20% a 80% do container
      });
    }

    setHearts((prev) => [...prev, ...newHearts]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 3000);
  };

  // Funcionalidade de Doação de Apoio (Gorjetas)
  const handleDonate = async (amount: number, message: string) => {
    if (!post || !hostProfile) return;

    if (isNaN(amount) || amount <= 0) {
      showError('Por favor, informe um valor válido para a gorjeta.');
      return;
    }

    if ((currentUser.balance || 0) < amount) {
      showError(t('insufficient_balance_donation', 'Saldo insuficiente para esta doação. Carregue a sua carteira CyberPhone Primeiro!'));
      return;
    }

    const confirm = await showConfirm(
      `Você deseja apoiar ${hostProfile.firstName} enviando uma gorjeta de ${amount} KZ?`,
      { title: 'Confirmar Gorjeta', confirmText: 'Apoiar', cancelText: 'Cancelar' }
    );

    if (confirm) {
      const ok = await processDonation(currentUser.id, post.userId, amount, `Gorjeta na transmissão: ${post.liveStream?.title || ''}`);
      if (ok) {
        showSuccess(`Obrigado! Enviou ${amount} KZ de gorjeta para ${hostProfile.firstName}.`);
        setDonationModalOpen(false);
        setCustomAmount('');
        setCustomMessage('');
        await refreshUser();

        // Mandar anúncio para o liveChat
        const donationAnnouncement = {
          id: 'don-' + Date.now(),
          userId: 'system-donation',
          userName: currentUser.firstName,
          profilePic: currentUser.profilePicture || DEFAULT_PROFILE_PIC,
          text: `💎 ${currentUser.firstName} enviou ${amount} KZ com a mensagem: "${message || 'O stream está excelente!'}"! 🚀`,
          timestamp: Date.now(),
          isDonation: true,
          amount: amount
        };
        await sendLiveMessage(post.id, donationAnnouncement);
      } else {
        showError(t('donation_failed', 'Ocorreu um erro ao processar a transferência.'));
      }
    }
  };

  // Funcionalidade de criar Super Chat
  const handleBuySuperChat = async () => {
    if (!post || !hostProfile) return;
    const amount = Number(customSCAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('Por favor, informe um valor de contribuição válido para o Super Chat.');
      return;
    }

    if (amount < 150) {
      showError('O valor mínimo para criar um Super Chat com destaque é de 155 KZ.');
      return;
    }

    if ((currentUser.balance || 0) < amount) {
      showError('Saldo insuficiente para enviar este Super Chat. Carregue a sua carteira CyberPhone primeiro!');
      return;
    }

    const theme = getSuperChatTheme(amount);
    const labelDurationStr = theme.duration >= 60000 
      ? `${theme.duration / 60000} min` 
      : `${theme.duration / 1000} seg`;

    const confirm = await showConfirm(
      `Você deseja enviar um Super Chat de ${amount.toLocaleString('pt-AO')} KZ para ${hostProfile.firstName}? Sua mensagem ficará em destaque no topo por ${labelDurationStr}!`,
      { title: 'Confirmar Super Chat', confirmText: 'Comprar e Enviar', cancelText: 'Cancelar' }
    );

    if (confirm) {
      setSubmittingSuperChat(true);
      try {
        const ok = await processDonation(currentUser.id, post.userId, amount, `Super Chat na transmissão: ${post.liveStream?.title || ''}`);
        if (ok) {
          showSuccess(`Super Chat de ${amount.toLocaleString('pt-AO')} KZ enviado com sucesso! 🎉`);
          setSuperChatModalOpen(false);
          setCustomSCAmount('500');
          setSuperChatText('');
          await refreshUser();

          // Mandar o super chat no liveChat
          const superChatMessage = {
            id: 'sc-' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.firstName + ' ' + (currentUser.lastName || ''),
            profilePic: currentUser.profilePicture || DEFAULT_PROFILE_PIC,
            text: superChatText.trim(),
            timestamp: Date.now(),
            isSuperChat: true,
            superChatAmount: amount,
            superChatColor: theme.colorName,
            superChatDuration: theme.duration
          };

          await sendLiveMessage(post.id, superChatMessage);
        } else {
          showError(t('donation_failed', 'Ocorreu um erro ao processar a transferência.'));
        }
      } catch (err) {
        console.error(err);
        showError('Erro ao registrar Super Chat.');
      } finally {
        setSubmittingSuperChat(false);
      }
    }
  };

  // Host finaliza a live
  const handleEndStream = async () => {
    if (!post) return;

    const confirm = await showConfirm(
      t('confirm_end_stream', 'Deseja realmente encerrar esta transmissão ao vivo para todos os espectadores?'),
      { title: t('end_stream', 'Encerrar Transmissão'), confirmText: t('end', 'Encerrar'), cancelText: t('abort', 'Cancelar') }
    );

    if (confirm) {
      const endedPost = {
        ...post,
        liveStream: {
          ...post.liveStream,
          title: post.liveStream?.title || 'Fim da Live',
          description: post.liveStream?.description || '',
          status: 'ENDED' as const,
          recordingUrl: 'https://vjs.zencdn.net/v/oceans.mp4' // Gravação simulada em altíssima qualidade e compatibilidade
        }
      };

      await updatePost(endedPost);
      showSuccess(t('live_finished_success', 'Transmissão ao vivo encerrada com sucesso! Uma gravação foi salva.'));
      onNavigate('feed');
    }
  };

  // UI rendering
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <Radio className="h-10 w-10 text-red-500 animate-pulse mb-3" />
        <p className="text-xs uppercase font-black tracking-widest text-neutral-400">Sincronizando feed da live...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <p className="text-sm font-bold">{t('live_not_found', 'Transmissão não encontrada ou já expirada.')}</p>
        <button onClick={() => onNavigate('feed')} className="mt-4 px-6 py-2 bg-white text-black font-bold uppercase text-[10px] tracking-wider rounded-xl hover:scale-105 transition-all">
          Voltar para o Feed
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-[#07070a] text-neutral-100 flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* 1. SEÇÃO DE VÍDEO PRINCIPAL (Esquerda) */}
      <div className={`relative bg-black shrink-0 md:h-full md:flex-1 flex flex-col transition-all duration-300 ${isChatOpen ? (activeGuests.length > 0 ? 'h-[55vh] min-h-[380px]' : 'h-[43vh] min-h-[290px]') : 'h-full flex-1'}`}>
        
        {/* Top Header Controls overlay */}
        <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 z-30 flex items-center justify-between pointer-events-none gap-2">
          {/* Voltar e badges */}
          <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto shrink-0">
            <button 
              onClick={() => onNavigate('feed')}
              className="w-7 h-7 md:w-8.5 md:h-8.5 flex items-center justify-center border border-white/10 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors shadow-lg shrink-0 cursor-pointer"
              title="Voltar ao Feed"
            >
              <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <div className="h-7 md:h-8.5 flex items-center justify-center gap-1 bg-red-600 border border-red-500/20 px-2 md:px-3 rounded-full text-[7px] md:text-[8.5px] font-black uppercase tracking-wider leading-none shadow-lg animate-pulse text-white shrink-0">
              <span className="w-1 h-1 bg-white rounded-full"></span>
              LIVE
            </div>
            <div className="h-7 md:h-8.5 flex items-center justify-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 px-1.5 md:px-3 rounded-full text-[7px] md:text-[8.5px] font-black leading-none text-neutral-200 shadow-md shrink-0">
              <Eye className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-400" />
              {computedLiveViewerCount}
            </div>
          </div>

          {/* Botão de Encerrar ou Filtros */}
          <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto shrink-0">
            {isHost && (
              <button 
                onClick={() => setInviteModalOpen(true)}
                className="h-7 md:h-8.5 flex items-center justify-center px-2 md:px-3 bg-[#0e0e15]/95 hover:bg-neutral-900 text-emerald-400 border border-emerald-500/20 rounded-full text-[7px] md:text-[8.5px] font-black uppercase tracking-wider shadow-lg gap-1 transition-all animate-fade-in shrink-0 cursor-pointer"
                title="Convidar Co-Host"
              >
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                <span className="hidden sm:inline">Convidar</span>
              </button>
            )}

            {isHost ? (
              <button 
                onClick={handleEndStream}
                className="h-7 md:h-8.5 flex items-center justify-center px-2.5 md:px-4 bg-gradient-to-r from-red-600 to-rose-705 text-white border border-red-500/10 rounded-full text-[7px] md:text-[8.5px] font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Encerrar
              </button>
            ) : (
              <button 
                onClick={() => setDonationModalOpen(true)}
                className="h-7 md:h-8.5 flex items-center justify-center px-2 md:px-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 border border-amber-600/10 rounded-full text-[7px] md:text-[8.5px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/10 hover:scale-105 active:scale-95 transition-all gap-1 shrink-0 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                <span className="hidden sm:inline">Apoiar</span>
              </button>
            )}
          </div>
        </div>

        {/* ÁREA DE EXIBIÇÃO DO VÍDEO (SPLIT SCREEN PARA CO-HOSTS) */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
          
          {/* O Alerta de Gorjetas foi movido para o rodapé por solicitação do usuário */}

          {/* CONVITE DE CO-HOST RECEBIDO (Para Espectadores Convidados) */}
          {pendingInvitation && (
            <div className="absolute inset-x-4 bottom-18 z-30 p-4 bg-gradient-to-r from-indigo-950/95 via-purple-950/95 to-indigo-950/95 border-2 border-emerald-500 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-slide-up pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Convite para participar ao vivo!</h4>
                  <p className="text-[9px] text-gray-300 mt-0.5">O anfitrião te convidou para participar e aparecer na janela desta transmissão.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={handleAcceptInvite}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                >
                  Aceitar e Entrar
                </button>
                <button 
                  onClick={handleDeclineInvite}
                  className="px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 text-gray-400 hover:text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  Recusar
                </button>
              </div>
            </div>
          )}

          {/* Botão de sair da live se já estiver participando ao vivo como Guest */}
          {isJoinedGuest && (
            <button 
              onClick={handleLeaveAsGuest}
              className="absolute bottom-20 left-4 z-35 px-3 py-1.5 bg-red-600 hover:bg-red-700 border border-red-500/20 hover:scale-105 active:scale-95 text-white rounded-full text-[8px] font-black uppercase tracking-wider shadow-lg pointer-events-auto flex items-center gap-1"
            >
              🎤 Sair da Live
            </button>
          )}

          {/* Visualizadores dinâmicos */}
          {activeGuests.length > 0 ? (
            /* GRID SPLIT SCREEN (YouTube / Stream Together style) */
            <div className={`w-full h-full p-2 bg-[#050508] relative gap-2 ${activeGuests.length === 1 ? 'flex flex-col sm:flex-row' : 'grid grid-cols-1 sm:grid-cols-2'}`}>
              
              {/* Painel 1: O Host Principal */}
              <div className="relative flex-1 min-h-0 w-full h-full rounded-xl overflow-hidden bg-[#0d0d14] border border-white/10 flex flex-col items-center justify-center shadow-lg transition-all hover:border-indigo-400/40 group/host">
                {/* Tag de Broadcast Principal no canto superior esquerdo */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider text-white shadow shadow-red-600/10">
                  <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>
                  ANFITRIÃO
                </div>

                {/* Sindicatura de Equalizer/Microfone no canto superior direito */}
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded border border-white/5">
                  <div className="flex items-end gap-[1px] h-2">
                    <span className="w-[1px] h-1.5 bg-emerald-400 rounded animate-voice-bar-1"></span>
                    <span className="w-[1px] h-2 bg-emerald-400 rounded animate-voice-bar-2"></span>
                    <span className="w-[1px] h-[3px] bg-emerald-400 rounded animate-voice-bar-3"></span>
                  </div>
                  <span className="text-[6.5px] font-extrabold text-emerald-400 tracking-wider">AUDIO</span>
                </div>

                {isHost ? (
                  (videoActive && !isSimulatingCamera) ? (
                    <video 
                      ref={setVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover transform -scale-x-100 ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                    />
                  ) : isSimulatingCamera ? (
                    /* TRANSMISSÃO SIMULADA CIBERNÉTICA DO HOST NO GRID */
                    <div className="w-full h-full relative flex items-center justify-center bg-[#07070a] overflow-hidden">
                      {/* Scanlines virtuais leves por CSS */}
                      <div className="absolute inset-0 bg-[#09090d] bg-[linear-gradient(rgba(79,70,229,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-75"></div>
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] pointer-events-none"></div>

                      <div className="relative z-15 flex flex-col items-center justify-center gap-2 text-center p-2">
                        <div className="relative">
                          {/* Anel de rotação glow */}
                          <div className="absolute inset-[-4px] rounded-full border border-dashed border-violet-500/50 animate-spin" style={{ animationDuration: '10s' }}></div>
                          <div className="absolute inset-0 w-11 h-11 bg-indigo-500/10 rounded-full animate-pulse border border-indigo-500/20"></div>
                          <img 
                            src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} 
                            alt="Host profile" 
                            className="w-11 h-11 rounded-full object-cover relative z-10 border border-indigo-500/35"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[7px] uppercase font-black tracking-widest text-[#9d9dae]">Feed Virtual Ativo</span>
                        
                        <div className="flex flex-col gap-1 mt-1 shrink-0">
                          <button
                            onClick={startCamera}
                            className="px-2 py-0.5 bg-[#4f46e5]/40 hover:bg-[#4f46e5]/70 text-indigo-100 border border-indigo-500/30 rounded text-[6.5px] font-black uppercase tracking-wider cursor-pointer font-mono"
                          >
                            Reconectar Câmera 🔄
                          </button>
                          
                          <button 
                            onClick={() => {
                              showAlert(
                                "Como Ativar sua Câmera Real:\n\n" + 
                                (cameraError ? `Erro técnico original: "${cameraError}"\n\n` : "") +
                                "Instruções:\n" +
                                "1. Conceda permissão de câmera e microfone se o navegador solicitar.\n" +
                                "2. IMPORTANTE: No painel integrado do AI Studio, as políticas de segurança do navegador podem bloquear o acesso à câmera dentro do iframe do editor. Para contornar isso e usar sua câmera real com perfeição, basta clicar no botão de 'Abrir aplicativo em nova guia' (ícone de seta/quadrado no topo da página) para rodar o applet diretamente. Isso libera o acesso instantaneamente!",
                                { title: "Dica de Câmera Real 💡", type: "alert" }
                              );
                            }}
                            className="px-2 py-0.5 bg-amber-500/25 hover:bg-amber-500/45 text-amber-300 border border-amber-500/30 rounded text-[6.5px] font-black uppercase tracking-wider cursor-pointer font-mono"
                          >
                            Ajuda Câmera 💡
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#0a0a10] flex flex-col items-center justify-center gap-2">
                      <div className="relative">
                        <div className="absolute inset-0 w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-pulse"></div>
                        <img 
                          src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} 
                          alt="Host profile" 
                          className="w-12 h-12 rounded-full object-cover relative z-10 border border-indigo-500/35"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[7.5px] uppercase font-black tracking-widest text-[#6c6c8c]">Câmera Desligada</p>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full relative">
                    {remoteStream ? (
                      <video 
                        ref={setVideoRef} 
                        autoPlay 
                        playsInline 
                        className={`w-full h-full object-cover ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                      />
                    ) : (
                      <canvas 
                        ref={canvasRef} 
                        className={`w-full h-full object-cover ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                      />
                    )}
                  </div>
                )}

                {/* HUD Label do Host / Transmissor com design compacto super elegante */}
                <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 p-1 px-2 bg-black/75 backdrop-blur-sm border border-white/10 rounded-lg max-w-[85%]">
                  <div className="w-3.5 h-3.5 rounded-full overflow-hidden border border-white/20 shrink-0">
                    <img 
                      src={hostProfile?.profilePicture || DEFAULT_PROFILE_PIC} 
                      className="w-full h-full object-cover" 
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[8px] md:text-[9px] font-bold tracking-tight text-white truncate flex items-center gap-0.5">
                    {hostProfile?.firstName || 'Anfitrião'}
                    <CheckCircle2 className="w-2.5 h-2.5 text-blue-400 fill-blue-400 shrink-0" />
                    <span className="text-[6.5px] text-indigo-300 font-extrabold px-1 rounded bg-indigo-500/20 uppercase tracking-widest scale-90">Host</span>
                  </span>
                </div>
              </div>

              {/* Painéis para os Co-Hosts/Guests */}
              {activeGuests.map((g: any) => {
                const isThisGuestMe = g.userId === currentUser.id;
                return (
                  <div key={g.userId} className="relative flex-1 min-h-0 w-full h-full rounded-xl overflow-hidden bg-[#0a0a0f] border border-white/10 flex flex-col items-center justify-center shadow-lg transition-all hover:border-emerald-400/40 group/guest">
                    {/* Tag de Co-Host no canto superior esquerdo */}
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-emerald-600/95 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider text-white shadow shadow-emerald-600/10">
                      <span className="w-1 h-1 bg-emerald-300 rounded-full animate-pulse"></span>
                      CONVIDADO
                    </div>

                    {/* Controles rápidos de Host no canto superior direito */}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 pointer-events-auto">
                      <div className="flex items-center gap-[2px] px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded border border-white/5">
                        <div className="flex items-end gap-[1px] h-2">
                          <span className="w-[1px] h-2 bg-emerald-400 rounded animate-voice-bar-4"></span>
                          <span className="w-[1px] h-1 bg-emerald-400 rounded animate-voice-bar-2"></span>
                          <span className="w-[1px] h-1.5 bg-emerald-400 rounded animate-voice-bar-3"></span>
                        </div>
                      </div>
                      {isHost && (
                        <button 
                          onClick={() => handleRemoveGuest(g.userId, g.userName)}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[7.5px] font-black uppercase tracking-wider border border-red-500/20 shadow-md cursor-pointer transition-colors"
                          title="Remover Co-Host de sua Transmissão"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    {isThisGuestMe ? (
                      /* Câmera real do Convidado participando */
                      (guestVideoActive && !isSimulatingGuestCamera) ? (
                        <video 
                          ref={setGuestVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                      ) : isSimulatingGuestCamera ? (
                        /* TRANSMISSÃO SIMULADA EM CANVA CYBER-GRID DO CONVIDADO NO GRID */
                        <div className="w-full h-full relative flex items-center justify-center bg-[#07070a] overflow-hidden">
                          {/* Scanlines virtuais leves por CSS */}
                          <div className="absolute inset-0 bg-[#09090d] bg-[linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:16px_16px] opacity-75"></div>
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] pointer-events-none"></div>

                          <div className="relative z-15 flex flex-col items-center justify-center gap-2 text-center p-2">
                            <div className="relative">
                              <div className="absolute inset-[-4px] rounded-full border border-dashed border-emerald-500/50 animate-spin" style={{ animationDuration: '10s' }}></div>
                              <div className="absolute inset-0 w-11 h-11 bg-emerald-500/10 rounded-full animate-pulse border border-emerald-500/20"></div>
                              <img 
                                src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} 
                                alt="Your profile" 
                                className="w-11 h-11 rounded-full object-cover border border-emerald-400 relative z-10"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="text-[7px] uppercase font-black tracking-widest text-emerald-400">Microfone/Feed Ativo</span>
                            
                            <div className="flex flex-col gap-1 mt-1 shrink-0">
                              <button
                                onClick={startGuestCamera}
                                className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-200 border border-emerald-500/30 rounded text-[6.5px] font-black uppercase tracking-wider cursor-pointer font-mono"
                              >
                                Reconectar Câmera 🔄
                              </button>
                              
                              <button 
                                onClick={() => {
                                  showAlert(
                                    "Como Ativar sua Câmera de Convidado:\n\n" + 
                                    (guestCameraError ? `Erro técnico original: "${guestCameraError}"\n\n` : "") +
                                    "Instruções:\n" +
                                    "1. Conceda permissão de câmera e microfone se o navegador solicitar.\n" +
                                    "2. IMPORTANTE: No painel integrado do AI Studio, as políticas do navegador podem bloquear o acesso à câmera dentro do iframe por segurança. Para contornar isso, basta clicar no botão de 'Abrir aplicativo em nova guia' (ícone no topo superior direito da página) para rodá-lo diretamente, o que libera o acesso à sua câmera real na hora!",
                                    { title: "Dica de Câmera de Convidado 💡", type: "alert" }
                                  );
                                }}
                                className="px-2 py-0.5 bg-amber-500/25 hover:bg-amber-500/45 text-amber-300 border border-emerald-500/30 rounded text-[6.5px] font-black uppercase tracking-wider cursor-pointer font-mono"
                              >
                                Ajuda Câmera 💡
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-[#0a0a10] flex flex-col items-center justify-center gap-2">
                          <div className="relative">
                            <div className="absolute inset-0 w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-pulse"></div>
                            <img 
                              src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} 
                              alt="Guest camera" 
                              className="w-12 h-12 rounded-full object-cover relative z-10 border border-emerald-500/35"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-[7.5px] uppercase font-black tracking-widest text-[#6c6c8c]">Câmera OFF</p>
                        </div>
                      )
                    ) : (
                      isHost && remoteGuestStream ? (
                        <video 
                          ref={(el) => {
                            if (el) {
                              if (el.srcObject !== remoteGuestStream) {
                                console.log("[LiveStream-Guest] Vinculando feed real do participante convidado...");
                                el.srcObject = remoteGuestStream;
                                el.play().catch(e => console.warn("Erro ao reproduzir feed real do convidado:", e));
                              }
                            }
                          }}
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Stream simulada com altissíma fidelidade para os outros */
                        <div className="w-full h-full bg-gradient-to-br from-[#08080f] via-[#10101d] to-[#08080f] flex flex-col items-center justify-center p-3 relative">
                          {/* Círculo com foto de perfil e ondas de pulso neon */}
                          <div className="relative mb-1.5">
                            <div className="absolute inset-0 w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-400 animate-pulse opacity-50"></div>
                            <img 
                              src={g.profilePic || DEFAULT_PROFILE_PIC} 
                              alt={g.userName} 
                              className="w-11 h-11 rounded-full object-cover relative z-10 border border-emerald-500/40 shadow-lg" 
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Ondas Sonoras Equalizadoras Animadas */}
                          <div className="flex items-end gap-[2px] h-3.5 mb-1.5">
                            <span className="w-[1.5px] bg-emerald-400 rounded-full animate-voice-bar-1"></span>
                            <span className="w-[1.5px] bg-emerald-400 rounded-full animate-voice-bar-2"></span>
                            <span className="w-[1.5px] bg-emerald-400 rounded-full animate-voice-bar-3"></span>
                            <span className="w-[1.5px] bg-emerald-400 rounded-full animate-voice-bar-4"></span>
                          </div>

                          <span className="text-[6.5px] tracking-widest leading-none font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                            Co-Host
                          </span>
                        </div>
                      )
                    )}

                    {/* HUD Label do Convidado com design compacto super elegante */}
                    <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 p-1 px-2 bg-black/75 backdrop-blur-sm border border-white/10 rounded-lg max-w-[85%]">
                      <div className="w-3.5 h-3.5 rounded-full overflow-hidden border border-white/20 shrink-0">
                        <img 
                          src={g.profilePic || DEFAULT_PROFILE_PIC} 
                          className="w-full h-full object-cover" 
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[8px] md:text-[9px] font-bold tracking-tight text-white truncate flex items-center gap-0.5">
                        {g.userName}
                        <span className="text-[6.5px] text-emerald-300 font-extrabold px-1 rounded bg-emerald-500/20 uppercase tracking-widest scale-90">Conv</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SINGLE STREAM AREA (Original) */
            <>
              {isHost ? (
                /* FEED DA CÂMERA LOCAL DA PESSOA */
                <div className="w-full h-full flex items-center justify-center bg-zinc-950 relative">
                  {(videoActive && !isSimulatingCamera) ? (
                    <video 
                      ref={setVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover transform -scale-x-100 ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                    />
                  ) : isSimulatingCamera ? (
                    /* TRANSMISSÃO SIMULADA EM CANVA CYBER-GRID COM DETALHES DO HOST */
                    <div className="w-full h-full relative flex items-center justify-center bg-[#07070a] overflow-hidden">
                      <canvas 
                        ref={canvasRef} 
                        className={`absolute inset-0 w-full h-full object-cover opacity-60 ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                      />
                      
                      {/* Holographic scanner grid lines overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-10"></div>

                      {/* Avatar e HUD overlays */}
                      <div className="relative z-20 flex flex-col items-center justify-center gap-3 text-center p-4">
                        <div className="relative">
                          {/* Future glowing spinning ring */}
                          <div className="absolute inset-[-6px] rounded-full border border-dashed border-violet-500/50 animate-spin" style={{ animationDuration: '10s' }}></div>
                          <div className="absolute inset-0 w-20 h-20 rounded-full bg-violet-500/5 border border-violet-500/20 animate-pulse"></div>
                          
                          <img 
                            src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} 
                            alt="Your Avatar" 
                            className="w-20 h-20 rounded-full object-cover border-2 border-violet-400 shadow-xl shadow-violet-500/30 relative z-20"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-1 right-0.5 z-35 bg-violet-600 border border-violet-400/50 px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase text-white tracking-wider shadow-lg flex items-center gap-1 scale-90">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span>
                            PROPRIETÁRIO
                          </div>
                        </div>

                        <div className="relative z-20">
                          <h3 className="text-xs font-black uppercase tracking-wider text-[#ececf1] bg-black/75 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md inline-block">
                            {currentUser.firstName} (Você)
                          </h3>
                          <div className="flex items-center justify-center gap-1 mt-1.5 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-md text-[8px] font-bold tracking-widest text-[#9d9dae] uppercase max-w-[200px] mx-auto">
                            Feed Virtual Ativo
                          </div>
                          
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <button
                              onClick={startCamera}
                              className="px-2.5 py-1 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/30 rounded-lg text-[8px] font-black uppercase tracking-wider cursor-pointer shadow-md font-mono"
                            >
                              Reconectar Câmera 🔄
                            </button>
                            
                            <button 
                              onClick={() => {
                                showAlert(
                                  "Como Ativar sua Câmera Real:\n\n" + 
                                  (cameraError ? `Erro técnico original: "${cameraError}"\n\n` : "") +
                                  "Instruções Importantes:\n" +
                                  "1. Permita o uso da câmera na barra de endereços do seu navegador.\n" +
                                  "2. DETECTADO: Navegadores restringem severamente o acesso a câmeras de dentro de iframes (como o assistente do Google AI Studio). Para resolver isso e usar sua câmera real com perfeição, clique no botão ABRI EM NOVA GUIA (ícone de seta/quadrado no canto superior direito do simulador).\n" +
                                  "3. Nas lives e chamadas, isso libera o stream de áudio e vídeo em tempo real instantaneamente!",
                                  { title: "Dica de Câmera Real 💡", type: "alert" }
                                );
                              }}
                              className="px-2.5 py-1 bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 border border-amber-500/30 rounded-lg text-[8px] font-black uppercase tracking-wider cursor-pointer shadow-md font-mono"
                            >
                              Ajuda Câmeras 💡
                            </button>
                          </div>
                        </div>

                        {/* Telemetry info data labels to look extremely advanced and professional */}
                        <div className="hidden sm:grid grid-cols-3 gap-2 px-3 py-1 bg-black/50 border border-white/5 backdrop-blur-sm rounded-lg text-[7px] font-mono tracking-wider text-gray-500 mt-2">
                          <div>FPS: <span className="text-emerald-400 font-bold">60.0</span></div>
                          <div className="border-x border-white/5">DECIBEL: <span className="text-indigo-400 font-bold">-18dB</span></div>
                          <div>FEED: <span className="text-violet-400 font-bold">CYBER HUD</span></div>
                        </div>
                      </div>
                      
                      {/* Moldura Cyber HUD nos cantos extra */}
                      <div className="absolute inset-0 pointer-events-none border-[3px] border-indigo-500/10 z-30"></div>
                      <div className="absolute top-2 left-2 w-8 h-8 border-t border-l border-emerald-400/60 pointer-events-none z-30"></div>
                      <div className="absolute top-2 right-2 w-8 h-8 border-t border-r border-emerald-400/60 pointer-events-none z-30"></div>
                      <div className="absolute bottom-2 left-2 w-8 h-8 border-b border-l border-emerald-400/60 pointer-events-none z-30"></div>
                      <div className="absolute bottom-2 right-2 w-8 h-8 border-b border-r border-emerald-400/60 pointer-events-none z-30"></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-neutral-500">
                      <VideoOff className="w-10 h-10 text-red-500 animate-pulse" />
                      <p className="text-[9px] uppercase font-bold tracking-widest text-neutral-600">Câmera desativada</p>
                    </div>
                  )}
                </div>
              ) : (
                /* FEED DA CÂMERA DO HOST PARA OS VIEWERS */
                <div className="w-full h-full flex items-center justify-center bg-zinc-950 relative">
                  {remoteStream ? (
                    <video 
                      ref={setVideoRef} 
                      autoPlay 
                      playsInline 
                      className={`w-full h-full object-cover ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                    />
                  ) : (
                    /* CANVA DE STREAM SIMULADA CIBERNÉTICA COM PERFIL DO HOST (VIEWERS) */
                    <div className="w-full h-full relative flex items-center justify-center bg-[#07070a] overflow-hidden">
                      <canvas 
                        ref={canvasRef} 
                        className={`absolute inset-0 w-full h-full object-cover opacity-60 ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                      />
                      
                      {/* Holographic scanner grid lines overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-10"></div>

                      {/* Cenários de Avatar & Ondulação em frente ao Canvas */}
                      <div className="relative z-20 flex flex-col items-center justify-center gap-3 text-center p-4">
                        <div className="relative">
                          {/* Future glowing spinning ring */}
                          <div className="absolute inset-[-6px] rounded-full border border-dashed border-indigo-500/50 animate-spin" style={{ animationDuration: '10s' }}></div>
                          <div className="absolute inset-0 w-20 h-20 rounded-full bg-indigo-500/5 border border-indigo-500/20 animate-pulse"></div>
                          
                          <img 
                            src={hostProfile?.profilePicture || DEFAULT_PROFILE_PIC} 
                            alt="Profile" 
                            className="w-20 h-20 rounded-full object-cover border-2 border-indigo-400 shadow-xl shadow-indigo-500/30 relative z-20"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Badge Ao vivo */}
                          <div className="absolute -bottom-1 right-0.5 z-35 bg-indigo-600 border border-indigo-400/50 px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase text-white tracking-wider shadow-lg flex items-center gap-1 scale-90">
                            <span className="w-1 bg-[#10b981] h-1 rounded-full animate-ping"></span>
                            AO VIVO
                          </div>
                        </div>
                        
                        <div className="relative z-20">
                          <h3 className="text-xs font-black uppercase tracking-wider text-[#ececf1] bg-black/75 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md inline-block">
                            {hostProfile?.firstName ? `${hostProfile.firstName} ${hostProfile.lastName || ''}` : 'Anfitrião'}
                          </h3>
                          <div className="flex items-center justify-center gap-1 mt-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md text-[8px] font-bold tracking-widest text-[#9d9dae] uppercase max-w-[200px] mx-auto">
                            Sinal Sincronizado
                          </div>
                        </div>

                        {/* Telemetry labels */}
                        <div className="hidden sm:grid grid-cols-3 gap-2 px-3 py-1 bg-black/50 border border-white/5 backdrop-blur-sm rounded-lg text-[7px] font-mono tracking-wider text-gray-500 mt-2">
                          <div>REDE: <span className="text-emerald-400 font-bold">12ms</span></div>
                          <div className="border-x border-white/5">LATENCY: <span className="text-indigo-400 font-bold">LOW</span></div>
                          <div>QUALITY: <span className="text-violet-400 font-bold">1080p</span></div>
                        </div>
                      </div>

                      {/* Moldura Cyber HUD nos cantos extra */}
                      <div className="absolute inset-0 pointer-events-none border-[3px] border-indigo-500/10 z-30"></div>
                      <div className="absolute top-2 left-2 w-8 h-8 border-t border-l border-emerald-400/60 pointer-events-none z-30"></div>
                      <div className="absolute top-2 right-2 w-8 h-8 border-t border-r border-emerald-400/60 pointer-events-none z-30"></div>
                      <div className="absolute bottom-2 left-2 w-8 h-8 border-b border-l border-emerald-400/60 pointer-events-none z-30"></div>
                      <div className="absolute bottom-2 right-2 w-8 h-8 border-b border-r border-emerald-400/60 pointer-events-none z-30"></div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Animação de Corações Flutuantes no Canto Inferior Direito do Vídeo */}
          <div className="absolute bottom-16 right-6 z-20 pointer-events-none flex flex-col items-center select-none">
            {hearts.map((h) => (
              <div 
                key={h.id} 
                style={{ 
                  left: `${h.left}%`,
                  color: h.color,
                  textShadow: `0 0 8px ${h.color}`
                }}
                className="absolute text-2xl font-bold animate-float-heart duration-3000 bottom-0 pointer-events-none"
              >
                {h.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* ALERTA DE GORJETA NO RODAPÉ COM TTS (10 segundos) */}
        {donationAlert && (
          <div className="absolute bottom-16 md:bottom-20 left-2 md:left-4 right-2 md:right-4 z-30 pointer-events-auto select-none animate-slide-up">
            <div className="mx-auto max-w-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-amber-300 shadow-2xl rounded-2xl p-3 flex items-center justify-between gap-3 text-slate-950 font-sans">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0 animate-bounce">💎</span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-black uppercase tracking-wider leading-none">NOVA GORJETA!</p>
                  <p className="text-[11px] font-extrabold mt-0.5 truncate text-slate-900">
                    <span className="underline font-black">{donationAlert.donor}</span> enviou <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded-md font-black">{donationAlert.amount} KZ</span>
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-bold italic truncate max-w-[180px] sm:max-w-[280px] border-l border-amber-600/30 pl-3 leading-tight self-center text-slate-800">
                "{donationAlert.message || 'Sem mensagem'}"
              </div>
            </div>
          </div>
        )}

        {/* OVERLAYS E CONTROLES DE MÍDIA HUD */}
        <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4 z-20 flex items-center justify-between p-2 md:p-3 rounded-xl md:rounded-2xl bg-black/60 backdrop-blur-md border border-white/5 shadow-2xl">
          {/* Info do Streamer */}
          <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0 flex-1">
            <img 
              src={hostProfile?.profilePicture || DEFAULT_PROFILE_PIC} 
              alt={hostProfile?.firstName} 
              className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl object-cover border border-white/10 shadow-md shrink-0" 
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 pr-1 md:pr-2">
              <p className="text-[10px] md:text-[11px] font-black uppercase text-white tracking-widest truncate leading-tight flex items-center gap-1">
                {hostProfile?.firstName ? `${hostProfile.firstName} ${hostProfile.lastName || ''}` : 'Anfitrião Cyber'}
                {hostProfile?.isVerified && <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-400 fill-blue-400" />}
              </p>
              <p className="text-[8px] md:text-[9px] font-bold text-emerald-400 truncate tracking-wide mt-0.5 max-w-[80px] sm:max-w-[150px] md:max-w-[240px] hidden sm:block">
                {post.liveStream?.title || 'Cyber Transmissão'}
              </p>
            </div>
          </div>

          {/* Controles de Streamer / Espectador */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            
            {/* Toggle de Comentários do Chat */}
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-1.5 md:p-2 rounded-lg md:rounded-xl border transition-all cursor-pointer flex items-center justify-center ${isChatOpen ? 'bg-emerald-600/25 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/10' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
              title={isChatOpen ? 'Ocultar Comentários' : 'Mostrar Comentários'}
            >
              <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>

            {/* Filtros em tempo real */}
            <div className="relative group/filter">
              <select 
                value={currentFilter} 
                onChange={(e) => setCurrentFilter(e.target.value)}
                className="bg-neutral-900 border border-white/10 text-neutral-300 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded-lg md:rounded-xl px-1.5 md:px-2.5 py-1 md:py-1.5 focus:outline-none hover:bg-neutral-855 transition-colors cursor-pointer"
              >
                {LIVE_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {isHost ? (
              <>
                <button 
                  onClick={() => setVideoActive(!videoActive)}
                  className={`p-1.5 md:p-2 rounded-lg md:rounded-xl border transition-all ${videoActive ? 'bg-indigo-600 border-indigo-500/20 text-white' : 'bg-red-950/20 border-red-500/20 text-red-400'}`}
                  title={videoActive ? 'Desativar Câmera' : 'Ativar Câmera'}
                >
                  {videoActive ? <Video className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <VideoOff className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </button>
                <button 
                  onClick={() => setAudioActive(!audioActive)}
                  className={`p-1.5 md:p-2 rounded-lg md:rounded-xl border transition-all ${audioActive ? 'bg-indigo-600 border-indigo-500/20 text-white' : 'bg-red-950/20 border-red-500/20 text-red-400'}`}
                  title={audioActive ? 'Muta Microfone' : 'Ativar Microfone'}
                >
                  {audioActive ? <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <MicOff className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setSoundMuted(!soundMuted)}
                className={`p-1.5 md:p-2 rounded-lg md:rounded-xl border transition-all ${!soundMuted ? 'bg-indigo-600 border-indigo-500/20 text-white shadow-lg shadow-indigo-600/10' : 'bg-red-950/20 border-red-500/20 text-red-400'}`}
                title={!soundMuted ? 'Mudar Som' : 'Ativar Áudio'}
              >
                {!soundMuted ? <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <VolumeX className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              </button>
            )}

            {!isHost && (
              <button 
                onClick={handlePulseHeart}
                className="p-1.5 md:p-2 bg-gradient-to-r from-red-500 to-pink-500 border border-red-400/20 text-white rounded-lg md:rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all outline-none"
                title="Curtir / Reagir"
              >
                <Heart className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 2. CHAT AO VIVO EM TEMPO REAL (Direita) */}
      {isChatOpen && (
        <div className="flex-1 min-h-0 md:h-full md:w-[350px] lg:w-[400px] flex flex-col border-t md:border-t-0 md:border-l border-white/5 bg-[#09090c] shrink-0 relative overflow-hidden animate-fade-in">
          {/* Cabecalho de chat */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[10px] tracking-widest font-black uppercase text-neutral-300">Live Chat ao Vivo</h2>
            </div>
            
            <div className="flex items-center gap-2 font-sans">
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-[8px] font-bold text-indigo-400 uppercase tracking-wider">
                Sincronizado
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 bg-white/5 hover:bg-red-500/15 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                title="Fechar Comentários"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* PRATELEIRA DE SUPER CHATS EM DESTAQUE */}
          {activeSuperChats.length > 0 && (
            <div className="px-3.5 py-2.5 bg-[#09090c] border-b border-white/10 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-850 scrollbar-track-transparent items-center select-none shrink-0 animate-fade-in">
              <span className="text-[7.5px] font-black text-red-500 uppercase tracking-widest shrink-0 bg-red-500/10 px-1.5 py-1.5 rounded border border-red-500/20 mr-1 animate-pulse flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 fill-red-500 text-red-500" /> SUPER CHATS
              </span>
              {activeSuperChats.map((sc: any, scIdx: number) => {
                const theme = getSuperChatTheme(sc.superChatAmount || 0);
                const isSelected = selectedActiveSuperChat?.id === sc.id;
                
                // Calculate remaining display percentage
                const elapsed = nowTick - sc.timestamp;
                const duration = sc.superChatDuration || theme.duration;
                const percentRemaining = Math.max(0, Math.min(100, 100 - (elapsed / duration) * 100));

                return (
                  <button
                    key={sc.id || scIdx}
                    onClick={() => setSelectedActiveSuperChat(isSelected ? null : sc)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-white shadow-md hover:scale-[1.03] active:scale-95 transition-all shrink-0 cursor-pointer relative overflow-hidden ${theme.bgHeader} ${
                      isSelected ? 'ring-2 ring-white/60 border-white/20 animate-pulse' : 'border-white/5'
                    }`}
                  >
                    {/* Time indicator line */}
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-black/40 transition-all duration-1000" 
                      style={{ width: `${percentRemaining}%` }}
                    />
                    
                    <img 
                      src={sc.profilePic || DEFAULT_PROFILE_PIC} 
                      className="w-5.5 h-5.5 rounded-lg object-cover border border-white/20 shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[10px] font-black font-mono leading-none">{(sc.superChatAmount || 0).toLocaleString('pt-AO')} KZ</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* DETALHES DO SUPER CHAT SELECIONADO NO TOPO */}
          {selectedActiveSuperChat && activeSuperChats.some((s: any) => s.id === selectedActiveSuperChat.id) && (
            <div className="bg-[#0b0c10] border-b border-white/10 p-3 flex flex-col font-sans text-white animate-fade-in shrink-0 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={selectedActiveSuperChat.profilePic || DEFAULT_PROFILE_PIC} 
                    className="w-6.5 h-6.5 rounded-lg object-cover border border-white/10" 
                    referrerPolicy="no-referrer" 
                  />
                  <div>
                    <p className="text-[10px] font-black text-neutral-200">{selectedActiveSuperChat.userName}</p>
                    <p className="text-[8px] uppercase tracking-wider text-amber-500 font-extrabold flex items-center gap-0.5 animate-pulse">
                      <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Super Chat Solicitado
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${getSuperChatTheme(selectedActiveSuperChat.superChatAmount).accentColor} bg-black/20`}>
                    {selectedActiveSuperChat.superChatAmount.toLocaleString('pt-AO')} KZ
                  </span>
                  <button 
                    onClick={() => setSelectedActiveSuperChat(null)} 
                    className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {selectedActiveSuperChat.text && (
                <p className="text-[11px] text-neutral-300 bg-black/40 p-2.5 rounded-xl italic leading-relaxed border border-white/5 break-words">
                  "{selectedActiveSuperChat.text}"
                </p>
              )}
            </div>
          )}

        {/* FEED DE COMENTÁRIOS DO CHAT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 p-6">
              <Sparkles className="h-7 w-7 opacity-30 animate-pulse mb-3 text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma mensagem ainda</p>
              <p className="text-[9px] mt-1">Envie a primeira mensagem para agitar esta live!</p>
            </div>
          ) : (
            comments.map((c: any, index) => {
              const displayUserName = c.isAnonymous ? t('anonymous_user') : c.userName;
              const displayUserPic = c.isAnonymous ? ANONYMOUS_PROFILE_PIC : (c.profilePic || DEFAULT_PROFILE_PIC);
              
              if (c.isDonation) {
                // Renderização especial de doadores em destaque
                return (
                  <div key={c.id || index} className="p-3 bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-transparent border border-amber-500/30 rounded-xl shadow-lg border-l-4 border-l-amber-500 flex gap-2.5 animate-fade-in">
                    <div className="w-7 h-7 bg-amber-500/20 flex items-center justify-center rounded-lg text-amber-400 shrink-0 border border-amber-500/20">
                      ★
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black tracking-widest text-amber-400 uppercase leading-none">DOAÇÃO DA STREAM</p>
                      <p className="text-[11px] font-medium text-neutral-200 mt-1.5 break-words">{c.text}</p>
                    </div>
                  </div>
                );
              }

              if (c.isSuperChat) {
                const theme = getSuperChatTheme(c.superChatAmount || 0);
                return (
                  <div key={c.id || index} className="rounded-xl overflow-hidden shadow-lg border border-white/5 animate-fade-in flex flex-col font-sans">
                    <div className={`p-3 ${theme.bgHeader} flex gap-2.5 items-center`}>
                      <img 
                        src={displayUserPic} 
                        alt={displayUserName} 
                        className="w-7.5 h-7.5 rounded-lg object-cover border border-white/15 animate-pulse"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-[9.5px] font-bold tracking-widest uppercase truncate leading-none ${theme.textHeader}`}>
                            {displayUserName}
                          </p>
                          <span className={`text-[9.5px] font-black px-2 py-0.5 rounded text-white font-mono bg-black/25 shrink-0 ${theme.accentColor}`}>
                            {(c.superChatAmount || 0).toLocaleString('pt-AO')} KZ
                          </span>
                        </div>
                        <p className={`text-[8px] font-extrabold uppercase tracking-wider mt-1 opacity-80 leading-none ${theme.textHeader} flex items-center gap-0.5`}>
                          <Zap className="w-2.5 h-2.5 fill-current text-yellow-300" /> Super Chat
                        </p>
                      </div>
                    </div>
                    {c.text && (
                      <div className={`p-3 ${theme.bgBody} text-[11px] leading-relaxed break-words whitespace-pre-wrap font-medium ${theme.textBody}`}>
                        {c.text}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={c.id || index} className="flex gap-2.5 items-start group hover:bg-white/[0.01] p-1 rounded-xl transition-colors">
                  <img 
                    src={displayUserPic} 
                    alt={displayUserName} 
                    className="w-7.5 h-7.5 rounded-lg object-cover border border-white/5 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-neutral-400 leading-none tracking-widest uppercase flex items-center gap-1">
                      {displayUserName} 
                      {c.userId === post.userId && (
                        <span className="bg-red-600/25 text-red-400 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">HOST</span>
                      )}
                    </p>
                    <p className="text-[11px] text-neutral-100 mt-1 break-words leading-relaxed whitespace-pre-wrap">{c.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT DE ENVIO DO CHAT */}
        <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 bg-black/40 flex items-center gap-2">
          {!isHost && (
            <div className="flex gap-1.5 shrink-0">
              <button 
                type="button"
                onClick={() => setDonationModalOpen(true)}
                className="p-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 outline-none flex items-center justify-center shrink-0"
                title="Apoiar com Gorjeta / Doação"
              >
                <Coins className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                onClick={() => setSuperChatModalOpen(true)}
                className="p-2.5 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 outline-none flex items-center justify-center shrink-0 border border-red-500/20"
                title="Enviar Super Chat (Destaque)"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              </button>
            </div>
          )}
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t('write_live_message', 'Escribe una mensaje...')}
            className="flex-1 bg-neutral-900 border border-white/10 text-[11px] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500/50 hover:bg-neutral-800 transition-colors"
          />
          <button 
            type="submit"
            disabled={!chatInput.trim()}
            className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 outline-none"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
      )}

      {/* 3. MODAL DE DOAÇÃO DE INCENTIVOS / GORJETAS (Viewers) */}
      {donationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0d0d12] border border-white/10 rounded-[28px] p-6 shadow-2xl relative animate-scale-up">
            <button 
              onClick={() => setDonationModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 flex items-center justify-center mb-2.5 shadow-lg shadow-amber-500/20">
                <Coins className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Apoiar Transmissor</h3>
              <p className="text-[10px] text-gray-400 max-w-xs leading-normal">
                Envie uma gorjeta instantânea para o anfitrião. Seu apoio aparecerá destacado no chat e na tela!
              </p>
            </div>

            {/* Saldo da pessoa */}
            <div className="flex items-center justify-between bg-zinc-950/50 border border-white/5 rounded-2xl px-4 py-2.5 mb-4">
              <span className="text-[9px] uppercase font-black tracking-widest text-neutral-400">Teu Saldo:</span>
              <span className="text-xs font-black text-emerald-400 font-mono">
                {(currentUser.balance || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} KZ
              </span>
            </div>

            {/* Lista de Tiers Rápidos */}
            <p className="text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-2 px-1">Selecione uma Oferta Rápida:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DONATION_TIERS.map((tier) => (
                <button 
                  key={tier.amount}
                  type="button"
                  onClick={() => {
                    setCustomAmount(tier.amount.toString());
                    setCustomMessage(`Enviou ${tier.name}!`);
                  }}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition-all group ${
                    customAmount === tier.amount.toString() 
                      ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5' 
                      : 'bg-zinc-900/60 border-white/5 hover:border-white/10 hover:bg-zinc-800/40'
                  }`}
                >
                  <span className="text-[10px] font-extrabold text-white leading-tight group-hover:text-amber-400">{tier.name.split(' ')[0]}</span>
                  <span className="text-[10.5px] font-mono font-black text-amber-500 mt-1">{tier.amount} KZ</span>
                </button>
              ))}
            </div>

            {/* Custom Amount input e custom message */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[8.5px] font-black text-neutral-450 uppercase tracking-widest block mb-1.5 px-1">Valor Personalizado (KZ):</label>
                <input 
                  type="number" 
                  min="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Por ex: 250"
                  className="w-full bg-neutral-900 border border-white/10 text-[11px] text-white rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-amber-500 hover:bg-neutral-800 transition-colors"
                />
              </div>

              <div>
                <label className="text-[8.5px] font-black text-neutral-450 uppercase tracking-widest block mb-1.5 px-1">Mensagem de Apoio:</label>
                <textarea 
                  rows={2}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Deixe um incentivo que todos vão ler na transmissão!"
                  className="w-full bg-neutral-900 border border-white/10 text-[11px] text-white rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500 hover:bg-neutral-800 transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>

            <button
              onClick={() => handleDonate(Number(customAmount), customMessage)}
              disabled={!customAmount || Number(customAmount) <= 0}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 disabled:opacity-30 disabled:pointer-events-none text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Confirmar e Enviar Gorjeta 💎
            </button>
          </div>
        </div>
      )}

      {/* 3B. MODAL DE COMPRA DE SUPER CHATS (Espectadores) */}
      {superChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0d0d12] border border-white/10 rounded-[28px] p-6 shadow-2xl relative animate-scale-up font-sans text-white">
            <button 
              onClick={() => {
                setSuperChatModalOpen(false);
                setSuperChatText('');
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-r from-red-500 to-orange-600 text-white flex items-center justify-center mb-2.5 shadow-lg shadow-red-500/20 animate-pulse">
                <Zap className="w-5.5 h-5.5 text-yellow-300 fill-yellow-300 animate-bounce" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">
                Enviar Super Chat
              </h3>
              <p className="text-[10px] text-gray-400 max-w-xs leading-normal">
                Compre uma mensagem destacada no topo. Quanto maior a contribuição, maior o tempo de destaque e mais chamativa o tema de cor!
              </p>
            </div>

            {/* Saldo da pessoa */}
            <div className="flex items-center justify-between bg-zinc-950/50 border border-white/5 rounded-2xl px-4 py-2.5 mb-4">
              <span className="text-[9px] uppercase font-black tracking-widest text-neutral-400">Teu Saldo:</span>
              <span className="text-xs font-black text-emerald-400 font-mono">
                {(currentUser.balance || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} KZ
              </span>
            </div>

            {/* Lista de Super Chats Rápidos */}
            <p className="text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-2 px-1">Valores com Destaque:</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { amount: 155, time: '30 seg' },
                { amount: 500, time: '1 min' },
                { amount: 1500, time: '3 min' },
                { amount: 3000, time: '5 min' },
                { amount: 6000, time: '10 min' }
              ].map((preset) => (
                <button 
                  key={preset.amount}
                  type="button"
                  onClick={() => setCustomSCAmount(preset.amount.toString())}
                  className={`flex flex-col p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    customSCAmount === preset.amount.toString() 
                      ? 'bg-red-500/10 border-red-500 shadow-md shadow-red-500/5 scale-102' 
                      : 'bg-zinc-900/60 border-white/5 hover:border-white/10 hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-[10px] font-black text-white">{preset.amount} KZ</span>
                  <span className="text-[8px] text-gray-450 mt-0.5">{preset.time}</span>
                </button>
              ))}
            </div>

            {/* Custom Amount input e custom message */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[8.5px] font-black text-neutral-450 uppercase tracking-widest block mb-1 px-1">Valor Personalizado (KZ):</label>
                <input 
                  type="number" 
                  min="150"
                  value={customSCAmount}
                  onChange={(e) => setCustomSCAmount(e.target.value)}
                  placeholder="Mínimo 155 KZ"
                  className="w-full bg-neutral-900 border border-white/10 text-[11px] text-white rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-red-500 hover:bg-neutral-800 transition-colors"
                />
              </div>

              <div>
                <label className="text-[8.5px] font-black text-neutral-450 uppercase tracking-widest block mb-1 px-1">Texto do Super Chat:</label>
                <textarea 
                  rows={2}
                  maxLength={150}
                  value={superChatText}
                  onChange={(e) => setSuperChatText(e.target.value)}
                  placeholder="Escreva algo para destacar ao vivo..."
                  className="w-full bg-neutral-900 border border-white/10 text-[11px] text-white rounded-xl px-3.5 py-2 focus:outline-none focus:border-red-500 hover:bg-neutral-800 transition-colors resize-none leading-relaxed"
                />
                <span className="text-[8px] font-bold text-neutral-500 block text-right mt-1 px-1">
                  {superChatText.length}/150 caracteres
                </span>
              </div>
            </div>

            {/* Preview da Aparência do Super Chat */}
            {Number(customSCAmount) > 0 && (
              <div className="mb-5 bg-neutral-950/40 p-2.5 border border-white/5 rounded-2xl">
                <span className="text-[7.5px] font-black text-neutral-450 uppercase tracking-wider block mb-2 text-center">Visualização Prévia:</span>
                <div className="rounded-xl overflow-hidden text-left border border-black/20 shadow-lg scale-95 flex flex-col font-sans">
                  <div className={`p-2.5 ${getSuperChatTheme(Number(customSCAmount)).bgHeader} flex gap-2 items-center`}>
                    <img src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} className="w-6 h-6 rounded-md object-cover border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                    <div className="min-w-0 flex-1 leading-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-black text-white uppercase tracking-wider truncate mr-1">
                          {currentUser.firstName}
                        </span>
                        <span className="text-[9px] font-bold text-white px-1.5 py-0.5 bg-black/15 rounded leading-none shrink-0 font-mono">
                          {Number(customSCAmount).toLocaleString('pt-AO')} KZ
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-2.5 ${getSuperChatTheme(Number(customSCAmount)).bgBody} text-[10px] font-medium leading-normal italic text-white`}>
                    {superChatText.trim() || 'Minha mensagem de destaque de Super Chat!'}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleBuySuperChat}
              disabled={submittingSuperChat || !customSCAmount || Number(customSCAmount) < 150}
              className="w-full py-3 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-600 disabled:opacity-30 disabled:pointer-events-none text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              {submittingSuperChat ? 'Processando...' : 'Comprar e Enviar Super Chat'}
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL DE CONVIDAR CO-HOSTS (Host Only) */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0d0d12] border border-white/10 rounded-[28px] p-6 shadow-2xl relative animate-scale-up">
            <button 
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center mb-2.5 shadow-lg shadow-emerald-500/20">
                <Users className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Transmitir Juntos</h3>
              <p className="text-[10px] text-gray-400 max-w-xs leading-normal">
                Convide outros usuários da plataforma para entrar na sua transmissão. A tela dividirá automaticamente!
              </p>
            </div>

            {/* Barra de Busca */}
            <div className="mb-4">
              <input 
                type="text" 
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Buscar usuário por nome..."
                className="w-full bg-neutral-900 border border-white/10 text-[11px] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 hover:bg-neutral-800 transition-colors"
              />
            </div>

            {/* Lista com Scroll */}
            <div className="max-h-56 overflow-y-auto space-y-2 mb-2 pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
              {loadingUsers ? (
                <div className="py-8 text-center text-xs text-neutral-500 animate-pulse">
                  Carregando usuários...
                </div>
              ) : platformUsers.filter(u => {
                const s = inviteSearch.toLowerCase();
                return (u.firstName || '').toLowerCase().includes(s) || (u.lastName || '').toLowerCase().includes(s);
              }).length === 0 ? (
                <div className="py-8 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  Nenhum usuário encontrado
                </div>
              ) : (
                platformUsers
                  .filter(u => {
                    const s = inviteSearch.toLowerCase();
                    return (u.firstName || '').toLowerCase().includes(s) || (u.lastName || '').toLowerCase().includes(s);
                  })
                  .map((u) => {
                    const isAlreadyJoined = post.liveStream?.guests?.some(g => g.userId === u.id && g.status === 'JOINED');
                    const isAlreadyInvited = post.liveStream?.guests?.some(g => g.userId === u.id && g.status === 'INVITED');
                    
                    return (
                      <div 
                        key={u.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-zinc-800/20 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={u.profilePicture || DEFAULT_PROFILE_PIC} 
                            alt={u.firstName} 
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="text-[10.5px] font-black text-white truncate uppercase tracking-wide">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-[8px] text-neutral-500 truncate font-mono">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleInviteUser(u)}
                          disabled={isAlreadyJoined || isAlreadyInvited}
                          className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all shrink-0 ${
                            isAlreadyJoined 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default' 
                              : isAlreadyInvited 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-default' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95'
                          }`}
                        >
                          {isAlreadyJoined ? 'AO VIVO' : isAlreadyInvited ? 'ENVIADO' : 'CONVIDAR'}
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveStreamViewer;
