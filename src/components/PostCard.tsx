
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Post, PostType, User, Page } from '../types';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
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
  ArrowsPointingOutIcon,
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
import DeleteConfirmModal from './DeleteConfirmModal';
import EditPostModal from './EditPostModal';
import PostActionsModal from './PostActionsModal';
import IndicateModal from './IndicateModal';
import ShareModal from './ShareModal';
import VideoPlayer from './VideoPlayer';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onFollowToggle: (userIdToFollow: string) => void;
  refreshUser: () => void;
  onPostUpdatedOrDeleted: () => void;
  onPinToggle: (postId: string, isCurrentlyPinned: boolean) => void;
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

  // Optimistic UI states
  const [localLikes, setLocalLikes] = useState<string[]>(post.likes || []);
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUser.id) || false);
  const [localSaves, setLocalSaves] = useState<string[]>(post.saves || []);
  const [isSaved, setIsSaved] = useState(post.saves?.includes(currentUser.id) || false);
  
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReadingVoice, setIsReadingVoice] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const isRecordedLive = post.type === PostType.LIVE && post.liveStream?.status === 'ENDED' && post.liveStream.recordingUrl;
  const isFollowing = currentUser.followedUsers?.includes(post.userId);

  const isAnonymous = post.isAnonymous;
  const authorDisplayName = isAnonymous ? t('anonymous_user') : `${postAuthor?.firstName || ''} ${postAuthor?.lastName || ''}`;
  const authorDisplayPic = isAnonymous ? DEFAULT_PROFILE_PIC : (postAuthor?.profilePicture || DEFAULT_PROFILE_PIC);
  const isActuallyOnline = !isAnonymous && isUserOnline(postAuthor?.lastSeen, postAuthor?.isOnline);

  // Gera um delay aleatório para a animação de flutuação, para que os cards não se movam em uníssono.
  const animationDelay = useMemo(() => `${Math.random() * 5}s`, []);

  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const TEXT_LIMIT = 280;

  useEffect(() => {
    setLocalLikes(post.likes || []);
    setIsLiked(post.likes?.includes(currentUser.id) || false);
    setLocalSaves(post.saves || []);
    setIsSaved(post.saves?.includes(currentUser.id) || false);
  }, [post.likes, post.saves, currentUser.id]);

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
        if (elapsedSeconds > 2 && post.userId !== currentUser.id) {
          incrementWatchTime(post.userId, elapsedSeconds, currentUser.isPremium);
        }
        watchStartTimeRef.current = null;
      }
    }
    
    return () => {
      if (watchStartTimeRef.current) {
        const elapsedSeconds = (Date.now() - watchStartTimeRef.current) / 1000;
        if (elapsedSeconds > 2 && post.userId !== currentUser.id) {
          incrementWatchTime(post.userId, elapsedSeconds, currentUser.isPremium);
        }
      }
    };
  }, [isPlaying, post.userId, currentUser.id, currentUser.isPremium]);

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
      console.error("Falha ao curtir post", error);
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
            'es': 'Español'
        };
        const targetLang = langMap[i18n.language.split('-')[0]] || 'Português';
        const translated = await translateText(post.content || '', targetLang);
        setTranslatedContent(translated);
    } catch (error) {
        showAlert(t('translation_error') || "Erro ao traduzir texto.");
    } finally {
        setIsTranslating(false);
    }
  };

  const handleReadAloud = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadingVoice) {
      window.speechSynthesis.cancel();
      setIsReadingVoice(false);
      return;
    }

    const textToRead = translatedContent || post.content;
    if (!textToRead) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Detect language
    const currentLang = i18n.language.split('-')[0];
    if (currentLang === 'pt') utterance.lang = 'pt-BR';
    else if (currentLang === 'en') utterance.lang = 'en-US';
    else if (currentLang === 'es') utterance.lang = 'es-ES';

    utterance.onend = () => setIsReadingVoice(false);
    utterance.onerror = () => setIsReadingVoice(false);

    setIsReadingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  const contentLength = post.content?.length || 0;

  // Lógica Adaptativa de Tamanho (Otimizada para Mobile)
  let fontSizeClass = 'text-[15px] md:text-[17px]';

  if (hasBg) {
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
        className="bg-white dark:bg-darkcard md:rounded-[1.5rem] border border-gray-100 dark:border-white/5 w-full relative cursor-pointer group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors duration-200 shadow-sm md:shadow-md"
      >
        <div className="p-4 flex flex-col">
          {/* Top Header: Avatar & Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
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

              {/* User Info */}
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
                        <span>Patrocinado</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Menu */}
            <button 
              onClick={(e) => { e.stopPropagation(); setShowActionsModal(true); }} 
              className="p-2.5 rounded-2xl text-gray-500 hover:text-brand hover:bg-brand/10 transition-all bg-gray-50 dark:bg-white/5"
            >
              <EllipsisHorizontalIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Main Content Area (Full Width) */}
          <div className="w-full">
            {/* Post Breadcrumb (Groups) */}
            {post.groupId && (
              <div className="flex items-center gap-1 text-[12px] text-brand font-black uppercase tracking-widest mb-3 px-1">
                <UserGroupIcon className="h-3.5 w-3.5" /> <span>em {post.groupName}</span>
              </div>
            )}

            {/* Main Content Body */}
            <div className="mt-1">
              {post.content && (
                <div 
                  className={`w-full transition-all duration-300 relative group/content
                    ${hasBg ? `${post.backgroundColor} ${post.textColor || 'text-white'} rounded-2xl p-6 text-center my-2 shadow-inner` : 'text-left bg-transparent'} 
                    ${post.fontFamily || 'font-sans'}`}
                >
                  <p 
                    style={{ fontFamily: `var(--${post.fontFamily || 'font-sans'})` }}
                    className={`whitespace-pre-wrap break-words w-full transition-all duration-300 ${hasBg ? fontSizeClass : 'text-[15px] md:text-[17px] leading-relaxed tracking-tight text-gray-900 dark:text-gray-100 font-medium'}`}
                  >
                    {translatedContent || displayContent}
                  </p>
                  
                  {post.content && post.content.length > 3 && (
                     <div className="flex items-center gap-4">
                        <button 
                            onClick={handleTranslate}
                            className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${hasBg ? 'text-white/80 hover:text-white' : 'text-brand'}`}
                        >
                            {isTranslating ? (
                                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                            ) : (
                                <span>{translatedContent ? t('view_original') : t('translate')}</span>
                            )}
                        </button>

                        <button 
                            onClick={handleReadAloud}
                            className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${hasBg ? 'text-white/80 hover:text-white' : 'text-brand'}`}
                        >
                            {isReadingVoice ? (
                                <><div className="flex gap-0.5"><div className="w-0.5 h-2 bg-current animate-bounce" style={{animationDelay: '0s'}}></div><div className="w-0.5 h-2 bg-current animate-bounce" style={{animationDelay: '0.1s'}}></div><div className="w-0.5 h-2 bg-current animate-bounce" style={{animationDelay: '0.2s'}}></div></div> {t('stop_reading')}</>
                            ) : (
                                <><SpeakerWaveIcon className="h-3.5 w-3.5" /> {t('read_aloud')}</>
                            )}
                        </button>
                     </div>
                  )}
                  {!isTextExpanded && post.content && post.content.length > (hasBg ? 500 : TEXT_LIMIT) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsTextExpanded(true); }}
                      className={`${hasBg ? 'text-white/90 underline-offset-4' : 'text-brand'} hover:underline mt-1 inline-block text-[15px] font-bold`}
                    >
                      {t('show_more') || 'Mostrar mais'}
                    </button>
                  )}
                  {isTextExpanded && post.content && post.content.length > (hasBg ? 500 : TEXT_LIMIT) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsTextExpanded(false); }}
                      className={`${hasBg ? 'text-white/90 underline-offset-4' : 'text-brand'} hover:underline mt-2 block text-[15px] font-bold mx-auto md:mx-0`}
                    >
                      {t('show_less') || 'Mostrar menos'}
                    </button>
                  )}
                </div>
              )}

              {/* Media Blocks */}
              <div className="mt-3">
                {/* LIVE ATIVA */}
                {post.type === PostType.LIVE && !post.liveStream?.recordingUrl && post.liveStream ? (
                   <div className="rounded-2xl overflow-hidden bg-gray-900 text-white p-6 relative border border-white/10">
                      <div className="absolute top-3 left-3 z-10">
                         <div className="bg-red-600 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider">
                            <SignalIcon className="h-3 w-3" /> AO VIVO
                         </div>
                      </div>
                      <div className="relative z-10 py-4 flex flex-col items-center text-center">
                         <h3 className="text-lg font-bold mb-4">{post.liveStream.title}</h3>
                         <button className="bg-brand text-white px-6 py-2 rounded-full font-bold text-sm">
                            Assistir agora
                         </button>
                      </div>
                   </div>
                ) : 
                
                /* LIVE GRAVADA */
                isRecordedLive ? (
                   <VideoPlayer 
                     src={post.liveStream!.recordingUrl!} 
                     className="rounded-2xl shadow-xl aspect-video"
                     autoPlay={true}
                     onPlayChange={setIsPlaying}
                   />
                ) :
                
                /* REEL ou VIDEO */
                (post.type === PostType.REEL || post.type === PostType.VIDEO) && post.reel ? (
                   <VideoPlayer 
                     src={post.reel.videoUrl} 
                     poster={post.reel.coverImageUrl}
                     className={`rounded-2xl shadow-xl ${post.type === PostType.REEL ? 'aspect-[9/16] max-h-[550px]' : 'aspect-video'}`}
                     isReel={post.type === PostType.REEL}
                     loop={post.type === PostType.REEL}
                     autoPlay={true}
                     onPlayChange={setIsPlaying}
                   />
                ) : (
                  /* IMAGE OR OTHER */
                  post.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 relative">
                       <img src={post.imageUrl} className="w-full h-auto object-cover max-h-[512px]" alt="Post" />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

            {/* Actions Bar (X Style) */}
            <div className="mt-5 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between max-w-sm text-gray-500">
               <button 
                 onClick={(e) => { e.stopPropagation(); setShowDetailModal(true); }}
                 className="flex items-center gap-1 group"
               >
                  <div className="p-2 rounded-full group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                    <ChatIconOutline className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[13px] group-hover:text-brand">{post.comments?.length || 0}</span>
               </button>

               <button 
                 onClick={handleLike}
                 className={`flex items-center gap-1 group transition-all ${isLiked ? 'text-pink-600' : ''}`}
               >
                  <div className={`p-2 rounded-full ${isLiked ? 'group-hover:bg-pink-600/10' : 'group-hover:bg-pink-600/10 group-hover:text-pink-600'} transition-colors`}>
                    <div>
                      {isLiked ? <HeartIconSolid className="h-[18px] w-[18px]" /> : <HeartIconOutline className="h-[18px] w-[18px]" />}
                    </div>
                  </div>
                  <span className={`text-[13px] ${isLiked ? '' : 'group-hover:text-pink-600'}`}>{localLikes.length}</span>
               </button>

               <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowShareModal(true);
                  }}
                  className="flex items-center gap-1 group"
               >
                  <div className="p-2 rounded-full group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                    <ShareIcon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[13px] group-hover:text-brand">{post.shares?.length || 0}</span>
               </button>

               <button 
                 onClick={handleSave}
                 className={`flex items-center gap-1 group transition-all ${isSaved ? 'text-brand' : ''}`}
               >
                  <div className={`p-2 rounded-full ${isSaved ? 'group-hover:bg-brand/10' : 'group-hover:bg-brand/10 group-hover:text-brand'} transition-colors`}>
                    {isSaved ? <BookmarkIconSolid className="h-[18px] w-[18px]" /> : <BookmarkIconOutline className="h-[18px] w-[18px]" />}
                  </div>
               </button>
            </div>
          </div>
        </div>

      {showActionsModal && (
        <PostActionsModal 
          isAuthor={isAuthor} 
          isPinned={!!post.isPinned}
          isFollowing={isFollowing}
          onClose={() => setShowActionsModal(false)} 
          onEdit={() => { setShowActionsModal(false); setShowEditModal(true); }} 
          onDelete={() => { setShowActionsModal(false); setShowDeleteModal(true); }} 
          onPin={() => { if(post.isPinned) unpinPost(post.id); else pinPost(post.id); onPostUpdatedOrDeleted(); setShowActionsModal(false); }} 
          onBoost={() => { setShowActionsModal(false); setShowBoostModal(true); }} 
          onFollow={() => { onFollowToggle(post.userId); setShowActionsModal(false); }} 
          onIndicate={() => { setShowActionsModal(false); setShowIndicateModal(true); }} 
          isMonetized={!!post.isMonetized}
          canMonetize={currentUser.isMonetized}
          onToggleMonetization={async () => {
            const updated = { ...post, isMonetized: !post.isMonetized };
            await updatePost(updated);
            onPostUpdatedOrDeleted();
            setShowActionsModal(false);
          }}
          onReport={async () => { 
            if(await showConfirm("Deseja realmente denunciar esta publicação?")) {
              await createReport({ reporterId: currentUser.id, targetId: post.id, targetType: 'POST', reason: 'DENÚNCIA', details: 'Via PostCard' }); 
              showAlert("Denúncia enviada com sucesso. Nossa equipe irá analisar.", { type: 'success' });
              setShowActionsModal(false); 
            }
          }} 
        />
      )}

      {showDetailModal && <PostDetailModal post={post} currentUser={currentUser} onClose={() => setShowDetailModal(false)} onUpdate={onPostUpdatedOrDeleted} onNavigate={onNavigate} refreshUser={refreshUser} />}
      {showBoostModal && <BoostPostModal post={post} currentUser={currentUser} onClose={() => setShowBoostModal(false)} onSuccess={() => { refreshUser(); onPostUpdatedOrDeleted(); }} />}
      
      {showDeleteModal && (
        <DeleteConfirmModal 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={async () => { 
            await deletePost(post.id); 
            onPostUpdatedOrDeleted(); 
            setShowDeleteModal(false); 
          }} 
        />
      )}
      
      {showEditModal && <EditPostModal postId={post.id} currentUser={currentUser} onClose={() => setShowEditModal(false)} onSuccess={onPostUpdatedOrDeleted} />}
      {showIndicateModal && <IndicateModal post={post} currentUser={currentUser} onClose={() => setShowIndicateModal(false)} onPostUpdated={onPostUpdatedOrDeleted} />}
      
      {showShareModal && (
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          currentUser={currentUser}
          onNavigate={onNavigate}
          content={{
            title: `Post de ${authorDisplayName}`,
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

