
import { User, Post, PostType, ChatConversation, AdCampaign, Store, Product, AffiliateSale, Comment, ShippingAddress, ProductType, AudioTrack, Notification, NotificationType, CartItem, ProductRating, OrderStatus, CyberEvent, Story, Transaction, ContentReport, SystemLog, GlobalSettings, TransactionType, ChatType, GroupTheme, Message, SupportTicket, SupportMessage, AffiliateLink, CallType, AdminSignal } from '../types';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { safeJsonStringify } from '../lib/utils';
import { checkContentSecurity } from './sentinelService';
import { auth, db, storage, isFirebaseConfigured } from './firebaseClient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, updatePassword } from 'firebase/auth';
import { 
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, addDoc, onSnapshot,
  getDocFromServer, getDocsFromServer, QuerySnapshot, DocumentData, arrayUnion, increment, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- CLOUDINARY CONFIG ---
// Prioritize environment variables, then fallback to hardcoded values
export const CLOUDINARY_CLOUD_NAME = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'dblnktl9m';
export const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'CONEXWORLD';

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET && CLOUDINARY_CLOUD_NAME !== 'dblnktl9m') {
  console.log("✅ Cloudinary configurado via variáveis de ambiente.");
} else if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
  console.log("✅ Cloudinary configurado com sucesso (Hardcoded).");
} else {
  console.warn("⚠️ Cloudinary não detectado. Verifique as variáveis de ambiente VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET.");
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * Tratamento global de erros do Firestore
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Create a safe authInfo object
  const authInfo = {
    userId: auth?.currentUser?.uid || 'anonymous',
    email: auth?.currentUser?.email || null,
    emailVerified: auth?.currentUser?.emailVerified || false,
    isAnonymous: auth?.currentUser?.isAnonymous || false,
    tenantId: auth?.currentUser?.tenantId || null,
    providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
      providerId: String(provider.providerId || ''),
      displayName: String(provider.displayName || ''),
      email: String(provider.email || ''),
      photoUrl: String(provider.photoURL || '')
    })) || []
  };

  const errInfo = {
    error: errMessage,
    authInfo,
    operationType,
    path: String(path)
  };

  try {
    const serialized = safeJsonStringify(errInfo);
    console.error('Firestore Error: ', serialized);
    throw new Error(serialized);
  } catch (stringifyError) {
    // If stringify fails, log a simpler message
    const fallbackMessage = `Firestore Error [${operationType}] at [${path}]: ${errMessage}`;
    console.error(fallbackMessage);
    throw new Error(fallbackMessage);
  }
}

const CURRENT_USER_KEY = 'cyberphone_current_user_id';

/**
 * MAPEADOR DE DADOS
 * Garante que os dados do usuário sejam respeitados
 */
export const mapUserData = (id: string, dbData: any, authUser?: any): User => {
    const authDisplayName = authUser?.displayName || "";
    const authPhotoURL = authUser?.photoURL || "";

    // Mapeia nomes e fotos reais
    let firstName = dbData?.firstName || authDisplayName.split(' ')[0] || "";
    let lastName = dbData?.lastName || authDisplayName.split(' ').slice(1).join(' ') || "";

    const isGoogle = authUser?.providerData?.some((p: any) => p.providerId === 'google.com');

    // Se não tiver nome e NÃO for Google, evitamos o uso do e-mail como nome
    // A menos que o usuário explicitamente deseje (no caso do Google, é o padrão aceitável)
    if (!firstName && authUser?.email) {
        if (isGoogle) {
            firstName = authUser.email.split('@')[0];
            firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            lastName = "Membro";
        } else {
            firstName = "Usuário";
            lastName = "CyberPhone";
        }
    }

    const email = (dbData?.email || authUser?.email || '').toLowerCase().trim();
    const isAdminEmail = email === 'ac926815124@gmail.com' || email === 'alfaajmc@gmail.com';

    const lastSeen = Number(dbData?.lastSeen || 0);
    const isOnline = !!dbData?.isOnline;
    // Consideramos online apenas se o flag for true E houver atividade nos últimos 5 minutos
    const isActuallyOnline = isOnline && (Date.now() - lastSeen < 5 * 60 * 1000);

    return {
        id: id,
        firstName: firstName || 'Usuário',
        lastName: lastName || 'Membro',
        email: email,
        phone: dbData?.phone || authUser?.phoneNumber || '',
        documentId: dbData?.documentId || '',
        birthDate: Number(dbData?.birthDate || Date.now()),
        gender: dbData?.gender || null,
        profilePicture: dbData?.profilePicture || authPhotoURL || DEFAULT_PROFILE_PIC,
        coverPhoto: dbData?.coverPhoto || '',
        followedUsers: dbData?.followedUsers || [],
        followers: dbData?.followers || [],
        balance: Number(dbData?.balance || 0),
        bio: dbData?.bio || '',
        country: dbData?.country || '',
        academicRole: dbData?.academicRole || 'ALUNO',
        storeId: dbData?.storeId || null,
        isAdmin: isAdminEmail || !!dbData?.isAdmin,
        isVerified: isAdminEmail || !!dbData?.isVerified,
        idVerificationStatus: isAdminEmail ? 'APPROVED' : (dbData?.idVerificationStatus || 'NOT_STARTED'),
        idVerificationDocs: dbData?.idVerificationDocs || null,
        userType: isAdminEmail ? 'CREATOR' : (dbData?.userType || 'STANDARD'),
        isOnline: isActuallyOnline,
        lastSeen: lastSeen,
        isMonetized: !!dbData?.isMonetized,
        monetizationStatus: dbData?.monetizationStatus || 'INELIGIBLE',
        monetizationGoals: dbData?.monetizationGoals || {
            followersGoal: 1000,
            watchHoursGoal: 4000,
            shortsViewsGoal: 10000000,
            currentFollowers: dbData?.followers?.length || 0,
            currentWatchHours: dbData?.monetizationGoals?.currentWatchHours || 0,
            currentShortsViews: dbData?.monetizationGoals?.currentShortsViews || 0,
            termsAccepted: !!dbData?.monetizationGoals?.termsAccepted,
            verificationStep: dbData?.idVerificationStatus === 'APPROVED'
        },
        address: dbData?.address || undefined,
        blockedUserIds: dbData?.blockedUserIds || [],
        createdAt: dbData?.createdAt || Number(id.split('-')[1]) || Date.now()
    } as User;
};

export const promoteProduct = async (userId: string, productId: string, days: number, costPerDay: number): Promise<boolean> => {
  if (!db || !auth) return false;
  const totalCost = days * costPerDay;
  
  try {
    const user = await findUserById(userId);
    if (!user || (user.balance || 0) < totalCost) {
      throw new Error("Saldo insuficiente para promover.");
    }

    const batch = writeBatch(db);
    
    // Deduct balance
    const userRef = doc(db, 'profiles', userId);
    batch.update(userRef, { balance: increment(-totalCost) });

    // Update product
    const productRef = doc(db, 'products', productId);
    batch.update(productRef, {
      promotedUntil: Date.now() + (days * 24 * 60 * 60 * 1000),
      promotionDays: days
    });

    // Create transaction
    const transId = generateUUID();
    const transRef = doc(db, 'transactions', transId);
    batch.set(transRef, {
      id: transId,
      userId,
      type: TransactionType.BOOST,
      amount: totalCost,
      description: `Promoção de Produto (${days} dias) - ID: ${productId}`,
      timestamp: Date.now(),
      status: 'COMPLETED'
    });

    await batch.commit();
    return true;
  } catch (err) {
    console.error("Error promoting product:", safeJsonStringify(err));
    throw err;
  }
};

export const promoteAdCampaign = async (userId: string, campaignId: string, days: number, costPerDay: number): Promise<boolean> => {
  if (!db || !auth) return false;
  const totalCost = days * costPerDay;
  
  try {
    const user = await findUserById(userId);
    if (!user || (user.balance || 0) < totalCost) {
      throw new Error("Saldo insuficiente para promover.");
    }

    const batch = writeBatch(db);
    
    // Deduct balance
    const userRef = doc(db, 'profiles', userId);
    batch.update(userRef, { balance: increment(-totalCost) });

    // Update campaign
    const campaignRef = doc(db, 'ad_campaigns', campaignId);
    batch.update(campaignRef, {
      endDate: Date.now() + (days * 24 * 60 * 60 * 1000),
      promotedUntil: Date.now() + (days * 24 * 60 * 60 * 1000),
      isActive: true
    });

    // Create transaction
    const transId = generateUUID();
    const transRef = doc(db, 'transactions', transId);
    batch.set(transRef, {
      id: transId,
      userId,
      type: TransactionType.BOOST,
      amount: totalCost,
      description: `Promoção de Anúncio (${days} dias) - ID: ${campaignId}`,
      timestamp: Date.now(),
      status: 'COMPLETED'
    });

    await batch.commit();
    return true;
  } catch (err) {
    console.error("Error promoting ad campaign:", safeJsonStringify(err));
    throw err;
  }
};
export const findUserById = async (userId: string, authUserReference?: any): Promise<User | undefined> => {
  if (!userId || !isFirebaseConfigured || !db) return undefined;
  
  const currentAuth = authUserReference || auth?.currentUser;
  const isOwner = currentAuth?.uid === userId;

  // Processar cobranças automáticas de anúncios se for o dono
  if (isOwner) {
    checkAndProcessAdBilling(userId).catch(err => console.error("[ADS] Error processing ads:", safeJsonStringify(err)));
  }
  
  try {
    console.log("[STORAGE] Buscando documento no Firestore para:", userId);
    let docSnap;
    let data;
    let foundInPrivate = false;

    if (isOwner) {
      try {
        console.log("[STORAGE] Tentando acesso privado (profiles)...");
        docSnap = await getDoc(doc(db, 'profiles', userId));
        if (docSnap.exists()) {
          data = docSnap.data();
          foundInPrivate = true;
          console.log("[STORAGE] Perfil privado encontrado.");
        }
      } catch (err: any) {
        console.warn("[STORAGE] Falha na leitura privada, tentando pública:", err.message || err);
      }
    }

    if (!foundInPrivate) {
      docSnap = await getDoc(doc(db, 'public_profiles', userId));
      if (docSnap.exists()) {
        data = docSnap.data();
      }
    }
    
    if (data) {
      return mapUserData(userId, data, currentAuth);
    } else if (currentAuth && isOwner) {
      // Se for o dono e não existir em lugar nenhum, cria o perfil básico
      const newUser = mapUserData(userId, null, currentAuth);
      
      try {
        const filteredPrivate = filterProfileData({ ...newUser, updatedAt: Date.now() });
        await setDoc(doc(db, 'profiles', userId), filteredPrivate);

        const { email, phone, documentId, birthDate, balance, ...publicDataRaw } = newUser;
        const filteredPublic = filterProfileData({ ...publicDataRaw, updatedAt: Date.now() });
        await setDoc(doc(db, 'public_profiles', userId), filteredPublic);
      } catch (err) {
        console.error("[STORAGE] Erro ao criar perfil inicial automatico:", safeJsonStringify(err));
        // We don't throw here to avoid blocking the main auth flux if it's just a sync issue,
        // but it's good to know it happened.
      }
      
      return newUser;
    }
  } catch (e: any) { 
    if (e.message && e.message.includes('offline')) {
      console.warn("⚠️ Firestore Offline em findUserById:", e.message);
    } else {
      // Don't throw for simple not found or expected permission errors on public lookups
      console.error("[STORAGE] Erro em findUserById:", e.message);
    }
  }
  return undefined;
};

// --- AUTENTICAÇÃO ---

export const loginWithGoogle = async (): Promise<User> => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado.");
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const user = await findUserById(userCredential.user.uid, userCredential.user);
    
    if (user) return user;
    
    // Create new profile for Google user if not exists
    console.log("[STORAGE] Novo usuário Google, criando perfil...");
    const newUser = await createFirestoreUser(userCredential.user.uid, {
      firstName: userCredential.user.displayName?.split(' ')[0] || 'Usuário',
      lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ') || 'Google',
      email: userCredential.user.email,
      phone: '',
      birthDate: Date.now(),
      gender: '',
      country: '',
      academicRole: 'ALUNO'
    }, userCredential.user);
    
    return newUser;
  } catch (e: any) {
    console.error("Erro no login Google:", safeJsonStringify(e));
    throw e;
  }
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const emailClean = (email || '').toLowerCase().trim();
  console.log("[STORAGE] Tentando login para:", emailClean, "Auth inicializado:", !!auth);
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado. Isso pode ser um problema de conexão temporário. Por favor, recarregue a página.");
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailClean, password);
    const user = await findUserById(userCredential.user.uid, userCredential.user);
    
    // Check for super admin email
    const isAdminEmail = emailClean === 'ac926815124@gmail.com' || emailClean === 'alfaajmc@gmail.com';
    // Check for admin status to sync to the admins collection for faster rule checks
    if (user && user.isAdmin && db) {
      try {
        await setDoc(doc(db, 'admins', userCredential.user.uid), {
          email: emailClean,
          timestamp: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn("[STORAGE] Erro ao sincronizar admins:", err);
      }
    }

    if (isAdminEmail && user && db) {
      if (!user.isAdmin || !user.isVerified || user.userType !== 'CREATOR') {
        const updatedData = {
          isAdmin: true,
          isVerified: true,
          userType: 'CREATOR'
        };
        await updateDoc(doc(db, 'profiles', user.id), updatedData);
        await updateDoc(doc(db, 'public_profiles', user.id), updatedData);
        user.isAdmin = true;
        user.isVerified = true;
        user.userType = 'CREATOR';
      }
    }

    if (user) return user;
    
    // Se logou mas não achou perfil, tenta criar um básico (fallback)
    console.warn("[STORAGE] Usuário logado mas perfil não encontrado. Criando fallback.");
    const fallbackUser = mapUserData(userCredential.user.uid, null, userCredential.user);
    fallbackUser.blockedUserIds = [];
    
    // Auto-admin for fallback too
    if (isAdminEmail && db) {
      fallbackUser.isAdmin = true;
      fallbackUser.isVerified = true;
      fallbackUser.userType = 'CREATOR';
      
      // Save it
      const filteredPrivate = filterProfileData({ ...fallbackUser, updatedAt: Date.now() });
      await setDoc(doc(db, 'profiles', fallbackUser.id), filteredPrivate);
      
      const { email: e, phone, documentId, birthDate, balance, ...publicDataRaw } = fallbackUser;
      const filteredPublic = filterProfileData({ ...publicDataRaw, updatedAt: Date.now() });
      await setDoc(doc(db, 'public_profiles', fallbackUser.id), filteredPublic);
    }

    return fallbackUser;
  } catch (e: any) {
    console.error("Erro no login:", safeJsonStringify(e));
    
    // Tratamento de erros amigáveis do Firebase Auth
    if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
      // Repassamos o erro original para que o AuthPage possa usar o code amigável definido lá
      throw e;
    }
    if (e.code === 'auth/too-many-requests') {
      throw e;
    }
    if (e.code === 'auth/user-disabled') {
       throw e;
    }
    if (e.code === 'auth/invalid-email') {
       throw e;
    }
    
    throw e;
  }
};

