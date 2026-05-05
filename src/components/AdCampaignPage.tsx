
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AdCampaign, User, Page, GlobalSettings } from '../types';
import { createAd, getAds, processAdInvestment, generateUUID, getGlobalSettings } from '../services/storageService';
import { generateAdCopy } from '../services/geminiService';
import { useDialog } from '../services/DialogContext';
import { checkContent } from '../services/sentinelService';
import { MIN_DAILY_AD_BUDGET_USD, DEFAULT_PROFILE_PIC } from '../data/constants';
import { COUNTRIES } from '../data/countries';
import { 
  RocketLaunchIcon, 
  MegaphoneIcon, 
  CursorArrowRaysIcon, 
  PhotoIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  SparklesIcon, 
  CheckCircleIcon, 
  MapPinIcon, 
  GlobeAltIcon, 
  XMarkIcon, 
  PlusIcon, 
  InformationCircleIcon, 
  UserGroupIcon, 
  ExclamationTriangleIcon, 
  ShieldCheckIcon, 
  PresentationChartLineIcon, 
  ArrowTrendingUpIcon, 
  CheckBadgeIcon, 
  TrophyIcon,
  UserIcon,
  BanknotesIcon,
  StarIcon,
  FlagIcon
} from '@heroicons/react/24/solid';

interface AdCampaignPageProps {
  currentUser: User;
  refreshUser: () => void;
  onNavigate?: (page: Page) => void;
}

type Step = 'objective' | 'creative' | 'targeting' | 'budget';

