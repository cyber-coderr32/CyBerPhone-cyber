import React, { useState } from 'react';
import { Post, User } from '../types';
import { boostPost } from '../services/storageService';
import { formatCurrency } from '../lib/utils';
import { BoltIcon, XMarkIcon, CheckBadgeIcon, SparklesIcon, UserIcon, MapPinIcon, GlobeAltIcon, PlusIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import { COUNTRIES } from '../data/countries';

interface BoostPostModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const BoostPostModal: React.FC<BoostPostModalProps> = ({
  post,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const { showAlert } = useDialog();
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Targeting state
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(65);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [cityInput, setCityInput] = useState('');

  // Exemplo de precificação: 1000 KZ por dia
  const PRICE_PER_DAY = 1000.0;
  const totalPrice = days * PRICE_PER_DAY;

  const addLocation = () => {
    const region = cityInput.trim() ? ` - ${cityInput.trim()}` : '';
    const newLoc = `${selectedCountry.flag} ${selectedCountry.name}${region}`;
    
    if (!locations.includes(newLoc)) {
      setLocations([...locations, newLoc]);
      setCityInput('');
    }
  };

  const handleBoost = async () => {
    const balance = currentUser.balance || 0;
    if (balance < totalPrice) {
      showAlert(`Saldo insuficiente. Você precisa de ${formatCurrency(totalPrice)} para patrocinar por ${days} dias.`, { type: 'error' });
      return;
    }

    if (locations.length === 0) {
      showAlert("Por favor, adicione pelo menos uma localização alvo.", { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const success = await boostPost(
        post.id, 
        currentUser.id, 
        days, 
        totalPrice, 
        minAge, 
        maxAge, 
        locations
      );
      if (success) {
        showAlert('Publicação impulsionada com sucesso! Seu post aparecerá no feed para o público selecionado.', { type: 'success' });
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="bg-white dark:bg-[#1a1c23] w-full max-w-lg rounded-[3rem] p-6 md:p-10 shadow-2xl relative border border-white/10 my-8 mr-auto ml-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-red-500 to-purple-600"></div>
        
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
                    <BoltIcon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Patrocinar Post</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-tight">Escolha seu público-alvo</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
            {/* DURATION */}
            <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Período de Exibição</p>
                <div className="grid grid-cols-3 gap-3">
                    {[1, 3, 7].map(d => (
                        <button 
                            key={d}
                            onClick={() => setDays(d)}
                            className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${days === d ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white dark:bg-white/5 text-gray-400 border border-transparent hover:border-orange-500/20'}`}
                        >
                            {d} DIA{d > 1 ? 'S' : ''}
                        </button>
                    ))}
                </div>
            </div>

            {/* AGE TARGETING */}
            <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-4">
                <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-orange-500" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faixa Etária</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-[9px] font-black text-gray-400 uppercase">Min</label>
                            <span className="text-[10px] font-black text-orange-600">{minAge}</span>
                        </div>
                        <input type="range" min={13} max={maxAge} value={minAge} onChange={e => setMinAge(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full accent-orange-500 cursor-pointer" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-[9px] font-black text-gray-400 uppercase">Max</label>
                            <span className="text-[10px] font-black text-orange-600">{maxAge}</span>
                        </div>
                        <input type="range" min={minAge} max={100} value={maxAge} onChange={e => setMaxAge(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full accent-orange-500 cursor-pointer" />
                    </div>
                </div>
            </div>

            {/* LOCATION TARGETING */}
            <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-4">
                <div className="flex items-center gap-2">
                    <GlobeAltIcon className="h-4 w-4 text-orange-500" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Localização</p>
                </div>
                
                <div className="flex gap-2">
                    <select 
                        className="flex-1 p-3 bg-white dark:bg-white/5 rounded-xl dark:text-white outline-none text-xs font-bold appearance-none cursor-pointer border dark:border-white/10"
                        value={selectedCountry.code}
                        onChange={e => setSelectedCountry(COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES[0])}
                    >
                        {COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                    </select>
                    <input 
                        type="text" 
                        value={cityInput} 
                        onChange={e => setCityInput(e.target.value)} 
                        placeholder="Cidade (opcional)" 
                        className="flex-[1.5] p-3 bg-white dark:bg-white/5 rounded-xl dark:text-white outline-none text-xs font-bold border dark:border-white/10"
                        onKeyPress={e => e.key === 'Enter' && addLocation()}
                    />
                    <button onClick={addLocation} className="p-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-md">
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {locations.map(loc => (
                        <div key={loc} className="flex items-center gap-2 bg-orange-50 dark:bg-orange-600/20 text-orange-600 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-orange-900/30 text-[9px] font-black uppercase">
                            <MapPinIcon className="h-3 w-3" />
                            <span>{loc}</span>
                            <button onClick={() => setLocations(locations.filter(l => l !== loc))} className="hover:text-red-500"><XMarkIcon className="h-3 w-3" /></button>
                        </div>
                    ))}
                    {locations.length === 0 && (
                        <p className="text-[9px] text-gray-400 font-bold italic uppercase px-1">Selecione pelo menos um local</p>
                    )}
                </div>
            </div>

            {/* BALANCE & TOTAL */}
            <div className="flex items-center justify-between px-2 pt-2">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investimento</p>
                    <p className="text-2xl font-black dark:text-white tracking-tighter">{formatCurrency(totalPrice)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seu Saldo</p>
                    <p className={`text-xl font-black tracking-tighter ${currentUser.balance !== undefined && currentUser.balance >= totalPrice ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(currentUser.balance || 0)}
                    </p>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <button 
                    onClick={handleBoost}
                    disabled={loading || currentUser.balance === undefined || currentUser.balance < totalPrice || locations.length === 0}
                    className="w-full py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    ) : (
                        <><SparklesIcon className="h-5 w-5" /> Ativar Patrocínio</>
                    )}
                </button>
                <p className="text-[8px] text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse leading-normal">
                    Seu post será exibido para o público selecionado com prioridade de leilão
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BoostPostModal;
