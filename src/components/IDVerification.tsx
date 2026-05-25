import React, { useState } from 'react';
import { User } from '../types';
import { updateUser, checkFieldUniqueness, registerUniqueness } from '../services/storageService';
import { 
    FingerPrintIcon, 
    IdentificationIcon, 
    CheckCircleIcon,
    ArrowRightOnRectangleIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';

interface IDVerificationProps {
  user: User;
  onComplete: () => void;
  onLogout: () => void;
  forceUpdate?: boolean;
  onSkip?: () => void;
}

const IDVerification: React.FC<IDVerificationProps> = ({ user, onComplete, onLogout, forceUpdate, onSkip }) => {
    const { showAlert } = useDialog();
    const [step, setStep] = useState<'welcome' | 'input_doc' | 'sumsub' | 'success'>('welcome');
    
    // States
    const [documentIdProposed, setDocumentIdProposed] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isValidatingDocId, setIsValidatingDocId] = useState(false);
    
    // Sumsub Custom Web SDK Integration States
    const [sumsubConfig, setSumsubConfig] = useState<{ simulated: boolean; token: string } | null>(null);
    const [sumsubError, setSumsubError] = useState<string | null>(null);
    const [sumsubLoading, setSumsubLoading] = useState(false);

    // Launch Sumsub SDK
    const launchRealSumsub = (accessToken: string) => {
        try {
            const w = window as any;
            if (!w.snsWebSdk) {
                setSumsubError("SDK do Sumsub não foi carregado corretamente.");
                return;
            }
            
            const snsWebSdkInstance = w.snsWebSdk.init(
                accessToken,
                () => {
                    return fetch('/api/sumsub-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id })
                    })
                    .then(res => res.json())
                    .then(data => data.token);
                }
            )
            .withConf({
                lang: 'pt',
                email: user.email,
                uiConf: {
                    customCssStr: ":root { --sns-brand-color: #0070f3; }"
                }
            })
            .on('onStepCompleted', (payload: any) => {
                console.log('[Sumsub SDK] Passo concluído:', payload);
            })
            .on('onMessage', (type: any, payload: any) => {
                console.log('[Sumsub SDK] Mensagem recebida:', type, payload);
            })
            .onActionResult(async (result: any) => {
                console.log('[Sumsub SDK] Ação:', result);
                if (result.action === 'SUBMITTED' || result.action === 'APPROVED') {
                    const isApproved = result.action === 'APPROVED';
                    
                    // Register uniqueness in firebase
                    if (documentIdProposed) {
                        try {
                            await registerUniqueness('documentId', documentIdProposed, user.id);
                        } catch (uniqErr) {
                            console.error("Erro ao registrar unicidade:", uniqErr);
                        }
                    }
                    
                    const updatedUser: User = {
                        ...user,
                        idVerificationStatus: isApproved ? 'APPROVED' : 'PENDING',
                        isVerified: isApproved,
                        documentId: documentIdProposed,
                        idVerificationDocs: {
                            frontUrl: 'sumsub_sdk',
                            backUrl: 'sumsub_sdk',
                            selfieUrl: 'sumsub_sdk',
                            submittedAt: Date.now(),
                            rejectionReason: ""
                        }
                    };
                    await updateUser(updatedUser);
                    setStep('success');
                }
            })
            .build();

            snsWebSdkInstance.launch('#sumsub-container');
        } catch (err: any) {
            console.error(err);
            setSumsubError("Erro ao iniciar o widget do Sumsub: " + err.message);
        }
    };

    const initSumsub = async () => {
        setSumsubLoading(true);
        setSumsubError(null);
        setSumsubConfig(null);
        
        try {
            const response = await fetch('/api/sumsub-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Não foi possível conectar ao provedor do Sumsub.");
            }
            
            const data = await response.json();
            
            if (data.simulated) {
                throw new Error("O modo de simulação está desativado pelo administrador. É obrigatório configurar credenciais reais do Sumsub.");
            }

            setSumsubConfig(data);

            // Real Sumsub flow - inject Web SDK script dynamically
            const w = window as any;
            if (!w.snsWebSdk) {
                const script = document.createElement('script');
                script.src = "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";
                script.async = true;
                script.onload = () => {
                    setSumsubLoading(false);
                    setTimeout(() => launchRealSumsub(data.token), 200);
                };
                script.onerror = () => {
                    setSumsubLoading(false);
                    setSumsubError("Não foi possível carregar os recursos do SDK web do Sumsub.");
                };
                document.head.appendChild(script);
            } else {
                setSumsubLoading(false);
                setTimeout(() => launchRealSumsub(data.token), 200);
            }
        } catch (err: any) {
            setSumsubLoading(false);
            setSumsubError(err.message || "Falha na comunicação com o backend Sumsub.");
        }
    };

    const handleVerifyDocIdUniqueness = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const cleanDocId = documentIdProposed.trim();
        if (!cleanDocId) {
            setErrorMsg("Por favor, digite o número do seu documento.");
            return;
        }

        setIsValidatingDocId(true);
        try {
            const isUnique = await checkFieldUniqueness('documentId', cleanDocId);
            if (!isUnique) {
                setErrorMsg("Duplicidade de Documento: Este documento já está registrado no sistema por outro utilizador. Não é permitida a duplicidade de documentos.");
                setIsValidatingDocId(false);
                return;
            }

            // Se for único, avançamos para o widget do sumsub
            setStep('sumsub');
            setTimeout(() => {
                initSumsub();
            }, 100);
        } catch (err) {
            console.error(err);
            setErrorMsg("Erro ao validar unicidade do documento. Tente novamente.");
        } finally {
            setIsValidatingDocId(false);
        }
    };

    if (user.idVerificationStatus === 'PENDING') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-2xl border dark:border-white/10 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowPathIcon className="h-10 w-10 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-2">Verificação em Análise</h2>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                        Recebemos seus dados e documentos. Nossa equipe de segurança juntamente com a inteligência da Sumsub está analisando seus dados para garantir a integridade da sua conta.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20 mb-8">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tempo estimado de resposta rápido</p>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="w-full py-4 border-2 border-gray-100 dark:border-white/5 text-gray-400 hover:text-red-500 hover:border-red-500 rounded-2xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" /> Sair da Conta
                    </button>
                </div>
            </div>
        );
    }

    if (user.idVerificationStatus === 'REJECTED') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-2xl border border-red-100 dark:border-red-900/20 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-2">Verificação Recusada</h2>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-4">
                        Infelizmente a verificação de segurança não foi aprovada pela plataforma do Sumsub.
                    </p>
                    {user.idVerificationDocs?.rejectionReason && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl mb-8">
                            <p className="text-xs font-bold text-red-600 font-sans">Motivo: {user.idVerificationDocs.rejectionReason}</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => {
                                setStep('welcome');
                            }}
                            className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"
                        >
                            Tentar Novamente
                        </button>
                        <button 
                            onClick={onLogout}
                            className="w-full py-4 text-gray-400 hover:text-red-500 font-black uppercase text-xs transition-colors"
                        >
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-10 rounded-[3rem] shadow-2xl border dark:border-white/10 text-center">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-8"
                    >
                        <CheckCircleIcon className="h-12 w-12 text-green-600" />
                    </motion.div>
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter mb-4">Verificação Enviada!</h2>
                    <p className="text-gray-500 font-medium mb-4 leading-relaxed">
                        Sua documentação e biometria facial foram recebidas com sucesso. O selo azul de verificado foi ativado para seu perfil.
                    </p>
                    <button 
                        onClick={onComplete}
                        className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
                    >
                        Entrar no App
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-4 md:p-10">
            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 animate-fade-in">
                
                {/* Left Side: Info */}
                <div className="flex flex-col justify-center space-y-8">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-4 py-2 rounded-full mb-6">
                            <ShieldCheckIcon className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest font-sans">Segurança Real CyBerPhone</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black dark:text-white tracking-tighter leading-[0.95] mb-6">
                            {forceUpdate ? "RENOVE SUA" : "VERIFIQUE SUA"} <span className="text-brand">IDENTIDADE</span>
                        </h1>
                        <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed font-sans">
                            {forceUpdate 
                                ? "Seus documentos expiraram ou necessitam de validação. Para continuar utilizando todos os recursos e monetização, envie seus dados atualizados reais."
                                : "Nossa rede preza pela segurança máxima. Sem simulações ou duplicidades. Todos os perfis passam por validações autênticas contra fraudes de dados."}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-5">
                            <div className="w-12 h-12 bg-white dark:bg-darkcard rounded-2xl shadow-lg flex items-center justify-center shrink-0 border dark:border-white/5">
                                <DocumentTextIcon className="h-6 w-6 text-brand" />
                            </div>
                            <div>
                                <h4 className="font-black dark:text-white uppercase text-xs tracking-tight">Privacidade Total e Sem Simulação</h4>
                                <p className="text-xs text-gray-400 font-medium font-sans">Seus dados e documentos passam por infraestrutura criptografada segura real do Sumsub.</p>
                            </div>
                        </div>
                        <div className="flex gap-5">
                            <div className="w-12 h-12 bg-white dark:bg-darkcard rounded-2xl shadow-lg flex items-center justify-center shrink-0 border dark:border-white/5">
                                <IdentificationIcon className="h-6 w-6 text-brand" />
                            </div>
                            <div>
                                <h4 className="font-black dark:text-white uppercase text-xs tracking-tight">Registro Único contra Duplicidades</h4>
                                <p className="text-xs text-gray-400 font-medium font-sans">Cada indivíduo só pode portar uma única conta verficiada na plataforma.</p>
                            </div>
                        </div>
                        <div className="flex gap-5">
                            <div className="w-12 h-12 bg-white dark:bg-darkcard rounded-2xl shadow-lg flex items-center justify-center shrink-0 border dark:border-white/5">
                                <FingerPrintIcon className="h-6 w-6 text-brand" />
                            </div>
                            <div>
                                <h4 className="font-black dark:text-white uppercase text-xs tracking-tight">Acesso Completo ao App</h4>
                                <p className="text-xs text-gray-400 font-medium font-sans">Bolsa, carteira virtual, monetização e feed liberados após aprovação.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center flex-wrap">
                        <button 
                            onClick={onLogout}
                            className="w-fit flex items-center gap-2 text-gray-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors"
                        >
                            <ArrowRightOnRectangleIcon className="h-4 w-4" /> Sair do App
                        </button>
                        {onSkip && (
                            <>
                                <span className="text-gray-300 dark:text-white/10">|</span>
                                <button 
                                    onClick={() => {
                                        localStorage.setItem(`cp_skip_verification_${user.id}`, 'true');
                                        sessionStorage.setItem(`cp_skip_verification_${user.id}`, 'true');
                                        localStorage.setItem('cp_skip_verification', 'true');
                                        sessionStorage.setItem('cp_skip_verification', 'true');
                                        if (onSkip) onSkip();
                                        onComplete();
                                    }}
                                    className="w-fit flex items-center gap-2 text-brand hover:text-brand/80 font-black uppercase text-[10px] tracking-widest transition-colors font-sans"
                                >
                                    Pular por enquanto
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="bg-white dark:bg-darkcard p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border dark:border-white/10 relative overflow-hidden flex flex-col justify-center min-h-[450px]">
                    <AnimatePresence mode="wait">
                        {step === 'welcome' && (
                            <motion.div 
                                key="step-welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">O que você vai precisar?</h3>
                                    <ul className="space-y-4">
                                        <li className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                                            <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center shrink-0">1</div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold dark:text-gray-300">BI, RG, Passaporte ou CNH</span>
                                                <span className="text-[10px] text-brand font-black uppercase tracking-tighter">O documento deve estar válido e nítido</span>
                                            </div>
                                        </li>
                                        <li className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                                            <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                                            <span className="text-sm font-bold dark:text-gray-300">Biometria Facial (Liveness Test)</span>
                                        </li>
                                        <li className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                                            <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center shrink-0">3</div>
                                            <span className="text-sm font-bold dark:text-gray-300">Número de Identificação Único do Documento</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => {
                                            setStep('input_doc');
                                        }}
                                        className="w-full py-5 bg-brand hover:bg-brand/90 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ShieldCheckIcon className="h-5 w-5" /> Começar Verificação
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'input_doc' && (
                            <motion.div 
                                key="step-input_doc"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Etapa 1: Número do Documento</h3>
                                    <p className="text-xs text-gray-400 font-sans">
                                        Antes de iniciarmos o canal Sumsub KYC, digite o número do documento que será validado. Ele permanecerá único em nosso banco de dados impedindo duplicidades.
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyDocIdUniqueness} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cédula ID / CPF / BI / RG / Passaporte</label>
                                        <input 
                                            type="text"
                                            required
                                            value={documentIdProposed}
                                            onChange={(e) => setDocumentIdProposed(e.target.value)}
                                            placeholder="Ex: 004561234LA045"
                                            className="w-full p-5 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-brand rounded-2xl dark:text-white outline-none font-black text-sm transition-all"
                                        />
                                    </div>

                                    {errorMsg && (
                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 rounded-xl flex gap-3 text-red-600 dark:text-red-400">
                                            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                                            <p className="text-xs font-semibold font-sans">{errorMsg}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button 
                                            type="button"
                                            onClick={() => setStep('welcome')}
                                            className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 rounded-xl font-bold uppercase text-[10px]"
                                        >
                                            Voltar
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={isValidatingDocId}
                                            className="flex-[2] py-4 bg-brand text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                        >
                                            {isValidatingDocId ? (
                                                <>
                                                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                    Validando...
                                                </>
                                            ) : (
                                                "Confirmar e Prosseguir"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {step === 'sumsub' && (
                            <motion.div 
                                key="step-sumsub"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 w-full"
                            >
                                <div className="flex items-center gap-3 border-b dark:border-white/10 pb-4">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                        <ShieldCheckIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold dark:text-white leading-none">Canal Sumsub KYC</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Verificação Oficial Real</p>
                                    </div>
                                </div>

                                {sumsubLoading && (
                                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                                        <ArrowPathIcon className="h-10 w-10 text-blue-600 animate-spin" />
                                        <div>
                                            <p className="font-bold dark:text-white">Conectando ao Sumsub...</p>
                                            <p className="text-xs text-gray-400 font-sans">Carregando ambiente seguro anti-fraudes</p>
                                        </div>
                                    </div>
                                )}

                                {sumsubError && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-2xl space-y-4">
                                        <div className="flex gap-3 text-red-600">
                                            <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
                                            <div>
                                                <h4 className="font-bold uppercase text-xs">Erro na Conexão</h4>
                                                <p className="text-xs text-red-500/80 mt-1 font-sans">{sumsubError}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setStep('input_doc')}
                                                className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl font-black uppercase text-[10px]"
                                            >
                                                Mudar Documento
                                            </button>
                                            <button 
                                                onClick={initSumsub}
                                                className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-wider"
                                            >
                                                Tentar Novamente
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Real Sumsub Container targeting mounting */}
                                {!sumsubLoading && !sumsubError && sumsubConfig && (
                                    <div id="sumsub-container" className="min-h-[380px] border dark:border-white/10 rounded-2xl bg-gray-50 dark:bg-black/25 p-4 overflow-hidden">
                                        {/* Loaded real sumsub Web SDK widget will build automatically inside this node */}
                                    </div>
                                )}

                                {!sumsubLoading && (
                                    <button 
                                        onClick={() => {
                                            setStep('input_doc');
                                            setSumsubError(null);
                                        }}
                                        className="w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-400 dark:text-gray-300 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
                                    >
                                        Cancelar e Voltar
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default IDVerification;
