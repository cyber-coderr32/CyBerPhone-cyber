import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, Post, Product, AdCampaign, Transaction, 
  ContentReport, OrderStatus, GlobalSettings, TransactionType, Store, PostType, SystemLog, Page,
  SupportTicket, SupportMessage, AffiliateSale
} from '../types';
import { 
  getUsers, getPlatformRevenue, getPosts, getProducts, getAds,
  getTransactions, getSystemLogs, getReports, getGlobalSettings,
  adminUpdateUser, adminDeletePost, adminProcessReport, adminDeleteProduct,
  updateGlobalSettings, updateUserBalance, getStores, deleteUser,
  getAdminSupportTickets, addSupportMessage, resolveSupportTicket, uploadFile,
  subscribeToAdminSupportTickets, claimSupportTicket, getDisputedSales, confirmProductReceipt, cancelPurchaseAndRefund
} from '../services/storageService';
import { safeJsonStringify } from '../lib/utils';
import { 
  BanknotesIcon, UserGroupIcon, ShieldCheckIcon, TrashIcon, 
  CheckBadgeIcon, ChartPieIcon, MagnifyingGlassIcon, CurrencyDollarIcon, 
  MegaphoneIcon, NoSymbolIcon, 
  Cog6ToothIcon, GlobeAltIcon, 
  CommandLineIcon, ArrowPathIcon, 
  ClockIcon, Bars3Icon, XMarkIcon, IdentificationIcon, CheckCircleIcon,
  ArrowLeftOnRectangleIcon,
  ShieldExclamationIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  DocumentMagnifyingGlassIcon,
  ReceiptPercentIcon,
  WrenchScrewdriverIcon,
  NewspaperIcon,
  BuildingStorefrontIcon,
  TagIcon,
  VideoCameraIcon,
  PhotoIcon,
  DocumentTextIcon,
  UserMinusIcon,
  LifebuoyIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  DocumentIcon
} from '@heroicons/react/24/solid';
import Logo from './Logo';
import { useDialog } from '../services/DialogContext';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { getAoaExchangeRate } from '../services/currencyService';
import { monetizationService } from '../services/monetizationService';

type AdminTab = 'dashboard' | 'users' | 'posts' | 'stores' | 'products' | 'moderation' | 'finance' | 'config' | 'support' | 'verifications' | 'monetization' | 'disputes' | 'ads';

interface AdminDashboardProps {
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  onRefreshUser: () => void;
}