export const createFirestoreUser = async (uid: string, userData: any, authUser: any): Promise<User> => {
    let profilePicUrl = userData.profilePicture || DEFAULT_PROFILE_PIC;
    if (userData.profileImageFile) {
      try {
        profilePicUrl = await uploadFile(userData.profileImageFile, 'profiles');
      } catch (err) {
        console.warn("Erro ao fazer upload da foto de perfil:", err);
      }
    }

    let coverPhotoUrl = userData.coverPhoto || '';
    if (userData.coverImageFile) {
      try {
        coverPhotoUrl = await uploadFile(userData.coverImageFile, 'covers');
      } catch (err) {
        console.warn("Erro ao fazer upload da foto de capa:", err);
      }
    }

    try {
      await updateProfile(authUser, {
        displayName: `${userData.firstName} ${userData.lastName}`,
        photoURL: profilePicUrl
      });
    } catch (err) {
      console.warn("Erro ao atualizar displayName no Auth:", err);
    }

    const emailClean = (userData.email || '').toLowerCase().trim();
    const isAdminEmail = emailClean === 'ac926815124@gmail.com' || emailClean === 'alfaajmc@gmail.com';
    const newUser = mapUserData(uid, { 
      ...userData, 
      profilePicture: profilePicUrl,
      coverPhoto: coverPhotoUrl,
      birthDate: userData.birthDate || Date.now(),
      gender: userData.gender,
      academicRole: userData.academicRole || 'ALUNO',
      isAdmin: isAdminEmail ? true : !!userData.isAdmin,
      isVerified: isAdminEmail ? true : !!userData.isVerified,
      userType: isAdminEmail ? 'CREATOR' : (userData.userType || 'STANDARD'),
      blockedUserIds: []
    }, authUser);
    
    // Private profile (contains PII)
    try {
      if (db) {
        const filteredPrivate = filterProfileData({
            ...newUser,
            balance: 1000, // Dá saldo inicial de 1000 KZ para testes
            followedUsers: [],
            followers: [],
            updatedAt: Date.now()
        });
        await setDoc(doc(db, 'profiles', uid), filteredPrivate);

        // Public profile (no PII)
        const { email, phone, documentId, balance, ...publicDataRaw } = newUser;
        const filteredPublic = filterProfileData({
            ...publicDataRaw,
            birthDate: newUser.birthDate,
            country: newUser.country || '',
            balance: 1000, // Sincroniza saldo inicial
            followedUsers: [],
            followers: [],
            updatedAt: Date.now()
        });
        await setDoc(doc(db, 'public_profiles', uid), filteredPublic);

        // Registrar unicidade do e-mail
        await setDoc(doc(db, 'uniqueness_registry', `email_${emailClean}`), {
          userId: uid,
          updatedAt: Date.now()
        });

        // Registrar unicidade do documento se fornecido
        if (newUser.documentId) {
          await setDoc(doc(db, 'uniqueness_registry', `documentId_${newUser.documentId.toLowerCase().trim()}`), {
            userId: uid,
            updatedAt: Date.now()
          });
        }

        // Registrar unicidade do telefone se fornecido
        if (newUser.phone) {
          await setDoc(doc(db, 'uniqueness_registry', `phone_${newUser.phone.toLowerCase().trim()}`), {
            userId: uid,
            updatedAt: Date.now()
          });
        }
      }
    } catch (err) {
      console.error("Erro ao criar perfis ou registrar unicidade:", safeJsonStringify(err));
      handleFirestoreError(err, OperationType.CREATE, 'profiles/' + uid);
    }
    
    return newUser;
};

export const checkFieldUniqueness = async (field: string, value: string): Promise<boolean> => {
  if (!db || !value) return true;
  try {
    // Usamos o registry para evitar problemas de permissão e PII
    const registryId = `${field}_${value.toLowerCase().trim()}`;
    const docSnap = await getDoc(doc(db, 'uniqueness_registry', registryId));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentUserId = auth?.currentUser?.uid;
      // Se o ID registrado for o meu, então é único para mim (estou apenas re-verificando)
      if (currentUserId && data.userId === currentUserId) {
        return true;
      }
      return false;
    }

    // Fallback para perfis públicos se for campo público (username etc)
    // Mas para documentId, email, phone, o registry é a fonte da verdade.
    if (['documentId', 'email', 'phone'].includes(field)) {
      return true;
    }

    const q = query(collection(db, 'public_profiles'), where(field, '==', value));
    const snap = await getDocs(q);
    return snap.empty;
  } catch (err) {
    console.error(`Erro ao verificar unicidade do campo ${field}:`, safeJsonStringify(err));
    return true; 
  }
};

