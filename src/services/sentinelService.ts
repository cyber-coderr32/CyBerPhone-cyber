
import { safeJsonStringify } from "../lib/utils";

// Robust JSON cleaner to strip markdown code blocks from LLM output
const cleanJson = (str: string): string => {
    if (!str) return str;
    let cleaned = str.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
        cleaned = cleaned.replace(/\s*```$/, '');
    }
    return cleaned.trim();
};

export interface SentinelResult {
    allowed: boolean;
    isSafe?: boolean; // Alias for backward compatibility
    reason?: string;
    detectedCategories?: string[];
    category?: string; // Alias
    isFraud?: boolean;
}

/**
 * Sentinela AI - Sistema de Segurança Centinela
 * Versão 2.0 - Proteção Rigorosa Transacional e Social
 * Bloqueia conteúdos ilícitos como nudez, pornografia, drogas, armas, pirataria, etc.
 */
export const checkContentSecurity = async (
    content: string, 
    type: string
): Promise<SentinelResult> => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gemini-3.5-flash",
                contents: [{
                    parts: [{
                        text: `Você é o SENTINELA AI, o sistema de segurança supremo da rede CyBerPhone. 
                Sua missão é aplicar TOLERÂNCIA ZERO contra violações graves. 
                Analise o conteúdo de um(a) ${type} e verifique violações das seguintes regras severas:
    
                1. CONTEÚDO ILEGAL E CRIMINOSO: TOLERÂNCIA ZERO para venda de armas, munição, explosivos, drogas, estupefacientes ou contrabando. Bloqueie qualquer menção a comércio proibido de itens ilegais.
                2. PORNOGRAFIA E NUDEZ: Bloqueio IMEDIATO de pornografia adulta, nudez, fotos nuas e, com prioridade máxima, QUALQUER indício de PORNOGRAFIA INFANTIL (CSAM). Não permita exibicionismo.
                3. DIREITOS AUTORAIS E PIRATARIA: Bloqueie software crackeado, cursos piratas ou qualquer violação de propriedade intelectual.
                4. ÓDIO E VIOLÊNCIA: Discurso de ódio, racismo, homofobia ou incitação à violência física.
                5. FRAUDES E GOLPES: Esquemas Ponzi, pirâmides financeiras, phishing, ou tentativas de levar a transação para fora do ambiente seguro (ex: pedir WhatsApp para fechar negócio por fora).
    
                CONTEÚDO PARA ANÁLISE: "${content}"
                
                Responda estritamente em JSON com o seguinte formato:
                {
                  "allowed": boolean,
                  "reason": "Explicação detalhada e severa do bloqueio em português",
                  "detectedCategories": ["categoria_violada"],
                  "isFraud": boolean,
                  "isIllegal": boolean,
                  "severity": "low" | "medium" | "high" | "critical"
                }`
                    }]
                }],
                config: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) throw new Error("Sentinel check failed");

        const data = await response.json();
        const result = JSON.parse(cleanJson(data.text || '{"allowed": true}'));
        return {
            ...result,
            isSafe: result.allowed,
            category: result.detectedCategories?.[0]
        };
    } catch (error) {
        console.error("Erro no Sentinel AI:", safeJsonStringify(error));
        return { allowed: true, isSafe: true };
    }
};

// ... and so on for other functions

// Alias para compatibilidade com código que usa checkContent
export const checkContent = checkContentSecurity;

export const checkImageSecurity = async (
    base64Image: string,
    mimeType: string
): Promise<SentinelResult> => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gemini-3.5-flash",
                contents: [{
                    parts: [
                        {
                            inlineData: {
                                data: base64Image.split(',')[1] || base64Image,
                                mimeType: mimeType
                            }
                        },
                        {
                            text: `Você é o Olho do Sentinela. Analise esta imagem com rigor absoluto.
                            Sua tarefa é bloquear imediatamente:
                            - Nudez total ou parcial, conteúdo sexual explícito ou sugestivo (Pornografia).
                            - Armas de fogo, armas brancas em contexto violento, explosivos.
                            - Drogas, parafernália para drogas ou promoção de substâncias ilegais.
                            - Símbolos de ódio, violência gráfica extrema ou gore.
                            - Capturas de tela que contenham informações de terceiros sem autorização (violação de privacidade).
                            
                            Responda apenas em JSON: { "allowed": boolean, "reason": "Motivo severo em português", "severity": "critical" | "high" | "normal" }`
                        }
                    ]
                }],
                config: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) throw new Error("Sentinel image check failed");

        const data = await response.json();
        return JSON.parse(cleanJson(data.text || '{"allowed": true}'));
    } catch (error) {
        console.error("Erro no Sentinel Image Check:", safeJsonStringify(error));
        return { allowed: true };
    }
};

export interface IDVerificationResult {
    approved: boolean;
    reason: string;
    confidence: number;
    extractedId?: string;
    matchesClaimedId?: boolean;
    expiryDate?: string; // Formato YYYY-MM-DD
}

export const verifyIdentityDocuments = async (
    docFrontBase64: string,
    docBackBase64: string,
    selfieBase64: string,
    claimedId: string
): Promise<IDVerificationResult> => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gemini-3.5-flash",
                contents: [{
                    parts: [
                        {
                            inlineData: {
                                data: docFrontBase64.indexOf(',') > -1 ? docFrontBase64.split(',')[1] : docFrontBase64,
                                mimeType: "image/jpeg"
                            }
                        },
                        {
                            inlineData: {
                                data: docBackBase64.indexOf(',') > -1 ? docBackBase64.split(',')[1] : docBackBase64,
                                mimeType: "image/jpeg"
                            }
                        },
                        {
                            inlineData: {
                                data: selfieBase64.indexOf(',') > -1 ? selfieBase64.split(',')[1] : selfieBase64,
                                mimeType: "image/jpeg"
                            }
                        },
                        {
                            text: `Você é o Sistema Sentinela de Verificação de Identidade. 
                            Sua tarefa é analisar rigorosamente estas três imagens:
                            1. A primeira imagem é a frente de um documento de identidade (Bilhete de Identidade, Passaporte ou Carta de Condução).
                            2. A segunda imagem é o verso (atrás) do mesmo documento.
                            3. A terceira imagem é uma selfie do usuário segurando o documento.
                            
                            Critérios de Verificação:
                            - O documento deve ser real e original (frente e verso devem ser do mesmo documento).
                            - O rosto na selfie deve ser identicamente a mesma pessoa na foto do documento.
                            - O número do documento visível na foto deve ser lido com PRECISÃO MÁXIMA.
                            - Verifique se há qualquer sinal de adulteração digital nas fotos de ID.
                            - O número do documento visível na foto deve ser obrigatoriamente: "${claimedId}". Se houver qualquer divergência de um único caractere, marque matchesClaimedId como false.
                            - Caso o número no documento seja diferente do informado pelo usuário, você DEVE extrair o número REAL do documento e colocar em extractedId.
                            - As fotos devem ter nitidez suficiente para leitura de dados.
                            - VOCÊ DEVE EXTRAIR A DATA DE VALIDADE (EXPIRAÇÃO) DO DOCUMENTO.
                            
                            Responda estritamente em JSON com este formato:
                            {
                              "approved": boolean (true apenas se for a mesma pessoa, ID for real, dentro da validade e número bater ou for lido claramente),
                              "reason": "Explicação detalhada em português do porquê foi aprovado ou reprovado",
                              "confidence": número de 0 a 1,
                              "extractedId": "o número do ID que você leu no documento (exatamente como está escrito)",
                              "matchesClaimedId": boolean,
                              "expiryDate": "YYYY-MM-DD" (extraia a data de validade do documento)
                            }`
                        }
                    ]
                }],
                config: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) throw new Error("ID verification failed");

        const data = await response.json();
        const parsed = JSON.parse(cleanJson(data.text || '{"approved": false, "reason": "Erro ao processar resposta da IA", "confidence": 0}'));
        
        if (typeof parsed.approved !== 'boolean') {
            return { approved: false, reason: "Resposta da IA inválida", confidence: 0 };
        }

        return parsed;
    } catch (error) {
        console.error("Erro no Sentinel ID Verification:", safeJsonStringify(error));
        return { approved: false, reason: "Erro técnico na análise de IA: " + (error instanceof Error ? error.message : String(error)), confidence: 0 };
    }
};

/**
 * OCR Sentinela - Extração automática de número de documento
 */
export const extractIdFromDocument = async (base64Image: string): Promise<string | null> => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gemini-3.5-flash",
                contents: [{
                    parts: [
                        {
                            inlineData: {
                                data: base64Image.indexOf(',') > -1 ? base64Image.split(',')[1] : base64Image,
                                mimeType: "image/jpeg"
                            }
                        },
                        {
                            text: `Analise esta imagem de um documento de identidade (Bilhete de Identidade, Passaporte ou Carta de Condução).
                            Extraia apenas o número do documento (número de identificação).
                            
                            Extraia exatamente como está escrito no documento.
                            
                            Responda apenas em JSON com o seguinte formato:
                            {
                              "documentId": "o número extraído aqui ou null se não encontrar"
                            }`
                        }
                    ]
                }],
                config: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) throw new Error("OCR extraction failed");

        const data = await response.json();
        const result = JSON.parse(cleanJson(data.text || '{"documentId": null}'));
        return result.documentId;
    } catch (error) {
        console.error("Erro ao extrair ID do documento:", safeJsonStringify(error));
        return null;
    }
};
