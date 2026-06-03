import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Post, Page, PostType } from '../types';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { getReels, updatePostLikes, updatePostSaves, toggleFollowUser as followUser } from '../services/storageService';
import VideoPlayer from './VideoPlayer';
import CommentsModal from './CommentsModal';
import ShareModal from './ShareModal';
import { 
  HeartIcon as HeartIconOutline, 
  ChatBubbleOvalLeftIcon, 
  BookmarkIcon as BookmarkIconOutline,
  ShareIcon,
  MusicalNoteIcon,
  CheckBadgeIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid,
  BoltIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';
import { translateText } from '../services/translationService';
import { safeJsonStringify } from '../lib/utils';

interface ReelsPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  refreshUser: () => void;
  startPostId?: string;
}

const ReelsPage: React.FC<ReelsPageProps> = ({ currentUser, onNavigate, refreshUser, startPostId }) => {
  const { t } = useTranslation();
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalMuted, setGlobalMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    setLoading(true);
    try {
      const data = await getReels(currentUser);
      // Ensure only valid video posts are populated as reels
      const validReels = (data || []).filter(r => {
        const isReel = r.type === PostType.REEL || r.type?.toString().toUpperCase() === 'REEL';
        const hasVideo = !!(r.reel?.videoUrl || r.imageUrl?.endsWith('.mp4'));
        return isReel || hasVideo;
      });
      
      let finalReels = validReels;
      // If a specific reel needs to be started first, sort it to index 0
      if (startPostId && validReels.length > 0) {
        const startIndex = validReels.findIndex(r => r.id === startPostId);
        if (startIndex > 0) {
          const started = validReels[startIndex];
          const rest = validReels.filter((_, i) => i !== startIndex);
          finalReels = [started, ...rest];
        }
      }
      
      setReels(finalReels);
      if (finalReels.length > 0) {
        setActiveReelId(finalReels[0].id);
      }
    } catch (err) {
      console.error("Error loading reels:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (reels.length === 0) return;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (reels[index] && activeReelId !== reels[index].id) {
      setActiveReelId(reels[index].id);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100dvh-72px)] md:h-[780px] w-full max-w-[450px] mx-auto bg-black flex flex-col items-center justify-center border border-white/10 rounded-[2.5rem]">
         <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
            <MusicalNoteIcon className="w-6 h-6 text-brand absolute animate-pulse text-white" />
         </div>
         <p className="text-[11px] text-white/40 tracking-widest font-bold uppercase mt-4">CYBERREELS</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100dvh-72px)] md:h-[780px] md:max-h-[calc(100vh-120px)] w-full md:max-w-[450px] md:aspect-[9/16] mx-auto bg-black md:rounded-[2.5rem] md:border md:border-white/10 overflow-y-scroll snap-y snap-mandatory no-scrollbar shadow-2xl relative"
      style={{ scrollBehavior: 'smooth' }}
    >
      {reels.length === 0 ? (
        <div className="h-full w-full flex flex-col items-center justify-center text-white p-10 text-center">
          <BoltIcon className="w-16 h-16 text-brand mb-4 animate-bounce" />
          <h3 className="text-xl font-black uppercase tracking-tight">{t('no_reels_found')}</h3>
          <p className="text-xs text-gray-500 mt-2 max-w-xs">{t('no_reels_desc', 'Seja o primeiro a postar um Reel!')}</p>
          <button 
            type="button"
            onClick={() => onNavigate('feed')} 
            className="mt-8 bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
          >
            {t('back_to_feed')}
          </button>
        </div>
      ) : (
        reels.map((reel, index) => (
          <ReelItem 
            key={reel.id} 
            reel={reel} 
            currentUser={currentUser} 
            onNavigate={onNavigate}
            refreshUser={refreshUser}
            globalMuted={globalMuted}
            setGlobalMuted={setGlobalMuted}
            t={t}
            isActive={activeReelId === reel.id || (activeReelId === null && index === 0)}
          />
        ))
      )}
    </div>
  );
};

interface ReelItemProps {
  reel: Post;
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  refreshUser: () => void;
  globalMuted: boolean;
  setGlobalMuted: (m: boolean) => void;
  t: any;
  isActive: boolean;
}

