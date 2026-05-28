
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

// Service worker registration - Enabled for top-level window to allow full PWA support & installability
if ('serviceWorker' in navigator && (window.self === window.top || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';
    navigator.serviceWorker.register(swUrl)
      .then((reg) => {
        console.log('[PWA] Service Worker registrado com sucesso no escopo:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Erro ao registrar o Service Worker:', err);
      });
  });
} else if (window.self !== window.top) {
  console.log('[PWA] Rodando dentro de um iframe. Registro de Service Worker pulado para garantir compatibilidade.');
}
