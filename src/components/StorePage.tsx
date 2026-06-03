import React, { useState, useEffect } from 'react';
import { User, Product, Store, Page } from '../types';
import { getProducts, getStores, findUserById, adminDeleteProduct } from '../services/storageService';
import { formatCurrency, safeJsonStringify } from '../lib/utils';
import { 
  ShoppingBagIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ShoppingCartIcon,
  ArchiveBoxIcon,
  TagIcon,
  StarIcon,
  ArrowRightIcon,
  PlusIcon,
  RocketLaunchIcon,
  CheckBadgeIcon,
  SparklesIcon,
  FireIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';

interface StorePageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  storeId?: string;
  productId?: string;
  affiliateId?: string;
  onAddToCart: (pid: string, qty: number, color?: string, aff?: string) => void;
  onOpenCart: () => void;
}

const ProductCard = ({ 
    product, 
    store, 
    onNavigate, 
    onAddToCart, 
    showAlert,
    currentUser,
    onRefresh
}: { 
    product: Product, 
    store?: Store, 
    onNavigate: any, 
    onAddToCart: any, 
    showAlert: any,
    currentUser?: User,
    onRefresh?: () => void
}) => {
    const { showConfirm, showSuccess, showError, showLoading, hideLoading } = useDialog();

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-white dark:bg-white/5 rounded-[32px] overflow-hidden border border-gray-100 dark:border-white/5 hover:border-brand/40 transition-all hover:shadow-2xl hover:shadow-brand/10 cursor-pointer flex flex-col h-full relative"
            onClick={() => onNavigate('product-detail', { productId: product.id })}
        >
            <div className="aspect-square relative overflow-hidden shrink-0">
                <img 
                    src={product.imageUrls?.[0] || 'https://via.placeholder.com/400'} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {product.discountPercentage && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg z-10">
                        -{product.discountPercentage}%
                    </div>
                )}
                {store?.isVerified && (
                    <div className="absolute top-4 right-32 bg-blue-500 text-white p-1.5 rounded-full shadow-lg z-10" title="Loja Verificada">
                        <CheckBadgeIcon className="w-4 h-4" />
                    </div>
                )}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product.id, 1);
                        showAlert(`${product.name.slice(0, 15)}... adicionado ao carrinho!`, { type: 'success' });
                    }}
                    className="absolute top-4 right-4 bg-white/80 dark:bg-black/40 backdrop-blur-md p-2 rounded-xl text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 hover:bg-brand hover:text-white z-20"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                        <TagIcon className="w-3 h-3 text-brand" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand">{product.category}</span>
                    </div>
                    {store && (
                        <span className="text-[8px] font-bold text-gray-400 truncate max-w-[80px] uppercase">By {store.name}</span>
                    )}
                </div>
                <h4 className="font-black uppercase text-gray-900 dark:text-white text-sm truncate leading-tight mb-2 group-hover:text-brand transition-colors">{product.name}</h4>
                
                <div className="flex items-center justify-between mt-auto pt-3">
                    <div className="flex flex-col">
                        {product.discountPercentage ? (
                            <>
                                <span className="text-xs text-gray-400 line-through font-bold">{formatCurrency(product.originalPrice || product.price)}</span>
                                <span className="text-lg font-black text-brand">{formatCurrency(product.price)}</span>
                            </>
                        ) : (
                            <span className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(product.price)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-full">
                        <StarIcon className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{product.averageRating?.toFixed(1) || '0.0'}</span>
                    </div>
                </div>

                {/* Admin/Seller Actions Panel */}
                {(() => {
                    if (!currentUser) return false;
                    const emailLower = (currentUser.email || '').toLowerCase().trim();
                    const isAdmin = currentUser.isAdmin || emailLower === 'alfaajmc@gmail.com' || emailLower === 'ac926815124@gmail.com';
                    const isProductOwner = store?.userId === currentUser.id || product.userId === currentUser.id;
                    return isProductOwner || isAdmin;
                })() && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('manage-store', { editProductId: product.id });
                            }}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 shadow-md shadow-blue-500/10"
                            title="Editar Produto"
                        >
                            <PencilIcon className="w-3.5 h-3.5" />
                            Editar
                        </button>
                        <button 
                            onClick={async (e) => {
                                e.stopPropagation();
                                const confirm = await showConfirm(`Tem certeza de que deseja eliminar o produto "${product.name}"? Esta ação não pode ser desfeita.`, {
                                    title: "Eliminar Produto",
                                    confirmText: "Sim, Eliminar",
                                    cancelText: "Cancelar",
                                    type: "warning"
                                });
                                if (confirm) {
                                    try {
                                        showLoading("Eliminando produto...");
                                        await adminDeleteProduct(product.id);
                                        showSuccess("Produto eliminado com sucesso!");
                                        if (onRefresh) onRefresh();
                                    } catch (err) {
                                        showError("Erro ao eliminar o produto.");
                                    } finally {
                                        hideLoading();
                                    }
                                }
                            }}
                            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white p-2 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-red-500/10"
                            title="Eliminar Produto"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string, icon: any, subtitle?: string }) => (
    <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-brand/10 rounded-2xl">
                <Icon className="w-6 h-6 text-brand" />
            </div>
            <div>
                <h3 className="text-2xl font-black uppercase text-gray-900 dark:text-white tracking-tighter leading-none mb-1">{title}</h3>
                {subtitle && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const CarouselLayout = ({ children, autoScroll = false }: { children: React.ReactNode, autoScroll?: boolean }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!autoScroll || !scrollRef.current) return;

        const scrollContainer = scrollRef.current;
        let animationId: number;
        let scrollPos = scrollContainer.scrollLeft;

        const animate = () => {
            scrollPos += 0.4; // Velocidade suave
            if (scrollContainer) {
                if (scrollPos >= scrollContainer.scrollWidth - scrollContainer.clientWidth - 1) {
                    scrollPos = 0;
                }
                scrollContainer.scrollLeft = scrollPos;
            }
            animationId = requestAnimationFrame(animate);
        };

        const handleMouseEnter = () => cancelAnimationFrame(animationId);
        const handleMouseLeave = () => {
            scrollPos = scrollContainer.scrollLeft; // Sincroniza posição atual
            animationId = requestAnimationFrame(animate);
        };

        // Pequeno delay para garantir que o layout foi renderizado
        const timeoutId = setTimeout(() => {
            animationId = requestAnimationFrame(animate);
        }, 1000);

        scrollContainer.addEventListener('mouseenter', handleMouseEnter);
        scrollContainer.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            clearTimeout(timeoutId);
            cancelAnimationFrame(animationId);
            scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
            scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [autoScroll, React.Children.count(children)]); // Re-start if content changes

    return (
        <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-8 no-scrollbar -mx-4 px-4 whitespace-nowrap"
            style={{ scrollBehavior: 'auto' }}
        >
            {children}
        </div>
    );
};

