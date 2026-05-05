
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

console.log("[BOOT] index.tsx Iniciado");

// Captura erros globais de promessas (como os crashes internos do Firestore)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('FIRESTORE')) {
    console.warn("⚠️ Detectado erro interno do Firestore. Ignorando para manter estabilidade:", event.reason.message);
    event.preventDefault(); // Impede o crash global
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

import { Workbox } from 'workbox-window';

// Service worker registration
if ('serviceWorker' in navigator && window.self === window.top && import.meta.env.PROD) {
  const wb = new Workbox('/sw.js');

  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      console.log('[PWA] Service Worker ativado pela primeira vez!');
    } else {
      console.log('[PWA] Service Worker atualizado!');
    }
  });

  wb.register().then(registration => {
    console.log('[PWA] Service Worker registrado com sucesso:', registration?.scope);
  }).catch(err => {
    console.error('[PWA] Falha ao registrar Service Worker:', err);
  });
} else if (window.self !== window.top) {
  console.log('[PWA] Rodando dentro de um iframe. Registro de Service Worker pulado.');
}
