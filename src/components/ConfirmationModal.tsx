import React from 'react';
import { useTranslation } from 'react-i18next';

export enum ConfirmationType {
  DELETE = 'DELETE',
  LEAVE = 'LEAVE',
  BLOCK = 'BLOCK',
  UNFOLLOW = 'UNFOLLOW',
  LOGOUT = 'LOGOUT',
  DANGER = 'DANGER',
  WARNING = 'WARNING'
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = ConfirmationType.DANGER,
  loading = false,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const typeStr = String(type).toUpperCase();
  const isDanger = typeStr === 'DANGER' || typeStr === 'DELETE';
  const isWarning = typeStr === 'WARNING' || typeStr === 'LEAVE';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-[#1a1c23] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-black/5 dark:border-white/10 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-4">
          <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${isDanger ? 'bg-red-50 text-red-500' : isWarning ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
            <span className="text-3xl">
              {isDanger ? '⚠️' : isWarning ? '⚡' : 'ℹ️'}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2">{title}</h3>
            <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">{message}</p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={onConfirm}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isDanger ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 dark:shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                confirmText || t('confirm')
              )}
            </button>
            <button 
              onClick={onClose}
              disabled={loading}
              className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95"
            >
              {cancelText || t('cancel')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
export default ConfirmationModal;
