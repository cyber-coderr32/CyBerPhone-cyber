import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  ArrowLeftIcon, 
  ShieldCheckIcon, 
  DocumentTextIcon, 
  CheckBadgeIcon, 
  LockClosedIcon,
  CircleStackIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/solid';

interface LegalPageProps {
  type: 'terms' | 'privacy' | 'refund';
  onBack: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'refund'>(type);

  const getTabLabel = (tab: 'terms' | 'privacy' | 'refund') => {
    const isEn = i18n.language && i18n.language.startsWith('en');
    if (tab === 'terms') return isEn ? 'Terms of Use' : 'Termos de Uso';
    if (tab === 'privacy') return isEn ? 'Privacy Policy' : 'Privacidade';
    return isEn ? 'Refunds & Returns' : 'Reembolso & Devoluções';
  };

  const getTabIcon = (tab: 'terms' | 'privacy' | 'refund') => {
    if (tab === 'terms') return <DocumentTextIcon className="w-4 h-4" />;
    if (tab === 'privacy') return <LockClosedIcon className="w-4 h-4" />;
    return <CheckBadgeIcon className="w-4 h-4" />;
  };

  const title = activeTab === 'terms' 
    ? t('terms_of_use_title') 
    : activeTab === 'privacy' 
      ? t('privacy_policy_title') 
      : t('refund_policy_title');

  const content = activeTab === 'terms' 
    ? t('terms_of_use_content') 
    : activeTab === 'privacy' 
      ? t('privacy_policy_content') 
      : t('refund_policy_content');

  const sections = activeTab === 'terms' ? [
    {
      icon: <DocumentTextIcon className="w-6 h-6 text-brand" />,
      title: t('legal_terms_s1_title'),
      text: t('legal_terms_s1_text')
    },
    {
      icon: <CheckBadgeIcon className="w-6 h-6 text-brand" />,
      title: t('legal_terms_s2_title'),
      text: t('legal_terms_s2_text')
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-brand" />,
      title: t('legal_terms_s3_title'),
      text: t('legal_terms_s3_text')
    },
    {
      icon: <DocumentTextIcon className="w-6 h-6 text-brand" />,
      title: t('legal_terms_s4_title'),
      text: t('legal_terms_s4_text')
    },
    {
      icon: <CheckBadgeIcon className="w-6 h-6 text-brand" />,
      title: t('legal_terms_s5_title'),
      text: t('legal_terms_s5_text')
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-brand" />,
      title: t('legal_terms_s6_title'),
      text: t('legal_terms_s6_text')
    }
  ] : activeTab === 'privacy' ? [
    {
      icon: <LockClosedIcon className="w-6 h-6 text-brand" />,
      title: t('legal_privacy_s1_title'),
      text: t('legal_privacy_s1_text')
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-brand" />,
      title: t('legal_privacy_s2_title'),
      text: t('legal_privacy_s2_text')
    },
    {
      icon: <DocumentTextIcon className="w-6 h-6 text-brand" />,
      title: t('legal_privacy_s3_title'),
      text: t('legal_privacy_s3_text')
    },
    {
      icon: <LockClosedIcon className="w-6 h-6 text-brand" />,
      title: t('legal_privacy_s4_title'),
      text: t('legal_privacy_s4_text')
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-brand" />,
      title: t('legal_privacy_s5_title'),
      text: t('legal_privacy_s5_text')
    },
    {
      icon: <DocumentTextIcon className="w-6 h-6 text-brand" />,
      title: t('legal_privacy_s6_title'),
      text: t('legal_privacy_s6_text')
    }
  ] : [
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-brand" />,
      title: t('legal_refund_s1_title'),
      text: t('legal_refund_s1_text')
    },
    {
      icon: <CheckBadgeIcon className="w-6 h-6 text-brand" />,
      title: t('legal_refund_s2_title'),
      text: t('legal_refund_s2_text')
    },
    {
      icon: <DocumentTextIcon className="w-6 h-6 text-brand" />,
      title: t('legal_refund_s3_title'),
      text: t('legal_refund_s3_text')
    },
    {
      icon: <CircleStackIcon className="w-6 h-6 text-brand" />,
      title: t('legal_refund_s4_title'),
      text: t('legal_refund_s4_text')
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-brand" />,
      title: t('legal_refund_s5_title'),
      text: t('legal_refund_s5_text')
    },
    {
      icon: <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-brand" />,
      title: t('legal_refund_s6_title'),
      text: t('legal_refund_s6_text')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c10] pt-12 pb-20 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-brand dark:hover:text-white font-black transition-all uppercase text-[10px] tracking-widest cursor-pointer self-start"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>{t('back_to_app')}</span>
          </motion.button>

