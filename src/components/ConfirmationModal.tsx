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
  let iconElement = <InformationCircleIcon className="w-10 h-10 text-cyan-500" />;
  let colorClass = "from-cyan-500/20 to-blue-500/5 text-cyan-500 border-cyan-500/20 shadow-cyan-500/10";
  let bgBrand = "bg-cyan-500 hover:bg-cyan-600";

  if (isDanger) {
    iconElement = <XCircleIcon className="w-10 h-10 text-red-500 animate-pulse" />;
    colorClass = "from-red-500/20 to-rose-500/5 text-red-500 border-red-500/20 shadow-red-500/10";
    bgBrand = "bg-red-600 hover:bg-red-700 shadow-red-500/20";
  } else if (isWarning) {
    iconElement = <ExclamationTriangleIcon className="w-10 h-10 text-amber-500" />;
    colorClass = "from-amber-500/20 to-yellow-500/5 text-amber-500 border-amber-500/20 shadow-amber-500/10";
    bgBrand = "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20";
  } else if (isSuccess) {
    iconElement = <CheckCircleIcon className="w-10 h-10 text-emerald-500" />;
    colorClass = "from-emerald-500/20 to-teal-500/5 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10";
    bgBrand = "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20";
  } else if (typeStr === 'CONFIRM') {
    iconElement = <QuestionMarkCircleIcon className="w-10 h-10 text-indigo-500" />;
    colorClass = "from-indigo-500/20 to-purple-500/5 text-indigo-500 border-indigo-500/20 shadow-indigo-500/10";
    bgBrand = "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20";
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#0f121a] dark:bg-[#070a0f] w-full max-w-sm rounded-[3rem] p-8 md:p-10 shadow-3xl border border-white/5 relative overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-40 blur-[1px]"></div>

        <div className="text-center space-y-6 relative z-10">
          {/* Dynamic Glow Icon Card */}
          <div className={`w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center bg-gradient-to-b border shadow-xl relative ${colorClass}`}>
            {iconElement}
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{title}</h3>
            <p className="text-sm font-bold text-gray-400 leading-relaxed uppercase tracking-wider">{message}</p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={onConfirm}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-white ${bgBrand}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                confirmText || (isConfirm ? t('confirm') : 'Ok')
              )}
            </button>
            
            {isConfirm && (
              <button 
                onClick={onClose}
                disabled={loading}
                className="w-full py-4 bg-white/5 text-gray-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all active:scale-95"
              >
                {cancelText || t('cancel')}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmationModal;
