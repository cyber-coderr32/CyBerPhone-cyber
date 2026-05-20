import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Post, Page, PostType } from '../types';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { getReels, updatePostLikes, updatePostSaves, toggleFollowUser as followUser } from '../services/storageService';
import VideoPlayer from './VideoPlayer';
import { 
  HeartIcon as HeartIconOutline, 
  ChatBubbleOvalLeftIcon, 
  BookmarkIcon as BookmarkIconOutline,
  ShareIcon,
  MusicalNoteIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid,
  BoltIcon
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
  const { showAlert } = useDialog();
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalMuted, setGlobalMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    setLoading(true);
    try {
      const data = await getReels(currentUser);
      // FILTRO CRÍTICO: Garantir que apenas posts com vídeo apareçam na aba de REELS
      const validReels = (data || []).filter(r => {
        const isReel = r.type === PostType.REEL || r.type?.toString().toUpperCase() === 'REEL';
        const hasVideo = !!(r.reel?.videoUrl || r.imageUrl?.endsWith('.mp4'));
        return isReel || hasVideo;
      });
      setReels(validReels);
    } catch (err) {
      console.error("Error loading reels:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  const [activeReelId, setActiveReelId] = useState<string | null>(null);

  useEffect(() => {
    if (reels.length === 0) return;
    if (!activeReelId) {
      setActiveReelId(reels[0].id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const reelId = entry.target.getAttribute('data-reel-id');
            if (reelId) {
              setActiveReelId(reelId);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.6,
      }
    );

    const childElements = containerRef.current?.querySelectorAll('[data-reel-id]');
    childElements?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [reels, activeReelId]);

  if (loading) {
      return (
          <div className="h-screen w-full bg-black flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
      );
  }

  return (
    <div 
        ref={containerRef}
        className="h-[calc(100vh-144px)] md:h-[calc(100vh-110px)] w-full max-w-[450px] mx-auto bg-black md:rounded-[2.5rem] md:border md:border-white/10 overflow-y-scroll snap-y snap-mandatory no-scrollbar shadow-2xl relative my-1"
        style={{ scrollBehavior: 'smooth' }}
    >
      {reels.length === 0 ? (
        <div className="h-full w-full flex flex-col items-center justify-center text-white p-10 text-center">
            <BoltIcon className="w-16 h-16 text-brand mb-4" />
            <h3 className="text-xl font-black uppercase">{t('no_reels_found')}</h3>
            <p className="text-sm text-gray-500 mt-2">{t('no_reels_desc', 'Seja o primeiro a postar um Reel!')}</p>
            <button onClick={() => onNavigate('feed')} className="mt-8 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs transition-all active:scale-95">{t('back_to_feed')}</button>
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

const ReelItem = ({ 
  reel, 
  currentUser, 
  onNavigate, 
  refreshUser,
  globalMuted,
  setGlobalMuted,
  t,
  isActive
}: { 
  reel: Post; 
  currentUser: User; 
  onNavigate: any; 
  refreshUser: any;
  globalMuted: boolean;
  setGlobalMuted: (m: boolean) => void;
  t: any;
  isActive: boolean;
}) => {
  const { i18n } = useTranslation();
  const { showAlert } = useDialog();
  const [isLiked, setIsLiked] = useState(reel.likes?.includes(currentUser.id) || false);
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [isSaved, setIsSaved] = useState(reel.saves?.includes(currentUser.id) || false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isFollowing, setIsFollowing] = useState(currentUser.followedUsers?.includes(reel.userId) || false);

  // Translation & Voice states
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

    // Reset synthesis queue to fix the stuck bug
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
        
        // Chrome/Firefox speech bug resume
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
    setIsSaved(!isSaved);
    await updatePostSaves(reel.id, currentUser.id);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser.id) return;
    setIsFollowing(true);
    await followUser(currentUser.id, reel.userId);
    refreshUser();
  };

  const [progress, setProgress] = useState(0);

  // Double tap to like logic
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
          if (!isLiked) handleLike(e);
      }
      lastTapRef.current = now;
  };

  return (
    <div 
      data-reel-id={reel.id}
      className="h-[calc(100vh-144px)] md:h-[calc(100vh-110px)] w-full snap-start relative bg-black flex items-center justify-center overflow-hidden flex-shrink-0" 
      onClick={handleDoubleTap}
    >
      <VideoPlayer 
        src={reel.reel?.videoUrl || ''} 
        className="h-full w-full object-cover"
        isReel={true}
        loop={true}
        autoPlay={isActive}
        muted={globalMuted}
        onMuteChange={setGlobalMuted}
        onProgressChange={setProgress}
      />

      <AnimatePresence>
        {showHeartAnim && (
            <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.8, opacity: 1, y: -20 }}
                exit={{ scale: 2.5, opacity: 0, y: -60 }}
                className="absolute z-50 pointer-events-none"
            >
                <HeartIconSolid className="w-36 h-36 text-red-500/90 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
            </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-8 left-6 z-30">
          <h2 className="text-2xl font-black text-white tracking-widest uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">CyBer<span className="text-brand">Reels</span></h2>
      </div>

      <div className="absolute top-8 right-6 z-30">
          <button 
              onClick={(e) => { e.stopPropagation(); setGlobalMuted(!globalMuted); }}
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20 text-white transition-all active:scale-90 shadow-2xl"
          >
              {globalMuted ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
          </button>
      </div>

      {/* Overlay - Right Bar Interaction - Identical to Instagram */}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-5 z-20">
         <div className="flex flex-col items-center">
            <button 
                onClick={handleLike}
                className={`p-2 transition-all active:scale-50 drop-shadow-xl ${isLiked ? 'text-red-500 scale-125' : 'text-white'}`}
            >
                {isLiked ? <HeartIconSolid className="w-9 h-9" /> : <HeartIconOutline className="w-9 h-9" />}
            </button>
            <span className="text-[12px] font-black text-white drop-shadow-lg mt-0.5 tabular-nums uppercase">{likesCount.toLocaleString()}</span>
         </div>

         <div className="flex flex-col items-center">
            <button 
                onClick={(e) => { e.stopPropagation(); onNavigate('feed', { showComments: reel.id }); }}
                className="p-2 text-white transition-all active:scale-75 drop-shadow-xl hover:scale-110"
            >
                <ChatBubbleOvalLeftIcon className="w-9 h-9" />
            </button>
            <span className="text-[12px] font-black text-white drop-shadow-lg mt-0.5 tabular-nums uppercase">{reel.comments?.length || 0}</span>
         </div>

         <div className="flex flex-col items-center">
            <button 
                onClick={(e) => { 
                    e.stopPropagation();
                    onNavigate('feed', { showShare: reel.id });
                }}
                className="p-2 text-white transition-all active:scale-75 drop-shadow-xl hover:scale-110"
            >
                <ShareIcon className="w-8 h-8" />
            </button>
            <span className="text-[10px] font-black text-white drop-shadow-lg mt-0.5 uppercase tracking-tighter">{t('share')}</span>
         </div>

         <div className="flex flex-col items-center">
            <button 
                onClick={handleSave}
                className={`p-2 transition-all active:scale-75 drop-shadow-xl ${isSaved ? 'text-white' : 'text-white hover:scale-110'}`}
            >
                {isSaved ? <BookmarkIconSolid className="w-8 h-8" /> : <BookmarkIconOutline className="w-8 h-8" />}
            </button>
         </div>

          <div className="flex flex-col items-center">
            <button 
                onClick={handleTranslate}
                className={`p-2 transition-all active:scale-75 drop-shadow-xl hover:scale-110 ${translatedContent ? 'text-brand' : 'text-white'} ${isTranslating ? 'animate-pulse' : ''}`}
            >
                <LanguageIcon className="w-8 h-8" />
            </button>
            <span className="text-[10px] font-black text-white drop-shadow-lg mt-0.5 uppercase tracking-tighter">{t('translate')}</span>
         </div>

         <div className="flex flex-col items-center">
            <button 
                onClick={handleReadAloud}
                className={`p-2 transition-all active:scale-75 drop-shadow-xl hover:scale-110 ${isReadingVoice ? 'text-brand' : 'text-white'}`}
            >
                {isReadingVoice ? <SpeakerXMarkIcon className="w-8 h-8" /> : <SpeakerWaveIcon className="w-8 h-8" />}
            </button>
            <span className="text-[10px] font-black text-white drop-shadow-lg mt-0.5 uppercase tracking-tighter">{t('read_aloud')}</span>
         </div>

         <div className="mt-3 relative">
            <div className="w-10 h-10 rounded-lg border-2 border-white/80 overflow-hidden p-[2px] shadow-2xl animate-spin-slow bg-gradient-to-tr from-yellow-400 to-purple-600">
                <img src={reel.authorProfilePic || DEFAULT_PROFILE_PIC} className="w-full h-full object-cover rounded-md" />
            </div>
         </div>
      </div>

      {/* Overlay - Bottom Content (Instagram Style) */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pt-20">
         <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
               <div 
                  className="shrink-0 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onNavigate('profile', { userId: reel.userId }); }}
               >
                  <img src={reel.authorProfilePic || DEFAULT_PROFILE_PIC} className="w-9 h-9 rounded-full border border-white/20 object-cover shadow-lg" />
               </div>
               
               <div className="flex items-center gap-2">
                  <h4 
                     className="font-bold text-white text-[14px] tracking-tight cursor-pointer hover:underline"
                     onClick={(e) => { e.stopPropagation(); onNavigate('profile', { userId: reel.userId }); }}
                  >
                     {(reel.authorName || 'cyberuser').toLowerCase().replace(/\s/g, '')}
                  </h4>
                  {(reel.isVerified || reel.authorName?.toLowerCase().includes('cyber')) && <CheckBadgeIcon className="w-3.5 h-3.5 text-blue-400" />}
                  
                  {!isFollowing && reel.userId !== currentUser.id && (
                     <button 
                        onClick={handleFollow}
                        className="ml-2 px-3 py-1 rounded-md border border-white/50 text-white text-[12px] font-bold hover:bg-white/10 transition-colors"
                     >
                        {t('follow')}
                     </button>
                  )}
               </div>
            </div>

            <p className="text-[14px] text-white/95 line-clamp-2 pr-12 font-regular">
               {translatedContent || reel.content || t('reels_default_desc', 'Confira este conteúdo exclusivo!')}
            </p>

            <div className="flex items-center gap-2 w-fit bg-black/20 backdrop-blur-md rounded-full px-3 py-1.5 transition-all border border-white/10">
               <MusicalNoteIcon className="w-3 h-3 text-white" />
               <div className="whitespace-nowrap overflow-hidden max-w-[120px]">
                  <p className="text-[11px] font-medium text-white animate-marquee inline-block pr-8">
                     {reel.authorName} • {t('audio_original')}
                  </p>
                  <p className="text-[11px] font-medium text-white animate-marquee inline-block pr-8">
                     {reel.authorName} • {t('audio_original')}
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/10 z-30">
          <div 
              className="h-full bg-gradient-to-r from-brand to-purple-500 transition-all duration-100 ease-linear shadow-[0_0_10px_#2563eb]"
              style={{ width: `${progress}%` }}
          />
      </div>
    </div>
  );
};

export default ReelsPage;
