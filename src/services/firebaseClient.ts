import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getDocFromServer, getDoc, doc, enableNetwork, persistentLocalCache, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from '../../firebase-applet-config.json';
import { safeJsonStringify } from "../lib/utils";

// Inicialização segura do Singleton
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE";

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
  experimentalAutoDetectLongPolling: true,
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
        // Use getDocFromServer to force a network request
        await getDocFromServer(testDocRef);
        console.log("✅ Firestore Server Connection Successful");
      } catch (serverError: any) {
        // If it's just a permission error, we are actually online
        if (serverError.code === 'permission-denied') {
          console.log("✅ Firestore is reachable (Permission Denied is expected for 'test/connection')");
        } else if (serverError.message && (serverError.message.includes('offline') || serverError.code === 'unavailable')) {
          if (retries > 0) {
            console.warn(`⚠️ Firestore Offline/Unavailable. Tentando reconectar... (${retries} tentativas restantes)`);
            // Force disable and re-enable network
            await enableNetwork(db).catch(() => {});
            setTimeout(() => testConnection(retries - 1), 3000);
          } else {
            console.error("❌ Firestore Server Connection Failed: Client is offline.");
            console.log("ℹ️ Navigator Online Status:", navigator.onLine);
          }
        } else {
          console.warn("ℹ️ Firestore Server Connection Test Result:", serverError.message, "Code:", serverError.code);
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
