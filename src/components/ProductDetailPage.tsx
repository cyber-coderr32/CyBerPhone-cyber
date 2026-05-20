import React, { useState, useEffect } from 'react';
import { User, Product, Page, Store } from '../types';
import { getProduct, getStores, findUserById } from '../services/storageService';
import { formatCurrency, safeJsonStringify } from '../lib/utils';
import { Pencil } from 'lucide-react';
import { 
  ShoppingBagIcon, 
  ArrowLeftIcon,
  StarIcon,
  CheckBadgeIcon,
  ShareIcon,
  ShieldCheckIcon,
  TruckIcon,
  CreditCardIcon,
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
  ChatBubbleOvalLeftIcon,
  ClockIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { motion } from 'motion/react';
import { useDialog } from '../services/DialogContext';

interface ProductDetailPageProps {
  currentUser: User;
  productId: string;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onAddToCart: (pid: string, qty: number, color?: string, aff?: string) => void;
  onOpenCart: () => void;
  affiliateId?: string;
}

const ReviewItem = ({ rating }: { rating: any }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const u = await findUserById(rating.userId);
            if (u) setUser(u);
        };
        loadUser();
    }, [rating.userId]);

    return (
        <div className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 hover:border-brand/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                        {user?.profilePicture ? (
                            <img src={user.profilePicture} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs font-black text-gray-400 capitalize">{user?.firstName?.[0] || 'U'}</span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase dark:text-white leading-none mb-1">
                            {user ? `${user.firstName} ${user.lastName}` : 'Usuário Cyber'}
                        </p>
                        <div className="flex items-center gap-1">
                             <ClockIcon className="w-3 h-3 text-gray-400" />
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(rating.timestamp).toLocaleDateString()}
                             </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-[2px]">
                    {[1,2,3,4,5].map(s => (
                        s <= rating.rating ? (
                            <StarIcon key={s} className="w-4 h-4 text-yellow-500" />
                        ) : (
                            <StarOutline key={s} className="w-4 h-4 text-gray-200 dark:text-white/10" />
                        )
                    ))}
                </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic">
                "{rating.comment}"
            </p>
        </div>
    );
};

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ 
    currentUser, 
    productId, 
    onNavigate, 
    onAddToCart,
    onOpenCart,
    affiliateId 
}) => {
  const { showAlert } = useDialog();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getProduct(productId);
      if (data) {
        setProduct(data);
        const stores = await getStores();
        const foundStore = stores.find(s => s.id === data.storeId);
        if (foundStore) setStore(foundStore);
      }
    } catch (err) {
      console.error("Error loading product:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10">
        <ShoppingBagIcon className="w-16 h-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-black uppercase text-gray-400">Produto não encontrado</h2>
        <button onClick={() => onNavigate('store')} className="mt-8 text-brand font-black uppercase text-xs">Voltar ao Marketplace</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 pb-24">
      {/* Back Button */}
      <button 
        onClick={() => onNavigate('store')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-8 transition-all group"
      >
        <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-black uppercase text-[10px] tracking-widest">Voltar ao Marketplace</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-[40px] overflow-hidden bg-gray-100 dark:bg-white/5 shadow-2xl">
            <img 
              src={product.imageUrls?.[selectedImage] || 'https://via.placeholder.com/800'} 
              className="w-full h-full object-cover transition-all duration-700"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {product.imageUrls?.map((url, idx) => (
              <button 
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`w-24 h-24 rounded-2xl overflow-hidden border-4 transition-all shrink-0 ${selectedImage === idx ? 'border-brand' : 'border-transparent opacity-50'}`}
              >
                <img src={url} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-brand/10 text-brand px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none">
                {product.category}
              </span>
              <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none">
                <StarIcon className="w-3 h-3" />
                {product.averageRating || '4.9'} ({product.ratingCount || '0'})
              </div>
            </div>

            {store?.userId === currentUser.id && (
              <button 
                onClick={() => onNavigate('manage-store', { editProductId: product.id })}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest leading-none shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all outline-none"
              >
                <Pencil className="w-3 h-3" />
                Editar Produto
              </button>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-6">
            {product.name}
          </h1>

          {store && (
             <div 
               onClick={() => onNavigate('store', { storeId: store.id })}
               className="flex items-center gap-3 mb-8 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-brand/40 transition-all cursor-pointer group w-fit"
             >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: store.brandColor || '#2563eb' }}>
                   <BuildingStorefrontIcon className="h-6 w-6" />
                </div>
                <div>
                   <div className="flex items-center gap-1">
                      <span className="text-[11px] font-black uppercase text-gray-900 dark:text-white group-hover:text-brand transition-colors">{store.name}</span>
                      {store.isVerified && (
                        <CheckBadgeIcon className="h-4 w-4 text-blue-500" />
                      )}
                   </div>
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Ver Loja Oficial</p>
                </div>
             </div>
          )}

          <div className="flex items-center gap-4 mb-8">
             <div className="flex flex-col">
                <span className="text-3xl font-black text-brand">{formatCurrency(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-sm font-bold text-gray-400 line-through">{formatCurrency(product.originalPrice)}</span>
                )}
             </div>
             {product.discountPercentage && (
               <div className="bg-red-600 text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-tighter shadow-lg shadow-red-600/20">
                 -{product.discountPercentage}% OFF
               </div>
             )}
          </div>

          <p className="text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-10">
            {product.description}
          </p>
          <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[40px] mb-10">
             <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Quantidade</span>
                   <div className="flex items-center gap-4 bg-white dark:bg-black/20 p-2 rounded-2xl border border-gray-100 dark:border-white/10">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl"
                      >
                        <MinusIcon className="w-4 h-4 text-gray-500" />
                      </button>
                      <span className="w-8 text-center font-black text-gray-900 dark:text-white">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl"
                      >
                        <PlusIcon className="w-4 h-4 text-gray-500" />
                      </button>
                   </div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Total</span>
                   <span className="text-2xl font-black text-gray-900 dark:text-white underline decoration-brand decoration-4">KZ {(product.price * quantity).toLocaleString()}</span>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    onAddToCart(product.id, quantity, undefined, affiliateId);
                    onOpenCart();
                  }}
                  className="flex-1 bg-brand text-white py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  Comprar Agora
                </button>
                <button 
                  onClick={() => onAddToCart(product.id, quantity, undefined, affiliateId)}
                  className="px-8 py-5 rounded-[2rem] border-2 border-gray-200 dark:border-white/10 font-black uppercase text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  No Carrinho
                </button>
                <button 
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    showAlert("Link do produto copiado!", { type: 'success' });
                  }}
                  className="p-5 rounded-[2rem] border-2 border-gray-200 dark:border-white/10 text-gray-400 hover:text-brand transition-all active:scale-95"
                >
                    <ShareIcon className="w-5 h-5" />
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="flex items-center gap-3 p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl">
                <ShieldCheckIcon className="w-6 h-6 text-green-500" />
                <div>
                   <p className="text-[9px] font-black uppercase text-gray-400">Garantia Cyber</p>
                   <p className="text-[10px] font-bold text-gray-900 dark:text-white">Compra Segura</p>
                </div>
             </div>
             <div className="flex items-center gap-3 p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl">
                <TruckIcon className="w-6 h-6 text-blue-500" />
                <div>
                   <p className="text-[9px] font-black uppercase text-gray-400">Entrega Grátis</p>
                   <p className="text-[10px] font-bold text-gray-900 dark:text-white">Em Luanda</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-24">
          <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                  <div className="p-4 bg-yellow-500/10 rounded-3xl">
                      <ChatBubbleOvalLeftIcon className="w-8 h-8 text-yellow-500" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white tracking-tighter">Avaliações de Clientes</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Baseado em compradores reais</p>
                  </div>
              </div>
              <div className="text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                      <StarIcon className="w-5 h-5 text-yellow-500" />
                      <span className="text-2xl font-black text-gray-900 dark:text-white">{product.averageRating?.toFixed(1) || '0.0'}</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                      {product.ratingCount || 0} Avaliações Totais
                  </p>
              </div>
          </div>

          {!product.ratings || product.ratings.length === 0 ? (
              <div className="py-20 bg-gray-50 dark:bg-white/5 rounded-[3rem] border border-gray-100 dark:border-white/10 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <StarOutline className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter mb-2">Sem avaliações ainda</h3>
                  <p className="text-gray-400 text-sm font-medium">Seja o primeiro a comprar e contar sua experiência!</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {product.ratings.map((rating) => (
                      <ReviewItem key={rating.id} rating={rating} />
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
