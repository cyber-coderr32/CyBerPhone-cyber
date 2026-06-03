import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon, ShoppingBagIcon, ChevronRightIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { User, Product, CartItem } from '../types';
import { getProduct, findUserById } from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';
import { safeJsonStringify } from '../lib/utils';
import { useDialog } from '../services/DialogContext';

interface CartItemExt extends CartItem {
  product?: Product;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  onCheckout: () => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, cart, setCart, onCheckout }) => {
  const { showAlert } = useDialog();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrationCart, setHydrationCart] = useState<CartItemExt[]>([]);

  useEffect(() => {
    const uid = localStorage.getItem('cyberphone_current_user_id');
    if (uid) {
      findUserById(uid).then(user => {
        if (user) setCurrentUser(user);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      hydrateCart();
    }
  }, [isOpen, cart]);

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
    const newCart = cart.filter(i => i.productId !== pid);
    setCart(newCart);
  };

  const updateQty = (pid: string, delta: number) => {
    const newCart = cart.map(i => {
      if (i.productId === pid) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    });
    setCart(newCart);
  };

  const subtotal = hydrationCart.reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-lg bg-white dark:bg-[#0a0c10] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-8 pb-4 flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white tracking-tighter">Carrinho</h2>
                <p className="text-[10px] font-black uppercase text-brand tracking-widest">{cart.length} ITENS SELECIONADOS</p>
            </div>
            <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all">
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
            {loading && cart.length > 0 && hydrationCart.length === 0 ? (
                <div className="py-20 flex justify-center">
                    <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
            ) : hydrationCart.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <ShoppingBagIcon className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-black uppercase text-gray-400">Seu carrinho está vazio</h3>
                    <button onClick={onClose} className="text-brand font-black text-xs uppercase underline">Explorar Loja</button>
                </div>
            ) : (
                <AnimatePresence>
                    {hydrationCart.map((item) => (
                        <motion.div 
                            key={item.productId}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex gap-4 group"
                        >
                            <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0 border border-gray-100 dark:border-white/5 shadow-sm">
                                <img src={item.product?.imageUrls?.[0]} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase leading-none mb-1">{item.product?.name}</h4>
                                    <p className="text-[11px] font-black text-brand">KZ {item.product?.price.toLocaleString()}</p>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                                        <button onClick={() => updateQty(item.productId, -1)} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                                            <MinusIcon className="w-3 h-3" />
                                        </button>
                                        <span className="text-[11px] font-black w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.productId, 1)} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                                            <PlusIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <button onClick={() => removeItem(item.productId)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>

        {hydrationCart.length > 0 && (
            <div className="p-8 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Calculado</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white underline decoration-brand decoration-4 underline-offset-4">KZ {subtotal.toLocaleString()}</p>
                    </div>
                </div>
                <button 
                    onClick={() => {
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
                          showAlert("Sua conta está em MODO RESTRITO por falta de verificação de identidade. Por favor, conclua a Verificação de Identidade em Configurações para finalizar a compra.", { type: "error" });
                          return;
                        }
                        onCheckout();
                    }}
                    className="w-full bg-brand text-white py-6 rounded-3xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-xl shadow-brand/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    Finalizar Compra
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        )}
      </motion.div>
    </div>
  );
};

export default CartModal;
