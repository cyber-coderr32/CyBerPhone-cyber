
import { GoogleGenAI, Type } from "@google/genai";
import { safeJsonStringify } from "../lib/utils";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
    if (!aiInstance) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            console.warn("GEMINI_API_KEY não definida para Sentinel.");
            return null;
        }
        aiInstance = new GoogleGenAI({ apiKey: key });
    }
    return aiInstance;
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
 * Bloqueia conteúdos ilícitos como nudez, drogas, armas, etc.
 */
export const checkContentSecurity = async (
    content: string, 
    type: string
): Promise<SentinelResult> => {
    const ai = getAI();
    if (!ai) return { allowed: true, isSafe: true };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{
                parts: [{
                    text: `Analise o seguinte conteúdo de um(a) ${type} em uma rede social educacional e verifique se ele viola as diretrizes de segurança. 
            Categorias proibidas: Nudez/Pornografia, Drogas, Armas, Ódio/Violência, Golpes/Fraudes (incluindo pedir pagamentos fora da plataforma), Contatos Externos (compartilhar WhatsApp, Telefone, Email, Instagram para negociar fora).
            
            CONTEÚDO: "${content}"
            
            Responda apenas em JSON com o seguinte formato:
            {
              "allowed": boolean,
              "reason": "motivo em português se for bloqueado",
              "detectedCategories": ["categoria1", "categoria2"],
              "isFraud": boolean (defina como true se for tentativa de golpe, fraude ou levar cliente para fora da plataforma)
            }`
                }]
            }],
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text || '';
        const result = JSON.parse(text || '{"allowed": true}');
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

// Alias para compatibilidade com código que usa checkContent
export const checkContent = checkContentSecurity;

export const checkImageSecurity = async (
    base64Image: string,
    mimeType: string
): Promise<SentinelResult> => {
    const ai = getAI();
    if (!ai) return { allowed: true };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{
                parts: [
                    {
                        inlineData: {
                            data: base64Image.split(',')[1] || base64Image,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `Analise esta imagem e verifique se ela contém conteúdo impróprio (nudez, drogas, armas, violência explícita).
                        Responda apenas em JSON: { "allowed": boolean, "reason": "motivo em português se bloqueado" }`
                    }
                ]
            }],
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text || '';
        return JSON.parse(text || '{"allowed": true}');
    } catch (error) {
        console.error("Erro no Sentinel Image Check:", safeJsonStringify(error));
        return { allowed: true };
    }
};
