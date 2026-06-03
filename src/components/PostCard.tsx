
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Post, PostType, User, Page } from '../types';
import { DEFAULT_PROFILE_PIC, ANONYMOUS_PROFILE_PIC } from '../data/constants';
import { 
  findUserById, 
  updatePostLikes, 
  updatePostSaves, 
  unpinPost, 
  pinPost,
  createReport,
  updatePostShares,
  deletePost,
  incrementWatchTime,
  isUserOnline,
  updatePost
} from '../services/storageService';
import { translateText } from '../services/translationService';
import { useTranslation } from 'react-i18next';
import {
  HeartIcon as HeartIconOutline, 
  ChatBubbleOvalLeftIcon as ChatIconOutline, 
  BookmarkIcon as BookmarkIconOutline, 
  EllipsisHorizontalIcon, 
  MapPinIcon as PinIconOutline,
  SignalIcon,
  ShareIcon,
  PlayIcon,
  UserGroupIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  LockClosedIcon,
  ArrowPathIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid,
  MapPinIcon as PinIconSolid,
  BoltIcon,
  VideoCameraIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import { translateText as translateAI } from '../services/translationService';
import PostDetailModal from './PostDetailModal';
import BoostPostModal from './BoostPostModal';
import ConfirmationModal, { ConfirmationType } from './ConfirmationModal';
import EditPostModal from './EditPostModal';
import PostActionsModal from './PostActionsModal';
import IndicateModal from './IndicateModal';
import ShareModal from './ShareModal';
import VideoPlayer from './VideoPlayer';
import PromotePostCarouselModal from './PromotePostCarouselModal';
import { safeJsonStringify } from '../lib/utils';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onFollowToggle?: (userIdToFollow: string) => void;
  refreshUser: () => void;
  onPostUpdatedOrDeleted?: () => void;
  onPinToggle?: (postId: string, isCurrentlyPinned: boolean) => void;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  currentUser, 
  onNavigate, 
  onFollowToggle,
  refreshUser, 
  onPostUpdatedOrDeleted,
}) => {
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [postAuthor, setPostAuthor] = useState<User | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIndicateModal, setShowIndicateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  // Optimistic UI states
  const [localLikes, setLocalLikes] = useState<string[]>(post.likes || []);
  const [isLiked, setIsLiked] = useState(currentUser ? (post.likes?.includes(currentUser.id) || false) : false);
  const [localSaves, setLocalSaves] = useState<string[]>(post.saves || []);
  const [isSaved, setIsSaved] = useState(currentUser ? (post.saves?.includes(currentUser.id) || false) : false);
  
  const computedLiveViewerCount = useMemo(() => {
    if (!post.liveStream || post.liveStream.status !== 'LIVE') return 0;
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

  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReadingVoice, setIsReadingVoice] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Auto-translation logic
  useEffect(() => {
    const shouldAutoTranslate = currentUser?.autoTranslateEnabled && post.content && !translatedContent && !isTranslating;
    if (shouldAutoTranslate) {
      // Small delay to avoid hammering the API if multiple posts load at once
      const timer = setTimeout(() => {
        handleAutoTranslate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.autoTranslateEnabled, i18n.language]);

  const handleAutoTranslate = async () => {
    if (!post.content || translatedContent || isTranslating) return;
    
    // Check if current system language is same as post language (heuristic)
    // Actually Gemini is good at detecting. We only translate if i18n.language is NOT Portuguese (assuming default is PT)
    // or if the user changed and wants it.
    
    const langMap: Record<string, string> = {
        'pt': 'Português',
        'en': 'English',
        'es': 'Español',
        'fr': 'Français',
        'zh': 'Chinese'
    };
    const targetLang = langMap[i18n.language.split('-')[0]] || 'English';
    
    setIsTranslating(true);
    try {
        const translated = await translateText(post.content || '', targetLang);
        if (translated && translated.toLowerCase() !== post.content?.toLowerCase()) {
            setTranslatedContent(translated);
        }
    } catch (error) {
        console.error("Auto-translation error:", safeJsonStringify(error));
    } finally {
        setIsTranslating(false);
    }
  };

  const isRecordedLive = post.type === PostType.LIVE && post.liveStream?.status === 'ENDED' && post.liveStream.recordingUrl;
  const isFollowing = currentUser ? currentUser.followedUsers?.includes(post.userId) : false;

  const isAnonymous = post.isAnonymous;
  const authorDisplayName = isAnonymous ? t('anonymous_user') : `${postAuthor?.firstName || ''} ${postAuthor?.lastName || ''}`;
  const authorDisplayPic = isAnonymous ? ANONYMOUS_PROFILE_PIC : (postAuthor?.profilePicture || DEFAULT_PROFILE_PIC);
  const isActuallyOnline = !isAnonymous && isUserOnline(postAuthor?.lastSeen, postAuthor?.isOnline);

  // Gera um delay aleatório para a animação de flutuação, para que os cards não se movam em uníssono.
  const animationDelay = useMemo(() => `${Math.random() * 5}s`, []);

  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const TEXT_LIMIT = 280;

  useEffect(() => {
    setLocalLikes(post.likes || []);
    setIsLiked(currentUser ? (post.likes?.includes(currentUser.id) || false) : false);
    setLocalSaves(post.saves || []);
    setIsSaved(currentUser ? (post.saves?.includes(currentUser.id) || false) : false);
  }, [post.likes, post.saves, currentUser?.id]);

  useEffect(() => {
    const fetchAuthor = async () => {
      const author = await findUserById(post.userId);
      setPostAuthor(author || null);
    };
    fetchAuthor();
  }, [post.userId]);

  // Monetization Watch Time Tracking
  const [isPlaying, setIsPlaying] = useState(false);
  const watchStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (isPlaying) {
      watchStartTimeRef.current = Date.now();
    } else {
      if (watchStartTimeRef.current) {
        const elapsedSeconds = (Date.now() - watchStartTimeRef.current) / 1000;
        if (elapsedSeconds > 2 && currentUser && post.userId !== currentUser.id) {
          incrementWatchTime(post.userId, elapsedSeconds, !!currentUser.isPremium);
        }
        watchStartTimeRef.current = null;
      }
    }
    
    return () => {
      if (watchStartTimeRef.current) {
        const elapsedSeconds = (Date.now() - watchStartTimeRef.current) / 1000;
        if (elapsedSeconds > 2 && currentUser && post.userId !== currentUser.id) {
          incrementWatchTime(post.userId, elapsedSeconds, !!currentUser.isPremium);
        }
      }
    };
  }, [isPlaying, post.userId, currentUser?.id, currentUser?.isPremium]);

  // Video Player Logic
  // Handled by VideoPlayer component

  const hasBg = post?.backgroundColor && post.backgroundColor !== 'transparent' && post.backgroundColor !== 'bg-transparent';
  
  const displayContent = useMemo(() => {
    if (!post?.content) return '';
    const limit = hasBg ? 500 : TEXT_LIMIT;
    if (isTextExpanded || post.content.length <= limit) return post.content;
    return post.content.substring(0, limit) + '...';
  }, [post?.content, isTextExpanded, hasBg]);

  useEffect(() => {
    return () => {
      if (isReadingVoice) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isReadingVoice]);

  if (!post || !currentUser || !post.id) return null;

  const isAuthor = currentUser.id === post.userId;
  const isPostBoosted = post.isBoosted && post.boostExpires && post.boostExpires > Date.now();

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
      showAlert("Sua conta está em MODO RESTRITO por falta de verificação de identidade. Por favor, conclua a Verificação de Identidade em Configurações.", { title: "Acesso Restrito" });
      return;
    }
    
    // Optimistic Update
    const prevIsLiked = isLiked;
    const prevLikes = [...localLikes];
    
    setIsLiked(!prevIsLiked);
    if (prevIsLiked) {
      setLocalLikes(prev => prev.filter(id => id !== currentUser.id));
    } else {
      setLocalLikes(prev => [...prev, currentUser.id]);
    }

    if (!isLiked) {
       setShowHeartBurst(true);
       setTimeout(() => setShowHeartBurst(false), 1000);
    }

    try {
      await updatePostLikes(post.id, currentUser.id);
    } catch (error) {
      setIsLiked(prevIsLiked);
      setLocalLikes(prevLikes);
      console.error("Falha ao curtir post", safeJsonStringify(error));
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Optimistic Update
    const prevIsSaved = isSaved;
    const prevSaves = [...localSaves];

    setIsSaved(!prevIsSaved);
    if (prevIsSaved) {
      setLocalSaves(prev => prev.filter(id => id !== currentUser.id));
    } else {
      setLocalSaves(prev => [...prev, currentUser.id]);
    }

    try {
      await updatePostSaves(post.id, currentUser.id);
    } catch (error) {
      setIsSaved(prevIsSaved);
      setLocalSaves(prevSaves);
    }
  };

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
        const translated = await translateText(post.content || '', targetLang);
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

    const textToRead = translatedContent || post.content;
    if (!textToRead) return;

    // Reset synthesis queue to fix the stuck bug
    window.speechSynthesis.cancel();

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        
        // Detect language
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

  const contentLength = post.content?.length || 0;

  // Lógica Adaptativa de Tamanho (Otimizada para Mobile)
  let fontSizeClass = 'text-[15px] md:text-[17px]';

  if (hasBg && post.content) {
    const effectiveTextColor = post.textColor && post.textColor !== 'text-white' 
      ? post.textColor 
      : (post.backgroundColor === 'bg-white' ? 'text-gray-900' : 'text-white');

    if (contentLength < 60) {
        fontSizeClass = `${effectiveTextColor} text-2xl md:text-4xl leading-tight`;
    } else if (contentLength < 150) {
        fontSizeClass = `${effectiveTextColor} text-lg md:text-2xl leading-snug`;
    } else {
        fontSizeClass = `${effectiveTextColor} text-base md:text-xl leading-relaxed`;
    }
  }

  const isImageUrlVideo = useMemo(() => {
    if (post.type === PostType.IMAGE || post.type?.toString().toUpperCase() === 'IMAGE') return false;
    if (post.reel?.videoUrl) return true; // If it has a reel object, it's intended to be a video
    if (!post.imageUrl) return false;
    const urlToCheck = post.imageUrl || '';
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    return videoExtensions.some(ext => urlToCheck.toLowerCase().includes(ext)) || (urlToCheck.includes('blob:') && (post.type === PostType.VIDEO || post.type === PostType.REEL));
  }, [post.imageUrl, post.reel?.videoUrl, post.type]);

  const isVideoPost = useMemo(() => {
    if (post.type === PostType.IMAGE || post.type?.toString().toUpperCase() === 'IMAGE') return false;
    return post.type === PostType.REEL || 
           post.type === PostType.VIDEO || 
           post.type === PostType.LIVE ||
           isRecordedLive || 
           post.type?.toString().toUpperCase() === 'REEL' || 
           post.type?.toString().toUpperCase() === 'VIDEO' ||
           post.type?.toString().toUpperCase() === 'LIVE' ||
           isImageUrlVideo ||
           !!post.reel?.videoUrl;
  }, [post.type, isRecordedLive, isImageUrlVideo, post.reel?.videoUrl]);

  const isReelType = useMemo(() => {
    // Se o tipo for explicitamente VIDEO, não é um reel.
    if (post.type === PostType.VIDEO || post.type?.toString().toUpperCase() === 'VIDEO') return false;
    
    // Se o tipo for explicitamente REEL, é um reel.
    if (post.type === PostType.REEL || post.type?.toString().toUpperCase() === 'REEL') return true;
    
    // Fallback: se tiver um vídeo mas não for explicitamente REEL, trata como vídeo normal
    return false;
  }, [post.type]);

  return (
    <>
      {showHeartBurst && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[1000]">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute"
            >
              <HeartIconSolid className="h-12 w-12 text-red-500 drop-shadow-2xl" />
            </div>
          ))}
        </div>
      )}

      <div 
        onClick={() => {
          if (post.type === PostType.LIVE && post.liveStream?.status !== 'ENDED') onNavigate('live', { postId: post.id });
          else if (post.type === PostType.REEL) onNavigate('reels-page', { startPostId: post.id });
          else if (!isRecordedLive) setShowDetailModal(true);
        }}
        className="bg-white dark:bg-darkcard md:rounded-[1.5rem] border border-gray-100 dark:border-white/5 w-full relative cursor-pointer group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors duration-200 shadow-sm md:shadow-md overflow-hidden"
      >
        {isReelType && (post.reel?.videoUrl || isImageUrlVideo) ? (
          /* Instagram Style Layout for Reels */
          <div className="relative aspect-[9/16] max-h-[700px] bg-black group/reel overflow-hidden md:rounded-[2rem] shadow-2xl">
            <VideoPlayer 
              src={post.reel?.videoUrl || post.imageUrl || ''} 
              poster={post.reel?.coverImageUrl}
              className="w-full h-full"
              isReel={true}
              loop={true}
              autoPlay={true}
              onPlayChange={setIsPlaying}
            />
            
            {/* Overlay Gradient - Cleaner Instagram Vibe */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

            {/* Header Overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
               <div className="flex items-center gap-2">
                 <img src={authorDisplayPic} className="w-8 h-8 rounded-full border border-white/20" />
                 <span className="text-white text-sm font-bold drop-shadow-md">
                   {authorDisplayName}
                 </span>
                 {!isAnonymous && postAuthor?.isVerified && <BoltIcon className="h-3 w-3 text-brand" />}
               </div>
               <div className="flex items-center gap-1">
                 <button 
                   onClick={handleTranslate}
                   className={`p-2 rounded-full transition-all ${isTranslating ? 'animate-pulse' : ''} ${translatedContent ? 'bg-brand text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                   title={t('translate')}
                 >
                   <LanguageIcon className="h-5 w-5" />
                 </button>
                 <button 
                   onClick={handleReadAloud}
                   className={`p-2 rounded-full transition-all ${isReadingVoice ? 'bg-brand text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                   title={t('read_aloud')}
                 >
                   {isReadingVoice ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
                 </button>
                 <button 
                   onClick={(e) => { e.stopPropagation(); setShowActionsModal(true); }}
                   className="p-1 text-white drop-shadow-md"
                 >
                   <EllipsisHorizontalIcon className="h-6 w-6" />
                 </button>
               </div>
            </div>

              {/* Right Side Interaction Bar - More Instagram Style */}
              <div className="absolute right-3 bottom-20 flex flex-col items-center gap-6 z-10">
                <div className="flex flex-col items-center">
                  <button onClick={handleLike} className={`p-2 drop-shadow-xl transition-all active:scale-75 ${isLiked ? 'text-red-500 scale-110' : 'text-white'}`}>
                    {isLiked ? <HeartIconSolid className="h-9 w-9" /> : <HeartIconOutline className="h-9 w-9" />}
                  </button>
                  <span className="text-[11px] text-white font-black drop-shadow-md mt-1">{localLikes.length}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(true); }} className="p-2 text-white drop-shadow-xl hover:scale-110 transition-transform">
                    <ChatIconOutline className="h-9 w-9" />
                  </button>
                  <span className="text-[11px] text-white font-black drop-shadow-md mt-1">{post.comments?.length || 0}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="p-2 text-white drop-shadow-xl hover:scale-110 transition-transform">
                  <ShareIcon className="h-8 w-8" />
                </button>
                <button onClick={handleSave} className={`p-2 drop-shadow-xl transition-all active:scale-75 ${isSaved ? 'text-brand' : 'text-white'}`}>
                  {isSaved ? <BookmarkIconSolid className="h-8 w-8" /> : <BookmarkIconOutline className="h-8 w-8" />}
                </button>
                <div className="mt-2 w-8 h-8 rounded-full border border-white/50 p-1 animate-spin-slow">
                   <div className="w-full h-full rounded-full bg-white/20"></div>
                </div>
              </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-4 left-4 right-16 z-10">
               <p className="text-white text-sm font-medium line-clamp-2 leading-snug drop-shadow-md mb-2">
                 {post.content}
               </p>
               <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full px-2 py-1 w-fit border border-white/10">
                 <SignalIcon className="h-3 w-3 text-white" />
                 <span className="text-[10px] text-white font-bold uppercase tracking-wider">{t('audio_original')}</span>
               </div>
            </div>
          </div>
        ) : isVideoPost ? (
          /* YouTube Style Layout for Videos */
          <div className="flex flex-col bg-white dark:bg-[#0f0f0f] border-b border-gray-100 dark:border-white/5">
            {/* Video Area */}
            <div className="w-full relative bg-black aspect-video overflow-hidden">
              {isRecordedLive ? (
                <VideoPlayer 
                  src={post.liveStream!.recordingUrl!} 
                  className="w-full h-full"
                  autoPlay={true}
                  onPlayChange={setIsPlaying}
                />
              ) : post.type === PostType.LIVE && post.liveStream?.status !== 'ENDED' ? (
                /* GORGEOUS ACTIVE LIVE STREAM FEED PLACEHOLDER CARD */
                <div className="w-full h-full relative flex flex-col items-center justify-center bg-zinc-950 p-6 overflow-hidden min-h-[220px]">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  
                  {/* Glowing Radar Animation */}
                  <div className="relative z-10 flex items-center justify-center w-20 h-20 mb-4 bg-red-600/15 rounded-full border border-red-500/25 shadow-[0_0_50px_rgba(239,68,68,0.25)] animate-pulse">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
                    <SignalIcon className="h-10 w-10 text-red-500 animate-pulse" />
                  </div>
                  
                  <div className="z-10 text-center max-w-sm px-4">
                    <span className="inline-flex items-center gap-1.5 bg-red-600 border border-red-500/25 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white mb-2 shadow-lg shadow-red-600/20">
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      AO VIVO AGORA
                    </span>
                    <h4 className="text-sm font-black text-white tracking-wide uppercase line-clamp-1 mb-1">
                      {post.liveStream?.title || t('starting_live', 'Transmissão Ao Vivo')}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                      Clique para entrar na sala
                    </p>
                    {computedLiveViewerCount > 0 && (
                      <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg inline-block">
                        ● {computedLiveViewerCount} assistindo
                      </p>
                    )}
                  </div>
                  
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                    <span className="text-[8px] font-mono text-zinc-500">FEED_STREAM: ACTIVE</span>
                    <span className="text-[8px] font-mono text-zinc-500">TAP_TO_WATCH</span>
                  </div>
                </div>
              ) : (
                <VideoPlayer 
                  src={post.reel?.videoUrl || post.imageUrl || ''} 
                  poster={post.reel?.coverImageUrl || post.imageUrl}
                  className="w-full h-full"
                  isReel={post.type === PostType.REEL || post.type?.toString().toUpperCase() === 'REEL'}
                  loop={false}
                  autoPlay={true}
                  onPlayChange={setIsPlaying}
                />
              )}
              {post.type === PostType.LIVE && (
                <div className="absolute top-3 left-3 z-10">
                  <div className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider text-white">
                    <SignalIcon className="h-3 w-3" /> {t('live_badge')}
                  </div>
                </div>
              )}
            </div>

            {/* Info below video (YouTube Style) */}
            <div className="p-4">
              <div className="flex gap-3">
                <div 
                  className="shrink-0"
                  onClick={(e) => { e.stopPropagation(); if(!isAnonymous) onNavigate('profile', { userId: post.userId }); }}
                >
                  <img src={authorDisplayPic} className="w-10 h-10 rounded-full border border-gray-100 dark:border-white/10" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-2 leading-snug">
                    {post.content || ''}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[12px] text-gray-500 font-medium">
                    <span className="hover:text-brand cursor-pointer" onClick={(e) => { e.stopPropagation(); if(!isAnonymous) onNavigate('profile', { userId: post.userId }); }}>
                      {authorDisplayName}
                    </span>
                    {!isAnonymous && postAuthor?.isVerified && <BoltIcon className="h-3 w-3 text-brand inline" />}
                    <span>•</span>
                    <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                    {isPostBoosted && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600 font-bold uppercase text-[10px]">{t('sponsored_label')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleTranslate}
                    className={`p-1.5 rounded-full transition-all ${isTranslating ? 'animate-pulse' : ''} ${translatedContent ? 'text-brand' : 'text-gray-500 hover:text-brand hover:bg-gray-100 dark:hover:bg-white/5'}`}
                    title={t('translate')}
                  >
                    <LanguageIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleReadAloud}
                    className={`p-1.5 rounded-full transition-all ${isReadingVoice ? 'text-brand' : 'text-gray-500 hover:text-brand hover:bg-gray-100 dark:hover:bg-white/5'}`}
                    title={t('read_aloud')}
                  >
                    {isReadingVoice ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowActionsModal(true); }} 
                    className="p-1 text-gray-500 hover:text-brand"
                  >
                    <EllipsisHorizontalIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Translation/Voice if expanded or available */}
              {(translatedContent || isTextExpanded) && (
                <div className="mt-3 text-[14px] text-gray-700 dark:text-gray-300">
                  {translatedContent || post.content}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center gap-6 text-gray-500">
                <button onClick={handleLike} className={`flex items-center gap-1.5 hover:text-brand transition-colors ${isLiked ? 'text-pink-600' : ''}`}>
                  {isLiked ? <HeartIconSolid className="h-5 w-5" /> : <HeartIconOutline className="h-5 w-5" />}
                  <span className="text-xs font-bold">{localLikes.length}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(true); }} className="flex items-center gap-1.5 hover:text-brand transition-colors">
                  <ChatIconOutline className="h-5 w-5" />
                  <span className="text-xs font-bold">{post.comments?.length || 0}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="flex items-center gap-1.5 hover:text-brand transition-colors">
                  <ShareIcon className="h-5 w-5" />
                  <span className="text-xs font-bold">{post.shares?.length || 0}</span>
                </button>
                <button onClick={handleSave} className={`ml-auto hover:text-brand transition-colors ${isSaved ? 'text-brand' : ''}`}>
                  {isSaved ? <BookmarkIconSolid className="h-5 w-5" /> : <BookmarkIconOutline className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Social Layout for Images/Text/etc */
          <div className="p-4 flex flex-col">
            {/* Header: Avatar & Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`relative group/avatar shrink-0 ${isAnonymous ? 'cursor-default' : 'cursor-pointer'}`} onClick={(e) => { e.stopPropagation(); if(!isAnonymous) onNavigate('profile', { userId: post.userId }); }}>
                  <img 
                    src={authorDisplayPic} 
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white dark:border-[#000000] shadow-md transition-transform group-hover/avatar:scale-105" 
                    referrerPolicy="no-referrer"
                  />
                  {isActuallyOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white dark:border-[#000000] shadow-sm"></div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-black text-base md:text-lg text-gray-900 dark:text-white truncate ${isAnonymous ? '' : 'hover:underline cursor-pointer'}`} onClick={(e) => { e.stopPropagation(); if(!isAnonymous) onNavigate('profile', { userId: post.userId }); }}>
                      {authorDisplayName}
                    </span>
                    {!isAnonymous && postAuthor?.isVerified && <BoltIcon className="h-4 w-4 text-brand shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                    <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                    {post.isPinned && (
                      <>
                        <span>·</span>
                        <PinIconSolid className="h-3 w-3" />
                      </>
                    )}
                    {isPostBoosted && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                          <BoltIcon className="h-3 w-3" />
                          <span>{t('sponsored_label')}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={handleTranslate}
                  className={`p-2.5 rounded-2xl transition-all ${isTranslating ? 'animate-pulse' : ''} ${translatedContent ? 'bg-brand/20 text-brand' : 'text-gray-500 hover:text-brand hover:bg-brand/10 bg-gray-50 dark:bg-white/5'}`}
                  title={t('translate')}
                >
                  <LanguageIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleReadAloud}
                  className={`p-2.5 rounded-2xl transition-all ${isReadingVoice ? 'bg-brand/20 text-brand' : 'text-gray-500 hover:text-brand hover:bg-brand/10 bg-gray-50 dark:bg-white/5'}`}
                  title={t('read_aloud')}
                >
                  {isReadingVoice ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowActionsModal(true); }} 
                  className="p-2.5 rounded-2xl text-gray-500 hover:text-brand hover:bg-brand/10 transition-all bg-gray-50 dark:bg-white/5"
                >
                  <EllipsisHorizontalIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="w-full">
              {post.groupId && (
                <div className="flex items-center gap-1 text-[12px] text-brand font-black uppercase tracking-widest mb-3 px-1">
                  <UserGroupIcon className="h-3.5 w-3.5" /> <span>{t('in_group')} {post.groupName}</span>
                </div>
              )}
              <div className="mt-1">
                {post.content && (
                  <div className={`w-full relative group/content ${hasBg ? `${post.backgroundColor} ${post.textColor || 'text-white'} rounded-[2.5rem] p-10 md:p-14 text-center my-4 shadow-xl shadow-brand/10` : 'text-left bg-transparent'}`}>
                    <p 
                      style={post.fontFamily ? { fontFamily: `var(--${post.fontFamily})` } : undefined}
                      className={`whitespace-pre-wrap break-words w-full transition-all duration-300 ${post.fontFamily || ''} ${hasBg ? fontSizeClass : 'text-[15px] md:text-[17px] leading-relaxed tracking-tight text-gray-900 dark:text-gray-100 font-medium'}`}
                    >
                      {translatedContent || displayContent}
                    </p>
                    {translatedContent && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-brand uppercase tracking-widest opacity-80">
                        <LanguageIcon className="h-3 w-3" />
                        <span>{t('translation_ai')}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setTranslatedContent(null); }}
                          className="ml-2 hover:underline"
                        >
                          ({t('view_original')})
                        </button>
                      </div>
                    )}
                    {!isTextExpanded && post.content?.length > (hasBg ? 500 : TEXT_LIMIT) && (
                      <button onClick={(e) => { e.stopPropagation(); setIsTextExpanded(true); }} className={`${hasBg ? 'text-white/90 underline-offset-4' : 'text-brand'} hover:underline mt-1 inline-block text-[15px] font-bold`}>{t('show_more')}</button>
                    )}
                  </div>
                )}
                <div className="mt-3">
                  {post.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 relative">
                       <img src={post.imageUrl} className="w-full h-auto object-cover max-h-[512px]" alt="Post" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between max-w-sm text-gray-500">
               <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(true); }} className="flex items-center gap-1 group">
                  <div className="p-2 rounded-full group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                    <ChatIconOutline className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[13px] group-hover:text-brand">{post.comments?.length || 0}</span>
               </button>
               <button onClick={handleLike} className={`flex items-center gap-1 group transition-all ${isLiked ? 'text-pink-600' : ''}`}>
                  <div className={`p-2 rounded-full ${isLiked ? 'group-hover:bg-pink-600/10' : 'group-hover:bg-pink-600/10 group-hover:text-pink-600'} transition-colors`}>
                    {isLiked ? <HeartIconSolid className="h-[18px] w-[18px]" /> : <HeartIconOutline className="h-[18px] w-[18px]" />}
                  </div>
                  <span className={`text-[13px] ${isLiked ? '' : 'group-hover:text-pink-600'}`}>{localLikes.length}</span>
               </button>
               <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="flex items-center gap-1 group">
                  <div className="p-2 rounded-full group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                    <ShareIcon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[13px] group-hover:text-brand">{post.shares?.length || 0}</span>
               </button>
               <button onClick={handleSave} className={`flex items-center gap-1 group transition-all ${isSaved ? 'text-brand' : ''}`}>
                  <div className={`p-2 rounded-full ${isSaved ? 'group-hover:bg-brand/10' : 'group-hover:bg-brand/10 group-hover:text-brand'} transition-colors`}>
                    {isSaved ? <BookmarkIconSolid className="h-[18px] w-[18px]" /> : <BookmarkIconOutline className="h-[18px] w-[18px]" />}
                  </div>
               </button>
            </div>
          </div>
        )}
      </div>

      {showActionsModal && (
        <PostActionsModal 
          isAuthor={isAuthor} 
          isPinned={!!post.isPinned}
          isFollowing={isFollowing}
          onClose={() => setShowActionsModal(false)} 
          onEdit={() => { setShowActionsModal(false); setShowEditModal(true); }} 
          onDelete={() => { setShowActionsModal(false); setShowDeleteModal(true); }} 
          onPin={() => { if(post.isPinned) unpinPost(post.id); else pinPost(post.id); onPostUpdatedOrDeleted?.(); setShowActionsModal(false); }} 
          onBoost={() => { setShowActionsModal(false); setShowBoostModal(true); }} 
          onPromoteCarousel={() => { setShowActionsModal(false); setShowPromoteModal(true); }}
          onFollow={() => { onFollowToggle?.(post.userId); setShowActionsModal(false); }} 
          onIndicate={() => { setShowActionsModal(false); setShowIndicateModal(true); }} 
          isMonetized={!!post.isMonetized}
          canMonetize={!!currentUser?.isMonetized}
          onToggleMonetization={async () => {
            const updated = { ...post, isMonetized: !post.isMonetized };
            await updatePost(updated);
            onPostUpdatedOrDeleted?.();
            setShowActionsModal(false);
          }}
          onReport={async () => { 
            if(!currentUser) return;
            if(await showConfirm(t('report_confirm') || "Deseja realmente denunciar esta publicação?")) {
              await createReport({ reporterId: currentUser.id, targetId: post.id, targetType: 'POST', reason: 'DENÚNCIA', details: 'Via PostCard' }); 
              showAlert(t('report_success') || "Denúncia enviada com sucesso. Nossa equipe irá analisar.", { type: 'success' });
              setShowActionsModal(false); 
            }
          }} 
        />
      )}

      {showDetailModal && <PostDetailModal post={post} currentUser={currentUser!} onClose={() => setShowDetailModal(false)} onUpdate={onPostUpdatedOrDeleted || (() => {})} onNavigate={onNavigate} refreshUser={refreshUser} />}
      {showBoostModal && currentUser && <BoostPostModal post={post} currentUser={currentUser} onClose={() => setShowBoostModal(false)} onSuccess={() => { refreshUser(); onPostUpdatedOrDeleted?.(); }} />}
      {showPromoteModal && currentUser && <PromotePostCarouselModal post={post} currentUser={currentUser} onClose={() => setShowPromoteModal(false)} onSuccess={() => { refreshUser(); onPostUpdatedOrDeleted?.(); }} />}
      
      {showDeleteModal && (
        <ConfirmationModal 
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)} 
          title={t('confirm_delete_title')}
          message={t('delete_confirm')}
          confirmText={t('delete')}
          type={ConfirmationType.DANGER}
          onConfirm={async () => { 
            await deletePost(post.id); 
            onPostUpdatedOrDeleted?.(); 
            setShowDeleteModal(false); 
          }} 
        />
      )}
      
      {showEditModal && currentUser && <EditPostModal post={post} currentUser={currentUser} onClose={() => setShowEditModal(false)} onSuccess={onPostUpdatedOrDeleted || (() => {})} />}
      {showIndicateModal && currentUser && <IndicateModal post={post} currentUser={currentUser} onClose={() => setShowIndicateModal(false)} onPostUpdated={onPostUpdatedOrDeleted || (() => {})} />}
      
      {showShareModal && (
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          currentUser={currentUser}
          onNavigate={onNavigate}
          content={{
            title: t('post_from_author', { author: authorDisplayName }),
            text: post.content || '',
            url: `${window.location.origin}/?page=post-detail&postId=${post.id}`,
            mediaUrl: post.imageUrl || post.reel?.videoUrl,
            mediaType: post.imageUrl ? 'image' : (post.reel?.videoUrl ? 'video' : undefined)
          }}
        />
      )}
    </>
  );
};

export default PostCard;

