import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, GroupTheme } from '../types';
import { updateUser, uploadFile, deleteUser, updateUserPassword, saveCurrentUser } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { checkContent } from '../services/sentinelService';
import { COUNTRIES } from '../data/countries';
import { isFirebaseConfigured } from '../services/firebaseClient';
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
      } catch (err) {
        showAlert(t('settings_cover_upload_error'), { type: 'error' });
      } finally {
        setIsUploadingCover(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
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
            <h2 className="text-4xl font-black dark:text-white tracking-tighter">{t('language')}</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border dark:border-white/10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{t('language_selection')}</p>
                <div className="space-y-3">
                    {LANGUAGES.map(lang => (
                        <button 
                          key={lang.id}
                          onClick={async () => {
                              i18n.changeLanguage(lang.id);
                              if (currentUser && currentUser.id) {
                                try {
                                  await updateUser({ ...currentUser, preferredLanguage: lang.id });
                                  refreshUser();
                                } catch (err) {
                                  console.error("Erro ao salvar idioma preferido:", safeJsonStringify(err));
                                }
                              }
                          }}
                          className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group ${i18n.language.startsWith(lang.id) ? 'border-brand bg-brand/5 shadow-lg' : 'border-gray-50 dark:border-white/5 hover:border-gray-200'}`}
                        >
                           <div className="flex items-center gap-4">
                              <span className="text-2xl">{lang.flag}</span>
                              <span className={`text-sm font-black uppercase tracking-tight ${i18n.language.startsWith(lang.id) ? 'text-brand' : 'text-gray-500 dark:text-gray-400'}`}>
                                 {lang.label}
                              </span>
                           </div>
                           {i18n.language.startsWith(lang.id) && (
                              <div className="bg-brand text-white p-1 rounded-full">
                                 <CheckIcon className="h-4 w-4" />
                              </div>
                           )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border dark:border-white/10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{t('settings_auto_translate')}</p>
                <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem]">
                  <div>
                    <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">{t('auto_translate_posts')}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{t('settings_auto_translate_desc')}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      const updatedUser: User = { ...currentUser, autoTranslateEnabled: !currentUser.autoTranslateEnabled };
                      await updateUser(updatedUser);
                      refreshUser();
                    }} 
                    className={`w-14 h-7 rounded-full transition-all relative ${currentUser.autoTranslateEnabled ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${currentUser.autoTranslateEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
            </div>

            <div className="p-6 bg-brand/5 dark:bg-white/5 rounded-[2rem] border border-dashed border-brand/20">
               <div className="flex gap-4">
                  <GlobeAltIcon className="h-8 w-8 text-brand shrink-0" />
                  <p className="text-xs text-brand/80 font-bold leading-relaxed">
                     {t('settings_global_platform')}
                  </p>
               </div>
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
            <h2 className="text-4xl font-black dark:text-white tracking-tighter">{t('settings_style')}</h2>
          </div>
          
          <div className="space-y-10">
            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border dark:border-white/10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{t('settings_color_theme')}</p>
                <div className="grid grid-cols-2 gap-4">
                    {THEMES.map(theme => (
                        <button 
                          key={theme.id}
                          onClick={() => onThemeChange(theme.id)}
                          className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${appTheme === theme.id ? 'border-brand bg-brand/5 shadow-xl' : 'border-gray-50 dark:border-white/5 hover:border-gray-200'}`}
                        >
                           <div className={`w-14 h-14 rounded-2xl ${theme.color} shadow-lg flex items-center justify-center`}>
                              {appTheme === theme.id && <CheckIcon className="h-7 w-7 text-white" />}
                           </div>
                           <span className={`text-xs font-black uppercase ${appTheme === theme.id ? 'text-brand' : 'text-gray-400'}`}>{t(theme.labelKey)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border dark:border-white/10 flex items-center justify-between">
                <div>
                    <p className="font-black text-sm dark:text-white uppercase tracking-tighter">{t('dark_mode')}</p>
                    <p className="text-xs text-gray-400 font-bold">{t('settings_dark_mode_inverted')}</p>
                </div>
                <button onClick={toggleTheme} className={`w-14 h-7 rounded-full transition-all relative ${darkMode ? 'bg-brand' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${darkMode ? 'right-1' : 'left-1'}`}></div>
                </button>
            </div>
          </div>
        </div>
    );
  }

  if (view === 'edit-profile') {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 pb-20 max-w-3xl animate-fade-in">
        <div className="flex items-center gap-6 mb-10">
          <button onClick={() => setView('main')} className="p-3 bg-white dark:bg-darkcard rounded-2xl shadow-md text-gray-400 hover:text-brand transition-all"><ArrowLeftIcon className="h-6 w-6" /></button>
          <h2 className="text-4xl font-black dark:text-white tracking-tighter">{t('settings_registration_data')}</h2>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-2xl flex items-center gap-3 animate-fade-in">
             <CheckIcon className="h-5 w-5 text-green-600" />
             <p className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">{t('settings_profile_updated')}</p>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-8">
           <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border dark:border-white/10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 ml-1">{t('settings_visual_identity')}</p>
              <div className="flex flex-col items-center gap-6">
                  {/* Cover Photo */}
                  <div className="w-full h-32 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 relative group cursor-pointer border-2 border-dashed border-gray-200 dark:border-white/10" onClick={() => coverInputRef.current?.click()}>
                     {coverPhoto ? (
                        <img src={coverPhoto} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                           <CameraIcon className="h-8 w-8" />
                        </div>
                     )}
                     {isUploadingCover && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                           <div className="w-8 h-8 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                        </div>
                     )}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <p className="text-white text-[10px] font-black uppercase">{t('settings_change_cover')}</p>
                     </div>
                     <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="relative group cursor-pointer -mt-16"
                  >
                    <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-darkcard shadow-2xl transition-transform group-hover:scale-105 relative">
                     {profilePicture ? (
                        <img src={profilePicture} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                     ) : (
                        <img src={DEFAULT_PROFILE_PIC} className="w-full h-full object-cover opacity-50" alt="Default Profile" referrerPolicy="no-referrer" />
                     )}
                       {isUploading && (
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                           <div className="w-8 h-8 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                         </div>
                       )}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <CameraIcon className="h-10 w-10 text-white" />
                       </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-brand text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-darkcard">
                       <PaintBrushIcon className="h-4 w-4" />
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                 </div>
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('settings_click_to_change')}</p>
              </div>
           </div>

           <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border dark:border-white/10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 ml-1">{t('settings_personal_data')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('first_name')}</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white outline-none border-2 border-transparent focus:border-brand font-black" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('last_name')}</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white outline-none border-2 border-transparent focus:border-brand font-black" />
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('birth_date')}</label>
                    <div className="relative">
                       <CalendarDaysIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                       <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white outline-none border-2 border-transparent focus:border-brand font-bold" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('bio')}</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t('settings_bio_placeholder')} className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-[2rem] dark:text-white outline-none border-2 border-transparent focus:border-brand font-medium h-32 resize-none" />
                 </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">{t('settings_country_residence')}</label>
                    <div className="relative">
                       <GlobeAltIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                       <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white outline-none border-2 border-transparent focus:border-brand font-bold appearance-none cursor-pointer">
                          {COUNTRIES.map((c: any) => (
                            <option key={`${c.code}-${c.name}`} value={c.name}>{c.name} {c.flag}</option>
                          ))}
                       </select>
                       <ChevronDownIcon className="h-5 w-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                 </div>
              </div>
           </div>

           <div className={`bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border transition-all ${currentUser.isAdmin ? 'border-green-500/20 shadow-green-500/10' : 'border-gray-200 dark:border-white/10 opacity-90'}`}>
              <div className="flex items-center justify-between mb-6">
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
  };

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
                  onNavigate('feed');
                  showAlert(t('settings_verification_in_progress'), { type: 'alert' });
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
