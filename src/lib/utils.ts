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
  const seen = new WeakSet();

  function sanitize(val: any, depth = 0): any {
    if (val === null || val === undefined) return val;
    
    // Limit depth to avoid stack overflows or huge outputs
    if (depth > 12) {
      return '[Max Depth Reached]';
    }

    if (typeof val === 'function') {
      return `[Function: ${val.name || 'anonymous'}]`;
    }

    if (typeof val === 'symbol') {
      return val.toString();
    }

    if (typeof val !== 'object') {
      // Large strings
      if (typeof val === 'string' && val.length > 10000) {
        return `[Large String: ${val.substring(0, 100)}... (${val.length} bytes)]`;
      }
      return val;
    }

    // Check for circular reference in the current trace path
    if (seen.has(val)) {
      return '[Circular Reference]';
    }

    // Handle standard errors
    if (val instanceof Error) {
      const errObj: any = {
        name: val.name,
        message: val.message,
        code: (val as any).code || (val as any).status,
      };
      // Prevent infinite recursion on error fields, convert simple fields
      Object.getOwnPropertyNames(val).forEach(prop => {
        if (prop !== 'stack') {
          try {
            const propVal = (val as any)[prop];
            if (propVal && typeof propVal === 'object') {
              errObj[prop] = `[Object: ${propVal.constructor?.name || 'Object'}]`;
            } else if (typeof propVal === 'function') {
              errObj[prop] = `[Function]`;
            } else {
              errObj[prop] = propVal;
            }
          } catch (e) {
            errObj[prop] = "[Unreadable Property]";
          }
        }
      });
      return errObj;
    }

    // Check for browser objects
    if (typeof window !== 'undefined' && 
        (val instanceof Node || val instanceof Window || val instanceof Event)) {
      return `[Browser Object: ${val.constructor?.name || 'DOM'}]`;
    }

    const constructorName = val.constructor?.name;

    // Aggressive Firebase/Firestore internal object detection to prevent reading internally circular trees
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
      (val.type && (val.type === 'firestore' || val.type === 'auth')) ||
      (val._delegate) || 
      (val.i && (val.i.src || val.i.constructor?.name === 'Ka')) || 
      (val.src && (val.src.i || val.src.constructor?.name === 'Y2')) ||
      (val._database && val._path);

    if (isFirebaseInternal) {
      return `[Firebase Internal Service Object: ${constructorName || 'Object'}]`;
    }

    seen.add(val);

    // Arrays
    if (Array.isArray(val)) {
      const arrCopy = val.map(item => sanitize(item, depth + 1));
      seen.delete(val);
      return arrCopy;
    }

    // Objects
    const objCopy: any = {};
    const keys = Object.keys(val);
    for (const key of keys) {
      try {
        objCopy[key] = sanitize(val[key], depth + 1);
      } catch (e) {
        objCopy[key] = "[Property Retrieve Error]";
      }
    }
    seen.delete(val);
    return objCopy;
  }

  try {
    const sanitized = sanitize(obj);
    return JSON.stringify(sanitized, null, indent);
  } catch (err) {
    return `[Serialization Error: ${err instanceof Error ? err.message : String(err)}]`;
  }
};
