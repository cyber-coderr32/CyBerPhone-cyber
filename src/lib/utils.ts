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
  
  // Custom pre-processing for standard Error objects so we serialize their key info
  function preProcessErrors(key: string, val: any): any {
    if (val instanceof Error) {
      const errObj: any = {
        name: val.name,
        message: val.message,
        code: (val as any).code || (val as any).status,
      };
      Object.getOwnPropertyNames(val).forEach(prop => {
        if (prop !== 'stack' && prop !== 'name' && prop !== 'message') {
          try {
            errObj[prop] = (val as any)[prop];
          } catch (e) {
            errObj[prop] = "[Unreadable Property]";
          }
        }
      });
      return errObj;
    }
    return val;
  }

  try {
    return JSON.stringify(obj, (key, value) => {
      // First, handle standard Error objects
      let processedValue = preProcessErrors(key, value);

      if (processedValue === null || processedValue === undefined) return processedValue;

      if (typeof processedValue === 'function') {
        return `[Function: ${processedValue.name || 'anonymous'}]`;
      }

      if (typeof processedValue === 'symbol') {
        return processedValue.toString();
      }

      if (typeof processedValue === 'object') {
        if (seen.has(processedValue)) {
          return '[Circular/Duplicate Reference]';
        }
        seen.add(processedValue);

        // Detect DOM elements and browser window objects
        if (typeof window !== 'undefined') {
          try {
            if ((typeof Node !== 'undefined' && processedValue instanceof Node) || 
                (typeof Window !== 'undefined' && processedValue instanceof Window) || 
                (typeof Event !== 'undefined' && processedValue instanceof Event)) {
              return `[Browser Object: ${processedValue.constructor?.name || 'DOM'}]`;
            }
          } catch (e) {}
        }

        // Detect Firebase / Firestore / Auth internal structures to prevent traversing circular/private states
        const constructorName = processedValue.constructor?.name;
        const isFirebase = 
          (constructorName && (
            constructorName === 'Y2' || 
            constructorName === 'Ka' || 
            constructorName === 'Za' || 
            constructorName.includes('Firestore') ||
            constructorName.includes('Auth') ||
            constructorName.includes('App') ||
            constructorName.includes('Storage') ||
            constructorName.includes('Snapshot') ||
            constructorName.includes('Reference') ||
            constructorName.includes('Query')
          )) ||
          processedValue._delegate ||
          processedValue._database ||
          processedValue._firestore ||
          processedValue._path ||
          (processedValue.i && (processedValue.i.src || processedValue.i.constructor?.name === 'Ka')) || 
          (processedValue.src && (processedValue.src.i || processedValue.src.constructor?.name === 'Y2'));

        if (isFirebase) {
          return `[Firebase Service Object: ${constructorName || 'Object'}]`;
        }
      }

      // Handle long strings
      if (typeof processedValue === 'string' && processedValue.length > 5000) {
        return `[Large String: ${processedValue.substring(0, 100)}... (${processedValue.length} bytes)]`;
      }

      return processedValue;
    }, indent);
  } catch (err) {
    // If anything fails, fallback to a completely basic safe stringify
    try {
      const basicSeen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (value !== null && typeof value === 'object') {
          if (basicSeen.has(value)) return '[Circular]';
          basicSeen.add(value);
          const cName = value.constructor?.name;
          if (cName && (cName === 'Y2' || cName === 'Ka' || cName.includes('Firestore') || cName.includes('Auth'))) {
            return `[Firebase Service Object: ${cName}]`;
          }
        }
        return value;
      }, indent);
    } catch (fallbackErr) {
      return `[Serialization Error: ${err instanceof Error ? err.message : String(err)}]`;
    }
  }
};
