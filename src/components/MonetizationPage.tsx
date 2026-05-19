import React, { useState, useEffect } from 'react';
import { User, MonetizationStatus, MonetizationTier, Transaction, TransactionType } from '../types';
import { updateUserProfile, getTransactions, requestWithdrawal } from '../services/storageService';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  VideoCameraIcon, 
  ChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ClockIcon,
  SparklesIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  WalletIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/solid';
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

  useEffect(() => {
    const loadTransactions = async () => {
      const txs = await getTransactions(currentUser.id);
      // Filtrar apenas transações de ganhos ou saques
      setTransactions(txs.filter(t => 
        t.type === TransactionType.SALE || 
        t.type === TransactionType.DONATION || 
        t.type === TransactionType.WITHDRAWAL ||
        t.type === TransactionType.CHAT_FEE
      ).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
    };
    loadTransactions();
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

  const isEligible = goals.currentFollowers >= goals.followersGoal && 
                    (goals.currentWatchHours >= goals.watchHoursGoal || goals.currentShortsViews >= goals.shortsViewsGoal);

  const handleAcceptTerms = async () => {
    if (await showConfirm(t('monetization_rules_accept_q'))) {
      setLoading(true);
      try {
        await updateUserProfile(currentUser.id, {
          monetizationGoals: { ...goals, termsAccepted: true }
        });
        refreshUser();
        showSuccess(t('monetization_terms_success'));
      } catch (err) {
        showAlert(t('error_accepting_terms') || "Erro ao aceitar termos.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApply = async () => {
    if (!isEligible) {
      showAlert(t('not_eligible_error') || "Você ainda não atingiu as metas necessárias.");
      return;
    }
    
    setLoading(true);
    try {
      await updateUserProfile(currentUser.id, {
        monetizationStatus: 'PENDING'
      });
      refreshUser();
      showSuccess(t('application_sent'), { title: "PARABÉNS!" });
    } catch (err) {
      showAlert(t('publish_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert(t('invalid_value'));
      return;
    }
    if (amount < 5000) {
      showAlert(t('withdrawal_min_error'));
      return;
    }
    if (amount > (currentUser.balance || 0)) {
      showAlert(t('insufficient_balance'));
      return;
    }
    if (!paymentDetails.trim()) {
      showAlert(t('auth_error_fill_fields'));
      return;
    }

    setLoading(true);
    try {
      await requestWithdrawal(currentUser.id, amount, paymentDetails);
      showSuccess(t('withdrawal_request_success'));
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setPaymentDetails('');
      refreshUser();
    } catch (err: any) {
      showAlert(err.message || t('action_error'));
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    switch (currentUser.monetizationStatus) {
      case 'APPROVED':
        return (
          <div className="bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-6 rounded-[32px] flex items-center gap-4">
             <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center">
                <ShieldCheckIcon className="w-7 h-7" />
             </div>
             <div>
                <h4 className="font-black uppercase text-green-900 dark:text-green-400">{t('monetized_channel_title', 'Canal Monetizado')}</h4>
                <p className="text-xs font-bold text-green-700 dark:text-green-500 uppercase tracking-widest mt-0.5">{t('monetized_channel_desc', 'Você está ganhando com sua criatividade')}</p>
             </div>
          </div>
        );
      case 'PENDING':
        return (
          <div className="bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-6 rounded-[32px] flex items-center gap-4">
             <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center animate-pulse">
                <ChartBarIcon className="w-7 h-7" />
             </div>
             <div>
                <h4 className="font-black uppercase text-orange-900 dark:text-orange-400">{t('review_pending_title', 'Em Análise')}</h4>
                <p className="text-xs font-bold text-orange-700 dark:text-orange-500 uppercase tracking-widest mt-0.5">{t('review_pending_desc', 'Nossa equipe está revisando seu canal')}</p>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const ProgressItem = ({ icon: Icon, label, current, goal, color }: any) => {
    const percent = Math.min(100, (current / goal) * 100);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</span>
          </div>
          <span className="text-xs font-black uppercase text-gray-900 dark:text-white">
            {current.toLocaleString()} / {goal.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className={`h-full ${color} shadow-lg`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 pb-24 md:pb-6">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-4">
          {t('monetization')} <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
        </h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">{t('monetization_desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm text-center group transition-all hover:border-blue-500/30">
            <div className="flex items-center justify-center gap-2 mb-1">
                <WalletIcon className="w-4 h-4 text-blue-500" />
                <h3 className="text-2xl font-black uppercase text-gray-900 dark:text-white">
                    KZ {(currentUser.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('available_balance')}</p>
            {currentUser.monetizationStatus === 'APPROVED' && (
                <button 
                    onClick={() => setShowWithdrawModal(true)}
                    className="mt-4 w-full py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
                >
                    {t('confirm_withdrawal')}
                </button>
            )}
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm text-center">
            <h3 className="text-2xl font-black uppercase text-gray-900 dark:text-white">
                {(currentUser.creatorStats?.totalViews || 0).toLocaleString()}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('total_views')}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm text-center">
            <div className={`text-2xl font-black uppercase ${currentUser.monetizationTier === MonetizationTier.LEVEL_4 ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                {currentUser.monetizationTier || t('anonymous_user')}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('creator_tier')}</p>
        </div>
      </div>

      {renderStatus()}

      {/* Histórico de Ganhos */}
      {currentUser.monetizationStatus === 'APPROVED' && transactions.length > 0 && (
          <div className="mt-8 bg-white dark:bg-white/5 rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <ChartBarIcon className="w-5 h-5 text-blue-500" />
                        <h4 className="text-sm font-black uppercase text-gray-900 dark:text-white tracking-widest">{t('recent_earnings')}</h4>
                    </div>
                </div>
                <div className="space-y-4">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {tx.amount > 0 ? <ArrowDownCircleIcon className="w-5 h-5" /> : <ArrowUpCircleIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">{tx.description}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{new Date(tx.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className={`text-sm font-black ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {tx.amount > 0 ? '+' : ''}KZ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    ))}
                </div>
          </div>
      )}

      <div className="mt-8 bg-white dark:bg-white/5 rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-600 rounded-2xl text-white">
                <RocketLaunchIcon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-lg font-black uppercase text-gray-900 dark:text-white tracking-tight">{t('path_to_success')}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('path_to_success_desc')}</p>
            </div>
        </div>

        <div className="space-y-8">
            <ProgressItem 
                icon={UserGroupIcon} 
                label={t('followers')} 
                current={goals.currentFollowers} 
                goal={goals.followersGoal} 
                color="bg-blue-600" 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProgressItem 
                    icon={ClockIcon} 
                    label={t('watch_hours')} 
                    current={goals.currentWatchHours} 
                    goal={goals.watchHoursGoal} 
                    color="bg-green-600" 
                />
                <ProgressItem 
                    icon={VideoCameraIcon} 
                    label={t('reels_views')} 
                    current={goals.currentShortsViews} 
                    goal={goals.shortsViewsGoal} 
                    color="bg-pink-600" 
                />
            </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/10">
            <h4 className="font-black uppercase text-gray-900 dark:text-white mb-6 tracking-tight">{t('enrollment_steps')}:</h4>
            
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${goals.termsAccepted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {goals.termsAccepted ? <CheckCircleIcon className="w-5 h-5" /> : <span className="text-xs font-black">1</span>}
                    </div>
                    <div className="flex-grow">
                        <h5 className="text-sm font-black uppercase text-gray-800 dark:text-gray-200">{t('accept_rules')}</h5>
                        <p className="text-xs text-gray-500 font-medium">{t('accept_rules_desc')}</p>
                        {!goals.termsAccepted && (
                             <button 
                                onClick={handleAcceptTerms}
                                disabled={loading}
                                className="mt-3 text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-2"
                             >
                                <DocumentTextIcon className="w-4 h-4" /> {t('read_accept_terms')}
                             </button>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-4 opacity-80">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentUser.monetizationStatus === 'PENDING' || currentUser.monetizationStatus === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {currentUser.monetizationStatus === 'APPROVED' ? <CheckCircleIcon className="w-5 h-5" /> : <span className="text-xs font-black">2</span>}
                    </div>
                    <div className="flex-grow">
                        <h5 className="text-sm font-black uppercase text-gray-800 dark:text-gray-200">{t('request_review')}</h5>
                        <p className="text-xs text-gray-500 font-medium font-medium">{t('request_review_desc')}</p>
                        
                        {!currentUser.monetizationStatus || currentUser.monetizationStatus === 'INELIGIBLE' ? (
                            <button 
                                onClick={handleApply}
                                disabled={loading || !isEligible || !goals.termsAccepted}
                                className={`mt-4 px-8 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-lg ${
                                    isEligible && goals.termsAccepted
                                    ? 'bg-blue-600 text-white shadow-blue-600/20 active:scale-95 cursor-pointer' 
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 shadow-none cursor-not-allowed'
                                }`}
                            >
                                {isEligible ? t('send_request') : <><LockClosedIcon className="w-3.5 h-3.5" /> {t('pending_goals')}</>}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl shadow-blue-600/20">
                <CurrencyDollarIcon className="w-10 h-10 text-blue-200 mb-4" />
                <h4 className="text-xl font-black uppercase mb-2">Shopping</h4>
                <p className="text-xs font-medium text-blue-100 leading-relaxed mb-6">{t('shop_monetization_desc')}</p>
                <button 
                    onClick={() => onNavigate('manage-store')}
                    className="bg-white text-blue-600 px-6 py-2.5 rounded-2xl font-black uppercase text-[10px] hover:shadow-lg transition-all"
                >
                    {t('create_my_store')}
                </button>
          </div>
          <div className="bg-gradient-to-br from-pink-600 to-purple-700 p-8 rounded-[40px] text-white shadow-xl shadow-pink-600/20 px-8">
                <SparklesIcon className="w-10 h-10 text-pink-200 mb-4" />
                <h4 className="text-xl font-black uppercase mb-2">{t('tier_benefits')}</h4>
                <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-white/50" />
                        <span className="text-[10px] font-black uppercase">Revenue Share: 70%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-white/50" />
                        <span className="text-[10px] font-black uppercase">{t('priority_withdrawals')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-white/50" />
                        <span className="text-[10px] font-black uppercase">{t('verification_badge')}</span>
                    </div>
                </div>
          </div>
      </div>

      <div className="mt-20 text-center">
            <h5 className="text-lg font-black uppercase text-gray-900 dark:text-white mb-2 tracking-tight">{t('transparency_title')}</h5>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mb-8">{t('transparency_desc')}</p>
            <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full">
                    <CheckBadgeIcon className="w-4 h-4 text-blue-500" /> {t('monthly_payments')}
                </div>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full">
                    <CheckBadgeIcon className="w-4 h-4 text-blue-500" /> {t('vip_support')}
                </div>
            </div>
      </div>
      {/* Modal de Saque */}
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
                    className="relative w-full max-w-md bg-white dark:bg-darkcard rounded-[40px] p-8 shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white">
                                <WalletIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black uppercase text-gray-900 dark:text-white tracking-tight">{t('confirm_withdrawal')}</h3>
                        </div>
                        <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <CheckCircleIcon className="w-6 h-6 text-gray-300" />
                        </button>
                    </div>

                    <form onSubmit={handleWithdrawRequest} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('withdraw_amount')}</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">KZ</span>
                                <input 
                                    type="number" 
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-white/5 rounded-[20px] focus:ring-2 focus:ring-blue-500 outline-none text-xl font-black dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('bank_details_iban')}</label>
                            <textarea 
                                value={paymentDetails}
                                onChange={(e) => setPaymentDetails(e.target.value)}
                                placeholder={t('withdraw_placeholder')}
                                className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-[20px] focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium dark:text-white min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-600/10 rounded-2xl flex items-start gap-3">
                            <InformationCircleIcon className="w-5 h-5 text-blue-500 shrink-0" />
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase leading-relaxed">
                                {t('withdrawal_process_notice')}
                            </p>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 text-white rounded-[20px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto" /> : t('confirm_withdrawal')}
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
