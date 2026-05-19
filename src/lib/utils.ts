import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para combinar classes do Tailwind de forma segura.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um valor numérico para a moeda da plataforma.
 * @param amount O valor a ser formatado.
 * @param currency O código da moeda (padrão: KZ).
 */
export function formatCurrency(amount: number, currency: string = 'KZ') {
  if (amount === undefined || amount === null) return `0,00 ${currency}`;
  
  const formatted = amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} ${currency}`;
}

/**
 * Serializa um objeto para JSON de forma segura, tratando referências circulares.
 * Especialmente útil para erros do Firebase e do Gemini que podem ter estruturas complexas.
 */
export const safeJsonStringify = (obj: any, indent = 2): string => {
  const cache = new WeakSet();
  
  const replacer = (key: string, value: any) => {
    // 1. Basic types
    if (value === null || value === undefined) return value;
    
    // 2. Large strings
    if (typeof value === 'string' && value.length > 10000) {
      return `[Large String: ${value.substring(0, 100)}... (${value.length} bytes)]`;
    }

    if (typeof value === 'object') {
      // 3. Circular reference check
      if (cache.has(value)) {
        return '[Circular Reference]';
      }
      
      // 4. Browser/DOM objects
      if (typeof window !== 'undefined' && 
         (value instanceof Node || value instanceof Window || value instanceof Event)) {
        return `[Browser Object: ${value.constructor?.name || 'DOM'}]`;
      }

      const constructorName = value.constructor?.name;

      // 5. Aggressive Firebase/Firestore internal object detection
      const isFirebaseInternal = 
        constructorName === 'Y2' || 
        constructorName === 'Ka' || 
        constructorName === 'Za' || 
        constructorName === 'Firestore' ||
        constructorName === 'FirebaseAuthImpl' ||
        constructorName === 'FirebaseAppImpl' ||
        constructorName === 'DocumentReference' ||
        constructorName === 'Query' ||
        constructorName === 'CollectionReference' ||
        constructorName === 'DocumentSnapshot' ||
        constructorName === 'QuerySnapshot' ||
        constructorName === '_FirebaseAppImpl' ||
        (value.type && (value.type === 'firestore' || value.type === 'auth')) ||
        (value._delegate) || 
        (value.i && (value.i.src || value.i.constructor?.name === 'Ka')) || 
        (value.src && (value.src.i || value.src.constructor?.name === 'Y2')) ||
        (value._database && value._path);

      if (isFirebaseInternal) {
         return `[Firebase Internal Service Object: ${constructorName || 'Object'}]`;
      }

      // Add to cache to detect sub-branch circularity
      cache.add(value);

      // 6. Error objects treatment
      if (value instanceof Error) {
        const errorObj: any = {
          name: value.name,
          message: value.message,
          code: (value as any).code || (value as any).status,
        };
        
        // Safely extract relevant non-circular properties
        Object.getOwnPropertyNames(value).forEach(prop => {
          if (prop !== 'name' && prop !== 'message' && prop !== 'stack') {
            try {
              const subVal = (value as any)[prop];
              if (subVal && typeof subVal === 'object') {
                errorObj[prop] = `[Object: ${subVal.constructor?.name || 'Object'}]`;
              } else {
                errorObj[prop] = subVal;
              }
            } catch (e) {
              errorObj[prop] = "[Unreadable Property]";
            }
          }
        });
        return errorObj;
      }
    }
    return value;
  };

  try {
    return JSON.stringify(obj, replacer, indent);
  } catch (err) {
    // Ultimate fallback if JSON.stringify still fails (e.g. Proxy traps or depth issues)
    try {
      if (!obj || typeof obj !== 'object') return String(obj);
      
      const simple: any = {};
      const keys = Object.keys(obj);
      for (let i = 0; i < Math.min(keys.length, 30); i++) {
        const k = keys[i];
        try {
          const val = obj[k];
          if (val === null || (typeof val !== 'object' && typeof val !== 'function')) {
            simple[k] = val;
          } else {
            simple[k] = `[Complex/Circular: ${val?.constructor?.name || typeof val}]`;
          }
        } catch (e) {
          simple[k] = "[Read Error]";
        }
      }
      return JSON.stringify(simple, null, indent);
    } catch (e) {
      return "[Unserializable Object]";
    }
  }
};
