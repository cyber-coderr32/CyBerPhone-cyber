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
import { Terminal, Copy, Check, Eye, Play, Sparkle, RefreshCw, KeyRound, Globe, Phone, Mail, UserPlus } from 'lucide-react';
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

// Console logger interface for developer feedback
interface VeriffLogEntry {
    timestamp: string;
    method: 'POST' | 'PATCH' | 'GET';
    url: string;
    payload?: string;
    response?: string;
}

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
    const [verifEngine, setVerifEngine] = useState<'sentinel' | 'veriff'>('veriff');

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

    // Veriff Specific States
    const [veriffStep, setVeriffStep] = useState<'welcome' | 'create_session' | 'sdk_flow' | 'approved' | 'failed'>('welcome');
    const [veriffFirstName, setVeriffFirstName] = useState(user.firstName || 'Jane');
    const [veriffLastName, setVeriffLastName] = useState(user.lastName || 'Doe');
    const [veriffCountry, setVeriffCountry] = useState('BRA');
    const [veriffDocType, setVeriffDocType] = useState<'PASSPORT' | 'ID_CARD' | 'DRIVERS_LICENSE'>('PASSPORT');

    // Live API execution properties
    const [veriffSessionId, setVeriffSessionId] = useState<string | null>(null);
    const [veriffUrl, setVeriffUrl] = useState<string | null>(null);
    const [veriffLoading, setVeriffLoading] = useState(false);
    const [showLogger, setShowLogger] = useState(false);
    const [apiLogs, setApiLogs] = useState<VeriffLogEntry[]>([]);
    const [isApiSimulated, setIsApiSimulated] = useState(true);

    // Error and validation monitoring
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [validationLogs, setValidationLogs] = useState<string>("Iniciando processador Sentinel AI...");
    const [logIndex, setLogIndex] = useState(0);

    const logsArray = [
        "Protegendo canal biométrico com criptografia fiduciária...",
        "Buscando duplicidades de Cédulas no registro de unicidade...",
        "Sentinela AI: Validando alinhamento e foco das imagens...",
        "Sentinela AI: Processando reconhecimento facial biométrico...",
        "Sentinela AI: Comparando traços fisionômicos com selfie...",
        "Sentinela AI: Verificando data de validade e assinaturas...",
        "Quase pronto... Transmitindo aprovação jurídica..."
    ];

    // Log cycle simulator for authentic feedback
    useEffect(() => {
        if (step === 'verifying') {
            const interval = setInterval(() => {
                setLogIndex((prev) => {
                    const next = prev < logsArray.length - 1 ? prev + 1 : prev;
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

    // Add entry to API Payload Console logs
    const addApiLog = (method: 'POST' | 'PATCH' | 'GET', url: string, payload?: any, rawResponse?: any) => {
        const entry: VeriffLogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            method,
            url,
            payload: payload ? JSON.stringify(payload, null, 2) : undefined,
            response: rawResponse ? JSON.stringify(rawResponse, null, 2) : undefined
        };
        setApiLogs((prev) => [entry, ...prev]);
    };

    // Handle standard files converted to base64
    const processFileSelection = (file: File, target: 'front' | 'back' | 'selfie') => {
        if (file.size > 10 * 1024 * 1024) {
            showAlert("O tamanho da imagem excede o limite de 10MB.", { type: "error" });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
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
        };
        reader.onerror = () => {
            showAlert("Falha ao ler o arquivo selecionado.", { type: "error" });
        };
        reader.readAsDataURL(file);
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
            }
        } catch (err: any) {
            console.error("Erro na validação do Sentinel:", err);
            setErrorMsg("Ocorreu um erro ao comunicar-se com a rede de IA Sentinela. Por favor tente novamente.");
            setStep('upload_docs');
        }
    };

    // --- VERIFF INTEGRATION PIPELINE CLIENT ACTIONS ---

    // 1. POST /sessions
    const handleVeriffCreateSession = async () => {
        if (!veriffFirstName.trim() || !veriffLastName.trim()) {
            showAlert("Primeiro nome e sobrenome são obrigatórios.", { type: "error" });
            return;
        }

        setVeriffLoading(true);
        setErrorMsg(null);

        const requestBody = {
            verification: {
                person: {
                    firstName: veriffFirstName,
                    lastName: veriffLastName
                },
                document: {
                    country: veriffCountry,
                    type: veriffDocType
                },
                vendorData: user.id
            }
        };

        try {
            const res = await fetch('/api/veriff-proxy/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await res.json();
            addApiLog('POST', '/sessions', requestBody, data);

            if (!res.ok) {
                throw new Error(data.error || "Falha ao criar sessão Veriff");
            }

            if (data.status === "success" && data.verification) {
                setVeriffSessionId(data.verification.id);
                setVeriffUrl(data.verification.url);
                setIsApiSimulated(data.verification.id.startsWith('ver-sim-'));
                setVeriffStep('sdk_flow');
                showAlert("Sessão Veriff criada com sucesso!", { type: "success" });
            } else {
                throw new Error("Erro na estrutura de dados retornada pelo Veriff");
            }
        } catch (err: any) {
            console.error("Veriff Error Create Session:", err);
            setErrorMsg(err.message || "Falha ao conectar com a API do Veriff.");
            showAlert("Falha ao criar sessão Veriff.", { type: "error" });
        } finally {
            setVeriffLoading(false);
        }
    };

    // 2. GET /sessions/:id/decision
    const handleVeriffPollDecision = async () => {
        if (!veriffSessionId) return;

        setVeriffLoading(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`/api/veriff-proxy/sessions/${veriffSessionId}/decision`, {
                method: 'GET'
            });

            const data = await res.json();
            addApiLog('GET', `/sessions/${veriffSessionId}/decision`, null, data);

            if (!res.ok) {
                throw new Error(data.error || "Falha ao consultar decisão da sessão");
            }

            if (data.status === 'success' && data.verification?.status === 'approved') {
                // Verified successfully! Register uniqueness constraint and commit user update
                await registerUniqueness('documentId', veriffSessionId, user.id);

                const updatedUser: User = {
                    ...user,
                    idVerificationStatus: 'APPROVED',
                    isVerified: true,
                    documentId: veriffSessionId,
                    idVerificationDocs: {
                        frontUrl: "",
                        backUrl: "",
                        selfieUrl: "",
                        submittedAt: Date.now(),
                        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 * 5, // 5 anos
                        aiConfidence: 1.0,
                        extractedId: veriffSessionId,
                        rejectionReason: ""
                    }
                };

                try {
                    localStorage.setItem(`cp_user_verified_${user.id}`, 'true');
                    localStorage.setItem(`cp_user_verification_status_${user.id}`, 'APPROVED');
                } catch (localErr) {
                    console.warn("[LOCALSTORAGE] Erro ao sincronizar cache local de aprovação Veriff:", localErr);
                }

                await updateUser(updatedUser);
                setVeriffStep('approved');
                showAlert("Verificação aprovada no Veriff!", { type: "success" });
            } else if (data.status === 'success' && data.verification?.status === 'declined') {
                setVeriffStep('failed');
                setErrorMsg(data.verification.reason || "Rejeitado na verificação Veriff.");
            } else {
                showAlert("Sua verificação Veriff ainda está pendente ou sob análise.", { type: "alert" });
            }
        } catch (err: any) {
            console.error("Veriff Poll Status Error:", err);
            setErrorMsg(err.message || "Erro ao consultar decisão no Veriff.");
        } finally {
            setVeriffLoading(false);
        }
    };


    // --- RENDERING ROUTINES ---

    // Standard PENDING Review view
    if (user.idVerificationStatus === 'PENDING') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-2xl border dark:border-white/10 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowPathIcon className="h-10 w-10 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-2">Verificação em Análise</h2>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                        Recebemos seus dados e documentos. Nossa equipe de segurança juntamente com a inteligência artificial do Sentinela está auditando seus dados para garantir a integridade da sua conta.
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

    // Default Block for Rejection
    if (user.idVerificationStatus === 'REJECTED' && !isRetrying) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-darkbg flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-2xl border border-red-100 dark:border-red-900/20 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-2">Verificação Recusada</h2>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-4">
                        Infelizmente a verificação de segurança não foi aprovada pelo sistema Sentinela AI.
                    </p>
                    {user.idVerificationDocs?.rejectionReason && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl mb-8 border border-red-100 dark:border-red-950">
                            <p className="text-xs font-bold text-red-600 dark:text-red-400 font-sans">Motivo: {user.idVerificationDocs.rejectionReason}</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => {
                                setIsRetrying(true);
                                setStep('welcome');
                                setVeriffStep('welcome');
                            }}
                            className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                            Tentar Novamente
                        </button>
                        <button 
                            onClick={onLogout}
                            className="w-full py-4 text-gray-400 hover:text-red-500 font-black uppercase text-xs transition-colors cursor-pointer"
                        >
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Success Screen
    if (step === 'success' || veriffStep === 'approved') {
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
                    <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter mb-4">Aprovado com Sucesso!</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-4 leading-relaxed font-sans text-sm">
                        Suas informações de identificação e biometria facial foram verificadas em segurança na base fiduciária do {verifEngine === 'veriff' ? "Veriff KYC Platform" : "Sentinela AI"}. O selo dourado de integridade foi ativado no seu perfil.
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
                                Seus dados de identidade e reconhecimento facial são processados através do sistema parceiro seguro <strong>Veriff KYC</strong>. De forma rápida e criptografada, seu perfil será autenticado em conformidade com os mais altos padrões de segurança de dados.
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
                            
                            {/* ===================== FLOW 1: SENTINEL ENGINE ===================== */}
                            
                            {verifEngine === 'sentinel' && step === 'welcome' && (
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

                            {verifEngine === 'sentinel' && step === 'upload_docs' && (
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
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Cédula ID / NIF / CPF / BI / Passaporte</label>
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

                            {verifEngine === 'sentinel' && step === 'upload_selfie' && (
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

                            {verifEngine === 'sentinel' && step === 'verifying' && (
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
                                            <ShieldCheckIcon className="h-6 w-6 text-brand animate-pulse" />
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
                            
                            {/* ===================== FLOW 2: VERIFF INTEGRATION PIPELINE ===================== */}

                            {verifEngine === 'veriff' && veriffStep === 'welcome' && (
                                <motion.div 
                                    key="veriff-welcome"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-brand">Veriff KYC Platform</span>
                                        <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Verificação Oficial Veriff</h3>
                                        <p className="text-xs text-gray-400 dark:text-gray-400 leading-relaxed font-sans">
                                            Prepare um documento de identidade original com foto (como Passaporte, Identidade ou Carteira de Motorista) e certifique-se de estar em um local bem iluminado para a etapa de captura facial.
                                        </p>
                                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-2">
                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-tight">
                                                <ShieldCheckIcon className="h-4 w-4" /> Sistema de Proteção Garantida
                                            </p>
                                            <p className="text-[9px] text-gray-400 font-sans leading-relaxed">
                                                Suas informações biográficas e biométricas são transmitidas através de canais criptografados totalmente seguros em conformidade com os regulamentos de privacidade e proteção de dados pessoais.
                                            </p>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setVeriffStep('create_session')}
                                        className="w-full py-4 bg-brand hover:bg-brand/90 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-brand/15 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ShieldCheckIcon className="h-4 w-4" /> Iniciar Verificação
                                    </button>
                                </motion.div>
                            )}

                            {/* Veriff Step 1: Create Session */}
                            {verifEngine === 'veriff' && veriffStep === 'create_session' && (
                                <motion.div 
                                    key="veriff-create"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-[#9c9c9c] uppercase">
                                            <span>ETAPA 1 DE 2</span>
                                        </div>
                                        <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">Dados do Candidato</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><UserPlus className="h-3 w-3 text-brand" /> PRIMEIRO NOME</label>
                                            <input 
                                                type="text"
                                                value={veriffFirstName}
                                                onChange={(e) => setVeriffFirstName(e.target.value)}
                                                className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-transparent rounded-lg dark:text-white text-xs outline-none focus:border-brand font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><UserPlus className="h-3 w-3 text-brand" /> SOBRENOME</label>
                                            <input 
                                                type="text"
                                                value={veriffLastName}
                                                onChange={(e) => setVeriffLastName(e.target.value)}
                                                className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-transparent rounded-lg dark:text-white text-xs outline-none focus:border-brand font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Globe className="h-3 w-3 text-brand" /> NACIONALIDADE DO DOCUMENTO</label>
                                            <select 
                                                value={veriffCountry}
                                                onChange={(e) => setVeriffCountry(e.target.value)}
                                                className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-transparent rounded-lg dark:text-white text-xs outline-none focus:border-brand font-bold cursor-pointer"
                                            >
                                                {COUNTRIES.map((c) => (
                                                    <option key={c.code3} value={c.code3} className="bg-white dark:bg-zinc-900 text-gray-950 dark:text-white">
                                                        {c.flag} {c.name} ({c.code3})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">TIPO DE DOCUMENTO</label>
                                            <select
                                                value={veriffDocType}
                                                onChange={(e) => setVeriffDocType(e.target.value as any)}
                                                className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-transparent rounded-lg dark:text-white text-xs outline-none focus:border-brand font-bold"
                                            >
                                                <option value="PASSPORT">Passaporte (Passport)</option>
                                                <option value="ID_CARD">Identidade (ID Card)</option>
                                                <option value="DRIVERS_LICENSE">Carteira de Motorista (Driver's License)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {errorMsg && (
                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-lg text-red-600 dark:text-red-400 text-[10px] font-sans">
                                            {errorMsg}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => setVeriffStep('welcome')}
                                            className="flex-1 py-3 bg-gray-50 dark:bg-white/5 text-gray-500 rounded-xl font-bold uppercase text-[9px] text-center"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleVeriffCreateSession}
                                            disabled={veriffLoading}
                                            className="flex-[2] py-3 bg-brand text-white rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                                        >
                                            {veriffLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />} Criar Verificação
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Veriff Step 2: SDK Container Loop */}
                            {verifEngine === 'veriff' && veriffStep === 'sdk_flow' && (
                                <motion.div 
                                    key="veriff-sdk"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-[#9c9c9c] uppercase">
                                            <span>ETAPA 2 DE 2</span>
                                        </div>
                                        <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">Realização do Onboarding</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="border border-brand/20 rounded-2xl bg-slate-900 overflow-hidden shadow-xl">
                                            <div className="bg-slate-950 p-3 px-4 flex justify-between items-center border-b border-brand/10 bg-[#0d0e14]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    <span className="text-[9px] font-semibold text-gray-400 font-sans uppercase tracking-wider">Aguardando Envio de Mídias</span>
                                                </div>
                                            </div>

                                            <div className="p-6 flex flex-col items-center text-center space-y-4 relative min-h-[220px] justify-center text-white">
                                                {isApiSimulated ? (
                                                    <>
                                                        <div className="w-14 h-14 rounded-full border border-blue-500/30 flex items-center justify-center bg-blue-500/10 text-blue-400 animate-pulse">
                                                            <FingerPrintIcon className="h-8 w-8 text-brand" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs uppercase text-white font-bold tracking-wider">Ambiente de Testes</p>
                                                            <p className="text-[10px] text-gray-400 font-sans max-w-[340px]">
                                                                Sua sessão foi criada no modo de homologação. Utilize o botão abaixo para consultar o status de aprovação ou simular os dados.
                                                            </p>
                                                        </div>

                                                        <div className="py-2.5 px-4 bg-white/5 rounded-xl border border-white/10 grid grid-cols-2 gap-4 w-full text-xs">
                                                            <div className="text-left font-sans">
                                                                <span className="text-[8px] font-bold text-gray-500 block uppercase">CANDIDATO</span>
                                                                <span className="text-[10px] font-bold text-white truncate max-w-[120px] block">{veriffFirstName} {veriffLastName}</span>
                                                            </div>
                                                            <div className="text-right font-sans">
                                                                <span className="text-[8px] font-bold text-gray-500 block uppercase">SESSÃO</span>
                                                                <span className="text-[10px] font-bold text-emerald-400 block">Ativa</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-14 h-14 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                                                            <ShieldCheckIcon className="h-8 w-8" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-semibold uppercase text-white">Sessão Oficial com Veriff Estabelecida</p>
                                                            <p className="text-[10px] text-gray-400 font-sans max-w-[340px]">
                                                                Abra a url segura abaixo para completar seu onboarding biométrico com o fluxo real de imagens do Veriff:
                                                            </p>
                                                        </div>
                                                    </>
                                                )}

                                                {veriffUrl && (
                                                    <a 
                                                        href={veriffUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-2 px-6 bg-brand hover:bg-brand/80 text-white rounded-lg text-[10px] font-black uppercase text-center w-full block tracking-wider"
                                                    >
                                                        Abrir URL de Verificação Segura (Veriff)
                                                    </a>
                                                )}

                                                <button 
                                                    onClick={handleVeriffPollDecision}
                                                    disabled={veriffLoading}
                                                    className="py-3 px-6 bg-green-600 border border-green-500 hover:bg-green-500 text-white font-black uppercase text-[10.5px] rounded-xl flex items-center justify-center gap-2 tracking-wide shadow-md active:scale-95 transition-all w-full cursor-pointer"
                                                >
                                                    {veriffLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Verificar Status da Aprovação
                                                </button>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                setVeriffSessionId(null);
                                                setVeriffUrl(null);
                                                setVeriffStep('create_session');
                                            }}
                                            className="w-full text-center py-2 text-[9px] font-black text-gray-400 hover:text-red-500 uppercase cursor-pointer"
                                        >
                                            Reiniciar Processo
                                        </button>
                                    </div>

                                    {errorMsg && (
                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-3 rounded-lg text-red-600 dark:text-red-400 text-[11px] font-sans">
                                            {errorMsg}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => setVeriffStep('create_session')}
                                            className="w-full py-3 bg-gray-50 dark:bg-white/5 text-gray-500 rounded-xl font-bold uppercase text-[9px] text-center"
                                        >
                                            Voltar Etapa
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Veriff Failed View */}
                            {verifEngine === 'veriff' && veriffStep === 'failed' && (
                                <motion.div 
                                    key="veriff-failed"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-6 text-center space-y-4"
                                >
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                                        <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                                    </div>
                                    <h4 className="text-xl font-bold dark:text-white uppercase tracking-tighter">O Veriff Recusou sua Auditoria</h4>
                                    {errorMsg && (
                                        <div className="bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 p-4 rounded-xl max-w-sm mx-auto">
                                            <p className="text-xs text-red-600 dark:text-red-400 font-bold font-sans">Erro: {errorMsg}</p>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setVeriffStep('welcome')}
                                        className="py-3 px-6 bg-brand text-white rounded-xl text-xs uppercase font-black tracking-wider shadow cursor-pointer"
                                    >
                                        Voltar à tela inicial
                                    </button>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                    {/* ===================== LOGS & DEBUG LEVEL INTERACTOR DRAWER ===================== */}
                    {verifEngine === 'veriff' && showLogger && (
                        <div className="bg-[#0c0d12] border border-blue-900/40 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden animate-fade-in font-mono text-[10.5px]">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-blue-500 animate-pulse" />
                                    <span className="font-sans font-black dark:text-white text-[11px] uppercase tracking-wider">Veriff HMAC Signing Console</span>
                                </div>
                                <button 
                                    onClick={() => setApiLogs([])}
                                    className="text-[9px] font-sans font-bold bg-[#171924] text-gray-400 hover:text-white px-2 py-1 roundedcursor-pointer"
                                >
                                    Limpar Logs
                                </button>
                            </div>

                            {apiLogs.length === 0 ? (
                                <p className="text-[#555a72] italic font-sans py-6 text-center text-[10px]">Nenhuma requisição realizada ainda nesta sessão. Ative uma das etapas de API acima para visualizar os cabeçalhos criptografados da assinatura.</p>
                            ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                    {apiLogs.map((log, index) => (
                                        <div key={index} className="border-b border-[#1c1d29] pb-3 space-y-2">
                                            <div className="flex justify-between items-center bg-[#141622] p-1.5 px-3 rounded-lg border border-[#1b1c2b]">
                                                <div className="flex gap-2 items-center">
                                                    <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${
                                                        log.method === 'POST' ? 'bg-blue-600 text-white' : 
                                                        log.method === 'PATCH' ? 'bg-amber-600 text-white' : 'bg-green-600 text-white'
                                                     }`}>{log.method}</span>
                                                    <span className="text-gray-300 font-bold font-mono">{log.url}</span>
                                                </div>
                                                <span className="text-gray-500 block text-[9px]">{log.timestamp}</span>
                                            </div>

                                            {/* Signature details header mock for client instruction */}
                                            <div className="px-3 py-2 bg-[#10111a] rounded text-[9.5px] text-[#717790] leading-relaxed border border-blue-950/20">
                                                <p className="font-bold text-gray-400 uppercase tracking-tighter text-[8px] mb-1">Generated Request Auth Headers</p>
                                                <div className="space-y-1">
                                                    <p><span className="text-brand font-bold">X-AUTH-CLIENT:</span> veriff_api_token_fiduciário_production_prod</p>
                                                    <p className="truncate"><span className="text-brand font-bold">X-SIGNATURE:</span> {Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join('')}</p>
                                                </div>
                                            </div>

                                            {log.payload && (
                                                <div className="p-2.5 bg-[#090a10] rounded-lg">
                                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">Request JSON Body Payload</p>
                                                    <p className="text-gray-300 whitespace-pre">{log.payload}</p>
                                                </div>
                                            )}

                                            {log.response && (
                                                <div className="p-2.5 bg-[#07080f] rounded-lg">
                                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-wider mb-1">Raw Response Body</p>
                                                    <p className="text-[#a4e1b7] whitespace-pre-wrap">{log.response}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default IDVerification;
