import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para combinar classes do Tailwind de forma segura.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Serializa um objeto para JSON de forma segura, tratando referências circulares.
 * Especialmente útil para erros do Firebase e do Gemini que podem ter estruturas complexas.
 */
export const safeJsonStringify = (obj: any, indent = 2): string => {
  const cache = new Set();
  
  try {
    const stringified = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        // Bloqueio de strings grandes
        if (typeof value === 'string' && value.length > 5000) {
           return `[Large String: ${value.substring(0, 30)}...]`;
        }

        // Detecção de circularidade
        if (cache.has(value)) {
          return '[Circular Reference]';
        }
        
        // Verificação de tipos de DOM/Browser que não devem ser serializados
        if (value instanceof Node || value instanceof Window || value instanceof Event) {
          return `[Browser Object: ${value.constructor?.name || 'Unknown'}]`;
        }

        // Verificação de objetos internos do Firebase (Y2, Ka, etc do erro)
        const constructorName = value.constructor?.name;
        if (
             constructorName === 'Y2' || 
             constructorName === 'Ka' || 
             constructorName === 'Za' || 
             constructorName === 'Firestore' ||
             constructorName === 'FirebaseAuthImpl' ||
             value._delegate ||
             (value.i && typeof value.i === 'object' && value.src)
        ) {
           return `[Internal ${constructorName || 'Firebase'} Object]`;
        }

        cache.add(value);
      }
      return value;
    }, indent);
    
    cache.clear();
    return stringified;
  } catch (err) {
    // Se ainda falhar, retornamos uma representação simples
    try {
      const simpleObj: any = {};
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(k => {
          const val = obj[k];
          if (typeof val !== 'object' || val === null) {
            simpleObj[k] = val;
          } else {
            simpleObj[k] = `[Complex Object: ${val.constructor?.name || 'Object'}]`;
          }
        });
        return JSON.stringify(simpleObj, null, indent);
      }
      return String(obj);
    } catch (e) {
      return "[Serialization Failed]";
    }
  }
};