export const registerUniqueness = async (field: string, value: string, userId: string) => {
  if (!db || !value) return;
  const registryId = `${field}_${value.toLowerCase().trim()}`;
  try {
    await setDoc(doc(db, 'uniqueness_registry', registryId), {
      userId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Erro ao registrar unicidade: ${registryId}`, safeJsonStringify(error));
  }
};

export const registerUser = async (userData: any): Promise<User> => {
  console.log("[STORAGE] Tentando registro para:", userData.email, "Auth inicializado:", !!auth);
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado. Isso pode ser um problema de conexão temporário. Por favor, recarregue a página.");
  }

  // Validação de unicidade do documento
  if (userData.documentId) {
    const isDocUnique = await checkFieldUniqueness('documentId', userData.documentId);
    if (!isDocUnique) {
      throw new Error("Este número de documento já está vinculado a outra conta.");
    }
  }

  // Validação de unicidade do telefone (se houver)
  if (userData.phone) {
    const isPhoneUnique = await checkFieldUniqueness('phone', userData.phone);
    if (!isPhoneUnique) {
      throw new Error("Este número de celular já está vinculado a outra conta.");
    }
  }

  // Validação de unicidade do e-mail no Firestore (além do Firebase Auth)
  const isEmailUnique = await checkFieldUniqueness('email', userData.email);
  if (!isEmailUnique) {
    throw new Error("Este e-mail já está em uso por outra conta.");
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    return await createFirestoreUser(userCredential.user.uid, userData, userCredential.user);
  } catch (e: any) {
    // Se o e-mail já existe, vamos tentar logar e criar o perfil se estiver faltando
    if (e.code === 'auth/email-already-in-use' || e.message?.includes('EMAIL_EXISTS')) {
      try {
        console.log("[STORAGE] E-mail já existe no Auth. Tentando sincronizar perfil...");
        const loginCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
        // Se conseguimos logar, então a senha está correta. Garantimos o perfil no Firestore.
        return await createFirestoreUser(loginCredential.user.uid, userData, loginCredential.user);
      } catch (loginErr) {
        // Se falhou o login (ex: senha errada), lançamos o erro original de e-mail em uso
        console.error("Erro ao sincronizar perfil após e-mail em uso:", safeJsonStringify(loginErr));
        throw e;
      }
    }
    console.error("Erro no registro:", safeJsonStringify(e));
    throw e;
  }
};

export const recoverPassword = async (email: string): Promise<void> => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado. Isso pode ser um problema de conexão temporário. Por favor, recarregue a página.");
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (e: any) {
    console.error("Erro na recuperação de senha:", safeJsonStringify(e));
    throw e;
  }
};

// --- CONTEÚDO (FIRESTORE) ---

export const sanitizeStaleUrls = <T>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeStaleUrls(item)) as any;
  }
  
  const copy = { ...obj } as any;
  for (const key in copy) {
    if (Object.prototype.hasOwnProperty.call(copy, key)) {
      const val = copy[key];
      if (typeof val === 'string' && (val.startsWith('blob:') || val.includes('blob:'))) {
        if (key.toLowerCase().includes('video')) {
          copy[key] = 'https://vjs.zencdn.net/v/oceans.mp4';
        } else {
          copy[key] = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
        }
      } else if (typeof val === 'object' && val !== null) {
        copy[key] = sanitizeStaleUrls(val);
      }
    }
  }
  return copy as T;
};

export const getPosts = async (user?: User): Promise<Post[]> => {
  if (!isFirebaseConfigured || !db) return [];
  const currentUserId = user?.id;
  try {
    const q = query(
      collection(db, 'posts'), 
      orderBy('timestamp', 'desc')
    );
    
    let snap;
    try {
      snap = await getDocs(q);
    } catch (initialError: any) {
      if (initialError.message && initialError.message.includes('offline')) {
        console.warn("⚠️ Firestore Offline em getPosts. Tentando getDocsFromServer...");
        snap = await getDocsFromServer(q);
      } else {
        throw initialError;
      }
    }
    let posts = snap.docs.map(d => ({ ...d.data(), id: d.id } as Post));

    // Filter Boosted posts by Age and Location if user is provided
    if (user) {
        const userAge = (Date.now() - user.birthDate) / (31536000000); // 365 days
        const userLocation = user.country?.toLowerCase() || '';

        posts = posts.filter(p => {
            if (!p.isBoosted || (p.boostExpires && p.boostExpires < Date.now())) return true;
            
            // Age Check
            if (p.minAge && userAge < p.minAge) return false;
            if (p.maxAge && userAge > p.maxAge) return false;

            // Location Check
            if (p.targetLocations && p.targetLocations.length > 0) {
                const matchesLocation = p.targetLocations.some(loc => 
                    loc.toLowerCase().includes(userLocation) || 
                    userLocation.includes(loc.toLowerCase()) ||
                    loc.toLowerCase() === 'global'
                );
                if (!matchesLocation) return false;
            }

            return true;
        });
    }

    // Mutual Blocking Filter
    if (currentUserId) {
        const hiddenIds = await getMutualBlockedUserIds(currentUserId);
        if (hiddenIds.length) {
            posts = posts.filter(p => !hiddenIds.includes(p.userId));
        }
    }

    // Ordenação personalizada: Impulsionados (por valor do lance) primeiro, depois por data
    const sorted = posts.sort((a, b) => {
      const now = Date.now();
      const bidA = (a.isBoosted && a.boostExpires && a.boostExpires > now) ? (a.boostBid || 0) : 0;
      const bidB = (b.isBoosted && b.boostExpires && b.boostExpires > now) ? (b.boostBid || 0) : 0;
      
      if (bidB !== bidA) return bidB - bidA;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
    return sorted.map(p => sanitizeStaleUrls(p));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'posts');
    return [];
  }
};

export const getReels = async (user?: User): Promise<Post[]> => {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'REEL')
    );
    
    let snap;
    try {
      snap = await getDocs(q);
    } catch (initialError: any) {
      if (initialError.message && initialError.message.includes('offline')) {
        snap = await getDocsFromServer(q);
      } else {
        throw initialError;
      }
    }
    let posts = snap.docs.map(d => ({ ...d.data(), id: d.id } as Post));

    // Filter Boosted reels by Age and Location if user is provided
    if (user) {
        const userAge = (Date.now() - user.birthDate) / (31536000000); // 365 days
        const userLocation = user.country?.toLowerCase() || '';

        posts = posts.filter(p => {
            if (!p.isBoosted || (p.boostExpires && p.boostExpires < Date.now())) return true;
            
            // Age Check
            if (p.minAge && userAge < p.minAge) return false;
            if (p.maxAge && userAge > p.maxAge) return false;

            // Location Check
            if (p.targetLocations && p.targetLocations.length > 0) {
                const matchesLocation = p.targetLocations.some(loc => 
                    loc.toLowerCase().includes(userLocation) || 
                    userLocation.includes(loc.toLowerCase()) ||
                    loc.toLowerCase() === 'global'
                );
                if (!matchesLocation) return false;
            }

            return true;
        });
    }

    // Ordenação personalizada: Impulsionados (por valor do lance) primeiro, depois por data
    const sorted = posts.sort((a, b) => {
      const now = Date.now();
      const bidA = (a.isBoosted && a.boostExpires && a.boostExpires > now) ? (a.boostBid || 0) : 0;
      const bidB = (b.isBoosted && b.boostExpires && b.boostExpires > now) ? (b.boostBid || 0) : 0;
      
      if (bidB !== bidA) return bidB - bidA;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
    return sorted.map(p => sanitizeStaleUrls(p));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'posts');
    return [];
  }
};

export const getPostById = async (id: string): Promise<Post | undefined> => {
  if (!isFirebaseConfigured || !db) return undefined;
  const docSnap = await getDoc(doc(db, 'posts', id));
  return docSnap.exists() ? sanitizeStaleUrls({ ...docSnap.data(), id: docSnap.id } as Post) : undefined;
};

export const addPost = async (post: Post) => {
  if (!isFirebaseConfigured || !db) return;

  // Sentinela AI Check
  const security = await checkContentSecurity(post.content || '', 'post');
  if (!security.allowed) {
      throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
  }

  // Garantir campos obrigatórios para as regras
  const postData = {
    ...post,
    isAnonymous: !!post.isAnonymous,
    timestamp: post.timestamp || Date.now()
  };

  try {
    await setDoc(doc(db, 'posts', post.id), postData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'posts/' + post.id);
  }
};

export const updatePost = async (post: Post) => {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, 'posts', post.id), post as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'posts/' + post.id);
  }
};

export const deletePost = async (postId: string) => {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'posts/' + postId);
  }
};

// --- UPLOAD (CLOUDINARY) ---

export const uploadFile = async (file: File | Blob, folder: string, retryCount = 0): Promise<string> => {
  const isVideo = folder === 'reels' || (file instanceof File && file.type.startsWith('video/'));
  const resourceType = isVideo ? 'video' : 'auto';

  // 1. Tenta Upload Direto via Client-side (Cloudinary Unsigned) primeiro para arquivos grandes ou vídeos
  // Isso evita limites de payload e timeouts de serverless (ex: Vercel 4.5MB limite de body / 10s timeout)
  try {
    console.log(`[Cloudinary Direct] Tentando upload direto para vídeos/arquivos (${retryCount + 1}/3)...`);
    const directFormData = new FormData();
    directFormData.append('file', file);
    directFormData.append('upload_preset', 'CONEXWORLD');
    directFormData.append('folder', `cyberphone/${folder}`);

    const cloudUrl = `https://api.cloudinary.com/v1_1/dblnktl9m/${resourceType}/upload`;
    const response = await fetch(cloudUrl, {
      method: 'POST',
      body: directFormData
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ [Cloudinary Direct] Upload direto concluído com sucesso:", data.secure_url);
      return data.secure_url;
    } else {
      console.warn("[Cloudinary Direct] Upload direto falhou, tentando proxy do servidor...");
    }
  } catch (directErr) {
    console.warn("[Cloudinary Direct] Exceção no upload direto:", directErr);
  }

  // 2. Tenta o Proxy do Servidor como alternativa de segurança
  try {
    console.log(`[Proxy Upload] Iniciando upload via proxy (${retryCount + 1}/3) para pasta: ${folder}`);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', `cyberphone/${folder}`);
    formData.append('resourceType', resourceType);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
      console.error("[Proxy Upload] Erro detalhado:", safeJsonStringify(errorData));
      throw new Error(errorData.error || 'Falha no upload via proxy');
    }

    const data = await response.json();
    console.log("✅ [Proxy Upload] Upload via proxy concluído com sucesso!");
    return data.secure_url; 
  } catch (error: any) {
    console.error(`❌ Erro no upload Proxy (Tentativa ${retryCount + 1}):`, safeJsonStringify(error.message || error));
    
    // Tenta novamente com tempo de espera
    if (retryCount < 2) {
      console.log(`[Proxy Upload] Tentando novamente em 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return uploadFile(file, folder, retryCount + 1);
    }

    // Se tudo falhar, tenta usar blob local como último recurso para não quebrar a UI
    console.warn("⚠️ Todos os métodos de upload falharam. Usando URL de objeto local.");
    return URL.createObjectURL(file);
  }
};

// --- FUNÇÕES SOCIAIS ---

export const toggleBlockUser = async (cur: string, target: string) => {
  if (!db) return;
  try {
    const u1 = await findUserById(cur);
    if (u1) {
      const isBlocked = u1.blockedUserIds?.includes(target);
      const newBlocked = isBlocked 
          ? u1.blockedUserIds?.filter((i: string) => i !== target) 
          : [...(u1.blockedUserIds || []), target];
      
      console.log(`[STORAGE] toggleBlockUser: ${cur} -> ${target} (isBlocked currently: ${isBlocked})`);
      
      try {
          await updateDoc(doc(db, 'profiles', cur), { blockedUserIds: newBlocked });
      } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `profiles/${cur}`);
      }

      try {
          await updateDoc(doc(db, 'public_profiles', cur), { blockedUserIds: newBlocked });
      } catch (err) {
          console.warn("[STORAGE] Falha ao atualizar public_profiles no bloqueio:", err);
      }

      // Sincronização de Bloqueio Mútuo
      const blockId = `${cur}_${target}`;
      try {
        if (isBlocked) {
          await deleteDoc(doc(db, 'blocks', blockId));
        } else {
          await setDoc(doc(db, 'blocks', blockId), {
              blockerId: cur,
              blockedId: target,
              timestamp: Date.now()
          });
        }
      } catch (err) {
        console.warn("[STORAGE] Erro ao sincronizar coleção 'blocks':", err);
        handleFirestoreError(err, OperationType.WRITE, `blocks/${blockId}`);
      }
    }
  } catch (err) {
      console.error("[STORAGE] Erro crítico em toggleBlockUser:", safeJsonStringify(err));
      throw err;
  }
};

export const getMutualBlockedUserIds = async (userId: string): Promise<string[]> => {
    if (!db || !userId || userId === 'anonymous' || userId === 'guest') return [];
    
    // Verificamos se há um usuário autenticado no Firebase para evitar erros de permissão
    if (!auth?.currentUser) {
        console.warn("[STORAGE] getMutualBlockedUserIds: Usuário não autenticado no Firebase Auth.");
        return [];
    }

    try {
        // 1. Usuários que EU bloqueei (do perfil)
        const user = await findUserById(userId);
        const blockedByMe = user?.blockedUserIds || [];
        
        // 2. Usuários que ME bloquearam (da coleção 'blocks')
        // Adicionada verificação de segurança para garantir que apenas o usuário autenticado pode listar seus bloqueios
        // O Firestore validará isso via regras, mas evitamos a chamada se não houver UID válido
        const blocksSnap = await getDocs(query(collection(db, 'blocks'), where('blockedId', '==', userId)));
        const blockedByOthers = blocksSnap.docs.map(d => d.data().blockerId);
        
        return Array.from(new Set([...blockedByMe, ...blockedByOthers]));
    } catch (error) {
        // Usando o manipulador de erro padrão para melhor diagnóstico
        // Se o erro for de permissão insuficiente, logamos apenas um aviso se for esperado (ex: logout pendente)
        const errStr = String(error);
        if (errStr.includes('permission-denied') || errStr.includes('insufficient permissions')) {
            console.warn("[STORAGE] Permissão negada ao listar blocos para:", userId);
            return [];
        }
        
        handleFirestoreError(error, OperationType.LIST, 'blocks');
        return [];
    }
};

export const createNotification = async (recipientId: string, actorId: string, type: NotificationType, postId?: string, groupName?: string, callType?: CallType) => {
  if (!isFirebaseConfigured || !db || recipientId === actorId) return;
  try {
    // Check if actor is blocked by recipient
    const recipientProfile = await findUserById(recipientId);
    if (recipientProfile?.blockedUserIds?.includes(actorId)) {
        return;
    }

    await addDoc(collection(db, 'notifications'), {
      recipientId,
      actorId,
      type,
      postId: postId || null,
      groupName: groupName || null,
      callType: callType || null,
      timestamp: Date.now(),
      isRead: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notifications');
  }
};

export const toggleFollowUser = async (cur: string, target: string) => {
  if (!isFirebaseConfigured || !db) return;
  try {
    const u1 = await findUserById(cur);
    const u2 = await findUserById(target);
    if (!u1 || !u2) return;

    const isFollowing = u1.followedUsers.includes(target);
    const newFollowed = isFollowing ? u1.followedUsers.filter(i => i !== target) : [...u1.followedUsers, target];
    const newFollowers = isFollowing ? u2.followers.filter(i => i !== cur) : [...u2.followers, cur];
    
    const database = db;
    const batch = writeBatch(database);
    
    // Update both private and public profiles
    batch.update(doc(database, 'profiles', cur), { followedUsers: newFollowed });
    batch.update(doc(database, 'public_profiles', cur), { followedUsers: newFollowed });
    
    batch.update(doc(database, 'profiles', target), { followers: newFollowers });
    batch.update(doc(database, 'public_profiles', target), { followers: newFollowers });

    // Se estiver seguindo, enviar notificação
    if (!isFollowing) {
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      batch.set(doc(database, 'notifications', notifId), {
        id: notifId,
        type: NotificationType.NEW_FOLLOWER,
        actorId: cur,
        actorName: `${u1.firstName} ${u1.lastName}`,
        actorProfilePic: u1.profilePicture || DEFAULT_PROFILE_PIC,
        recipientId: target,
        timestamp: Date.now(),
        isRead: false
      });
    }

    // Verificar metas de monetização
    const goals = u2.monetizationGoals || { 
        followersGoal: 1000, 
        watchHoursGoal: 4000, 
        shortsViewsGoal: 10000000,
        currentFollowers: 0,
        currentWatchHours: 0,
        currentShortsViews: 0
    };
    
    const currentFollowers = newFollowers.length;
    const meetsFollowers = currentFollowers >= goals.followersGoal;
    const meetsViews = (goals.currentWatchHours || 0) >= goals.watchHoursGoal || (goals.currentShortsViews || 0) >= goals.shortsViewsGoal;
    const meetsIdentity = u2.idVerificationStatus === 'APPROVED';

    let newStatus = u2.monetizationStatus || 'INELIGIBLE';
    if (newStatus === 'INELIGIBLE' && meetsFollowers && meetsViews && meetsIdentity) {
        newStatus = 'ELIGIBLE';
        batch.update(doc(db, 'profiles', target), { monetizationStatus: newStatus });
        batch.update(doc(db, 'public_profiles', target), { monetizationStatus: newStatus });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'profiles/' + cur);
  }
};

export const updatePostLikes = async (pid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const postData = d.data();
        const likes = postData.likes || [];
        const isLiking = !likes.includes(uid);
        const newLikes = isLiking ? [...likes, uid] : likes.filter((i:any)=>i!==uid);
        await updateDoc(ref, { likes: newLikes });

        if (isLiking && postData.userId !== uid) {
          await createNotification(postData.userId, uid, NotificationType.LIKE, pid);
        }
    }
};

export const incrementPostViews = async (pid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if (d.exists()) {
        const postData = d.data();
        const currentViews = postData.views || 0;
        await updateDoc(ref, { views: currentViews + 1 });
        
        // Atualizar metas de monetização do autor
        const authorId = postData.userId;
        const authorRef = doc(db, 'profiles', authorId);
        const authorDoc = await getDoc(authorRef);
        if (authorDoc.exists()) {
            const authorData = authorDoc.data();
            const goals = authorData.monetizationGoals || { 
                followersGoal: 1000, 
                watchHoursGoal: 4000, 
                shortsViewsGoal: 10000000,
                currentFollowers: authorData.followers?.length || 0,
                currentWatchHours: 0,
                currentShortsViews: 0
            };
            
            let newWatchHours = goals.currentWatchHours || 0;
            let newShortsViews = goals.currentShortsViews || 0;

            if (postData.type === PostType.REEL) {
                newShortsViews += 1;
            } else if (postData.type === PostType.VIDEO) {
                newWatchHours += 0.05; // Simula 3 minutos de retenção média
            }

            const currentFollowers = authorData.followers?.length || 0;
            const meetsFollowers = currentFollowers >= goals.followersGoal;
            const meetsViews = newWatchHours >= goals.watchHoursGoal || newShortsViews >= goals.shortsViewsGoal;
            const meetsIdentity = authorData.idVerificationStatus === 'APPROVED';

            let newStatus = authorData.monetizationStatus || 'INELIGIBLE';
            if (newStatus === 'INELIGIBLE' && meetsFollowers && meetsViews && meetsIdentity) {
                newStatus = 'ELIGIBLE';
            }
            
            const updateData: any = {
                monetizationStatus: newStatus
            };

            if (!authorData.monetizationGoals) {
                updateData.monetizationGoals = {
                    ...goals,
                    currentWatchHours: newWatchHours,
                    currentShortsViews: newShortsViews,
                    currentFollowers: currentFollowers
                };
            } else {
                updateData['monetizationGoals.currentWatchHours'] = newWatchHours;
                updateData['monetizationGoals.currentShortsViews'] = newShortsViews;
                updateData['monetizationGoals.currentFollowers'] = currentFollowers;
            }
            
            await updateDoc(authorRef, updateData);
            await updateDoc(doc(db, 'public_profiles', authorId), { monetizationStatus: newStatus });
        }
    }
};

export const toggleReaction = async (targetId: string, targetType: 'COMMENT' | 'MESSAGE', emoji: string, userId: string, parentId?: string) => {
    if (!db) return;
    
    if (targetType === 'COMMENT') {
        const postRef = doc(db, 'posts', parentId!);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const postData = postDoc.data();
            const comments = [...(postData.comments || [])];
            
            // Função recursiva para encontrar o comentário em qualquer nível de nesting
            const findAndToggleInComments = (commentList: any[]): boolean => {
                for (let i = 0; i < commentList.length; i++) {
                    if (commentList[i].id === targetId) {
                        const reactions = { ...(commentList[i].reactions || {}) };
                        const alreadyHasThisEmoji = (reactions[emoji] || []).includes(userId);
                        
                        // Um usuário só pode ter uma reação ativa. Removemos de todas primeiro.
                        Object.keys(reactions).forEach(e => {
                            if (Array.isArray(reactions[e])) {
                                reactions[e] = reactions[e].filter((id: string) => id !== userId);
                            }
                        });
                        
                        // Se ele ainda não tinha este emoji específico, adicionamos agora (substituindo o anterior)
                        if (!alreadyHasThisEmoji) {
                            reactions[emoji] = [...(reactions[emoji] || []), userId];
                        }
                        
                        commentList[i] = { ...commentList[i], reactions };
                        return true;
                    }
                    if (commentList[i].replies && findAndToggleInComments(commentList[i].replies)) {
                        return true;
                    }
                }
                return false;
            };

            if (findAndToggleInComments(comments)) {
                await updateDoc(postRef, { comments });
            }
        }
    } else if (targetType === 'MESSAGE') {
        const chatRef = doc(db, 'chats', parentId!);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            const messages = [...(chatData.messages || [])];
            const messageIndex = messages.findIndex(m => m.id === targetId);
            
            if (messageIndex !== -1) {
                const message = messages[messageIndex];
                
                // Restrição: Dono da mensagem não pode reagir à própria mensagem
                if (message.senderId === userId) {
                    throw new Error('OWNER_REACTION_NOT_ALLOWED');
                }

                const reactions = { ...(message.reactions || {}) };
                const alreadyHasThisEmoji = (reactions[emoji] || []).includes(userId);
                
                // Um usuário só pode ter uma reação ativa por mensagem.
                Object.keys(reactions).forEach(e => {
                    if (Array.isArray(reactions[e])) {
                        reactions[e] = reactions[e].filter((id: string) => id !== userId);
                    }
                });
                
                if (!alreadyHasThisEmoji) {
                    reactions[emoji] = [...(reactions[emoji] || []), userId];
                }
                
                messages[messageIndex] = { ...message, reactions };
                await updateDoc(chatRef, { messages });
            }
        }
    }
};

export const addCommentReply = async (postId: string, commentId: string, reply: any) => {
    if (!db) return;

    // Sentinela AI Check
    const security = await checkContentSecurity(reply.text || '', 'comment');
    if (!security.allowed) {
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (postDoc.exists()) {
        const postData = postDoc.data();
        const comments = [...(postData.comments || [])];
        
        const findAndAddReply = (commentList: any[]): boolean => {
            for (let i = 0; i < commentList.length; i++) {
                if (commentList[i].id === commentId) {
                    commentList[i].replies = [...(commentList[i].replies || []), reply];
                    return true;
                }
                if (commentList[i].replies && findAndAddReply(commentList[i].replies)) {
                    return true;
                }
            }
            return false;
        };

        if (findAndAddReply(comments)) {
            await updateDoc(postRef, { comments });
        }
    }
};

export const addPostComment = async (pid: string, c: any) => {
    if (!db) return;

    // Sentinela AI Check
    const security = await checkContentSecurity(c.content || '', 'comment');
    if (!security.allowed) {
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const postData = d.data();
        await updateDoc(ref, { comments: [...(postData.comments || []), c] });

        if (postData.userId !== c.userId) {
          await createNotification(postData.userId, c.userId, NotificationType.COMMENT, pid);
        }
    }
};

// --- EXPORTS DE COMPATIBILIDADE ---
export const generateUUID = () => crypto.randomUUID();
export const saveUserAddress = async (uid: string, address: ShippingAddress) => {
    if (!db) return;
    await updateDoc(doc(db, 'profiles', uid), { address });
    await updateDoc(doc(db, 'public_profiles', uid), { address });
};

export const getCurrentUserId = (): string | null => localStorage.getItem(CURRENT_USER_KEY);
export const saveCurrentUser = (id: string | null) => id ? localStorage.setItem(CURRENT_USER_KEY, id) : localStorage.removeItem(CURRENT_USER_KEY);
export const getAppTheme = (): GroupTheme => (localStorage.getItem('cyber_app_theme') as GroupTheme) || 'blue';
export const saveAppTheme = (t: GroupTheme) => localStorage.setItem('cyber_app_theme', t);
export const updateUserStatus = async (id: string, online: boolean) => {
  if (isFirebaseConfigured && auth?.currentUser && db) {
    const data = { isOnline: online, lastSeen: Date.now() };
    await updateDoc(doc(db, 'profiles', id), data).catch(() => {});
    await updateDoc(doc(db, 'public_profiles', id), data).catch(() => {});
  }
};

export const isUserOnline = (lastSeen: number | undefined, isOnline: boolean | undefined): boolean => {
    if (!lastSeen) return false;
    // Consideramos online apenas se foi visto nos últimos 5 minutos
    return !!isOnline && (Date.now() - lastSeen < 1000 * 60 * 5);
};

export const formatLastSeen = (lastSeen: number | undefined, isOnline: boolean | undefined, t?: (key: string, options?: any) => string): string => {
    const reallyOnline = isUserOnline(lastSeen, isOnline);
    if (reallyOnline) return t ? t('online_now') : "Online agora";
    if (!lastSeen) return t ? t('seen_long_ago') : "Visto há muito tempo";

    const diff = Date.now() - lastSeen;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (t) {
        if (minutes < 1) return t('seen_just_now');
        if (minutes < 60) return t('seen_minutes_ago', { count: minutes });
        if (hours < 24) return t('seen_hours_ago', { count: hours });
        if (days < 7) return t('seen_days_ago', { count: days });
        return t('seen_on', { date: new Date(lastSeen).toLocaleDateString() });
    }

    if (minutes < 1) return "Visto agora mesmo";
    if (minutes < 60) return `Visto há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    if (hours < 24) return `Visto há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days < 7) return `Visto há ${days} ${days === 1 ? 'dia' : 'dias'}`;
    
    return `Visto em ${new Date(lastSeen).toLocaleDateString()}`;
};
export const getGlobalSettings = async (): Promise<GlobalSettings> => {
    if (!isFirebaseConfigured || !db) return { platformTax: 0.1, minWithdrawal: 50, maintenanceMode: false, boostFee: 5 };
    const docSnap = await getDoc(doc(db, 'settings', 'global'));
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            platformTax: data.platformTax ?? 0.1,
            minWithdrawal: data.minWithdrawal ?? 50,
            maintenanceMode: !!data.maintenanceMode,
            boostFee: data.boostFee ?? 5,
            boostMinBid: data.boostMinBid ?? 5,
            adMinBudget: data.adMinBudget ?? 5,
            adReachCost: data.adReachCost ?? 2,
            verificationFee: data.verificationFee ?? 10,
            groupCreationFee: data.groupCreationFee ?? 5,
            storeCreationFee: data.storeCreationFee ?? 50,
            positioningMinBid: data.positioningMinBid ?? 1,
            boostDailyMin: data.boostDailyMin ?? 0.5,
            orderCancellationFeePercentage: data.orderCancellationFeePercentage ?? 5
        } as GlobalSettings;
    }
    return { 
        platformTax: 0.1, 
        minWithdrawal: 50, 
        maintenanceMode: false, 
        boostFee: 5,
        boostMinBid: 5,
        boostDailyMin: 0.5,
        adMinBudget: 5,
        adReachCost: 2,
        verificationFee: 10,
        groupCreationFee: 5,
        storeCreationFee: 50,
        positioningMinBid: 1,
        orderCancellationFeePercentage: 5
    };
};
export const saveCart = (items: CartItem[]) => {
    if (!items) {
        localStorage.removeItem('cyberphone_cart');
    } else {
        localStorage.setItem('cyberphone_cart', safeJsonStringify(items));
    }
};
export const getCart = () => {
    try {
        const stored = localStorage.getItem('cyberphone_cart');
        if (!stored || stored === 'undefined') return [];
        return JSON.parse(stored);
    } catch (e) {
        console.error("Erro ao ler carrinho do localStorage:", safeJsonStringify(e));
        return [];
    }
};
export const getProducts = async () => {
    if (!db) return [];
    try {
        return (await getDocs(collection(db, 'products'))).docs.map(d => ({...d.data(), id: d.id} as Product));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'products');
        return [];
    }
};

export const getProduct = async (id: string) => {
    if (!db || !id) return null;
    try {
        const snap = await getDoc(doc(db, 'products', id));
        if (snap.exists()) return { ...(snap.data() as any), id: snap.id } as Product;
        return null;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'products/' + id);
        return null;
    }
};
export const getAds = async () => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        return (await getDocs(collection(db, 'ads'))).docs.map(d => ({...d.data(), id: d.id} as AdCampaign));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'ads');
        return [];
    }
};
export const getStories = async (currentUserId?: string): Promise<Story[]> => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const q = query(
            collection(db, 'stories'), 
            where('timestamp', '>=', twentyFourHoursAgo),
            orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        let stories = snap.docs.map(d => sanitizeStaleUrls({ ...d.data(), id: d.id } as Story));

        // Mutual Blocking Filter
        if (currentUserId) {
            const hiddenIds = await getMutualBlockedUserIds(currentUserId);
            if (hiddenIds.length) {
                stories = stories.filter(s => !hiddenIds.includes(s.userId));
            }
        }

        return stories;
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stories');
        return [];
    }
};

// FIX: Make uid optional to allow discovery of all chats in FeedPage
export const getChats = async (uid?: string) => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        let q;
        if (uid) {
            // Se uid for fornecido, buscamos chats onde o usuário é participante
            q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
        } else {
            // Se não, buscamos apenas grupos públicos para descoberta
            q = query(collection(db, 'chats'), where('isPublic', '==', true));
        }
        const snap = await getDocs(q);
        let chats = snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatConversation));

        if (uid) {
            const hiddenIds = await getMutualBlockedUserIds(uid);
            if (hiddenIds.length) {
                chats = chats.filter(c => {
                    if (c.type === ChatType.PRIVATE) {
                        const partnerId = c.participants.find(p => p !== uid);
                        return !hiddenIds.includes(partnerId || '');
                    }
                    return true;
                });
            }
        }

        return chats;
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'chats');
        return [];
    }
};

export const seedDatabase = async () => {
    if (!isFirebaseConfigured || !db) return;
    
    // Check if we already have posts
    const posts = await getPosts();
    if (posts.length > 0) return;

    console.log("[SEED] Populando banco de dados inicial...");

    const samplePosts: Post[] = [
        {
            id: generateUUID(),
            userId: 'system',
            authorName: 'CyberPhone Team',
            authorProfilePic: DEFAULT_PROFILE_PIC,
            type: PostType.TEXT,
            timestamp: Date.now() - 10000,
            content: 'Bem-vindo ao CyberPhone! A rede social do futuro.',
            likes: [],
            comments: [],
            shares: [],
            saves: [],
            tags: ['SOCIAL']
        },
        {
            id: generateUUID(),
            userId: 'system',
            authorName: 'CyberPhone News',
            authorProfilePic: DEFAULT_PROFILE_PIC,
            type: PostType.IMAGE,
            timestamp: Date.now() - 5000,
            content: 'Confira as novas funcionalidades da nossa plataforma!',
            imageUrl: 'https://picsum.photos/seed/tech/800/600',
            likes: [],
            comments: [],
            shares: [],
            saves: [],
            tags: ['NEWS']
        }
    ];

    for (const post of samplePosts) {
        await addPost(post);
    }

    // Add a public group
    const sampleGroup: ChatConversation = {
        id: 'global-chat',
        type: ChatType.GROUP,
        participants: ['system'],
        messages: [],
        groupName: 'Comunidade Global',
        isPublic: true,
        description: 'O lugar para todos os usuários conversarem.'
    };
    try {
        await setDoc(doc(db, 'chats', sampleGroup.id), sampleGroup);
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'chats/' + sampleGroup.id);
    }

    // Sample Reels
    const sampleReels: Post[] = [
        {
            id: generateUUID(),
            userId: 'system',
            authorName: 'Cyber Digital',
            authorProfilePic: 'https://i.pravatar.cc/150?u=cyber',
            type: PostType.REEL,
            timestamp: Date.now() - 20000,
            content: 'Beleza natural do nosso mundo! 🌎 #Global #Turismo',
            likes: [],
            comments: [],
            shares: [],
            saves: [],
            tags: ['WORLD', 'TRAVEL'],
            reel: {
                videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                description: 'Dançando na noite cosmopolita'
            }
        },
        {
            id: generateUUID(),
            userId: 'system',
            authorName: 'Tech Central',
            authorProfilePic: 'https://i.pravatar.cc/150?u=tech',
            type: PostType.REEL,
            timestamp: Date.now() - 15000,
            content: 'Review rápido: O novo smartphone que chegou ao mercado! 📱',
            likes: [],
            comments: [],
            shares: [],
            saves: [],
            tags: ['TECH', 'REVIEW'],
            reel: {
                videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-beautiful-abstract-glass-with-glowing-light-41846-large.mp4',
                description: 'Gadget do dia'
            }
        }
    ];

    for (const reel of sampleReels) {
        await addPost(reel);
    }

    // Sample Videos
    const sampleVideos: Post[] = [
        {
            id: generateUUID(),
            userId: 'system',
            authorName: 'CyBer TV',
            authorProfilePic: 'https://i.pravatar.cc/150?u=tv',
            type: PostType.VIDEO,
            timestamp: Date.now() - 30000,
            content: 'Documentário: A Revolução Digital Global. 📺 #Tech #Global',
            imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
            likes: [],
            comments: [],
            shares: [],
            saves: [],
            tags: ['DOCUMENTARY', 'TECH']
        }
    ];

    for (const video of sampleVideos) {
        await addPost(video);
    }

    // Sample Products
    const sampleProducts: Product[] = [
        {
            id: generateUUID(),
            storeId: 'global-store',
            name: 'CyberPhone Pro Max',
            description: 'O smartphone mais potente do mercado, com IA integrada.',
            price: 450000,
            imageUrls: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=800'],
            category: 'ELECTRONICS',
            status: 'active',
            userId: 'system',
            type: ProductType.PHYSICAL,
            ratings: [],
            averageRating: 5,
            ratingCount: 10,
            affiliateCommissionRate: 0.05
        },
        {
            id: generateUUID(),
            storeId: 'global-store',
            name: 'Cyber T-Shirt Classic',
            description: 'Vista a marca do futuro digital.',
            price: 15000,
            imageUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800'],
            category: 'FASHION',
            status: 'active',
            userId: 'system',
            type: ProductType.PHYSICAL,
            ratings: [],
            averageRating: 4.8,
            ratingCount: 25,
            affiliateCommissionRate: 0.1
        }
    ];

    // Create a global store first
    const globalStore: Store = {
        id: 'global-store',
        userId: 'system',
        name: 'CyberPhone Official Store',
        description: 'Loja oficial da rede CyberPhone.',
        productIds: sampleProducts.map(p => p.id)
    };
    
    try {
        await setDoc(doc(db, 'stores', globalStore.id), globalStore);
        for (const prod of sampleProducts) {
            await setDoc(doc(db, 'products', prod.id), prod);
        }
    } catch (err) {}

    console.log("[SEED] Banco de dados populado com sucesso.");
};

export const getUsers = async (currentUser?: User) => {
    if (!isFirebaseConfigured || !db) return [];
    
    // Admins have permission to read full profiles, which contain more data like documentId
    // We try to read profiles first if the user is an admin
    const isAdmin = currentUser?.isAdmin || auth?.currentUser?.email === 'ac926815124@gmail.com' || auth?.currentUser?.email === 'alfaajmc@gmail.com';
    const path = isAdmin ? 'profiles' : 'public_profiles';
    
    try {
        let snap: QuerySnapshot<DocumentData>;
        try {
            snap = await getDocs(collection(db, path));
        } catch (initialError: any) {
            if (isAdmin && path === 'profiles') {
                console.warn("⚠️ Permissão insuficiente para 'profiles'. Tentando 'public_profiles'...");
                snap = await getDocs(collection(db, 'public_profiles'));
            } else {
                throw initialError;
            }
        }
        
        let users = snap.docs.map(d => mapUserData(d.id, d.data()));

        // Mutual Blocking Filter
        if (currentUser && !isAdmin) {
            const hiddenIds = await getMutualBlockedUserIds(currentUser.id);
            if (hiddenIds.length) {
                users = users.filter(u => !hiddenIds.includes(u.id));
            }
        }

        return users;
    } catch (error) {
        // Fallback to public_profiles if profiles read fails
        if (isAdmin && path === 'profiles') {
            try {
                const publicSnap = await getDocs(collection(db, 'public_profiles'));
                return publicSnap.docs.map(d => mapUserData(d.id, d.data()));
            } catch (innerError) {
                handleFirestoreError(innerError, OperationType.LIST, 'public_profiles');
            }
        } else {
            handleFirestoreError(error, OperationType.LIST, path);
        }
        return [];
    }
};
export const joinGroup = async (gid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', gid);
    const d = await getDoc(ref);
    if(d.exists()) await updateDoc(ref, { participants: [...d.data().participants, uid] });
};
export const findStoreById = async (id: string) => {
    if (!db) return undefined;
    const d = await getDoc(doc(db, 'stores', id));
    return d.exists() ? d.data() as Store : undefined;
};

// Lista de campos permitidos para atualização de perfil (Sincronizada com firestore.rules)
export const PROFILE_WHITELIST = [
    'firstName', 'lastName', 'phone', 'bio', 'profilePicture', 'coverPhoto', 
    'gender', 'birthDate', 'country', 'address', 'lastSeen', 'isOnline', 
    'followedUsers', 'followers', 'blockedUserIds', 'idVerificationStatus', 
    'idVerificationDocs', 'academicRole', 'updatedAt', 'documentId', 'email',
    'userType', 'monetizationGoals', 'monetizationStatus', 'isVerified', 'monetizationTier',
    'balance', 'pendingBalance', 'totalEarnings', 'isMonetized', 'isFrozen',
    'creatorStats', 'isPremium', 'premiumExpiry', 'resellerName', 'resellerBio', 'resellerBanner',
    'storeId', 'isSuspended', 'verificationFileUrl', 'totalWithdrawn', 'id', 'createdAt', 'isAdmin'
];

/**
 * Filtra um objeto mantendo apenas as chaves permitidas no perfil
 */
export const filterProfileData = (data: any) => {
    const filtered: any = {};
    PROFILE_WHITELIST.forEach(field => {
        if (data[field] !== undefined) {
            filtered[field] = data[field];
        }
    });
    return filtered;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    if (!db) return;
    try {
        // Sentinela AI Check for Bio and Names
        const textToCheck = [data.firstName, data.lastName, data.bio].filter(Boolean).join(' ');
        if (textToCheck.trim()) {
            const security = await checkContentSecurity(textToCheck, 'profile info');
            if (!security.allowed) {
                throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
            }
        }

        const filteredData = filterProfileData(data);
        await updateDoc(doc(db, 'profiles', uid), filteredData);
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('SENTINEL_BLOCK')) throw error;
        handleFirestoreError(error, OperationType.UPDATE, `profiles/${uid}`);
    }
};

export const updatePostSaves = async (pid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const saves = d.data().saves || [];
        const newSaves = saves.includes(uid) ? saves.filter((i:any)=>i!==uid) : [...saves, uid];
        await updateDoc(ref, { saves: newSaves });
    }
};
export const getNotificationsForUser = async (uid: string) => {
    if (!isFirebaseConfigured || !db) return [];
    const snap = await getDocs(query(collection(db, 'notifications'), where('recipientId', '==', uid)));
    let notifications = snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
    
    // Sort in memory to avoid requiring a composite index
    notifications.sort((a, b) => {
        const tA = a.timestamp || 0;
        const tB = b.timestamp || 0;
        return tB - tA;
    });
    
    // Mutual Blocking Filter
    const hiddenIds = await getMutualBlockedUserIds(uid);
    if (hiddenIds.length) {
        notifications = notifications.filter(n => !hiddenIds.includes(n.actorId));
    }
    
    return notifications;
};
export const deleteNotification = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    try {
        await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'notifications/' + id);
    }
};

export const clearAllNotifications = async (uid: string) => {
    if (!isFirebaseConfigured || !db) return;
    const database = db;
    try {
        const snap = await getDocs(query(collection(database, 'notifications'), where('recipientId', '==', uid)));
        if (snap.empty) return;

        const batch = writeBatch(database);
        snap.docs.forEach(d => {
            batch.delete(doc(database, 'notifications', d.id));
        });
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
};

export const markNotificationsAsRead = async (uid: string) => {
    if (!isFirebaseConfigured || !db) return;
    const database = db;
    try {
        const snap = await getDocs(query(collection(database, 'notifications'), where('recipientId', '==', uid), where('isRead', '==', false)));
        if (snap.empty) return;

        const batch = writeBatch(database);
        snap.docs.forEach(d => {
            batch.update(doc(database, 'notifications', d.id), { isRead: true });
        });
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
};

export const updateNotificationReadState = async (id: string, isRead: boolean) => {
    if (!isFirebaseConfigured || !db) return;
    try {
        await updateDoc(doc(db, 'notifications', id), { isRead });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
};
export const getSavedPosts = async (uid: string) => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const q = query(
            collection(db, 'posts'), 
            where('saves', 'array-contains', uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => sanitizeStaleUrls({ ...d.data(), id: d.id } as Post)).sort((a,b) => b.timestamp - a.timestamp);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'posts');
        return [];
    }
};

export const shareToGroup = async (groupId: string, senderId: string, content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text', mediaUrl?: string) => {
    if (!db) return;
    const message: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        senderId,
        text: content,
        timestamp: Date.now(),
        fileType: type,
        fileUrl: mediaUrl
    };
    try {
        const chatRef = doc(db, 'chats', groupId);
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
            await updateDoc(chatRef, {
                messages: arrayUnion(message)
            });
        } else if (groupId.startsWith('dm-')) {
            // Cria chat automático para DM se não existir
            const participants = groupId.replace('dm-', '').split('-');
            const newChat: ChatConversation = {
                id: groupId,
                type: ChatType.PRIVATE,
                participants,
                messages: [message],
            };
            await setDoc(chatRef, newChat);
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'chats/' + groupId);
    }
};

export const subscribeToLivePost = (id: string, cb: any) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, 'posts', id), (d) => cb(d.data()), (err) => {
        handleFirestoreError(err, OperationType.GET, 'posts/' + id);
    });
};
export const sendLiveMessage = async (id: string, msg: any) => {
    if (!db) return;
    const d = await getDoc(doc(db, 'posts', id));
    if (d.exists()) {
        await updateDoc(doc(db, 'posts', id), { liveChat: [...(d.data().liveChat || []), msg] });
    }
};
export const manageLiveViewers = (id: string, userIdOrAction: string, actionOptional?: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', id);
    let userId = userIdOrAction;
    let action = actionOptional || 'join';
    
    // Backward compatibility for legacy (id, action) calls
    if (!actionOptional) {
        userId = 'legacy-user-' + Math.floor(Math.random() * 100);
        action = userIdOrAction;
    }

    getDoc(ref).then(d => {
        if(d.exists()) {
            const data = d.data();
            const viewers = { ...(data.liveViewersMap || {}) };
            
            if (action === 'leave' || userId.startsWith('legacy-user')) {
                delete viewers[userId];
            } else {
                viewers[userId] = Date.now();
            }
            
            // Filter out stale viewers whose heartbeats are older than 25 seconds
            // and completely exclude any legacy simulated users to ensure 100% real-time accuracy
            const now = Date.now();
            const activeViewers: any = {};
            let activeCount = 0;
            
            Object.keys(viewers).forEach(uid => {
                if (uid.startsWith('legacy-user') || uid.includes('simulated')) {
                    return; // Ignore any mock/legacy entries entirely
                }
                const duration = now - viewers[uid];
                if (duration >= 0 && duration < 25000) {
                    activeViewers[uid] = viewers[uid];
                    activeCount++;
                }
            });
            
            // Real-time precise count based only on real live sessions
            updateDoc(ref, { 
                liveViewersMap: activeViewers,
                liveViewerCount: Math.max(1, activeCount)
            });
        }
    }).catch(err => {
        console.warn("Error updating dynamic live presence count:", err);
    });
};
export const pulseLiveHeart = (id: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', id);
    getDoc(ref).then(d => {
        if(d.exists()) {
            updateDoc(ref, { liveHeartCount: (d.data().liveHeartCount || 0) + 1 });
        }
    });
};

// FIX: Added optional description to match call in LiveStreamViewer
export const processDonation = async (from: string, to: string, amt: number, description?: string) => {
    if (!db) return false;
    await checkUserFrozen(from);
    const u1 = await findUserById(from);
    const u2 = await findUserById(to);
    if(u1 && u2 && u1.balance! >= amt){
        await updateDoc(doc(db, 'profiles', from), { balance: u1.balance! - amt });
        await updateDoc(doc(db, 'profiles', to), { balance: u2.balance! + amt });
        await addDoc(collection(db, 'transactions'), {
            id: generateUUID(),
            userId: from,
            amount: -amt,
            type: TransactionType.DONATION,
            description: description || `Donation to user ${to}`,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });
        return true;
    }
    return false;
};

export const findAudioTrackById = async (id: string) => undefined;
export const unpinPost = async (id: string) => {
    if (!db) return;
    return updateDoc(doc(db, 'posts', id), { isPinned: false });
};
export const pinPost = async (id: string) => {
    if (!db) return;
    return updateDoc(doc(db, 'posts', id), { isPinned: true });
};
export const createReport = async (r: any) => {
    if (!db) return;
    return addDoc(collection(db, 'reports'), r);
};
export const updatePostShares = async (pid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const shares = d.data().shares || [];
        if (!shares.includes(uid)) {
            await updateDoc(ref, { shares: [...shares, uid] });
        }
    }
};
export const adminDeleteProduct = async (id: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'products', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'products/' + id);
    }
};
export const updateSaleStatus = async (id: string, s: any) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'sales', id), { status: s });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'sales/' + id);
    }
};
export const updateSaleTracking = async (id: string, c: string, sid?: string) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'sales', id), { trackingCode: c, supplierOrderId: sid || '' });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'sales/' + id);
    }
};

export const processUserUpgrade = async (uid: string, u: User, f: File, c: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'profiles', uid), { isVerified: true });
};
export const updateUserData = async (userId: string, data: Partial<User>) => {
    if (!db) return;
    try {
        const filteredData = filterProfileData(data);
        await updateDoc(doc(db, 'profiles', userId), {
            ...filteredData,
            updatedAt: Date.now()
        });
        
        // Se documentId foi atualizado (e aprovado/verificado), registra no registry
        if (data.documentId) {
            await registerUniqueness('documentId', data.documentId, userId);
        }
        if (data.email) {
            await registerUniqueness('email', data.email, userId);
        }
        if (data.phone) {
            await registerUniqueness('phone', data.phone, userId);
        }
        
        // Se houver mudanças públicas, atualiza public_profiles tbm
        const publicKeys: (keyof User)[] = [
            'firstName', 'lastName', 'profilePicture', 'coverPhoto', 'bio', 'isVerified', 
            'isOnline', 'userType', 'idVerificationStatus', 'balance', 'monetizationStatus',
            'blockedUserIds', 'lastSeen', 'followedUsers', 'followers', 'isPremium'
        ];
        const publicUpdate: any = {};
        let hasPublicChange = false;
        
        publicKeys.forEach(key => {
            if (data[key] !== undefined) {
                publicUpdate[key] = data[key];
                hasPublicChange = true;
            }
        });
        
        if (hasPublicChange) {
            await updateDoc(doc(db, 'public_profiles', userId), publicUpdate);
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'profiles/' + userId);
    }
};

export const updateUser = async (u: User) => {
    const path = 'profiles';
    const publicPath = 'public_profiles';
    if (!db) return;
    try {
        // Filter data using the whitelist
        const updateData = filterProfileData(u);

        // Update private profile
        await updateDoc(doc(db, 'profiles', u.id), updateData);

        // Update public profile (only public fields)
        const publicFields = [
            'firstName', 'lastName', 'profilePicture', 'coverPhoto', 'bio', 'isVerified', 
            'isOnline', 'followedUsers', 'followers', 'idVerificationStatus', 'balance', 
            'monetizationStatus', 'lastSeen', 'userType', 'address', 'monetizationGoals', 
            'academicRole', 'id', 'createdAt', 'isSuspended', 'isFrozen', 'isPremium',
            'birthDate', 'country', 'isAdmin'
        ];
        
        const publicData: any = {};
        publicFields.forEach(field => {
            if (u[field as keyof User] !== undefined) {
                publicData[field] = u[field as keyof User];
            }
        });

        await updateDoc(doc(db, 'public_profiles', u.id), publicData);

        // Update Firebase Auth profile if it's the current user
        if (auth?.currentUser && auth.currentUser.uid === u.id) {
            await updateProfile(auth.currentUser, {
                displayName: `${u.firstName} ${u.lastName}`,
                photoURL: u.profilePicture
            });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};
export const deleteUser = async (id: string) => {
    if (!db) return;
    
    try {
        // Fetch user data first to get fields for uniqueness registry cleanup
        const userDoc = await getDoc(doc(db, 'profiles', id));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        const batch = writeBatch(db);
        
        batch.delete(doc(db, 'profiles', id));
        batch.delete(doc(db, 'public_profiles', id));
        batch.delete(doc(db, 'admins', id));
        
        // Cleanup uniqueness registry
        if (userData) {
            if (userData.email) {
                batch.delete(doc(db, 'uniqueness_registry', `email_${userData.email.toLowerCase().trim()}`));
            }
            if (userData.phone) {
                batch.delete(doc(db, 'uniqueness_registry', `phone_${userData.phone.toLowerCase().trim()}`));
            }
            if (userData.documentId) {
                batch.delete(doc(db, 'uniqueness_registry', `documentId_${userData.documentId.toLowerCase().trim()}`));
            }
        }
        
        await batch.commit();
        await addSystemLog({
            action: 'DELETE_USER',
            details: `Admin deletou usuário ID: ${id}${userData?.email ? ` (${userData.email})` : ''}`,
            adminId: auth?.currentUser?.uid || 'system'
        });
        return true;
    } catch (error) {
        console.error("[STORAGE] Erro ao deletar usuário:", safeJsonStringify(error));
        handleFirestoreError(error, OperationType.DELETE, 'profiles/' + id);
        return false;
    }
};
export const updateUserPassword = async (p: string) => {
    if (!isFirebaseConfigured || !auth) {
        throw new Error("Firebase Auth não está inicializado.");
    }
    if (!auth.currentUser) {
        throw new Error("Usuário não está autenticado.");
    }
    try {
        await updatePassword(auth.currentUser, p);
    } catch (error: any) {
        console.error("[STORAGE] Erro ao alterar senha no Firebase Auth:", safeJsonStringify(error));
        if (error.code === 'auth/requires-recent-login' || error.message?.includes('requires-recent-login')) {
            throw new Error("Segurança: Para alterar ou definir uma senha, você precisa ter feito login de forma muito recente. Por favor, saia (Logout) e entre novamente antes de tentar definir sua senha.");
        }
        throw error;
    }
};

// FIX: Added missing exported members
export const getEvents = async () => {
    if (!db) return [];
    try {
        return (await getDocs(collection(db, 'events'))).docs.map(d => ({ ...d.data(), id: d.id } as CyberEvent));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'events');
        return [];
    }
};
export const createEvent = async (evt: CyberEvent) => {
    if (!db) return;
    await setDoc(doc(db, 'events', evt.id), evt);
};
export const toggleJoinEvent = async (eId: string, uId: string) => {
    if (!db) return;
    const ref = doc(db, 'events', eId);
    const d = await getDoc(ref);
    if(d.exists()){
        const attendees = d.data().attendees || [];
        const newAttendees = attendees.includes(uId) ? attendees.filter((id:any)=>id!==uId) : [...attendees, uId];
        await updateDoc(ref, { attendees: newAttendees });
    }
};

export const sendMessage = async (chatId: string, msg: Message) => {
    if (!db) return;

    // Sentinela AI Check (apenas texto)
    if (msg.text) {
        const security = await checkContentSecurity(msg.text, 'message');
        if (!security.allowed) {
            // Se for fraude detectada pelo Sentinela, bloqueamos as contas
            if (security.isFraud) {
                const refChat = doc(db, 'chats', chatId);
                const dChat = await getDoc(refChat);
                if (dChat.exists()) {
                    const chatData = dChat.data();
                    const participants = chatData.participants || [];
                    // Bloqueia todos os participantes da conversa suspeita
                    for (const pId of participants) {
                        await updateDoc(doc(db, 'profiles', pId), { isFrozen: true });
                    }
                }
            }
            throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
        }
    }

    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const chatData = d.data();
        
        // Block Check for Private Chats
        if (chatData.type === ChatType.PRIVATE) {
            const senderId = msg.senderId;
            const receiverId = (chatData.participants || []).find((p: string) => p !== senderId);
            
            if (receiverId) {
                const [senderProfile, receiverProfile] = await Promise.all([
                    findUserById(senderId),
                    findUserById(receiverId)
                ]);
                
                if (senderProfile?.blockedUserIds?.includes(receiverId)) {
                    throw new Error("BLOCK: Você bloqueou este usuário.");
                }
                if (receiverProfile?.blockedUserIds?.includes(senderId)) {
                    throw new Error("BLOCK: Este usuário bloqueou você.");
                }
            }
        }

        await updateDoc(ref, { messages: [...(chatData.messages || []), msg] });
    }
};

export const deleteMessage = async (chatId: string, messageId: string, hardDelete?: boolean) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        let messages = d.data().messages || [];
        if (hardDelete) {
            messages = messages.filter((m: any) => m.id !== messageId);
        } else {
            messages = messages.map((m: any) => m.id === messageId ? { ...m, isDeleted: true, text: undefined, imageUrl: undefined, fileUrl: undefined } : m);
        }
        await updateDoc(ref, { messages });
    }
};

export const editMessage = async (chatId: string, messageId: string, text: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const messages = (d.data().messages || []).map((m: any) => m.id === messageId ? { ...m, text, isEdited: true } : m);
        await updateDoc(ref, { messages });
    }
};

export const updateGroupTheme = async (chatId: string, theme: GroupTheme) => {
    if (!db) return;
    await updateDoc(doc(db, 'chats', chatId), { theme });
};

export const leaveGroup = async (chatId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const participants = (d.data().participants || []).filter((id:any) => id !== userId);
        await updateDoc(ref, { participants });
    }
};

export const getChat = async (chatId: string) => {
    if (!isFirebaseConfigured || !db) return null;
    try {
        const snap = await getDoc(doc(db, 'chats', chatId));
        if (snap.exists()) {
            return { ...snap.data(), id: snap.id } as ChatConversation;
        }
        return null;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'chats/' + chatId);
        return null;
    }
};

export const deleteChat = async (chatId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'chats', chatId));
};

export const startPrivateChat = async (uid1: string, uid2: string) => {
    if (!db) return;
    
    // Busca chats onde uid1 participa (não requer índice composto se for único filtro)
    const q = query(
        collection(db, 'chats'), 
        where('participants', 'array-contains', uid1)
    );
    const snap = await getDocs(q);
    
    // Filtra pelo tipo e segundo participante localmente para evitar erro de índice ausente
    let chat = snap.docs.find(d => {
        const data = d.data();
        const p = data.participants || [];
        return data.type === ChatType.PRIVATE && p.includes(uid2);
    });

    if (chat) return chat.id;

    // Se não existir, cria um novo
    const id = generateUUID();
    await setDoc(doc(db, 'chats', id), {
        id,
        type: ChatType.PRIVATE,
        participants: [uid1, uid2],
        messages: [],
        timestamp: Date.now(),
        theme: 'blue'
    });
    return id;
};

export const markChatMessagesAsRead = async (chatId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const messages = (d.data().messages || []).map((m: any) => m.senderId !== userId ? { ...m, isRead: true } : m);
        await updateDoc(ref, { messages });
    }
};

export const getUnreadMessagesCount = async (userId: string): Promise<number> => {
    if (!db) return 0;
    try {
        const snap = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', userId)));
        let count = 0;
        snap.docs.forEach(d => {
            const data = d.data();
            const messages = data.messages || [];
            messages.forEach((m: any) => {
                if (m.senderId !== userId && !m.isRead) {
                    count++;
                }
            });
        });
        return count;
    } catch (e) {
        return 0;
    }
};

/**
 * Funções de Monetização (Modelo YouTube)
 */
export const incrementWatchTime = async (userId: string, seconds: number, isPremiumViewer: boolean = false) => {
    if (!db || !userId) return;
    try {
        const userRef = doc(db, 'profiles', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        
        const data = userSnap.data();
        const goals = data.monetizationGoals || {
            followersGoal: 1000,
            watchHoursGoal: 4000,
            shortsViewsGoal: 10000000,
            currentFollowers: data.followers?.length || 0,
            currentWatchHours: 0,
            currentShortsViews: 0,
            termsAccepted: false,
            verificationStep: data.idVerificationStatus === 'APPROVED'
        };

        const currentHours = goals.currentWatchHours || 0;
        const additionalHours = seconds / 3600;
        
        const updateData: any = {};
        if (!data.monetizationGoals) {
            updateData.monetizationGoals = {
                ...goals,
                currentWatchHours: currentHours + additionalHours
            };
        } else {
            updateData['monetizationGoals.currentWatchHours'] = currentHours + additionalHours;
        }

        await updateDoc(userRef, updateData);

        if (isPremiumViewer && data.isMonetized) {
            import('./monetizationService').then(m => {
                m.monetizationService.distributePremiumRevenue(userId, seconds);
            });
        }
    } catch (e) {
        console.error("Erro ao incrementar tempo de exibição:", safeJsonStringify(e));
    }
};

export const incrementShortsView = async (userId: string) => {
    if (!db || !userId) return;
    try {
        const userRef = doc(db, 'profiles', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        
        const data = userSnap.data();
        const goals = data.monetizationGoals || {
            followersGoal: 1000,
            watchHoursGoal: 4000,
            shortsViewsGoal: 10000000,
            currentFollowers: data.followers?.length || 0,
            currentWatchHours: 0,
            currentShortsViews: 0,
            termsAccepted: false,
            verificationStep: data.idVerificationStatus === 'APPROVED'
        };

        const currentViews = goals.currentShortsViews || 0;
        
        const updateData: any = {};
        if (!data.monetizationGoals) {
            updateData.monetizationGoals = {
                ...goals,
                currentShortsViews: currentViews + 1
            };
        } else {
            updateData['monetizationGoals.currentShortsViews'] = currentViews + 1;
        }

        await updateDoc(userRef, updateData);
    } catch (e) {
        console.error("Erro ao incrementar views de shorts:", safeJsonStringify(e));
    }
};

export const getActiveAds = async (): Promise<AdCampaign[]> => {
    if (!db) return [];
    try {
        const adsRef = collection(db, 'ads');
        const q = query(adsRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdCampaign));
        return ads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
        console.error("Error getting active ads:", safeJsonStringify(e));
        return [];
    }
};

export const checkAndProcessAdBilling = async (userId: string) => {
    if (!db || !userId || userId === 'anonymous') return;
    
    try {
        const adsRef = collection(db, 'ads');
        const q = query(adsRef, where('userId', '==', userId), where('isActive', '==', true));
        const snap = await getDocs(q);
        const ads = snap.docs.map(d => ({ ...d.data(), id: d.id } as AdCampaign));
        
        const now = Date.now();
        const oneDayInMs = 24 * 60 * 60 * 1000;
        
        for (const ad of ads) {
            // Se não tiver campos novos, inicializa para evitar erros
            const endDate = ad.endDate || (ad.timestamp + (7 * oneDayInMs));
            const isAutoRenew = ad.isAutoRenew !== undefined ? ad.isAutoRenew : true;
            const renewalAmount = ad.renewalAmount || ad.budget || 0;

            // 1. Notificação de término iminente (24h antes do endDate)
            if (endDate - now <= oneDayInMs && endDate - now > 0 && !ad.notifiedRenewal) {
                try {
                    await createNotification(
                        userId,
                        'SYSTEM_AD',
                        NotificationType.MESSAGE,
                        undefined,
                        'CyberPhone Ads',
                    );
                    
                    // Marcar como notificado
                    await updateDoc(doc(db, 'ads', ad.id), { notifiedRenewal: true });
                    console.log(`[ADS] Usuário ${userId} notificado sobre renovação do anúncio ${ad.id}`);
                } catch (err) {
                    console.warn(`[ADS] Erro ao notificar usuário ${userId} sobre anúncio ${ad.id}:`, err);
                    handleFirestoreError(err, OperationType.WRITE, `ads/${ad.id}/notification`);
                }
            }
            
            // 2. Processar Expiração ou Renovação
            if (now >= endDate) {
                if (isAutoRenew) {
                    const user = await findUserById(userId);
                    const userBalance = user?.balance || 0;
                    if (user && userBalance >= renewalAmount && renewalAmount > 0) {
                        try {
                            const newBalance = userBalance - renewalAmount;
                            
                            // Débito (Profiles)
                            await updateDoc(doc(db, 'profiles', userId), { 
                                balance: newBalance,
                                updatedAt: Date.now() 
                            });
                            await updateDoc(doc(db, 'public_profiles', userId), { 
                                balance: newBalance,
                                updatedAt: Date.now()
                            });
                            
                            // Log Transação
                            const txId = generateUUID();
                            await setDoc(doc(db, 'transactions', txId), {
                                id: txId,
                                userId,
                                amount: -renewalAmount,
                                type: TransactionType.PURCHASE,
                                description: `Renovação Automática de Anúncio: ${ad.title}`,
                                status: 'COMPLETED',
                                timestamp: now
                            });
                            
                            // Estender Campaign
                            const cycleDays = ad.billingCycle === 'WEEKLY' ? 7 : 1;
                            const newDuration = cycleDays * oneDayInMs;
                            
                            await updateDoc(doc(db, 'ads', ad.id), {
                                endDate: endDate + newDuration,
                                lastBillingDate: now,
                                notifiedRenewal: false,
                                budget: increment(renewalAmount)
                            });
                            
                            console.log(`[ADS] Anúncio ${ad.id} renovado com sucesso para ${userId}`);
                        } catch (err) {
                             console.error(`[ADS] Erro ao processar renovação do anúncio ${ad.id}:`, safeJsonStringify(err));
                             handleFirestoreError(err, OperationType.UPDATE, `ads/${ad.id}/billing`);
                        }
                    } else {
                        try {
                            // Saldo insuficiente, desativa
                            await updateDoc(doc(db, 'ads', ad.id), { isActive: false });
                            console.log(`[ADS] Anúncio ${ad.id} desativado por falta de saldo`);
                            
                            await createNotification(
                                userId,
                                'SYSTEM_AD',
                                NotificationType.MESSAGE,
                                undefined,
                                'CyberPhone Ads: Sua campanha foi pausada por falta de saldo.'
                            );
                        } catch (err) {
                             handleFirestoreError(err, OperationType.UPDATE, `ads/${ad.id}/deactivate`);
                        }
                    }
                } else {
                    try {
                        // Sem renovação automática, desativa
                        await updateDoc(doc(db, 'ads', ad.id), { isActive: false });
                        console.log(`[ADS] Anúncio ${ad.id} expirou e foi desativado (Sem Auto-Renovação)`);
                    } catch (err) {
                         handleFirestoreError(err, OperationType.UPDATE, `ads/${ad.id}/expire`);
                    }
                }
            }
        }
    } catch (err) {
        console.error("[ADS] Erro ao processar cobrança de anúncios:", safeJsonStringify(err));
        if (err instanceof Error && err.message.includes("permission")) {
             // Se for erro de permissão, tentamos lançar para capturar no Dialog se possível (embora rode em bg)
             // Por enquanto só deixamos o handleFirestoreError mostrar no console se for o caso
        }
    }
};

export const toggleAdActive = async (adId: string, userId: string, active: boolean) => {
    if (!db || !userId) return;
    
    // Se estiver tentando ativar, verificar saldo
    if (active) {
        const adSnap = await getDoc(doc(db, 'ads', adId));
        if (adSnap.exists()) {
            const ad = adSnap.data() as AdCampaign;
            const user = await findUserById(userId);
            const renewalAmount = ad.renewalAmount || ad.budget || 0;
            
            if (!user || (user.balance || 0) < renewalAmount) {
                throw new Error("Saldo insuficiente para reativar esta campanha. Adicione fundos à sua carteira.");
            }
        }
    }

    await updateDoc(doc(db, 'ads', adId), { isActive: active });
};

export const requestWithdrawal = async (userId: string, amount: number, paymentDetails: string) => {
    if (!db) return;
    const user = await findUserById(userId);
    if (!user || (user.balance || 0) < amount) {
        throw new Error("Saldo insuficiente para saque.");
    }

    // Débito do saldo e aumento do saldo retirado
    const newBalance = (user.balance || 0) - amount;
    const newTotalWithdrawn = (user.totalWithdrawn || 0) + amount;

    await updateDoc(doc(db, 'profiles', userId), { 
        balance: newBalance,
        totalWithdrawn: newTotalWithdrawn
    });

    await updateDoc(doc(db, 'public_profiles', userId), { 
        balance: newBalance
    });

    const txId = generateUUID();
    await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        userId,
        amount: -amount,
        type: TransactionType.WITHDRAWAL,
        description: `Solicitação de Saque: ${paymentDetails}`,
        status: 'PENDING',
        timestamp: Date.now()
    });

    return txId;
};

export const createAd = async (ad: AdCampaign) => {
    if (!db) return;
    
    // Sentinela AI Check
    const security = await checkContentSecurity(`${ad.title} ${ad.description}`, 'ad campaign');
    if (!security.allowed) {
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    // Garantir campos de ciclo de vida no momento da criação
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    // Se não vier definido, calculamos baseado no que foi passado
    const cycleDays = ad.billingCycle === 'WEEKLY' ? 7 : 1;
    
    const enhancedAd = {
        ...ad,
        startDate: ad.startDate || now,
        lastBillingDate: ad.lastBillingDate || now,
        endDate: ad.endDate || (now + (cycleDays * oneDayInMs)),
        isAutoRenew: ad.isAutoRenew !== undefined ? ad.isAutoRenew : true,
        notifiedRenewal: false,
        renewalAmount: ad.renewalAmount || ad.budget
    };

    await setDoc(doc(db, 'ads', ad.id), enhancedAd);
};

export const checkUserFrozen = async (userId: string) => {
    const user = await findUserById(userId);
    if (user?.isFrozen) {
        throw new Error("SENTINEL_BLOCK: Sua conta está bloqueada para transações financeiras devido a atividades suspeitas monitoradas pelo Sentinela.");
    }
    return false;
};

export const processAdInvestment = async (userId: string, amount: number, title: string) => {
    if (!db) return false;
    await checkUserFrozen(userId);
    const user = await findUserById(userId);
    if (user && user.balance! >= amount) {
        await updateDoc(doc(db, 'profiles', userId), { balance: user.balance! - amount });
        await addDoc(collection(db, 'transactions'), {
            id: generateUUID(),
            userId,
            amount: -amount,
            type: TransactionType.PURCHASE,
            description: `Ad: ${title}`,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });
        return true;
    }
    return false;
};

export const getStores = async () => {
    if (!db) return [];
    try {
        return (await getDocs(collection(db, 'stores'))).docs.map(d => d.data() as Store);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stores');
        return [];
    }
};

export const createStore = async (store: Store) => {
    if (!db) return false;
    await checkUserFrozen(store.userId);

    try {
        await setDoc(doc(db, 'stores', store.id), {
            ...store,
            createdAt: Date.now(),
            status: 'ACTIVE'
        });
        return true;
    } catch (e) {
        console.error("Store creation error:", safeJsonStringify(e));
        handleFirestoreError(e, OperationType.WRITE, 'stores');
        return false;
    }
};

export const updateStore = async (store: Store) => {
    if (!db) return;
    
    // Sentinela AI Check
    const security = await checkContentSecurity(`${store.name} ${store.description}`, 'store update');
    if (!security.allowed) {
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    await updateDoc(doc(db, 'stores', store.id), store as any);
};

export const verifyStore = async (storeId: string) => {
    if (!db) return false;
    try {
        await updateDoc(doc(db, 'stores', storeId), { 
            isVerified: true,
            verificationStatus: 'APPROVED'
        });
        return true;
    } catch (e) {
        console.error("Error verifying store:", safeJsonStringify(e));
        return false;
    }
};

export const updateStoreVerificationWithDetails = async (storeId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'NOT_STARTED', performanceScore: number) => {
    if (!db) return false;
    try {
        await updateDoc(doc(db, 'stores', storeId), { 
            verificationStatus: status,
            performanceScore: performanceScore,
            isVerified: status === 'APPROVED'
        });
        return true;
    } catch (e) {
        console.error("Error updating store verification:", safeJsonStringify(e));
        return false;
    }
};

export const sendAdminSignalToStore = async (storeId: string, signal: AdminSignal) => {
    if (!db) return false;
    try {
        const storeRef = doc(db, 'stores', storeId);
        const storeDoc = await getDoc(storeRef);
        if (!storeDoc.exists()) return false;
        
        const storeData = storeDoc.data() as Store;
        const currentSignals = storeData.adminSignals || [];
        
        await updateDoc(storeRef, {
            adminSignals: [...currentSignals, signal],
            lastSignalAt: Date.now()
        });
        return true;
    } catch (e) {
        console.error("Error sending admin signal:", safeJsonStringify(e));
        return false;
    }
};

export const payStoreVerificationFee = async (storeId: string, signalId: string, userId: string, amount: number) => {
    if (!db) return false;
    try {
        await checkUserFrozen(userId);
        
        const userRef = doc(db, 'profiles', userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return false;
        const balance = userDoc.data()?.balance || 0;
        
        if (balance < amount) return false;
        
        await updateDoc(userRef, { balance: balance - amount });
        await updateDoc(doc(db, 'public_profiles', userId), { balance: balance - amount });
        
        const storeRef = doc(db, 'stores', storeId);
        const storeDoc = await getDoc(storeRef);
        if (!storeDoc.exists()) return false;
        
        const storeData = storeDoc.data() as Store;
        const updatedSignals = (storeData.adminSignals || []).map(s => {
            if (s.id === signalId) {
                return { ...s, paymentStatus: 'COMPLETED' as const };
            }
            return s;
        });
        
        await updateDoc(storeRef, { 
            adminSignals: updatedSignals,
            verificationStatus: 'PENDING'
        });
        
        const tid = `verif_${Date.now()}`;
        await setDoc(doc(db, 'transactions', tid), {
            id: tid,
            userId,
            amount,
            type: 'PURCHASE',
            description: `Taxa de Verificação de Loja: ${storeData.name}`,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });
        
        return true;
    } catch (e) {
        console.error("Error paying store verification fee:", safeJsonStringify(e));
        return false;
    }
};

export const unverifyStore = async (storeId: string) => {
    if (!db) return false;
    try {
        await updateDoc(doc(db, 'stores', storeId), { isVerified: false });
        return true;
    } catch (e) {
        console.error("Error unverifying store:", safeJsonStringify(e));
        return false;
    }
};

export const getAudioTracks = async () => [];

export const getSalesByAffiliateId = async (uid: string) => {
    if (!db) return [];
    try {
        return (await getDocs(query(collection(db, 'sales'), where('affiliateUserId', '==', uid)))).docs.map(d => ({ ...d.data(), id: d.id } as AffiliateSale));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'sales (affiliate)');
        return [];
    }
};

export const getAffiliateLinks = async (uid?: string, sellerId?: string): Promise<AffiliateLink[]> => {
    if (!db) return [];
    try {
        let q: any = collection(db, 'affiliate_links');
        if (uid) {
            q = query(q, where('affiliateId', '==', uid));
        } else if (sellerId) {
            q = query(q, where('sellerId', '==', sellerId));
        }
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data() as any;
            return { ...data, id: d.id } as AffiliateLink;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'affiliate_links');
        return [];
    }
};

export const saveAffiliateLink = async (affiliateId: string, productId: string, link: string, sellerId: string) => {
    if (!db) return;
    const id = `${affiliateId}_${productId}`;
    const affiliateLink: AffiliateLink = {
        id,
        affiliateId,
        productId,
        sellerId,
        link,
        clicks: 0,
        timestamp: Date.now()
    };
    await setDoc(doc(db, 'affiliate_links', id), affiliateLink);
};

export const removeAffiliateLink = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'affiliate_links', id));
};

export const trackAffiliateClick = async (affiliateId: string, productId: string) => {
    if (!db) return;
    const linkId = `${affiliateId}_${productId}`;
    try {
        const linkRef = doc(db, 'affiliate_links', linkId);
        const linkDoc = await getDoc(linkRef);
        if (linkDoc.exists()) {
            await updateDoc(linkRef, {
                clicks: increment(1)
            });
        }
    } catch (error) {
        console.error("Erro ao rastrear clique de afiliado:", safeJsonStringify(error));
    }
};

export const addToCart = (productId: string, quantity: number = 1, selectedColor?: string, affiliateId?: string) => {
    const cart = getCart();
    const existingItem = cart.find((item: any) => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
        if (affiliateId) existingItem.affiliateId = affiliateId;
    } else {
        cart.push({ productId, quantity, selectedColor, affiliateId });
    }
    localStorage.setItem('cyberphone_cart', safeJsonStringify(cart));
};

export const updateCartItemQuantity = (pid: string, qty: number) => {
    let cart = getCart();
    if (qty <= 0) cart = cart.filter((i:any) => i.productId !== pid);
    else {
        const item = cart.find((i:any) => i.productId === pid);
        if (item) item.quantity = qty;
    }
    localStorage.setItem('cyberphone_cart', safeJsonStringify(cart));
};

export const removeFromCart = (pid: string) => {
    const cart = getCart().filter((i:any) => i.productId !== pid);
    localStorage.setItem('cyberphone_cart', safeJsonStringify(cart));
};

export const clearCart = () => {
    localStorage.setItem('cyberphone_cart', '[]');
};

export const processProductPurchase = async (items: CartItem[], buyerId: string, affiliateId: string | null, address: ShippingAddress, carrier?: { id: string; name: string }) => {
    if (!db) return false;
    await checkUserFrozen(buyerId);
    try {
        const settings = await getGlobalSettings();
        const platformTax = settings.platformTax / 100;
        const batchTimestamp = Date.now();

        for (const item of items) {
            const productDoc = await getDoc(doc(db, 'products', item.productId));
            if (!productDoc.exists()) continue;
            const product = productDoc.data() as Product;
            
            const storeDoc = await getDoc(doc(db, 'stores', product.storeId));
            if (!storeDoc.exists()) continue;
            const store = storeDoc.data() as Store;
            const sellerId = store.userId;

            // Include shipping fee in total calculation for physical products
            const shippingCost = (product.type === ProductType.PHYSICAL && !product.hasFreeShipping) 
                ? (product.shippingFee || 0) 
                : 0;
            
            const totalAmount = (product.price * item.quantity) + shippingCost;
            const saleId = generateUUID();

            // 1. Create Sale Record
            const initialStatus = product.type === ProductType.PHYSICAL ? OrderStatus.WAITLIST : OrderStatus.DELIVERED;
            
            // Calculamos ganhos antecipadamente para salvar no registro da venda (Escrow)
            let sellerEarnings = totalAmount * (1 - platformTax);
            let affiliateEarnings = 0;

            const finalAffiliateId = item.affiliateId || affiliateId;

            if (finalAffiliateId && product.affiliateCommissionRate > 0) {
                affiliateEarnings = totalAmount * (product.affiliateCommissionRate / 100);
                sellerEarnings -= affiliateEarnings;
            }

            await setDoc(doc(db, 'sales', saleId), {
                id: saleId,
                productId: item.productId,
                buyerId,
                sellerId,
                affiliateUserId: finalAffiliateId || '',
                storeId: product.storeId,
                timestamp: batchTimestamp,
                status: initialStatus,
                shippingAddress: address,
                saleAmount: totalAmount,
                sellerEarnings, // Guardamos para liberar depois
                affiliateEarnings, // Guardamos para liberar depois
                fundsReleased: false, // SISTEMA DE CUSTÓDIA ATIVADO
                carrierId: carrier?.id || '',
                carrierName: carrier?.name || address.carrierName || ''
            });

            // 1.1 Update Pending Balances for Seller
            const sellerRef = doc(db, 'profiles', sellerId);
            await updateDoc(sellerRef, {
                pendingBalance: increment(sellerEarnings),
                totalEarnings: increment(sellerEarnings)
            });

            // 1.2 Update Pending Balances for Affiliate
            if (finalAffiliateId && affiliateEarnings > 0) {
                const affiliateRef = doc(db, 'profiles', finalAffiliateId);
                await updateDoc(affiliateRef, {
                    pendingBalance: increment(affiliateEarnings),
                    totalEarnings: increment(affiliateEarnings)
                });
            }

            // 2. Handle Buyer Balance (Deducting immediately)
            const buyerDoc = await getDoc(doc(db, 'profiles', buyerId));
            if (buyerDoc.exists()) {
                const buyer = buyerDoc.data() as User;
                await updateDoc(doc(db, 'profiles', buyerId), {
                    balance: (buyer.balance || 0) - totalAmount
                });

                // Create Buyer Transaction
                const buyTransId = generateUUID();
                await setDoc(doc(db, 'transactions', buyTransId), {
                    id: buyTransId,
                    userId: buyerId,
                    type: TransactionType.PURCHASE,
                    amount: -totalAmount,
                    description: `Compra de produto: ${product.name} (Aguardando Recebimento)`,
                    timestamp: batchTimestamp,
                    status: 'COMPLETED'
                });
            }

            // Increment Product Sold Count
            await updateDoc(doc(db, 'products', item.productId), {
                soldCount: (product.soldCount || 0) + item.quantity
            });
        }

        clearCart();
        return true;
    } catch (error) {
        console.error("Erro ao processar compra:", safeJsonStringify(error));
        return false;
    }
};

export const cancelOrder = async (saleId: string, userId: string) => {
    if (!db) return false;
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);
        if (!saleDoc.exists()) throw new Error("Venda não encontrada");
        const sale = saleDoc.data() as any;

        if (sale.buyerId !== userId) throw new Error("Apenas o comprador pode cancelar esta venda");
        if (sale.status === OrderStatus.CANCELED) throw new Error("Venda já cancelada");
        if (sale.fundsReleased) throw new Error("Não é possível cancelar um pedido cujos fundos já foram liberados");

        const saleAmount = Number(sale.saleAmount) || 0;
        const sellerEarnings = Number(sale.sellerEarnings) || 0;
        const affiliateEarnings = Number(sale.affiliateEarnings) || 0;

        const settings = await getGlobalSettings();
        const isWaitlist = sale.status === OrderStatus.WAITLIST;
        const feePercentage = isWaitlist ? 0 : (settings.orderCancellationFeePercentage ?? 5);
        const refundPercentage = (100 - feePercentage) / 100;
        const refundAmount = saleAmount * refundPercentage;
        const feeAmount = saleAmount - refundAmount;

        const batch = writeBatch(db);

        // 1. Atualizar status da venda
        batch.update(saleRef, {
            status: OrderStatus.CANCELED,
            canceledAt: Date.now(),
            refundAmount,
            cancellationFee: feeAmount,
            updatedAt: serverTimestamp()
        });

        // 2. Estornar saldos do Vendedor e Afiliado (se houver) no pendingBalance
        if (sellerEarnings > 0) {
            const sellerRef = doc(db, 'profiles', sale.sellerId);
            batch.update(sellerRef, {
                pendingBalance: increment(-sellerEarnings),
                totalEarnings: increment(-sellerEarnings)
            });
        }

        if (sale.affiliateUserId && affiliateEarnings > 0) {
            const affiliateRef = doc(db, 'profiles', sale.affiliateUserId);
            batch.update(affiliateRef, {
                pendingBalance: increment(-affiliateEarnings),
                totalEarnings: increment(-affiliateEarnings)
            });
        }

        // 3. Reembolsar o comprador no saldo principal
        const buyerRef = doc(db, 'profiles', sale.buyerId);
        batch.update(buyerRef, {
            balance: increment(refundAmount)
        });

        // 4. Criar transação de reembolso para o comprador
        const transId = generateUUID();
        batch.set(doc(db, 'transactions', transId), {
            id: transId,
            userId: sale.buyerId,
            type: TransactionType.REFUND,
            amount: refundAmount,
            description: `Reembolso de pedido #${sale.id.slice(-8).toUpperCase()} (com taxa de renúncia de ${feePercentage}%)`,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });

        // 5. Sincronizar saldo público
        const publicBuyerRef = doc(db, 'public_profiles', sale.buyerId);
        batch.update(publicBuyerRef, { balance: increment(refundAmount) });

        await batch.commit();

        return true;
    } catch (error) {
        console.error("Erro ao cancelar pedido:", safeJsonStringify(error));
        throw error;
    }
};

export const deleteOrder = async (saleId: string) => {
    if (!db) return false;
    try {
        await deleteDoc(doc(db, 'sales', saleId));
        return true;
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'sales/' + saleId);
        return false;
    }
};

export const getDisputedSales = async () => {
    if (!db) return [];
    try {
        const q = query(collection(db, 'sales'), where('status', '==', OrderStatus.DISPUTED));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as AffiliateSale));
    } catch (error) {
        return [];
    }
};

export const releaseFundsToSeller = async (saleId: string) => {
    if (!db) return;
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);
        if (!saleDoc.exists()) throw new Error("Venda não encontrada");
        const sale = saleDoc.data() as any;

        if (sale.fundsReleased) {
            console.log("[STORAGE] Fundos já liberados para a venda:", saleId);
            return;
        }

        const sellerEarning = Number(sale.sellerEarnings) || 0;
        const affiliateEarning = Number(sale.affiliateEarnings) || 0;

        const batch = writeBatch(db);

        // 1. Liberar para o Vendedor
        if (sellerEarning > 0) {
            const sellerRef = doc(db, 'profiles', sale.sellerId);
            batch.update(sellerRef, { 
                balance: increment(sellerEarning),
                pendingBalance: increment(-sellerEarning)
            });
            
            const publicSellerRef = doc(db, 'public_profiles', sale.sellerId);
            batch.update(publicSellerRef, { balance: increment(sellerEarning) });

            const sTransId = generateUUID();
            batch.set(doc(db, 'transactions', sTransId), {
                id: sTransId,
                userId: sale.sellerId,
                type: TransactionType.SALE,
                amount: sellerEarning,
                description: `Fundo liberado da venda: ${saleId}`,
                timestamp: Date.now(),
                status: 'COMPLETED'
            });
        }

        // 2. Liberar Para o Afiliado
        if (affiliateEarning > 0 && sale.affiliateUserId) {
            const affRef = doc(db, 'profiles', sale.affiliateUserId);
            batch.update(affRef, { 
                balance: increment(affiliateEarning),
                pendingBalance: increment(-affiliateEarning)
            });

            const publicAffRef = doc(db, 'public_profiles', sale.affiliateUserId);
            batch.update(publicAffRef, { balance: increment(affiliateEarning) });

            const aTransId = generateUUID();
            batch.set(doc(db, 'transactions', aTransId), {
                id: aTransId,
                userId: sale.affiliateUserId,
                type: TransactionType.SALE,
                amount: affiliateEarning,
                description: `Comissão liberada da venda: ${saleId}`,
                timestamp: Date.now(),
                status: 'COMPLETED'
            });
        }

        // 3. Atualizar status da venda
        batch.update(saleRef, { 
            fundsReleased: true, 
            status: OrderStatus.COMPLETED,
            updatedAt: Date.now()
        });

        await batch.commit();
        console.log("[STORAGE] Fundos liberados com sucesso (Batch Commit)");
    } catch (error) {
        console.error("Erro ao liberar fundos (Batch):", safeJsonStringify(error));
        handleFirestoreError(error, OperationType.WRITE, `sales/${saleId}/release`);
    }
};

