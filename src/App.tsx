import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, CartItem, GlobalSettings, GroupTheme, Page } from './types';
import {
    getCurrentUserId,
    findUserById,
    saveCurrentUser,
    getNotificationsForUser,
    markNotificationsAsRead,
    getCart,
    getUnreadMessagesCount,
    addToCart,
    getGlobalSettings,
    getAppTheme,
    saveAppTheme,
    updateUserStatus,
    mapUserData,
    seedDatabase,
    trackAffiliateClick
} from './services/storageService';
import { safeJsonStringify } from './lib/utils';
import { showNotification, requestNotificationPermission, getNotificationContent, listenForNewSales } from './services/notificationService';
import { auth } from './services/firebaseClient';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import IDVerification from './components/IDVerification';
import CallManager from './components/CallManager';
import FeedPage from './components/FeedPage';
import ProfilePage from './components/ProfilePage';
import ChatPage from './components/ChatPage';
import { AdCampaignPage } from './components/AdCampaignPage';
import LiveStreamViewer from './components/LiveStreamViewer';
import { StorePage } from './components/StorePage';
import StoreManagerPage from './components/StoreManagerPage';
import ReelsPage from './components/ReelsPage';
import SearchResultsPage from './components/SearchResultsPage';
import NotificationsPage from './components/NotificationsPage';
import CartModal from './components/CartModal';
import WalletModal from './components/WalletModal';
import SettingsPage from './components/SettingsPage';
import AdminDashboard from './components/AdminDashboard';
import EventsPage from './components/EventsPage';
import PurchasesPage from './components/PurchasesPage';
import AffiliatesPage from './components/AffiliatesPage';
import CreateGroupPage from './components/CreateGroupPage';
import SupportPage from './components/SupportPage';
import LegalPage from './components/LegalPage';
import MonetizationPage from './components/MonetizationPage';
import SavedPostsPage from './components/SavedPostsPage';
import BlockedUsersPage from './components/BlockedUsersPage';
import OfflinePage from './components/OfflinePage';
import LandingPage from './components/LandingPage';
import { ExclamationTriangleIcon, WifiIcon } from '@heroicons/react/24/solid';

import { DialogProvider, useDialog } from './services/DialogContext';

console.log("[BOOT] App.tsx Iniciado");


const THEME_MAP: Record<GroupTheme, { primary: string, hover: string, light: string }> = {
  blue: { primary: '#2563eb', hover: '#1d4ed8', light: '#eff6ff' },
  green: { primary: '#10b981', hover: '#059669', light: '#ecfdf5' },
  black: { primary: '#18181b', hover: '#09090b', light: '#27272a' },
  orange: { primary: '#f97316', hover: '#ea580c', light: '#fff7ed' },
  purple: { primary: '#9333ea', hover: '#7e22ce', light: '#f3e8ff' },
  red: { primary: '#dc2626', hover: '#b91c1c', light: '#fef2f2' },
  teal: { primary: '#0d9488', hover: '#0f766e', light: '#f0fdfa' },
  pink: { primary: '#db2777', hover: '#be185d', light: '#fce7f3' },
  indigo: { primary: '#4f46e5', hover: '#4338ca', light: '#eef2ff' },
  cyan: { primary: '#0891b2', hover: '#0e7490', light: '#ecfeff' }
};

