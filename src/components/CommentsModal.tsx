
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Comment, User, NotificationType } from '../types';
import { addPostComment, getPosts, generateUUID, toggleReaction, addCommentReply, createNotification } from '../services/storageService';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleOvalLeftIcon, FaceSmileIcon, TrashIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { checkContent } from '../services/sentinelService';
import { useDialog } from '../services/DialogContext';

interface CommentsModalProps {
  postId: string;
  currentUser: User;
  onClose: () => void;
  onCommentsUpdated: () => void;
  postOwnerId?: string;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ postId, currentUser, onClose, onCommentsUpdated, postOwnerId }) => {
  const { t } = useTranslation();
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
    if (commentsEndRef.current && !loading) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    const { showAlert } = useDialog();

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
        profilePic: isAnonymous ? DEFAULT_PROFILE_PIC : currentUser.profilePicture,
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
    } catch (err) {
      console.error("Erro ao comentar:", err);
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
      console.error("Erro ao reagir:", err);
    }
  };

  const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😂', '😮', '😢', '👍', '🙏'];

  const RenderComment = ({ c, depth = 0 }: { c: Comment, depth?: number }) => {
    const displayName = c.isAnonymous ? t('anonymous_user') : c.userName;
    const displayPic = c.isAnonymous ? DEFAULT_PROFILE_PIC : (c.profilePic || DEFAULT_PROFILE_PIC);

    return (
      <div 
        className={`flex gap-3 group animate-fade-in ${depth > 0 ? 'ml-8 boarder-l dark:border-white/10 pl-2' : ''}`}
      >
        <img src={displayPic} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-white/10" alt={displayName} />
        <div className="flex-1">
          <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-white/5 relative">
            <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">{displayName}</p>
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
          <div className="flex items-center gap-3 ml-2 mt-1">
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

            {/* Reaction Picker */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {REACTION_EMOJIS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => handleReaction(c.id, emoji)}
                  className="hover:scale-125 transition-transform p-0.5 text-[12px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Recursive Replies */}
          {c.replies && c.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {c.replies.map(reply => (
                <RenderComment key={reply.id} c={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-darkcard w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden relative">
        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-darkcard sticky top-0 z-10">
          <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg flex items-center gap-2">
            <ChatBubbleOvalLeftIcon className="h-5 w-5 text-blue-600" /> {t('comments_label') || 'Comentários'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50 dark:bg-black/20">
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
                 <RenderComment key={comment.id} c={comment} />
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
              className="flex-1 bg-transparent outline-none border-none ring-0 focus:ring-0 text-xs font-bold dark:text-white p-2 rounded-full"
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
    </div>
  );
};

export default CommentsModal;