export const confirmProductReceipt = async (saleId: string) => {
    await releaseFundsToSeller(saleId);
};

export const addSystemLog = async (log: Omit<SystemLog, 'id' | 'timestamp'> & { timestamp?: number }) => {
    if (!db) return;
    try {
        await addDoc(collection(db, 'system_logs'), {
            ...log,
            timestamp: log.timestamp || Date.now()
        });
    } catch (error) {
        console.warn("[STORAGE] Erro ao registrar log do sistema:", error);
    }
};

export const openOrderDispute = async (saleId: string, reason: string) => {
    if (!db) return false;
    try {
        const saleRef = doc(db, 'sales', saleId);
        await updateDoc(saleRef, { status: OrderStatus.DISPUTED, disputeReason: reason });
        
        // Notificar um "Admin" ou sistema de Log
        await addDoc(collection(db, 'system_logs'), {
            action: 'DISPUTE_OPENED',
            details: `Disputa aberta na venda ${saleId}. Motivo: ${reason}`,
            timestamp: Date.now()
        });
        return true;
    } catch (error) {
        return false;
    }
};

export const cancelPurchaseAndRefund = async (saleId: string) => {
    if (!db) return false;
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);
        if (!saleDoc.exists()) return false;
        const sale = saleDoc.data() as any;

        if (sale.fundsReleased) throw new Error("Fundos já foram liberados para o vendedor. Não é possível estornar automaticamente.");

        const batch = writeBatch(db);

        // 1. Estornar Comprador
        const buyerRef = doc(db, 'profiles', sale.buyerId);
        const publicBuyerRef = doc(db, 'public_profiles', sale.buyerId);
        
        batch.update(buyerRef, { balance: increment(sale.saleAmount) });
        batch.update(publicBuyerRef, { balance: increment(sale.saleAmount) });

        // 2. Criar Transação de Depósito (Estorno) para o Comprador
        const transId = generateUUID();
        batch.set(doc(db, 'transactions', transId), {
            id: transId,
            userId: sale.buyerId,
            type: TransactionType.DEPOSIT,
            amount: sale.saleAmount,
            description: `Estorno da compra: ${saleId}`,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });

        // 3. Estornar saldos do Vendedor e Afiliado (se houver) no pendingBalance/totalEarnings
        // Isso é CRUCIAL para evitar que o vendedor fique com dinheiro de um pedido cancelado
        const sellerEarnings = Number(sale.sellerEarnings) || 0;
        const affiliateEarnings = Number(sale.affiliateEarnings) || 0;

        if (sellerEarnings > 0) {
            const sellerRef = doc(db, 'profiles', sale.sellerId);
            batch.update(sellerRef, {
                pendingBalance: increment(-sellerEarnings),
                totalEarnings: increment(-sellerEarnings)
            });
        }

        if (sale.affiliateUserId && affiliateEarnings > 0) {
            const affiliateRef = doc(db, 'profiles', sale.affiliateUserId);
            batch.update(affiliateRef, {
                pendingBalance: increment(-affiliateEarnings),
                totalEarnings: increment(-affiliateEarnings)
            });
        }

        // 4. Marcar Venda como Cancelada
        batch.update(saleRef, { 
            status: OrderStatus.CANCELED,
            updatedAt: Date.now(),
            refundedAt: Date.now(),
            refundAmount: sale.saleAmount
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Erro ao cancelar e estornar:", safeJsonStringify(error));
        return false;
    }
};