export const AdCampaignPage: React.FC<AdCampaignPageProps> = ({ currentUser, refreshUser, onNavigate }) => {
  const { showAlert } = useDialog();
  const [currentStep, setCurrentStep] = useState<Step>('objective');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Form States
  const [objective, setObjective] = useState<'traffic' | 'awareness' | 'engagement'>('traffic');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [ctaText, setCtaText] = useState('Saiba Mais');
  const [targetAudience, setTargetAudience] = useState('');
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(65);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [dailyReachGoal, setDailyReachGoal] = useState<number>(5000);
  const [billingCycle, setBillingCycle] = useState<'DAILY' | 'WEEKLY'>('WEEKLY');
  const [isAutoRenew, setIsAutoRenew] = useState(true);
  
  // Advanced Location State
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(c => c.code === 'BR') || COUNTRIES[0]);
  const [cityInput, setCityInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    getGlobalSettings().then(setSettings);
  }, []);

  const costPer1kReach = settings?.adReachCost || 0.50;
  const minDailyBudget = settings?.adMinBudget || 0.20;

  const calculatedTotalBudget = useMemo(() => {
    // Se o ciclo for semanal e duration for 1 dia, forçamos o mínimo do ciclo?
    // Não, vamos usar o durationDays como o "investimento inicial"
    const costPerDay = (dailyReachGoal / 1000) * costPer1kReach;
    return Math.max(costPerDay * durationDays, durationDays * minDailyBudget);
  }, [dailyReachGoal, durationDays, costPer1kReach, minDailyBudget]);

  const renewalAmount = useMemo(() => {
    const costPerDay = (dailyReachGoal / 1000) * costPer1kReach;
    const days = billingCycle === 'WEEKLY' ? 7 : 1;
    return Math.max(costPerDay * days, days * minDailyBudget);
  }, [dailyReachGoal, billingCycle, costPer1kReach, minDailyBudget]);

  const hasBalance = (currentUser.balance || 0) >= calculatedTotalBudget;
  const followerCount = currentUser.followers?.length || 0;

  const handleAiGenerate = async () => {
    if (!targetAudience) {
      showAlert("Descreva brevemente o público ou curso para a IA te ajudar.", { type: 'error' });
      return;
    }
    setAiLoading(true);
    try {
      const copy = await generateAdCopy(`Anúncio para público interessado em: ${targetAudience}`);
      if (!copy) return;
      const parts = copy.split('Texto:');
      if (parts.length > 1) {
        setTitle(parts[0].replace('Título:', '').trim());
        setDescription(parts[1].trim());
      } else {
        setDescription(copy);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!hasBalance) return;
    if (locations.length === 0) {
      showAlert("Por favor, adicione pelo menos uma localização alvo.", { type: 'error' });
      setCurrentStep('targeting');
      return;
    }

    setLoading(true);
    try {
      // Sentinel AI Check
      const combinedContent = `${title} ${description}`;
      const sentinelResult = await checkContent(combinedContent, 'ad');
      if (!sentinelResult.isSafe) {
        showAlert(sentinelResult.reason || 'Anúncio bloqueado por violar as políticas de segurança.', { type: 'error', title: 'Sentinela de Segurança' });
        setLoading(false);
        return;
      }

      // 1. Processar Pagamento Seguro
      const success = await processAdInvestment(currentUser.id, calculatedTotalBudget, title || 'Campanha');
      
      if (!success) {
          throw new Error("Falha no processamento financeiro.");
      }

      // 2. Criar Anúncio com Segmentação Rigorosa
      const oneDayInMs = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const newAd: AdCampaign = {
        id: generateUUID(),
        professorId: currentUser.id,
        professorName: `${currentUser.firstName} ${currentUser.lastName}`,
        name: title,
        title,
        description,
        targetAudience,
        minAge,
        maxAge,
        budget: calculatedTotalBudget,
        bidStrategy: 'CPM',
        bidAmount: 0.5, // Default bid
        isActive: true,
        imageUrl,
        linkUrl: linkUrl || '#',
        ctaText,
        timestamp: now,
        locations: locations, // Persistência Rigorosa dos locais
        billingCycle,
        startDate: now,
        endDate: now + (durationDays * oneDayInMs),
        lastBillingDate: now,
        isAutoRenew,
        renewalAmount,
        notifiedRenewal: false
      };

      await createAd(newAd);
      
      showAlert("Sua campanha foi lançada com sucesso! O CyBerPhone garantirá que seu anúncio apareça RIGOROSAMENTE nas regiões e faixas etárias selecionadas.", { type: 'success' });
      if(onNavigate) onNavigate('feed');
      else window.location.reload(); 
    } catch (e) {
      console.error(e);
      showAlert('Erro ao publicar campanha. Verifique seu saldo ou conexão.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => {
    const region = cityInput.trim() ? ` - ${cityInput.trim()}` : '';
    const newLoc = `${selectedCountry.flag} ${selectedCountry.name}${region}`;
    
    if (!locations.includes(newLoc)) {
      setLocations([...locations, newLoc]);
      setCityInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a0f] pt-24 pb-32 px-4">
      <div className="max-w-7xl mx-auto">
        
        <div className="bg-white dark:bg-darkcard p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-blue-500/10 mb-10 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <StarIcon className="h-40 w-40 text-blue-600" />
           </div>
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex-1">
                 <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-2">
                    <SparklesIcon className="h-6 w-6 text-yellow-500" /> 
                    Prioridade de Relevância CyBerPhone
                 </h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Nossos algoritmos garantem que conteúdos com maior investimento tenham entrega prioritária.
                 </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20 max-w-xs">
                 <p className="text-[9px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                    <strong>Segmentação Precisa:</strong> Seus anúncios aparecerão rigorosamente apenas para as idades e locais que você definir.
                 </p>
              </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-3">
              <RocketLaunchIcon className="h-10 w-10 text-blue-600" /> Impulsionar Conteúdo
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Maiores investimentos garantem as melhores posições do Feed</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white dark:bg-darkcard p-5 rounded-[2.5rem] shadow-xl border dark:border-white/5">
             <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Saldo para Impulsionamento</p>
                <p className={`text-2xl font-black ${hasBalance ? 'text-blue-600' : 'text-red-500'}`}>${(currentUser.balance || 0).toFixed(2)}</p>
             </div>
             <button onClick={() => onNavigate?.('profile')} className="p-3 bg-blue-50 dark:bg-blue-600/10 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-md">
                <PlusIcon className="h-6 w-6" />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <main className="lg:col-span-8 space-y-8">
             <div className="flex justify-between mb-4 px-2">
                {['objective', 'creative', 'targeting', 'budget'].map((s, idx) => (
                  <div key={s} className="flex flex-col items-center gap-2 flex-1 relative">
                     <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center font-black text-sm z-10 transition-all ${currentStep === s ? 'bg-blue-600 text-white shadow-xl scale-110' : idx < ['objective', 'creative', 'targeting', 'budget'].indexOf(currentStep) ? 'bg-green-50 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}>
                        {idx < ['objective', 'creative', 'targeting', 'budget'].indexOf(currentStep) ? <CheckCircleIcon className="h-6 w-6" /> : idx + 1}
                     </div>
                     {idx < 3 && <div className={`absolute top-6 left-1/2 w-full h-1 -z-0 ${idx < ['objective', 'creative', 'targeting', 'budget'].indexOf(currentStep) ? 'bg-green-50' : 'bg-gray-100 dark:bg-white/5'}`}></div>}
                  </div>
                ))}
             </div>

             <div className="bg-white dark:bg-darkcard rounded-[3.5rem] p-8 md:p-14 shadow-2xl border dark:border-white/5 min-h-[550px] flex flex-col">
                {currentStep === 'objective' && (
                  <div className="animate-fade-in space-y-10">
                    <div className="text-center max-w-lg mx-auto">
                       <h2 className="text-3xl font-black dark:text-white tracking-tight uppercase">Qual o seu Objetivo?</h2>
                       <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 font-medium">Invista em visibilidade para acelerar seu crescimento.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {[
                         { id: 'engagement', label: 'Seguidores/Fãs', desc: 'Foco em ganhar novos alunos e audiência.', icon: UserGroupIcon },
                         { id: 'traffic', label: 'Vendas/Cliques', desc: 'Direcionar para cursos ou materiais pagos.', icon: CursorArrowRaysIcon },
                         { id: 'awareness', label: 'Autoridade', desc: 'Ser visto por todos os membros da rede.', icon: MegaphoneIcon }
                       ].map(obj => (
                         <button 
                           key={obj.id}
                           onClick={() => setObjective(obj.id as any)}
                           className={`p-10 rounded-[3rem] border-4 transition-all text-left flex flex-col gap-5 group ${objective === obj.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10 shadow-2xl' : 'border-gray-50 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'}`}
                         >
                            <div className={`p-5 rounded-[1.5rem] w-fit shadow-lg ${objective === obj.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-blue-600'}`}>
                               <obj.icon className="h-8 w-8" />
                            </div>
                            <div>
                               <h4 className="font-black dark:text-white uppercase text-xs tracking-widest">{obj.label}</h4>
                               <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed font-medium">{obj.desc}</p>
                            </div>
                         </button>
                       ))}
                    </div>
                    <div className="pt-10 flex justify-end">
                       <button onClick={() => setCurrentStep('creative')} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-3 shadow-xl active:scale-95 transition-all">Próximo: Criativo <ChevronRightIcon className="h-5 w-5"/></button>
                    </div>
                  </div>
                )}

                {currentStep === 'creative' && (
                  <div className="animate-fade-in space-y-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div>
                          <h2 className="text-3xl font-black dark:text-white tracking-tight uppercase">Montagem do Conteúdo</h2>
                          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Sua vitrine para o mundo CyBer</p>
                       </div>
                       <button 
                         onClick={handleAiGenerate}
                         disabled={aiLoading}
                         className="flex items-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
                       >
                          {aiLoading ? <div className="w-5 h-5 border-3 border-white border-t-transparent animate-spin rounded-full" /> : <SparklesIcon className="h-5 w-5" />}
                          Texto via IA
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título Chamativo</label>
                             <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Quer aprender Design comigo?" className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl dark:text-white outline-none focus:ring-2 focus:ring-blue-600 font-black text-lg shadow-inner" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                             <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Diga aos alunos por que eles devem te seguir..." className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl dark:text-white outline-none focus:ring-2 focus:ring-blue-600 font-medium h-40 resize-none shadow-inner" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link de Destino</label>
                             <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl dark:text-white outline-none focus:ring-2 focus:ring-blue-600 font-bold" />
                          </div>
                       </div>

                       <div className="space-y-8">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Imagem Principal</label>
                             <div 
                               onClick={() => fileInputRef.current?.click()}
                               className={`w-full h-72 border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-5 cursor-pointer transition-all overflow-hidden relative group ${imageUrl ? 'border-blue-500 shadow-2xl' : 'border-gray-100 dark:border-white/10 hover:border-blue-400'}`}
                             >
                                {imageUrl ? (
                                   <>
                                      <img src={imageUrl} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                         <button className="bg-white text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-2xl">Trocar Mídia</button>
                                      </div>
                                   </>
                                ) : (
                                   <>
                                      <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-full"><PhotoIcon className="h-10 w-10 text-gray-300" /></div>
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Upload do Banner</span>
                                   </>
                                )}
                                <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chamada para Ação</label>
                             <select value={ctaText} onChange={e => setCtaText(e.target.value)} className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl dark:text-white outline-none font-black text-sm cursor-pointer shadow-inner">
                                <option>Saiba Mais</option>
                                <option>Me Seguir</option>
                                <option>Ver Perfil</option>
                                <option>Acessar Aula</option>
                                <option>Comprar Curso</option>
                                <option>Agendar Mentor</option>
                                <option>Falar no WhatsApp</option>
                                <option>Baixar Material</option>
                                <option>Inscrição Grátis</option>
                                <option>Ver Promoção</option>
                             </select>
                          </div>
                       </div>
                    </div>

                    <div className="pt-10 flex justify-between">
                       <button onClick={() => setCurrentStep('objective')} className="text-gray-400 font-black text-xs uppercase flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors"><ChevronLeftIcon className="h-4 w-4" /> Voltar</button>
                       <button onClick={() => setCurrentStep('targeting')} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-3 shadow-xl active:scale-95 transition-all">Próximo: Público <ChevronRightIcon className="h-5 w-5"/></button>
                    </div>
                  </div>
                )}

                {currentStep === 'targeting' && (
                   <div className="animate-fade-in space-y-10">
                      <div className="text-center max-w-lg mx-auto">
                        <h2 className="text-3xl font-black dark:text-white tracking-tight uppercase">Segmentação Rigorosa</h2>
                        <p className="text-sm text-gray-400 font-medium mt-2">Defina exatamente quem verá seu anúncio. A entrega respeitará 100% estes critérios.</p>
                      </div>

                      <div className="space-y-10">
                        {/* AGE SLIDER */}
                        <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/10 space-y-6 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 bg-green-500/10 text-green-600 rounded-bl-2xl">
                              <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheckIcon className="h-3 w-3" /> Filtro Ativo</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <UserIcon className="h-6 w-6 text-blue-600" />
                              <h4 className="font-black dark:text-white uppercase text-xs tracking-widest">Faixa Etária (Obrigatório)</h4>
                           </div>
                           <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-3">
                                 <div className="flex justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Idade Mínima</label>
                                    <span className="text-xs font-black text-blue-600">{minAge} anos</span>
                                 </div>
                                 <input type="range" min={13} max={maxAge} value={minAge} onChange={e => setMinAge(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full accent-blue-600 cursor-pointer" />
                              </div>
                              <div className="space-y-3">
                                 <div className="flex justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Idade Máxima</label>
                                    <span className="text-xs font-black text-blue-600">{maxAge} anos</span>
                                 </div>
                                 <input type="range" min={minAge} max={100} value={maxAge} onChange={e => setMaxAge(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full accent-blue-600 cursor-pointer" />
                              </div>
                           </div>
                        </div>

                        {/* INTERESTS */}
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">Interesses</label>
                           <textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Ex: Pessoas que querem aprender Python, Estudantes de Direito..." className="w-full p-6 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] dark:text-white outline-none focus:ring-2 focus:ring-blue-600 font-bold h-32 resize-none shadow-inner" />
                        </div>

                        {/* LOCATION PICKER */}
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 flex items-center gap-2">
                              <GlobeAltIcon className="h-4 w-4" /> Localização Geográfica (Rigorosa)
                           </label>
                           
                           <div className="flex flex-col sm:flex-row gap-3 mb-6">
                              <div className="flex-1 relative">
                                <select 
                                    className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white outline-none border-2 border-transparent focus:border-blue-500 font-bold appearance-none cursor-pointer"
                                    value={selectedCountry.code}
                                    onChange={e => setSelectedCountry(COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES[0])}
                                >
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400 rotate-90" />
                                </div>
                              </div>
                              
                              <input 
                                type="text" 
                                value={cityInput} 
                                onChange={e => setCityInput(e.target.value)} 
                                placeholder="Cidade/Estado (Opcional)..." 
                                className="flex-[2] p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white outline-none border-2 border-transparent focus:border-blue-500 font-bold" 
                                onKeyPress={e => e.key === 'Enter' && addLocation()} 
                              />
                              
                              <button onClick={addLocation} className="p-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center">
                                  <PlusIcon className="h-6 w-6" />
                              </button>
                           </div>

                           <div className="flex flex-wrap gap-2">
                              {locations.map(loc => (
                                <div key={loc} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-600/20 text-blue-600 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-900/30 animate-scale-in">
                                   <MapPinIcon className="h-4 w-4" />
                                   <span className="text-[10px] font-black uppercase tracking-widest">{loc}</span>
                                   <button onClick={() => setLocations(locations.filter(l => l !== loc))} className="hover:text-red-500 transition-colors ml-1"><XMarkIcon className="h-3 w-3" /></button>
                                </div>
                              ))}
                              {locations.length === 0 && (
                                <p className="text-xs text-gray-400 font-medium italic pl-2">Nenhuma localização definida. Adicione pelo menos um país ou cidade.</p>
                              )}
                           </div>
                        </div>
                      </div>

                      <div className="pt-10 flex justify-between">
                         <button onClick={() => setCurrentStep('creative')} className="text-gray-400 font-black text-xs uppercase flex items-center gap-2 hover:text-gray-900 transition-colors"><ChevronLeftIcon className="h-4 w-4" /> Voltar</button>
                         <button onClick={() => setCurrentStep('budget')} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase flex items-center gap-3 shadow-xl active:scale-95 transition-all">Próximo: Relevância <ChevronRightIcon className="h-5 w-5"/></button>
                      </div>
                   </div>
                )}

                {currentStep === 'budget' && (
                  <div className="animate-fade-in space-y-12">
                    <div className="text-center max-w-lg mx-auto">
                       <h2 className="text-3xl font-black dark:text-white tracking-tight uppercase">Poder de Exibição</h2>
                       <p className="text-sm text-gray-500 font-medium mt-2">Quanto maior o investimento diário, maior a sua autoridade e prioridade de entrega no feed.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-12">
                          <div className="space-y-5">
                             <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investimento Inicial</label>
                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-4 py-1.5 rounded-xl text-xs font-black shadow-sm">{durationDays} dias</span>
                             </div>
                             <input type="range" min={1} max={30} value={durationDays} onChange={e => setDurationDays(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600" />
                          </div>

                          <div className="space-y-5">
                             <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Força de Alcance (Impacto Diário)</label>
                                <span className="bg-green-50 dark:bg-green-900/20 text-green-600 px-4 py-1.5 rounded-xl text-xs font-black shadow-sm">{dailyReachGoal.toLocaleString()} pessoas</span>
                             </div>
                             <input type="range" min={400} max={100000} step={200} value={dailyReachGoal} onChange={e => setDailyReachGoal(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-green-600" />
                          </div>

                          <div className="space-y-5">
                             <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frequência de Renovação</label>
                                <div className="flex gap-2">
                                   <button 
                                     onClick={() => setBillingCycle('DAILY')}
                                     className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${billingCycle === 'DAILY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-gray-200'}`}
                                   >
                                     Diário
                                   </button>
                                   <button 
                                     onClick={() => setBillingCycle('WEEKLY')}
                                     className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${billingCycle === 'WEEKLY' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-gray-200'}`}
                                   >
                                     Semanal
                                   </button>
                                </div>
                             </div>
                             
                             <div 
                               onClick={() => setIsAutoRenew(!isAutoRenew)}
                               className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${isAutoRenew ? 'border-green-500 bg-green-50/50 dark:bg-green-500/10' : 'border-gray-100 dark:border-white/5 bg-gray-50/50'}`}
                             >
                                <div>
                                   <p className="text-[10px] font-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                                      {isAutoRenew ? <ShieldCheckIcon className="h-4 w-4 text-green-500" /> : <XMarkIcon className="h-4 w-4 text-gray-400" />}
                                      Renovação Automática
                                   </p>
                                   <p className="text-[9px] text-gray-400 font-bold tracking-tight mt-1">O anúncio não para até você desativar manualmente.</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-all ${isAutoRenew ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/10'}`}>
                                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${isAutoRenew ? 'left-7' : 'left-1'}`}></div>
                                </div>
                             </div>

                             {isAutoRenew && (
                               <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl animate-pulse">
                                  <InformationCircleIcon className="h-4 w-4 text-green-500" />
                                  <p className="text-[9px] text-green-600 font-black uppercase tracking-tight">
                                     Será debitado ${renewalAmount.toFixed(2)} a cada {billingCycle === 'WEEKLY' ? '7 dias' : 'dia'}.
                                  </p>
                               </div>
                             )}
                          </div>
                       </div>

                       <div className="bg-gray-50 dark:bg-black/40 p-10 rounded-[4rem] border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 relative z-10">Investimento Total</p>
                          <p className="text-7xl font-black text-gray-900 dark:text-white tracking-tighter relative z-10">${calculatedTotalBudget.toFixed(2)}</p>
                          <div className="mt-8 flex items-center gap-3 text-green-600 bg-green-50 dark:bg-green-900/20 px-6 py-2.5 rounded-2xl relative z-10 border border-green-100 dark:border-green-900/30">
                             <PresentationChartLineIcon className="h-5 w-5" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Est: +{(dailyReachGoal * durationDays / 100).toFixed(0)} novas conexões</span>
                          </div>
                       </div>
                    </div>

                    <div className="pt-10 flex flex-col items-end gap-6 border-t dark:border-white/5">
                       {!hasBalance && (
                         <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 p-6 rounded-[2rem] border-2 border-red-100 dark:border-red-500/30 w-full animate-pulse">
                            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                            <p className="text-sm text-red-700 dark:text-red-400 font-bold uppercase leading-tight">Saldo insuficiente para este nível de alcance.</p>
                         </div>
                       )}
                       <div className="flex justify-between w-full">
                          <button onClick={() => setCurrentStep('targeting')} className="text-gray-400 font-black text-xs uppercase flex items-center gap-2 hover:text-gray-900 transition-colors"><ChevronLeftIcon className="h-4 w-4" /> Voltar</button>
                          <button 
                            onClick={handlePublish}
                            disabled={loading || !hasBalance || !imageUrl || !title}
                            className={`px-16 py-6 rounded-[2rem] font-black text-lg uppercase flex items-center gap-5 shadow-2xl transition-all active:scale-95 ${loading || !hasBalance ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                          >
                             {loading ? <div className="w-8 h-8 border-4 border-white border-t-transparent animate-spin rounded-full" /> : <><BanknotesIcon className="h-8 w-8"/> ATIVAR DESTAQUE</>}
                          </button>
                       </div>
                    </div>
                  </div>
                )}
             </div>
          </main>

          <aside className="lg:col-span-4">
             <div className="sticky top-28 space-y-8">
                <div className="flex items-center gap-3 mb-2 px-4">
                   <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prévia em Tempo Real</h3>
                </div>

                <div className="bg-white dark:bg-darkcard rounded-[3rem] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all duration-500 max-w-[380px] mx-auto group">
                   <div className="p-6 flex items-center justify-between border-b dark:border-white/5 bg-blue-50/20 dark:bg-blue-900/5">
                      <div className="flex items-center gap-3">
                         <div className="relative">
                            <img src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} className="w-11 h-11 rounded-xl object-cover border-2 border-white dark:border-white/10" />
                            {currentUser.isVerified && <div className="absolute -bottom-1 -right-1 bg-blue-600 p-0.5 rounded-md"><CheckBadgeIcon className="h-2 w-2 text-white" /></div>}
                         </div>
                         <div>
                            <p className="font-black text-xs text-gray-900 dark:text-white uppercase">{currentUser.firstName}</p>
                            <p className="text-[9px] text-blue-600 font-black uppercase">Relevância Máxima</p>
                         </div>
                      </div>
                      <GlobeAltIcon className="h-5 w-5 text-gray-300" />
                   </div>

                   <div className="p-6">
                      <h4 className="text-lg font-black dark:text-white uppercase leading-tight mb-2 truncate">{title || 'Título da Campanha'}</h4>
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed line-clamp-3">
                        {description || 'Sua mensagem persuasiva para atrair alunos e seguidores aparecerá aqui.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                         <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                            <UserIcon className="h-3 w-3" /> Público: {minAge}-{maxAge} anos
                         </div>
                         {locations.length > 0 && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-green-600 uppercase bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg truncate max-w-[150px]">
                                <MapPinIcon className="h-3 w-3" /> {locations[0]}
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="relative aspect-[1200/628] bg-gray-100 dark:bg-white/5 overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 opacity-30 gap-3">
                           <PhotoIcon className="h-16 w-16" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between">
                         <button className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-xl whitespace-nowrap">{ctaText}</button>
                      </div>
                   </div>
                </div>

                <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                   <div className="relative z-10">
                      <ShieldCheckIcon className="h-10 w-10 text-blue-200 mb-6" />
                      <h4 className="font-black text-lg uppercase tracking-widest mb-3">Selo de Autoridade</h4>
                      <p className="text-xs text-blue-100 font-medium leading-relaxed opacity-90">Ao impulsionar, seu perfil recebe sinalização de alta relevância no ecossistema.</p>
                   </div>
                </div>
             </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdCampaignPage;



