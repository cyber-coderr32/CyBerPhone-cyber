import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { User, Page } from '../types';
import { 
  XMarkIcon, 
  LinkIcon, 
  CheckIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  content: {
    title: string;
    text: string;
    url: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  };
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigate,
  content
}) => {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(content.url)
          .then(() => {
            setCopied(true);
            showAlert(t('link_copied_alert', 'Link copiado para a área de transferência!'), { type: 'success' });
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => fallbackCopy(content.url));
      } else {
        fallbackCopy(content.url);
      }
    } catch (err) {
      fallbackCopy(content.url);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        showAlert(t('link_copied_alert', 'Link copiado para a área de transferência!'), { type: 'success' });
        setTimeout(() => setCopied(false), 2000);
      } else {
        showAlert(t('link_copy_failed', 'Não foi possível copiar o link automaticamente.'), { type: 'error' });
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
      showAlert(t('link_copy_failed', 'Não foi possível copiar o link automaticamente.'), { type: 'error' });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.url,
        });
      } catch (err) {
        console.error("Erro ao compartilhar nativamente:", safeJsonStringify(err));
        // Fallback to clipboard translation if share was canceled or failed
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#1a1c23] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-black/5 dark:border-white/10 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{t('share')}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
        </div>

        <div className="space-y-6">
            {/* Preview */}
            <div className="flex gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
                {content.mediaUrl && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-sm">
                        {content.mediaType === 'video' ? (
                            <video src={content.mediaUrl} className="w-full h-full object-cover" />
                        ) : (
                            <img src={content.mediaUrl} className="w-full h-full object-cover" />
                        )}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-black dark:text-white uppercase truncate">{content.title}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase truncate">{content.url}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button 
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                            <LinkIcon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest dark:text-white">{copied ? t('copied_label') : t('copy_link')}</span>
                    </div>
                    {copied && <CheckIcon className="h-5 w-5 text-green-500" />}
                </button>

                <button 
                    onClick={() => {
                        onNavigate('chat');
                        onClose();
                    }}
                    className="w-full flex items-center gap-4 p-5 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-all group"
                >
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest dark:text-white">{t('send_in_chat')}</span>
                </button>
            </div>

            <button 
                onClick={handleNativeShare}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
                Mais Opções
            </button>
        </div>
      </div>

      <style>{`
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { transform: translateY(0); opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ShareModal;