export const updateUserBalance = async (uid: string, amt: number) => {
    if (!db) return;
    const u = await findUserById(uid);
    if(u) await updateDoc(doc(db, 'profiles', uid), { balance: (u.balance || 0) + amt });
};

export const getPurchasesByBuyerId = async (uid: string) => {
    if (!db) return [];
    try {
        const q = query(collection(db, 'sales'), where('buyerId', '==', uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as AffiliateSale));
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'sales/buyer/' + uid);
        return [];
    }
};

export const addProductRating = async (saleId: string, rating: number, comment: string) => {
    if (!db) return;
    try {
        // IA Sentinela Monitorando Comentários
        const sentinelResult = await checkContentSecurity(comment, 'AVALIAÇÃO DE PRODUTO');
        if (!sentinelResult.allowed) {
            throw new Error(`SENTINELA_BLOQUEIO: ${sentinelResult.reason}`);
        }

        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);
        
        if (saleDoc.exists()) {
            const saleData = saleDoc.data() as AffiliateSale;
            const productId = saleData.productId;
            const userId = saleData.buyerId;
            
            // 1. Atualizar a venda
            await updateDoc(saleRef, { isRated: true, rating, ratingComment: comment });
            
            // 2. Adicionar avaliação ao produto (se o produto existir)
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
                const product = productDoc.data() as Product;
                const newRatingObj: ProductRating = {
                    id: generateUUID(),
                    saleId,
                    userId,
                    rating,
                    comment,
                    timestamp: Date.now()
                };
                
                const currentRatings = product.ratings || [];
                const newRatings = [...currentRatings, newRatingObj];
                const newCount = newRatings.length;
                const newAvg = newRatings.reduce((acc, r) => acc + r.rating, 0) / newCount;
                
                await updateDoc(productRef, {
                    ratings: newRatings,
                    averageRating: newAvg,
                    ratingCount: newCount
                });
            }
        }
    } catch (error) {
        console.error("Erro ao adicionar avaliação:", safeJsonStringify(error));
        throw error; // Re-throw to be caught by UI
    }
};

