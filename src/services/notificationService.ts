
import { db } from './firebaseClient';
import { onSnapshot, collection, query, where, limit, orderBy } from 'firebase/firestore';
import { CallType } from '../types';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const showNotification = (title: string, options?: NotificationOptions & { url?: string }) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      if (options?.url) window.location.href = options.url;
      notification.close();
    };
  }
};

export const getNotificationContent = (type: string, actorName: string, context?: string, callType?: CallType) => {
  switch (type) {
    case 'LIKE':
      return { title: 'Novo Like! ❤️', body: `${actorName} curtiu sua publicação.` };
    case 'COMMENT':
      return { title: 'Novo Comentário! 💬', body: `${actorName} comentou: "${context || '...'}"` };
    case 'FOLLOW':
      return { title: 'Novo Seguidor! 👤', body: `${actorName} começou a te seguir.` };
    case 'MENTION':
      return { title: 'Menção! @', body: `${actorName} mencionou você.` };
    case 'SALE':
      return { title: 'VENDA REALIZADA! 🔥', body: `Parabéns! Você vendeu um ${context || 'produto'}. Confira os detalhes.` };
    case 'MISSED_CALL':
      const isVideo = callType === CallType.VIDEO;
      return { 
        title: isVideo ? 'Chamada de Vídeo Perdida 📹' : 'Chamada de Voz Perdida 📞', 
        body: `O ${actorName} tentou ligar para você!` 
      };
    default:
      return { title: 'Nova Notificação', body: `${actorName} interagiu com você.` };
  }
};

/**
 * Real-time listener for new sales targeting vendors.
 */
export const listenForNewSales = (vendorId: string, onNewSale: (sale: any) => void) => {
  if (!db) return () => {};

  const salesRef = collection(db, 'sales');
  // We look for any sale where sellerId is the user
  const q = query(
    salesRef, 
    where('sellerId', '==', vendorId),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  let initialLoad = true;

  return onSnapshot(q, (snapshot) => {
    if (initialLoad) {
      initialLoad = false;
      return;
    }

    snapshot.docChanges().forEach((change) => {
        // Only trigger for newly ADDED documents in the query
        if (change.type === 'added') {
           const sale = change.doc.data();
           onNewSale(sale);
        }
    });
  }, (error) => {
      console.error("Error listening for sales:", error);
  });
};