interface DashboardData {
  users: User[];
  posts: Post[];
  products: Product[];
  stores: Store[];
  ads: AdCampaign[];
  transactions: Transaction[];
  reports: ContentReport[];
  logs: SystemLog[];
  tickets: SupportTicket[];
  disputes: AffiliateSale[];
  revenue: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onNavigate, onRefreshUser }) => {
  const { showAlert, showConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [settings, setSettings] = useState<GlobalSettings>({ 
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
    positioningMinBid: 1
  });
  
  const [data, setData] = useState<DashboardData>({
    users: [], posts: [], products: [], stores: [], ads: [], transactions: [], reports: [], logs: [], tickets: [], disputes: [], revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(930);
  
  useEffect(() => {
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchRate();
  }, []);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatFile, setChatFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'support') {
      const unsubscribe = subscribeToAdminSupportTickets(currentUser.id, (tickets) => {
        setData(prev => ({
          ...prev,
          tickets: tickets.sort((a, b) => b.updatedAt - a.updatedAt)
        }));
        if (currentTicket) {
          const updated = tickets.find(t => t.id === currentTicket.id);
          if (updated) setCurrentTicket(updated);
        }
      });
      return () => unsubscribe();
    }
  }, [activeTab, currentTicket?.id, currentUser.id]);

  useEffect(() => {
    if (activeTab === 'support' && currentTicket) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTicket?.messages, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Individual safe fetches to prevent one failure from blocking all data
      const safeFetch = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await promise;
        } catch (err) {
          console.warn(`[ADMIN] Partial fetch failure:`, err);
          return fallback;
        }
      };

      const [users, posts, products, stores, ads, transactions, reports, logs, revenue, globalSettings, tickets, disputes] = await Promise.all([
        safeFetch(getUsers(currentUser), []),
        safeFetch(getPosts(), []),
        safeFetch(getProducts(), []),
        safeFetch(getStores(), []),
        safeFetch(getAds(), []),
        safeFetch(getTransactions(undefined, currentUser), []),
        safeFetch(getReports(), []),
        safeFetch(getSystemLogs(), []),
        safeFetch(getPlatformRevenue(), 0),
        safeFetch(getGlobalSettings(), settings),
        safeFetch(getAdminSupportTickets(currentUser.id), []),
        safeFetch(getDisputedSales(), [])
      ]);

      setData({
        users,
        posts,
        products,
        stores,
        ads,
        transactions: transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
        reports: reports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
        logs: logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
        tickets: tickets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
        disputes: disputes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
        revenue
      });
      setSettings(globalSettings);
    } catch (error) {
      console.error("Erro crítico ao carregar dados do admin:", safeJsonStringify(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const refresh = () => {
    onRefreshUser();
    fetchData();
  };

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'users':
        return data.users.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
      case 'verifications':
        return data.users.filter(u => u.idVerificationStatus !== 'NOT_STARTED' && (`${u.firstName} ${u.lastName}`.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
      case 'monetization':
        return data.users.filter(u => (u.monetizationStatus === 'PENDING' || u.isMonetized) && (`${u.firstName} ${u.lastName}`.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
      case 'ads':
        return data.ads.filter(a => a.name?.toLowerCase().includes(term) || a.professorName?.toLowerCase().includes(term));
      case 'disputes':
        return data.disputes.filter(d => d.id.includes(term) || d.buyerId.includes(term));
      case 'posts':
        return data.posts.filter(p => p.authorName.toLowerCase().includes(term) || (p.content?.toLowerCase().includes(term)));
      case 'products':
        return data.products.filter(p => p.name.toLowerCase().includes(term));
      case 'stores':
        return data.stores.filter(s => s.name.toLowerCase().includes(term));
      case 'moderation':
        return data.reports.filter(r => r.status === 'OPEN' && (r.reason.toLowerCase().includes(term) || r.targetId.includes(term)));
      default:
        return [];
    }
  }, [data, searchTerm, activeTab]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    // For tabs that don't use filteredData directly (like transactions or logs)
    if (activeTab === 'finance') return data.transactions.slice(start, end);
    if (activeTab === 'dashboard') return []; // Dashboard doesn't need pagination for the overview
    
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, activeTab, data.transactions]);

  const totalPages = useMemo(() => {
    let totalItems = 0;
    if (activeTab === 'finance') totalItems = data.transactions.length;
    else totalItems = filteredData.length;
    
    return Math.ceil(totalItems / itemsPerPage);
  }, [filteredData.length, data.transactions.length, activeTab]);

  const Pagination: React.FC = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-center gap-2 mt-8 py-4 px-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 rotate-180" />
        </button>
        
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            // Center the pagination if pages > 5
            if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
            }
            if (pageNum <= 0) return null;
            if (pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
        </button>
        
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">
          Página {currentPage} de {totalPages}
        </span>
      </div>
    );
  };

  const handleToggleAdmin = async (user: User) => {
    if (currentUser.email !== 'alfaajmc@gmail.com') {
      showAlert("Apenas o Administrador Master pode gerenciar privilégios Root.", { type: 'alert' });
      return;
    }
    const confirmed = await showConfirm(user.isAdmin ? `REBAIXAMENTO: Remover privilégios ROOT de ${user.firstName}?` : `PROMOÇÃO: Tornar ${user.firstName} Administrador ROOT?`, {
       title: 'Gestão de Privilégios',
       type: 'alert'
    });
    if (confirmed) {
      await adminUpdateUser({ ...user, isAdmin: !user.isAdmin });
      refresh();
    }
  };

  const handleToggleVerification = async (user: User) => {
    await adminUpdateUser({ ...user, isVerified: !user.isVerified });
    refresh();
  };

  const handleToggleSuspension = async (user: User) => {
    await adminUpdateUser({ ...user, isSuspended: !user.isSuspended });
    refresh();
  };

  const handleDeleteUser = async (uId: string) => {
    if (await showConfirm("REMOÇÃO PERMANENTE: Confirmar exclusão deste membro?", { type: 'alert', title: 'Atenção' })) {
      await deleteUser(uId);
      refresh();
    }
  };

  const handleUpdateBalance = async (uId: string) => {
    const val = prompt("Ajustar saldo (USD):", "0");
    if (val && !isNaN(parseFloat(val))) {
      await updateUserBalance(uId, parseFloat(val));
      refresh();
    }
  };

  const handleDeletePost = async (pId: string) => {
    if (await showConfirm("Remover esta publicação?")) {
      await adminDeletePost(pId);
      refresh();
    }
  };

  const handleDeleteProduct = async (pId: string) => {
    if (await showConfirm("Banir este produto?")) {
      await adminDeleteProduct(pId);
      refresh();
    }
  };

  const handleProcessReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    await adminProcessReport(reportId, status, currentUser.id);
    refresh();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateGlobalSettings(settings);
      refresh();
      showAlert("Parâmetros Root salvos.", { type: 'success' });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      showAlert("Erro ao salvar parâmetros.", { type: 'alert' });
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: AdminTab, icon: any, label: string }) => {
    let badgeCount = 0;
    if (id === 'support') {
      badgeCount = data.tickets.filter(t => t.status === 'OPEN' && (!t.assignedAdminId || t.assignedAdminId === currentUser.id)).length;
    } else if (id === 'verifications') {
      badgeCount = data.users.filter(u => u.idVerificationStatus !== 'NOT_STARTED').length;
    } else if (id === 'monetization') {
      badgeCount = data.users.filter(u => u.monetizationStatus === 'PENDING').length;
    } else if (id === 'disputes') {
      badgeCount = data.disputes.length;
    }
    
    return (
      <button 
        onClick={() => { setActiveTab(id); setSearchTerm(''); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 relative ${activeTab === id ? 'bg-blue-600 text-white shadow-lg scale-105 rounded-2xl' : 'text-gray-400 hover:text-white'}`}
      >
        <div className="relative">
          <Icon className="h-5 w-5" />
          {badgeCount > 0 && (
             <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75"></span>
          )}
        </div>
        <span className="font-black text-[11px] uppercase tracking-widest flex-1 text-left">{label}</span>
        {badgeCount > 0 && (
          <span className="bg-red-600 text-[9px] font-black px-2.5 py-1 rounded-lg shadow-lg animate-bounce">
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  const getPostIcon = (type: PostType) => {
    switch(type) {
      case PostType.IMAGE: return <PhotoIcon className="h-4 w-4 text-purple-400" />;
      case PostType.LIVE: return <VideoCameraIcon className="h-4 w-4 text-red-500" />;
      default: return <DocumentTextIcon className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#080a0f] text-white flex flex-col md:flex-row font-sans z-[9999] overflow-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[505] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[510] w-72 bg-[#0d1117] border-r border-white/5 flex flex-col p-6 transition-transform duration-300 lg:sticky lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="flex items-center justify-between mb-12">
            <Logo size="md" variant="white" className="cursor-pointer" onClick={() => onNavigate('feed')} />
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"><XMarkIcon className="h-7 w-7" /></button>
         </div>
         <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
            <SidebarItem id="dashboard" icon={ChartPieIcon} label="Monitoramento" />
            <SidebarItem id="users" icon={UserGroupIcon} label="Membros" />
            <SidebarItem id="posts" icon={NewspaperIcon} label="Publicações" />
            <SidebarItem id="stores" icon={BuildingStorefrontIcon} label="Lojas" />
            <SidebarItem id="products" icon={ShoppingBagIcon} label="Produtos" />
            <SidebarItem id="moderation" icon={ShieldExclamationIcon} label="Denúncias" />
            <SidebarItem id="support" icon={LifebuoyIcon} label="Suporte" />
            <SidebarItem id="monetization" icon={BanknotesIcon} label="Monetização" />
            <SidebarItem id="ads" icon={MegaphoneIcon} label="Campanhas" />
            <SidebarItem id="disputes" icon={ShieldExclamationIcon} label="Disputas" />
            <SidebarItem id="verifications" icon={IdentificationIcon} label="Verificações" />
            <SidebarItem id="finance" icon={BanknotesIcon} label="Tesouraria" />
            {currentUser.email === 'alfaajmc@gmail.com' && (
              <SidebarItem id="config" icon={WrenchScrewdriverIcon} label="Config Root" />
            )}
         </nav>
         <div className="mt-10 pt-10 border-t border-white/5">
            <button onClick={() => onNavigate('feed')} className="w-full flex items-center gap-4 px-6 py-4 text-gray-400 hover:text-white transition-all bg-white/5 rounded-2xl active:scale-95">
               <ArrowLeftOnRectangleIcon className="h-5 w-5" />
               <span className="font-black text-[10px] uppercase tracking-widest">Sair do Root</span>
            </button>
         </div>
      </aside>

      <main className="flex-1 p-4 lg:p-12 overflow-y-auto h-screen custom-scrollbar relative bg-[#080a0f]">
         <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
            <div className="flex items-center gap-5">
               <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-4 bg-white/5 border border-white/10 rounded-[1.4rem] text-gray-400 active:scale-90 transition-all shadow-xl"
               >
                 <Bars3Icon className="h-8 w-8" />
               </button>
               <div>
                  <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">{activeTab}</h2>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">Protocolo Root Ativo <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span></p>
               </div>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
               <div className="relative flex-1 lg:w-80">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" placeholder="Filtrar dados..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 w-full transition-all text-white"/>
               </div>
               <button onClick={refresh} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 shadow-xl"><ArrowPathIcon className="h-6 w-6 text-gray-400" /></button>
            </div>
         </header>

         {loading ? (
            <div className="flex flex-col items-center justify-center h-[50vh]">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Carregando Sistema Root...</p>
            </div>
         ) : (
           <>
             {activeTab === 'dashboard' && (
               <div className="space-y-12 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
               {[
                 { label: 'Receita Total', val: `$${data.revenue.toFixed(2)}`, subVal: `≈ ${(data.revenue * exchangeRate).toLocaleString()} KZ`, color: 'text-green-500', icon: BanknotesIcon },
                 { label: 'Usuários Ativos', val: data.users.length, color: 'text-blue-500', icon: UserGroupIcon },
                 { label: 'Tickets Suporte', val: data.tickets.filter(t => t.status === 'OPEN').length, color: 'text-red-500', icon: LifebuoyIcon, highlight: data.tickets.some(t => t.status === 'OPEN') },
                 { label: 'Publicações', val: data.posts.length, color: 'text-purple-500', icon: NewspaperIcon },
                 { label: 'Documentos', val: data.users.filter(u => u.idVerificationStatus !== 'NOT_STARTED').length, color: 'text-yellow-500', icon: IdentificationIcon }
               ].map(s => (
                 <div 
                   key={s.label} 
                   onClick={() => s.label === 'Tickets Suporte' && setActiveTab('support')}
                   className={`bg-[#12161f] p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border ${s.highlight ? 'border-red-500/30' : 'border-white/5'} shadow-2xl overflow-hidden group cursor-pointer hover:bg-white/5 transition-all`}
                 >
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.label}</p>
                       <s.icon className={`h-4 w-4 ${s.highlight ? 'text-red-500 animate-pulse' : 'text-white/20'}`} />
                    </div>
                    <p className={`text-xl md:text-4xl font-black tracking-tighter ${s.color}`}>{s.val}</p>
                    {s.subVal && <p className="text-[10px] font-black text-green-600 uppercase mt-1">{s.subVal}</p>}
                    {s.highlight && <p className="text-[8px] font-black text-red-500 uppercase mt-2">Ação Requerida</p>}
                 </div>
               ))}
            </div>
                  <div className="bg-[#12161f] p-10 rounded-[3rem] border border-white/5 shadow-inner">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3 text-blue-500">
                        <CommandLineIcon className="h-5 w-5" /> Auditoria Root (Últimos 10)
                     </h3>
                     <div className="space-y-4">
                        {data.logs.length === 0 ? <p className="text-gray-600 text-xs">Nenhum log registrado.</p> : data.logs.slice(0, 10).map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl font-black text-[8px] uppercase">{log.action}</div>
                                    <p className="text-xs font-medium text-gray-300">{log.details}</p>
                                </div>
                                <span className="text-[9px] font-bold text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))}
                     </div>
                  </div>
               </div>
             )}

             {activeTab === 'users' && (
                <div className="space-y-6 animate-fade-in">
                   {/* Mobile View: Cards */}
                   <div className="grid grid-cols-1 gap-4 md:hidden">
                      {filteredData.map((user: any) => (
                         <div key={user.id} className={`bg-[#12161f] p-6 rounded-[2rem] border border-white/5 shadow-xl ${user.isSuspended ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-4 mb-6">
                               <div className="relative">
                                  <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10" />
                                  {user.isVerified && (
                                     <div className="absolute -top-2 -right-2 bg-blue-600 p-1 rounded-lg border-2 border-[#12161f]">
                                        <CheckBadgeIcon className="h-4 w-4 text-white" />
                                     </div>
                                  )}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                     <p className="font-black text-sm text-gray-100 uppercase tracking-tighter truncate">{user.firstName} {user.lastName}</p>
                                  </div>
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">{user.email}</p>
                                  <div className="mt-2 flex gap-2">
                                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${user.isAdmin ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'}`}>
                                        {user.isAdmin ? 'Admin Root' : 'Membro'}
                                     </span>
                                  </div>
                               </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-6 border-t border-white/5">
                               <button 
                                 onClick={() => handleUpdateBalance(user.id)} 
                                 className="flex-1 bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 text-center"
                               >
                                  <p className="font-black text-lg text-emerald-400 tracking-tighter">${(user.balance || 0).toFixed(2)}</p>
                                  <p className="text-[8px] font-black text-green-500 uppercase">≈ {((user.balance || 0) * exchangeRate).toLocaleString()} KZ</p>
                               </button>

                               <div className="flex gap-2">
                                  {currentUser.email === 'alfaajmc@gmail.com' && (
                                     <button onClick={() => handleToggleAdmin(user)} className={`p-3 rounded-xl border-2 active:scale-90 transition-all ${user.isAdmin ? 'bg-purple-600 border-purple-400 text-white' : 'bg-[#1a1e26] border-white/5 text-gray-500 hover:text-purple-400 hover:border-purple-500/30'}`}>
                                        <ShieldCheckIcon className="h-5 w-5" />
                                     </button>
                                  )}
                                  <button onClick={() => handleDeleteUser(user.id)} className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:bg-red-600 hover:text-white">
                                     <TrashIcon className="h-5 w-5" />
                                  </button>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>

                   {/* Desktop View: Table */}
                   <div className="hidden md:block bg-[#12161f] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
                      <div className="overflow-x-auto">
                         <table className="w-full text-left border-collapse">
                            <thead className="bg-black/40">
                               <tr className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 border-b border-white/5">
                                  <th className="px-8 py-7">Identidade do Membro</th>
                                  <th className="px-8 py-7">Financeiro (USD)</th>
                                  <th className="px-8 py-7 text-right">Ações de Controle</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                               {(pagedData as User[]).map((user: User) => (
                                  <tr key={user.id} className={`group transition-colors hover:bg-white/[0.02] ${user.isSuspended ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                     <td className="px-8 py-6">
                                        <div className="flex items-center gap-5 min-w-[280px]">
                                           <div className="relative">
                                              <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-14 h-14 rounded-[1.4rem] object-cover border-2 border-white/10 shadow-2xl" />
                                              {user.isVerified && (
                                                 <div className="absolute -top-2 -right-2 bg-blue-600 p-1 rounded-lg border-2 border-[#12161f] shadow-lg">
                                                    <CheckBadgeIcon className="h-4 w-4 text-white" />
                                                 </div>
                                              )}
                                           </div>
                                           <div>
                                              <div className="flex items-center gap-2">
                                                 <p className="font-black text-sm text-gray-100 uppercase tracking-tighter truncate max-w-[150px]">{user.firstName} {user.lastName}</p>
                                                 <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${user.isAdmin ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'}`}>
                                                    {user.isAdmin ? 'Admin Root' : 'Membro'}
                                                 </span>
                                              </div>
                                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{user.email}</p>
                                              {user.isSuspended && <p className="text-[8px] font-black text-red-500 uppercase mt-1">Sessão Bloqueada</p>}
                                           </div>
                                        </div>
                                     </td>
                                     <td className="px-8 py-6">
                                        <button 
                                         onClick={() => handleUpdateBalance(user.id)} 
                                         className="group/bal bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl px-6 py-4 transition-all flex flex-col items-center min-w-[140px] shadow-inner"
                                        >
                                           <p className="font-black text-xl text-emerald-400 tracking-tighter group-hover/bal:scale-110 transition-transform">${(user.balance || 0).toFixed(2)}</p>
                                           <p className="text-[10px] font-black text-green-500 uppercase">≈ {((user.balance || 0) * exchangeRate).toLocaleString()} KZ</p>
                                           <div className="flex items-center gap-1 mt-1">
                                              <CurrencyDollarIcon className="h-3 w-3 text-emerald-500/60" />
                                              <p className="text-[8px] font-black uppercase text-emerald-500/60">Ajustar Saldo</p>
                                           </div>
                                        </button>
                                     </td>
                                     <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3 min-w-[200px]">
                                           {currentUser.email === 'alfaajmc@gmail.com' && (
                                              <button 
                                                onClick={() => handleToggleAdmin(user)} 
                                                title={user.isAdmin ? "Remover Privilégio Admin" : "Tornar Administrador"}
                                                className={`p-3.5 rounded-2xl transition-all border-2 active:scale-90 ${user.isAdmin ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]' : 'bg-[#1a1e26] border-white/5 text-gray-500 hover:text-purple-400 hover:border-purple-500/30'}`}
                                              >
                                                 <ShieldCheckIcon className="h-6 w-6" />
                                              </button>
                                           )}
                                           <button 
                                             onClick={() => handleToggleVerification(user)} 
                                             title={user.isVerified ? "Remover Verificado" : "Tornar Verificado"}
                                             className={`p-3.5 rounded-2xl transition-all border-2 active:scale-90 ${user.isVerified ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-[#1a1e26] border-white/5 text-gray-500 hover:text-blue-400 hover:border-blue-500/30'}`}
                                           >
                                              <CheckBadgeIcon className="h-6 w-6" />
                                           </button>

                                           <button 
                                             onClick={() => handleToggleSuspension(user)} 
                                             title={user.isSuspended ? "Reativar Usuário" : "Suspender Usuário"}
                                             className={`p-3.5 rounded-2xl transition-all border-2 active:scale-90 ${user.isSuspended ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-[#1a1e26] border-white/5 text-gray-500 hover:text-orange-400 hover:border-orange-500/30'}`}
                                           >
                                              <NoSymbolIcon className="h-6 w-6" />
                                           </button>

                                           <button 
                                             onClick={() => handleDeleteUser(user.id)} 
                                             title="Remover Cadastro"
                                             className="p-3.5 rounded-2xl bg-[#1a1e26] border-2 border-white/5 text-gray-500 hover:bg-red-600 hover:border-red-400 hover:text-white transition-all shadow-xl active:scale-90"
                                           >
                                              <TrashIcon className="h-6 w-6" />
                                           </button>
                                        </div>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                   {filteredData.length === 0 && (
                      <div className="p-32 text-center">
                         <UserGroupIcon className="h-16 w-16 text-white/5 mx-auto mb-6" />
                         <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Nenhum membro encontrado com estes critérios</p>
                      </div>
                   )}
                </div>
              )}

              {activeTab === 'verifications' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {(pagedData as User[]).map((user: User) => (
                          <div key={user.id} className="bg-[#12161f] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                             <div className="flex items-center gap-4">
                                <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-12 h-12 rounded-xl object-cover" />
                                <div>
                                   <h4 className="font-black text-sm uppercase">{user.firstName} {user.lastName}</h4>
                                   <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{user.email}</p>
                                </div>
                             </div>

                             <div className="grid grid-cols-3 gap-2">
                                {user.idVerificationDocs?.frontUrl && (
                                   <button 
                                     onClick={() => window.open(user.idVerificationDocs!.frontUrl, '_blank')}
                                     className="aspect-square bg-white/5 rounded-xl border border-white/10 overflow-hidden group relative"
                                   >
                                      <img src={user.idVerificationDocs.frontUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter shadow-lg">Frente</span>
                                   </button>
                                )}
                                {user.idVerificationDocs?.backUrl && (
                                   <button 
                                     onClick={() => window.open(user.idVerificationDocs!.backUrl, '_blank')}
                                     className="aspect-square bg-white/5 rounded-xl border border-white/10 overflow-hidden group relative"
                                   >
                                      <img src={user.idVerificationDocs.backUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter shadow-lg">Verso</span>
                                   </button>
                                )}
                                {user.idVerificationDocs?.selfieUrl && (
                                   <button 
                                     onClick={() => window.open(user.idVerificationDocs!.selfieUrl, '_blank')}
                                     className="aspect-square bg-white/5 rounded-xl border border-white/10 overflow-hidden group relative"
                                   >
                                      <img src={user.idVerificationDocs.selfieUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter shadow-lg">Selfie</span>
                                   </button>
                                )}
                             </div>

                              <div className="flex gap-2">
                                 <div className="flex-1 bg-white/5 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest text-center text-gray-500 border border-white/5">
                                    Verificação Automática
                                 </div>
                                 <div className={`px-4 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest ${user.idVerificationStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : user.idVerificationStatus === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                    {user.idVerificationStatus}
                                 </div>
                              </div>
                          </div>
                       ))}
                    </div>

                    {filteredData.length === 0 && (
                       <div className="p-20 text-center">
                          <CheckCircleIcon className="h-16 w-16 text-brand/10 mx-auto mb-6" />
                          <p className="text-gray-500 font-black uppercase text-xs tracking-widest leading-loose">Nenhuma verificação pendente no momento.<br/>A rede está segura.</p>
                       </div>
                    )}
                    <Pagination />
                 </div>
              )}

              {activeTab === 'monetization' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {(pagedData as User[]).map((user: User) => (
                          <div key={user.id} className="bg-[#12161f] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                             <div className="flex items-center gap-4">
                                <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-12 h-12 rounded-xl object-cover" />
                                <div>
                                   <h4 className="font-black text-sm uppercase">{user.firstName} {user.lastName}</h4>
                                   <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{user.email}</p>
                                </div>
                             </div>

                             <div className="space-y-4">
                               <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                                 <span>Seguidores</span>
                                 <span className="text-white">{user.followers?.length || 0} / {user.monetizationGoals?.followersGoal}</span>
                               </div>
                               <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                                 <span>Horas de Vídeo</span>
                                 <span className="text-white">{user.monetizationGoals?.currentWatchHours?.toFixed(1) || 0} / {user.monetizationGoals?.watchHoursGoal}</span>
                               </div>
                               <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                                 <span>Views Reels</span>
                                 <span className="text-white">{user.monetizationGoals?.currentShortsViews || 0} / {user.monetizationGoals?.shortsViewsGoal}</span>
                               </div>
                             </div>

                             <div className="flex gap-2">
                                {user.monetizationStatus === 'PENDING' ? (
                                  <button 
                                    onClick={async () => {
                                      if(await showConfirm(`Aprovar monetização para ${user.firstName}?`)) {
                                         await adminUpdateUser({ 
                                            ...user, 
                                            monetizationStatus: 'APPROVED',
                                            isMonetized: true
                                         });
                                         refresh();
                                      }
                                    }}
                                    className="flex-1 bg-green-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-700 active:scale-95 transition-all text-white"
                                  >
                                     Aprovar Parceiro
                                  </button>
                                ) : (
                                  <div className="flex-1 flex gap-2">
                                     <div className="flex-1 bg-green-600/10 text-green-500 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest text-center flex items-center justify-center">
                                        Parceiro Ativo
                                     </div>
                                     <button 
                                       onClick={async () => {
                                         if(await showConfirm(`Aplicar STRIKE em ${user.firstName}? Isso pode levar à desmonetização.`)) {
                                            await monetizationService.issueStrike(user.id, "Violação de termos", 'YELLOW');
                                            showAlert("Strike aplicado!", { type: 'success' });
                                            refresh();
                                         }
                                       }}
                                       className="flex-1 bg-amber-600 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest hover:bg-amber-700 transition-all text-white"
                                     >
                                        Aplicar Strike
                                     </button>
                                  </div>
                                )}
                                <button 
                                  onClick={async () => {
                                    const reason = prompt("Motivo da rejeição/cancelamento:");
                                    if(reason !== null) {
                                       await adminUpdateUser({ ...user, monetizationStatus: 'REJECTED', isMonetized: false });
                                       refresh();
                                    }
                                  }}
                                  className="p-3 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                >
                                   <XMarkIcon className="h-5 w-5" />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>

                    {filteredData.length === 0 && (
                       <div className="p-20 text-center">
                          <BanknotesIcon className="h-16 w-16 text-white/5 mx-auto mb-6" />
                          <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Nenhuma solicitação de monetização pendente.</p>
                       </div>
                    )}
                    <Pagination />
                 </div>
              )}

              {activeTab === 'posts' && (
                <div className="space-y-6 animate-fade-in">
                   {/* Mobile View: Cards */}
                   <div className="grid grid-cols-1 gap-4 md:hidden">
                      {filteredData.map((post: any) => (
                         <div key={post.id} className="bg-[#12161f] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                  <div className="p-3 bg-white/5 rounded-xl">{getPostIcon(post.type)}</div>
                                  <div>
                                     <p className="text-xs font-black text-gray-100 uppercase">{post.authorName}</p>
                                     <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{post.type}</p>
                                  </div>
                               </div>
                               <button onClick={() => handleDeletePost(post.id)} className="p-3 bg-red-600/10 text-red-500 rounded-xl active:scale-90 transition-all">
                                  <TrashIcon className="h-5 w-5" />
                               </button>
                            </div>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                               <p className="text-[11px] text-gray-400 italic leading-relaxed">"{post.content || 'Mídia sem legenda'}"</p>
                            </div>
                         </div>
                      ))}
                   </div>

                   {/* Desktop View: Table */}
                   <div className="hidden md:block bg-[#12161f] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
                      <div className="overflow-x-auto">
                         <table className="w-full text-left border-collapse">
                            <thead className="bg-black/20">
                               <tr className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                                  <th className="px-8 py-6">Tipo</th>
                                  <th className="px-8 py-6">Autor / Conteúdo</th>
                                  <th className="px-8 py-6 text-right">Ação</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                               {(pagedData as Post[]).map((post: Post) => (
                                  <tr key={post.id} className="hover:bg-white/[0.01]">
                                     <td className="px-8 py-6">
                                        <div className="p-3 bg-white/5 rounded-xl">{getPostIcon(post.type)}</div>
                                     </td>
                                     <td className="px-8 py-6">
                                        <p className="text-xs font-black text-gray-100 uppercase mb-1">{post.authorName}</p>
                                        <p className="text-[10px] text-gray-500 truncate max-w-md italic">"{post.content || 'Mídia'}"</p>
                                     </td>
                                     <td className="px-8 py-6 text-right">
                                        <button onClick={() => handleDeletePost(post.id)} className="p-4 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-xl"><TrashIcon className="h-5 w-5" /></button>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>

                   {filteredData.length === 0 && (
                      <div className="p-20 md:p-32 text-center">
                         <NewspaperIcon className="h-16 w-16 text-white/5 mx-auto mb-6" />
                         <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Nenhuma publicação encontrada</p>
                      </div>
                   )}
                </div>
             )}

             {activeTab === 'stores' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                   {(pagedData as Store[]).map((store: Store) => (
                      <div key={store.id} className="bg-[#12161f] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative group">
                         <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center text-white" style={{ backgroundColor: store.brandColor || '#2563eb' }}>
                               <BuildingStorefrontIcon className="h-7 w-7" />
                            </div>
                            <div>
                               <h4 className="font-black text-sm uppercase truncate max-w-[150px]">{store.name}</h4>
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">ID: {store.id}</p>
                            </div>
                         </div>
                         <div className="flex justify-between items-end">
                            <div>
                               <p className="text-2xl font-black text-white">{data.products.filter(p => p.storeId === store.id).length}</p>
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Itens na Vitrine</p>
                            </div>
                            <button onClick={() => onNavigate('store', { storeId: store.id })} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400"><GlobeAltIcon className="h-5 w-5" /></button>
                         </div>
                      </div>
                   ))}
                </div>
             )}

             {activeTab === 'products' && (
                <div className="space-y-6 animate-fade-in">
                   {/* Mobile View: Cards */}
                   <div className="grid grid-cols-1 gap-4 md:hidden">
                      {filteredData.map((prod: any) => (
                         <div key={prod.id} className="bg-[#12161f] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                            <div className="flex items-center gap-4 mb-6">
                               <img src={prod.imageUrls[0]} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                               <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-gray-100 uppercase truncate">{prod.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                     <p className="text-sm font-black text-blue-500">${prod.price.toFixed(2)}</p>
                                     <p className="text-[10px] font-black text-green-600 uppercase">≈ {(prod.price * exchangeRate).toLocaleString()} KZ</p>
                                     <span className="text-[8px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                        {(prod.affiliateCommissionRate * 100).toFixed(0)}% Comis.
                                     </span>
                                  </div>
                               </div>
                               <button onClick={() => handleDeleteProduct(prod.id)} className="p-3 bg-red-600/10 text-red-500 rounded-xl active:scale-90 transition-all">
                                  <XMarkIcon className="h-5 w-5" />
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>

                   {/* Desktop View: Table */}
                   <div className="hidden md:block bg-[#12161f] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
                      <div className="overflow-x-auto">
                         <table className="w-full text-left border-collapse">
                            <thead className="bg-black/20">
                               <tr className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                                  <th className="px-8 py-6">Item</th>
                                  <th className="px-8 py-6">Preço / Comissão</th>
                                  <th className="px-8 py-6 text-right">Status</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                               {(pagedData as Product[]).map((prod: Product) => (
                                  <tr key={prod.id} className="hover:bg-white/[0.01]">
                                     <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                           <img src={prod.imageUrls[0]} className="w-10 h-10 rounded-lg object-cover" />
                                           <p className="text-xs font-black uppercase truncate max-w-[200px]">{prod.name}</p>
                                        </div>
                                     </td>
                                     <td className="px-8 py-6">
                                        <p className="text-sm font-black text-blue-600">${prod.price.toFixed(2)}</p>
                                        <p className="text-[10px] font-black text-green-600 uppercase">≈ {(prod.price * exchangeRate).toLocaleString()} KZ</p>
                                        <p className="text-[9px] font-bold text-green-500 uppercase">Comissão: {(prod.affiliateCommissionRate * 100).toFixed(0)}%</p>
                                     </td>
                                     <td className="px-8 py-6 text-right">
                                        <button onClick={() => handleDeleteProduct(prod.id)} className="p-3 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"><XMarkIcon className="h-5 w-5" /></button>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>

                   {filteredData.length === 0 && (
                      <div className="p-20 md:p-32 text-center">
                         <ShoppingBagIcon className="h-16 w-16 text-white/5 mx-auto mb-6" />
                         <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Nenhum produto encontrado</p>
                      </div>
                   )}
                </div>
             )}

             {activeTab === 'moderation' && (
                <div className="bg-[#12161f] rounded-[3rem] border border-white/5 overflow-hidden animate-fade-in">
                   <div className="divide-y divide-white/[0.03]">
                      {pagedData.length === 0 ? (
                         <div className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Nenhuma denúncia pendente.</div>
                      ) : (
                         (pagedData as ContentReport[]).map(rep => (
                            <div key={rep.id} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.01]">
                               <div className="space-y-3 flex-1">
                                  <div className="flex items-center gap-2">
                                     <span className="px-3 py-1 bg-red-600/10 text-red-500 rounded-lg text-[9px] font-black uppercase border border-red-500/20">
                                        {rep.reason}
                                     </span>
                                     <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{rep.targetType}</span>
                                  </div>
                                  <p className="text-gray-300 text-sm font-bold leading-relaxed">{rep.details}</p>
                                  <div className="flex items-center gap-4 text-[9px] text-gray-500 uppercase font-black tracking-tighter">
                                     <span>Alvo: {rep.targetId.slice(0, 8)}...</span>
                                     <span>Data: {new Date(rep.timestamp).toLocaleDateString()}</span>
                                  </div>
                               </div>
                               <div className="flex gap-2 md:gap-3">
                                  <button onClick={() => handleProcessReport(rep.id, 'DISMISSED')} className="flex-1 md:flex-none px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase transition-all active:scale-95">Ignorar</button>
                                  <button onClick={() => handleProcessReport(rep.id, 'RESOLVED')} className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-red-600 text-white font-black text-[10px] uppercase shadow-lg hover:bg-red-700 transition-all active:scale-95">Banir</button>
                                </div>
                            </div>
                         ))
                      )}
                   </div>
                   <Pagination />
                </div>
             )}

             {activeTab === 'finance' && (
                <div className="bg-[#12161f] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl animate-fade-in">
                   <div className="p-8 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-black uppercase tracking-widest text-sm">Transações Recentes</h3>
                      <div className="bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-green-500/20">
                         Receita Bruta: ${data.revenue.toFixed(2)} (≈ {(data.revenue * exchangeRate).toLocaleString()} KZ)
                      </div>
                   </div>
                   <div className="divide-y divide-white/[0.03]">
                      {data.transactions.length === 0 ? (
                         <div className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Nenhuma transação registrada.</div>
                      ) : (
                         (pagedData as Transaction[]).map(tx => (
                            <div key={tx.id} className="p-6 md:p-8 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                               <div className="flex items-center gap-3 md:gap-4">
                                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${tx.type === TransactionType.DEPOSIT ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                     {tx.type === TransactionType.DEPOSIT ? <ArrowTrendingUpIcon className="h-5 w-5 md:h-6 md:w-6" /> : <ReceiptPercentIcon className="h-5 w-5 md:h-6 md:w-6" />}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="text-white font-bold text-xs md:text-sm truncate uppercase tracking-tight">{tx.description}</p>
                                     <p className="text-[9px] md:text-[10px] text-gray-500 uppercase font-black tracking-tighter">{new Date(tx.timestamp).toLocaleString()}</p>
                                  </div>
                               </div>
                               <div className={`font-black text-xs md:text-sm whitespace-nowrap ml-4 ${tx.type === TransactionType.DEPOSIT ? 'text-green-500' : 'text-white'}`}>
                                  {tx.type === TransactionType.DEPOSIT ? '+' : ''}${tx.amount.toFixed(2)}
                                  <p className="text-[10px] font-black text-green-600 uppercase mt-0.5">≈ {(tx.amount * exchangeRate).toLocaleString()} KZ</p>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                   <Pagination />
                </div>
             )}

             {activeTab === 'config' && (
                currentUser.email === 'alfaajmc@gmail.com' ? (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                   <div className="bg-[#12161f] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                         <WrenchScrewdriverIcon className="h-6 w-6 text-gray-400" /> Parâmetros Globais
                      </h3>
                      <form onSubmit={handleSaveSettings} className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Taxa da Plataforma (0.0 - 1.0)</label>
                               <input 
                                 type="number" 
                                 step="0.01" 
                                 min="0" 
                                 max="1" 
                                 value={settings.platformTax} 
                                 onChange={e => setSettings({...settings, platformTax: parseFloat(e.target.value) || 0})}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Saque Mínimo (USD)</label>
                               <input 
                                 type="number" 
                                 step="1" 
                                 value={settings.minWithdrawal} 
                                 onChange={e => setSettings({...settings, minWithdrawal: parseFloat(e.target.value) || 0})}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Lance Mínimo de Boost (USD)</label>
                               <input 
                                 type="number" 
                                 step="0.5" 
                                 value={settings.boostMinBid !== undefined ? settings.boostMinBid : settings.boostFee} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, boostMinBid: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Boost Diário Mínimo (USD)</label>
                               <input 
                                 type="number" 
                                 step="0.1" 
                                 value={settings.boostDailyMin ?? 0.5} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, boostDailyMin: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mínimo Anúncio (USD)</label>
                               <input 
                                 type="number" 
                                 step="0.1" 
                                 value={settings.adMinBudget ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, adMinBudget: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Custo por 1k Alcance (USD)</label>
                               <input 
                                 type="number" 
                                 step="0.1" 
                                 value={settings.adReachCost ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, adReachCost: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Taxa de Verificação (USD)</label>
                               <input 
                                 type="number" 
                                 step="1" 
                                 value={settings.verificationFee ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, verificationFee: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Criação de Grupo (USD)</label>
                               <input 
                                 type="number" 
                                 step="1" 
                                 value={settings.groupCreationFee ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, groupCreationFee: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Criação de Loja (USD)</label>
                               <input 
                                 type="number" 
                                 step="1" 
                                 value={settings.storeCreationFee ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, storeCreationFee: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Lance Mínimo Produto (USD)</label>
                               <input 
                                 type="number" 
                                 step="1" 
                                 value={settings.positioningMinBid ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, positioningMinBid: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2 text-blue-400">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Divisão Criador (%) ex: 0.7 = 70%</label>
                               <input 
                                 type="number" 
                                 step="0.05" 
                                 min="0" 
                                 max="1" 
                                 value={settings.creatorRevenueShare ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, creatorRevenueShare: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-blue-400 outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Meta Seguidores Monet.</label>
                               <input 
                                 type="number" 
                                 step="100" 
                                 value={settings.monetizationMinFollowers ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, monetizationMinFollowers: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Meta Horas Assistidas</label>
                               <input 
                                 type="number" 
                                 step="10" 
                                 value={settings.monetizationMinWatchHours ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, monetizationMinWatchHours: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Meta Reel Views</label>
                               <input 
                                 type="number" 
                                 step="1000" 
                                 value={settings.monetizationMinReelViews ?? ''} 
                                 onChange={e => {
                                   const val = parseFloat(e.target.value);
                                   setSettings({...settings, monetizationMinReelViews: isNaN(val) ? 0 : val});
                                 }}
                                 className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white outline-none focus:border-blue-600 font-bold text-sm"
                               />
                            </div>
                         </div>
                         <div className="flex items-center gap-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                            <input 
                              type="checkbox" 
                              checked={settings.maintenanceMode} 
                              onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})}
                              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                            />
                            <span className="text-xs font-bold text-gray-300 uppercase">Modo Manutenção</span>
                         </div>
                         <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">
                            Salvar Configurações
                         </button>
                      </form>
                   </div>
                </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center p-10 space-y-4">
                     <ShieldExclamationIcon className="h-16 w-16 text-yellow-500 opacity-50" />
                     <h2 className="text-2xl font-black uppercase tracking-tight">Acesso Restrito</h2>
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-sm">Apenas o Administrador Master tem permissão para gerenciar parâmetros globais e taxas do sistema.</p>
                  </div>
                )
              )}

              {activeTab === 'disputes' && (
                <div className="space-y-6 animate-fade-in">
                   <div className="flex items-center justify-between mb-8">
                      <div>
                         <h3 className="text-xl font-black uppercase tracking-tighter text-red-500">Gestão de Disputas Ativas</h3>
                         <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Analise os casos de fraude e decida o destino dos fundos em escrow</p>
                      </div>
                      <div className="bg-red-600/10 px-4 py-2 rounded-xl border border-red-500/20">
                         <span className="text-[10px] font-black text-red-500 uppercase">{data.disputes.length} CASOS ABERTOS</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-6">
                      {filteredData.map((sale: any) => (
                         <div key={sale.id} className="bg-[#12161f] p-8 rounded-[2.5rem] border border-red-500/20 shadow-2xl relative overflow-hidden group hover:border-red-500/40 transition-all">
                            <div className="absolute top-0 right-0 px-6 py-2 bg-red-600 text-[10px] font-black uppercase tracking-widest text-white rounded-bl-2xl">
                              EM DISPUTA
                            </div>
                            
                            <div className="flex flex-col lg:flex-row gap-8">
                               <div className="flex-1 space-y-4">
                                  <div className="flex items-center gap-3">
                                     <div className="p-3 bg-red-600/10 rounded-xl">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                                     </div>
                                     <h4 className="text-xl font-black uppercase tracking-tighter text-white">{sale.productName}</h4>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                                        <p className="text-[9px] font-black text-gray-500 uppercase">Comprador (Vítima?)</p>
                                        <p className="text-xs font-bold text-gray-200 truncate">{sale.buyerId}</p>
                                     </div>
                                     <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                                        <p className="text-[9px] font-black text-gray-500 uppercase">Vendedor (Suspeito?)</p>
                                        <p className="text-xs font-bold text-gray-200 truncate">{sale.sellerId}</p>
                                     </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest pt-2">
                                     <span className="bg-white/5 px-3 py-1 rounded-lg">ID: {sale.id.slice(-8)}</span>
                                     <span className="text-white bg-blue-600 px-3 py-1 rounded-lg">VALOR EM ESCROW: ${sale.totalAmount.toFixed(2)} (≈ {(sale.totalAmount * exchangeRate).toLocaleString()} KZ)</span>
                                     <span>Data: {new Date(sale.timestamp).toLocaleDateString()}</span>
                                  </div>
                               </div>

                               <div className="flex flex-col gap-3 justify-center min-w-[260px] border-l border-white/5 pl-8">
                                  <button 
                                    onClick={async () => {
                                      if (await showConfirm("Confirmar REEMBOLSO TOTAL ao comprador e cancelamento definitivo da venda?")) {
                                        await cancelPurchaseAndRefund(sale.id);
                                        refresh();
                                      }
                                    }}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                  >
                                     <TrashIcon className="h-4 w-4" /> Reembolsar Cliente
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (await showConfirm("Confirmar que o produto foi entregue corretamente e LIBERAR fundos ao vendedor?")) {
                                        await confirmProductReceipt(sale.id);
                                        refresh();
                                      }
                                    }}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                  >
                                     <CheckCircleIcon className="h-4 w-4" /> Liberar Pagamento
                                  </button>
                                  <button 
                                    onClick={() => onNavigate('chat')}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all text-center"
                                  >
                                     Auditar Chat da Venda
                                  </button>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>

                   {filteredData.length === 0 && (
                      <div className="p-32 text-center bg-[#12161f] rounded-[3rem] border border-white/5 border-dashed">
                         <ShieldCheckIcon className="h-20 w-20 text-emerald-500/10 mx-auto mb-6" />
                         <h3 className="text-gray-500 font-black uppercase text-sm tracking-widest">Sem disputas pendentes</h3>
                         <p className="text-[10px] text-gray-600 font-bold uppercase mt-2">O sistema de Escrow está operando normalmente</p>
                      </div>
                   )}
                   <Pagination />
                </div>
              )}

              {activeTab === 'support' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in h-[calc(100vh-250px)]">
                   {/* Ticket List */}
                   <div className="lg:col-span-1 bg-[#12161f] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-white/5">
                         <h3 className="font-black uppercase tracking-widest text-xs">Tickets de Suporte</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] custom-scrollbar">
                         {data.tickets.length === 0 ? (
                            <div className="p-10 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Nenhum ticket.</div>
                         ) : (
                            data.tickets.map(ticket => {
                               const isAssignedToMe = ticket.assignedAdminId === currentUser.id;
                               const isUnassigned = !ticket.assignedAdminId;
                               const isAccessible = isAssignedToMe || isUnassigned;
                               
                               if (!isAccessible) return null;

                               return (
                                  <div 
                                    key={ticket.id} 
                                    onClick={async () => {
                                       setCurrentTicket(ticket);
                                       if (!ticket.assignedAdminId) {
                                          await claimSupportTicket(ticket.id, currentUser.id);
                                       }
                                    }}
                                    className={`p-5 cursor-pointer transition-all hover:bg-white/[0.02] ${currentTicket?.id === ticket.id ? 'bg-blue-600/10 border-l-4 border-blue-600' : ''}`}
                                  >
                                     <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${ticket.status === 'OPEN' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                           {ticket.status === 'OPEN' ? 'Aberto' : 'Resolvido'}
                                        </span>
                                        <span className="text-[8px] font-black text-gray-500 uppercase">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                     </div>
                                     <h4 className="text-xs font-bold text-white truncate mb-1">{ticket.subject}</h4>
                                     <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{ticket.category}</p>
                                     {isUnassigned && <p className="text-[8px] font-black text-blue-400 uppercase mt-2 animate-pulse">Aguardando Atendimento</p>}
                                  </div>
                               );
                            })
                         )}
                      </div>
                   </div>

                   {/* Chat Area */}
                   <div className="lg:col-span-2 bg-[#12161f] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col relative">
                      {currentTicket ? (
                         <>
                            <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                               <div>
                                  <h3 className="font-black text-sm text-white uppercase tracking-tight">{currentTicket.subject}</h3>
                                  <p className="text-[10px] text-gray-500 font-black uppercase mt-1">Usuário: {currentTicket.userId.slice(0,8)} • {currentTicket.category}</p>
                               </div>
                               <div className="flex gap-2">
                                  {currentTicket.status === 'OPEN' && (
                                     <button 
                                       onClick={async () => {
                                          if (await showConfirm("Deseja marcar este chamado como resolvido?")) {
                                             await resolveSupportTicket(currentTicket.id);
                                             setCurrentTicket(null);
                                          }
                                       }}
                                       className="px-4 py-2 bg-green-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-green-700 transition-all active:scale-95"
                                     >
                                        Resolver
                                     </button>
                                  )}
                                  <button onClick={() => setCurrentTicket(null)} className="p-2 text-gray-500 hover:text-white transition-colors"><XMarkIcon className="h-5 w-5" /></button>
                               </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/10 custom-scrollbar">
                               {currentTicket.messages.map(msg => {
                                  const isSupport = msg.senderId === 'SUPPORT';
                                  return (
                                     <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${isSupport ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#1c222d] text-gray-200 rounded-tl-none'}`}>
                                           {msg.attachmentUrl && (
                                              <div className="mb-3 rounded-xl overflow-hidden border border-white/10">
                                                 {msg.attachmentType === 'video' ? (
                                                    <video src={msg.attachmentUrl} controls className="max-h-48 w-full object-cover" />
                                                 ) : (
                                                    <img src={msg.attachmentUrl} className="max-h-48 w-full object-cover" alt="attachment" />
                                                 )}
                                              </div>
                                           )}
                                           <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                           <p className={`text-[8px] font-black mt-2 opacity-60 uppercase text-right`}>
                                              {isSupport ? 'Suporte (Você)' : 'Usuário'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                           </p>
                                        </div>
                                     </div>
                                  );
                               })}
                               <div ref={chatEndRef} />
                            </div>

                            {currentTicket.status === 'OPEN' && (
                               <div className="p-4 bg-[#1c222d] border-t border-white/5">
                                  {chatFile && (
                                     <div className="flex items-center gap-2 mb-3 bg-blue-600/20 p-2 rounded-xl w-fit border border-blue-600/30">
                                        <DocumentIcon className="h-4 w-4 text-blue-400" />
                                        <span className="text-[10px] font-black text-blue-400 truncate max-w-[200px] uppercase">{chatFile.name}</span>
                                        <button onClick={() => setChatFile(null)}><XMarkIcon className="h-4 w-4 text-gray-500 hover:text-red-500"/></button>
                                     </div>
                                  )}
                                  <form 
                                    onSubmit={async (e) => {
                                       e.preventDefault();
                                       if (!newMessage.trim() && !chatFile) return;
                                       setLoading(true);
                                       try {
                                          let url = undefined;
                                          let type: 'image' | 'video' | undefined = undefined;
                                          if (chatFile) {
                                             url = await uploadFile(chatFile, 'support');
                                             type = chatFile.type.startsWith('video/') ? 'video' : 'image';
                                          }
                                          await addSupportMessage(currentTicket.id, {
                                             senderId: 'SUPPORT',
                                             text: newMessage,
                                             attachmentUrl: url,
                                             attachmentType: type
                                          });
                                          setNewMessage('');
                                          setChatFile(null);
                                       } catch (err) {
                                          console.error("Erro ao enviar resposta:", err);
                                       } finally {
                                          setLoading(false);
                                       }
                                    }} 
                                    className="flex items-center gap-3"
                                  >
                                     <button 
                                       type="button" 
                                       onClick={() => fileInputRef.current?.click()}
                                       className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-blue-400 transition-colors"
                                     >
                                        <PaperClipIcon className="h-5 w-5" />
                                     </button>
                                     <input type="file" ref={fileInputRef} className="hidden" onChange={e => setChatFile(e.target.files?.[0] || null)} accept="image/*,video/*" />
                                     
                                     <input 
                                       type="text" 
                                       value={newMessage}
                                       onChange={e => setNewMessage(e.target.value)}
                                       placeholder="Digite a resposta do suporte..."
                                       className="flex-1 bg-black/20 border border-white/5 rounded-2xl px-4 py-3 outline-none text-xs font-bold text-white focus:border-blue-600 transition-all"
                                     />
                                     
                                     <button 
                                       type="submit" 
                                       disabled={loading || (!newMessage.trim() && !chatFile)}
                                       className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-90"
                                     >
                                        <PaperAirplaneIcon className="h-5 w-5" />
                                     </button>
                                  </form>
                               </div>
                            )}
                         </>
                      ) : (
                         <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                            <LifebuoyIcon className="h-20 w-20 text-white/5 mb-6" />
                            <h3 className="text-lg font-black uppercase tracking-tighter text-gray-500">Selecione um ticket para iniciar o atendimento</h3>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-2">Os tickets não atribuídos serão vinculados a você ao responder.</p>
                         </div>
                      )}
                   </div>
                </div>
             )}
              {activeTab === 'ads' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {(pagedData as AdCampaign[]).map((ad: AdCampaign) => (
                          <div key={ad.id} className="bg-[#12161f] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4">
                               <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${ad.isActive ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                 {ad.isActive ? 'Ativa' : 'Inativa'}
                               </div>
                             </div>

                             <div className="flex items-center gap-4">
                                <img src={ad.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                                <div>
                                   <h4 className="font-black text-sm uppercase truncate w-40">{ad.name}</h4>
                                   <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{ad.professorName}</p>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                               <div className="bg-white/5 p-3 rounded-2xl">
                                 <p className="text-[8px] font-black text-gray-500 uppercase">Orçamento</p>
                                 <p className="text-sm font-black text-white">${ad.budget}</p>
                               </div>
                               <div className="bg-white/5 p-3 rounded-2xl">
                                 <p className="text-[8px] font-black text-gray-500 uppercase">Alcance</p>
                                 <p className="text-sm font-black text-white">{ad.reachedUsers?.length || 0}</p>
                               </div>
                             </div>

                             <div className="flex gap-2">
                                <button 
                                  className="flex-1 bg-white/5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                                >
                                   Alternar Status
                                </button>
                                <button 
                                  className="p-3 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg"
                                >
                                   <TrashIcon className="h-5 w-5" />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>

                    {filteredData.length === 0 && (
                       <div className="p-20 text-center">
                          <MegaphoneIcon className="h-16 w-16 text-white/5 mx-auto mb-6" />
                          <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Nenhuma campanha publicitária encontrada.</p>
                       </div>
                    )}
                    <Pagination />
                 </div>
              )}
           </>
         )}
      </main>
    </div>
  );
};

export default AdminDashboard;