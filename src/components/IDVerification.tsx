import React, { useState, useRef } from 'react';
import { User } from '../types';
import { uploadFile, updateUser, checkFieldUniqueness, registerUniqueness } from '../services/storageService';
import { verifyIdentityDocuments, extractIdFromDocument } from '../services/sentinelService';
import { 
    FingerPrintIcon, 
    IdentificationIcon, 
    CameraIcon, 
    CheckCircleIcon,
    ArrowRightOnRectangleIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon,
    DocumentTextIcon,
    CpuChipIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';

interface IDVerificationProps {
  user: User;
  onComplete: () => void;
  onLogout: () => void;
  forceUpdate?: boolean;
  onSkip?: () => void;
}

const IDVerification: React.FC<IDVerificationProps> = ({ user, onComplete, onLogout, forceUpdate, onSkip }) => {
    const { showAlert } = useDialog();
    const [step, setStep] = useState<'welcome' | 'upload' | 'selfie' | 'verifying' | 'success'>('welcome');
    const [isUploading, setIsUploading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [docFrontUrl, setDocFrontUrl] = useState<string | null>(null);
    const [docBackUrl, setDocBackUrl] = useState<string | null>(null);
    const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
    const [docFrontBase64, setDocFrontBase64] = useState<string | null>(null);
    const [docBackBase64, setDocBackBase64] = useState<string | null>(null);
    const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
    const [documentId, setDocumentId] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileFrontInputRef = useRef<HTMLInputElement>(null);
    const fileBackInputRef = useRef<HTMLInputElement>(null);
    const selfieInputRef = useRef<HTMLInputElement>(null);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleDocFrontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        setIsScanning(true);
        try {
            const base64 = await fileToBase64(file);
            setDocFrontBase64(base64);
            
            // Upload em paralelo com a extração por IA
            const [url, extractedId] = await Promise.all([
                uploadFile(file, 'verifications/docs_front'),
                extractIdFromDocument(base64)
            ]);
            
            setDocFrontUrl(url);
            if (extractedId) {
                setDocumentId(extractedId);
                showAlert("Número do documento detectado automaticamente!", { type: "success" });
            }
        } catch (err) {
            showAlert("Erro ao processar imagem. Tente novamente.", { type: "error" });
        } finally {
            setIsUploading(false);
            setIsScanning(false);
        }
    };

    const handleDocBackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        try {
            const base64 = await fileToBase64(file);
            setDocBackBase64(base64);
            const url = await uploadFile(file, 'verifications/docs_back');
            setDocBackUrl(url);
        } catch (err) {
            showAlert("Erro ao processar imagem. Tente novamente.", { type: "error" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        try {
            const base64 = await fileToBase64(file);
            setSelfieBase64(base64);
            const url = await uploadFile(file, 'verifications/selfies');
            setSelfieUrl(url);
        } catch (err) {
            showAlert("Erro ao processar imagem. Tente novamente.", { type: "error" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!docFrontUrl || !docBackUrl || !selfieUrl || !documentId || !docFrontBase64 || !docBackBase64 || !selfieBase64) {
            showAlert("Preencha todos os campos e envie as fotos.", { type: "error" });
            return;
        }

        setStep('verifying');
        try {
            // 1. Verificar unicidade do ID reclamado primeiro
            const isClaimedIdUnique = await checkFieldUniqueness('documentId', documentId);
            if (!isClaimedIdUnique) {
                setErrorMsg("Este número de documento já está vinculado a outra conta verficiada.");
                setStep('upload');
                return;
            }

            // IA Sentinela de Verificação Rigorosa
            const verification = await verifyIdentityDocuments(docFrontBase64, docBackBase64, selfieBase64, documentId);
            
            if (verification.approved && verification.expiryDate) {
                // 2. Verificar se o ID extraído pela IA também é único (caso seja diferente do reclamado)
                if (verification.extractedId && verification.extractedId !== documentId) {
                    const isExtractedIdUnique = await checkFieldUniqueness('documentId', verification.extractedId);
                    if (!isExtractedIdUnique) {
                        setErrorMsg("O documento detectado já está em uso por outro usuário.");
                        setStep('upload');
                        return;
                    }
                }

                // Parse AI date (YYYY-MM-DD)
                const [year, month, day] = verification.expiryDate.split('-').map(Number);
                const expiryTimestamp = new Date(year, month - 1, day).getTime();
                
                // Se o documento já estiver vencido hoje, não podemos aprovar
                if (expiryTimestamp < Date.now()) {
                    const updatedUser: User = {
                        ...user,
                        documentId: documentId,
                        idVerificationStatus: 'REJECTED',
                        idVerificationDocs: {
                            frontUrl: docFrontUrl,
                            backUrl: docBackUrl,
                            selfieUrl: selfieUrl,
                            submittedAt: Date.now(),
                            rejectionReason: "O documento enviado está fora do prazo de validade (vencido). Por favor, use um documento atualizado.",
                            aiConfidence: verification.confidence
                        }
                    };
                    await updateUser(updatedUser);
                    setErrorMsg("Seu documento está vencido.");
                    setStep('upload'); // Go back to fix
                    return;
                }

                // Registrar o ID na coleção de unicidade
                await registerUniqueness('documentId', verification.extractedId || documentId, user.id);

                const updatedUser: User = {
                    ...user,
                    documentId: verification.extractedId || documentId,
                    idVerificationStatus: 'APPROVED',
                    isVerified: true,
                    idVerificationDocs: {
                        frontUrl: docFrontUrl,
                        backUrl: docBackUrl,
                        selfieUrl: selfieUrl,
                        submittedAt: Date.now(),
                        expiresAt: expiryTimestamp,
                        aiConfidence: verification.confidence,
                        extractedId: verification.extractedId
                    }
                };
                await updateUser(updatedUser);
                setStep('success');
            } else {
                // Se a IA reprovar ou não conseguir ler a validade
                const reason = !verification.expiryDate 
                    ? "Não foi possível ler a data de validade no seu documento. Certifique-se de que o verso do documento está nítido e bem iluminado."
                    : verification.reason;

                const updatedUser: User = {
                    ...user,
                    documentId: documentId,
                    idVerificationStatus: 'REJECTED',
                    idVerificationDocs: {
                        frontUrl: docFrontUrl,
                        backUrl: docBackUrl,
                        selfieUrl: selfieUrl,
                        submittedAt: Date.now(),
                        rejectionReason: reason,
                        aiConfidence: verification.confidence
                    }
                };
                await updateUser(updatedUser);
                setErrorMsg(reason);
            }
        } catch (err) {
            console.error("Erro na verificação Sentinela - Enviando para análise manual:", safeJsonStringify(err));
            try {
                const pendingUser: User = {
                    ...user,
                    documentId: documentId,
                    idVerificationStatus: 'PENDING',
                    idVerificationDocs: {
                        frontUrl: docFrontUrl!,
                        backUrl: docBackUrl!,
                        selfieUrl: selfieUrl!,
                        submittedAt: Date.now(),
                        rejectionReason: "O servidor de IA teve uma instabilidade. Sua verificação será analisada manualmente pela nossa equipe."
                    }
                };
                await updateUser(pendingUser);
                setStep('success');
            } catch (updateErr) {
                showAlert("Erro ao salvar dados. Verifique sua conexão.", { type: "error" });
                setStep('selfie');
            }
        }
    };

    if (step === 'verifying') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-12 rounded-[3.5rem] shadow-2xl border dark:border-white/10 text-center">
                    <div className="relative w-32 h-32 mx-auto mb-10">
                        <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping"></div>
                        <div className="relative w-full h-full bg-brand rounded-full flex items-center justify-center shadow-xl shadow-brand/40">
                            <CpuChipIcon className="h-16 w-16 text-white animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter mb-4">IA Sentinela</h2>
                    <p className="text-gray-500 font-medium leading-relaxed mb-8">
                        Nossa inteligência artificial está analisando rigorosamente seus documentos e comparando com sua selfie. Este processo garante a segurança de toda a rede social.
                    </p>
                    <div className="space-y-4">
                        <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 15, ease: "linear" }}
                                className="h-full bg-brand"
                            />
                        </div>
                        <p className="text-[10px] font-black text-brand uppercase tracking-widest animate-pulse">Processando Biometria Facial...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (user.idVerificationStatus === 'PENDING') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-2xl border dark:border-white/10 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowPathIcon className="h-10 w-10 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-2">Verificação em Analise</h2>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                        Recebemos seus documentos! Nossa equipe de segurança está analisando seus dados para garantir que você é quem diz ser.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20 mb-8">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tempo estimado: 24h - 48h</p>
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
                        Infelizmente sua verificação não foi aprovada. Verifique se as fotos estão nítidas e os dados conferem com seu documento original.
                    </p>
                    {user.idVerificationDocs?.rejectionReason && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl mb-8">
                            <p className="text-xs font-bold text-red-600">Motivo: {user.idVerificationDocs.rejectionReason}</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => {
                                // Reset for retry
                                setStep('welcome');
                                // In a real app we might want to clear specific flags in Firestore here or just let the user re-submit
                                setStep('upload');
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
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter mb-4">Enviado com Sucesso!</h2>
                    <p className="text-gray-500 font-medium mb-4 leading-relaxed">
                        Sua documentação foi enviada e validada pela IA Sentinela.
                    </p>
                    {user.idVerificationDocs?.expiresAt && (
                        <div className="bg-brand/5 p-4 rounded-2xl mb-8 border border-brand/10">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Próxima Renovação</p>
                            <p className="text-lg font-black text-brand tracking-tighter">
                                {new Date(user.idVerificationDocs.expiresAt).toLocaleDateString('pt-AO')}
                            </p>
                        </div>
                    )}
                    <button 
                        onClick={onComplete}
                        className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
                    >
                        Entendi
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
                            <span className="text-[10px] font-black uppercase tracking-widest">Segurança CyBerPhone</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black dark:text-white tracking-tighter leading-[0.95] mb-6">
                            {forceUpdate ? "RENOVE SUA" : "VERIFIQUE SUA"} <span className="text-brand">IDENTIDADE</span>
                        </h1>
                        <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            {forceUpdate 
                                ? "Seus documentos de identificação expiraram. Para continuar usando todos os recursos do CyBerPhone, você precisa enviar fotos atualizadas."
                                : "Para manter a Cyber Social segura e real para todos os membros, solicitamos uma verificação única de identidade."}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-5">
                            <div className="w-12 h-12 bg-white dark:bg-darkcard rounded-2xl shadow-lg flex items-center justify-center shrink-0 border dark:border-white/5">
                                <DocumentTextIcon className="h-6 w-6 text-brand" />
                            </div>
                            <div>
                                <h4 className="font-black dark:text-white uppercase text-xs tracking-tight">Privacidade Total</h4>
                                <p className="text-xs text-gray-400 font-medium">Seus documentos são criptografados e nunca serão compartilhados.</p>
                            </div>
                        </div>
                        <div className="flex gap-5">
                            <div className="w-12 h-12 bg-white dark:bg-darkcard rounded-2xl shadow-lg flex items-center justify-center shrink-0 border dark:border-white/5">
                                <IdentificationIcon className="h-6 w-6 text-brand" />
                            </div>
                            <div>
                                <h4 className="font-black dark:text-white uppercase text-xs tracking-tight">Selo de Verificado</h4>
                                <p className="text-xs text-gray-400 font-medium">Ganhe o selo azul de autenticidade logo após a aprovação.</p>
                            </div>
                        </div>
                        <div className="flex gap-5">
                            <div className="w-12 h-12 bg-white dark:bg-darkcard rounded-2xl shadow-lg flex items-center justify-center shrink-0 border dark:border-white/5">
                                <FingerPrintIcon className="h-6 w-6 text-brand" />
                            </div>
                            <div>
                                <h4 className="font-black dark:text-white uppercase text-xs tracking-tight">Acesso Completo</h4>
                                <p className="text-xs text-gray-400 font-medium">Desbloqueie monetização, loja e funcionalidades premium.</p>
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
                        <span className="text-gray-300 dark:text-white/10">|</span>
                        <button 
                            onClick={() => {
                                sessionStorage.setItem('cp_skip_verification', 'true');
                                if (onSkip) onSkip();
                                onComplete();
                            }}
                            className="w-fit flex items-center gap-2 text-brand hover:text-brand/80 font-black uppercase text-[10px] tracking-widest transition-colors"
                        >
                            Pular por enquanto
                        </button>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="bg-white dark:bg-darkcard p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border dark:border-white/10 relative overflow-hidden">
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
                                            <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center">1</div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold dark:text-gray-300">BI (Frente e Verso), Passaporte ou Carta de Condução</span>
                                                <span className="text-[10px] text-brand font-black uppercase tracking-tighter">O documento deve estar dentro da validade</span>
                                            </div>
                                        </li>
                                        <li className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                                            <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center">2</div>
                                            <span className="text-sm font-bold dark:text-gray-300">Uma selfie nítida segurando o documento</span>
                                        </li>
                                        <li className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
                                            <div className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center">3</div>
                                            <span className="text-sm font-bold dark:text-gray-300">Número do documento (ID)</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => setStep('upload')}
                                        className="w-full py-6 bg-brand hover:bg-brand/90 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all"
                                    >
                                        Começar Verificação
                                    </button>

                                    <button 
                                        onClick={() => {
                                            sessionStorage.setItem('cp_skip_verification', 'true');
                                            if (onSkip) onSkip();
                                            onComplete();
                                        }}
                                        className="w-full py-4 border-2 border-gray-100 dark:border-white/5 hover:border-brand/50 dark:hover:border-brand/50 text-gray-400 dark:text-gray-300 hover:text-brand dark:hover:text-brand rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                                    >
                                        Pular e verificar mais tarde
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'upload' && (
                            <motion.div 
                                key="step-upload"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Dados do Documento</h3>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Número do Documento (ID)</label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                value={documentId}
                                                onChange={(e) => setDocumentId(e.target.value)}
                                                placeholder="Ex: 004561234LA045"
                                                className="w-full p-5 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-brand rounded-2xl dark:text-white outline-none font-black text-sm transition-all pr-12"
                                            />
                                            {isScanning && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <SparklesIcon className="h-5 w-5 text-brand animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                        {isScanning && (
                                            <p className="text-[8px] font-black text-brand uppercase tracking-widest animate-pulse ml-2">
                                                IA Sentinela: Extraindo dados do documento...
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Foto da Frente</label>
                                            <div 
                                                onClick={() => fileFrontInputRef.current?.click()}
                                                className="h-40 w-full border-4 border-dashed border-gray-100 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden group"
                                            >
                                                {docFrontUrl ? (
                                                    <img src={docFrontUrl} className="w-full h-full object-cover" alt="Doc Front" />
                                                ) : (
                                                    <>
                                                        <div className="p-3 bg-gray-100 dark:bg-white/10 rounded-2xl text-gray-400 group-hover:text-brand transition-colors">
                                                            <IdentificationIcon className="h-6 w-6" />
                                                        </div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase">Frente do Documento</p>
                                                    </>
                                                )}
                                                {(isUploading || isScanning) && (
                                                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center animate-fade-in gap-3">
                                                        <ArrowPathIcon className="h-8 w-8 text-white animate-spin" />
                                                        {isScanning && (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <p className="text-[10px] font-black text-brand uppercase tracking-widest animate-pulse">OCR Sentinela</p>
                                                                <p className="text-[8px] font-bold text-white/60 uppercase">Lendo Documento...</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <input type="file" ref={fileFrontInputRef} className="hidden" accept="image/*" onChange={handleDocFrontUpload} />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Foto do Verso</label>
                                            <div 
                                                onClick={() => fileBackInputRef.current?.click()}
                                                className="h-40 w-full border-4 border-dashed border-gray-100 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden group"
                                            >
                                                {docBackUrl ? (
                                                    <img src={docBackUrl} className="w-full h-full object-cover" alt="Doc Back" />
                                                ) : (
                                                    <>
                                                        <div className="p-3 bg-gray-100 dark:bg-white/10 rounded-2xl text-gray-400 group-hover:text-brand transition-colors">
                                                            <IdentificationIcon className="h-6 w-6" />
                                                        </div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase">Verso do Documento</p>
                                                    </>
                                                )}
                                                {isUploading && !isScanning && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fade-in">
                                                        <ArrowPathIcon className="h-8 w-8 text-white animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <input type="file" ref={fileBackInputRef} className="hidden" accept="image/*" onChange={handleDocBackUpload} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button 
                                        onClick={() => setStep('welcome')}
                                        className="w-full sm:flex-1 py-4 md:py-5 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl font-black uppercase text-[10px]"
                                    >
                                        Voltar
                                    </button>
                                    <button 
                                        onClick={() => setStep('selfie')}
                                        disabled={!docFrontUrl || !docBackUrl || !documentId || isScanning}
                                        className="w-full sm:flex-[2] py-4 md:py-5 bg-brand text-white rounded-2xl font-black uppercase text-[10px] disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        Próximo Passo
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'selfie' && (
                            <motion.div 
                                key="step-selfie"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Selfie de Verificação</h3>
                                    
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                        <p className="text-[10px] font-bold text-blue-600 leading-relaxed">
                                            Segure seu documento próximo ao rosto e garanta que tanto seu rosto quanto os dados do documento estejam bem visíveis na foto.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div 
                                            onClick={() => selfieInputRef.current?.click()}
                                            className="h-64 w-full border-4 border-dashed border-gray-100 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden group"
                                        >
                                            {selfieUrl ? (
                                                <img src={selfieUrl} className="w-full h-full object-cover" alt="Selfie" />
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-gray-100 dark:bg-white/10 rounded-2xl text-gray-400 group-hover:text-brand transition-colors">
                                                        <CameraIcon className="h-8 w-8" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Tirar ou enviar selfie</p>
                                                </>
                                            )}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fade-in">
                                                    <ArrowPathIcon className="h-8 w-8 text-white animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={selfieInputRef} className="hidden" accept="image/*" onChange={handleSelfieUpload} />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button 
                                        onClick={() => setStep('upload')}
                                        className="w-full sm:flex-1 py-4 md:py-5 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl font-black uppercase text-[10px]"
                                    >
                                        Voltar
                                    </button>
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={!selfieUrl || isUploading}
                                        className="w-full sm:flex-[2] py-4 md:py-5 bg-brand text-white rounded-2xl font-black uppercase text-[10px] disabled:opacity-50"
                                    >
                                        Finalizar Verificação
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Progress Indicator */}
                    {step !== 'welcome' && (
                        <div className="flex gap-2 mt-8 justify-center">
                            <div className={`h-1.5 rounded-full transition-all ${step === 'upload' ? 'w-8 bg-brand' : 'w-4 bg-gray-200 dark:bg-white/10'}`}></div>
                            <div className={`h-1.5 rounded-full transition-all ${step === 'selfie' ? 'w-8 bg-brand' : 'w-4 bg-gray-200 dark:bg-white/10'}`}></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IDVerification;
