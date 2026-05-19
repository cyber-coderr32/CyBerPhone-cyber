import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowLeftIcon, ShieldCheckIcon, DocumentTextIcon, CheckBadgeIcon, LockClosedIcon } from '@heroicons/react/24/solid';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onBack: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const { t } = useTranslation();

  const isTerms = type === 'terms';
  const title = isTerms ? t('terms_of_use_title') : t('privacy_policy_title');
  const content = isTerms ? t('terms_of_use_content') : t('privacy_policy_content');

  const sections = isTerms ? [
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
  ] : [
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
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c10] pt-12 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-gray-500 hover:text-brand font-bold transition-all uppercase text-[10px] tracking-widest"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>{t('back_to_app')}</span>
        </motion.button>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white dark:bg-[#12161f] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 sm:p-12 border-b border-gray-100 dark:border-white/5 bg-gradient-to-br from-gray-50/50 to-white dark:from-white/5 dark:to-[#12161f]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-brand/10 rounded-2xl">
                {isTerms ? <DocumentTextIcon className="w-8 h-8 text-brand" /> : <ShieldCheckIcon className="w-8 h-8 text-brand" />}
              </div>
              <div>
                <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">{t('landing_legal')}</p>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{title}</h1>
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
                transition={{ delay: 0.1 * idx }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-white/10">
                    {section.icon}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{section.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                    {section.text}
                  </p>
                </div>
              </motion.div>
            ))}

            <div className="pt-8 border-t border-gray-100 dark:border-white/5">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-2">{t('legal_last_updated')}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
                {t('legal_contact_support')}
              </p>
            </div>
          </div>
        </motion.div>
        
        <div className="mt-8 text-center">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">CyBerPhone Digital Network &copy; 2024</p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