          {/* Quick Support Link WhatsApp */}
          <motion.a
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            href="https://wa.me/244926815124"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all cursor-pointer self-start sm:self-auto shadow-md"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.503-5.714-1.458L0 24zm6.59-11.1c-.222-.224-.442-.44-.664-.652-.227-.216-.411-.47-.565-.75-.36-.653-.33-1.423.076-2.049.25-.385.578-.71.963-.956.126-.081.272-.119.418-.11l.462.015c.182.005.358.067.502.178.21.162.404.346.58.55.222.256.347.585.348.926-.002.433-.213.84-.567 1.096l-.372.268c-.18.13-.245.367-.156.568.324.72.778 1.378 1.332 1.932a6.38 6.38 0 0 0 1.932 1.332c.2.089.438.024.568-.156l.268-.372c.256-.354.663-.565 1.096-.567.34-.001.67.124.926.348.204.175.388.37.55.58.111.144.173.32.178.502l.015.462c.01.146-.029.292-.11.418-.246.385-.57.713-.956.963-.626.406-1.396.436-2.049.076-.28-.154-.534-.338-.75-.565l-.652-.664c-1.748-1.565-3.056-3.565-3.79-5.78z"/>
            </svg>
            WhatsApp Suporte
          </motion.a>
        </div>

        {/* Dynamic Legal Select Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex bg-white dark:bg-[#12161f] p-1.5 rounded-[1.5rem] mb-6 shadow-sm border border-gray-100 dark:border-white/5 gap-1.5"
        >
          {(['terms', 'privacy', 'refund'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === tab ? 'bg-brand text-white shadow-lg shadow-brand/20 scale-[1.02]' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              {getTabIcon(tab)}
              <span className="hidden sm:inline">{getTabLabel(tab)}</span>
              <span className="sm:hidden">{tab === 'terms' ? 'Termos' : tab === 'privacy' ? 'Privacidade' : 'Reembolsos'}</span>
            </button>
          ))}
        </motion.div>

        {/* Core Document view */}
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
           className="bg-white dark:bg-[#12161f] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 sm:p-12 border-b border-gray-100 dark:border-white/5 bg-gradient-to-br from-gray-50/50 to-white dark:from-white/5 dark:to-[#12161f]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-brand/10 rounded-2xl">
                {activeTab === 'terms' ? (
                  <DocumentTextIcon className="w-8 h-8 text-brand" />
                ) : activeTab === 'privacy' ? (
                  <LockClosedIcon className="w-8 h-8 text-brand" />
                ) : (
                  <CheckBadgeIcon className="w-8 h-8 text-[#10b981]" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">{t('landing_legal')}</p>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{title}</h1>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl">
              {content}
            </p>
          </div>

          {/* Body */}
          <div className="p-8 sm:p-12 space-y-12">
            {sections.map((section, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-white/10">
                    {section.icon}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{section.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                    {section.text}
                  </p>
                </div>
              </motion.div>
            ))}

            <div className="pt-8 border-t border-gray-100 dark:border-white/5">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-2">{t('legal_last_updated')}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
                {t('legal_contact_support')} {i18n.language && i18n.language.startsWith('en') ? 'Or talk to us on WhatsApp:' : 'Ou fale connosco no WhatsApp:'}{' '}
                <a href="https://wa.me/244926815124" target="_blank" rel="noopener noreferrer" className="text-emerald-500 font-bold hover:underline">
                  +244 926815124
                </a>
              </p>
            </div>
          </div>
        </motion.div>
        
        <div className="mt-8 text-center flex flex-col items-center gap-2">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">CyBerPhone Digital Network &copy; 2026</p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
