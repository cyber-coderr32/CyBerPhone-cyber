
// Interceptação global de console para prevenir erros de "Converting circular structure to JSON"
// causados por serializadores de iframe/telemetria no console.error / console.warn
(function() {
  function sanitizeConsoleArg(arg: any, seen = new WeakSet()): any {
    if (arg === null || arg === undefined) return arg;
    if (typeof arg !== 'object') {
      if (typeof arg === 'function') {
        return `[Function: ${arg.name || 'anonymous'}]`;
      }
      if (typeof arg === 'symbol') {
        return arg.toString();
      }
      return arg;
    }

    if (seen.has(arg)) {
      return '[Circular/Duplicate Reference]';
    }
    seen.add(arg);

    if (arg instanceof Error) {
      const errObj: any = {
        name: arg.name,
        message: arg.message,
        code: (arg as any).code || (arg as any).status,
        stack: arg.stack,
      };
      Object.getOwnPropertyNames(arg).forEach(prop => {
        if (prop !== 'stack' && prop !== 'name' && prop !== 'message') {
          try {
            errObj[prop] = sanitizeConsoleArg((arg as any)[prop], seen);
          } catch (e) {
            errObj[prop] = "[Unreadable Property]";
          }
        }
      });
      return errObj;
    }

    if (typeof window !== 'undefined') {
      try {
        if ((typeof Node !== 'undefined' && arg instanceof Node) || 
            (typeof Window !== 'undefined' && arg instanceof Window) || 
            (typeof Event !== 'undefined' && arg instanceof Event)) {
          return `[Browser Object: ${arg.constructor?.name || 'DOM'}]`;
        }
      } catch (e) {}
    }

    const cName = arg.constructor?.name;
    if (cName && (
      cName === 'Y2' || 
      cName === 'Ka' || 
      cName === 'Za' || 
      cName.includes('Firestore') || 
      cName.includes('Auth') || 
      cName.includes('Firebase') ||
      cName.includes('App') ||
      cName.includes('Storage') ||
      cName.includes('Snapshot') ||
      cName.includes('Reference') ||
      cName.includes('Query')
    )) {
      return `[Firebase Service Object: ${cName}]`;
    }
    
    if (arg._delegate || arg._database || arg._firestore || arg._path) {
      return `[Firebase Service Object (implicit): ${cName || 'Object'}]`;
    }

    if (Array.isArray(arg)) {
      return arg.map(item => sanitizeConsoleArg(item, seen));
    }

    const copy: any = {};
    for (const key in arg) {
      if (Object.prototype.hasOwnProperty.call(arg, key)) {
        try {
          copy[key] = sanitizeConsoleArg(arg[key], seen);
        } catch (e) {
          copy[key] = "[Unreadable Property]";
        }
      }
    }
    return copy;
  }

  const originalConsoleError = console.error;
  console.error = function(...args) {
    const safeArgs = args.map(arg => {
      try {
        return sanitizeConsoleArg(arg);
      } catch (e) {
        return `[Serialization Error: ${e instanceof Error ? e.message : String(e)}]`;
      }
    });
    originalConsoleError.apply(console, safeArgs);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const safeArgs = args.map(arg => {
      try {
        return sanitizeConsoleArg(arg);
      } catch (e) {
        return `[Serialization Error: ${e instanceof Error ? e.message : String(e)}]`;
      }
    });
    originalConsoleWarn.apply(console, safeArgs);
  };
})();

import React from 'react';
import { createRoot } from 'react-dom/client';

// Polyfills para localStorage e sessionStorage em ambientes com restrição de cookies de terceiros (iFrame)
try {
  const test = window.localStorage;
} catch (e) {
  console.warn("⚠️ LocalStorage está desativado devido a restrições de iframe cruzado. Ativando fallback em memória.");
  const memoryStore: Record<string, string> = {};
  const mockStorage: Storage = {
    get length() {
      return Object.keys(memoryStore).length;
    },
    clear: () => {
      for (const k in memoryStore) delete memoryStore[k];
    },
    getItem: (key) => memoryStore[key] || null,
    key: (index) => Object.keys(memoryStore)[index] || null,
    removeItem: (key) => {
      delete memoryStore[key];
    },
    setItem: (key, value) => {
      memoryStore[key] = String(value);
    }
  };
  Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
}

