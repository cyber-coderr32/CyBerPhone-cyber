import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CheckCircle2
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
  
  const [donationAlert, setDonationAlert] = useState<{ donor: string; amount: number; message: string } | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);
  const alertTimerRef = useRef<any>(null);
  
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const lastHeartCountRef = useRef<number>(0);
  
  // Referências
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const guestVideoRef = useRef<HTMLVideoElement>(null);
  const guestStreamRef = useRef<MediaStream | null>(null);

  const isHost = post ? post.userId === currentUser.id : false;

  // 1. Carregar Post e se inscrever no Firebase em tempo real
  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    // Entrar na live
    manageLiveViewers(postId, 'join');

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
      manageLiveViewers(postId, 'leave');
    };
  }, [postId]);

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
  const isJoinedGuest = useMemo(() => {
    if (!post || !post.liveStream?.guests) return false;
    return post.liveStream.guests.some(g => g.userId === currentUser.id && g.status === 'JOINED');
  }, [post, currentUser.id]);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: guestAudioActive
      });
      guestStreamRef.current = stream;
      if (guestVideoRef.current) {
        guestVideoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      console.error("Guest camera access failed", e);
    }
  };

  const stopGuestCamera = () => {
    if (guestStreamRef.current) {
      guestStreamRef.current.getTracks().forEach((track) => track.stop());
      guestStreamRef.current = null;
    }
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
    if (isHost || !canvasRef.current) return;
    
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
  }, [isHost, post?.id]);

  // Chat simulator effect for active rooms (Simulated viewer interaction)
  useEffect(() => {
    if (isHost || !post || post.liveStream?.status === 'ENDED') return;

    // A cada 12 segundos, adiciona um comentário simulado
    const chatTimer = setInterval(() => {
      const names = ["Januário", "Kelson", "Kiara", "Yola", "Nzinga", "Djamila", "Mauro", "Edivaldo"];
      const prefixes = ["AngoCyb", "NetRunner", "KzKing", "LuandaTech", "Phreaker", "MatrixBento"];
      const randomName = `${prefixes[Math.floor(Math.random() * prefixes.length)]}_${names[Math.floor(Math.random() * names.length)]}`;
      const randomText = CHAT_SIMULATOR_MESSAGES[Math.floor(Math.random() * CHAT_SIMULATOR_MESSAGES.length)];

      const simulComment = {
        id: 'simulated-' + Date.now(),
        userId: 'simulated-bot',
        userName: randomName,
        profilePic: DEFAULT_PROFILE_PIC,
        text: randomText,
        timestamp: Date.now(),
        isAnonymous: false
      };

      setComments(prev => [...prev, simulComment]);
    }, 12000);

    return () => clearInterval(chatTimer);
  }, [isHost, post]);

  // Iniciar câmera do Host
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: audioActive
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      console.error("Camera access failed", e);
      showAlert(t('camera_error', 'Não foi possível acessar a câmera para a transmissão ao vivo.'), {
        title: t('hardware_warning', 'Erro de Hardware'),
        type: 'warning'
      });
    }
  };

  // Parar câmera do Host
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
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
      <div className="h-[43vh] min-h-[290px] md:h-full md:flex-1 flex flex-col relative bg-black shrink-0">
        
        {/* Top Header Controls overlay */}
        <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 z-30 flex items-center justify-between pointer-events-none">
          {/* Voltar e badges */}
          <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto">
            <button 
              onClick={() => onNavigate('feed')}
              className="p-1.5 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-colors shadow-lg"
              title="Voltar ao Feed"
            >
              <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <div className="flex items-center gap-1 bg-red-600 border border-red-500/20 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none shadow-lg animate-pulse text-white">
              <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white rounded-full"></span>
              LIVE
            </div>
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none text-neutral-200 shadow-md">
              <Eye className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-400" />
              {post.liveViewerCount || 0}
            </div>
          </div>

          {/* Botão de Encerrar ou Filtros */}
          <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto">
            {isHost && (
              <button 
                onClick={() => setInviteModalOpen(true)}
                className="px-2.5 md:px-3.5 py-1 md:py-1.5 bg-[#0e0e15]/90 hover:bg-neutral-900 text-emerald-400 border border-emerald-500/20 rounded-full text-[8.5px] md:text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 transition-all animate-fade-in"
                title="Convidar Co-Host"
              >
                <Users className="w-3 h-3 shrink-0" />
                Convidar
              </button>
            )}

            {isHost ? (
              <button 
                onClick={handleEndStream}
                className="px-2.5 md:px-4 py-1 md:py-1.5 bg-gradient-to-r from-red-600 to-rose-700 text-white border border-red-500/10 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Encerrar
              </button>
            ) : (
              <button 
                onClick={() => setDonationModalOpen(true)}
                className="px-2.5 md:px-4 py-1 md:py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
              >
                <Coins className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" />
                Apoiar (Gorjeta)
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
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-neutral-950/90 relative">
              {/* Painel 1: O Host Principal */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black border border-white/5 flex items-center justify-center">
                {isHost ? (
                  videoActive ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover transform -scale-x-100 ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                      <VideoOff className="w-8 h-8 text-red-500 animate-pulse" />
                      <p className="text-[9px] uppercase font-bold tracking-widest text-neutral-400">Câmera desativada</p>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full relative">
                    <canvas 
                      ref={canvasRef} 
                      className={`w-full h-full object-cover ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[7px] font-black uppercase tracking-wider border border-white/10 text-emerald-400">
                      Anfitrião
                    </div>
                  </div>
                )}
                {/* HUD Label do Host */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[8.5px] font-black tracking-wider text-neutral-200">
                  {hostProfile?.firstName ? `${hostProfile.firstName} (Host)` : 'Anfitrião'}
                </div>
              </div>

              {/* Painéis para os Co-Hosts/Guests */}
              {activeGuests.map((g: any) => {
                const isThisGuestMe = g.userId === currentUser.id;
                return (
                  <div key={g.userId} className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border border-emerald-500/20 flex flex-col items-center justify-center">
                    {isThisGuestMe ? (
                      /* Câmera real do Convidado participando */
                      guestVideoActive ? (
                        <video 
                          ref={guestVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                          <VideoOff className="w-8 h-8 text-red-400 animate-pulse" />
                          <p className="text-[9px] uppercase font-bold tracking-widest">A tua câmera está off</p>
                        </div>
                      )
                    ) : (
                      /* Stream simulada com alta fidelidade para os outros */
                      <div className="w-full h-full bg-gradient-to-br from-[#07070e] via-[#0e0e1a] to-[#07070e] flex flex-col items-center justify-center p-4 relative">
                        {/* Círculo com foto de perfil e ondas de pulso neon */}
                        <div className="relative mb-2">
                          <div className="absolute inset-0 w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 animate-pulse opacity-40"></div>
                          <img 
                            src={g.profilePic || DEFAULT_PROFILE_PIC} 
                            alt={g.userName} 
                            className="w-12 h-12 rounded-full object-cover relative z-10 border-2 border-emerald-400 shadow-xl shadow-emerald-500/15" 
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Ondas Sonoras Equalizadoras Animadas */}
                        <div className="flex items-end gap-0.5 h-4 mb-2">
                          <span className="w-0.5 bg-emerald-400/80 rounded animate-voice-bar-1"></span>
                          <span className="w-0.5 bg-emerald-400/80 rounded animate-voice-bar-2"></span>
                          <span className="w-0.5 bg-emerald-400/80 rounded animate-voice-bar-3"></span>
                          <span className="w-0.5 bg-emerald-400/80 rounded animate-voice-bar-4"></span>
                          <span className="w-0.5 bg-emerald-400/80 rounded animate-voice-bar-5"></span>
                        </div>

                        <span className="text-[7.5px] tracking-widest leading-none font-bold text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                          🎤 Co-Host Ao Vivo
                        </span>
                      </div>
                    )}

                    {/* HUD Label do Convidado */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[8.5px] font-black tracking-wider text-neutral-200">
                      {g.userName}
                    </div>

                    {/* Controles rápidos de Host para remover o convidado */}
                    {isHost && (
                      <button 
                        onClick={() => handleRemoveGuest(g.userId, g.userName)}
                        className="absolute top-2 right-2 px-2 py-0.5 bg-red-650 hover:bg-red-750 text-white rounded-lg text-[8px] font-black uppercase tracking-wider border border-red-500/20 shadow-lg pointer-events-auto transition-colors"
                        title="Remover Co-Host"
                      >
                        Remover
                      </button>
                    )}
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
                  {videoActive ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover transform -scale-x-100 ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-neutral-500">
                      <VideoOff className="w-12 h-12 text-red-500 animate-pulse" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">Câmera desativada</p>
                    </div>
                  )}
                </div>
              ) : (
                /* CANVA DE STREAM SIMULADA CIBERNÉTICA */
                <div className="w-full h-full relative">
                  <canvas 
                    ref={canvasRef} 
                    className={`w-full h-full object-cover ${LIVE_FILTERS.find(f => f.id === currentFilter)?.class || ''}`}
                  />
                  {/* Moldura Cyber HUD nos cantos extra */}
                  <div className="absolute inset-0 pointer-events-none border-[3px] border-indigo-500/15"></div>
                  <div className="absolute top-2 left-2 w-12 h-12 border-t border-l border-emerald-400 pointer-events-none"></div>
                  <div className="absolute top-2 right-2 w-12 h-12 border-t border-r border-emerald-400 pointer-events-none"></div>
                  <div className="absolute bottom-2 left-2 w-12 h-12 border-b border-l border-emerald-400 pointer-events-none"></div>
                  <div className="absolute bottom-2 right-2 w-12 h-12 border-b border-r border-emerald-400 pointer-events-none"></div>
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
              <p className="text-[8px] md:text-[9px] font-bold text-emerald-400 truncate tracking-wide mt-0.5 max-w-[80px] sm:max-w-[150px] md:max-w-[240px]">
                {post.liveStream?.title || 'Cyber Transmissão'}
              </p>
            </div>
          </div>

          {/* Controles de Streamer / Espectador */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            
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
              <>
                <button 
                  onClick={() => setDonationModalOpen(true)}
                  className="p-1.5 md:p-2 bg-gradient-to-r from-amber-500 to-yellow-500 border border-amber-400/20 text-slate-950 rounded-lg md:rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all outline-none flex items-center justify-center animate-pulse"
                  title="Fazer Doação (Gorjeta)"
                >
                  <Coins className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button 
                  onClick={handlePulseHeart}
                  className="p-1.5 md:p-2 bg-gradient-to-r from-red-500 to-pink-500 border border-red-400/20 text-white rounded-lg md:rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all outline-none"
                  title="Curtir / Reagir"
                >
                  <Heart className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white" />
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* 2. CHAT AO VIVO EM TEMPO REAL (Direita) */}
      <div className="flex-1 min-h-0 md:h-full md:w-[350px] lg:w-[400px] flex flex-col border-t md:border-t-0 md:border-l border-white/5 bg-[#09090c] shrink-0 relative overflow-hidden">
        {/* Cabecalho de chat */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h2 className="text-[10px] tracking-widest font-black uppercase text-neutral-300">Live Chat ao Vivo</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-[8px] font-bold text-indigo-400 uppercase tracking-wider">
            Sincronizado
          </div>
        </div>

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
            <button 
              type="button"
              onClick={() => setDonationModalOpen(true)}
              className="p-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 outline-none flex items-center justify-center shrink-0"
              title="Apoiar com Gorjeta / Doação"
            >
              <Coins className="w-3.5 h-3.5" />
            </button>
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
