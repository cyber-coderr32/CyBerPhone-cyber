import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'alert' | 'success' | 'confirm' | 'error' | 'warning';
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
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    options?: DialogOptions;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    message: '',
  });

  const showAlert = (message: string, options?: DialogOptions) => {
    // Falls back to window.alert for now but with better formatting
    const title = options?.title ? `[${options.title}] ` : '';
    console.log(`Alert: ${title}${message}`);
    window.alert(`${title}${message}`);
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
      setConfirmState({
        isOpen: true,
        message,
        options,
        resolve,
      });
    });
  };

  const handleConfirmAction = (confirmed: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(confirmed);
    }
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const showLoading = (message: string) => console.log('Loading:', message);
  const hideLoading = () => console.log('Loaded');

  return (
    <DialogContext.Provider value={{ showAlert, showError, showSuccess, showConfirm, showLoading, hideLoading }}>
      {children}
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.options?.title || 'Confirmação'}
        message={confirmState.message}
        confirmText={confirmState.options?.confirmText}
        cancelText={confirmState.options?.cancelText}
        onConfirm={() => handleConfirmAction(true)}
        onClose={() => handleConfirmAction(false)}
      />
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
