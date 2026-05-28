
import React, { useState, useRef } from 'react';
import { safeJsonStringify } from '../lib/utils';
import { User, Page } from '../types';
import { loginUser, registerUser, saveCurrentUser, recoverPassword, loginWithGoogle } from '../services/storageService';
import { COUNTRIES } from '../data/countries';
import { AcademicCapIcon, UserIcon, CameraIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, PhoneIcon, EnvelopeIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';

import { useTranslation } from 'react-i18next';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (page: Page) => void;
}

const LANGUAGES = [
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'zh', name: 'Chinese', flag: '🇨🇳' },
];

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onNavigate }) => {
  const { t, i18n } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [usePhone, setUsePhone] = useState(true);
  const [confirmIdentifier, setConfirmIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  const [birthDay, setBirthDay] = useState('1');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthYear, setBirthYear] = useState('2000');
  const [gender, setGender] = useState<'Masculino' | 'Feminino' | 'Personalizado' | ''>('');
  const [country, setCountry] = useState('');
  
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const currentLang = LANGUAGES.find(l => i18n.language.startsWith(l.id)) || LANGUAGES[0];

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const getFriendlyErrorMessage = (error: any) => {
    let code = error?.code || '';
    let message = error?.message || '';

    // Direct JSON-like check on string representation to capture nested errors
    try {
      const errString = typeof error === 'string' ? error : safeJsonStringify(error);
      if (errString && (errString.includes('auth/invalid-credential') || errString.includes('invalid-credential'))) {
        return t('auth_error_invalid_credentials');
      }
    } catch (_) {
      // Fallback
    }

    // If it's already a string, check if it's a JSON error representation
    if (typeof error === 'string') {
      if (error.startsWith('{')) {
        try {
          const parsed = JSON.parse(error);
          code = parsed.code || code;
          message = parsed.message || message;
          
          // Se for erro de credencial já no JSON, retorna logo a mensagem limpa
          if (code === 'auth/invalid-credential' || code === 'invalid-credential' || (message && (message.includes('auth/invalid-credential') || message.includes('invalid-credential')))) {
            return t('auth_error_invalid_credentials');
          }
        } catch (e) {
          return error;
        }
      } else {
        return error;
      }
    }

    // Check for our custom FirestoreErrorInfo in JSON string
    if (message && message.startsWith('{')) {
      try {
        const errInfo = JSON.parse(message);
        if (errInfo.error && (errInfo.error.includes('permissions') || errInfo.error.includes('permission-denied'))) {
          return t('auth_error_permission');
        }
        if (errInfo.error) return errInfo.error;
      } catch (e) {
        // Fallback
      }
    }

    if (!code && error?.customData?._tokenResponse?.error?.message === 'EMAIL_EXISTS') {
      code = 'auth/email-already-in-use';
    }
    
    if (code === 'auth/unauthorized-domain' || message.includes('auth/unauthorized-domain')) {
      return t('auth_error_network');
    }

    if (code === 'auth/unauthorized-continue-uri' || message.includes('auth/unauthorized-continue-uri')) {
      return t('auth_error_network');
    }

    if (code === 'auth/operation-not-allowed' || message.includes('auth/operation-not-allowed')) {
      return t('auth_error_operation_not_allowed');
    }

    if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use') || message.includes('EMAIL_EXISTS')) {
      return t('auth_error_email_in_use');
    }

    if (code === 'auth/invalid-credential' || code === 'invalid-credential' || message.includes('auth/invalid-credential') || message.includes('invalid-credential')) {
      return t('auth_error_invalid_credentials');
    }

    if (code === 'auth/operation-not-allowed' || message.includes('auth/operation-not-allowed')) {
      return t('auth_error_operation_not_allowed');
    }
    
    if (code === 'auth/user-not-found' || message.includes('auth/user-not-found')) return t('auth_error_user_not_found');
    if (code === 'auth/wrong-password' || message.includes('auth/wrong-password')) return t('auth_error_wrong_password');
    if (code === 'auth/weak-password' || message.includes('auth/weak-password')) return t('auth_error_weak_password');
    if (code === 'auth/invalid-email' || message.includes('auth/invalid-email')) return t('auth_error_invalid_email');
    if (code === 'auth/network-request-failed' || message.includes('auth/network-request-failed')) return t('auth_error_network');
    if (code === 'auth/too-many-requests' || message.includes('auth/too-many-requests')) return t('auth_error_too_many_requests');
    if (code === 'auth/user-disabled') return t('auth_error_user_disabled');
    if (code === 'auth/popup-closed-by-user' || message.includes('auth/popup-closed-by-user')) return t('auth_error_popup_closed');
    
    // Default fallback
    const finalMessage = message.replace('Firebase: ', '').replace('Error ', '');
    return finalMessage || t('auth_error_default');
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!identifier) {
      setError(t('auth_error_recovery_email'));
      return;
    }

    const emailToRecover = identifier.includes('@') ? identifier : `${identifier}@cyberphone.com`;
    
    setLoading(true);
    try {
      await recoverPassword(emailToRecover);
      setRecoverySent(true);
      setSuccess(t('auth_success_recovery_sent'));
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRecovering) {
      handleRecoverPassword(e);
      return;
    }
    
    if (!identifier || !password) {
      setError(t('auth_fill_credentials'));
      return;
    }

    if (isRegister) {
      if (!firstName || !lastName || !gender) {
        setError(t('auth_error_fill_fields') || "Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      if (identifier !== confirmIdentifier) {
        setError(t('auth_error_mismatch') || "Os e-mails/telefones não coincidem.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay)).getTime();
        
        // Se for e-mail, usa como e-mail. Se for número, podemos tratar ou usar como e-mail fake se necessário.
        // Para simplificar, assumimos que o identifier é o e-mail principal.
        const newUser = await registerUser({
          firstName,
          lastName,
          email: identifier.includes('@') ? identifier : `${identifier}@cyberphone.com`,
          phone: identifier.includes('@') ? '' : identifier,
          password,
          birthDate,
          gender,
          country,
          profileImageFile
        });
        if (newUser) {
          onLoginSuccess(newUser);
        } else {
          setError(t('auth_error_create_profile'));
        }
      } else {
        const emailToLogin = identifier.includes('@') ? identifier : `${identifier}@cyberphone.com`;
        const user = await loginUser(emailToLogin, password);
        if (user) {
          onLoginSuccess(user);
        } else {
          setError(t('auth_error_create_profile'));
        }
      }
    } catch (err: any) {
      const friendlyError = getFriendlyErrorMessage(err);
      setError(friendlyError);
      
      // Se o e-mail já estiver em uso, sugere login mudando a aba
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('auth/email-already-in-use')) {
        setTimeout(() => {
          setIsRegister(false);
          setIsRecovering(false);
          setError(t('auth_email_in_use_redirect'));
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    t('jan'), t('feb'), t('mar'), t('apr'), t('may'), t('jun'),
    t('jul'), t('aug'), t('sep'), t('oct'), t('nov'), t('dec')
  ];
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10] font-sans transition-colors duration-500 overflow-y-auto"
         style={{ 
           paddingTop: 'var(--safe-top)', 
           paddingBottom: 'var(--safe-bottom)',
           paddingLeft: 'var(--safe-left)',
           paddingRight: 'var(--safe-right)'
         }}>
      
      {/* Decorative Background for Desktop */}
      <div className="hidden lg:block fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Language Selector Dropdown - Moved to bottom right to avoid blocking the logo */}
      <div className="fixed bottom-6 right-6 z-[100] flex justify-end">
        <div className="relative">
          <button 
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-black/60 shadow-2xl backdrop-blur-xl rounded-full border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95 group"
          >
            <span className="text-lg group-hover:rotate-12 transition-transform">{currentLang.flag}</span>
            <span className="hidden sm:inline font-black uppercase text-[10px] tracking-widest">{currentLang.name}</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-300 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showLanguageDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 bottom-full mb-4 w-52 bg-white/95 dark:bg-[#1a1f2c]/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-white/10 overflow-hidden z-[101]"
              >
                <div className="p-3 space-y-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        i18n.changeLanguage(lang.id);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-tight transition-all ${
                        currentLang.id === lang.id 
                          ? 'bg-brand text-white shadow-lg shadow-brand/20 scale-[1.02]' 
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:translate-x-1'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-[11px] font-black">{lang.name}</span>
                      </span>
                      {currentLang.id === lang.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-10 bg-white dark:bg-[#12161f] w-full max-w-lg rounded-none md:rounded-[2.5rem] shadow-none md:shadow-2xl border-0 md:border md:border-gray-100 md:dark:border-white/5 overflow-hidden transition-all duration-500 min-h-screen md:min-h-0 flex flex-col justify-center mt-12 md:mt-0">
        
        <div className="p-8 md:p-12">
          {isRecovering && (
            <button 
              onClick={() => { setIsRecovering(false); setError(''); setSuccess(''); }}
              className="mb-6 flex items-center gap-2 text-gray-400 hover:text-brand font-black uppercase text-[10px] tracking-widest transition-all"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>{t('back_to_login')}</span>
            </button>
          )}

          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 drop-shadow-sm uppercase">CyBerPhone</h1>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-relaxed px-6">
              {isRecovering 
                ? t('recover_password_desc')
                : isRegister 
                  ? t('register_welcome')
                  : t('welcome_back')
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold text-center">
              {error}
            </div>
          )}



          {success && (
            <div className="mb-6 p-4 bg-green-100/10 border border-green-500/20 text-green-500 rounded-2xl text-xs font-bold text-center">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRecovering ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                  {t('recover_password_desc')}
                </p>
                {usePhone ? (
                  <div className="phone-input-container">
                    <PhoneInput
                      country={'br'}
                      value={identifier}
                      onChange={phone => setIdentifier(phone)}
                      inputClass="!w-full !p-4 !bg-gray-100 !dark:bg-white/5 !rounded-2xl !text-gray-900 !dark:text-white !outline-none !border-2 !border-transparent !focus:border-[var(--brand-color)] !font-bold !transition-all !h-auto !text-base !pl-14"
                      buttonClass="!bg-transparent !border-0 !rounded-l-2xl !pl-3"
                      dropdownClass="!bg-white !dark:bg-[#12161f] !text-gray-900 !dark:text-white !rounded-xl !shadow-2xl !overflow-y-auto !max-h-[220px] !border-gray-100 !dark:border-white/10"
                      placeholder={t('phone_label')}
                      masks={{ br: '(..) .....-....' }}
                      containerClass="!w-full"
                    />
                  </div>
                ) : (
                  <input 
                    type="email" 
                    placeholder={t('email_label')} 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" 
                  />
                )}
              </div>
            ) : (
              <>
                {isRegister && (
                  <>
                    <div className="flex justify-center mb-6">
                      <div 
                        onClick={() => profileImageInputRef.current?.click()}
                        className="w-24 h-24 rounded-[2rem] bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center cursor-pointer overflow-hidden group transition-all"
                        style={{ borderColor: 'var(--brand-color)', opacity: 0.8 }}
                      >
                        {profileImagePreview ? <img src={profileImagePreview} className="w-full h-full object-cover" /> : <CameraIcon className="h-8 w-8 text-gray-400 group-hover:text-[var(--brand-color)]" />}
                        <input type="file" ref={profileImageInputRef} onChange={handleProfileImageChange} className="hidden" accept="image/*" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input type="text" placeholder={t('first_name_label')} value={firstName} onChange={e => setFirstName(e.target.value)} className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" />
                      <input type="text" placeholder={t('last_name_label')} value={lastName} onChange={e => setLastName(e.target.value)} className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-center gap-4 mb-4">
                  <button 
                    type="button"
                    onClick={() => { setUsePhone(true); setIdentifier(''); setConfirmIdentifier(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${usePhone ? 'bg-brand text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
                  >
                    <PhoneIcon className="h-4 w-4" />
                    <span>{t('phone_label')}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setUsePhone(false); setIdentifier(''); setConfirmIdentifier(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!usePhone ? 'bg-brand text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    <span>{t('email_label')}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {usePhone ? (
                    <div className="phone-input-container">
                      <PhoneInput
                        country={'br'}
                        value={identifier}
                        onChange={phone => setIdentifier(phone)}
                        inputClass="!w-full !p-4 !bg-gray-100 !dark:bg-white/5 !rounded-2xl !text-gray-900 !dark:text-white !outline-none !border-2 !border-transparent !focus:border-[var(--brand-color)] !font-bold !transition-all !h-auto !text-base !pl-14"
                        buttonClass="!bg-transparent !border-0 !rounded-l-2xl !pl-3"
                        dropdownClass="!bg-white !dark:bg-[#12161f] !text-gray-900 !dark:text-white !rounded-xl !shadow-2xl !overflow-y-auto !max-h-[220px] !border-gray-100 !dark:border-white/10"
                        placeholder={t('auth_phone_placeholder')}
                        masks={{ br: '(..) .....-....' }}
                        containerClass="!w-full"
                      />
                    </div>
                  ) : (
                    <input 
                      type="email" 
                      placeholder={t('email_label')} 
                      value={identifier} 
                      onChange={e => setIdentifier(e.target.value)} 
                      className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" 
                    />
                  )}
                  
                  {isRegister && (
                    usePhone ? (
                      <div className="phone-input-container">
                        <PhoneInput
                          country={'br'}
                          value={confirmIdentifier}
                          onChange={phone => setConfirmIdentifier(phone)}
                          inputClass="!w-full !p-4 !bg-gray-100 !dark:bg-white/5 !rounded-2xl !text-gray-900 !dark:text-white !outline-none !border-2 !border-transparent !focus:border-[var(--brand-color)] !font-bold !transition-all !h-auto !text-base !pl-14"
                          buttonClass="!bg-transparent !border-0 !rounded-l-2xl !pl-3"
                          dropdownClass="!bg-white !dark:bg-[#12161f] !text-gray-900 !dark:text-white !rounded-xl !shadow-2xl !overflow-y-auto !max-h-[220px] !border-gray-100 !dark:border-white/10"
                          placeholder={t('confirm_email_phone')}
                          masks={{ br: '(..) .....-....' }}
                          containerClass="!w-full"
                        />
                      </div>
                    ) : (
                      <input 
                        type="email" 
                        placeholder={t('confirm_email_phone')} 
                        value={confirmIdentifier} 
                        onChange={e => setConfirmIdentifier(e.target.value)} 
                        className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" 
                      />
                    )
                  )}
                </div>

                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder={t('password_label')} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>

                {!isRegister && (
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => { setIsRecovering(true); setError(''); setSuccess(''); }}
                      className="text-[10px] font-black text-brand uppercase tracking-wider hover:underline"
                    >
                      {t('forgot_password')}
                    </button>
                  </div>
                )}

                {isRegister && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">{t('birth_date_label')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select value={birthDay} onChange={e => setBirthDay(e.target.value)} className="p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-[var(--brand-color)]">
                          {days.map(d => <option key={d} value={d} className="bg-white dark:bg-[#12161f]">{d}</option>)}
                        </select>
                        <select value={birthMonth} onChange={e => setBirthMonth(e.target.value)} className="p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-[var(--brand-color)]">
                          {months.map((m, i) => <option key={m} value={i + 1} className="bg-white dark:bg-[#12161f]">{m}</option>)}
                        </select>
                        <select value={birthYear} onChange={e => setBirthYear(e.target.value)} className="p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-[var(--brand-color)]">
                          {years.map(y => <option key={y} value={y} className="bg-white dark:bg-[#12161f]">{y}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">{t('gender_label')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${gender === 'Feminino' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={gender === 'Feminino' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${gender === 'Feminino' ? '' : 'text-gray-900 dark:text-white'}`}>{t('auth_gender_female')}</span>
                          <input type="radio" name="gender" value="Feminino" checked={gender === 'Feminino'} onChange={e => setGender(e.target.value as any)} className="hidden" />
                        </label>
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${gender === 'Masculino' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={gender === 'Masculino' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${gender === 'Masculino' ? '' : 'text-gray-900 dark:text-white'}`}>{t('auth_gender_male')}</span>
                          <input type="radio" name="gender" value="Masculino" checked={gender === 'Masculino'} onChange={e => setGender(e.target.value as any)} className="hidden" />
                        </label>
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${gender === 'Personalizado' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={gender === 'Personalizado' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${gender === 'Personalizado' ? '' : 'text-gray-900 dark:text-white'}`}>{t('auth_gender_other')}</span>
                          <input type="radio" name="gender" value="Personalizado" checked={gender === 'Personalizado'} onChange={e => setGender(e.target.value as any)} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">{t('country_label')}</label>
                      <select 
                        value={country} 
                        onChange={e => setCountry(e.target.value)} 
                        className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:border-[var(--brand-color)] appearance-none cursor-pointer"
                      >
                        {COUNTRIES.map((c: any) => (
                          <option key={`${c.code}-${c.name}`} value={c.name} className="bg-white dark:bg-[#12161f]">{c.name} {c.flag}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {isRegister && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center px-4 leading-relaxed mt-4 font-medium uppercase tracking-tight">
                    {t('terms_agreement')}
                  </p>
                )}
              </>
            )}

            <button 
               type="submit" 
               disabled={loading} 
               className="w-full py-5 text-white rounded-3xl font-black uppercase text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 relative z-10"
               style={{ backgroundColor: 'var(--brand-color)' }}
            >
              {loading ? <ArrowPathIcon className="h-6 w-6 animate-spin" /> : (
                isRecovering 
                  ? t('recover_now') 
                  : isRegister ? t('create_my_account') : t('sign_in_to_network')
              )}
            </button>
            
            {!isRecovering && !isRegister && (
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-4 bg-white dark:bg-white/5 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 rounded-3xl font-bold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                <span>{t('google_login')}</span>
              </button>
            )}
          </form>


          {!isRecovering && (
            <div className="mt-8 text-center space-y-4">
              <button 
                onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }} 
                className="text-xs font-bold text-gray-500 hover:text-[var(--brand-color)] transition-colors uppercase tracking-widest block w-full"
              >
                {isRegister ? t('already_have_account') : t('new_here')}
              </button>

              <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 dark:border-white/5">
                <button onClick={() => onNavigate('terms')} className="text-[10px] font-black text-gray-400 hover:text-brand underline underline-offset-4 uppercase tracking-wider transition-all">{t('terms_of_use')}</button>
                <button onClick={() => onNavigate('privacy')} className="text-[10px] font-black text-gray-400 hover:text-brand underline underline-offset-4 uppercase tracking-wider transition-all">{t('privacy_policy')}</button>
                <button onClick={() => onNavigate('support')} className="text-[10px] font-black text-gray-400 hover:text-brand underline underline-offset-4 uppercase tracking-wider transition-all">{t('support')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
