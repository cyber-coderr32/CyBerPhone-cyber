
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Comment, User, NotificationType } from '../types';
import { addPostComment, getPosts, generateUUID, toggleReaction, addCommentReply, createNotification, deleteComment } from '../services/storageService';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleOvalLeftIcon, FaceSmileIcon, TrashIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { DEFAULT_PROFILE_PIC, ANONYMOUS_PROFILE_PIC } from '../data/constants';
import { checkContent } from '../services/sentinelService';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';

interface CommentItemProps {
  c: Comment;
  depth?: number;
  currentUser: User;
  postOwnerId?: string;
  t: any;
  handleReaction: (commentId: string, emoji: string) => void;
  handleDeleteComment: (commentId: string) => void;
  setReplyingTo: (reply: { id: string, userName: string } | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  reactionEmojis: string[];
}

const CommentItem: React.FC<CommentItemProps> = ({
  c,
  depth = 0,
  currentUser,
  postOwnerId,
  t,
  handleReaction,
  handleDeleteComment,
  setReplyingTo,
  inputRef,
  reactionEmojis
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const displayName = c.isAnonymous ? t('anonymous_user') : c.userName;
  const displayPic = c.isAnonymous ? ANONYMOUS_PROFILE_PIC : (c.profilePic || DEFAULT_PROFILE_PIC);
  const canDelete = currentUser?.id === c.userId || 
                    currentUser?.id === postOwnerId || 
                    currentUser?.isAdmin || 
                    currentUser?.email?.toLowerCase().trim() === 'alfaajmc@gmail.com' || 
                    currentUser?.email?.toLowerCase().trim() === 'ac926815124@gmail.com';

  const getSCTheme = (amount: number) => {
    if (amount < 500) return 'border-l-4 border-l-blue-500 bg-blue-500/5 dark:bg-blue-505/10 dark:border-l-blue-400';
    if (amount < 1500) return 'border-l-4 border-l-teal-500 bg-teal-500/5 dark:bg-teal-505/10 dark:border-l-teal-400';
    if (amount < 3000) return 'border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-505/10 dark:border-l-amber-400';
    if (amount < 6000) return 'border-l-4 border-l-purple-500 bg-purple-500/5 dark:bg-purple-550/10 dark:border-l-purple-400';
    return 'border-l-4 border-l-red-500 bg-red-500/5 dark:bg-red-505/10 dark:border-l-red-400';
  };

  return (
    <div 
      className={`flex gap-3 group ${depth > 0 ? 'ml-8 border-l dark:border-white/10 pl-2' : ''}`}
    >
      <img src={displayPic} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-white/10" alt={displayName} />
      <div className="flex-1">
        <div className={`p-3 rounded-2xl rounded-tl-none shadow-sm relative border ${
          c.isSuperChat 
            ? `${getSCTheme(c.superChatAmount || 0)} border-transparent` 
            : 'bg-white dark:bg-zinc-800 border-gray-100 dark:border-white/5'
        }`}>
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{displayName}</p>
            {c.isSuperChat && (
              <span className="text-[7.5px] font-black uppercase text-amber-500 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                ⚡ Super Chat • {(c.superChatAmount || 0).toLocaleString('pt-AO')} KZ
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{c.text}</p>
          
          {/* Reactions Display */}
          {c.reactions && Object.keys(c.reactions).some(emoji => c.reactions![emoji].length > 0) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(c.reactions).map(([emoji, users]) => (
                users.length > 0 && (
                  <button 
                    key={emoji}
                    onClick={() => handleReaction(c.id, emoji)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] border transition-all ${users.includes(currentUser.id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700' : 'bg-gray-50 border-gray-100 dark:bg-white/5 dark:border-white/10'}`}
                  >
                    <span>{emoji}</span>
                    <span className="font-bold dark:text-white">{users.length}</span>
                  </button>
                )
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 mt-1 ml-2">
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-[9px] text-gray-400 font-bold">{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            
            <button 
              onClick={() => {
                setReplyingTo({ id: c.id, userName: c.userName });
                inputRef.current?.focus();
              }}
              className="text-[9px] text-gray-400 font-bold hover:text-blue-500 transition-colors uppercase"
            >
              Responder
            </button>

            <button 
              onClick={() => setShowPicker(!showPicker)}
              className={`text-[9px] font-bold uppercase flex items-center gap-1 transition-colors ${showPicker ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
            >
              <FaceSmileIcon className="h-3 w-3 inline" />
              <span>{t('react', 'Reagir')}</span>
            </button>

            {canDelete && (
              <button 
                onClick={() => handleDeleteComment(c.id)}
                className="text-[9px] text-red-500 font-bold hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-1 py-0.5 rounded transition-all uppercase flex items-center gap-0.5"
                title="Eliminar"
              >
                <TrashIcon className="h-2.5 w-2.5" />
                <span>{t('delete', 'Eliminar')}</span>
              </button>
            )}
          </div>

          {/* Inline Reaction Picker Shelf */}
          {showPicker && (
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-700 p-1 rounded-full border border-gray-200 dark:border-zinc-600 shadow-sm w-fit animate-scale-in">
              {reactionEmojis.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => {
                    handleReaction(c.id, emoji);
                    setShowPicker(false);
                  }}
                  className="hover:scale-130 active:scale-95 transition-transform p-1 text-[14px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recursive Replies */}
        {c.replies && c.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {c.replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                c={reply} 
                depth={depth + 1}
                currentUser={currentUser}
                postOwnerId={postOwnerId}
                t={t}
                handleReaction={handleReaction}
                handleDeleteComment={handleDeleteComment}
                setReplyingTo={setReplyingTo}
                inputRef={inputRef}
                reactionEmojis={reactionEmojis}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CommentsModalProps {
  postId: string;
  currentUser: User;
  onClose: () => void;
  onCommentsUpdated: () => void;
  postOwnerId?: string;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ postId, currentUser, onClose, onCommentsUpdated, postOwnerId }) => {
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string, userName: string } | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchComments = async () => {
    const allPosts = await getPosts();
    const post = allPosts.find(p => p.id === postId);
    if (post) {
      setComments(post.comments || []);
      // If comments are disabled for everyone, ensure we respect that
      if (post.disableComments) {
        setSubmitting(true); // Effectively disable submit
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  useEffect(() => {
    // Lock body-scroll when the comments modal is active to prevent background layout shift
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    if (commentsEndRef.current && !loading) {
      commentsEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    const isRestrictedUser = (user: any) => {
      if (!user) return false;
      const emailLower = (user.email || '').toLowerCase().trim();
      const isAdminEmail = emailLower === 'alfaajmc@gmail.com' || emailLower === 'ac926815124@gmail.com';
      if (user.isAdmin || isAdminEmail) return false;
      
      const verificationStatus = user.idVerificationStatus || 'NOT_STARTED';
      const isExpired = user.idVerificationDocs?.expiresAt && user.idVerificationDocs.expiresAt < Date.now();
      const hasApprovedVerification = user.isVerified === true || String(user.isVerified) === 'true' || (verificationStatus === 'APPROVED' && !isExpired);
      return !hasApprovedVerification;
    };

    if (isRestrictedUser(currentUser)) {
      showAlert("Comentário Bloqueado", { type: 'error', title: 'Sua conta está em MODO RESTRITO' });
      return;
    }

    setSubmitting(true);
    try {
      // Sentinel AI Check
      const sentinelResult = await checkContent(newComment.trim(), 'comment');
      if (!sentinelResult.isSafe) {
        showAlert(sentinelResult.reason || 'Comentário bloqueado por violar as políticas de segurança.', { type: 'error', title: 'Sentinela de Segurança' });
        setSubmitting(false);
        return;
      }

      const comment: Comment = {
        id: generateUUID(),
        userId: currentUser.id,
        userName: isAnonymous ? t('anonymous_user') : `${currentUser.firstName} ${currentUser.lastName}`,
        profilePic: isAnonymous ? ANONYMOUS_PROFILE_PIC : currentUser.profilePicture,
        text: newComment,
        timestamp: Date.now(),
        isAnonymous: isAnonymous
      };

      if (replyingTo) {
        await addCommentReply(postId, replyingTo.id, comment);
        const targetComment = comments.find(c => c.id === replyingTo.id);
        if (targetComment && targetComment.userId !== currentUser.id) {
           await createNotification(targetComment.userId, currentUser.id, NotificationType.COMMENT, postId);
        }
        setReplyingTo(null);
      } else {
        await addPostComment(postId, comment);
      }
      setNewComment('');
      await fetchComments();
      onCommentsUpdated();
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error("Erro ao comentar:", safeJsonStringify(err));
      showAlert("Ocorreu um erro ao enviar seu comentário.", { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      await toggleReaction(commentId, 'COMMENT', emoji, currentUser.id, postId);
      await fetchComments();
    } catch (err) {
      console.error("Erro ao reagir:", safeJsonStringify(err));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (await showConfirm(t('delete_comment_confirm', 'Deseja realmente eliminar este comentário?'))) {
      try {
        await deleteComment(postId, commentId);
        await fetchComments();
        onCommentsUpdated();
      } catch (err) {
        console.error("Erro ao deletar comentário:", safeJsonStringify(err));
        showAlert("Não foi possível eliminar o comentário.", { type: 'error' });
      }
    }
  };

  const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😂', '😮', '😢', '👍', '🙏'];

  return createPortal(
    <div 
      className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-darkcard w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-darkcard sticky top-0 z-10">
          <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg flex items-center gap-2">
            <ChatBubbleOvalLeftIcon className="h-5 w-5 text-blue-600" /> {t('comments_label') || 'Comentários'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50 dark:bg-black/20"
        >
          {loading ? (
             <div className="flex justify-center py-10">
               <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : comments.length === 0 ? (
             <div className="text-center py-10 opacity-50">
               <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Nenhum comentário ainda</p>
             </div>
          ) : (
             <div className="space-y-6">
               {comments.map((comment) => (
                 <CommentItem 
                   key={comment.id} 
                   c={comment} 
                   currentUser={currentUser}
                   postOwnerId={postOwnerId}
                   t={t}
                   handleReaction={handleReaction}
                   handleDeleteComment={handleDeleteComment}
                   setReplyingTo={setReplyingTo}
                   inputRef={inputRef}
                   reactionEmojis={REACTION_EMOJIS}
                 />
               ))}
             </div>
          )}
          <div ref={commentsEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-darkcard border-t border-gray-100 dark:border-white/5 sticky bottom-0 z-10">
          <div className="flex items-center justify-between mb-3 px-1">
             <button 
                type="button" 
                onClick={() => setIsAnonymous(!isAnonymous)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[9px] uppercase font-black ${isAnonymous ? 'bg-gray-800 text-white border-transparent' : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10'}`}
             >
                <div className={`w-2 h-2 rounded-full ${isAnonymous ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-gray-600'}`}></div>
                {t('comment_anonymous')}
             </button>
          </div>
          {replyingTo && (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl mb-2 border border-blue-100 dark:border-blue-800/20">
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-tight">{t('replying_to')} <span className="font-black">@{replyingTo.userName}</span></p>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-full text-blue-600"><XMarkIcon className="h-4 w-4"/></button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-full border-2 border-transparent focus-within:border-blue-500 transition-all overflow-hidden relative">
            <img src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} className="w-8 h-8 rounded-full object-cover shrink-0" alt="Me" />
            <input 
              ref={inputRef}
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Sua resposta..." : "Adicione um comentário..."}
              disabled={submitting}
              className="flex-1 bg-transparent outline-none border-none ring-0 focus:ring-0 text-xs font-bold text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-2 rounded-full"
            />
            <button 
              type="submit" 
              disabled={!newComment.trim() || submitting}
              className="p-2 bg-blue-600 text-white rounded-lg shadow-md disabled:opacity-50 disabled:shadow-none hover:bg-blue-700 transition-all active:scale-95"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <PaperAirplaneIcon className="h-4 w-4" />
              )}
            </button>
            {submitting && !newComment.trim() && (
               <div className="absolute inset-0 bg-gray-100/50 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center cursor-not-allowed">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Comentários Desativados</span>
               </div>
            )}
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommentsModal;