export const createProduct = async (p: Product) => {
    if (!db) return;

    // Sentinela AI Check
    const security = await checkContentSecurity(`${p.name} ${p.description}`, 'product');
    if (!security.allowed) {
        if (security.isFraud) {
            // Se tentar criar produto fraudulento, bloqueia o vendedor
            const storeDoc = await getDoc(doc(db, 'stores', p.storeId));
            if (storeDoc.exists()) {
                const sellerId = storeDoc.data().userId;
                await updateDoc(doc(db, 'profiles', sellerId), { isFrozen: true });
            }
        }
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    try {
        await setDoc(doc(db, 'products', p.id), {
            ...p,
            soldCount: p.soldCount || 0,
            timestamp: p.timestamp || Date.now()
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'products/' + p.id);
    }
};

export const getAffiliateSales = async (filters?: { affiliateUserId?: string, storeId?: string, buyerId?: string, sellerId?: string }) => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        let q: any = collection(db, 'sales');
        
        if (filters?.affiliateUserId) {
            q = query(q, where('affiliateUserId', '==', filters.affiliateUserId));
        } else if (filters?.sellerId) {
            q = query(q, where('sellerId', '==', filters.sellerId));
        } else if (filters?.storeId) {
            q = query(q, where('storeId', '==', filters.storeId));
        } else if (filters?.buyerId) {
            q = query(q, where('buyerId', '==', filters.buyerId));
        }
        
        let snap: QuerySnapshot<DocumentData>;
        try {
            snap = await getDocs(q);
        } catch (initialError: any) {
            if (initialError.message && (initialError.message.includes('offline') || initialError.message.includes('permissions'))) {
                console.warn("⚠️ Problema de permissão ou offline. Tentando getDocsFromServer...");
                snap = await getDocsFromServer(q);
            } else {
                throw initialError;
            }
        }
        return snap.docs.map(d => ({ ...d.data() as any, id: d.id } as AffiliateSale));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'sales');
        return [];
    }
};

