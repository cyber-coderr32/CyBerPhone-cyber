
import React, { useState, useRef } from 'react';
import { User, Page } from '../types';
import { loginUser, registerUser, saveCurrentUser, recoverPassword } from '../services/storageService';
import { COUNTRIES } from '../data/countries';
import { AcademicCapIcon, UserIcon, CameraIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

import { useTranslation } from 'react-i18next';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (page: Page) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onNavigate }) => {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [confirmIdentifier, setConfirmIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  const [birthDay, setBirthDay] = useState('1');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthYear, setBirthYear] = useState('2000');
  const [gender, setGender] = useState<'Masculino' | 'Feminino' | 'Personalizado' | ''>('');
  const [country, setCountry] = useState('Angola');
  const [academicRole, setAcademicRole] = useState<'PROFESSOR' | 'ALUNO' | 'OUTRO'>('ALUNO');
  
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const getFriendlyErrorMessage = (error: any) => {
    const code = error.code || '';
    const message = error.message || '';
    
    if (code === 'auth/invalid-credential' || message.includes('auth/invalid-credential')) return 'E-mail ou senha incorretos.';
    if (code === 'auth/user-not-found' || message.includes('auth/user-not-found')) return 'Usuário não encontrado.';
    if (code === 'auth/wrong-password' || message.includes('auth/wrong-password')) return 'Senha incorreta.';
    if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use')) return 'Este e-mail ou celular já está em uso. Tente fazer login.';
    if (code === 'auth/weak-password' || message.includes('auth/weak-password')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (code === 'auth/invalid-email' || message.includes('auth/invalid-email')) return 'E-mail inválido.';
    if (code === 'auth/network-request-failed' || message.includes('auth/network-request-failed')) return 'Erro de conexão. Verifique sua internet.';
    if (code === 'auth/too-many-requests' || message.includes('auth/too-many-requests')) return 'Muitas tentativas. Tente novamente mais tarde.';
    
    return message || 'Ocorreu um erro na autenticação.';
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!identifier) {
      setError("Insira seu e-mail para recuperação.");
      return;
    }

    const emailToRecover = identifier.includes('@') ? identifier : `${identifier}@cyberphone.com`;
    
    setLoading(true);
    try {
      await recoverPassword(emailToRecover);
      setRecoverySent(true);
      setSuccess("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
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
      setError("Preencha e-mail/celular e senha.");
      return;
    }

    if (isRegister) {
      if (!firstName || !lastName || !gender) {
        setError("Preencha todos os campos obrigatórios.");
        return;
      }
      if (identifier !== confirmIdentifier) {
        setError("Os e-mails/celulares não coincidem.");
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
          academicRole,
          profileImageFile
        });
        if (newUser) {
          onLoginSuccess(newUser);
        } else {
          setError("Erro ao criar perfil do usuário.");
        }
      } else {
        const emailToLogin = identifier.includes('@') ? identifier : `${identifier}@cyberphone.com`;
        const user = await loginUser(emailToLogin, password);
        if (user) {
          onLoginSuccess(user);
        } else {
          setError("Erro ao carregar perfil do usuário.");
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
          setError('Este e-mail já está em uso. Por favor, faça login.');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
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

      <div className="relative z-10 bg-white dark:bg-[#12161f] w-full max-w-lg rounded-none md:rounded-[2.5rem] shadow-none md:shadow-2xl border-0 md:border md:border-gray-100 md:dark:border-white/5 overflow-hidden transition-all duration-500 min-h-screen md:min-h-0 flex flex-col justify-center">
        <div className="p-8 md:p-12">
          {isRecovering && (
            <button 
              onClick={() => { setIsRecovering(false); setError(''); setSuccess(''); }}
              className="mb-6 flex items-center gap-2 text-gray-500 hover:text-brand font-bold transition-all"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Voltar ao Login</span>
            </button>
          )}

          <div className="text-center mb-10">
            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 drop-shadow-sm">CyberPhone</h1>
            <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] leading-relaxed px-6">
              {isRecovering 
                ? "Recuperar sua senha"
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
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                  Digite o e-mail ou celular vinculado à sua conta. Enviaremos as instruções de recuperação.
                </p>
                <input 
                  type="text" 
                  placeholder="Celular ou e-mail" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" 
                />
              </>
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
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Nome" value={firstName} onChange={e => setFirstName(e.target.value)} className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" />
                      <input type="text" placeholder="Sobrenome" value={lastName} onChange={e => setLastName(e.target.value)} className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" />
                    </div>
                  </>
                )}

                <input 
                  type="text" 
                  placeholder="Celular ou e-mail" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" 
                />
                
                {isRegister && (
                  <input 
                    type="text" 
                    placeholder="Confirmar celular ou e-mail" 
                    value={confirmIdentifier} 
                    onChange={e => setConfirmIdentifier(e.target.value)} 
                    className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" 
                  />
                )}

                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--brand-color)] font-bold transition-all" />
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
                      Esqueceu sua senha?
                    </button>
                  </div>
                )}

                {isRegister && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Data de nascimento</label>
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
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Gênero</label>
                      <div className="grid grid-cols-3 gap-2">
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${gender === 'Feminino' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={gender === 'Feminino' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${gender === 'Feminino' ? '' : 'text-gray-900 dark:text-white'}`}>Feminino</span>
                          <input type="radio" name="gender" value="Feminino" checked={gender === 'Feminino'} onChange={e => setGender(e.target.value as any)} className="hidden" />
                        </label>
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${gender === 'Masculino' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={gender === 'Masculino' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${gender === 'Masculino' ? '' : 'text-gray-900 dark:text-white'}`}>Masculino</span>
                          <input type="radio" name="gender" value="Masculino" checked={gender === 'Masculino'} onChange={e => setGender(e.target.value as any)} className="hidden" />
                        </label>
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${gender === 'Personalizado' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={gender === 'Personalizado' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${gender === 'Personalizado' ? '' : 'text-gray-900 dark:text-white'}`}>Outro</span>
                          <input type="radio" name="gender" value="Personalizado" checked={gender === 'Personalizado'} onChange={e => setGender(e.target.value as any)} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Eu sou...</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${academicRole === 'ALUNO' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={academicRole === 'ALUNO' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${academicRole === 'ALUNO' ? '' : 'text-gray-900 dark:text-white'}`}>Aluno</span>
                          <input type="radio" name="academicRole" value="ALUNO" checked={academicRole === 'ALUNO'} onChange={e => setAcademicRole(e.target.value as any)} className="hidden" />
                        </label>
                        <label 
                           className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${academicRole === 'PROFESSOR' ? 'bg-brand/10' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}
                           style={academicRole === 'PROFESSOR' ? { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' } : {}}
                        >
                          <span className={`text-xs font-bold ${academicRole === 'PROFESSOR' ? '' : 'text-gray-900 dark:text-white'}`}>Professor</span>
                          <input type="radio" name="academicRole" value="PROFESSOR" checked={academicRole === 'PROFESSOR'} onChange={e => setAcademicRole(e.target.value as any)} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">País</label>
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
                    Ao clicar em criar conta, você declara ter lido e concordado com nossos{' '}
                    <button type="button" onClick={() => onNavigate('terms')} className="text-brand font-black hover:underline underline-offset-4">Termos de Uso</button>{' '}
                    e nossa{' '}
                    <button type="button" onClick={() => onNavigate('privacy')} className="text-brand font-black hover:underline underline-offset-4">Diretiva de Privacidade</button>.
                  </p>
                )}
              </>
            )}

            <button 
               type="submit" 
               disabled={loading} 
               className="w-full py-5 text-white rounded-3xl font-black uppercase text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
               style={{ backgroundColor: 'var(--brand-color)' }}
            >
              {loading ? <ArrowPathIcon className="h-6 w-6 animate-spin" /> : (
                isRecovering 
                  ? "Recuperar Agora" 
                  : isRegister ? 'Criar minha Conta' : 'Entrar na Rede'
              )}
            </button>
          </form>


          {!isRecovering && (
            <div className="mt-8 text-center space-y-4">
              <button 
                onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }} 
                className="text-xs font-bold text-gray-500 hover:text-[var(--brand-color)] transition-colors uppercase tracking-widest block w-full"
              >
                {isRegister ? 'Já tenho conta? Login' : 'Novo por aqui? Registrar'}
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
