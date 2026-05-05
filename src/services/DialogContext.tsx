import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  const showAlert = (message: string, options?: DialogOptions) => {
    window.alert(`${options?.title ? options.title + ': ' : ''}${message}`);
  };
  const showError = (message: string) => console.error(message);
  const showSuccess = (message: string) => console.log(message);
  const showConfirm = async (message: string, options?: DialogOptions) => {
    return window.confirm(`${options?.title ? options.title + ': ' : ''}${message}`);
  };
  const showLoading = (message: string) => console.log('Loading:', message);
  const hideLoading = () => console.log('Loaded');

  return (
    <DialogContext.Provider value={{ showAlert, showError, showSuccess, showConfirm, showLoading, hideLoading }}>
      {children}
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
