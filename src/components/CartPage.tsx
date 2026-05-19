import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingBagIcon, 
  TrashIcon, 
  PlusIcon, 
  MinusIcon, 
  ChevronRightIcon, 
  ShieldCheckIcon,
  ExclamationCircleIcon,
  TruckIcon,
  CreditCardIcon,
  LockClosedIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { User, Product, CartItem, ShippingAddress } from '../types';
import { getProduct, processProductPurchase } from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';

interface CartItemExt extends CartItem {
  product?: Product;
}

interface CartPageProps {
  currentUser: User;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onNavigate: (page: any) => void;
}

const CartPage: React.FC<CartPageProps> = ({ currentUser, cart, setCart, onNavigate }) => {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(false);
  const [hydrationCart, setHydrationCart] = useState<CartItemExt[]>([]);
  const [step, setStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(currentUser.address || {
    address: '',
    city: '',
    state: '',
    zipCode: '',
    carrierName: ''
  });

  useEffect(() => {
    hydrateCart();
  }, [cart]);

  const hydrateCart = async () => {
    setLoading(true);
    try {
      const hydrated = await Promise.all(cart.map(async (item) => {
        const p = await getProduct(item.productId);
        return { ...item, product: p || undefined };
      }));
      setHydrationCart(hydrated.filter(i => i.product));
    } catch (err) {
      console.error("Error hydrating cart:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (pid: string) => {
    setCart(prev => prev.filter(i => i.productId !== pid));
  };

  const updateQty = (pid: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.productId === pid) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const subtotal = hydrationCart.reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);
  const shippingFee = hydrationCart.some(i => i.product?.type === 'PHYSICAL') ? 1500 : 0;
  const total = subtotal + shippingFee;

  const handleCheckout = async () => {
    if (total > (currentUser.balance || 0)) {
        showAlert(t('insufficient_balance_purchase'), { type: 'error' });
        return;
    }

    setLoading(true);
    try {
        // IA Sentinela Monitorando
        console.log("[IA Sentinela] Analisando protocolo de segurança da transação...");
        
        // No checkout, processamos todos os itens de uma vez conforme assinatura do storageService
        const success = await processProductPurchase(
            cart, 
            currentUser.id, 
            null, // affiliateId master
            shippingAddress
        );

        if (success) {
            setStep('success');
            setCart([]);
        } else {
            throw new Error("Falha no processamento da transação pelo servidor.");
        }
    } catch (err) {
        console.error("Erro no checkout:", safeJsonStringify(err));
        showAlert(t('checkout_error'), { type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
           <CheckCircleIcon className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white mb-4">{t('order_confirmed')}</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-12">
            {t('order_processed_desc')}
        </p>
        <div className="flex flex-col gap-4">
            <button 
                onClick={() => onNavigate('purchases')}
                className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
            >
                {t('track_order')}
            </button>
            <button 
                onClick={() => onNavigate('store')}
                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
            >
                {t('continue_shopping')}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 pb-32">
       <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white flex items-center gap-4">
              {t('cart')} <ShoppingBagIcon className="w-10 h-10 text-blue-600" />
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">{t('cart_sentinel_desc') || "Protegido pelo Protocolo de IA Sentinela de CyBerPhone"}</p>
          </div>

          <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/10 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
             <ShieldCheckIcon className="w-6 h-6 text-emerald-600" />
             <div>
                <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">{t('total_security')}</p>
                <p className="text-[8px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">{t('antifraud_monitoring')}</p>
             </div>
          </div>
       </div>

       {hydrationCart.length === 0 && !loading ? (
          <div className="py-32 bg-white dark:bg-white/5 rounded-[4rem] border border-gray-100 dark:border-white/10 text-center shadow-xl">
             <div className="w-32 h-32 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                <ShoppingBagIcon className="w-16 h-16 text-gray-200" />
             </div>
             <h2 className="text-2xl font-black uppercase dark:text-white mb-2">{t('empty_bag')}</h2>
             <p className="text-gray-400 text-sm font-medium mb-10">{t('empty_bag_desc')}</p>
             <button 
                onClick={() => onNavigate('store')}
                className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-105 transition-all"
             >
                {t('explore_showcases')}
             </button>
          </div>
       ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
             {/* Left Column: Cart Items or Steps */}
             <div className="lg:col-span-2 space-y-8">
                {step === 'cart' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-white/5 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                       <div className="px-8 py-6 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                          <h3 className="text-sm font-black uppercase dark:text-white tracking-widest">{t('items_summary')}</h3>
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{hydrationCart.length} {t('products')}</span>
                       </div>
                       <div className="p-8 space-y-8">
                          <AnimatePresence>
                            {hydrationCart.map((item) => (
                              <motion.div 
                                key={item.productId}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col sm:flex-row gap-6 relative"
                              >
                                <div className="w-full sm:w-32 h-32 rounded-3xl bg-gray-50 dark:bg-white/5 overflow-hidden shrink-0 border border-gray-100 dark:border-white/10">
                                  <img src={item.product?.imageUrls?.[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex-grow flex flex-col justify-between py-2">
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-1">{item.product?.name}</h4>
                                      <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors">
                                        <TrashIcon className="w-5 h-5" />
                                      </button>
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.product?.category}</p>
                                    {item.selectedColor && (
                                       <div className="flex items-center gap-2 mt-2">
                                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('color')}:</span>
                                          <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: item.selectedColor }} />
                                       </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-4">
                                     <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-1 rounded-2xl border border-gray-100 dark:border-white/5">
                                        <button onClick={() => updateQty(item.productId, -1)} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-colors">
                                            <MinusIcon className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.productId, 1)} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-colors">
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-xl font-black text-blue-600">KZ {((item.product?.price || 0) * item.quantity).toLocaleString()}</p>
                                     </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                       </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[3rem] border border-blue-100 dark:border-blue-500/20 flex flex-col md:flex-row items-center gap-8">
                       <div className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
                          <LockClosedIcon className="w-8 h-8" />
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase text-blue-900 dark:text-blue-100 mb-1">{t('sentinel_payment_title') || "Pagamento Processado com Sentinela AI"}</h4>
                          <p className="text-xs text-blue-800 dark:text-blue-300">
                             {t('sentinel_payment_desc') || "Nosso protocolo de segurança monitora cada centavo da transação. O vendedor apenas recebe os fundos após a confirmação de recebimento ou prazo de garantia expirado."}
                          </p>
                       </div>
                    </div>
                  </div>
                )}

                {step === 'shipping' && (
                  <div className="bg-white dark:bg-white/5 rounded-[3rem] p-10 border border-gray-100 dark:border-white/10 shadow-sm animate-fade-in">
                     <h3 className="text-2xl font-black uppercase tracking-tighter dark:text-white mb-8 flex items-center gap-3">
                        <TruckIcon className="w-8 h-8 text-blue-600" /> {t('shipping_address')}
                     </h3>
                     <div className="space-y-6">
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">{t('full_address')}</label>
                           <input 
                             type="text" 
                             value={shippingAddress.address}
                             onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
                             className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 rounded-3xl focus:ring-2 focus:ring-blue-600/20 outline-none font-medium transition-all"
                             placeholder={t('address_placeholder') || "Ex: Rua Direita da Samba, n23"}
                           />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                           <div>
                              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">{t('city')}</label>
                              <input 
                                type="text" 
                                value={shippingAddress.city}
                                onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 rounded-3xl focus:ring-2 focus:ring-blue-600/20 outline-none font-medium transition-all"
                                placeholder="Luanda"
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">{t('province')}</label>
                              <input 
                                type="text" 
                                value={shippingAddress.state}
                                onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 rounded-3xl focus:ring-2 focus:ring-blue-600/20 outline-none font-medium transition-all"
                                placeholder="Luanda"
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">{t('zip_code')}</label>
                              <input 
                                type="text" 
                                value={shippingAddress.zipCode}
                                onChange={(e) => setShippingAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 rounded-3xl focus:ring-2 focus:ring-blue-600/20 outline-none font-medium transition-all"
                                placeholder="0000"
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-2 block">{t('carrier')}</label>
                              <input 
                                type="text" 
                                value={shippingAddress.carrierName}
                                onChange={(e) => setShippingAddress(prev => ({ ...prev, carrierName: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 rounded-3xl focus:ring-2 focus:ring-blue-600/20 outline-none font-medium transition-all border-orange-500/20"
                                placeholder={t('carrier_placeholder') || "Ex: Macom"}
                              />
                           </div>
                        </div>
                     </div>
                     
                     <div className="mt-12 flex justify-between">
                        <button 
                            onClick={() => setStep('cart')}
                            className="px-10 py-5 bg-gray-100 dark:bg-white/5 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
                        >
                            {t('back_to_cart')}
                        </button>
                        <button 
                            onClick={() => setStep('payment')}
                            disabled={!shippingAddress.address || !shippingAddress.city || !shippingAddress.carrierName}
                            className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {t('go_to_payment')}
                        </button>
                     </div>
                  </div>
                )}

                {step === 'payment' && (
                  <div className="bg-white dark:bg-white/5 rounded-[3rem] p-10 border border-gray-100 dark:border-white/10 shadow-sm animate-fade-in">
                     <h3 className="text-2xl font-black uppercase tracking-tighter dark:text-white mb-8 flex items-center gap-3">
                        <CreditCardIcon className="w-8 h-8 text-blue-600" /> {t('confirm_payment')}
                     </h3>
                     
                     <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[3rem] border border-gray-100 dark:border-white/10 mb-8">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">{t('active_payment_method') || "Método de Pagamento Ativo"}</p>
                        <div className="flex items-center justify-between p-6 bg-white dark:bg-darkcard rounded-3xl border border-blue-500/30 shadow-lg">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:rotate-6 transition-transform">
                                 <ShoppingBagIcon className="w-8 h-8" />
                              </div>
                              <div>
                                 <h4 className="text-lg font-black dark:text-white uppercase tracking-tighter leading-none mb-1">{t('wallet_label') || "Carteira CyberPhone"}</h4>
                                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('available_balance')}: KZ {currentUser.balance?.toLocaleString()}</p>
                              </div>
                           </div>
                           <CheckCircleIcon className="w-8 h-8 text-blue-600" />
                        </div>
                     </div>

                     <div className="bg-red-500/5 p-6 rounded-3xl border border-red-500/10 mb-10 flex gap-4">
                        <ExclamationCircleIcon className="w-6 h-6 text-red-500 shrink-0" />
                        <p className="text-xs font-medium text-red-500/80">
                           {t('checkout_warning_desc', { total: total.toLocaleString() }) || `Ao clicar em "Finalizar Compra", o valor de KZ ${total.toLocaleString()} será deduzido da sua carteira. Os fundos serão protegidos pela IA Sentinela e liberados ao vendedor somente conforme as regras de segurança da CyberPhone.`}
                        </p>
                     </div>

                     <div className="flex justify-between">
                        <button 
                            onClick={() => setStep('shipping')}
                            className="px-10 py-5 bg-gray-100 dark:bg-white/5 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
                        >
                            {t('change_address') || "Alterar Endereço"}
                        </button>
                        <button 
                            onClick={handleCheckout}
                            disabled={loading}
                            className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {t('processing_transaction')}
                                </>
                            ) : (
                                <>
                                    {t('finish_purchase')} <CheckCircleIcon className="w-5 h-5" />
                                </>
                            )}
                        </button>
                     </div>
                  </div>
                )}
             </div>

             {/* Right Column: Order Summary */}
             <div className="space-y-6">
                <div className="bg-white dark:bg-white/5 rounded-[3rem] p-8 border border-gray-100 dark:border-white/10 shadow-xl sticky top-32">
                   <h3 className="text-lg font-black uppercase dark:text-white tracking-widest mb-8 text-center underline decoration-blue-600 decoration-4 underline-offset-8">{t('order_total')}</h3>
                   <div className="space-y-4 mb-10">
                      <div className="flex justify-between">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('subtotal')}</span>
                         <span className="text-sm font-black dark:text-white tracking-tighter uppercase">KZ {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('shipping_fee')}</span>
                         <span className="text-sm font-black dark:text-white tracking-tighter uppercase">
                            {shippingFee > 0 ? `KZ ${shippingFee.toLocaleString()}` : t('free')}
                         </span>
                      </div>
                      <div className="h-px bg-gray-100 dark:bg-white/10 my-4" />
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-black dark:text-white uppercase tracking-[0.2em]">{t('total')}</span>
                         <span className="text-3xl font-black text-blue-600 tracking-tighter">KZ {total.toLocaleString()}</span>
                      </div>
                   </div>

                   {step === 'cart' && (
                     <button 
                        onClick={() => setStep('shipping')}
                        className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                     >
                        {t('confirm_order')} <ChevronRightIcon className="w-5 h-5" />
                     </button>
                   )}

                   <div className="mt-10 pt-8 border-t dark:border-white/10 space-y-6">
                      <div className="flex gap-4 items-center grayscale opacity-50">
                         <ShieldCheckIcon className="w-5 h-5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">{t('secure_purchase')}</span>
                      </div>
                      <div className="flex gap-4 items-center grayscale opacity-50">
                         <LockClosedIcon className="w-5 h-5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">{t('encrypted_data')}</span>
                      </div>
                   </div>
                </div>

                {/* IA Sentinela Widget */}
                <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] p-6 border border-dashed border-blue-500/30">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                         <ShieldCheckIcon className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">{t('sentinel_ai_active')}</h4>
                   </div>
                   <p className="text-[8px] font-medium text-gray-500 uppercase leading-relaxed text-center">
                      {t('sentinel_audit_desc')}
                   </p>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default CartPage;
