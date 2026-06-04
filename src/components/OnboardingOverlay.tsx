import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { User, Page } from '../types';
import { 
  HomeIcon, 
  VideoCameraIcon, 
  ShoppingBagIcon, 
  SparklesIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface OnboardingOverlayProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ currentUser, onNavigate }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = `cp_onboarding_completed_${currentUser.id}`;

  useEffect(() => {
    // Check if user has already completed onboarding
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay it slightly for smoother loading experience
      const timer = setTimeout(() => {
        setIsOpen(true);
        // Start tour on feed
        onNavigate('feed');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentUser.id, onNavigate, storageKey]);

  if (!isOpen) return null;

  const handleNext = () => {
    const nextStep = step + 1;
    if (nextStep < steps.length) {
      setStep(nextStep);
      // Programmatic navigation for an interactive live tour!
      if (steps[nextStep].targetPage) {
        onNavigate(steps[nextStep].targetPage as Page);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      if (steps[prevStep].targetPage) {
        onNavigate(steps[prevStep].targetPage as Page);
      }
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
    onNavigate('feed'); // Reset to feed at the end
  };

  const steps = [
    {
      title: "Bem-vindo ao CyBerPhone!",
      description: "Olá, " + (currentUser.firstName || 'Cidadão') + "! Temos o prazer de lhe dar as boas-vindas à nossa rede social educacional inovadora. Preparamos este rápido passeio para lhe apresentar as ferramentas essenciais.",
      icon: SparklesIcon,
      accentColor: "from-blue-600 to-indigo-600",
      targetPage: null,
      visual: (
        <div className="relative w-full h-44 flex items-center justify-center overflow-hidden rounded-3xl bg-slate-950 border border-white/10 shadow-inner">
          <div className="absolute inset-0 bg-radial-gradient from-blue-500/20 via-transparent to-transparent opacity-80" />
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="z-10 flex flex-col items-center gap-3 text-center"
          >
            <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-3xl backdrop-blur-md shadow-lg shadow-blue-500/10">
              <SparklesIcon className="w-12 h-12 text-blue-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Cyberneticamente Inteligente</p>
          </motion.div>
        </div>
      )
    },
    {
      title: "Feed Social Conectado",
      description: "Este é o seu centro de informações e conexões. Partilhe fotos, vídeos, textos e interaja com posts de formadores e outros criadores na comunidade. O seu Feed é totalmente livre de anúncios irritantes.",
      icon: HomeIcon,
      accentColor: "from-purple-600 to-indigo-600",
      targetPage: "feed",
      visual: (
        <div className="relative w-full h-44 flex flex-col justify-end p-4 overflow-hidden rounded-3xl bg-slate-950 border border-white/10">
          <div className="absolute top-4 left-4 right-4 flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs text-white">
              {currentUser.firstName ? currentUser.firstName[0] : 'U'}
            </div>
            <div className="flex-1">
              <div className="h-2 w-20 bg-white/20 rounded mb-1" />
              <div className="h-1.5 w-12 bg-white/10 rounded" />
            </div>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2 mt-auto"
          >
            <p className="text-[10px] font-bold text-white/90">📚 Olá rede! Acabo de me juntar ao CyBerPhone para impulsionar a minha aprendizagem em desenvolvimento de software.</p>
            <div className="flex gap-4 text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">
              <span className="text-blue-400">👍 Curtir</span>
              <span>💬 Comentar</span>
              <span>🔗 Partilhar</span>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      title: "Reels Educacionais e Divertidos",
      description: "Gosta de conteúdos curtos e diretos? Explore a nossa aba de Reels! Navegue verticalmente por vídeos dinâmicos focados em inovação, tecnologia e ideias inspiradoras produzidas por especialistas de toda a Angola e para além.",
      icon: VideoCameraIcon,
      accentColor: "from-rose-600 to-pink-600",
      targetPage: "reels-page",
      visual: (
        <div className="relative w-full h-44 flex items-center justify-center overflow-hidden rounded-3xl bg-slate-950 border border-white/10">
          <div className="absolute inset-0 bg-cover bg-center brightness-[0.35]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=640')` }} />
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black to-transparent" />
          
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="z-10 p-4 bg-white/10 border border-white/20 rounded-full backdrop-blur-sm"
          >
            <VideoCameraIcon className="w-8 h-8 text-rose-500" />
          </motion.div>

          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-rose-400">@criador_educacao</p>
              <p className="text-[10px] text-white font-bold leading-tight line-clamp-1">3 truques para proteger os seus dados na Net! 🔐</p>
            </div>
            <div className="flex flex-col gap-2 items-center text-[8px] font-black text-rose-400">
              <span className="p-1 px-2 bg-rose-500/10 rounded-lg">🔥 1.2k</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Nossa Loja Exclusiva",
      description: "Acesse um mercado online idealizado para serviços, dispositivos, créditos digitais e produtos especializados. Compre com segurança via carteira integrada ou crie o seu perfil de vendedor para faturar com comissões de afiliados!",
      icon: ShoppingBagIcon,
      accentColor: "from-emerald-600 to-teal-600",
      targetPage: "store",
      visual: (
        <div className="relative w-full h-44 flex items-center justify-center overflow-hidden rounded-3xl bg-slate-950 border border-white/10 p-4">
          <motion.div 
            whileHover={{ y: -5 }}
            className="w-full max-w-[180px] bg-white/[0.02] border border-white/10 rounded-2xl p-3 flex flex-col gap-2"
          >
            <div className="w-full h-20 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <ShoppingBagIcon className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-white uppercase leading-none mb-1">Módulo de IA Pró</p>
                <p className="text-[8px] font-bold text-emerald-400 tracking-wider">KZ 4.500,00</p>
              </div>
              <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md">Comprar</span>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      title: "Pronto para Começar!",
      description: "Tudo configurado! Recomendamos que você complemente o seu perfil e envie os seus documentos básicos na área de Verificação de ID para garantir acesso irrestrito às funcionalidades fiscais e de loja segura. Bem-vindo à família CyBerPhone!",
      icon: CheckCircleIcon,
      accentColor: "from-blue-600 to-emerald-600",
      targetPage: "feed",
      visual: (
        <div className="relative w-full h-44 flex items-center justify-center overflow-hidden rounded-3xl bg-slate-950 border border-white/10">
          <div className="absolute inset-0 bg-radial-gradient from-emerald-500/20 via-transparent to-transparent opacity-80" />
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="p-4 bg-emerald-600/20 border border-emerald-500/35 rounded-full shadow-lg shadow-emerald-500/10">
              <CheckCircleIcon className="w-14 h-14 text-emerald-400" />
            </div>
            <p className="text-xs font-black uppercase text-emerald-400 tracking-widest mt-1">Sua Jornada Começa Agora</p>
          </motion.div>
        </div>
      )
    }
  ];

  const CurrentStepIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="relative w-full max-w-xl bg-white dark:bg-[#070a0e] rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-2xl p-8 overflow-hidden"
      >
        {/* Glow behind container */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />

        {/* Header toolbar */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-xl bg-gradient-to-r ${steps[step].accentColor} text-white shadow-lg`}>
              <CurrentStepIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              Tour Guiado ({step + 1}/{steps.length})
            </span>
          </div>
          <button 
            type="button"
            onClick={handleComplete} 
            className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-red-500/10 hover:text-red-500 focus:outline-none transition-all"
            title="Pular Tour"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Immersive Animated Visual */}
        <div className="relative mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[step].visual}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Description section */}
        <div className="space-y-3 relative z-10 min-h-[140px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">
                {steps[step].title}
              </h2>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                {steps[step].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step Indicator dots */}
        <div className="flex justify-center gap-2 mt-6 mb-8">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setStep(i);
                if (steps[i].targetPage) {
                  onNavigate(steps[i].targetPage as Page);
                }
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-500' : 'w-2.5 bg-gray-200 dark:bg-white/10'}`}
            />
          ))}
        </div>

        {/* Action Button Controls */}
        <div className="flex gap-4 relative z-10">
          {step > 0 ? (
            <button
              onClick={handlePrev}
              className="px-6 py-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-[11px] uppercase tracking-wider active:scale-95 transition-all flex items-center gap-2"
            >
              <ChevronLeftIcon className="w-4 h-4" /> Anterior
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-6 py-4 bg-gray-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-gray-400 dark:text-gray-500 rounded-2xl font-black text-[11px] uppercase tracking-wider active:scale-95 transition-all"
            >
              Pular Tudo
            </button>
          )}

          <button
            onClick={handleNext}
            className={`flex-1 py-4 bg-gradient-to-r ${steps[step].accentColor} text-white shadow-xl rounded-[1.6rem] font-black text-[11px] uppercase tracking-wider hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2`}
          >
            {step === steps.length - 1 ? (
              <>Concluir <CheckCircleIcon className="w-4 h-4" /></>
            ) : (
              <>Seguinte <ChevronRightIcon className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
