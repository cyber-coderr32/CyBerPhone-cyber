import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Post, User } from '../types';
import { updatePost } from '../services/storageService';
import { 
  XMarkIcon, 
  PencilIcon, 
  CheckIcon,
  PhotoIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';

interface EditPostModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onSuccess?: () => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showAlert, showSuccess } = useDialog();
  const [content, setContent] = useState(post.content || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!content.trim()) {
      showAlert(t('empty_post_error') || 'A publicação não pode estar vazia.', { type: 'alert' });
      return;
    }

    setLoading(true);
    try {
      await updatePost({ ...post, content });
      showSuccess(t('post_updated') || 'Publicação atualizada!', { title: t('success_label') || 'Sucesso' });
      onSuccess?.();
      onClose();
    } catch (error) {
       showAlert(t('publish_error'), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white dark:bg-[#1a1c23] w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
                    <PencilIcon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{t('edit_post')}</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t('update_content') || "Atualize seu conteúdo"}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
        </div>

        <div className="space-y-6">
            <div className="relative">
                <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-blue-500/50 transition-all resize-none h-48"
                    placeholder={t('post_textarea_placeholder')}
                />
            </div>

            {(post.imageUrl || post.reel?.videoUrl) && (
                <div className="relative rounded-2xl overflow-hidden aspect-video border dark:border-white/10">
                    {post.reel?.videoUrl ? (
                        <video src={post.reel.videoUrl} className="w-full h-full object-cover" />
                    ) : (
                        <img src={post.imageUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <PhotoIcon className="h-8 w-8 text-white/50" />
                    </div>
                </div>
            )}

            <div className="flex gap-4">
                <button 
                    onClick={onClose}
                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                >
                    {t('nav_settings_notifications_cancel') || "Cancelar"}
                </button>
                <button 
                    onClick={handleUpdate}
                    disabled={loading || content === post.content}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    ) : (
                        <><CheckIcon className="h-4 w-4" /> {t('save_content')}</>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
