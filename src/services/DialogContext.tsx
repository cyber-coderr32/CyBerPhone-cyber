import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';

interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'alert' | 'success' | 'confirm' | 'error' | 'warning';
}

interface ToastItem {
  id: string;
  message: string;
  title: string;
  type: 'alert' | 'success' | 'error' | 'warning';
}

interface DialogContextType {
  showAlert: (message: string, options?: DialogOptions) => void;
  showError: (message: string, options?: DialogOptions) => void;
  showSuccess: (message: string, options?: DialogOptions) => void;
  showConfirm: (message: string, options?: DialogOptions) => Promise<boolean>;
  showLoading: (message: string) => void;
  hideLoading: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    message: string;
    isConfirm: boolean;
    options?: DialogOptions;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    message: '',
    isConfirm: false,
  });

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showAlert = (message: string, options?: DialogOptions) => {
    // If it's a confirmation, handle as modal. Otherwise, show as an elegant floating Toast!
    if (options?.type === 'confirm') {
      showConfirm(message, options);
      return;
    }

    const id = Math.random().toString(36).substring(2, 9);
    const type = options?.type || 'alert';
    const title = options?.title || (
      type === 'success' ? 'Sucesso' :
      type === 'error' ? 'Erro' :
      type === 'warning' ? 'Aviso' : 'Notificação'
    );

    setToasts(prev => [...prev, { id, message, title, type }]);

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const showError = (message: string) => {
    console.error(message);
    showAlert(message, { title: 'Erro', type: 'error' });
  };

  const showSuccess = (message: string) => {
    console.log(message);
    showAlert(message, { title: 'Sucesso', type: 'success' });
  };

  const showConfirm = (message: string, options?: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        message,
        isConfirm: true,
        options: {
          title: 'Confirmação',
          type: 'confirm',
          ...options
        },
        resolve,
      });
    });
  };

  const handleAction = (confirmed: boolean) => {
    if (dialogState.resolve) {
      dialogState.resolve(confirmed);
    }
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const showLoading = (message: string) => console.log('Loading:', message);
  const hideLoading = () => console.log('Loaded');

  // helper to get style colors for toast notifications
  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-[#0f1d18]/95 dark:bg-[#091511]/95 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />,
          progress: 'bg-emerald-500',
        };
      case 'error':
        return {
          bg: 'bg-[#220f12]/95 dark:bg-[#1a080a]/95 text-red-400 border-red-500/30',
          icon: <XCircleIcon className="w-5 h-5 text-red-500 shrink-0" />,
          progress: 'bg-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-[#241a0c]/95 dark:bg-[#1c1307]/95 text-amber-400 border-amber-500/30',
          icon: <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0" />,
          progress: 'bg-amber-500',
        };
      default:
        return {
          bg: 'bg-[#0f1422]/95 dark:bg-[#070b14]/95 text-indigo-400 border-indigo-500/30',
          icon: <InformationCircleIcon className="w-5 h-5 text-indigo-400 shrink-0" />,
          progress: 'bg-indigo-500',
        };
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showError, showSuccess, showConfirm, showLoading, hideLoading }}>
      {children}
      
      {/* Premium Stacking Toast Drawer fixed top/bottom */}
      <div 
        className="fixed top-4 right-4 left-4 sm:left-auto md:top-6 md:right-6 z-[99999] flex flex-col gap-3 max-w-sm w-auto pointer-events-none"
        id="cyberphone-toast-deck"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const styles = getToastStyles(toast.type);
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                className={`w-full pointer-events-auto rounded-[1.5rem] border backdrop-blur-xl p-4.5 shadow-2xl flex gap-3.5 relative overflow-hidden text-left ${styles.bg}`}
              >
                {/* Visual Accent Glow */}
                <div className="absolute top-0 left-0 bottom-0 w-1.5 opacity-85" style={{ background: 'currentColor' }} />
                
                {styles.icon}
                
                <div className="flex-1 min-w-0 pr-4 space-y-0.5">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-white">{toast.title}</h4>
                  <p className="text-xs font-semibold leading-relaxed opacity-90 break-words text-gray-200">{toast.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer self-start p-0.5 hover:bg-white/10 rounded-lg shrink-0"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>

                {/* Animated countdown progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div 
                    className={`h-full ${styles.progress} animate-toast-progress`}
                    style={{
                      animation: 'toastProgress 4.5s linear forwards'
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <ConfirmationModal
        isOpen={dialogState.isOpen}
        title={dialogState.options?.title || (dialogState.isConfirm ? 'Confirmação' : 'Aviso')}
        message={dialogState.message}
        confirmText={dialogState.options?.confirmText}
        cancelText={dialogState.options?.cancelText}
        type={dialogState.options?.type || (dialogState.isConfirm ? 'confirm' : 'alert')}
        isConfirm={dialogState.isConfirm}
        onConfirm={() => handleAction(true)}
        onClose={() => handleAction(false)}
      />

      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-progress {
          animation-fill-mode: forwards;
        }
      `}</style>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

