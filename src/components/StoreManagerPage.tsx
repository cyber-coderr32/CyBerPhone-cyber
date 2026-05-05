
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Store, Product, ProductType, OrderStatus, AffiliateSale, GlobalSettings } from '../types';
import { 
  getStores, 
  getProducts, 
  createProduct,
  updateStore,
  getAffiliateSales,
  getAffiliateLinks,
  updateSaleStatus,
  uploadFile,
  adminDeleteProduct,
  findUserById,
  generateUUID,
  updateSaleTracking,
  createStore,
  updateUser,
  getGlobalSettings
} from '../services/storageService';
import { 
  PlusIcon, 
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  CheckBadgeIcon,
  BoltIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  TruckIcon,
  GlobeAmericasIcon,
  CalculatorIcon,
  ArrowPathIcon,
  TagIcon,
  PhotoIcon,
  DocumentArrowUpIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  BanknotesIcon,
  ShareIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  LinkIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import ConfirmationModal from './ConfirmationModal';
import { checkContent } from '../services/sentinelService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';

interface StoreManagerPageProps {
  currentUser: User;
  refreshUser: () => void;
  onNavigate: (page: any, params?: any) => void;
  params?: any;
}

type ManagerTab = 'dashboard' | 'inventory' | 'orders' | 'branding' | 'affiliates';

const BRAND_COLORS = [
  { name: 'Azul CyBer', hex: '#2563eb' },
  { name: 'Roxo Royal', hex: '#7c3aed' },
  { name: 'Verde Mint', hex: '#10b981' },
  { name: 'Preto Carbono', hex: '#0f172a' },
  { name: 'Laranja Solar', hex: '#f59e0b' },
  { name: 'Rosa Shock', hex: '#db2777' }
];

const CATEGORIES = [
    'Tech & Gadgets', 'Moda Masculina', 'Moda Feminina', 'Casa Inteligente', 'Fitness', 'Beleza'
];

const StoreManagerPage: React.FC<StoreManagerPageProps> = ({ currentUser, refreshUser, onNavigate, params }) => {
  const { showAlert, showConfirm } = useDialog();
  const [userStore, setUserStore] = useState<Store | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeSales, setStoreSales] = useState<AffiliateSale[]>([]);
  const [storeAffiliateLinks, setStoreAffiliateLinks] = useState<any[]>([]);
  const [buyerProfiles, setBuyerProfiles] = useState<Record<string, User>>({});
  const [activeTab, setActiveTab] = useState<ManagerTab>(params?.tab || 'dashboard');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[0].hex);

  // Product Form
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCategory, setPCategory] = useState(CATEGORIES[0]);
  const [pPrice, setPPrice] = useState('');
  const [pType, setPType] = useState<ProductType>(ProductType.DIGITAL_COURSE);
  const [pImageUrls, setPImageUrls] = useState<string[]>([]);
  const [pOriginalPrice, setPOriginalPrice] = useState('');
  const [pDiscount, setPDiscount] = useState('');
  const [pHasFreeShipping, setPHasFreeShipping] = useState(true);
  const [pShippingFee, setPShippingFee] = useState('');
  const [pCondition, setPCondition] = useState<'NEW' | 'USED'>('NEW');
  
  // Bidding & Positioning
  const [pPositioning, setPPositioning] = useState<'STANDARD' | 'TOP_SEARCH' | 'MAIN_BANNER'>('STANDARD');
  const [pBidAmount, setPBidAmount] = useState('');
  
  // Details
  const [pStock, setPStock] = useState('100');
  const [pWeight, setPWeight] = useState('');
  const [pDimensions, setPDimensions] = useState('');
  
  const [pLessonsCount, setPLessonsCount] = useState('');
  const [pTotalHours, setPTotalHours] = useState('');
  const [pHasCertificate, setPHasCertificate] = useState(true);
  const [pModules, setPModules] = useState('');

  const [pDigitalUrl, setPDigitalUrl] = useState('');
  const [pAffiliateRate, setPAffiliateRate] = useState('10');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trackingModal, setTrackingModal] = useState<{saleId: string} | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [supplierOrderId, setSupplierOrderId] = useState('');

  // Confirmation Modal
  const [deleteProductTarget, setDeleteProductTarget] = useState<string | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const totalRevenue = storeSales.reduce((acc, sale) => acc + sale.saleAmount, 0);
    const totalProfit = storeSales.reduce((acc, sale) => acc + sale.saleAmount, 0);
    
    const pendingOrders = storeSales.filter(s => s.status !== OrderStatus.COMPLETED).length;
    const completedOrders = storeSales.filter(s => s.status === OrderStatus.COMPLETED).length;
    
    // Process stock
    const lowStockProducts = storeProducts.filter(p => 
      p.type === ProductType.PHYSICAL && 
      p.physicalDetails && 
      p.physicalDetails.stock < 10
    );

    // Sales by Period (Last 7 days)
    const salesByDay: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      salesByDay[key] = 0;
    }

    storeSales.forEach(sale => {
      const date = new Date(sale.timestamp);
      const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (salesByDay[key] !== undefined) {
        salesByDay[key] += sale.saleAmount;
      }
    });

    const chartData = Object.entries(salesByDay).map(([name, value]) => ({ name, value }));

    // Top Products
    const productSales: Record<string, number> = {};
    storeSales.forEach(s => {
      productSales[s.productId] = (productSales[s.productId] || 0) + 1;
    });

    const topProducts = Object.entries(productSales)
      .map(([id, count]) => ({
        id,
        count,
        product: storeProducts.find(p => p.id === id)
      }))
      .filter(item => item.product)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const pendingEarnings = storeSales
      .filter(s => s.status !== OrderStatus.COMPLETED && s.status !== OrderStatus.CANCELED)
      .reduce((acc, sale) => acc + (sale.sellerEarnings || 0), 0);

    const affiliateStats: Record<string, { count: number, revenue: number, user?: User }> = {};
    storeSales.forEach(s => {
      if (s.affiliateUserId) {
        if (!affiliateStats[s.affiliateUserId]) {
          affiliateStats[s.affiliateUserId] = { count: 0, revenue: 0, user: buyerProfiles[s.affiliateUserId] };
        }
        affiliateStats[s.affiliateUserId].count++;
        affiliateStats[s.affiliateUserId].revenue += s.saleAmount;
      }
    });
    const topAffiliates = Object.entries(affiliateStats)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalProfit,
      pendingOrders,
      completedOrders,
      lowStockProducts,
      chartData,
      topProducts,
      pendingEarnings,
      topAffiliates
    };
  }, [storeSales, storeProducts, buyerProfiles]);

  const loadData = async () => {
    setLoading(true);
    const [stores, currentSettings] = await Promise.all([
        getStores(),
        getGlobalSettings()
    ]);
    setSettings(currentSettings);
    const myStore = stores.find(s => s.professorId === currentUser.id);
    if (myStore) {
      setUserStore(myStore);
      setBrandName(myStore.name);
      setBrandDesc(myStore.description);
      setBrandColor(myStore.brandColor || BRAND_COLORS[0].hex);
      const allProds = await getProducts();
      setStoreProducts(allProds.filter(p => p.storeId === myStore.id));
      const allSales = await getAffiliateSales({ sellerId: currentUser.id });
      const links = await getAffiliateLinks(undefined, currentUser.id);
      setStoreAffiliateLinks(links);
      
      // Carregar perfis dos compradores e afiliados
      const buyerIds = Array.from(new Set([
        ...allSales.map(s => s.buyerId),
        ...allSales.map(s => s.affiliateUserId).filter(Boolean) as string[],
        ...links.map(l => l.affiliateId)
      ]));
      const profiles: Record<string, User> = { ...buyerProfiles };
      await Promise.all(buyerIds.map(async (id) => {
        if (!profiles[id]) {
          const u = await findUserById(id);
          if (u) profiles[id] = u;
        }
      }));
      setBuyerProfiles(profiles);

      // Deduplicação Avançada:
      const idDedupedMap = new Map<string, AffiliateSale>();
      allSales.forEach(s => {
        if (s.id) {
          const existing = idDedupedMap.get(s.id);
          if (!existing || statusRank(s.status) > statusRank(existing.status)) {
            idDedupedMap.set(s.id, s);
          }
        }
      });

      const uniqueByContentMap = new Map<string, AffiliateSale>();
      Array.from(idDedupedMap.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach(sale => {
          const date = new Date(sale.timestamp);
          const hourKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          const halfHour = Math.floor(date.getMinutes() / 30);
          const logicalKey = `${sale.buyerId}-${sale.productId}-${hourKey}-${halfHour}`;
          const existing = uniqueByContentMap.get(logicalKey);
          if (!existing || statusRank(sale.status) > statusRank(existing.status)) {
            uniqueByContentMap.set(logicalKey, sale);
          }
        });
      
      const finalSales = Array.from(uniqueByContentMap.values());
      setStoreSales(finalSales.sort((a, b) => b.timestamp - a.timestamp));
    }
    setLoading(false);
  };

  // Helper para ranking de status
  const statusRank = (status: string) => {
    const ranks: Record<string, number> = {
      [OrderStatus.WAITLIST]: 1,
      [OrderStatus.PROCESSING]: 2,
      [OrderStatus.SHIPPING]: 3,
      [OrderStatus.DELIVERED]: 4,
      [OrderStatus.COMPLETED]: 5,
      [OrderStatus.DISPUTED]: 0
    };
    return ranks[status] || 0;
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id, params]);

  const handleSaveBranding = async () => {
    if (!userStore) return;
    const updated = { ...userStore, name: brandName, description: brandDesc, brandColor };
    await updateStore(updated);
    setUserStore(updated);
    showAlert('Identidade visual da loja atualizada!', { type: 'success' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
        const newUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const url = await uploadFile(files[i], 'products');
            newUrls.push(url);
        }
        setPImageUrls(prev => [...prev, ...newUrls]);
    } catch (err) {
        showAlert('Erro ao enviar imagens do produto.', { type: 'error' });
    } finally {
        setUploading(false);
    }
  };

  const removeProductImage = (index: number) => {
    setPImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userStore || uploading) return;

    // Sentinel AI Check
    const combinedContent = `${pName} ${pDesc}`;
    const sentinelResult = await checkContent(combinedContent, 'product');
    if (!sentinelResult.isSafe) {
      showAlert(sentinelResult.reason || 'Produto bloqueado por violar as políticas de segurança.', { type: 'error', title: 'Sentinela de Segurança' });
      return;
    }

    // Positioning Bid Validation
    if (pPositioning !== 'STANDARD' && settings?.positioningMinBid) {
        const bid = pBidAmount ? parseFloat(pBidAmount) : 0;
        if (bid < settings.positioningMinBid) {
            showAlert(`O lance mínimo para posicionamento especial é de $${settings.positioningMinBid.toFixed(2)}.`, { type: 'error' });
            return;
        }
    }

    const productData: Product = {
      id: editingProduct ? editingProduct.id : generateUUID(),
      storeId: userStore.id,
      userId: currentUser.id,
      name: pName,
      description: pDesc,
      category: pCategory,
      status: 'active',
      price: parseFloat(pPrice),
      originalPrice: pOriginalPrice ? parseFloat(pOriginalPrice) : undefined,
      discountPercentage: pDiscount ? parseFloat(pDiscount) : undefined,
      imageUrls: pImageUrls.length > 0 ? pImageUrls : ['https://picsum.photos/400/400?random=prod'],
      affiliateCommissionRate: parseFloat(pAffiliateRate) || 0,
      type: pType,
      ratings: editingProduct ? editingProduct.ratings : [],
      averageRating: editingProduct ? editingProduct.averageRating : 0,
      ratingCount: editingProduct ? editingProduct.ratingCount : 0,
      soldCount: editingProduct ? editingProduct.soldCount : 0,
      digitalContentUrl: pType !== ProductType.PHYSICAL ? pDigitalUrl : undefined,
      condition: pCondition,

      // Novos campos
      hasFreeShipping: pHasFreeShipping,
      shippingFee: pHasFreeShipping ? 0 : parseFloat(pShippingFee || '0'),
      positioning: pPositioning,
      bidAmount: pBidAmount ? parseFloat(pBidAmount) : 0,

      physicalDetails: pType === ProductType.PHYSICAL ? {
        stock: parseInt(pStock),
        weight: pWeight ? parseFloat(pWeight) : undefined,
        dimensions: pDimensions || undefined
      } : undefined,

      courseDetails: pType === ProductType.DIGITAL_COURSE ? {
        lessonsCount: parseInt(pLessonsCount || '0'),
        totalHours: parseFloat(pTotalHours || '0'),
        hasCertificate: pHasCertificate,
        modules: pModules.split('\n').filter(m => m.trim())
      } : undefined
    };

    try {
      if (editingProduct) {
          // We need an updateProduct function in storageService, but createProduct uses setDoc which overwrites
          await createProduct(productData); 
      } else {
          await createProduct(productData);
      }
      
      setIsAddingProduct(false);
      setEditingProduct(null);
      setPImageUrls([]); setPName(''); setPDesc(''); setPPrice(''); setPDigitalUrl('');
      setPOriginalPrice(''); setPDiscount(''); setPHasFreeShipping(true); setPShippingFee('');
      setPPositioning('STANDARD'); setPBidAmount('');
      setPStock('100'); setPWeight(''); setPDimensions('');
      setPLessonsCount(''); setPTotalHours(''); setPHasCertificate(true); setPModules('');
      setPAffiliateRate('10');
      loadData();
      showAlert(editingProduct ? 'Produto atualizado!' : 'Produto criado com sucesso!', { type: 'success' });
    } catch (err: any) {
      if (err.message?.includes('SENTINEL_BLOCK')) {
        showAlert(err.message.replace('SENTINEL_BLOCK: ', ''), { type: 'error', title: 'Sentinela de Segurança' });
      } else {
        showAlert("Erro ao salvar produto.", { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (p: Product) => {
      setEditingProduct(p);
      setPName(p.name);
      setPCategory(p.category || CATEGORIES[0]);
      setPDesc(p.description);
      setPPrice(p.price.toString());
      setPType(p.type);
      setPImageUrls(p.imageUrls || []);
      setPDigitalUrl(p.digitalContentUrl || '');
      setPCondition(p.condition || 'NEW');
      setPAffiliateRate(p.affiliateCommissionRate?.toString() || '10');
      
      setPOriginalPrice(p.originalPrice?.toString() || '');
      setPDiscount(p.discountPercentage?.toString() || '');
      setPHasFreeShipping(p.hasFreeShipping ?? true);
      setPShippingFee(p.shippingFee?.toString() || '');
      setPPositioning(p.positioning || 'STANDARD');
      setPBidAmount(p.bidAmount?.toString() || '');

      if (p.physicalDetails) {
        setPStock(p.physicalDetails.stock.toString());
        setPWeight(p.physicalDetails.weight?.toString() || '');
        setPDimensions(p.physicalDetails.dimensions || '');
      }

      if (p.courseDetails) {
        setPLessonsCount(p.courseDetails.lessonsCount.toString());
        setPTotalHours(p.courseDetails.totalHours.toString());
        setPHasCertificate(p.courseDetails.hasCertificate);
        setPModules(p.courseDetails.modules.join('\n'));
      }

      setIsAddingProduct(true);
  };

  const confirmDeleteProduct = async () => {
    if (deleteProductTarget) {
      await adminDeleteProduct(deleteProductTarget);
      loadData();
      setDeleteProductTarget(null);
    }
  };

  const handleAddTracking = async () => {
    if (!trackingModal || !trackingCode) return;
    await updateSaleStatus(trackingModal.saleId, OrderStatus.SHIPPING);
    await updateSaleTracking(trackingModal.saleId, trackingCode, supplierOrderId);
    setTrackingModal(null);
    setTrackingCode('');
    setSupplierOrderId('');
    loadData();
    showAlert("Código de rastreio atualizado!", { type: 'success' });
  }

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div></div>;
  }

  if (!userStore) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-32 max-w-4xl animate-fade-in">
         <div className="bg-white dark:bg-darkcard rounded-[3rem] p-10 md:p-16 shadow-2xl border dark:border-white/5 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="bg-blue-50 dark:bg-blue-900/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl">
                <PaintBrushIcon className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter dark:text-white uppercase">Crie sua Loja</h2>
            <p className="text-gray-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed mb-10">
                {settings?.storeCreationFee && settings.storeCreationFee > 0 
                  ? `Comece a vender seus produtos físicos ou digitais agora mesmo. Taxa única de ativação: $${settings.storeCreationFee.toFixed(2)}.`
                  : 'Comece a vender seus produtos físicos ou digitais agora mesmo. É gratuito para todos os membros da CyBerPhone.'
                }
            </p>
            <button 
                onClick={async () => {
                    const fee = settings?.storeCreationFee || 0;
                    if (fee > (currentUser.balance || 0)) {
                        showAlert(`Saldo insuficiente para ativar a loja ($${fee.toFixed(2)}). Recarregue sua carteira.`, { type: 'error' });
                        return;
                    }

                    const newStore: Store = {
                        id: generateUUID(),
                        professorId: currentUser.id,
                        name: `${currentUser.firstName}'s Store`,
                        description: 'Bem-vindo à minha loja oficial!',
                        brandColor: BRAND_COLORS[0].hex,
                        productIds: []
                    };
                    const success = await createStore(newStore);
                    if (success) {
                        loadData();
                        showAlert('Loja ativada com sucesso!', { type: 'success' });
                    } else {
                        showAlert('Erro ao ativar loja. Verifique seu saldo.', { type: 'error' });
                    }
                }}
                className="px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
            >
                Ativar Minha Loja
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-6xl animate-fade-in">
       
       <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] shadow-xl flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
              <CheckBadgeIcon className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black dark:text-white tracking-tighter uppercase">{brandName || 'Minha Vitrine'}</h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Painel Profissional <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span></p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-[1.8rem] shadow-inner overflow-x-auto no-scrollbar max-w-full">
             {[
               { id: 'dashboard', label: 'Resumo', icon: ChartBarIcon },
               { id: 'inventory', label: 'Estoque', icon: ArchiveBoxIcon },
               { id: 'orders', label: 'Pedidos', icon: ClipboardDocumentListIcon },
               { id: 'affiliates', label: 'Afiliados', icon: LinkIcon },
               { id: 'branding', label: 'Marca', icon: PaintBrushIcon }
             ].map(t => (
               <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id as any)} 
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'bg-white dark:bg-darkcard text-blue-600 shadow-lg' : 'text-gray-500'}`}
               >
                 <t.icon className="h-4 w-4" /> {t.label}
               </button>
             ))}
          </div>
       </div>

       {activeTab === 'dashboard' && (
         <div className="space-y-8 animate-fade-in pb-12">
            {/* Header de Finanças Profissional */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 md:p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 p-8 opacity-10 transform scale-150 rotate-12 group-hover:scale-[1.6] transition-transform duration-700">
                        <BanknotesIcon className="h-64 w-64" />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                                <ShieldCheckIcon className="h-5 w-5 text-blue-200" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">Visão Financeira Geral</span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end gap-10 md:gap-20">
                            <div>
                                <p className="text-[10px] font-black uppercase text-blue-200 mb-1">Lucro Estimado</p>
                                <h4 className="text-5xl md:text-6xl font-black tracking-tighter">${metrics.totalProfit.toFixed(2)}</h4>
                            </div>
                            <div className="h-16 w-px bg-white/10 hidden md:block"></div>
                            <div className="flex gap-12">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-300 mb-1">Faturamento Bruto</p>
                                    <p className="text-2xl font-black opacity-90">${metrics.totalRevenue.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-300 mb-1">A Liberar (Escrow)</p>
                                    <p className="text-2xl font-black text-indigo-200">${metrics.pendingEarnings.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-wrap gap-4">
                            <button onClick={() => onNavigate('wallet')} className="px-8 py-4 bg-white text-blue-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Sacar Saldo Disponivel</button>
                            <button onClick={() => setActiveTab('orders')} className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Histórico de Vendas</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkcard p-8 rounded-[3.5rem] border border-gray-100 dark:border-white/5 shadow-xl flex flex-col justify-between group">
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
                                <ClipboardDocumentListIcon className="h-7 w-7" />
                            </div>
                            <span className="text-[10px] font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full uppercase">Ativo</span>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pedidos Ativos</p>
                        <h4 className="text-5xl font-black dark:text-white tracking-tighter">{metrics.pendingOrders}</h4>
                        <p className="text-[10px] font-bold text-gray-500 mt-2">Necessário processar {metrics.pendingOrders} envios no momento.</p>
                    </div>
                    <button onClick={() => setActiveTab('orders')} className="w-full mt-8 py-5 bg-gray-50 dark:bg-white/5 rounded-2xl text-[10px] font-black text-gray-500 uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Processar Agora &rsaquo;</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gráfico de Vendas */}
                <div className="lg:col-span-2 bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">Fluxo de Caixa (7 Dias)</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Desempenho diário de faturamento</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-white/5 p-2 rounded-xl">
                            <ChartBarIcon className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#888'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#888'}} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#111', 
                                        borderRadius: '1rem', 
                                        border: 'none', 
                                        color: '#fff',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }} 
                                    cursor={{fill: '#88888810'}}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {metrics.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === metrics.chartData.length - 1 ? '#2563eb' : '#60a5fa'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Dashboard de Estoque Critico */}
                <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">Alertas de Estoque</h3>
                        <div className="relative">
                            <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 animate-pulse" />
                            {metrics.lowStockProducts.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-darkcard">{metrics.lowStockProducts.length}</span>}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        {metrics.lowStockProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/10 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                                    <CheckBadgeIcon className="h-8 w-8 text-green-500" />
                                </div>
                                <p className="text-xs font-black text-gray-500 uppercase">Estoque Seguro</p>
                                <p className="text-[9px] text-gray-400 uppercase mt-1 leading-relaxed">Não há itens com estoque<br/>abaixo do limite crítico de 10 unid.</p>
                            </div>
                        ) : (
                            metrics.lowStockProducts.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 rounded-[1.8rem] border border-orange-100 dark:border-orange-900/20">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <img src={p.imageUrls[0]} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] font-black dark:text-white uppercase truncate">{p.name}</p>
                                            <p className="text-[9px] font-bold text-orange-600 uppercase">Restam {p.physicalDetails?.stock} UNID.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => openEditModal(p)}
                                        className="bg-white dark:bg-white/10 p-2.5 rounded-xl text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-md active:scale-90"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className="mt-8 w-full py-5 bg-gray-50 dark:bg-white/5 rounded-2xl text-[10px] font-black text-gray-500 uppercase hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/5"
                    >
                        Ver Inventário Completo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking de Mais Vendidos */}
                <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">Produtos Campeões</h3>
                        <RocketLaunchIcon className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="space-y-4">
                        {metrics.topProducts.length === 0 ? (
                            <p className="text-center p-12 text-gray-400 font-bold uppercase text-[10px] tracking-widest shadow-inner rounded-3xl bg-gray-50 dark:bg-white/5">Vendas aparecerão aqui assim que ocorrerem.</p>
                        ) : (
                            metrics.topProducts.map((item, idx) => (
                                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.8rem] transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-[10px] shadow-sm ${
                                            idx === 0 ? 'bg-yellow-400 text-white' : 
                                            idx === 1 ? 'bg-gray-300 text-white' : 
                                            idx === 2 ? 'bg-orange-400 text-white' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <img src={item.product?.imageUrls[0]} className="w-12 h-12 rounded-2xl object-cover shadow-md" />
                                        <div>
                                            <p className="text-xs font-black dark:text-white uppercase truncate max-w-[150px]">{item.product?.name}</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{item.count} vendas efetuadas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-blue-600">${(item.count * (item.product?.price || 0)).toFixed(2)}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase">Receita Total</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Performance de Afiliados */}
                <div className="bg-white dark:bg-darkcard p-8 rounded-[3.5rem] border border-gray-100 dark:border-white/5 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">Top Afiliados</h3>
                        <AcademicCapIcon className="h-5 w-5 text-indigo-500" />
                    </div>

                    <div className="space-y-4">
                        {metrics.topAffiliates.length === 0 ? (
                            <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-3xl">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum afiliado realizou vendas ainda.</p>
                                <p className="text-[9px] text-gray-400 mt-2 uppercase">Recrute promotores para bombar sua vitrine!</p>
                            </div>
                        ) : (
                            metrics.topAffiliates.map((aff, idx) => (
                                <div key={aff.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl group hover:shadow-lg transition-all">
                                    <div className="flex items-center gap-4">
                                        <img src={aff.user?.profilePicture || 'https://ui-avatars.com/api/?name=Affiliate'} className="w-10 h-10 rounded-xl object-cover" />
                                        <div>
                                            <p className="text-xs font-black dark:text-white uppercase">{aff.user?.firstName} {aff.user?.lastName}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">{aff.count} CONVERSÕES</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-indigo-600">${aff.revenue.toFixed(2)}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase">GERADOS</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setActiveTab('affiliates')}
                        className="mt-8 w-full py-4 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    >
                        Gerenciador de Afiliados
                    </button>
                </div>
            </div>
         </div>
       )}

       {activeTab === 'inventory' && (
         <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center px-4">
               <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">Estoque Ativo</h3>
               <button onClick={() => setIsAddingProduct(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-2 active:scale-95 transition-all"><PlusIcon className="h-4 w-4 stroke-[4]" /> Adicionar Item</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {storeProducts.map(p => (
                 <div key={p.id} className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm group hover:shadow-2xl transition-all relative">
                    <img src={p.imageUrls[0]} className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="p-6">
                       <div className="flex items-center gap-2 mb-2">
                          {p.ratingCount && p.ratingCount > 0 ? (
                             <div className="flex items-center gap-1">
                                <StarIcon className="h-3 w-3 text-yellow-400" />
                                <span className="text-[10px] font-black text-gray-400">{p.averageRating?.toFixed(1) || '0.0'}</span>
                             </div>
                          ) : (
                             <span className="text-[10px] font-black text-blue-500 uppercase">Sem Avaliações</span>
                          )}
                          <span className="text-[10px] text-gray-300">|</span>
                          <span className="text-[10px] font-black text-gray-400">{p.soldCount || 0} vendidos</span>
                       </div>
                       <h4 className="font-black text-sm dark:text-white uppercase truncate mb-1">{p.name}</h4>
                       <div className="mb-6 flex justify-between items-end">
                          <p className="text-2xl font-black text-blue-600">${p.price.toFixed(2)}</p>
                       </div>
                       <div className="flex gap-2">
                           <button onClick={() => openEditModal(p)} className="flex-1 p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/10 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                               <PaintBrushIcon className="h-4 w-4"/> Editar
                           </button>
                           <button 
                             onClick={() => {
                               const url = `${window.location.origin}?page=store&productId=${p.id}`;
                               navigator.clipboard.writeText(url);
                               showAlert("Link do produto copiado para a área de transferência!", { type: 'success' });
                             }} 
                             className="p-3 bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center justify-center"
                             title="Copiar Link de Divulgação"
                           >
                               <ShareIcon className="h-4 w-4"/>
                           </button>
                           <button onClick={() => setDeleteProductTarget(p.id)} className="p-3 bg-red-50 text-red-500 dark:bg-red-900/10 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center">
                               <TrashIcon className="h-4 w-4"/>
                           </button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
       )}

       {/* Confirmation Modal for Delete Product */}
       <ConfirmationModal
         isOpen={!!deleteProductTarget}
         onClose={() => setDeleteProductTarget(null)}
         onConfirm={confirmDeleteProduct}
         title="Excluir Produto"
         message="Tem certeza que deseja remover este item da sua loja? Esta ação não pode ser desfeita."
         confirmText="Sim, Excluir"
         type="danger"
       />

       {/* ... (Restante do código igual para orders, sourcing, branding e modals de criação) ... */}
       {activeTab === 'orders' && (
         <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-xl">
               <div className="p-6 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">Fulfillment & Rastreio</h3>
                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">{storeSales.length} Pedidos</span>
               </div>
               <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {storeSales.length === 0 ? (
                    <div className="p-24 text-center text-gray-400 font-black uppercase text-xs tracking-widest">Aguardando sua primeira venda...</div>
                  ) : (
                     storeSales.map(sale => {
                        const buyer = buyerProfiles[sale.buyerId];
                        const product = storeProducts.find(p => p.id === sale.productId);
                        
                        return (
                          <div key={sale.id} className="p-6 md:p-10 flex flex-col gap-8 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 last:border-0">
                             <div className="flex flex-col lg:flex-row gap-8 items-start">
                                <div className="flex-1 space-y-4 w-full">
                                   <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Pedido #{sale.id.slice(-8).toUpperCase()}</p>
                                        <h4 className="font-black text-2xl text-gray-900 dark:text-white leading-tight">
                                           {product?.name || 'Produtos Diversos'}
                                        </h4>
                                        <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">{new Date(sale.timestamp).toLocaleString()}</p>
                                      </div>
                                      <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-2xl border shadow-sm ${
                                          sale.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-700 border-green-200' :
                                          sale.status === OrderStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                          sale.status === OrderStatus.PROCESSING ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                          sale.status === OrderStatus.SHIPPING ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                                          'bg-orange-100 text-orange-700 border-orange-200'
                                      }`}>
                                            {sale.status === OrderStatus.WAITLIST ? 'Pendente' : 
                                             sale.status === OrderStatus.PROCESSING ? 'Em Processamento' :
                                             sale.status === OrderStatus.SHIPPING ? 'A Caminho' : 
                                             sale.status === OrderStatus.DELIVERED ? 'No Destino' : 'Finalizado'}
                                      </span>
                                   </div>                                 </div>

                                   {/* Informações do Cliente & Endereço */}
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                      <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/5">
                                         <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <StarIcon className="h-4 w-4" /> Dados do Cliente
                                         </p>
                                         {buyer ? (
                                           <div className="flex items-center gap-4">
                                              {buyer.profilePicture && (
                                                <img src={buyer.profilePicture} className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-white/10" />
                                              )}
                                              <div>
                                                 <p className="font-black text-gray-900 dark:text-white uppercase">{buyer.firstName} {buyer.lastName}</p>
                                                 <p className="text-xs text-gray-500 font-medium">{buyer.email}</p>
                                                 {buyer.phone && <p className="text-xs text-gray-500 font-medium">{buyer.phone}</p>}
                                              </div>
                                           </div>
                                         ) : (
                                           <p className="text-xs text-gray-400 font-bold italic">Carregando dados do cliente...</p>
                                         )}
                                      </div>

                                      <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/5 relative group">
                                         <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <TruckIcon className="h-4 w-4" /> Endereço de Entrega
                                         </p>
                                         {sale.shippingAddress ? (
                                           <>
                                             <div className="space-y-1">
                                                <p className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase leading-snug">{sale.shippingAddress.address}</p>
                                                <p className="text-xs text-gray-500 font-bold uppercase">{sale.shippingAddress.city}, {sale.shippingAddress.state}</p>
                                                <p className="text-[10px] text-gray-400 font-mono tracking-widest">{sale.shippingAddress.zipCode}</p>
                                             </div>
                                             <button 
                                               onClick={() => {
                                                 const addr = sale.shippingAddress;
                                                 if (addr) {
                                                   navigator.clipboard.writeText(`${addr.address}, ${addr.city} - ${addr.state}, CEP: ${addr.zipCode}`);
                                                   showAlert("Endereço copiado!", { type: 'success' });
                                                 }
                                               }}
                                               className="absolute top-4 right-4 p-2 bg-white dark:bg-white/10 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                               title="Copiar Endereço Completo"
                                             >
                                               <ShareIcon className="h-3 w-3 text-blue-600" />
                                             </button>
                                           </>
                                         ) : (
                                            <p className="text-xs text-gray-400 font-bold italic">Endereço não informado.</p>
                                         )}
                                       </div>
                                   </div>
                                   
                                   <div className="flex flex-wrap items-center gap-6 mt-6">
                                      <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 px-6 py-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-inner">
                                         <div>
                                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Valor da Venda</p>
                                             <p className="text-2xl font-black text-gray-900 dark:text-white">${sale.saleAmount.toFixed(2)}</p>
                                         </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-2">
                                         <div className="flex items-center gap-3">
                                            {sale.carrierName && (
                                              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 px-4 py-2 rounded-xl text-blue-700 dark:text-blue-300">
                                                  <GlobeAmericasIcon className="h-4 w-4" />
                                                  <p className="text-[10px] font-black uppercase tracking-wider">{sale.carrierName}</p>
                                              </div>
                                            )}
                                            {sale.trackingCode && (
                                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400">
                                                    <TagIcon className="h-4 w-4" />
                                                    <p className="text-[10px] font-mono font-bold tracking-widest uppercase">TRACK: {sale.trackingCode}</p>
                                                </div>
                                            )}
                                         </div>
                                      </div>
                                   </div>
                                </div>
                                
                                <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto min-w-[240px]">
                                      {sale.status === OrderStatus.WAITLIST && (
                                         <button 
                                          onClick={async () => {
                                            await updateSaleStatus(sale.id, OrderStatus.PROCESSING);
                                            loadData();
                                            showAlert("Status atualizado para: EM PROCESSAMENTO", { type: 'success' });
                                          }}
                                          className="bg-purple-600 shadow-purple-600/30 text-white px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-purple-700 hover:scale-[1.02] active:scale-95 transition-all w-full"
                                         >
                                            <ArrowPathIcon className="h-5 w-5" /> Iniciar Processamento
                                         </button>
                                      )}

                                      {(sale.status === OrderStatus.PROCESSING) && (
                                         <button 
                                          onClick={() => setTrackingModal({saleId: sale.id})}
                                          className="bg-blue-600 shadow-blue-600/30 text-white px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all w-full"
                                         >
                                            <TruckIcon className="h-5 w-5" /> {sale.trackingCode ? 'Atualizar Rastreio' : 'Marcar como Enviado'}
                                         </button>
                                      )}

                                      {sale.status === OrderStatus.SHIPPING && (
                                         <button 
                                          onClick={async () => {
                                            await updateSaleStatus(sale.id, OrderStatus.DELIVERED);
                                            loadData();
                                            showAlert("Status atualizado: PRODUTO NO DESTINO", { type: 'success' });
                                          }}
                                          className="bg-emerald-600 shadow-emerald-600/30 text-white px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all w-full"
                                         >
                                            <CheckBadgeIcon className="h-5 w-5" /> Chegou ao Destino
                                         </button>
                                      )}

                                      {sale.status === OrderStatus.DELIVERED && (
                                         <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-[1.8rem] text-center">
                                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Aguardando Cliente Confirmar Recebimento</p>
                                         </div>
                                      )}
                                </div>
                             </div>
                        );
                     })
                  )}
               </div>
            </div>
         </div>
       )}





       {activeTab === 'branding' && (
         <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
            <div className="bg-white dark:bg-darkcard p-10 rounded-[3.5rem] shadow-2xl border border-gray-100 dark:border-white/5">
               <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight mb-10">Personalização de Marca</h3>
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Comercial</label>
                        <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white font-black outline-none border-2 border-transparent focus:border-blue-600" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cor da Identidade</label>
                        <div className="flex gap-2">
                           {BRAND_COLORS.map(c => (
                             <button key={c.hex} onClick={() => setBrandColor(c.hex)} className={`w-11 h-11 rounded-full border-4 transition-all ${brandColor === c.hex ? 'border-white shadow-xl scale-110' : 'opacity-40 border-transparent'}`} style={{ backgroundColor: c.hex }}></button>
                           ))}
                        </div>
                     </div>
                  </div>
                  <textarea value={brandDesc} onChange={e => setBrandDesc(e.target.value)} className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white h-32 resize-none outline-none border-2 border-transparent focus:border-blue-600 font-medium" placeholder="Descreva o propósito da sua vitrine profissional..." />
                  <button onClick={handleSaveBranding} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all tracking-[0.2em]">Salvar Identidade</button>
               </div>
            </div>
         </div>
       )}

       {activeTab === 'affiliates' && (
         <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Promotores</p>
                  <h4 className="text-4xl font-black dark:text-white tracking-tighter">{new Set(storeAffiliateLinks.map(l => l.userId)).size}</h4>
               </div>
               <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendas via Afiliados</p>
                  <h4 className="text-4xl font-black dark:text-white tracking-tighter">{storeSales.filter(s => s.affiliateUserId).length}</h4>
               </div>
               <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comissões Pagas</p>
                  <h4 className="text-4xl font-black text-indigo-600 tracking-tighter">
                    ${storeSales.filter(s => s.affiliateUserId).reduce((acc, s) => acc + (s.saleAmount * (storeProducts.find(p => p.id === s.productId)?.affiliateCommissionRate || 0) / 100), 0).toFixed(2)}
                  </h4>
               </div>
            </div>

            <div className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-xl">
               <div className="p-6 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5">
                  <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">Links Ativos de Afiliados</h3>
               </div>
               <div className="p-0">
                  {storeAffiliateLinks.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">Nenhum afiliado gerou links ainda.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5 border-b dark:border-white/5">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Afiliado</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Produto</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Data de Criação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-white/5">
                          {storeAffiliateLinks.map((link, idx) => {
                            const affiliate = buyerProfiles[link.userId];
                            const product = storeProducts.find(p => p.id === link.productId);
                            return (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <img src={affiliate?.profilePicture || `https://ui-avatars.com/api/?name=${affiliate?.firstName || 'A'}`} className="w-8 h-8 rounded-full" />
                                    <div>
                                      <p className="text-xs font-black dark:text-white uppercase">{affiliate ? `${affiliate.firstName} ${affiliate.lastName}` : 'Afiliado Externo'}</p>
                                      <p className="text-[10px] text-gray-500">{affiliate?.email || 'N/A'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <img src={product?.imageUrls[0]} className="w-8 h-8 rounded-lg object-cover" />
                                    <p className="text-xs font-bold dark:text-white uppercase">{product?.name || 'Produto Removido'}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-[10px] font-bold text-gray-400">{new Date(link.timestamp).toLocaleDateString()}</p>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
               </div>
            </div>
         </div>
       )}

       {/* Modal de Novo Produto Próprio (AliExpress Style) */}
       {isAddingProduct && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto" onClick={() => setIsAddingProduct(false)}>
            <div 
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-3xl rounded-[2rem] shadow-2xl relative border border-white/10 my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={e => e.stopPropagation()}
            >
               {/* Header */}
               <div className="p-6 border-b dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                  <div>
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">{editingProduct ? 'Editar Produto' : 'Anunciar Novo Produto'}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{editingProduct ? 'Altere os detalhes do seu item' : 'Preencha os detalhes para começar a vender'}</p>
                  </div>
                  <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                       <XMarkIcon className="h-6 w-6" />
                  </button>
               </div>

               {/* Form Content */}
               <form onSubmit={handleCreateProduct} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                  {/* Categoría y Tipo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Produto</label>
                       <select 
                        value={pType} 
                        onChange={e => setPType(e.target.value as ProductType)} 
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-sm cursor-pointer border-2 border-transparent focus:border-[#ff4747]"
                       >
                          <option value={ProductType.PHYSICAL}>📦 Produto Físico</option>
                          <option value={ProductType.DIGITAL_COURSE}>🎓 Curso Online</option>
                          <option value={ProductType.DIGITAL_EBOOK}>📚 E-book / PDF</option>
                          <option value={ProductType.DIGITAL_OTHER}>⚡ Outros Digitais</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nicho / Categoria</label>
                       <select 
                        value={pCategory} 
                        onChange={e => setPCategory(e.target.value)} 
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-sm cursor-pointer border-2 border-transparent focus:border-[#ff4747]"
                       >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="Outros">Outros</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                       <input 
                         type="text" 
                         required 
                         placeholder="Ex: Smartwatch Ultra Series 8"
                         value={pName} 
                         onChange={e => setPName(e.target.value)} 
                         className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-[#ff4747] transition-all" 
                       />
                    </div>
                  </div>

                  {/* Condição do Produto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Condição do Item</label>
                        <div className="flex gap-2">
                           {['NEW', 'USED'].map((c) => (
                             <button
                               key={c}
                               type="button"
                               onClick={() => setPCondition(c as any)}
                               className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${pCondition === c ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 dark:bg-white/5 text-gray-400 border-transparent hover:border-gray-200'}`}
                             >
                               {c === 'NEW' ? '✨ Novo / Lacrado' : '🏷️ Usado / Semi-novo'}
                             </button>
                           ))}
                        </div>
                    </div>
                  </div>

                  {/* Pricing Section - Advanced */}
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-6">
                    <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-green-500" /> Precificação Profissional
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Atual ($)</label>
                          <input 
                            type="number" 
                            required 
                            step="0.01"
                            value={pPrice} 
                            onChange={e => setPPrice(e.target.value)} 
                            placeholder="0.00"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-black text-sm border-2 border-transparent focus:border-green-500" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Original ($)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={pOriginalPrice} 
                            onChange={e => setPOriginalPrice(e.target.value)} 
                            placeholder="Opcional (Riscado)"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-gray-400" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Desconto (%)</label>
                          <input 
                            type="number" 
                            value={pDiscount} 
                            onChange={e => setPDiscount(e.target.value)} 
                            placeholder="Automático"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent" 
                          />
                       </div>
                    </div>
                  </div>

                  {/* Shipping Section - Advanced */}
                  {pType === ProductType.PHYSICAL && (
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl space-y-6">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <TruckIcon className="h-4 w-4 text-blue-500" /> Configurações de Frete
                      </h4>
                      
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 flex items-center justify-between bg-white dark:bg-black/20 p-4 rounded-xl">
                          <div>
                            <p className="text-xs font-black dark:text-white uppercase">Oferecer Frete Grátis?</p>
                            <p className="text-[9px] text-gray-500 font-bold">Aumenta as conversões em até 40%</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setPHasFreeShipping(!pHasFreeShipping)}
                            className={`w-12 h-6 rounded-full transition-all relative ${pHasFreeShipping ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${pHasFreeShipping ? 'right-0.5' : 'left-0.5'}`}></div>
                          </button>
                        </div>
                        
                        {!pHasFreeShipping && (
                          <div className="flex-1 space-y-2 animate-fade-in">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor do Frete ($)</label>
                            <input 
                              type="number" 
                              value={pShippingFee} 
                              onChange={e => setPShippingFee(e.target.value)} 
                              className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-blue-200" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Promoting Section - Bidding */}
                  <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl space-y-6 border border-orange-100 dark:border-orange-800/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2 text-orange-600">
                        <RocketLaunchIcon className="h-4 w-4" /> Impulsionar Visibilidade
                      </h4>
                      <div className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Leilão Ativo</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Posicionamento Desejado</label>
                          <select 
                            value={pPositioning} 
                            onChange={e => setPPositioning(e.target.value as any)} 
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-500"
                          >
                             <option value="STANDARD">Padrão (Busca comum)</option>
                             <option value="TOP_SEARCH">Topo das Buscas (+ Taxa)</option>
                             <option value="MAIN_BANNER">Banner Principal do Topo (+ Taxa Premium)</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seu Lance (Bid) - $/Dia</label>
                          <div className="relative">
                             <input 
                               type="number" 
                               value={pBidAmount} 
                               onChange={e => setPBidAmount(e.target.value)} 
                               placeholder="Quanto você quer pagar?"
                               className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-black text-sm border-2 border-orange-500" 
                             />
                             <BoltIcon className="h-4 w-4 text-orange-500 absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                          {settings?.positioningMinBid && settings.positioningMinBid > 0 && (
                            <p className="text-[8px] text-orange-600 font-black uppercase tracking-tighter">Lance mínimo: ${settings.positioningMinBid.toFixed(2)}</p>
                          )}
                          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter mt-1 italic">O produto com o maior lance aparece primeiro!</p>
                       </div>
                    </div>
                  </div>

                  {/* Course Specific Details */}
                  {pType === ProductType.DIGITAL_COURSE && (
                    <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-3xl space-y-6 border border-purple-100 dark:border-purple-800/30">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2 text-purple-600">
                        <AcademicCapIcon className="h-4 w-4" /> Detalhes do Curso
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total de Aulas</label>
                            <input type="number" value={pLessonsCount} onChange={e => setPLessonsCount(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Carga Horária</label>
                            <input type="number" value={pTotalHours} onChange={e => setPTotalHours(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="flex flex-col justify-end">
                            <button 
                              type="button"
                              onClick={() => setPHasCertificate(!pHasCertificate)}
                              className={`w-full p-4 rounded-xl font-black text-[10px] uppercase transition-all ${pHasCertificate ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}
                            >
                              {pHasCertificate ? '✅ Com Certificado' : '❌ Sem Certificado'}
                            </button>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Conteúdo/Módulos (Um por linha)</label>
                         <textarea 
                            value={pModules} 
                            onChange={e => setPModules(e.target.value)} 
                            placeholder="Módulo 1: Introdução&#10;Módulo 2: Configurações Iniciais"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-medium text-xs h-24"
                         />
                      </div>
                    </div>
                  )}

                  {/* Physical Specific Details */}
                  {pType === ProductType.PHYSICAL && (
                    <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-6">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <ArchiveBoxIcon className="h-4 w-4" /> Estoque e Dimensões
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qtd em Estoque</label>
                            <input type="number" value={pStock} onChange={e => setPStock(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Peso (kg)</label>
                            <input type="number" step="0.01" value={pWeight} onChange={e => setPWeight(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dimensões (CxLxA)</label>
                            <input type="text" value={pDimensions} onChange={e => setPDimensions(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" placeholder="20x15x10" />
                         </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição Comercial</label>
                     <textarea 
                        required
                        value={pDesc}
                        onChange={e => setPDesc(e.target.value)}
                        placeholder="Descreva as principais características, benefícios e especificações do seu produto..."
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-medium text-sm border-2 border-transparent focus:border-[#ff4747] transition-all h-32 resize-none"
                     />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">URL de Conteúdo (Downloads/Acesso)</label>
                       <div className="relative">
                          <LinkIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            value={pDigitalUrl} 
                            onChange={e => setPDigitalUrl(e.target.value)} 
                            placeholder="Link do Google Drive / Hotmart / etc"
                            className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl font-bold text-xs" 
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comissão de Afiliados (%)</label>
                       <input 
                        type="number" 
                        value={pAffiliateRate}
                        onChange={e => setPAffiliateRate(e.target.value)}
                        placeholder="Ex: 15"
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-[#ff4747]" 
                       />
                    </div>
                  </div>

                  {/* Media Upload */}
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Galeria de Imagens (Variedades)</label>
                     
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {pImageUrls.map((url, idx) => (
                           <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border dark:border-white/10">
                              <img src={url} className="w-full h-full object-cover" alt={`Variedade ${idx + 1}`} />
                              <button 
                                type="button"
                                onClick={() => removeProductImage(idx)}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                 <TrashIcon className="h-4 w-4" />
                              </button>
                              {idx === 0 && (
                                <div className="absolute bottom-0 left-0 w-full bg-blue-600/90 text-white text-[8px] font-black uppercase py-1 text-center">
                                   Capa Principal
                                </div>
                              )}
                           </div>
                        ))}
                        
                        {pImageUrls.length < 8 && (
                           <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()} 
                              disabled={uploading}
                              className={`aspect-square border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-white/5 ${uploading ? 'opacity-50 cursor-not-allowed' : 'border-gray-200 dark:border-white/10 hover:border-blue-500'}`}
                           >
                              {uploading ? (
                                <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />
                              ) : (
                                <>
                                  <PlusIcon className="h-8 w-8 text-gray-300" />
                                  <span className="text-[10px] font-black text-gray-400 uppercase mt-2">Adicionar</span>
                                </>
                              )}
                           </button>
                        )}
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                     <p className="text-[9px] text-gray-400 font-medium italic">A primeira imagem será usada como capa principal nos resultados de busca.</p>
                  </div>

                  {pType !== ProductType.PHYSICAL && (
                    <div className="space-y-2 animate-fade-in">
                       <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Link de Entrega Digital</label>
                       <div className="relative">
                          <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
                          <input 
                            type="url" 
                            required
                            value={pDigitalUrl} 
                            onChange={e => setPDigitalUrl(e.target.value)} 
                            className="w-full pl-12 pr-4 py-4 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 rounded-xl outline-none font-bold text-sm border-2 border-blue-200 dark:border-blue-800/30" 
                            placeholder="https://seu-link-de-entrega.com/download" 
                          />
                       </div>
                       <p className="text-[9px] text-blue-500 font-medium ml-1">Este link será enviado automaticamente ao cliente após a confirmação do pagamento.</p>
                    </div>
                  )}
               </form>

                {/* Footer Actions */}
                <div className="p-6 border-t dark:border-white/5 bg-gray-50 dark:bg-white/5 flex gap-4">
                   <button 
                     type="button"
                     onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                     className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleCreateProduct}
                     disabled={uploading || !pName || !pPrice}
                     className="flex-[2] py-4 bg-[#ff4747] hover:bg-[#e63e3e] disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#ff4747]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     {uploading ? 'Processando...' : <><CheckBadgeIcon className="h-5 w-5" /> {editingProduct ? 'Salvar Alterações' : 'Publicar Produto'}</>}
                   </button>
                </div>
            </div>
         </div>
       )}

       {trackingModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-start sm:items-center justify-center p-4 animate-fade-in overflow-y-auto" onClick={() => setTrackingModal(null)}>
            <div className="bg-white dark:bg-darkcard w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border border-white/10 my-auto" onClick={e => e.stopPropagation()}>
               <h3 className="text-xl font-black dark:text-white uppercase tracking-tight mb-6">Dados de Envio</h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Código de Rastreio</label>
                     <input type="text" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold dark:text-white outline-none" placeholder="Ex: LB123456789HK" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID do Pedido no Fornecedor</label>
                     <input type="text" value={supplierOrderId} onChange={e => setSupplierOrderId(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold dark:text-white outline-none" placeholder="Opcional" />
                  </div>
                  <button onClick={handleAddTracking} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Confirmar Envio</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default StoreManagerPage;
