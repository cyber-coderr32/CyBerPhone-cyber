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

  const showAlert = (message: string, options?: DialogOptions) => {
    setDialogState({
      isOpen: true,
      message,
      isConfirm: false,
      options: {
        title: 'Mensagem',
        type: 'alert',
        ...options
      }
    });
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

  return (
    <DialogContext.Provider value={{ showAlert, showError, showSuccess, showConfirm, showLoading, hideLoading }}>
      {children}
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
