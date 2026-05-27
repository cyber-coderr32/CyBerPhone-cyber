import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, GroupTheme } from '../types';
import { updateUser, uploadFile, deleteUser, updateUserPassword, saveCurrentUser } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { checkContent } from '../services/sentinelService';
import { COUNTRIES } from '../data/countries';
import { auth, isFirebaseConfigured } from '../services/firebaseClient';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';
import { Github } from 'lucide-react';
import { requestNotificationPermission, showNotification } from '../services/notificationService';
import { 
  UserIcon, 
  PaintBrushIcon, 
  ArrowLeftIcon, 
  CreditCardIcon, 
  CheckIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  CameraIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  LockOpenIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  LifebuoyIcon,
  LanguageIcon,
  GlobeAltIcon,
  ArrowDownTrayIcon,
  NoSymbolIcon,
  BellIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import ConfirmationModal, { ConfirmationType } from './ConfirmationModal';

interface SettingsPageProps {
  currentUser: User;
  onNavigate: (page: any) => void;
  darkMode: boolean;
  toggleTheme: () => void;
  refreshUser: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  appTheme: GroupTheme;
  onThemeChange: (theme: GroupTheme) => void;
}

const THEMES: { id: GroupTheme; labelKey: string; color: string }[] = [
    { id: 'blue', labelKey: 'settings_theme_blue', color: 'bg-blue-500' },
    { id: 'green', labelKey: 'settings_theme_green', color: 'bg-emerald-500' },
    { id: 'black', labelKey: 'settings_theme_black', color: 'bg-zinc-900' },
    { id: 'orange', labelKey: 'settings_theme_orange', color: 'bg-orange-500' }
];

const LANGUAGES = [
    { id: 'pt', label: 'Português (Brasil)', flag: '🇧🇷' },
    { id: 'en', label: 'English (US)', flag: '🇺🇸' },
    { id: 'es', label: 'Español (ES)', flag: '🇪🇸' },
    { id: 'fr', label: 'Français (FR)', flag: '🇫🇷' },
    { id: 'zh', label: 'Chinese (简体中文)', flag: '🇨🇳' }
];

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  currentUser, 
  onNavigate, 
  darkMode, 
  toggleTheme, 
  refreshUser, 
  onLogout, 
  onDeleteAccount, 
  appTheme, 
  onThemeChange
}) => {
  const { t, i18n } = useTranslation();
  const { showAlert } = useDialog();
  const [view, setView] = useState<'main' | 'edit-profile' | 'appearance' | 'language'>('main');
  
  const [firstName, setFirstName] = useState(currentUser.firstName);
  const [lastName, setLastName] = useState(currentUser.lastName);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [profilePicture, setProfilePicture] = useState(currentUser.profilePicture || '');
  const [coverPhoto, setCoverPhoto] = useState(currentUser.coverPhoto || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [country, setCountry] = useState(currentUser.country || '');
  
  const [birthDate, setBirthDate] = useState(() => {
    const d = new Date(currentUser.birthDate);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert(t('settings_select_image'), { type: 'error' });
        return;
      }
      setIsUploading(true);
      try {
        const url = await uploadFile(file, 'profiles');
        setProfilePicture(url);
        
        // Auto-save immediately to Firestore so they don't lose the photo on reload
        const updatedUserRaw = { ...currentUser, profilePicture: url };
        await updateUser(updatedUserRaw);
        await refreshUser();
        showAlert(t('settings_profile_picture_updated', 'Foto de perfil atualizada no banco de dados!'), { type: 'success' });
      } catch (err) {
        showAlert(t('settings_upload_error'), { type: 'error' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert(t('settings_select_image'), { type: 'error' });
        return;
      }
      setIsUploadingCover(true);
      try {
        const url = await uploadFile(file, 'covers');
        setCoverPhoto(url);
        
        // Auto-save immediately to Firestore so they don't lose the photo on reload
        const updatedUserRaw = { ...currentUser, coverPhoto: url };
        await updateUser(updatedUserRaw);
        await refreshUser();
        showAlert(t('settings_cover_updated_success', 'Foto de capa atualizada no banco de dados!'), { type: 'success' });
      } catch (err) {
        showAlert(t('settings_cover_upload_error'), { type: 'error' });
      } finally {
        setIsUploadingCover(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || isUploadingCover) {
      showAlert(t('settings_upload_in_progress', 'Por favor, aguarde o upload terminar'), { type: 'warning' });
      return;
    }
    setIsSaving(true);
    
    try {
      // Sentinel AI Check for Bio
      if (bio.trim()) {
        const sentinelResult = await checkContent(bio.trim(), 'bio');
        if (!sentinelResult.isSafe) {
          showAlert(sentinelResult.reason || t('settings_bio_blocked'), { type: 'error', title: t('settings_sentinel_title') });
          setIsSaving(false);
          return;
        }
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          showAlert(t('settings_password_min_length'), { type: 'error' });
          setIsSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          showAlert(t('settings_passwords_mismatch'), { type: 'error' });
          setIsSaving(false);
          return;
        }
        await updateUserPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      const updatedUser: User = { 
          ...currentUser, 
          firstName, 
          lastName, 
          email,
          phone,
          bio, 
          profilePicture,
          coverPhoto,
          country,
          birthDate: new Date(birthDate).getTime()
      };
      
      await updateUser(updatedUser);
      await refreshUser();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(safeJsonStringify(err));
      showAlert(t('settings_save_error'), { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
        setIsSaving(true);
        await deleteUser(currentUser.id);
        saveCurrentUser(null);
        setShowDeleteConfirm(false);
        onDeleteAccount();
    } catch (error) {
        console.error("Erro ao deletar conta:", safeJsonStringify(error));
        showAlert(t('settings_delete_error'), { type: 'error' });
        setIsSaving(false);
        setShowDeleteConfirm(false);
    }
  };

  if (view === 'language') {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 pb-20 max-w-2xl animate-fade-in">
        <div className="flex items-center gap-6 mb-10">
          <button onClick={() => setView('main')} className="p-3 bg-white dark:bg-darkcard rounded-2xl shadow-md text-gray-400 hover:text-brand transition-all"><ArrowLeftIcon className="h-6 w-6" /></button>
          <h2 className="text-4xl font-black dark:text-white tracking-tighter">{t('idioma_do_sistema')}</h2>
        </div>

        <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 space-y-6">
          <p className="text-xs text-gray-400 dark:text-gray-400 font-bold leading-relaxed">{t('settings_global_platform')}</p>
          
          <div className="space-y-3">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => i18n.changeLanguage(lang.id)}
                className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between font-bold text-sm select-none ${i18n.language === lang.id ? 'bg-brand/10 border-brand text-brand' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{lang.flag}</span>
                  <span>{lang.label}</span>
                </div>
                {i18n.language === lang.id && <CheckIcon className="h-5 w-5 text-brand stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'appearance') {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 pb-20 max-w-2xl animate-fade-in">
        <div className="flex items-center gap-6 mb-10">
          <button onClick={() => setView('main')} className="p-3 bg-white dark:bg-darkcard rounded-2xl shadow-md text-gray-400 hover:text-brand transition-all"><ArrowLeftIcon className="h-6 w-6" /></button>
          <h2 className="text-4xl font-black dark:text-white tracking-tighter">{t('visual_e_estilo')}</h2>
        </div>

        <div className="space-y-8">
          {/* MODO ESCURO */}
          <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-black text-sm uppercase dark:text-white tracking-tight">{t('settings_dark_mode_inverted', 'Modo Escuro')}</p>
              <p className="text-xs text-gray-400 font-bold">{t('settings_dark_mode_inverted_desc', 'Inverter cores para ambientes escuros')}</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-14 h-8 rounded-full transition-colors relative flex items-center p-1 ${darkMode ? 'bg-brand' : 'bg-gray-200'}`}
            >
              <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* PALETA DE CORES */}
          <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 space-y-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('settings_color_theme', 'Tema de Cores')}</p>
            <div className="grid grid-cols-2 gap-4">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onThemeChange(theme.id)}
                  className={`p-6 rounded-[2rem] border transition-all text-left space-y-4 ${appTheme === theme.id ? 'bg-brand/10 border-brand' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'}`}
                >
                  <div className={`w-10 h-10 rounded-2xl ${theme.color} flex items-center justify-center text-white shadow-lg`}>
                    {appTheme === theme.id && <CheckIcon className="h-5 w-5 stroke-[3]" />}
                  </div>
                  <div>
                    <p className="font-black text-xs uppercase dark:text-white tracking-wider">{t(theme.labelKey)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'edit-profile') {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 pb-20 max-w-4xl animate-fade-in">
        <div className="flex items-center gap-6 mb-10">
          <button onClick={() => setView('main')} className="p-3 bg-white dark:bg-darkcard rounded-2xl shadow-md text-gray-400 hover:text-brand transition-all"><ArrowLeftIcon className="h-6 w-6" /></button>
          <h2 className="text-4xl font-black dark:text-white tracking-tighter">{t('editar_perfil_senha')}</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-8">
          {/* IDENTIDADE VISUAL */}
          <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <CameraIcon className="h-4 w-4 text-brand" /> {t('settings_visual_identity')}
              </p>
              <span className="text-[8px] font-black uppercase tracking-wider text-brand bg-brand/10 dark:bg-brand/20 px-3 py-1 rounded-full">
                {t('custom_assets', 'Imagens da Conta')}
              </span>
            </div>
            
            {/* Outer relative container without overflow-hidden so overlapping avatar is never clipped */}
            <div className="relative mb-14">
              
              {/* Cover Photo Container (handled overflow-hidden inside) */}
              <div className="relative h-48 md:h-60 rounded-[2.5rem] bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 overflow-hidden group shadow-inner">
                {coverPhoto ? (
                  <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex items-center justify-center">
                    <p className="text-white/30 text-[10px] font-extrabold uppercase tracking-widest">{t('no_cover_photo', 'Sem foto de capa')}</p>
                  </div>
                )}
                
                {isUploadingCover ? (
                  <div className="absolute inset-x-0 inset-y-0 h-full w-full bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#ffe07a] animate-pulse">Enviando Capa...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute bottom-4 right-4 px-4.5 py-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl text-[9px] font-black uppercase text-white tracking-widest shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <CameraIcon className="h-4 w-4 text-white" />
                    {t('settings_change_cover')}
                  </button>
                )}
                <input type="file" ref={coverInputRef} onChange={handleCoverChange} className="hidden" accept="image/*" />
              </div>
              
              {/* Overlapping Avatar Container (visible in full, no overflow-hidden) */}
              <div className="absolute -bottom-10 left-6 md:left-10 z-10 flex items-end gap-5 select-none">
                <div className="relative group w-24 h-24 md:w-28 md:h-28 rounded-[2rem] border-[5px] border-white dark:border-darkcard bg-gray-200 dark:bg-zinc-800 shadow-2xl overflow-hidden transition-transform duration-300 hover:scale-[1.03]">
                  <img src={profilePicture || DEFAULT_PROFILE_PIC} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-1"
                    >
                      <CameraIcon className="h-5.5 w-5.5 text-white animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-wider">Mudar</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                
                {/* Visual Label text on the side */}
                <div className="mb-2.5 hidden sm:block">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 leading-none">Foto de Perfil</p>
                  <p className="text-[9px] text-gray-400 mt-1">{t('settings_click_to_change')}</p>
                </div>
              </div>
            </div>
            
            <div className="sm:hidden mt-12 mb-2 px-1">
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">{t('settings_click_to_change')}</p>
            </div>
          </div>

          {/* DADOS PESSOAIS */}
          <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 space-y-6">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-brand" /> {t('settings_personal_data')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('first_name', 'Nome')}</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold border border-transparent focus:border-brand outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('last_name', 'Sobrenome')}</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold border border-transparent focus:border-brand outline-none transition-all" 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('bio', 'Bio')}</label>
                <textarea 
                  value={bio} 
                  onChange={e => setBio(e.target.value)}
                  placeholder={t('settings_bio_placeholder')}
                  maxLength={160}
                  className="w-full p-4 h-24 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold border border-transparent focus:border-brand outline-none transition-all resize-none shadow-none" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('settings_country_residence')}</label>
                <select 
                  value={country} 
                  onChange={e => setCountry(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold border border-transparent focus:border-brand outline-none transition-all"
                >
                  <option value="" className="text-gray-400">{t('select_country', 'Selecionar País')}</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code} className="dark:bg-zinc-900">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('birth_date', 'Data de Nascimento')}</label>
                <div className="relative">
                  <CalendarDaysIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="date" 
                    value={birthDate} 
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full p-4 pl-12 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold border border-transparent focus:border-brand outline-none transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DADOS DE INSCRIÇÃO / CADASTRO */}
          <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <EnvelopeIcon className="h-4 w-4 text-brand" /> {t('settings_registration_data')}
              </p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                {currentUser.isAdmin ? (
                  <><LockOpenIcon className="h-3 w-3 text-green-500" /> {t('settings_admin_access')}</>
                ) : (
                  <><LockClosedIcon className="h-3 w-3" /> {t('settings_sensitive_data')}</>
                )}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('settings_email_address')}</label>
                <div className="relative">
                  <EnvelopeIcon className={`h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 ${currentUser.isAdmin ? 'text-brand' : 'text-gray-300'}`} />
                  <input 
                    type="text" 
                    disabled={!currentUser.isAdmin} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full p-4 pl-12 rounded-2xl font-bold border ${currentUser.isAdmin ? 'bg-white dark:bg-white/5 dark:text-white border-transparent focus:border-brand' : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-100 dark:border-white/5'}`} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('phone')}</label>
                <div className="relative">
                  <PhoneIcon className={`h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 ${currentUser.isAdmin ? 'text-brand' : 'text-gray-300'}`} />
                  <input 
                    type="text" 
                    disabled={!currentUser.isAdmin} 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    className={`w-full p-4 pl-12 rounded-2xl font-bold border ${currentUser.isAdmin ? 'bg-white dark:bg-white/5 dark:text-white border-transparent focus:border-brand' : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-100 dark:border-white/5'}`} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEGURANÇA E SENHA */}
          <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <LockClosedIcon className="h-3.5 w-3.5 text-brand" /> {t('security_and_password', 'Segurança e Senha')}
              </p>
              {isFirebaseConfigured && auth?.currentUser?.providerData?.some(p => p.providerId === 'google.com') && (
                <span className="bg-blue-500/15 border border-blue-500/20 text-blue-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                  {t('google_linked', 'Conta Google Vinculada')}
                </span>
              )}
            </div>

            {isFirebaseConfigured && auth?.currentUser?.providerData?.some(p => p.providerId === 'google.com') && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] leading-relaxed text-blue-600 dark:text-blue-400 font-bold">
                {t('google_linked_help_password', 'Como entrou através do Google, sua conta pode não possuir uma senha definida aqui. Você pode criar uma senha abaixo caso queira fazer login direto com seu e-mail e senha no futuro!')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
                  {isFirebaseConfigured && auth?.currentUser?.providerData?.some(p => p.providerId === 'google.com') ? t('create_new_password', 'Criar Nova Senha') : t('new_password_optional', 'Nova Senha (opcional)')}
                </label>
                <div className="relative">
                  <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="password" 
                    placeholder={t('password_min_length_help', 'Mínimo 6 caracteres')}
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-4 pl-12 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold border border-transparent focus:border-brand outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('confirm_new_password', 'Confirmar Nova Senha')}</label>
                <div className="relative">
                  <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="password" 
                    placeholder={t('repeat_new_password', 'Repita a nova senha')}
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full p-4 pl-12 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold border border-transparent focus:border-brand outline-none transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving || isUploading} 
            className="w-full py-6 bg-brand hover:bg-brandHover text-white rounded-[2.2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-3 border-white border-t-transparent animate-spin rounded-full"></div>
            ) : (
              <><CheckIcon className="h-6 w-6 stroke-[3]" /> {t('settings_save_changes')}</>
            )}
          </button>
        </form>
      </div>
    );
  }

  const sections = [
    {
      titleKey: 'identidade_digital',
      items: [
        { id: 'profile', labelKey: 'editar_perfil_senha', descKey: 'nome_bio_photo_e_seguranca', icon: UserIcon, onClick: () => setView('edit-profile') },
        { id: 'appearance', labelKey: 'visual_e_estilo', descKey: 'cores_e_modo_dark', icon: PaintBrushIcon, onClick: () => setView('appearance') },
        { 
          id: 'notifications',
          labelKey: 'notificacoes_no_celular', 
          descKey: 'alerta_na_barra_de_tarefas', 
          icon: BellIcon, 
          onClick: async () => {
            const granted = await requestNotificationPermission();
            if (granted) {
              showNotification(t('notifications_activated') || "Notificações Ativadas!", { body: t('notifications_activated_desc') || "Você agora receberá alertas de vendas e mensagens aqui." });
              showAlert(t('notifications_activated_success') || "Notificações ativadas com sucesso!", { type: 'success' });
            } else {
              showAlert(t('notifications_denied') || "Permissão negada ou não suportada no navegador.", { type: 'error' });
            }
          } 
        },
        { id: 'blocked', labelKey: 'usuarios_bloqueados', descKey: 'gerenciar_lista_negra', icon: NoSymbolIcon, onClick: () => onNavigate('blocked-users') },
        { id: 'language', labelKey: 'idioma_do_sistema', descKey: 'alterar_linguagem_global', icon: LanguageIcon, onClick: () => setView('language') },
        { 
          id: 'id-verification',
          labelKey: 'verificacao_de_identidade', 
          descKey: currentUser.idVerificationStatus === 'APPROVED' ? 'conta_verificada' : 'gerenciar_documentos', 
          icon: ShieldCheckIcon, 
          onClick: () => {
              if (currentUser.idVerificationStatus === 'APPROVED') {
                  showAlert(t('settings_verified_success'), { type: 'success', title: t('settings_verified') });
              } else {
                  onNavigate('id-verification');
              }
          } 
        }
      ]
    },
    {
      titleKey: 'sistema_seguranca',
      items: [
        { id: 'help', labelKey: 'ajuda_e_suporte', descKey: 'abrir_tickets_e_resolver_problemas', icon: LifebuoyIcon, onClick: () => onNavigate('support') },
        { id: 'logout', labelKey: 'sair_da_conta', descKey: 'desconectar_dispositivo', icon: ArrowRightOnRectangleIcon, onClick: onLogout }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 pt-24 pb-20 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-6 mb-10">
        <button onClick={() => onNavigate('profile')} className="p-3 bg-white dark:bg-darkcard rounded-2xl shadow-md text-gray-400 hover:text-brand transition-all"><ArrowLeftIcon className="h-6 w-6" /></button>
        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{t('settings')}</h2>
      </div>

      <div className="space-y-10">
        {sections.map(section => (
          <div key={section.titleKey}>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-4">{t(section.titleKey)}</h3>
            <div className="bg-white dark:bg-darkcard rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden">
              {section.items.map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={item.onClick}
                  className={`p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${idx !== section.items.length - 1 ? 'border-b border-gray-50 dark:border-white/10' : ''}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 rounded-2xl bg-brand/10 text-brand">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-black text-sm dark:text-white uppercase tracking-tight">{t(item.labelKey)}</p>
                      <p className="text-xs text-gray-400 font-bold">{t(item.descKey)}</p>
                    </div>
                  </div>
                  <ChevronDownIcon className="h-5 w-5 text-gray-300 -rotate-90" />
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="mt-10 px-4 bg-red-50 dark:bg-red-900/10 p-8 rounded-[3rem] border border-red-100 dark:border-red-900/20">
           <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              <h3 className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-widest">{t('danger_zone')}</h3>
           </div>
           <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium mb-6 leading-relaxed">
              {t('delete_account_warning')}
           </p>
           
           <div className="flex flex-col gap-6">
               <button 
                 onClick={() => setShowDeleteConfirm(true)} 
                 disabled={isSaving}
                 className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-red-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                  {isSaving ? (
                      <>{t('processing_deletion')}</>
                  ) : (
                      <><TrashIcon className="h-4 w-4" /> {t('delete_my_account')}</>
                  )}
               </button>

               <div className="text-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer select-none">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
                     CyBerPhone v1.3.3 (Stable)
                     {currentUser.isAdmin && <span className="text-red-500 ml-2">ROOT ACCESS</span>}
                  </p>
               </div>
           </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title={t('settings_delete_account_title')}
        message={t('settings_delete_account_message')}
        confirmText={t('settings_delete_account_confirm')}
        type={ConfirmationType.DANGER}
        loading={isSaving}
      />
    </div>
  );
};

export default SettingsPage;