const ReelItem: React.FC<ReelItemProps> = ({ 
  reel, 
  currentUser, 
  onNavigate, 
  refreshUser,
  globalMuted,
  setGlobalMuted,
  t,
  isActive
}) => {
  const { i18n } = useTranslation();
  const { showAlert } = useDialog();
  const [isLiked, setIsLiked] = useState(currentUser?.id ? reel.likes?.includes(currentUser.id) || false : false);
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [isSaved, setIsSaved] = useState(currentUser?.id ? reel.saves?.includes(currentUser.id) || false : false);
  const [isFollowing, setIsFollowing] = useState((currentUser?.id && currentUser?.followedUsers) ? currentUser.followedUsers.includes(reel.userId) : false);

  // Interaction feedback states
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(isActive);
  const [showPlayStateFeedback, setShowPlayStateFeedback] = useState<'play' | 'pause' | null>(null);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(reel.comments?.length || 0);

  const handleCommentsUpdated = () => {
    // Increment local comment count reactivity
    setCommentsCount(prev => prev + 1);
  };

  useEffect(() => {
    setIsVideoPlaying(isActive);
  }, [isActive]);

  // Translation & Voice text stats
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReadingVoice, setIsReadingVoice] = useState(false);

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedContent) {
      setTranslatedContent(null);
      return;
    }
    
    setIsTranslating(true);
    try {
      const langMap: Record<string, string> = {
        'pt': 'Português',
        'en': 'English',
        'es': 'Español',
        'fr': 'Français',
        'zh': 'Chinese'
      };
      const targetLang = langMap[i18n.language.split('-')[0]] || 'Português';
      const translated = await translateText(reel.content || '', targetLang);
      setTranslatedContent(translated);
    } catch (error) {
      showAlert(t('translation_error'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReadAloud = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    if (isReadingVoice) {
      window.speechSynthesis.cancel();
      setIsReadingVoice(false);
      return;
    }

    const textToRead = translatedContent || reel.content;
    if (!textToRead) return;

    window.speechSynthesis.cancel();

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        const currentLang = i18n.language.split('-')[0];
        if (currentLang === 'pt') utterance.lang = 'pt-BR';
        else if (currentLang === 'en') utterance.lang = 'en-US';
        else if (currentLang === 'es') utterance.lang = 'es-ES';
        else if (currentLang === 'fr') utterance.lang = 'fr-FR';
        else if (currentLang === 'zh') utterance.lang = 'zh-CN';

        utterance.onend = () => setIsReadingVoice(false);
        utterance.onerror = () => setIsReadingVoice(false);

        setIsReadingVoice(true);
        window.speechSynthesis.speak(utterance);
        
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (err) {
        console.error("SpeechSynthesis error:", err);
        setIsReadingVoice(false);
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (isReadingVoice) window.speechSynthesis.cancel();
    };
  }, [isReadingVoice]);

  useEffect(() => {
    if (!isActive && isReadingVoice) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsReadingVoice(false);
    }
  }, [isActive, isReadingVoice]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isRestrictedUser = (user: any) => {
      if (!user) return false;
      const emailLower = (user.email || '').toLowerCase().trim();
      const isAdminEmail = emailLower === 'alfaajmc@gmail.com' || emailLower === 'ac926815124@gmail.com';
      if (user.isAdmin || isAdminEmail) return false;
      
      let localVerified = false;
      try {
        localVerified = localStorage.getItem(`cp_user_verified_${user.id}`) === 'true' || 
                        localStorage.getItem(`cp_user_verification_status_${user.id}`) === 'APPROVED';
      } catch (e) {}

      const verificationStatus = user.idVerificationStatus || 'NOT_STARTED';
      const isExpired = user.idVerificationDocs?.expiresAt && user.idVerificationDocs.expiresAt < Date.now();
      const hasApprovedVerification = user.isVerified === true || String(user.isVerified) === 'true' || localVerified || (verificationStatus === 'APPROVED' && !isExpired);
      return !hasApprovedVerification;
    };

    if (isRestrictedUser(currentUser)) {
      showAlert("Sua conta está em MODO RESTRITO por falta de verificação de identidade. Por favor, conclua a Verificação de Identidade em Configurações para realizar esta ação.", { title: "Acesso Restrito" });
      return;
    }

    const newStatus = !isLiked;
    setIsLiked(newStatus);
    setLikesCount(prev => newStatus ? prev + 1 : prev - 1);
    if (newStatus) {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
    await updatePostLikes(reel.id, currentUser.id);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevSaved = isSaved;
    const nextSaved = !prevSaved;
    
    setIsSaved(nextSaved);
    
    if (nextSaved) {
      showAlert(t('saved_to_collection', 'Reel salvo em seus Itens Salvos!'), { type: 'success' });
    } else {
      showAlert(t('removed_from_collection', 'Reel removido dos Itens Salvos!'), { type: 'alert' });
    }
    
    try {
      await updatePostSaves(reel.id, currentUser.id);
    } catch (err) {
      console.error("Erro ao salvar o Reel:", safeJsonStringify(err));
      setIsSaved(prevSaved);
      showAlert(t('save_error', 'Ocorreu um erro ao salvar o Reel.'), { type: 'error' });
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser.id) return;
    try {
      setIsFollowing(true);
      await followUser(currentUser.id, reel.userId);
      refreshUser();
    } catch (err) {
      console.error("Error following user on Reels:", safeJsonStringify(err));
      setIsFollowing(false);
    }
  };

  const [progress, setProgress] = useState(0);

  // Unified Single Tap (Play/Pause) vs Double Tap (Like) logic
  const lastTapRef = useRef<number>(0);
  const playStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScreenEngagement = (e: React.MouseEvent) => {
    if (isCommentsOpen || isShareOpen) {
      return;
    }
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // It's a double tap! Trigger Like.
      if (!isLiked) {
        handleLike(e);
      } else {
        setShowHeartAnim(true);
        setTimeout(() => setShowHeartAnim(false), 1000);
      }
    } else {
      // Could be a single tap. Set a delay to differentiate.
      setTimeout(() => {
        const afterDelayNow = Date.now();
        // If no additional tap has occurred during the delay, treat as Single Tap
        if (afterDelayNow - lastTapRef.current >= DOUBLE_TAP_DELAY) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
    lastTapRef.current = now;
  };

  const togglePlayPause = () => {
    const nextState = !isVideoPlaying;
    setIsVideoPlaying(nextState);
    
    // Provide temporary gorgeous visual play-state overlay
    setShowPlayStateFeedback(nextState ? 'play' : 'pause');
    if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
    playStateTimeoutRef.current = setTimeout(() => {
      setShowPlayStateFeedback(null);
    }, 650);
  };

  return (
    <div 
      data-reel-id={reel.id}
      className="h-[calc(100dvh-72px)] md:h-[780px] w-full snap-start relative bg-black flex items-center justify-center overflow-hidden flex-shrink-0" 
      onClick={handleScreenEngagement}
    >
      {/* Immersive Videoplayer background */}
      <VideoPlayer 
        src={reel.reel?.videoUrl || ''} 
        className="absolute inset-x-0 inset-y-0 h-full w-full object-cover"
        isReel={true}
        loop={true}
        autoPlay={isActive && isVideoPlaying}
        onPlayChange={setIsVideoPlaying}
        muted={globalMuted}
        onMuteChange={setGlobalMuted}
        onProgressChange={setProgress}
      />

      {/* Pop Heart Animation Overlay (Double Tap feedback) */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.8, opacity: 1, y: -20 }}
            exit={{ scale: 2.6, opacity: 0, y: -80 }}
            transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="absolute z-50 pointer-events-none"
          >
            <HeartIconSolid className="w-28 h-28 text-red-500 fill-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play / Pause micro-interact feedback overlay */}
      <AnimatePresence>
        {showPlayStateFeedback && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.9 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute z-40 bg-black/40 backdrop-blur-md rounded-full p-5 text-white pointer-events-none shadow-2xl"
          >
            {showPlayStateFeedback === 'play' ? (
              <PlayIcon className="w-10 h-10 fill-current" />
            ) : (
              <PauseIcon className="w-10 h-10 fill-current" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Brand Overlay */}
      <div className="absolute top-5 left-5 z-30 pointer-events-none">
        <h2 className="text-xl font-black text-white tracking-widest uppercase italic drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          CyBer<span className="text-brand">Reels</span>
        </h2>
      </div>

      {/* Header - Global sound setting override (mutes/unmutes all reels) */}
      <div className="absolute top-4 right-4 z-30">
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); setGlobalMuted(!globalMuted); }}
          className="p-3 bg-black/35 hover:bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white transition-all active:scale-90 shadow-2xl"
        >
          {globalMuted ? (
            <SpeakerXMarkIcon className="w-5 h-5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]" />
          ) : (
            <SpeakerWaveIcon className="w-5 h-5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]" />
          )}
        </button>
      </div>

      {/* COLUMN DESIGN - GUARANTEES ZERO CONTENT OVERLAP OR MULTI-SCREEN STICKINESS */}
      
      {/* Full-width elegant immersive dark gradient overlay at the bottom to avoid any vertical division/lines and maximize contrast */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#000000]/95 via-[#000000]/45 to-transparent z-10 pointer-events-none" />

      {/* COLUMN 1 (LEFT SIDE - 75% WIDTH): User data and descriptions */}
      <div className="absolute left-0 bottom-0 w-[calc(100%-76px)] p-4 pb-6 z-20 pt-28 pointer-events-none flex flex-col gap-3">
        
        {/* Author / Creator Header */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div 
            className="shrink-0 cursor-pointer active:scale-95 transition-transform"
            onClick={(e) => { e.stopPropagation(); onNavigate('profile', { userId: reel.userId }); }}
          >
            <img 
              src={reel.authorProfilePic || DEFAULT_PROFILE_PIC} 
              className="w-10 h-10 rounded-full border-2 border-white/20 object-cover shadow-xl" 
              alt="author"
            />
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 
              className="font-bold text-white text-[14px] tracking-tight hover:underline cursor-pointer drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
              onClick={(e) => { e.stopPropagation(); onNavigate('profile', { userId: reel.userId }); }}
            >
              {(reel.authorName || 'cyberuser').toLowerCase().replace(/\s/g, '')}
            </h4>
            
            {(reel.isVerified || reel.authorName?.toLowerCase().includes('cyber')) && (
              <CheckBadgeIcon className="w-4 h-4 text-blue-400 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] shrink-0" />
            )}
            
            {!isFollowing && reel.userId !== currentUser.id && (
              <button 
                type="button"
                onClick={handleFollow}
                className="ml-2 px-3 py-1 rounded-lg border border-white/40 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all duration-200"
              >
                {t('follow')}
              </button>
            )}
          </div>
        </div>

        {/* Content / Reel text with optional scrollable context */}
        <div className="max-h-[90px] overflow-y-auto no-scrollbar pointer-events-auto">
          <p className="text-[13.5px] text-white/95 leading-relaxed font-normal drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] pr-2">
            {translatedContent || reel.content || t('reels_default_desc', 'Confira este conteúdo exclusivo!')}
          </p>
        </div>

        {/* Sound / Music track with scrolling ticker */}
        <div className="flex items-center gap-2 w-fit bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 pointer-events-auto shadow-md">
          <MusicalNoteIcon className="w-3.5 h-3.5 text-white/90 shrink-0" />
          <div className="whitespace-nowrap overflow-hidden max-w-[130px] select-none">
            <p className="text-[10px] font-bold tracking-tight text-white animate-marquee inline-block pr-8">
              {reel.authorName || 'cyberdigital'} • {t('audio_original')}
            </p>
            <p className="text-[10px] font-bold tracking-tight text-white animate-marquee inline-block pr-8">
              {reel.authorName || 'cyberdigital'} • {t('audio_original')}
            </p>
          </div>
        </div>
      </div>

      {/* COLUMN 2 (RIGHT SIDE - 76px WIDTH): Stacked Interaction buttons mimicking Instagram */}
      <div className="absolute right-0 bottom-6 w-[76px] flex flex-col items-center gap-4.5 z-20 pb-4">
        
        {/* Like Widget */}
        <div className="flex flex-col items-center">
          <button 
            type="button"
            onClick={handleLike}
            className={`p-2 rounded-full transition-all active:scale-50 ${isLiked ? 'text-red-500 scale-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'text-white hover:bg-white/10'}`}
          >
            {isLiked ? (
              <HeartIconSolid className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
            ) : (
              <HeartIconOutline className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
            )}
          </button>
          <span className="text-[11px] font-black text-white tracking-wide mt-0.5 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tabular-nums uppercase">
            {likesCount > 0 ? likesCount.toLocaleString() : '12'}
          </span>
        </div>

        {/* Comments Widget */}
        <div className="flex flex-col items-center">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-all active:scale-75"
          >
            <ChatBubbleOvalLeftIcon className="w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
          </button>
          <span className="text-[11px] font-black text-white tracking-wide mt-0.5 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tabular-nums">
            {commentsCount}
          </span>
        </div>

        {/* Share Widget */}
        <div className="flex flex-col items-center">
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation();
              setIsShareOpen(true);
            }}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-all active:scale-75"
          >
            <ShareIcon className="w-7.5 h-7.5 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
          </button>
          <span className="text-[9.5px] font-black tracking-wider text-white uppercase ml-0.5 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] scale-90">
            {t('share')}
          </span>
        </div>

        {/* Saved Post Widget */}
        <div className="flex flex-col items-center">
          <button 
            type="button"
            onClick={handleSave}
            className={`p-2 rounded-full transition-all active:scale-75 ${isSaved ? 'text-brand' : 'text-white hover:bg-white/10'}`}
          >
            {isSaved ? (
              <BookmarkIconSolid className="w-7 h-7 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
            ) : (
              <BookmarkIconOutline className="w-7 h-7 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
            )}
          </button>
        </div>

        {/* Language Translator Widget */}
        <div className="flex flex-col items-center">
          <button 
            type="button"
            onClick={handleTranslate}
            className={`p-2 rounded-full transition-all active:scale-75 ${translatedContent ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-white hover:bg-white/10'} ${isTranslating ? 'animate-pulse' : ''}`}
          >
            <LanguageIcon className="w-7 h-7 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
          </button>
          <span className="text-[9.5px] font-black tracking-wider text-white uppercase ml-0.5 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] scale-90">
            {t('translate')}
          </span>
        </div>

        {/* Read Out Loud TTS Widget */}
        <div className="flex flex-col items-center">
          <button 
            type="button"
            onClick={handleReadAloud}
            className={`p-2 rounded-full transition-all active:scale-75 ${isReadingVoice ? 'bg-brand text-white shadow-lg shadow-brand/20 animate-bounce' : 'text-white hover:bg-white/10'}`}
          >
            <SpeakerWaveIcon className="w-7 h-7 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]" />
          </button>
          <span className="text-[9.5px] font-black tracking-wider text-white uppercase ml-0.5 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] scale-90">
            {t('read_aloud')}
          </span>
        </div>

        {/* Spining Vinyl sound source cover */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            showAlert(t('reels_audio_playing', { author: reel.authorName || 'cyberdigital' }) || `Tocando áudio original de ${reel.authorName || 'cyberdigital'}`);
          }}
          className="mt-2.5 relative cursor-pointer active:scale-90 transition-transform"
        >
          <div className="w-10 h-10 rounded-full border border-white/40 overflow-hidden p-[2.5px] shadow-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 animate-spin-slow">
            <img 
              src={reel.authorProfilePic || DEFAULT_PROFILE_PIC} 
              className="w-full h-full object-cover rounded-full" 
              alt="track-disc"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-brand w-4 h-4 rounded-full flex items-center justify-center border border-black shadow">
            <MusicalNoteIcon className="w-2.5 h-2.5 text-white animate-pulse" />
          </div>
        </div>
      </div>

      {/* Comments overlay modal sheet */}
      {isCommentsOpen && (
        <CommentsModal 
          postId={reel.id}
          currentUser={currentUser}
          onClose={() => setIsCommentsOpen(false)}
          onCommentsUpdated={handleCommentsUpdated}
          postOwnerId={reel.userId}
        />
      )}

      {/* Share overlay modal sheet */}
      <ShareModal 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        currentUser={currentUser}
        onNavigate={onNavigate}
        content={{
          title: t('reels_share_title', { author: reel.authorName || 'cyberuser' }) || `Reel de ${reel.authorName || 'cyberuser'}`,
          text: reel.content || 'Confira este reel fantástico no CyBerPhone!',
          url: `${window.location.origin}/?reels=${reel.id}`,
          mediaUrl: reel.reel?.videoUrl || '',
          mediaType: 'video'
        }}
      />

      {/* Progress Track at bottom edge */}
      <div className="absolute bottom-0 left-0 w-full h-[3.5px] bg-white/20 z-30">
        <div 
          className="h-full bg-gradient-to-r from-brand via-purple-500 to-pink-500 transition-all duration-100 ease-linear shadow-[0_0_15px_#2563eb]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ReelsPage;