export const addStory = async (uid: string, storyData: Partial<Story>, userName: string, userProfilePic: string) => {
    if (!db) return;

    // Sentinela AI Check
    if (storyData.text) {
        const security = await checkContentSecurity(storyData.text, 'story');
        if (!security.allowed) {
            throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
        }
    }

    const id = generateUUID();
    try {
        await setDoc(doc(db, 'stories', id), { 
            ...storyData, 
            userId: uid, 
            userName,
            userProfilePic,
            id, 
            timestamp: Date.now(),
            views: []
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'stories/' + id);
    }
};

export const markStoryAsViewed = async (storyId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, 'stories', storyId);
    try {
        await updateDoc(ref, { views: arrayUnion(userId) });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `stories/${storyId}`);
    }
};

export const indicatePostToUser = async (pid: string, from: string, to: string) => {
    if (!db) return false;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const indicated = d.data().indicatedUserIds || [];
        if (!indicated.includes(to)) {
            await updateDoc(ref, { indicatedUserIds: [...indicated, to] });
            return true;
        }
    }
    return false;
};

export const deleteComment = async (pid: string, cid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const comments = (d.data().comments || []).filter((c:any) => c.id !== cid);
        await updateDoc(ref, { comments });
    }
};

export const getPlatformRevenue = async () => {
    if (!db) return 0;
    try {
        const snap = await getDocs(collection(db, 'transactions'));
        return snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'transactions (revenue)');
        return 0;
    }
};

