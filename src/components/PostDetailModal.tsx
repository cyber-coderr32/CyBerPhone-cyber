
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Post, User, Comment, Page, NotificationType, PostType } from '../types';
import { findUserById, addPostComment, deleteComment, updatePostLikes, updatePostSaves, updatePostShares, toggleFollowUser, generateUUID, getPosts, toggleReaction, addCommentReply, createNotification, getMutualBlockedUserIds } from '../services/storageService';
import { useDialog } from '../services/DialogContext';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import ShareModal from './ShareModal';
import VideoPlayer from './VideoPlayer';
import { useTranslation } from 'react-i18next';
import { 
  XMarkIcon, 
  ChatBubbleOvalLeftIcon,
  HeartIcon as HeartIconOutline,
  BookmarkIcon as BookmarkIconOutline,
  ShareIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  LockClosedIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid,
  CheckBadgeIcon
} from '@heroicons/react/24/solid';

interface PostDetailModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onUpdate: () => void;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, currentUser, onClose, onUpdate, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [commentText, setCommentText] = useState('');
  const [author, setAuthor] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string, userName: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👍'];
  
  useEffect(() => {
    const fetchAuthor = async () => {
      const user = await findUserById(post.userId);
      setAuthor(user || null);
    };
    fetchAuthor();
  }, [post.userId]);

  const fetchComments = async () => {
    const allPosts = await getPosts();
    const currentPost = allPosts.find(p => p.id === post.id);
    if (currentPost) {
      setComments(currentPost.comments || []);
    }
  };

  useEffect(() => {
    fetchComments();
    const loadBlocks = async () => {
      const ids = await getMutualBlockedUserIds(currentUser.id);
      setHiddenIds(ids);
    };
    loadBlocks();
  }, [post.id, currentUser.id]);

  const isOwner = currentUser.id === post.userId;
  const isFollowing = currentUser.followedUsers?.includes(post.userId);
  const hasLiked = post.likes?.includes(currentUser.id);
  const hasSaved = post.saves?.includes(currentUser.id);
  const commentsDisabled = post.disableComments; // Enforce for everyone if blocked

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePostLikes(post.id, currentUser.id);
    onUpdate();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePostSaves(post.id, currentUser.id);
    onUpdate();
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.imageUrl) return;
    
    try {
      const response = await fetch(post.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cyberphone-midia-${post.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(post.imageUrl, '_blank');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFollowUser(currentUser.id, post.userId);
    refreshUser();
    onUpdate();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (await showConfirm("Apagar este comentário?")) {
        await deleteComment(post.id, commentId);
        await fetchComments();
        onUpdate();
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentsDisabled) return;
    
    try {
      const newComment: Comment = {
        id: generateUUID(),
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
        profilePic: currentUser.profilePicture,
        text: commentText,
        timestamp: Date.now()
      };

      if (replyingTo) {
        await addCommentReply(post.id, replyingTo.id, newComment);
        const targetComment = comments.find(c => c.id === replyingTo.id);
        if (targetComment && targetComment.userId !== currentUser.id) {
           await createNotification(targetComment.userId, currentUser.id, NotificationType.COMMENT, post.id);
        }
        setReplyingTo(null);
      } else {
        await addPostComment(post.id, newComment);
      }
      
      setCommentText('');
      await fetchComments();
      onUpdate();

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    } catch (err: any) {
      if (err.message?.includes('SENTINEL_BLOCK')) {
        showAlert(err.message.replace('SENTINEL_BLOCK: ', ''), { type: 'error', title: 'Sentinela de Segurança' });
      } else {
        showAlert("Falha ao enviar comentário.", { type: 'error' });
      }
    }
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    await toggleReaction(commentId, 'COMMENT', emoji, currentUser.id, post.id);
    await fetchComments();
    onUpdate();
  };

  if (!author) return null;

  const hasBg = post.backgroundColor && post.backgroundColor !== 'transparent' && post.backgroundColor !== 'bg-transparent';
  const contentLength = post.content?.length || 0;

  let containerMinHeight = 'auto';
  let fontSizeClass = 'text-base md:text-lg text-left text-gray-900 dark:text-white';
  let paddingClass = 'p-0'; 

  if (hasBg) {
    if (contentLength < 60) {
        containerMinHeight = '250px'; 
        fontSizeClass = `${post.textColor || 'text-white'} text-3xl md:text-5xl text-center font-bold leading-tight`;
        paddingClass = 'p-10';
    } else if (contentLength < 150) {
        containerMinHeight = '300px';
        fontSizeClass = `${post.textColor || 'text-white'} text-2xl md:text-3xl text-center font-semibold leading-snug`;
        paddingClass = 'p-10';
    } else if (contentLength <= 300) {
        containerMinHeight = '350px';
        fontSizeClass = `${post.textColor || 'text-white'} text-xl md:text-2xl text-center leading-relaxed`;
        paddingClass = 'p-10';
    } else {
        containerMinHeight = '400px';
        fontSizeClass = `${post.textColor || 'text-white'} text-lg md:text-xl text-center leading-relaxed`;
        paddingClass = 'p-12';
    }
  }

  const RenderComment = ({ c, depth = 0 }: { c: Comment, depth?: number }) => {
    const hasCommentLiked = c.reactions?.['❤️']?.includes(currentUser.id);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const commentAuthorIsAnonymous = c.userId === post.userId && post.isAnonymous;

    return (
      <div className={`p-4 border-b border-gray-100 dark:border-white/10 flex gap-3 group transition-all ${depth > 0 ? 'ml-10 md:ml-12 border-l' : ''}`}>
        <img 
          src={commentAuthorIsAnonymous ? DEFAULT_PROFILE_PIC : (c.profilePic || DEFAULT_PROFILE_PIC)} 
          className="w-10 h-10 rounded-full object-cover shrink-0 cursor-pointer hover:scale-105 transition-transform" 
          onClick={() => { 
            if (commentAuthorIsAnonymous) return;
            onClose(); 
            onNavigate('profile', { userId: c.userId }); 
          }}
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span 
                className={`font-bold text-[15px] dark:text-white truncate ${commentAuthorIsAnonymous ? '' : 'hover:underline cursor-pointer'}`}
                onClick={() => { 
                  if (commentAuthorIsAnonymous) return;
                  onClose(); 
                  onNavigate('profile', { userId: c.userId }); 
                }}
              >
                {commentAuthorIsAnonymous ? 'Anônimo' : c.userName}
              </span>
              <span className="text-gray-500 text-[14px]">· {new Date(c.timestamp).toLocaleDateString()}</span>
            </div>
            {(currentUser.id === c.userId || isOwner) && (
              <button 
                onClick={() => handleDeleteComment(c.id)}
                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-[15px] dark:text-gray-200 leading-normal">{c.text}</p>
          
          {c.reactions && Object.keys(c.reactions).some(emoji => c.reactions![emoji].length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(c.reactions).map(([emoji, uids]) => uids.length > 0 && (
                <button 
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); handleToggleReaction(c.id, emoji); }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all ${uids.includes(currentUser.id) ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500'}`}
                >
                  <span>{emoji}</span>
                  <span className="font-bold">{uids.length}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-6 text-gray-500 text-[13px]">
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                className={`flex items-center gap-1 group transition-colors ${hasCommentLiked ? 'text-pink-600' : ''}`}
              >
                <div className="p-2 -m-2 rounded-full group-hover:bg-pink-600/10 group-hover:text-pink-600">
                   {hasCommentLiked ? <HeartIconSolid className="h-4 w-4" /> : <HeartIconOutline className="h-4 w-4" />}
                </div>
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-zinc-800 shadow-2xl border dark:border-white/10 p-2 rounded-2xl flex gap-2 z-50 backdrop-blur-xl" onClick={e => e.stopPropagation()}>
                  {EMOJIS.map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={(e) => { e.stopPropagation(); handleToggleReaction(c.id, emoji); setShowEmojiPicker(false); }}
                      className="text-xl hover:scale-125 transition-transform active:scale-90 p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setReplyingTo({ id: c.id, userName: c.userName });
                inputRef.current?.focus();
              }}
              className="flex items-center gap-1 group"
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-brand/10 group-hover:text-brand"><ChatBubbleOvalLeftIcon className="h-4 w-4" /></div>
              <span className="group-hover:text-brand font-bold">Responder</span>
            </button>

            {/* Botão de compartilhar em comentário removido */}
          </div>

          {c.replies && c.replies.length > 0 && (
            <div className="mt-2">
              {c.replies.map(reply => (
                <RenderComment key={reply.id} c={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const visibleComments = comments.filter(c => !hiddenIds.includes(c.userId));

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center animate-fade-in overflow-hidden blur-none backdrop-blur-sm">
      <div className="w-full h-full md:h-[95vh] md:max-w-2xl md:rounded-3xl bg-white dark:bg-[#000000] flex flex-col overflow-hidden relative shadow-2xl border border-white/5">
        
        <div className="flex items-center px-4 shrink-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl sticky top-0 z-[110] h-14 border-b border-gray-100 dark:border-white/5">
           <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all active:scale-95">
             <ArrowLeftIcon className="h-5 w-5 dark:text-white" />
           </button>
           <h2 className="ml-8 text-lg font-black dark:text-white tracking-tight uppercase">Post</h2>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
           <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { 
                    if (post.isAnonymous) return;
                    onClose(); 
                    onNavigate('profile', { userId: post.userId }); 
                 }}>
                    <img 
                      src={post.isAnonymous ? DEFAULT_PROFILE_PIC : (author.profilePicture || DEFAULT_PROFILE_PIC)} 
                      className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-white/10 group-hover:scale-105 transition-transform" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col">
                       <h4 className="font-bold text-[16px] dark:text-white group-hover:underline leading-tight">
                          {post.isAnonymous ? 'Anônimo' : (author ? `${author.firstName} ${author.lastName}` : post.authorName || 'Usuário')}
                       </h4>
                       <p className="text-gray-500 text-[14px]">
                          {post.isAnonymous ? '@anonimo' : `@${(author?.firstName || 'user').toLowerCase()}${(author?.lastName || '').toLowerCase()}`}
                       </p>
                    </div>
                 </div>
                 {!isOwner && !post.isAnonymous && (
                    <button 
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-full font-bold text-sm transition-all active:scale-95 ${isFollowing ? 'border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-red-50 dark:hover:bg-red-900/10' : 'bg-brand text-white hover:opacity-90 shadow-lg shadow-brand/20'}`}
                    >
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                 )}
              </div>

              <div className="mt-4">
                 {post.groupId && (
                    <div className="flex items-center gap-1 text-[11px] text-brand font-black uppercase tracking-widest mb-4 px-1">
                      <UserGroupIcon className="h-3.5 w-3.5" /> <span>Postado em {post.groupName}</span>
                    </div>
                 )}

                 <div 
                   className={`w-full transition-all duration-500
                     ${hasBg ? `${post.backgroundColor} ${post.textColor || 'text-white'} rounded-3xl ${paddingClass} text-center my-4 shadow-2xl relative overflow-hidden` : ''}
                   `}
                   style={hasBg ? { minHeight: containerMinHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}
                 >
                    {hasBg && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
                    <p 
                      style={{ fontFamily: `var(--${post.fontFamily || 'font-sans'})` }}
                      className={`whitespace-pre-wrap break-words w-full relative z-10 transition-all duration-500 ${hasBg ? fontSizeClass : 'text-[18px] md:text-[22px] leading-relaxed dark:text-gray-100'}`}
                    >
                      {post.content}
                    </p>
                 </div>
                 
                 {post.imageUrl && (
                    <div className="mt-4 rounded-3xl overflow-hidden border border-gray-100 dark:border-white/10 bg-black/20 shadow-xl">
                       <img src={post.imageUrl} className="w-full h-auto object-contain max-h-[80vh]" alt="Mídia" />
                    </div>
                 )}

                 {post.reel?.videoUrl && (
                    <div className="mt-4">
                       <VideoPlayer 
                          src={post.reel.videoUrl} 
                          className="rounded-3xl shadow-xl aspect-video"
                          isReel={post.type === PostType.REEL}
                          autoPlay={false}
                       />
                    </div>
                 )}

                 <div className="mt-6 flex items-center gap-2 text-gray-500 text-[14px]">
                    <span>{new Date(post.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="opacity-30">·</span>
                    <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                 </div>

                 <div className="flex items-center gap-6 py-5 border-y border-gray-100 dark:border-white/5 mt-4 text-gray-500 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 shrink-0">
                       <span className="font-black text-gray-900 dark:text-white">{post.likes?.length || 0}</span>
                       <span className="text-[13px] font-medium uppercase tracking-wider opacity-60">Curtidas</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                       <span className="font-black text-gray-900 dark:text-white">{comments.length}</span>
                       <span className="text-[13px] font-medium uppercase tracking-wider opacity-60">Respostas</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                       <span className="font-black text-gray-900 dark:text-white">{post.shares?.length || 0}</span>
                       <span className="text-[13px] font-medium uppercase tracking-wider opacity-60">Parts</span>
                    </div>
                 </div>

                 <div className="flex items-center justify-around py-2 text-gray-500">
                    <button onClick={handleLike} className={`p-3 rounded-full hover:bg-pink-600/10 hover:text-pink-600 transition-all active:scale-75 ${hasLiked ? 'text-pink-600 scale-110' : ''}`}>
                       {hasLiked ? <HeartIconSolid className="h-6 w-6" /> : <HeartIconOutline className="h-6 w-6" />}
                    </button>
                    <button onClick={() => inputRef.current?.focus()} className="p-3 rounded-full hover:bg-brand/10 hover:text-brand transition-all active:scale-75">
                       <ChatBubbleOvalLeftIcon className="h-6 w-6" />
                    </button>
                    <button onClick={handleSave} className={`p-3 rounded-full hover:bg-brand/10 hover:text-brand transition-all active:scale-75 ${hasSaved ? 'text-brand scale-110' : ''}`}>
                       {hasSaved ? <BookmarkIconSolid className="h-6 w-6" /> : <BookmarkIconOutline className="h-6 w-6" />}
                    </button>
                    <button onClick={handleShare} className="p-3 rounded-full hover:bg-brand/10 hover:text-brand transition-all active:scale-75">
                       <ShareIcon className="h-6 w-6" />
                    </button>
                    <button onClick={handleDownload} className="p-3 rounded-full hover:bg-brand/10 hover:text-brand transition-all active:scale-75">
                       <ArrowDownTrayIcon className="h-6 w-6" />
                    </button>
                 </div>
              </div>
           </div>

            {commentsDisabled ? (
               <div className="p-8 text-center bg-gray-100/50 dark:bg-white/5 rounded-[2.5rem] m-4 border-2 border-dashed border-gray-200 dark:border-white/10 shadow-inner">
                  <LockClosedIcon className="h-10 w-10 text-gray-400/50 mx-auto mb-3" />
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed px-4">Esta publicação não permite novas respostas.</p>
               </div>
            ) : (
              <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky bottom-0 z-50">
                 <div className="max-w-2xl mx-auto">
                    {replyingTo && (
                       <div className="flex items-center justify-between bg-brand/10 p-2 rounded-2xl mb-3 animate-fade-in border border-brand/20 backdrop-blur-md">
                          <p className="text-[11px] text-brand font-black uppercase tracking-[0.1em] px-2 flex items-center gap-2">
                             <ChatBubbleOvalLeftIcon className="h-3 w-3" />
                             Respondendo a @{replyingTo.userName}
                          </p>
                          <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-brand/20 rounded-full text-brand transition-all"><XMarkIcon className="h-4 w-4"/></button>
                       </div>
                    )}
                    <form onSubmit={handleSendComment} className="flex items-end gap-3">
                       <img src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 dark:border-white/10 hidden sm:block" />
                       <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-[28px] px-4 py-2 flex flex-col border-2 border-transparent focus-within:border-brand/40 transition-all shadow-sm outline-none ring-0">
                          <textarea 
                           ref={inputRef}
                           value={commentText}
                           onChange={e => setCommentText(e.target.value)}
                           placeholder={replyingTo ? "Sua resposta..." : "Adicione seu comentário..."}
                           className="w-full bg-transparent dark:text-white outline-none border-none focus:ring-0 rounded-2xl resize-none text-[15px] md:text-[17px] placeholder-gray-400 py-1 min-h-[40px] max-h-[150px] font-medium appearance-none shadow-none"
                           onInput={(e) => {
                             const target = e.target as HTMLTextAreaElement;
                             target.style.height = 'auto';
                             target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
                           }}
                          />
                       </div>
                       <button 
                         type="submit" 
                         disabled={!commentText.trim()}
                         className="bg-brand text-white p-3 rounded-full font-black text-sm disabled:opacity-30 transition-all active:scale-90 shadow-lg shadow-brand/30 shrink-0"
                       >
                         <PaperAirplaneIcon className="h-5 w-5 -rotate-45 -mt-0.5 ml-0.5" />
                       </button>
                    </form>
                 </div>
              </div>
           )}

           <div className="pb-32 px-2">
             {visibleComments.length > 0 ? (
               visibleComments.map((c) => (
                  <RenderComment key={c.id} c={c} />
               ))
             ) : (
                <div className="py-24 text-center flex flex-col items-center gap-5 animate-fade-in opacity-40">
                   <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <ChatBubbleOvalLeftIcon className="h-10 w-10 text-brand" />
                   </div>
                   <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Seja o primeiro a responder</p>
                </div>
             )}
             <div ref={commentsEndRef} />
           </div>
        </div>
      </div>
      {showShareModal && author && (
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          currentUser={currentUser}
          onNavigate={onNavigate}
          content={{
            title: `Post de ${author.firstName}`,
            text: post.content || '',
            url: `${window.location.origin}/?page=post-detail&postId=${post.id}`,
            mediaUrl: post.imageUrl || post.reel?.videoUrl,
            mediaType: post.imageUrl ? 'image' : (post.reel?.videoUrl ? 'video' : undefined)
          }}
        />
      )}
    </div>,
    document.body
  );
};

export default PostDetailModal;
