import React, { useState, useEffect } from 'react';
import { User, TransactionType } from '../types';
import { handleWalletTransaction } from '../services/storageService';
import { 
  XMarkIcon, 
  WalletIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  CheckCircleIcon,
  BanknotesIcon,
  ExclamationCircleIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../lib/utils';

interface WalletModalProps {
  isOpen: boolean;
  mode: 'deposit' | 'withdraw';
  onClose: () => void;
  currentUser: User;
  refreshUser: () => Promise<void>;
}

const WalletModal: React.FC<WalletModalProps> = ({ 
  isOpen, 
  mode, 
  onClose, 
  currentUser, 
  refreshUser 
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(mode);
  const [amount, setAmount] = useState<string>('');
  const [iban, setIban] = useState<string>('');
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('express');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(mode);
      setStep('form');
      setAmount('');
      setError(null);
    }
  }, [isOpen, mode]);

  const handleAction = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t('invalid_amount_error'));
      return;
    }

    if (activeTab === 'withdraw' && (currentUser.balance || 0) < numAmount) {
      setError(t('insufficient_balance_withdraw'));
      return;
    }

    if (activeTab === 'deposit' && step === 'form') {
      setStep('payment');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const success = await handleWalletTransaction(currentUser.id, numAmount, activeTab);
      if (success) {
        await refreshUser();
        setStep('success');
      } else {
        setError(t('transaction_error'));
      }
    } catch (err: any) {
      setError(err.message || t('checkout_error'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-white dark:bg-[#0a0c10] rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10"
        >
          {/* Header */}
          <div className="p-6 pb-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand/10 rounded-2xl">
                <WalletIcon className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">{t('my_wallet')}</h2>
                <p className="text-[10px] font-black uppercase text-gray-400">{t('current_balance')}: <span className="text-brand">{formatCurrency(currentUser.balance || 0)}</span></p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all"
            >
              <XMarkIcon className="w-6 h-6 dark:text-white" />
            </button>
          </div>

          {/* Tabs */}
          {step === 'form' && (
            <div className="px-6 mt-6">
              <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'deposit' ? 'bg-white dark:bg-white/10 shadow-sm text-brand' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                >
                  <ArrowUpCircleIcon className="w-4 h-4" />
                  {t('deposit')}
                </button>
                <button 
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'withdraw' ? 'bg-white dark:bg-white/10 shadow-sm text-brand' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                >
                  <ArrowDownCircleIcon className="w-4 h-4" />
                  {t('withdraw')}
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            {step === 'form' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">{t('op_value')}</label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 group-focus-within:text-brand transition-colors">KZ</span>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-brand/30 focus:bg-white dark:focus:bg-white/10 rounded-3xl py-4 pl-16 pr-6 text-2xl font-black text-gray-900 dark:text-white outline-none transition-all"
                    />
                  </div>
                </div>

                {activeTab === 'withdraw' && (
                  <div className="animate-fade-in space-y-2">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">{t('pix_key')}</label>
                    <input 
                      type="text"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder={t('pix_placeholder')}
                      className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-brand/30 focus:bg-white dark:focus:bg-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all"
                    />
                    <p className="text-[9px] text-gray-400 font-bold px-2 italic uppercase">{t('check_key_warning')}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase text-gray-400 ml-1">{t('payment_method')}</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => setSelectedMethod('express')}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${selectedMethod === 'express' ? 'border-brand bg-brand/5 shadow-brand/10' : 'border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                    >
                      <CheckCircleIcon className={`w-4 h-4 ${selectedMethod === 'express' ? 'text-brand' : 'text-gray-400'}`} />
                      <span className={`text-[10px] font-black uppercase ${selectedMethod === 'express' ? 'text-brand' : 'text-gray-500'}`}>MCX Express</span>
                    </button>
                    <button 
                      onClick={() => setSelectedMethod('unitel')}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${selectedMethod === 'unitel' ? 'border-brand bg-brand/5 shadow-brand/10' : 'border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                    >
                      <SignalIcon className={`w-4 h-4 ${selectedMethod === 'unitel' ? 'text-brand' : 'text-gray-400'}`} />
                      <span className={`text-[10px] font-black uppercase ${selectedMethod === 'unitel' ? 'text-brand' : 'text-gray-500'}`}>Unitel Money</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl">
                    <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-bold uppercase">{error}</p>
                  </div>
                )}

                <button 
                  onClick={handleAction}
                  disabled={!amount || parseFloat(amount) <= 0 || (activeTab === 'withdraw' && !iban)}
                  className="w-full bg-brand text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                >
                  {activeTab === 'deposit' ? t('continue_to_payment') : t('request_withdrawal')}
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="text-center space-y-6 py-4">
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] text-left space-y-4 border border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-white/10">
                    <div className="p-2 bg-brand/10 rounded-xl">
                      {selectedMethod === 'unitel' ? <SignalIcon className="w-5 h-5 text-brand" /> : <CheckCircleIcon className="w-5 h-5 text-brand" />}
                    </div>
                    <p className="text-[10px] font-black uppercase text-gray-400">{t('scan_qr')}</p>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Banco</p>
                      <p className="text-xs font-bold dark:text-white">BANCO BAI / BFA / BIC</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Conta / Titular</p>
                      <p className="text-xs font-bold dark:text-white uppercase">CyBerPhone Network Angola, Lda</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 mb-1">IBAN Angolano (CyBerPhone)</p>
                      <div className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-xl border border-dashed border-brand/30">
                        <code className="text-[10px] font-black text-brand tracking-wider">AO06 0000 0000 0000 0000 01</code>
                        <button className="text-[9px] font-black uppercase text-gray-400 hover:text-brand transition-colors" onClick={() => navigator.clipboard.writeText('AO06 0000 0000 0000 0000 01')}>Copiar</button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-2xl font-black dark:text-white">{formatCurrency(parseFloat(amount))}</p>
                  <p className="text-[9px] text-gray-400 px-8 uppercase font-bold tracking-tight">{t('balance_release_desc')}</p>
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={handleAction}
                    disabled={isProcessing}
                    className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-brand/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : t('confirm_simulated_payment')}
                  </button>
                  <button 
                    onClick={() => setStep('form')}
                    className="w-full py-4 text-gray-400 font-bold uppercase text-[10px] hover:text-gray-600 transition-all"
                  >
                    {t('back_change_value')}
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-10 space-y-6">
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 bg-green-500/20 rounded-full"
                  />
                  <CheckCircleIcon className="w-16 h-16 text-green-500 z-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight dark:text-white">{t('success_title')}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    {t('op_processed_success', { type: activeTab === 'deposit' ? t('deposit').toLowerCase() : t('withdraw').toLowerCase() })}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl inline-block mx-auto min-w-[200px]">
                   <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{t('new_balance')}</p>
                   <p className="text-2xl font-black text-brand">{formatCurrency(currentUser.balance || 0)}</p>
                </div>

                <button 
                  onClick={onClose}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-[10px] transition-all hover:scale-[1.02] active:scale-95"
                >
                  {t('close_wallet')}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WalletModal;