export const getTransactions = async (uid?: string, currentAdmin?: User) => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        let q: any;
        if (uid) {
            q = query(collection(db, 'transactions'), where('userId', '==', uid));
        } else if (currentAdmin && !currentAdmin.isAdmin) {
            // Se não passou UID e não é admin, força o filtro pelo próprio UID
            q = query(collection(db, 'transactions'), where('userId', '==', currentAdmin.id));
        } else {
            q = collection(db, 'transactions');
        }
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Transaction));
    } catch (error) {
        console.error("Erro ao buscar transações:", safeJsonStringify(error));
        return [];
    }
};

export const getReports = async () => {
    if (!db) return [];
    try {
        return (await getDocs(collection(db, 'reports'))).docs.map(d => ({ ...(d.data() as any), id: d.id } as ContentReport));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reports');
        return [];
    }
};

export const adminUpdateUser = async (u: User) => {
    if (!db) return false;
    try {
        await updateUser(u);
        
        if (u.isAdmin) {
            await setDoc(doc(db, 'admins', u.id), {
                email: u.email,
                timestamp: Date.now()
            }, { merge: true });
        } else {
            await deleteDoc(doc(db, 'admins', u.id));
        }
        
        await addSystemLog({
            action: 'ADMIN_UPDATE_USER',
            details: `Admin atualizou permissões do usuário ID: ${u.id} (Novo status Admin: ${u.isAdmin})`,
            adminId: auth?.currentUser?.uid || 'system'
        });
        
        return true;
    } catch (err) {
        console.error("[STORAGE] Erro ao sincronizar status de admin:", err);
        return false;
    }
};
export const adminDeletePost = async (id: string) => await deletePost(id);
export const adminProcessReport = async (id: string, status: string, adminId: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'reports', id), { status, resolvedBy: adminId });
};

export const updateGlobalSettings = async (s: GlobalSettings) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'settings', 'global'), s, { merge: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
};

export const handleWalletTransaction = async (uid: string, amt: number, type: string) => {
    if (!db) return false;
    const u = await findUserById(uid);
    if(u) {
        if (u.isFrozen) {
            throw new Error("SENTINEL_BLOCK: Sua conta está bloqueada para transações financeiras devido a atividades suspeitas monitoradas pelo Sentinela.");
        }
        if (type === 'withdraw' && u.balance! < amt) return false;
        const diff = type === 'deposit' ? amt : -amt;
        const updateData: any = { balance: increment(diff) };
        if (type === 'withdraw') {
            updateData.totalWithdrawn = increment(amt);
        }
        await updateDoc(doc(db, 'profiles', uid), updateData);
        await updateDoc(doc(db, 'public_profiles', uid), { balance: increment(diff) });
        
        const txId = generateUUID();
        await setDoc(doc(db, 'transactions', txId), {
            id: txId,
            userId: uid,
            amount: diff,
            type: type === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });
        return true;
    }
    return false;
};

export const createTransaction = async (transaction: Transaction) => {
  if (!db) return;
  try {
    const txId = transaction.id || generateUUID();
    const finalTx = { ...transaction, id: txId, timestamp: transaction.timestamp || Date.now() };
    await setDoc(doc(db, 'transactions', txId), finalTx);
    
    if (transaction.amount !== 0) {
      const profileRef = doc(db, 'profiles', transaction.userId);
      const publicRef = doc(db, 'public_profiles', transaction.userId);
      await updateDoc(profileRef, { balance: increment(transaction.amount) });
      await updateDoc(publicRef, { balance: increment(transaction.amount) });
    }
    return finalTx;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transactions');
  }
};

export const boostPost = async (pid: string, uid: string, days: number, amount: number, minAge?: number, maxAge?: number, targetLocations?: string[]) => {
    if (!db) return false;
    await checkUserFrozen(uid);
    
    // Check user balance
    const userRef = doc(db, 'profiles', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const balance = userData.balance || 0;
    
    if (balance < amount) return false;
    
    // Deduct balance
    const newBalance = balance - amount;
    await updateDoc(userRef, { balance: newBalance });
    await updateDoc(doc(db, 'public_profiles', uid), { balance: newBalance });
    
    // Boost post with bid and targeting
    await updateDoc(doc(db, 'posts', pid), { 
      isBoosted: true, 
      boostExpires: Date.now() + (days * 86400000),
      boostBid: amount,
      minAge: minAge || 0,
      maxAge: maxAge || 100,
      targetLocations: targetLocations || []
    });
    
    // Create transaction log
    const txId = generateUUID();
    await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        userId: uid,
        amount: -amount,
        type: 'PLATFORM_FEE',
        description: `Boost de publicação (Lance: ${amount.toFixed(2)} KZ) - ${days} dias`,
        status: 'COMPLETED',
        timestamp: Date.now()
    });

    return true;
};

export const promotePostInCarousel = async (pid: string, uid: string, days: number, amount: number) => {
    if (!db) return false;
    await checkUserFrozen(uid);
    
    // Check user balance
    const userRef = doc(db, 'profiles', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const balance = userData.balance || 0;
    
    if (balance < amount) return false;
    
    // Deduct balance
    const newBalance = balance - amount;
    await updateDoc(userRef, { balance: newBalance });
    await updateDoc(doc(db, 'public_profiles', uid), { balance: newBalance });
    
    // Promote post to carousel
    await updateDoc(doc(db, 'posts', pid), { 
      promotedUntil: Date.now() + (days * 86400000),
      promotionDays: days
    });
    
    return true;
};

export const processVerificationPayment = async (uid: string) => {
    if (!db) return false;
    const settings = await getGlobalSettings();
    const fee = settings.verificationFee || 0;
    
    if (fee <= 0) return true; // No fee set

    const userRef = doc(db, 'profiles', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const balance = userData.balance || 0;
    
    if (balance < fee) return false;
    
    // Deduct balance
    const newBalance = balance - fee;
    await updateDoc(userRef, { balance: newBalance });
    await updateDoc(doc(db, 'public_profiles', uid), { balance: newBalance });
    
    // Add transaction
    const txId = generateUUID();
    await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        userId: uid,
        amount: -fee,
        type: 'PLATFORM_FEE',
        description: `Taxa de Verificação de Identidade (Selo Azul)`,
        status: 'COMPLETED',
        timestamp: Date.now()
    });
    
    return true;
};

export const createGroup = async (name: string, members: string[], adminId: string, description?: string, theme?: GroupTheme, imageFile?: File, isPublic?: boolean) => {
    if (!db) return false;
    await checkUserFrozen(adminId);
    
    // Check for group creation fee
    try {
        const settings = await getGlobalSettings();
        const fee = settings.groupCreationFee || 0;
        
        if (fee > 0) {
            const userRef = doc(db, 'profiles', adminId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return null;
            
            const userData = userDoc.data();
            const balance = userData.balance || 0;
            
            if (balance < fee) return null;
            
            // Deduct balance
            const newBalance = balance - fee;
            await updateDoc(userRef, { balance: newBalance });
            await updateDoc(doc(db, 'public_profiles', adminId), { balance: newBalance });
            
            // Add transaction
            const txId = generateUUID();
            await setDoc(doc(db, 'transactions', txId), {
                id: txId,
                userId: adminId,
                amount: -fee,
                type: 'PLATFORM_FEE',
                description: `Criação de Comunidade: ${name}`,
                status: 'COMPLETED',
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.error("Error checking group fee:", safeJsonStringify(e));
    }

    const id = generateUUID();
    let image = '';
    if (imageFile) image = await uploadFile(imageFile, 'groups');
    await setDoc(doc(db, 'chats', id), {
        id,
        type: ChatType.GROUP,
        participants: [...members, adminId],
        messages: [],
        groupName: name,
        groupImage: image,
        adminId,
        isPublic,
        description,
        theme: theme || 'blue',
        timestamp: Date.now()
    });
    return id;
};

export const getSupportTickets = async (uid: string) => {
    if (!db) return [];
    return (await getDocs(query(collection(db, 'tickets'), where('userId', '==', uid)))).docs.map(d => ({ ...d.data(), id: d.id } as SupportTicket));
};

export const createSupportTicket = async (data: any, desc: string, url?: string, type?: string) => {
    if (!db) return;

    // Sentinela AI Check
    const security = await checkContentSecurity(desc, 'support ticket');
    if (!security.allowed) {
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    const id = generateUUID();
    const msg: SupportMessage = { id: generateUUID(), senderId: data.userId, text: desc, attachmentUrl: url, attachmentType: type as any, timestamp: Date.now() };
    await setDoc(doc(db, 'tickets', id), {
        ...data,
        id,
        status: 'OPEN',
        assignedAdminId: '',
        messages: [msg],
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
};

export const addSupportMessage = async (tid: string, msg: any) => {
    if (!db) return;
    
    // Sentinela AI Check
    if (msg.text) {
        const security = await checkContentSecurity(msg.text, 'support message');
        if (!security.allowed) {
            throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
        }
    }

    const ref = doc(db, 'tickets', tid);
    const d = await getDoc(ref);
    if(d.exists()){
        const data = d.data() as SupportTicket;
        const m = { ...msg, id: generateUUID(), timestamp: Date.now() };
        
        const updateData: any = { 
            messages: [...(data.messages || []), m], 
            updatedAt: Date.now() 
        };

        // If sender is admin and ticket is not assigned, assign it
        if (msg.senderId === 'SUPPORT' && !data.assignedAdminId) {
            if (auth?.currentUser) {
                updateData.assignedAdminId = auth.currentUser.uid;
            }
        }

        await updateDoc(ref, updateData);
    }
};

export const claimSupportTicket = async (tid: string, adminId: string) => {
    if (!db) return;
    const ref = doc(db, 'tickets', tid);
    try {
        await updateDoc(ref, {
            assignedAdminId: adminId,
            updatedAt: Date.now()
        });
    } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'tickets/' + tid);
    }
};

export const getAdminSupportTickets = async (adminId?: string) => {
    if (!db) return [];
    try {
        let q: any = collection(db, 'tickets');
        
        // If it's a super admin, we don't necessarily need to filter (unless they want to)
        // For standard admins, we filter by unassigned or assigned to them
        const isSuper = auth?.currentUser?.email === 'ac926815124@gmail.com' || auth?.currentUser?.email === 'alfaajmc@gmail.com';
        
        if (adminId && !isSuper) {
             // Filter unassigned ('') or assigned to me
             q = query(q, where('assignedAdminId', 'in', ['', adminId]));
        }
        
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as SupportTicket));
    } catch (err) {
        console.error("[STORAGE] Error fetching admin tickets (likely security restriction):", safeJsonStringify(err));
        return [];
    }
};

export const subscribeToSupportTickets = (userId: string, callback: (tickets: SupportTicket[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'tickets'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as SupportTicket)));
    }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'tickets');
    });
};

export const subscribeToAdminSupportTickets = (adminId: string, callback: (tickets: SupportTicket[]) => void) => {
    if (!db) return () => {};
    
    let q: any = collection(db, 'tickets');
    const isSuper = auth?.currentUser?.email === 'ac926815124@gmail.com' || auth?.currentUser?.email === 'alfaajmc@gmail.com';
    
    if (!isSuper) {
        q = query(q, where('assignedAdminId', 'in', ['', adminId]));
    }

    return onSnapshot(q, (snap: any) => {
        callback(snap.docs.map((d: any) => ({ ...(d.data() as any), id: d.id } as SupportTicket)));
    }, (err: any) => {
        handleFirestoreError(err, OperationType.LIST, 'tickets');
    });
};

export const resolveSupportTicket = async (tid: string) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'tickets', tid), {
            status: 'RESOLVED',
            updatedAt: Date.now()
        });
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'tickets/' + tid);
    }
};

export const getSystemLogs = async (): Promise<SystemLog[]> => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const snap = await getDocs(query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100)));
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as SystemLog));
    } catch (error) {
        console.warn("[STORAGE] Error fetching system logs:", error);
        return [];
    }
};

export const getPromotedItems = async () => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const now = Date.now();
        
        // Fetch promoted products
        const productsQuery = query(
            collection(db, 'products'),
            where('promotedUntil', '>', now),
            limit(10)
        );
        const productSnaps = await getDocs(productsQuery);
        const promotedProducts = productSnaps.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                imageUrl: data.mainImage || data.imageUrl,
                promoteType: 'product'
            };
        });

        // Fetch promoted ads
        const adsQuery = query(
            collection(db, 'ad_campaigns'),
            where('promotedUntil', '>', now),
            where('isActive', '==', true),
            limit(10)
        );
        const adSnaps = await getDocs(adsQuery);
        const promotedAds = adSnaps.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            promoteType: 'ad'
        }));

        // Combine all and shuffle - REMOVED PROMOTED POSTS AS PER REQUEST
        return [...promotedProducts, ...promotedAds].sort(() => Math.random() - 0.5);
    } catch (err) {
        console.warn("[STORAGE] Error fetching promoted items:", err);
        return [];
    }
};