try {
  const test = window.sessionStorage;
} catch (e) {
  console.warn("⚠️ SessionStorage está desativado devido a restrições de iframe cruzado. Ativando fallback em memória.");
  const memoryStore: Record<string, string> = {};
  const mockStorage: Storage = {
    get length() {
      return Object.keys(memoryStore).length;
    },
    clear: () => {
      for (const k in memoryStore) delete memoryStore[k];
    },
    getItem: (key) => memoryStore[key] || null,
    key: (index) => Object.keys(memoryStore)[index] || null,
    removeItem: (key) => {
      delete memoryStore[key];
    },
    setItem: (key, value) => {
      memoryStore[key] = String(value);
    }
  };
  Object.defineProperty(window, 'sessionStorage', { value: mockStorage, writable: true });
}

import App from './App';
import './index.css';
import './i18n';
import { safeJsonStringify } from './lib/utils';

console.log("[BOOT] index.tsx Iniciado");

// Captura erros globais de promessas (como os crashes internos do Firestore e do Firebase)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (!reason) return;

  const msg = reason.message || String(reason);
  const code = reason.code || '';
  const isFirebase = 
    msg.includes('FIRESTORE') || 
    msg.includes('firebase') || 
    msg.includes('Firebase') || 
    msg.includes('permission-denied') || 
    msg.includes('Missing or insufficient permissions') ||
    code.includes('permission-denied') ||
    (reason.constructor && (
      reason.constructor.name === 'FirebaseError' || 
      reason.constructor.name === 'Y2' || 
      reason.constructor.name === 'Ka'
    ));

  if (isFirebase) {
    console.warn("⚠️ Interceptado erro não tratado do Firebase. Prevenindo crash de serialização circular:", msg);
    // Loga de forma segura para evitar que o logger do sistema capture o erro circular bruto
    console.error("Firebase Error (Safe):", safeJsonStringify(reason));
    event.preventDefault(); // Impede o crash global de serialização no iframe pai
  }
});

// Captura erros síncronos globais
window.addEventListener('error', (event) => {
  const error = event.error;
  if (!error) return;

  const msg = error.message || String(error);
  const isFirebase = 
    msg.includes('FIRESTORE') || 
    msg.includes('firebase') || 
    msg.includes('Firebase') || 
    msg.includes('permission-denied') || 
    msg.includes('Missing or insufficient permissions') ||
    (error.constructor && (
      error.constructor.name === 'FirebaseError' || 
      error.constructor.name === 'Y2' || 
      error.constructor.name === 'Ka'
    ));

  if (isFirebase) {
    console.warn("⚠️ Interceptado erro síncrono do Firebase. Prevenindo crash de serialização circular:", msg);
    console.error("Firebase Error (Safe):", safeJsonStringify(error));
    event.preventDefault(); // Impede o crash global de serialização no iframe pai
  }
});

try {
  const container = document.getElementById('root');
  if (container) {
    console.log("[BOOT] Container encontrado, renderizando...");
    const root = createRoot(container);
    root.render(
        <App />
    );
  } else {
    console.error("[BOOT] Erro: #root não encontrado no DOM");
  }
} catch (fatalError) {
  console.error("[BOOT] ERRO FATAL EM index.tsx:", fatalError);
  document.body.innerHTML = `
    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px; background: #fff; color: #000;">
      <h1 style="color: red;">Falha Catastrófica de Inicialização</h1>
      <p style="color: #666;">${fatalError instanceof Error ? fatalError.message : 'Erro Desconhecido'}</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px;">Recarregar</button>
      <button onclick="localStorage.clear(); window.location.reload();" style="margin-top: 10px; padding: 10px 20px; cursor: pointer; border: 1px solid #ccc; border-radius: 8px;">Resetar Cache e Recarregar</button>
    </div>
  `;
}

// Service worker registration - Robust registration catching sandbox/iframe errors gracefully
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';
    const isDev = import.meta.env.DEV;
    navigator.serviceWorker.register(swUrl, { type: isDev ? 'module' : 'classic' })
      .then((reg) => {
        console.log('[PWA] Service Worker registrado com sucesso no escopo:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Informação: Registro de Service Worker pulado ou não suportado neste contexto (comum em iFrames ou modo anônimo):', err.message);
      });
  });
}
