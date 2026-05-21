import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getDocFromServer, getDoc, getDocs, doc, query, collection, limit, enableNetwork, persistentLocalCache, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Carregar configuração do Firebase dinamicamente ou das variáveis de ambiente
const configs = import.meta.glob(['../../../firebase-applet-config.json', '/firebase-applet-config.json', '../../firebase-applet-config.json'], { eager: true });
const configKeys = Object.keys(configs);
const firebaseConfigFromJson = configKeys.length > 0 ? (configs[configKeys[0]] as any).default : {};

// Explicit static properties to guarantee Vite compilation replacement in production / Vercel
const firebaseConfig = {
  projectId: 
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 
    import.meta.env.VITE_PROJECT_ID ||
    import.meta.env.PROJECT_ID ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_PROJECT_ID || process.env.PROJECT_ID || (process.env as any).FIREBASE_PROJECT_ID) : "") ||
    firebaseConfigFromJson.projectId || 
    "",

  appId: 
    import.meta.env.VITE_FIREBASE_APP_ID || 
    import.meta.env.VITE_APP_ID ||
    import.meta.env.APP_ID ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_APP_ID || process.env.VITE_APP_ID || process.env.APP_ID || (process.env as any).FIREBASE_APP_ID) : "") ||
    firebaseConfigFromJson.appId || 
    "",

  apiKey: 
    import.meta.env.VITE_FIREBASE_API_KEY || 
    import.meta.env.VITE_API_KEY ||
    import.meta.env.API_KEY ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || (process.env as any).FIREBASE_API_KEY) : "") ||
    firebaseConfigFromJson.apiKey || 
    "",

  authDomain: 
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 
    import.meta.env.VITE_AUTH_DOMAIN ||
    import.meta.env.AUTH_DOMAIN ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_AUTH_DOMAIN || process.env.AUTH_DOMAIN || (process.env as any).FIREBASE_AUTH_DOMAIN) : "") ||
    firebaseConfigFromJson.authDomain || 
    "",

  firestoreDatabaseId: 
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 
    import.meta.env.VITE_FIRESTORE_DATABASE_ID ||
    import.meta.env.FIRESTORE_DATABASE_ID ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIRESTORE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID || (process.env as any).FIREBASE_FIRESTORE_DATABASE_ID) : "") ||
    firebaseConfigFromJson.firestoreDatabaseId || 
    "",

  storageBucket: 
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 
    import.meta.env.VITE_STORAGE_BUCKET ||
    import.meta.env.STORAGE_BUCKET ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_STORAGE_BUCKET || process.env.STORAGE_BUCKET || (process.env as any).FIREBASE_STORAGE_BUCKET) : "") ||
    firebaseConfigFromJson.storageBucket || 
    "",

  messagingSenderId: 
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 
    import.meta.env.VITE_MESSAGING_SENDER_ID ||
    import.meta.env.MESSAGING_SENDER_ID ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_MESSAGING_SENDER_ID || process.env.MESSAGING_SENDER_ID || (process.env as any).FIREBASE_MESSAGING_SENDER_ID) : "") ||
    firebaseConfigFromJson.messagingSenderId || 
    "",

  measurementId: 
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 
    import.meta.env.VITE_MEASUREMENT_ID ||
    import.meta.env.MEASUREMENT_ID ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.VITE_MEASUREMENT_ID || process.env.MEASUREMENT_ID || (process.env as any).FIREBASE_MEASUREMENT_ID) : "") ||
    firebaseConfigFromJson.measurementId || 
    ""
};

import { safeJsonStringify } from "../lib/utils";

// Inicialização segura do Singleton
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE" && firebaseConfig.apiKey !== "";

if (isFirebaseConfigured) {
  console.log("ℹ️ [FirebaseConfig] Project:", firebaseConfig.projectId, "API Key (masked):", firebaseConfig.apiKey.substring(0, 5) + "...");
} else {
  console.warn("⚠️ [FirebaseConfig] Firebase não configurado corretamente ou usando placeholders.");
}

let app: any = null;
try {
  app = isFirebaseConfigured ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null;
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase App:", safeJsonStringify(error));
}

const auth = app ? getAuth(app) : null;

// Use the provided database ID, fallback to undefined for (default)
const dbIdFromConfig = firebaseConfig.firestoreDatabaseId;
const dbId = (dbIdFromConfig && dbIdFromConfig !== "TODO_FIRESTORE_DATABASE_ID" && dbIdFromConfig !== "(default)") 
  ? dbIdFromConfig 
  : undefined;

if (dbId) {
  console.log("ℹ️ [Firestore] Usando Database ID customizado:", dbId);
} else {
  console.log("ℹ️ [Firestore] Usando Database ID padrão (default)");
}
  
// Use initializeFirestore with auto-detect settings to fix "client is offline" issues
// We use memoryLocalCache temporarily to resolve the "INTERNAL ASSERTION FAILED: Unexpected state" 
// which is often caused by persistence corruption in iframe environments.
const db = app ? initializeFirestore(app, {
  // @ts-ignore
  experimentalForceLongPolling: true,
  // @ts-ignore
  useFetchStreams: false,
  // @ts-ignore
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
}, dbId as any) : null;
const storage = app ? getStorage(app) : null;

if (isFirebaseConfigured && app && db) {
  console.log("🚀 Firebase Cloud (Firestore/Auth) Ativo:", firebaseConfig.projectId);
  
  // Test connection as recommended in instructions
  const testConnection = async (retries = 3) => {
    try {
      // Proactively try to enable network
      await enableNetwork(db).catch(err => console.warn("ℹ️ enableNetwork result:", err.message));
      
      const testDocRef = doc(db, 'test', 'connection');
      
      // Try to get from server directly to verify connectivity
      try {
        console.log("ℹ️ [Firestore] Iniciando teste de conexão direta com o servidor...");
        // Use getDocs instead of getDoc to verify collection read too
        await getDocs(query(collection(db, 'settings'), limit(1)));
        console.log("✅ Firestore Server Connection Successful via getDocs");
      } catch (serverError: any) {
        // If it's a timeout or unreachable
        if (serverError.message && (serverError.message.includes('backend') || serverError.message.includes('10 seconds'))) {
           console.error("❌ [CRITICAL] Firestore Backend Unreachable. Switching to recovery mode.");
           // Force disable and re-enable network with long polling priority
           await enableNetwork(db).catch(() => {});
           if (retries > 0) {
             console.log(`ℹ️ Tentando recuperação em 5s... (${retries} tentativas)`);
             setTimeout(() => testConnection(retries - 1), 5000);
           }
        } else if (serverError.code === 'permission-denied') {
          console.log("✅ Firestore is reachable (Permission Denied is expected/safe here)");
        } else {
          console.warn("ℹ️ Firestore Server Connection Result:", serverError.message);
        }
      }
    } catch (error: any) {
      console.log("ℹ️ Firestore Initial Connection Test Error:", error.message);
    }
  };
  testConnection();
}

export { auth, db, storage };
export default app;
