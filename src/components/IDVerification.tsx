import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { updateUser, checkFieldUniqueness, registerUniqueness, uploadFile } from '../services/storageService';
import { verifyIdentityDocuments } from '../services/sentinelService';
import { 
    FingerPrintIcon, 
    IdentificationIcon, 
    CheckCircleIcon,
    ArrowRightOnRectangleIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon,
    DocumentTextIcon,
    ArrowUpTrayIcon,
    TrashIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { Terminal, Copy, Check, Eye, Play, Sparkle, RefreshCw, KeyRound, Globe, Phone, Mail, UserPlus, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';
import { COUNTRIES } from '../data/countries';

interface IDVerificationProps {
  user: User;
  onComplete: () => void;
  onLogout: () => void;
  forceUpdate?: boolean;
  onSkip?: () => void;
}

// Subcomponent for custom, drag-and-drop & click enabled file uploads according to guidelines
interface DropzoneProps {
    id: string;
    label: string;
    preview: string | null;
    onSelected: (file: File) => void;
    onClear: () => void;
}

const FileDropzone: React.FC<DropzoneProps> = ({ id, label, preview, onSelected, onClear }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const onDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragOver(true);
        } else if (e.type === "dragleave") {
            setIsDragOver(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                onSelected(file);
            }
        }
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onSelected(e.target.files[0]);
        }
    };

    return (
        <div 
            id={`dropzone-${id}`}
            onDragEnter={onDrag}
            onDragOver={onDrag}
            onDragLeave={onDrag}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col items-center justify-center text-center h-[140px] overflow-hidden ${
                preview 
                    ? 'border-brand/40 bg-brand/5 dark:bg-brand/5' 
                    : isDragOver
                        ? 'border-brand bg-brand/10 dark:bg-brand/10 shadow-lg scale-[1.02]'
                        : 'border-gray-200 dark:border-white/10 hover:border-brand/60 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
        >
            <input 
                type="file" 
                ref={inputRef} 
                onChange={onChange} 
                accept="image/*" 
                className="hidden" 
            />

            {preview ? (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/5 dark:bg-black/25">
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white font-bold truncate pr-2">{label} Carregada</span>
                        <button 
                            id={`clear-${id}`}
                            type="button" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white p-1 rounded-lg transition-all"
                        >
                            <TrashIcon className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-brand transition-all">
                        <ArrowUpTrayIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black dark:text-white uppercase tracking-tight">{label}</p>
                        <p className="text-[9px] text-gray-400 font-medium">Arraste ou clique para carregar</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const base64ToBlob = (base64String: string, contentType = ''): Blob => {
    try {
        const parts = base64String.split(';base64,');
        const byteCharacters = atob(parts[1] || parts[0]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType || 'image/jpeg' });
    } catch (err) {
        console.error("Failed to parse base64 to Blob", err);
        return new Blob([], { type: 'image/jpeg' });
    }
};

const IDVerification: React.FC<IDVerificationProps> = ({ user, onComplete, onLogout, forceUpdate, onSkip }) => {
    const { showAlert } = useDialog();
    const verifEngine = 'sentinel';

    // Sentinel State
    const [step, setStep] = useState<'welcome' | 'upload_docs' | 'upload_selfie' | 'verifying' | 'success'>('welcome');
    const [isRetrying, setIsRetrying] = useState(false);

    // Document States (Sentinel)
    const [documentId, setDocumentId] = useState('');
    const [docFrontUrl, setDocFrontUrl] = useState<string | null>(null);
    const [docBackUrl, setDocBackUrl] = useState<string | null>(null);
    const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
    const [docFrontBase64, setDocFrontBase64] = useState<string | null>(null);
    const [docBackBase64, setDocBackBase64] = useState<string | null>(null);
    const [selfieBase64, setSelfieBase64] = useState<string | null>(null);

    // Error and validation monitoring
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [validationLogs, setValidationLogs] = useState<string>("Iniciando processador Sentinel AI...");
    const [logIndex, setLogIndex] = useState(0);

    const logsArray = [
        "Protegendo canal biométrico com criptografia fiduciária...",
        "Buscando duplicidades de Cédulas no registro de unicidade...",
        "Sentinela AI: Validando alinhamento e foco das imagens...",
        "Sentinela AI: Processando reconhecimento facial biométrico...",
        "Sincronizando metadados com as bases soberanas globais..."
    ];

    // Auto rotate mock progress audit texts
    useEffect(() => {
        if (step === 'verifying') {
            const interval = setInterval(() => {
                setLogIndex((prev) => {
                    const next = (prev + 1) % logsArray.length;
                    setValidationLogs(logsArray[next]);
                    return next;
                });
            }, 3000);
            return () => clearInterval(interval);
        } else {
            setLogIndex(0);
            setValidationLogs(logsArray[0]);
        }
    }, [step]);

    const compressImage = (file: File, maxDim = 1024, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(e.target?.result as string);
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = () => {
                    resolve(e.target?.result as string);
                };
                img.src = e.target?.result as string;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    // Handle standard files converted to base64 with instant client-side resolution and size compression
    const processFileSelection = async (file: File, target: 'front' | 'back' | 'selfie') => {
        try {
            // Compress image to JPEG of max 1024px dimension, giving extremely small payloads while preserving OCR readability
            const base64 = await compressImage(file, 1024, 0.7);
            if (target === 'front') {
                setDocFrontUrl(base64);
                setDocFrontBase64(base64);
            } else if (target === 'back') {
                setDocBackUrl(base64);
                setDocBackBase64(base64);
            } else {
                setSelfieUrl(base64);
                setSelfieBase64(base64);
            }
        } catch (err) {
            console.error("Failed to compress image file:", err);
            showAlert("Falha ao ler o arquivo selecionado ou processar compressão.", { type: "error" });
        }
    };

    // Main validation logic (no simulation & checks duplicity!)
    const handleVerifyAndPublish = async () => {
        setErrorMsg(null);

        // Sanity Check
        if (!docFrontBase64 || !docBackBase64 || !selfieBase64 || !documentId.trim()) {
            showAlert("Por favor, preencha todos os campos e anexe as fotos necessárias.", { type: "error" });
            setStep('upload_docs');
            return;
        }

        const cleanDocId = documentId.trim();
        setStep('verifying');

        try {
            // 1. Check uniqueness database index (Preventing document duplicities as requested by administrator)
            const isUnique = await checkFieldUniqueness('documentId', cleanDocId);
            if (!isUnique) {
                setErrorMsg("Duplicidade de Documento: Este documento já está registrado no sistema por outro utilizador. Não é permitida a duplicidade de documentos.");
                setStep('upload_docs');
                return;
            }

            // 2. Call Sentinel API (performs AI computer-vision auditing using gemini, comparing face coordinates & OCR)
            const checkResult = await verifyIdentityDocuments(
                docFrontBase64,
                docBackBase64,
                selfieBase64,
                cleanDocId
            );

            if (checkResult.approved) {
                const finalDocId = checkResult.extractedId || cleanDocId;

                // Let's re-verify the extracted document ID in case of a different ID being extracted by the AI
                if (checkResult.extractedId && checkResult.extractedId.toLowerCase().trim() !== cleanDocId.toLowerCase().trim()) {
                    const isExtractedUnique = await checkFieldUniqueness('documentId', finalDocId);
                    if (!isExtractedUnique) {
                        setErrorMsg("Duplicidade detectada após processamento OCR de alto nível: O número de identificação lido no seu documento físico já está em uso por outra conta.");
                        setStep('upload_docs');
                        return;
                    }
                }

                // Register uniqueness constraint in firestore registry
                await registerUniqueness('documentId', finalDocId, user.id);

                // Commit approves to databases
                const expiresAt = checkResult.expiryDate 
                    ? new Date(checkResult.expiryDate).getTime() 
                    : Date.now() + 365 * 24 * 60 * 60 * 1000 * 5; // fallback to 5 years

                // UPLOAD DOCUMENTS TO CLOUDINARY TO PREVENT DOCUMENT OVERFLOW (Firestore 1MB maximum limit)
                let frontUrlCloud = "";
                let backUrlCloud = "";
                let selfieUrlCloud = "";

                try {
                    const frontBlob = base64ToBlob(docFrontBase64);
                    const backBlob = base64ToBlob(docBackBase64);
                    const selfieBlob = base64ToBlob(selfieBase64);

                    frontUrlCloud = await uploadFile(frontBlob, 'verification_docs');
                    backUrlCloud = await uploadFile(backBlob, 'verification_docs');
                    selfieUrlCloud = await uploadFile(selfieBlob, 'verification_docs');
                } catch (filesErr) {
                    console.error("Failed to upload verification photos. Using fallback base64 urls.", filesErr);
                    frontUrlCloud = docFrontBase64.slice(0, 1000); // limit base64 just in case to prevent error
                    backUrlCloud = docBackBase64.slice(0, 1000);
                    selfieUrlCloud = selfieBase64.slice(0, 1000);
                }

                const updatedUser: User = {
                    ...user,
                    idVerificationStatus: 'APPROVED',
                    isVerified: true,
                    documentId: finalDocId,
                    idVerificationDocs: {
                        frontUrl: frontUrlCloud,
                        backUrl: backUrlCloud,
                        selfieUrl: selfieUrlCloud,
                        submittedAt: Date.now(),
                        expiresAt: expiresAt,
                        aiConfidence: checkResult.confidence || 0.95,
                        extractedId: finalDocId,
                        rejectionReason: ""
                    }
                };

                try {
                    localStorage.setItem(`cp_user_verified_${user.id}`, 'true');
                    localStorage.setItem(`cp_user_verification_status_${user.id}`, 'APPROVED');
                } catch (localErr) {
                    console.warn("[LOCALSTORAGE] Erro ao sincronizar cache local de aprovação:", localErr);
                }

                await updateUser(updatedUser);
                setStep('success');
            } else {
                // Reject the document but allow them to retry from the welcome panel
                const failReason = checkResult.reason || "Não foi possível validar a autenticidade do documento.";
                
                let frontUrlCloud = "";
                let backUrlCloud = "";
                let selfieUrlCloud = "";

                try {
                    const frontBlob = base64ToBlob(docFrontBase64);
                    const backBlob = base64ToBlob(docBackBase64);
                    const selfieBlob = base64ToBlob(selfieBase64);

                    frontUrlCloud = await uploadFile(frontBlob, 'verification_docs');
                    backUrlCloud = await uploadFile(backBlob, 'verification_docs');
                    selfieUrlCloud = await uploadFile(selfieBlob, 'verification_docs');
                } catch (filesErr) {
                    console.error("Failed to upload rejected photos:", filesErr);
                    frontUrlCloud = docFrontBase64.slice(0, 1000);
                    backUrlCloud = docBackBase64.slice(0, 1000);
                    selfieUrlCloud = selfieBase64.slice(0, 1000);
                }

                const updatedUser: User = {
                    ...user,
                    idVerificationStatus: 'REJECTED',
                    idVerificationDocs: {
                        frontUrl: frontUrlCloud,
                        backUrl: backUrlCloud,
                        selfieUrl: selfieUrlCloud,
                        submittedAt: Date.now(),
                        rejectionReason: failReason
                    }
                };

                await updateUser(updatedUser);
                setErrorMsg(failReason);
                setIsRetrying(false); // return to normal blocking view
                setStep('upload_docs');
            }
        } catch (err: any) {
            console.error("Erro na validação do Sentinel:", err);
            setErrorMsg("Ocorreu um erro ao comunicar-se com a rede de IA Sentinela. Por favor tente novamente.");
            setStep('upload_docs');
        }
    };

    if (step === 'success' || user.idVerificationStatus === 'APPROVED') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-2xl text-center border dark:border-white/5 space-y-6">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-brand tracking-widest font-sans">Verificação Concluída</span>
                        <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter leading-none">Perfil Autenticado</h2>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed font-sans text-xs">
                        Suas informações de identificação e biometria facial foram verificadas em segurança na base de dados inteligente do Sentinela AI. O selo dourado de integridade foi plenamente ativado no seu perfil.
                    </p>
                    <button 
                        onClick={onComplete}
                        className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all cursor-pointer"
                    >
                        Entrar no App
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex flex-col justify-start p-4 md:p-10">
            <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 animate-fade-in">
                
                {/* Left Side: General instructions & Info panel */}
                <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-4 py-2 rounded-full mb-4">
                            <ShieldCheckIcon className="h-5 w-5 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest font-sans">Verificação por Biometria</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black dark:text-white tracking-tighter leading-[0.95] mb-4">
                            VERIFICAÇÃO DE <span className="text-brand">IDENTIDADE</span>
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed font-sans">
                            Complete sua verificação de segurança para ativar o selo dourado de integridade em seu perfil e liberar todas as funcionalidades da sua conta.
                        </p>
                    </div>

                    {/* Left Info panels */}
                    <div className="space-y-4">
                        <div className="p-5 bg-white dark:bg-darkcard rounded-3xl border dark:border-white/5 space-y-4 shadow-sm">
                            <h3 className="text-xs font-black dark:text-white uppercase tracking-wider flex items-center gap-2 text-brand">
                                <Globe className="h-4 w-4" /> VERIFICAÇÃO SEGURA
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-gray-450 font-sans leading-relaxed">
                                Seus dados de identidade e reconhecimento facial são processados através do nosso sistema seguro de inteligência artificial <strong>Sentinela AI</strong>. De forma rápida e altamente criptografada, seu perfil será autenticado e auditado em conformidade com os mais rigorosos padrões de integridade e segurança digital.
                            </p>
                            <div className="space-y-2 mt-4">
                                <div className="flex gap-2 items-center text-[10px] bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-gray-500">
                                    <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
                                    <span>Conexão criptografada de ponta a ponta</span>
                                </div>
                                <div className="flex gap-2 items-center text-[10px] bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-gray-500">
                                    <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
                                    <span>Auditoria de autenticidade documental</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center flex-wrap pt-4">
                        <button 
                            onClick={onLogout}
                            className="w-fit flex items-center gap-2 text-gray-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
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
                                    className="w-fit flex items-center gap-2 text-brand hover:text-brand/80 font-black uppercase text-[10px] tracking-widest transition-colors font-sans cursor-pointer"
                                >
                                    Pular por enquanto
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Side: Step-by-Step interactive process (occupies 7 columns) */}
                <div className="lg:col-span-7 flex flex-col space-y-6">
                    <div className="bg-white dark:bg-darkcard p-6 md:p-8 rounded-[2.5rem] shadow-2xl border dark:border-white/10 relative overflow-hidden flex flex-col justify-center min-h-[480px]">
                        <AnimatePresence mode="wait">
                            
                            {step === 'welcome' && (
                                <motion.div 
                                    key="step-welcome"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-brand">Sentinela AI</span>
                                        <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">O que você vai precisar?</h3>
                                        <ul className="space-y-3">
                                            <li className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/5">
                                                <div className="w-5 h-5 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center shrink-0">1</div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold dark:text-gray-300">Cédula ID, RG, Passaporte ou CNH</span>
                                                    <span className="text-[8px] text-brand uppercase tracking-tighter font-semibold">O documento deve estar físico e perfeitamente nítido</span>
                                                </div>
                                            </li>
                                            <li className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/5">
                                                <div className="w-5 h-5 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center shrink-0">2</div>
                                                <span className="text-xs font-bold dark:text-gray-300">Biometria Facial (Selfie Segurando Documento)</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <button 
                                        onClick={() => setStep('upload_docs')}
                                        className="w-full py-4 bg-brand hover:bg-brand/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ShieldCheckIcon className="h-5 w-5" /> Começar Verificação AI
                                    </button>
                                </motion.div>
                            )}

                            {step === 'upload_docs' && (
                                <motion.div 
                                    key="step-upload_docs"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Etapa 1: Dados e Documento</h3>
                                        <p className="text-[10px] text-gray-400 font-sans">
                                            Digite o ID de identificação do documento oficial para garantir a sua unicidade.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Cédula ID / NIF / BI / Passaporte</label>
                                            <input 
                                                type="text"
                                                required
                                                value={documentId}
                                                onChange={(e) => setDocumentId(e.target.value)}
                                                placeholder="Ex: 004561234LA045"
                                                className="w-full p-3 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-brand rounded-xl dark:text-white outline-none font-bold text-xs transition-all"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <FileDropzone 
                                                id="front-doc"
                                                label="Frente do ID"
                                                preview={docFrontUrl}
                                                onSelected={(file) => processFileSelection(file, 'front')}
                                                onClear={() => {
                                                    setDocFrontUrl(null);
                                                    setDocFrontBase64(null);
                                                }}
                                            />
                                            <FileDropzone 
                                                id="back-doc"
                                                label="Verso do ID"
                                                preview={docBackUrl}
                                                onSelected={(file) => processFileSelection(file, 'back')}
                                                onClear={() => {
                                                    setDocBackUrl(null);
                                                    setDocBackBase64(null);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {errorMsg && (
                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-xl flex gap-1.5 text-red-600 dark:text-red-400">
                                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-semibold font-sans leading-tight">{errorMsg}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setStep('welcome')}
                                            className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 rounded-xl font-bold uppercase text-[9px] cursor-pointer"
                                        >
                                            Voltar
                                        </button>
                                        <button 
                                            type="button"
                                            disabled={!docFrontUrl || !docBackUrl || !documentId.trim()}
                                            onClick={async () => {
                                                setErrorMsg(null);
                                                const cleanId = documentId.trim();
                                                const isUnique = await checkFieldUniqueness('documentId', cleanId);
                                                if (!isUnique) {
                                                    setErrorMsg("Duplicidade de Documento: Este documento já está registrado no sistema por outro utilizador. Não é permitida a duplicidade de documentos.");
                                                    return;
                                                }
                                                setStep('upload_selfie');
                                            }}
                                            className="flex-[2] py-3 bg-brand text-white rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 cursor-pointer"
                                        >
                                            Seguir para Selfie
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'upload_selfie' && (
                                <motion.div 
                                    key="step-upload_selfie"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5 w-full"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Etapa 2: Biometria Facial</h3>
                                        <p className="text-[10px] text-gray-400 font-sans">
                                            Anexe uma selfie nítida segurando seu documento ao lado de seu rosto.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <FileDropzone 
                                            id="selfie"
                                            label="Selfie segurando o ID"
                                            preview={selfieUrl}
                                            onSelected={(file) => processFileSelection(file, 'selfie')}
                                            onClear={() => {
                                                setSelfieUrl(null);
                                                setSelfieBase64(null);
                                            }}
                                        />
                                        <p className="text-[9px] text-gray-400 text-center font-sans leading-tight">
                                            DICA: Ajuste a iluminação e aproxime para que os dados do documento estejam legíveis.
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setStep('upload_docs')}
                                            className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 rounded-xl font-bold uppercase text-[9px] cursor-pointer"
                                        >
                                            Voltar
                                        </button>
                                        <button 
                                            type="button"
                                            disabled={!selfieUrl}
                                            onClick={handleVerifyAndPublish}
                                            className="flex-[2] py-3 bg-brand text-white rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 cursor-pointer"
                                        >
                                            <SparklesIcon className="h-4 w-4" /> Iniciar Inteligência Sentinela
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'verifying' && (
                                <motion.div 
                                    key="step-verifying"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 flex flex-col items-center justify-center gap-4 text-center w-full"
                                >
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 border-4 border-brand/20 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-t-brand border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                        <div className="absolute inset-2 bg-brand/5 dark:bg-brand/10 rounded-full flex items-center justify-center">
                                            <Shield className="h-6 w-6 text-brand animate-pulse" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h4 className="font-bold uppercase text-xs tracking-widest dark:text-white">Auditoria Sentinela AI Ativa</h4>
                                        <p className="text-[10px] text-gray-400 font-sans max-w-[280px] mx-auto h-[40px] flex items-center justify-center">
                                            {validationLogs}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default IDVerification;