const App: React.FC = () => {
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('cyberphone_theme') === 'dark');
    const [appTheme, setAppTheme] = useState<GroupTheme>(() => getAppTheme());
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>(() => {
        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get('page') as Page;
        if (pageParam) return pageParam;

        const savedPage = sessionStorage.getItem('cyberphone_last_page') as Page;
        if (savedPage && savedPage !== 'auth' && savedPage !== 'landing') return savedPage;

        const hasVisited = localStorage.getItem('cp_has_visited');
        return hasVisited ? 'auth' : 'landing';
    });
    const [pageParams, setPageParams] = useState<Record<string, string>>({});
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);
    const [walletConfig, setWalletConfig] = useState<{ isOpen: boolean, mode: 'deposit' | 'withdraw' }>({ isOpen: false, mode: 'deposit' });
    const [isLoading, setIsLoading] = useState(true); // Começar como true para garantir o splash screen
    const [initError, setInitError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true); 
    const [isOfflineModeEnabled, setIsOfflineModeEnabled] = useState(true); 
    const [guestView, setGuestView] = useState<'landing' | 'auth'>(() => {
        const hasVisited = localStorage.getItem('cp_has_visited');
        return hasVisited ? 'auth' : 'landing';
    });

    const currentUserRef = useRef<User | null>(null); // Ref para acesso estável em callbacks

    // --- NOTIFICATION MANAGER COMPONENT ---
    const NotificationManager: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
        const { showSuccess } = useDialog();
        const lastNotificationIdRef = useRef<string | null>(null);
        const lastMessageCountRef = useRef<number>(0);

        useEffect(() => {
            if (!currentUser) return;

            const pollData = async () => {
                try {
                    const userId = currentUser.id;
                    const notifications = await getNotificationsForUser(userId);
                    const sorted = notifications.sort((a, b) => b.timestamp - a.timestamp);
                    
                    if (sorted.length > 0) {
                        const latest = sorted[0];
                        const unreadCount = sorted.filter(n => !n.isRead).length;
                        setUnreadNotificationsCount(prev => prev !== unreadCount ? unreadCount : prev);

                        if (lastNotificationIdRef.current && latest.id !== lastNotificationIdRef.current && !latest.isRead) {
                            const actor = await findUserById(latest.actorId);
                            if (actor) {
                                const content = getNotificationContent(latest.type, actor.firstName, latest.groupName, latest.callType);
                                showNotification(content.title, { 
                                    body: content.body,
                                    icon: actor.profilePicture,
                                    url: window.location.origin
                                });
                            }
                        }
                        lastNotificationIdRef.current = latest.id;
                    }

                    const msgCount = await getUnreadMessagesCount(userId);
                    if (msgCount > lastMessageCountRef.current) {
                        showNotification("Nova Mensagem", {
                            body: `Você tem ${msgCount} mensagens não lidas no bupo.`,
                            url: window.location.origin
                        });
                    }
                    setUnreadMessagesCount(prev => prev !== msgCount ? msgCount : prev);
                    lastMessageCountRef.current = msgCount;
                } catch (err) {}
            };

            const pollInterval = setInterval(pollData, 15000);
            pollData();

            const unsubscribeSales = listenForNewSales(currentUser.id, (sale) => {
                const content = getNotificationContent('SALE', '', sale.productName);
                
                showNotification(content.title, {
                    body: content.body,
                    url: window.location.origin + '?page=manage-store&tab=orders'
                });

                showSuccess(`🚀 ${content.title}\n${content.body}`, {
                    title: "PARABÉNS POR SUA VENDA!"
                });
            });

            return () => {
                clearInterval(pollInterval);
                unsubscribeSales();
            };
        }, [currentUser?.id]);

        return null;
    };

    // Sincroniza o ref sempre que o state mudar
    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    // --- LÓGICA DE AFILIAÇÃO (RASTREAMENTO) ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const affiliateId = params.get('affiliateId');
        const productId = params.get('productId');
        
        if (affiliateId) {
            localStorage.setItem('cyber_referrer_id', affiliateId);
            
            // Se houver um productId, rastreia o clique específico
            if (productId) {
                trackAffiliateClick(affiliateId, productId);
            }
            
            // Limpa a URL para estética
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
        
        const page = params.get('page') as Page;
        if (page) {
            const newParams: Record<string, string> = {};
            params.forEach((value, key) => {
                if (key !== 'page' && key !== 'affiliateId') newParams[key] = value;
            });
            setCurrentPage(page);
            setPageParams(newParams);
        }
    }, []);

    // --- LÓGICA DE STATUS ONLINE (PROFISSIONAL) ---
    useEffect(() => {
        if (!currentUser) return;

        // Atualização inicial
        updateUserStatus(currentUser.id, true);

        // Heartbeat a cada 60 segundos
        const heartbeatInterval = setInterval(() => {
            updateUserStatus(currentUser.id, true);
        }, 60000);

        const handleTabClose = () => {
            updateUserStatus(currentUser.id, false);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateUserStatus(currentUser.id, true);
            }
        };

        window.addEventListener('beforeunload', handleTabClose);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(heartbeatInterval);
            window.removeEventListener('beforeunload', handleTabClose);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            // Ao desmontar (trocar de usuário ou fechar), tenta marcar como offline
            updateUserStatus(currentUser.id, false);
        };
    }, [currentUser?.id]);

    const toggleTheme = useCallback(() => {
        setDarkMode(prev => {
            const newVal = !prev;
            localStorage.setItem('cyberphone_theme', newVal ? 'dark' : 'light');
            return newVal;
        });
    }, []);

    const changeAppTheme = useCallback((newTheme: GroupTheme) => {
        setAppTheme(newTheme);
        saveAppTheme(newTheme);
    }, []);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    useEffect(() => {
        const theme = THEME_MAP[appTheme];
        document.documentElement.style.setProperty('--brand-color', theme.primary);
        document.documentElement.style.setProperty('--brand-hover', theme.hover);
        document.documentElement.style.setProperty('--brand-light', theme.light);
    }, [appTheme]);

    const syncUserProfile = useCallback(async (userId: string, authUserReference?: any) => {
        try {
            let user = await findUserById(userId, authUserReference);
            
            if (!user && authUserReference) {
                // Fallback para dados básicos se o perfil no Firestore falhar ou não existir
                console.warn("[APP] Perfil não encontrado no Firestore, usando fallback do Auth.");
                user = mapUserData(userId, null, authUserReference);
            }

            if (user) {
                setCurrentUser(prevUser => {
                    if (!prevUser) return user;

                    // Ignora diferenças triviais como lastSeen para evitar loops de heartbeat
                    const criticalFieldsChanged = 
                        prevUser.id !== user.id ||
                        prevUser.email !== user.email ||
                        prevUser.firstName !== user.firstName ||
                        prevUser.lastName !== user.lastName ||
                        prevUser.balance !== user.balance ||
                        prevUser.isMonetized !== user.isMonetized ||
                        prevUser.isAdmin !== user.isAdmin ||
                        prevUser.isVerified !== user.isVerified ||
                        prevUser.profilePicture !== user.profilePicture ||
                        prevUser.userType !== user.userType ||
                        safeJsonStringify(prevUser.followedUsers) !== safeJsonStringify(user.followedUsers) ||
                        safeJsonStringify(prevUser.followers) !== safeJsonStringify(user.followers) ||
                        safeJsonStringify(prevUser.blockedUserIds) !== safeJsonStringify(user.blockedUserIds);

                    if (!criticalFieldsChanged) return prevUser;
                    
                    const oldStr = safeJsonStringify(prevUser);
                    const newStr = safeJsonStringify(user);
                    if (oldStr === newStr) return prevUser;
                    return user;
                });
                
                updateUserStatus(user.id, true);
                setCartItems(getCart());
                
                // Seed database if admin
                const email = (user.email || '').toLowerCase().trim();
                if (email === 'ac926815124@gmail.com' || email === 'alfaajmc@gmail.com') {
                    seedDatabase().catch(err => console.error("[APP] Erro ao popular banco:", err));
                }
                
                const userNotifications = await getNotificationsForUser(user.id);
                const unreadNotifCount = userNotifications.filter(n => !n.isRead).length;
                setUnreadNotificationsCount(prev => prev !== unreadNotifCount ? unreadNotifCount : prev);
                
                const msgCount = await getUnreadMessagesCount(user.id);
                setUnreadMessagesCount(prev => prev !== msgCount ? msgCount : prev);

                requestNotificationPermission();
                return true;
            }
            return false;
        } catch (error) {
            console.error("[APP] Erro de sincronização:", safeJsonStringify(error));
            setInitError("Falha na sincronização local. Tente recarregar.");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log("[DEBUG] Configurando listener de autenticação...");
        
        // Failsafe de segurança: Se nada acontecer em 8 segundos, força a saída do loading
        const failsafe = setTimeout(() => {
            setIsLoading(current => {
               if (current) {
                   console.warn("[DEBUG] Failsafe acionado: Inicialização forçada após timeout.");
                   return false;
               }
               return false;
            });
        }, 8000);

        if (auth) {
            const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
                console.log("[DEBUG] Mudança no estado Auth:", firebaseUser ? "Logado" : "Deslogado");
                try {
                    if (firebaseUser) {
                        saveCurrentUser(firebaseUser.uid);
                        
                        try {
                            // Tenta sincronizar com timeout interno de 4s
                            const syncPromise = syncUserProfile(firebaseUser.uid, firebaseUser);
                            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 4000));
                            
                            const result = await Promise.race([syncPromise, timeoutPromise]);
                            
                            if (result === 'timeout') {
                                console.warn("[DEBUG] Timeout na sincronização. Carregando dados parciais.");
                                const tempUser = mapUserData(firebaseUser.uid, null, firebaseUser);
                                setCurrentUser(tempUser);
                            }
                        } catch (syncErr) {
                            console.error("[DEBUG] Erro na sincronização de perfil:", safeJsonStringify(syncErr));
                            const tempUser = mapUserData(firebaseUser.uid, null, firebaseUser);
                            setCurrentUser(tempUser);
                        }
                        
                        setCurrentPage(prev => (prev === 'auth' || prev === 'landing') ? 'feed' : prev);
                    } else {
                        saveCurrentUser(null);
                        setCurrentUser(null);
                        const hasVisited = localStorage.getItem('cp_has_visited');
                        setCurrentPage(hasVisited ? 'auth' : 'landing');
                    }
                } catch (fatalAuthErr) {
                    console.error("[DEBUG] Erro fatal no listener de auth:", safeJsonStringify(fatalAuthErr));
                } finally {
                    setIsLoading(false);
                    clearTimeout(failsafe);
                }
            }, (error) => {
                console.error("[DEBUG] Erro no observer do Firebase Auth:", safeJsonStringify(error));
                setIsLoading(false);
                clearTimeout(failsafe);
                setCurrentPage('auth');
            });

            return () => {
                unsubscribe();
                clearTimeout(failsafe);
            };
        } else {
            console.warn("[DEBUG] Firebase Auth ausente. Prosseguindo como guest/auth page.");
            setIsLoading(false);
            clearTimeout(failsafe);
            return () => {};
        }
    }, [syncUserProfile, auth]);

    const refreshCurrentUser = useCallback(async () => {
        const userId = auth?.currentUser?.uid || getCurrentUserId();
        if (userId) await syncUserProfile(userId, auth?.currentUser);
    }, [syncUserProfile]);

    const handleLoginSuccess = useCallback(async (user: User) => {
        setIsLoading(true);
        await syncUserProfile(user.id, auth?.currentUser);
        setIsLoading(false);
    }, [syncUserProfile]);

    const handleLogout = useCallback(async () => {
        setIsLoading(true);
        if (auth) await auth.signOut();
        saveCurrentUser(null);
        setCurrentUser(null);
        sessionStorage.removeItem('cyberphone_last_page');
        const hasVisited = localStorage.getItem('cp_has_visited');
        setCurrentPage(hasVisited ? 'auth' : 'landing');
        setIsLoading(false);
    }, []);

    const refreshUnreadMessagesCount = useCallback(async () => {
        if (!currentUser) return;
        const msgCount = await getUnreadMessagesCount(currentUser.id);
        setUnreadMessagesCount(msgCount);
    }, [currentUser]);

    const handleNavigate = useCallback((page: Page, params: Record<string, string> = {}) => {
        const u = currentUserRef.current;
        if (page === 'notifications' && u) {
            markNotificationsAsRead(u.id);
            refreshCurrentUser();
        }
        setCurrentPage(page);
        if (page !== 'auth' && page !== 'landing') {
            sessionStorage.setItem('cyberphone_last_page', page);
        }
        setPageParams(params);
        setIsMenuOpen(false);
        window.scrollTo(0, 0);
    }, [refreshCurrentUser]);

    // --- LÓGICA DE DETECÇÃO DE CONEXÃO ---
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsOfflineModeEnabled(false);
            // Ao voltar online, tenta sincronizar dados se houver usuário
            if (currentUser) refreshCurrentUser();
        };
        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [currentUser, refreshCurrentUser]);

    function renderPage() {
        // PERMITIR PÁGINAS PÚBLICAS MESMO SEM USUÁRIO
        if (currentPage === 'terms') return <LegalPage type="terms" onBack={() => handleNavigate(currentUser ? 'settings' : (guestView === 'auth' ? 'auth' : 'landing' as any))} />;
        if (currentPage === 'privacy') return <LegalPage type="privacy" onBack={() => handleNavigate(currentUser ? 'settings' : (guestView === 'auth' ? 'auth' : 'landing' as any))} />;
        if (currentPage === 'support') return <SupportPage currentUser={currentUser || { id: 'public' } as User} onNavigate={handleNavigate} />;

        if (!currentUser) {
            if (guestView === 'landing' && currentPage !== 'auth') {
                return <LandingPage 
                    currentUser={currentUser}
                    onGoToAuth={() => {
                        localStorage.setItem('cp_has_visited', 'true');
                        setGuestView('auth');
                        setCurrentPage('auth');
                    }} 
                    onNavigate={handleNavigate}
                    refreshUser={refreshCurrentUser}
                    onAddToCart={(pid: string, qty: number, color?: string, aff?: string) => {
                        addToCart(pid, qty, color, aff || pageParams.affiliateId);
                        setCartItems(getCart());
                    }}
                    onOpenCart={() => setIsCartModalOpen(true)}
                />;
            }
            return <AuthPage onLoginSuccess={(user) => {
                localStorage.setItem('cp_has_visited', 'true');
                handleLoginSuccess(user);
            }} onNavigate={(p) => handleNavigate(p)} />;
        }
        
        // NOVO: Fluxo de Verificação de ID Obrigatório para novos usuários, pendentes ou expirados
        const isExpired = currentUser.idVerificationDocs?.expiresAt && currentUser.idVerificationDocs.expiresAt < Date.now();
        const verificationIncomplete = currentUser.idVerificationStatus !== 'APPROVED' || !currentUser.documentId;
        
        if ((verificationIncomplete || isExpired) && !currentUser.isAdmin) {
            return (
                <IDVerification 
                  user={currentUser} 
                  onComplete={refreshCurrentUser} 
                  onLogout={handleLogout} 
                  forceUpdate={!!isExpired} 
                />
            );
        }

        switch (currentPage) {
            case 'feed': return <FeedPage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
            case 'profile': return <ProfilePage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} userId={pageParams.userId} onOpenWallet={(mode) => setWalletConfig({ isOpen: true, mode })} />;
            case 'chat': return <ChatPage currentUser={currentUser} onNavigate={handleNavigate} params={pageParams} onMessagesRead={refreshUnreadMessagesCount} refreshUser={refreshCurrentUser} />;
            case 'create-group': return <CreateGroupPage currentUser={currentUser} onNavigate={handleNavigate} />;
            case 'reels-page': return <ReelsPage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} startPostId={pageParams.startPostId} />;
            case 'search-results': return <SearchResultsPage currentUser={currentUser} query={pageParams.query} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
            case 'notifications': return <NotificationsPage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
            case 'live': return <LiveStreamViewer currentUser={currentUser} postId={pageParams.postId} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
            case 'settings': return <SettingsPage 
              currentUser={currentUser} 
              onNavigate={handleNavigate} 
              darkMode={darkMode} 
              toggleTheme={toggleTheme} 
              refreshUser={refreshCurrentUser} 
              onLogout={handleLogout} 
              onDeleteAccount={handleLogout} 
              appTheme={appTheme} 
              onThemeChange={changeAppTheme} 
            />;
            case 'store': return <StorePage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} storeId={pageParams.storeId} productId={pageParams.productId} affiliateId={pageParams.affiliateId} onAddToCart={(pid: string, qty: number, color?: string, aff?: string) => {
                addToCart(pid, qty, color, aff || pageParams.affiliateId);
                setCartItems(getCart());
            }} onOpenCart={() => setIsCartModalOpen(true)} />;
            case 'monetization': return <MonetizationPage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
            case 'saved': return <SavedPostsPage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
            case 'manage-store': return <StoreManagerPage currentUser={currentUser} refreshUser={refreshCurrentUser} onNavigate={handleNavigate} params={pageParams} />;
            case 'admin': return <AdminDashboard currentUser={currentUser} onNavigate={handleNavigate} onRefreshUser={refreshCurrentUser} />;
            case 'events': return <EventsPage currentUser={currentUser} />;
            case 'purchases': return <PurchasesPage currentUser={currentUser} onNavigate={handleNavigate} />;
            case 'affiliates': return <AffiliatesPage currentUser={currentUser} onNavigate={handleNavigate} />;
            case 'ads': return <AdCampaignPage currentUser={currentUser} refreshUser={refreshCurrentUser} onNavigate={handleNavigate} />;
            case 'blocked-users': return <BlockedUsersPage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
            default: return <FeedPage currentUser={currentUser} onNavigate={handleNavigate} refreshUser={refreshCurrentUser} />;
        }
    }

    function renderContent() {
        if (isLoading) {
            return (
                <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0c10] p-6">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                            onClick={() => setIsLoading(false)}
                            className="text-[8px] font-black uppercase text-gray-400 hover:text-blue-600 transition-colors"
                        >
                            Pular Carregamento
                        </button>
                        <button 
                            onClick={() => { localStorage.clear(); window.location.reload(); }}
                            className="text-[8px] font-black uppercase text-red-400 hover:text-red-600 transition-colors"
                        >
                            Resetar Cache
                        </button>
                    </div>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-6 shadow-[0_0_15px_rgba(37,99,235,0.3)]"></div>
                    <div className="flex flex-col items-center gap-2">
                       <h1 className="text-xl font-black uppercase text-gray-900 dark:text-white tracking-tighter">CyBerPhone</h1>
                       <p className="text-[9px] font-bold uppercase text-gray-400 tracking-[0.3em] animate-pulse">A inicializar o CyBerPhone 1.0.0</p>
                    </div>
                    <div className="mt-8 text-[8px] text-gray-400 uppercase font-medium">
                        Se demorar mais de 10 segundos, tente Resetar o Cache.
                    </div>
                </div>
            );
        }

        if (!isOnline && !isOfflineModeEnabled) {
            return <OfflinePage 
              onRetry={() => {
                if (navigator.onLine) {
                    setIsOnline(true);
                    setIsOfflineModeEnabled(false);
                    if (currentUser) refreshCurrentUser();
                }
              }} 
              onContinueOffline={() => setIsOfflineModeEnabled(true)}
            />;
        }

        if (initError) {
            return (
                <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-[#0a0c10] p-6 text-center">
                    <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-6" />
                    <h2 className="text-2xl font-black uppercase mb-2 text-gray-900 dark:text-white">Erro de Inicialização</h2>
                    <p className="text-gray-500 text-sm mb-8 font-medium">{initError}</p>
                    <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Recarregar App</button>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0a0c10] text-gray-900 dark:text-gray-100 transition-colors duration-300">
                {!isOnline && isOfflineModeEnabled && (
                    <div className="bg-orange-500 text-white text-[10px] font-black py-2 px-4 flex items-center justify-between fixed top-0 left-0 w-full z-[1000] animate-pulse uppercase tracking-widest shadow-xl">
                        <div className="flex items-center gap-2">
                            <WifiIcon className="h-4 w-4" />
                            <span>Modo Offline: Usando dados locais de cache</span>
                        </div>
                        <button onClick={() => window.location.reload()} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-all">Reconectar</button>
                    </div>
                )}
                {currentUser && currentPage !== 'admin' && (
                    <Header 
                      currentUser={currentUser} 
                      onNavigate={handleNavigate} 
                      unreadNotificationsCount={unreadNotificationsCount} 
                      cartItemCount={cartItems.length} 
                      onOpenCart={() => setIsCartModalOpen(true)} 
                      onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
                    />
                )}
                <div className="flex flex-1 relative w-full items-stretch">
                    {currentUser && currentPage !== 'admin' && (
                      <Footer 
                        currentUser={currentUser} 
                        onNavigate={handleNavigate} 
                        activePage={currentPage} 
                        onLogout={handleLogout} 
                        isMenuOpen={isMenuOpen}
                        onCloseMenu={() => setIsMenuOpen(false)}
                        unreadMessagesCount={unreadMessagesCount}
                      />
                    )}
                    <main className={`flex-grow w-full ${currentUser && currentPage !== 'admin' ? 'pt-[64px] md:pt-[72px] pb-[80px] md:pb-8 md:ml-64 px-0 md:px-8' : ''} transition-all overflow-x-hidden`}>
                        <div className={`w-full ${currentUser ? 'max-w-7xl mx-auto min-h-[calc(100vh-140px)]' : 'h-full'}`}>
                            {renderPage()}
                        </div>
                    </main>
                </div>
                {currentUser && (
                  <>
                    <CartModal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} currentUser={currentUser} onCartUpdate={() => setCartItems(getCart())} refreshUser={refreshCurrentUser} />
                    <WalletModal isOpen={walletConfig.isOpen} mode={walletConfig.mode} onClose={() => setWalletConfig({ ...walletConfig, isOpen: false })} currentUser={currentUser} refreshUser={refreshCurrentUser} />
                  </>
                )}
            </div>
        );
    }

    return (
        <DialogProvider>
            <NotificationManager currentUser={currentUser} />
            <CallManager currentUser={currentUser} />
            {renderContent()}
        </DialogProvider>
    );
};

export default App;