export const StorePage: React.FC<StorePageProps> = ({ 
    currentUser, 
    onNavigate,
    onAddToCart,
    onOpenCart
}) => {
  const { showAlert } = useDialog();

  const handleAddToCartSecure = (pid: string, qty: number, color?: string, aff?: string) => {
    const isRestrictedUser = (user: any) => {
      if (!user) return false;
      const emailLower = (user.email || '').toLowerCase().trim();
      const isAdminEmail = emailLower === 'alfaajmc@gmail.com' || emailLower === 'ac926815124@gmail.com';
      if (user.isAdmin || isAdminEmail) return false;
      
      let localVerified = false;
      try {
        localVerified = localStorage.getItem(`cp_user_verified_${user.id}`) === 'true' || 
                        localStorage.getItem(`cp_user_verification_status_${user.id}`) === 'APPROVED';
      } catch (e) {}

      const verificationStatus = user.idVerificationStatus || 'NOT_STARTED';
      const isExpired = user.idVerificationDocs?.expiresAt && user.idVerificationDocs.expiresAt < Date.now();
      const hasApprovedVerification = user.isVerified === true || String(user.isVerified) === 'true' || localVerified || (verificationStatus === 'APPROVED' && !isExpired);
      return !hasApprovedVerification;
    };

    if (isRestrictedUser(currentUser)) {
      showAlert("Sua conta está em MODO RESTRITO por falta de verificação de identidade. Por favor, conclua a Verificação de Identidade em Configurações para realizar compras.", { type: "error" });
      return;
    }

    onAddToCart(pid, qty, color, aff);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showOnlyOffers, setShowOnlyOffers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeBanner, setActiveBanner] = useState(0);
  const ITEMS_PER_PAGE = 12;

  const banners = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2070",
      title: "Mude seu estilo com a CyberStore",
      subtitle: "Até 40% de desconto em produtos selecionados por criadores de conteúdo.",
      tag: "Promoção de Lançamento"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=2070",
      title: "Tecnologia de Ponta na CyberPhone",
      subtitle: "Os melhores gadgets e smartphones com entrega garantida para todo o mundo.",
      tag: "Exclusivo"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1445205170230-053b830c6050?auto=format&fit=crop&q=80&w=2071",
      title: "Moda que Define sua Identidade",
      subtitle: "Coleções exclusivas inspiradas na cultura urbana e digital.",
      tag: "Nova Coleção"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
        setActiveBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const categories = [
    { id: 'ALL', label: 'Todos' },
    { id: 'ELECTRONICS', label: 'Eletrônicos', icon: SparklesIcon },
    { id: 'FASHION', label: 'Moda', icon: ShoppingBagIcon },
    { id: 'SERVICES', label: 'Serviços', icon: TagIcon },
    { id: 'DIGITAL', label: 'Digital', icon: RocketLaunchIcon },
    { id: 'OTHER', label: 'Outros', icon: ArchiveBoxIcon }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, str] = await Promise.all([getProducts(), getStores()]);
      
      // Prioritize products from verified stores
      const storeMap = new Map(str.map(s => [s.id, s]));
      const sortedProds = [...prods].sort((a, b) => {
          const storeA = storeMap.get(a.storeId);
          const storeB = storeMap.get(b.storeId);
          if (storeB?.isVerified && !storeA?.isVerified) return 1;
          if (!storeB?.isVerified && storeA?.isVerified) return -1;
          return (b.timestamp || 0) - (a.timestamp || 0);
      });

      setProducts(sortedProds);
      setStores(str);
    } catch (err) {
      console.error("Error loading store data:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesOffers = !showOnlyOffers || (p.discountPercentage && p.discountPercentage > 0);
    return matchesSearch && matchesCategory && matchesOffers;
  });

  const verifiedStores = stores.filter(s => s.isVerified);
  const promotedProducts = products.filter(p => {
      const s = stores.find(str => str.id === p.storeId);
      return s?.isVerified;
  }).slice(0, 8);

  const bestDeals = products.filter(p => p.discountPercentage && p.discountPercentage >= 20).slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 pb-24 md:pb-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <ShoppingBagIcon className="w-8 h-8 text-brand" />
              <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Cyber Marketplace</h1>
           </div>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] ml-1">O marketplace oficial da nova era digital</p>
        </div>

        <div className="flex items-center gap-3">
            <button 
                onClick={() => onNavigate('manage-store')}
                className="bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
            >
                <ArchiveBoxIcon className="w-4 h-4" />
                Minha Loja
            </button>
            <button 
                onClick={onOpenCart}
                className="bg-brand text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95"
            >
                <ShoppingCartIcon className="w-4 h-4" />
                Carrinho
            </button>
        </div>
      </div>

      {/* Hero Banner Slider */}
      <div className="relative h-60 md:h-80 rounded-[40px] overflow-hidden mb-12 group shadow-2xl">
          <AnimatePresence mode="wait">
              <motion.div
                  key={activeBanner}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.8, ease: "circOut" }}
                  className="absolute inset-0"
              >
                  <img 
                    src={banners[activeBanner].image} 
                    className="w-full h-full object-cover transition-transform duration-[6s] hover:scale-110"
                    alt="Promo Banner"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div className="max-w-md">
                         <span className="bg-brand text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 inline-block">
                            {banners[activeBanner].tag}
                         </span>
                         <h2 className="text-2xl md:text-4xl font-black text-white uppercase leading-tight">
                            {banners[activeBanner].title}
                         </h2>
                         <p className="text-sm font-medium text-white/70 mt-2">
                            {banners[activeBanner].subtitle}
                         </p>
                      </div>
                      <button 
                          onClick={() => {
                              setShowOnlyOffers(true);
                              const promoEl = document.getElementById('marketplace-grid');
                              promoEl?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2 self-start md:self-end hover:bg-brand hover:text-white transition-all shadow-xl active:scale-95"
                      >
                          Ver Ofertas <ArrowRightIcon className="w-4 h-4" />
                      </button>
                  </div>
              </motion.div>
          </AnimatePresence>
          
          {/* Slider Indicators */}
          <div className="absolute top-8 right-8 flex gap-2">
              {banners.map((_, idx) => (
                  <button 
                      key={idx}
                      onClick={() => setActiveBanner(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${activeBanner === idx ? 'bg-brand w-8' : 'bg-white/30'}`}
                  />
              ))}
          </div>
      </div>

      {/* Search & Categories */}
      <div className="sticky top-20 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl -mx-4 px-4 py-4 mb-8 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:max-w-md">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    value={searchQuery}
                    onChange={e => {
                        setSearchQuery(e.target.value);
                        if (e.target.value) setShowOnlyOffers(false);
                    }}
                    placeholder="O que você está procurando?"
                    className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-2xl pl-12 pr-6 py-4 font-bold text-sm focus:ring-2 focus:ring-brand outline-none"
                />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar w-full">
                <FunnelIcon className="w-5 h-5 text-gray-400 shrink-0 mx-2 hidden md:block" />
                <button
                    onClick={() => {
                        setSelectedCategory('ALL');
                        setShowOnlyOffers(false);
                    }}
                    className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest whitespace-nowrap transition-all ${
                        selectedCategory === 'ALL' && !showOnlyOffers
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg' 
                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    Todos
                </button>
                {categories.filter(c => c.id !== 'ALL').map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            setSelectedCategory(cat.id);
                            setShowOnlyOffers(false);
                        }}
                        className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest whitespace-nowrap transition-all ${
                            selectedCategory === cat.id && !showOnlyOffers
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg' 
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
                <button
                    onClick={() => setShowOnlyOffers(true)}
                    className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest whitespace-nowrap transition-all ${
                        showOnlyOffers
                        ? 'bg-red-600 text-white shadow-lg' 
                        : 'bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-100'
                    }`}
                >
                    Promoções 🔥
                </button>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="aspect-[4/5] bg-gray-100 dark:bg-white/5 rounded-3xl animate-pulse" />
            ))}
        </div>
      ) : (
          <>
            {/* FEATURED STORES CAROUSEL */}
            {verifiedStores.length > 0 && (
                <div className="mb-20">
                    <SectionHeader title="Lojas Verificadas" icon={CheckBadgeIcon} subtitle="Qualidade e confiança garantidas" />
                    <CarouselLayout autoScroll={true}>
                        {verifiedStores.map(store => (
                            <div 
                                key={store.id}
                                onClick={() => onNavigate('store', { storeId: store.id })}
                                className="min-w-[320px] bg-white dark:bg-white/5 p-6 rounded-[3rem] border border-gray-100 dark:border-white/10 flex items-center gap-5 group cursor-pointer hover:border-brand/40 transition-all hover:shadow-xl"
                            >
                                <div className="w-20 h-20 bg-brand/10 rounded-[2rem] flex items-center justify-center shrink-0 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-full h-full flex items-center justify-center text-white font-black uppercase text-xl shadow-inner" style={{ backgroundColor: store.brandColor || '#2563eb' }}>
                                        {store.name[0]}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <h4 className="font-black uppercase text-gray-900 dark:text-white tracking-widest text-sm truncate">{store.name}</h4>
                                        <CheckBadgeIcon className="w-4 h-4 text-brand shrink-0" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest line-clamp-1">{store.description || 'Vendedor Verificado'}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-[9px] font-black uppercase text-brand bg-brand/10 px-2 py-0.5 rounded-full">Top Seller</span>
                                        <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Oficial</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CarouselLayout>
                </div>
            )}

            {/* PROMOTED PRODUCTS CAROUSEL */}
            {promotedProducts.length > 0 && (
                <div className="mb-20">
                    <SectionHeader title="Produtos em Destaque" icon={SparklesIcon} subtitle="Sugestões de vendedores certificados" />
                    <CarouselLayout autoScroll={true}>
                        {promotedProducts.map(product => (
                            <div key={product.id} className="min-w-[240px] md:min-w-[280px]">
                                <ProductCard 
                                    product={product} 
                                    store={stores.find(s => s.id === product.storeId)}
                                    onNavigate={onNavigate}
                                    onAddToCart={handleAddToCartSecure}
                                    showAlert={showAlert}
                                    currentUser={currentUser}
                                    onRefresh={loadData}
                                />
                            </div>
                        ))}
                    </CarouselLayout>
                </div>
            )}

            {/* BEST DEALS CAROUSEL */}
            {bestDeals.length > 0 && (
                <div className="mb-20">
                    <SectionHeader title="Ofertas Imperdíveis" icon={FireIcon} subtitle="Mais de 20% de desconto" />
                    <CarouselLayout autoScroll={true}>
                        {bestDeals.map(product => (
                            <div key={product.id} className="min-w-[240px] md:min-w-[280px]">
                                <ProductCard 
                                    product={product} 
                                    store={stores.find(s => s.id === product.storeId)}
                                    onNavigate={onNavigate}
                                    onAddToCart={handleAddToCartSecure}
                                    showAlert={showAlert}
                                    currentUser={currentUser}
                                    onRefresh={loadData}
                                />
                            </div>
                        ))}
                    </CarouselLayout>
                </div>
            )}

            {/* MAIN GRID */}
            <div className="mb-12">
                <SectionHeader title={showOnlyOffers ? "🔥 Super Promoções" : selectedCategory === 'ALL' ? "Explorar Tudo" : categories.find(c => c.id === selectedCategory)?.label || "Produtos"} icon={FunnelIcon} />
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
                        <ArchiveBoxIcon className="w-16 h-16 text-gray-200 dark:text-white/10 mx-auto mb-4" />
                        <h3 className="text-xl font-black uppercase text-gray-400">Nenhum produto encontrado</h3>
                        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-2">Tente ajustar seus filtros ou busca</p>
                    </div>
                ) : (
                    <>
                        <div id="marketplace-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredProducts
                                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                .map(product => (
                                <ProductCard 
                                    key={product.id}
                                    product={product} 
                                    store={stores.find(s => s.id === product.storeId)}
                                    onNavigate={onNavigate}
                                    onAddToCart={handleAddToCartSecure}
                                    showAlert={showAlert}
                                    currentUser={currentUser}
                                    onRefresh={loadData}
                                />
                            ))}
                        </div>

                        {filteredProducts.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-center gap-4 mt-16">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => {
                                        setCurrentPage(p => p - 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-gray-100 dark:bg-white/5 px-8 py-4 rounded-2xl disabled:opacity-30 transition-all hover:bg-brand hover:text-white font-black uppercase text-[10px] tracking-widest"
                                >
                                    Anterior
                                </button>
                                <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                    <span className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">
                                        {currentPage} / {Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}
                                    </span>
                                </div>
                                <button
                                    disabled={currentPage === Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}
                                    onClick={() => {
                                        setCurrentPage(p => p + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-gray-100 dark:bg-white/5 px-8 py-4 rounded-2xl disabled:opacity-30 transition-all hover:bg-brand hover:text-white font-black uppercase text-[10px] tracking-widest"
                                >
                                    Próximo
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
          </>
      )}

      {/* CALL TO ACTION */}
      <div className="mt-24 text-center p-12 bg-gray-900 dark:bg-white rounded-[60px] text-white dark:text-black shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/20 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand/10 blur-[100px] pointer-events-none" />
          
          <RocketLaunchIcon className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Abra sua Loja Hoje</h3>
          <p className="text-sm font-medium opacity-70 max-w-lg mx-auto mb-10 leading-relaxed italic">"A CyberStore não é apenas sobre vender produtos, é sobre empoderar a economia digital global através de quem já tem audiência e confiança."</p>
          <button 
             onClick={() => onNavigate('manage-store')}
             className="bg-brand text-white px-12 py-5 rounded-[2rem] font-black uppercase text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
              Começar a Vender
          </button>
      </div>
    </div>
  );
};
