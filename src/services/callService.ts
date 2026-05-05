import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { Call, CallStatus, CallType, User, NotificationType } from '../types';
import { createNotification } from './storageService';
import { safeJsonStringify } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
    }
  };
  const serialized = safeJsonStringify(errInfo);
  console.error('Firestore Error: ', serialized);
  throw new Error(serialized);
}

const CALLS_COLLECTION = 'calls';

export const startCall = async (caller: User, receiver: User, type: CallType): Promise<string> => {
  if (!db) return '';
  try {
    const callData = {
      callerId: caller.id,
      callerName: `${caller.firstName} ${caller.lastName}`,
      callerProfilePic: caller.profilePicture || '',
      receiverId: receiver.id,
      receiverName: `${receiver.firstName} ${receiver.lastName}`,
      receiverProfilePic: receiver.profilePicture || '',
      type,
      status: CallStatus.RINGING,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, CALLS_COLLECTION), callData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, CALLS_COLLECTION);
    return '';
  }
};

export const acceptCall = async (callId: string) => {
  if (!db) return;
  try {
    const docRef = doc(db, CALLS_COLLECTION, callId);
    await updateDoc(docRef, {
      status: CallStatus.ACCEPTED,
      acceptedAt: Date.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CALLS_COLLECTION}/${callId}`);
  }
};

export const rejectCall = async (callId: string) => {
  if (!db) return;
  try {
    const docRef = doc(db, CALLS_COLLECTION, callId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const callData = snap.data() as Call;
      await updateDoc(docRef, {
        status: CallStatus.REJECTED,
        endedAt: Date.now(),
      });
      // Even on reject, it's good to notify the user they missed a call if they didn't answer it (some apps do this)
      // But specifically here, if the user rejected it, they were there.
      // However, the user wants "not atendido" (not answered). 
      // If they rejected it, they technically "attended" to the UI but didn't "answer" the call.
      // I will create the notification anyway as it serves as a call log.
      await createNotification(callData.receiverId, callData.callerId, NotificationType.MISSED_CALL, undefined, undefined, callData.type);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CALLS_COLLECTION}/${callId}`);
  }
};

export const timeoutCall = async (callId: string) => {
  if (!db) return;
  try {
    const docRef = doc(db, CALLS_COLLECTION, callId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const callData = snap.data() as Call;
      if (callData.status === CallStatus.RINGING) {
        await updateDoc(docRef, {
          status: CallStatus.TIMED_OUT,
          endedAt: Date.now(),
        });
        await createNotification(callData.receiverId, callData.callerId, NotificationType.MISSED_CALL, undefined, undefined, callData.type);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CALLS_COLLECTION}/${callId}`);
  }
};

export const endCall = async (callId: string) => {
  if (!db) return;
  try {
    const docRef = doc(db, CALLS_COLLECTION, callId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const callData = snap.data() as Call;
      await updateDoc(docRef, {
        status: CallStatus.ENDED,
        endedAt: Date.now(),
      });
      // If the caller ends the call while it is still RINGING, it is a missed call for the receiver
      if (callData.status === CallStatus.RINGING) {
        await createNotification(callData.receiverId, callData.callerId, NotificationType.MISSED_CALL, undefined, undefined, callData.type);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CALLS_COLLECTION}/${callId}`);
  }
};

export const listenForCalls = (userId: string, onCall: (call: Call) => void) => {
  if (!db) return () => {};
  const qIncoming = query(
    collection(db, CALLS_COLLECTION),
    where('receiverId', '==', userId),
    where('status', '==', CallStatus.RINGING),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const qOutgoing = query(
    collection(db, CALLS_COLLECTION),
    where('callerId', '==', userId),
    where('status', '==', CallStatus.RINGING),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const unsubIncoming = onSnapshot(qIncoming, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        onCall({ id: change.doc.id, ...data } as Call);
      }
    });
  });

  const unsubOutgoing = onSnapshot(qOutgoing, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        onCall({ id: change.doc.id, ...data } as Call);
      }
    });
  });

  return () => {
    unsubIncoming();
    unsubOutgoing();
  };
};

export const listenForCallStatus = (callId: string, onUpdate: (call: Call) => void) => {
  if (!db) return () => {};
  const docRef = doc(db, CALLS_COLLECTION, callId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate({ id: docSnap.id, ...docSnap.data() } as Call);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${CALLS_COLLECTION}/${callId}`);
  });
};
