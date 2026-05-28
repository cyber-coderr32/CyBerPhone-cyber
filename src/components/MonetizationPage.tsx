import React, { useState, useEffect } from 'react';
import { User, MonetizationStatus, MonetizationTier, Transaction, TransactionType } from '../types';
import { updateUserProfile, getTransactions, requestWithdrawal, getPosts } from '../services/storageService';
import { 
  DollarSign, 
  Users, 
  Video, 
  TrendingUp, 
  Lock, 
  Rocket, 
  ShieldCheck, 
  FileText, 
  Clock, 
  Sparkles, 
  BadgeCheck, 
  RefreshCw, 
  Wallet, 
  ArrowRight,
  Eye,
  Store,
  HelpCircle,
  ChevronRight,
  CircleCheck,
  Coins,
  Tv
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../services/DialogContext';

interface MonetizationPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
  refreshUser: () => void;
}

const MonetizationPage: React.FC<MonetizationPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const { showConfirm, showAlert, showSuccess } = useDialog();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [myPostsCount, setMyPostsCount] = useState(0);

  useEffect(() => {
    const loadTransactions = async () => {
      const txs = await getTransactions(currentUser.id);
      setTransactions(txs.filter(t => 
        t.type === TransactionType.SALE || 
        t.type === TransactionType.DONATION || 
        t.type === TransactionType.WITHDRAWAL ||
        t.type === TransactionType.CHAT_FEE
      ).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
    };

    const loadPosts = async () => {
      try {
        const posts = await getPosts();
        const mine = posts.filter(p => p.userId === currentUser.id);
        setMyPostsCount(mine.length);
      } catch (e) {
        console.error("Erro ao carregar publicações para monetização:", e);
      }
    };

    loadTransactions();
    loadPosts();
  }, [currentUser.id]);

  const goals = currentUser.monetizationGoals || {
    followersGoal: 1000,
    watchHoursGoal: 4000,
    shortsViewsGoal: 10000000,
    currentFollowers: currentUser.followers?.length || 0,
    currentWatchHours: 0,
    currentShortsViews: 0,
    termsAccepted: false
  };

  const followersCount = currentUser.followers?.length || 0;
  const watchHoursCount = goals.currentWatchHours || 0;
  const reelsViewsCount = goals.currentShortsViews || 0;

  // Requisitos Nível 1 (Fan Funding)
  // - 500 seguidores
  // - 3 publicações
  // - 3.000 horas OU 3M reels views
  const hasMinFollowersL1 = followersCount >= 500;
  const hasMinPostsL1 = myPostsCount >= 3;
  const hasMinActivityL1 = watchHoursCount >= 3000 || reelsViewsCount >= 3000000;
  const isEligibleL1 = hasMinFollowersL1 && hasMinPostsL1 && hasMinActivityL1;

  // Requisitos Nível 2 (Ad Revenue completo)
  // - 1.000 seguidores
  // - 4.000 horas OU 10M reels views
  const hasMinFollowersL2 = followersCount >= 1000;
  const hasMinActivityL2 = watchHoursCount >= 4000 || reelsViewsCount >= 10000000;
  const isEligibleL2 = hasMinFollowersL2 && hasMinActivityL2;

  const handleAcceptTerms = async () => {
    if (await showConfirm("Você leu e aceita as Regras e Políticas do Programa de Parcerias e Monetização do CyberPhone?")) {
      setLoading(true);
      try {
        await updateUserProfile(currentUser.id, {
          monetizationGoals: { ...goals, termsAccepted: true }
        });
        refreshUser();
        showSuccess(t('monetization_terms_success') || "Regras aceites com sucesso!");
      } catch (err) {
        showAlert("Erro ao assinar contrato de termos.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApply = async (targetLevel: 'LEVEL_1' | 'LEVEL_2') => {
    if (targetLevel === 'LEVEL_1' && !isEligibleL1) {
      showAlert("Você ainda não preenche todos os requisitos para o Nível 1.");
      return;
    }
    if (targetLevel === 'LEVEL_2' && !isEligibleL2) {
      showAlert("Você ainda não preenche todos os requisitos para o Nível 2 (Parceria Completa).");
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(currentUser.id, {
        monetizationStatus: 'PENDING'
      });
      refreshUser();
      showSuccess("Sua candidatura ao Programa de Criadores do CyberPhone foi enviada! Analisaremos seu perfil nas próximas 48 horas.", { title: "Candidatura Enviada!" });
    } catch (err) {
      showAlert("Erro ao enviar sua candidatura de monetização.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert(t('invalid_value') || "Valor inválido.");
      return;
    }
    if (amount < 5000) {
      showAlert("O valor mínimo para resgate é de KZ 5.000,00.");
      return;
    }
    if (amount > (currentUser.balance || 0)) {
      showAlert(t('insufficient_balance') || "Saldo insuficiente para resgatar.");
      return;
    }
    if (!paymentDetails.trim()) {
      showAlert("Por favor, preencha os detalhes da sua conta bancária (IBAN).");
      return;
    }

    setLoading(true);
    try {
      await requestWithdrawal(currentUser.id, amount, paymentDetails);
      showSuccess("Sua solicitação de saque de KZ " + amount.toLocaleString('pt-BR') + " foi enviada para processamento bancário internacional!");
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setPaymentDetails('');
      refreshUser();
    } catch (err: any) {
      showAlert(err.message || "Erro na transação de retirada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 pb-24 md:pb-12 text-gray-900 dark:text-gray-100">
      
      {/* Dynamic Header imitating YouTube Studio Earn Tab */}
      <div className="relative mb-8 bg-gradient-to-br from-red-600/10 via-red-950/5 to-transparent border border-red-500/10 dark:border-red-500/5 p-8 rounded-[2.5rem] overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Tv className="w-40 h-40 text-red-500" />
        </div>
        
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4 shadow-sm">
            <Sparkles className="w-3 h-3" /> PROGRAMA DE PARCERIAS YPP 2026
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-[0.95] mb-2">
            Ganhe dinheiro como <span className="text-red-500">criador de conteúdo</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-sans leading-relaxed">
            Faça parte do ecossistema de criadores do CyberPhone. Monetize sua audiência com apoios directos, vendas de produtos e a publicação de anúncios exclusivos nos seus vídeos e Reels.
          </p>
        </div>
      </div>

      {/* Top Wallet & Earnings Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Card 1: Wallet Balance */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-green-500 shrink-0" />
            <h3 className="text-2xl font-black uppercase tracking-tight text-gray-950 dark:text-white">
              KZ {(currentUser.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Saldo de Ganhos Disponível</p>
          
          {currentUser.isMonetized && (
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="mt-4 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
            >
              Efetuar Saque Bancário
            </button>
          )}
        </div>

        {/* Card 2: Total Video Engagement Views */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm text-center flex flex-col justify-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-blue-500 shrink-0" />
            <h3 className="text-2xl font-black uppercase tracking-tight text-gray-950 dark:text-white">
              {(currentUser.creatorStats?.totalViews || 0).toLocaleString()}
            </h3>
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Visualizações Totais do Canal</p>
        </div>

        {/* Card 3: Approved Partnership Status Tier */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm text-center flex flex-col justify-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BadgeCheck className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
            <span className="text-lg font-black uppercase tracking-tight text-amber-500">
              {currentUser.monetizationStatus === 'APPROVED' ? (
                currentUser.monetizationTier === 'LEVEL_2' ? 'NÍVEL 2 (AD REVENUE)' : 'NÍVEL 1 (APOIO FÃS)'
              ) : currentUser.monetizationStatus === 'PENDING' ? (
                'ANÁLISE PENDENTE'
              ) : (
                'SEM MONETIZAÇÃO'
              )}
            </span>
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Seu Nível de Criador Verificado</p>
        </div>
      </div>

      {/* Dynamic Status Display (Review state notifications) */}
      {currentUser.monetizationStatus === 'PENDING' && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl mb-8 flex items-start gap-4">
          <div className="p-2 bg-amber-500 text-white rounded-2xl">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="font-sans font-black text-xs uppercase text-amber-700 dark:text-amber-400 tracking-wide">Inscrição em Auditoria Manual</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
              Recebemos sua solicitação! Nossa equipe está verificando seu nível de adesão (Nível 1 ou Nível 2) garantindo a integridade dos seus posts e seguidores orgânicos.
            </p>
          </div>
        </div>
      )}

      {/* Payout Logs / Receipts History */}
      {currentUser.monetizationStatus === 'APPROVED' && transactions.length > 0 && (
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-6 rounded-[2.5rem] mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Histórico de Recebimentos Recentes</h3>
          </div>
          <div className="space-y-3">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                <div>
                  <p className="text-xs font-bold uppercase">{t.description}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(t.timestamp).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-black text-green-500">+KZ {t.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YouTube Style Partner Tiering Area (Milestone Cards) */}
      <h2 className="text-base font-black uppercase tracking-wide text-gray-400 mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-red-500" /> COMO ENTRAR NO PROGRAMA DE PARCERIAS
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Milestone Card 1: Fan Funding & Shopping (L1) */}
        <div className={`relative bg-white dark:bg-[#12161f] p-8 rounded-[2.5rem] border-2 shadow-sm transition-all flex flex-col justify-between ${
          currentUser.monetizationStatus === 'APPROVED' && (currentUser.monetizationTier === 'LEVEL_1' || currentUser.monetizationTier === 'LEVEL_2')
          ? 'border-green-500/30'
          : 'border-transparent'
        }`}>
          {currentUser.monetizationStatus === 'APPROVED' && (currentUser.monetizationTier === 'LEVEL_1' || currentUser.monetizationTier === 'LEVEL_2') && (
            <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 font-black text-[9px] uppercase px-3 py-1 rounded-full border border-green-500/20">
              Desbloqueado
            </div>
          )}

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Nível 1 (Acesso Inicial)</span>
            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-950 dark:text-white leading-[1.1] mt-1 mb-2">
              Apoio de Fãs & Shopping
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans mb-6">
              Desbloqueie formas diretas para os espectadores apoiarem sua criação e venda de itens personalizados por meio dos seus conteúdos.
            </p>

            {/* Unlocked Benefits in Level 1 */}
            <div className="space-y-3.5 mb-8 border-t border-gray-100 dark:border-white/5 pt-5">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-900 dark:text-white leading-none">Clubes & Super Chats</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Seus admiradores podem lhe enviar presentes em dinheiro do app.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-900 dark:text-white leading-none font-sans">Sua Loja Digital (Shopping)</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Exiba seus próprios produtos diretamente na aba Shopping do seu perfil.</p>
                </div>
              </div>
            </div>

            {/* Progress Gauges for Level 1 */}
            <div className="space-y-4 border-t border-gray-100 dark:border-white/5 pt-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-450">Metas Requeridas do Nível 1:</h4>
              
              {/* followers count progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-sans">
                  <span className="font-bold text-gray-400 dark:text-gray-500 uppercase">1. {followersCount.toLocaleString()} / 500 Seguidores</span>
                  <span className={hasMinFollowersL1 ? "text-green-500" : "text-gray-400"}>{hasMinFollowersL1 ? "✓ Concluído" : `${Math.floor((followersCount/500)*100)}%`}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${hasMinFollowersL1 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (followersCount/500)*100)}%` }} />
                </div>
              </div>

              {/* Upload count progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-sans">
                  <span className="font-bold text-gray-400 dark:text-gray-500 uppercase">2. {myPostsCount} / 3 Envios Públicos</span>
                  <span className={hasMinPostsL1 ? "text-green-500" : "text-gray-400"}>{hasMinPostsL1 ? "✓ Concluído" : `${Math.floor((myPostsCount/3)*100)}%`}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${hasMinPostsL1 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (myPostsCount/3)*100)}%` }} />
                </div>
              </div>

              {/* Watch hour OR reels views */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase leading-relaxed tracking-tight">3. E mais um destes requisitos de visualização:</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border dark:border-white/5">
                    <p className="text-[9px] uppercase font-bold text-gray-500">Horas de Vídeo</p>
                    <p className="text-xs font-black mt-1 text-gray-900 dark:text-white">{watchHoursCount.toFixed(1)} / 3.000h</p>
                    <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (watchHoursCount/3000)*100)}%` }} />
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border dark:border-white/5">
                    <p className="text-[9px] uppercase font-bold text-gray-500">Views nos Reels</p>
                    <p className="text-xs font-black mt-1 text-gray-900 dark:text-white">{reelsViewsCount >= 1000000 ? `${(reelsViewsCount/1000000).toFixed(1)}M` : reelsViewsCount.toLocaleString()} / 3M</p>
                    <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-pink-500" style={{ width: `${Math.min(100, (reelsViewsCount/3000000)*100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className={hasMinActivityL1 ? "text-green-500 text-[10px]" : "text-gray-400 text-[10px]"}>{hasMinActivityL1 ? "✓ Meta Atingida" : "Pendente"}</span>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-white/5">
            {!goals.termsAccepted ? (
              <button 
                onClick={handleAcceptTerms}
                disabled={loading}
                className="w-full py-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> Aceitar as Regras de Termos
              </button>
            ) : (!currentUser.monetizationStatus || currentUser.monetizationStatus === 'INELIGIBLE') ? (
              <button 
                onClick={() => handleApply('LEVEL_1')}
                disabled={loading || !isEligibleL1}
                className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase text-center flex items-center justify-center gap-2 transition-all ${
                  isEligibleL1 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer active:scale-95' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-450 cursor-not-allowed'
                }`}
              >
                {isEligibleL1 ? 'Inscrever-se no Nível 1' : <><Lock className="w-3.5 h-3.5" /> Metas Pendentes</>}
              </button>
            ) : (currentUser.monetizationTier === 'LEVEL_1' || currentUser.monetizationTier === 'LEVEL_2') ? (
              <div className="bg-green-500/10 text-green-500 text-[10px] font-black uppercase text-center py-3.5 rounded-2xl border border-green-500/15">
                Você é Criador Credenciado Nível 1
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-white/5 text-gray-500 text-[10px] py-3.5 text-center rounded-2xl uppercase font-bold text-xs">
                Aguardando Auditoria
              </div>
            )}
          </div>

        </div>

        {/* Milestone Card 2: Ad Revenue Sharing (L2 - Completo) */}
        <div className={`relative bg-white dark:bg-[#12161f] p-8 rounded-[2.5rem] border-2 shadow-sm transition-all flex flex-col justify-between ${
          currentUser.monetizationStatus === 'APPROVED' && currentUser.monetizationTier === 'LEVEL_2'
          ? 'border-green-500/30'
          : 'border-transparent'
        }`}>
          {currentUser.monetizationStatus === 'APPROVED' && currentUser.monetizationTier === 'LEVEL_2' && (
            <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 font-black text-[9px] uppercase px-3 py-1 rounded-full border border-green-500/20">
              Desbloqueado
            </div>
          )}

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#d97706]">Nível 2 (Parceria Total YPP)</span>
            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-950 dark:text-white leading-[1.1] mt-1 mb-2">
              Receita de Anúncios & Premium
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans mb-6">
              Compartilhe as receitas obtidas com a veiculação de anúncios na página principal o feed principal e nas pausas do Reels.
            </p>

            {/* Unlocked Benefits in Level 2 */}
            <div className="space-y-3.5 mb-8 border-t border-gray-100 dark:border-white/5 pt-5">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-[#d97706]/10 text-[#d97706] rounded-lg shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-900 dark:text-white leading-none">Anúncios de Vídeo & Reels</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Ganhe com base no engajamento e exibição de anúncios inseridos nos seus conteúdos públicos.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-[#d97706]/10 text-[#d97706] rounded-lg shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-900 dark:text-white leading-none">Receitas do Canal Premium</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Receba comissões imediatas sempre que usuários Premium assistirem às suas criações!</p>
                </div>
              </div>
            </div>

            {/* Progress Gauges for Level 2 */}
            <div className="space-y-4 border-t border-gray-100 dark:border-white/5 pt-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-450">Metas Requeridas do Nível 2:</h4>
              
              {/* followers count progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-sans">
                  <span className="font-bold text-gray-400 dark:text-gray-500 uppercase">1. {followersCount.toLocaleString()} / 1.000 Seguidores</span>
                  <span className={hasMinFollowersL2 ? "text-green-500" : "text-gray-400"}>{hasMinFollowersL2 ? "✓ Concluído" : `${Math.floor((followersCount/1000)*100)}%`}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${hasMinFollowersL2 ? 'bg-green-500' : 'bg-[#d97706]'}`} style={{ width: `${Math.min(100, (followersCount/1000)*100)}%` }} />
                </div>
              </div>

              {/* Watch hour OR reels views */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase leading-relaxed tracking-tight">2. E mais um destes requisitos de visualização:</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border dark:border-white/5">
                    <p className="text-[9px] uppercase font-bold text-gray-500">Horas de Vídeo</p>
                    <p className="text-xs font-black mt-1 text-gray-900 dark:text-white">{watchHoursCount.toFixed(1)} / 4.000h</p>
                    <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-red-600" style={{ width: `${Math.min(100, (watchHoursCount/4000)*100)}%` }} />
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border dark:border-white/5">
                    <p className="text-[9px] uppercase font-bold text-gray-400">Views nos Reels</p>
                    <p className="text-xs font-black mt-1 text-gray-900 dark:text-white">{reelsViewsCount >= 1000000 ? `${(reelsViewsCount/1000000).toFixed(1)}M` : reelsViewsCount.toLocaleString()} / 10M</p>
                    <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-pink-500" style={{ width: `${Math.min(100, (reelsViewsCount/10000000)*100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className={hasMinActivityL2 ? "text-green-500 text-[10px]" : "text-gray-400 text-[10px]"}>{hasMinActivityL2 ? "✓ Meta Atingida" : "Pendente"}</span>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-white/5">
            {!goals.termsAccepted ? (
              <button 
                disabled
                className="w-full py-3 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-2xl text-[10px] font-black uppercase text-center"
              >
                Aceite os termos na Etapa do Nível 1
              </button>
            ) : currentUser.monetizationTier === 'LEVEL_1' && isEligibleL2 ? (
              <button 
                onClick={() => handleApply('LEVEL_2')}
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase text-center flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Solicitar Upgrade para Parceria Completa
              </button>
            ) : (!currentUser.monetizationStatus || currentUser.monetizationStatus === 'INELIGIBLE') ? (
              <button 
                onClick={() => handleApply('LEVEL_2')}
                disabled={loading || !isEligibleL2}
                className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase text-center flex items-center justify-center gap-2 transition-all ${
                  isEligibleL2 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg cursor-pointer active:scale-95' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-450 cursor-not-allowed'
                }`}
              >
                {isEligibleL2 ? 'Inscrever-se na Parceria Completa' : <><Lock className="w-3.5 h-3.5" /> Metas Pendentes</>}
              </button>
            ) : currentUser.monetizationTier === 'LEVEL_2' ? (
              <div className="bg-amber-500/15 text-[#d97706] text-[10px] font-black uppercase text-center py-3.5 rounded-2xl border border-amber-500/25">
                Você é Parceiro Completo (Nível 2)
              </div>
            ) : (
              <div className="bg-gray-105 dark:bg-white/5 text-gray-400 text-[10px] py-3.5 text-center rounded-2xl uppercase font-bold text-xs">
                Aguardando Upgrade
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Transparency section with YouTube Partner Program icons */}
      <div className="mt-16 text-center border-t border-gray-100 dark:border-white/5 pt-12">
        <h5 className="text-sm font-black uppercase text-gray-900 dark:text-white mb-2 tracking-wide">Transparência e Regras de Segurança</h5>
        <p className="text-[11px] text-gray-400 font-medium max-w-lg mx-auto leading-relaxed uppercase tracking-wider mb-6">
          Visamos manter o ecossistema saudável. Criadores fáceis de identificar, autênticos e com boas diretrizes evitam strikes de propriedade intelectual.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 text-[9.5px] font-black uppercase text-gray-500 dark:text-gray-450 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full border dark:border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Pagamentos Mensais via IBAN
          </div>
          <div className="flex items-center gap-2 text-[9.5px] font-black uppercase text-gray-500 dark:text-gray-450 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full border dark:border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Suporte YPP Prioritário
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-darkcard rounded-[2.5rem] p-8 shadow-2xl overflow-hidden border dark:border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-600 rounded-2xl text-white">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black uppercase text-gray-950 dark:text-white tracking-tight">Efetuar Saque Bancário</h3>
                </div>
              </div>

              <form onSubmit={handleWithdrawRequest} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Valor do Saque (mínimo de KZ 5.000,00)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">KZ</span>
                    <input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-lg font-black dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Dados Bancários / IBAN Angolano</label>
                  <textarea 
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    placeholder="Ex: AO06 0001 0000 1234 5678 9012 3&#10;Banco de Fomento Angola (BFA)"
                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-xs font-medium dark:text-white min-h-[90px] resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 text-xs"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Confirmar Recebimento via IBAN"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MonetizationPage;
