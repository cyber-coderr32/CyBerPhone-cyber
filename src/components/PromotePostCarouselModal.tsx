
import React, { useState, useEffect } from 'react';
import { Post, User, GlobalSettings } from '../types';
import { promotePostInCarousel, getGlobalSettings } from '../services/storageService';
import { formatCurrency } from '../lib/utils';
import { RocketLaunchIcon, XMarkIcon, SparklesIcon, StarIcon } from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';

interface PromotePostCarouselModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const PromotePostCarouselModal: React.FC<PromotePostCarouselModalProps> = ({
  post,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const { showAlert } = useDialog();
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    getGlobalSettings().then(setSettings);
  }, []);

  const PRICE_PER_DAY = settings?.promotedCarouselMinBidPerDay || 2.0; // Padrão 2.0 se não definido
  const totalPrice = days * PRICE_PER_DAY;

  const handlePromote = async () => {
    const balance = currentUser.balance || 0;
    if (balance < totalPrice) {
      showAlert(`Saldo insuficiente. Você precisa de ${formatCurrency(totalPrice)} para promover no carrossel por ${days} dias.`, { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const success = await promotePostInCarousel(post.id, currentUser.id, days, totalPrice);
      if (success) {
        showAlert('Publicação promovida com sucesso! Seu post aparecerá no carrossel do topo do feed.', { type: 'success' });
        onSuccess();
        onClose();
      } else {
        showAlert('Erro ao processar pagamento. Tente novamente.', { type: 'error' });
      }
    } catch (error) {
      showAlert('Falha na conexão com o servidor.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-white dark:bg-[#1a1c23] w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
        
        <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                    <RocketLaunchIcon className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Destaque no Carrossel</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Apareça no topo de toda a rede</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
        </div>

        <div className="space-y-8">
            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Selecione o Período</p>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 3, 7].map(d => (
                        <button 
                            key={d}
                            onClick={() => setDays(d)}
                            className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${days === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-white/5 text-gray-400 border border-transparent hover:border-blue-500/20'}`}
                        >
                            {d} DIA{d > 1 ? 'S' : ''}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between px-2">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investimento Total</p>
                    <p className="text-3xl font-black dark:text-white tracking-tighter">{formatCurrency(totalPrice)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seu Saldo</p>
                    <p className={`text-xl font-black tracking-tighter ${currentUser.balance !== undefined && currentUser.balance >= totalPrice ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(currentUser.balance || 0)}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <button 
                    onClick={handlePromote}
                    disabled={loading || currentUser.balance === undefined || currentUser.balance < totalPrice}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    ) : (
                        <><StarIcon className="h-5 w-5 text-yellow-400" /> Ativar no Carrossel</>
                    )}
                </button>
                <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">
                    Sua foto/vídeo aparecerá no carrossel de destaque acima das histórias
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PromotePostCarouselModal;
