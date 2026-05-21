import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

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
  type?: ConfirmationType | 'alert' | 'success' | 'confirm' | 'error' | 'warning';
  loading?: boolean;
  isConfirm?: boolean;
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
  isConfirm = true,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const typeStr = String(type).toUpperCase();
  const isDanger = typeStr === 'DANGER' || typeStr === 'DELETE' || typeStr === 'ERROR';
  const isWarning = typeStr === 'WARNING' || typeStr === 'LEAVE' || typeStr === 'ALERT';
  const isSuccess = typeStr === 'SUCCESS';

  // Choose the visual indicator brand color and icon
  let iconElement = <InformationCircleIcon className="w-9 h-9 text-indigo-400" />;
  let colorClass = "from-indigo-500/15 via-blue-500/5 to-transparent text-indigo-400 border-indigo-500/30 shadow-indigo-500/10";
  let bgBrand = "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/25 dark:shadow-indigo-500/10";
  let glowColor = "bg-indigo-500/20";

  if (isDanger) {
    iconElement = <XCircleIcon className="w-9 h-9 text-red-500 animate-pulse" />;
    colorClass = "from-red-500/15 via-rose-500/5 to-transparent text-red-500 border-red-500/30 shadow-red-500/10";
    bgBrand = "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/25 dark:shadow-red-500/10";
    glowColor = "bg-red-500/20";
  } else if (isWarning) {
    iconElement = <ExclamationTriangleIcon className="w-9 h-9 text-amber-500" />;
    colorClass = "from-amber-500/15 via-yellow-500/5 to-transparent text-amber-500 border-amber-500/30 shadow-amber-500/10";
    bgBrand = "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/25 dark:shadow-amber-500/10";
    glowColor = "bg-amber-500/20";
  } else if (isSuccess) {
    iconElement = <CheckCircleIcon className="w-9 h-9 text-emerald-500" />;
    colorClass = "from-emerald-500/15 via-teal-500/5 to-transparent text-emerald-500 border-emerald-500/30 shadow-emerald-500/10";
    bgBrand = "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 dark:shadow-emerald-500/10";
    glowColor = "bg-emerald-500/20";
  } else if (typeStr === 'CONFIRM') {
    iconElement = <QuestionMarkCircleIcon className="w-9 h-9 text-brand" />;
    colorClass = "from-brand/15 via-indigo-500/5 to-transparent text-brand border-brand/35 shadow-brand/10";
    bgBrand = "bg-gradient-to-r from-brand to-indigo-600 hover:from-brand hover:to-indigo-500 shadow-brand/25 dark:shadow-brand/5";
    glowColor = "bg-brand/20";
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white/95 dark:bg-[#0c0f16]/95 w-full max-w-sm rounded-[2.5rem] p-7 md:p-8 shadow-3xl border border-gray-100 dark:border-white/5 relative overflow-hidden animate-scale-in text-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative Background Pulsing Glow */}
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-45 pointer-events-none ${glowColor}`} />

        <div className="space-y-6 relative z-10">
          {/* Dynamic Glow Icon Card */}
          <div className={`w-18 h-18 rounded-[1.8rem] mx-auto flex items-center justify-center bg-gradient-to-b border shadow-xl relative ${colorClass}`}>
            {iconElement}
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-snug">{title}</h3>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-relaxed tracking-wide px-2">{message}</p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button 
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl.5 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-white cursor-pointer ${bgBrand}`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                confirmText || (isConfirm ? t('confirm') : 'Ok')
              )}
            </button>
            
            {isConfirm && (
              <button 
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full py-3 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-xl.5 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/5 transition-all active:scale-95 cursor-pointer"
              >
                {cancelText || t('cancel')}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .animate-scale-in {
          animation: scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.93) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmationModal;

