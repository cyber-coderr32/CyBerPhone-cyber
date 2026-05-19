import React, { useState, useEffect } from 'react';
import { User, Page, Transaction, AffiliateSale, OrderStatus, Product } from '../types';
import { getTransactions, getAffiliateSales, getProduct, addProductRating, cancelOrder, confirmProductReceipt, deleteOrder, getGlobalSettings } from '../services/storageService';
import { 
  ShoppingBagIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  ReceiptPercentIcon,
  ArchiveBoxIcon,
  CubeIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftEllipsisIcon,
  TruckIcon,
  MapPinIcon,
  ArchiveBoxArrowDownIcon,
  MagnifyingGlassCircleIcon,
  StarIcon as StarOutline,
  ShieldCheckIcon,
  ChatBubbleOvalLeftIcon,
  XMarkIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';
import { formatCurrency, safeJsonStringify } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface PurchasesPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const ReviewModal = ({ order, product, onClose, onSuccess }: { order: AffiliateSale, product: Product, onClose: () => void, onSuccess: () => void }) => {
    const { t } = useTranslation();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const { showAlert } = useDialog();

    const handleSubmit = async () => {
        if (!comment.trim()) {
            showAlert(t('review_comment_error'), { type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await addProductRating(order.id, rating, comment);
            showAlert(t('review_success'), { type: 'success' });
            onSuccess();
        } catch (err) {
            showAlert(t('review_error'), { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-white dark:bg-[#0a0c10] rounded-[3rem] overflow-hidden border border-gray-100 dark:border-white/10 shadow-2xl"
            >
                <div className="p-8 pb-0 flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">{t('rate_product')}</h3>
                    <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5">
                        <img src={product.imageUrls[0]} className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                            <p className="text-sm font-black uppercase dark:text-white leading-none mb-1">{product.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('order_id') || "Pedido"} #{order.id.slice(-8).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-6">{t('your_rating') || "Sua Nota"}</p>
                        <div className="flex justify-center gap-3">
                            {[1,2,3,4,5].map(star => (
                                <button 
                                    key={star} 
                                    onClick={() => setRating(star)}
                                    className="transform hover:scale-125 transition-transform"
                                >
                                    {star <= rating ? (
                                        <StarSolid className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                                    ) : (
                                        <StarOutline className="w-10 h-10 text-gray-200 dark:text-white/10" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">{t('review_label')}</label>
                        <textarea 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-6 rounded-3xl min-h-[120px] focus:ring-4 focus:ring-blue-600/10 outline-none transition-all text-sm font-medium"
                            placeholder={t('review_placeholder')}
                        />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl flex gap-3">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-[10px] font-bold text-blue-600 uppercase leading-relaxed">
                            {t('sentinel_review_desc')}
                        </p>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('publish_review')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const PurchasesPage: React.FC<PurchasesPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<AffiliateSale[]>([]);
  const [productsCache, setProductsCache] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<AffiliateSale | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showAlert, showConfirm } = useDialog();

  const loadData = async () => {
    setLoading(true);
    try {
      const userOrders = await getAffiliateSales({ buyerId: currentUser.id });
      const sortedOrders = userOrders.sort((a, b) => b.timestamp - a.timestamp);
      setOrders(sortedOrders);

      const uniqueProductIds = Array.from(new Set(userOrders.map(o => o.productId)));
      const productPromises = uniqueProductIds.map(id => getProduct(id));
      const products = await Promise.all(productPromises);
      
      const newCache: Record<string, Product> = {};
      products.forEach((p: Product | null) => {
        if (p) newCache[p.id] = p;
      });
      setProductsCache(newCache);
    } catch (error) {
      console.error("Erro ao carregar compras:", safeJsonStringify(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (order: AffiliateSale) => {
    const orderId = order.id;
    const amount = order.saleAmount;
    try {
        const settings = await getGlobalSettings();
        const isWaitlist = order.status === OrderStatus.WAITLIST;
        const feePercentage = isWaitlist ? 0 : (settings.orderCancellationFeePercentage ?? 5);
        const fee = amount * (feePercentage / 100);
        const refund = amount - fee;

        const message = isWaitlist 
            ? t('cancel_order_waitlist_q', { amount: formatCurrency(amount) })
            : t('cancel_order_fee_q', { feePercentage, fee: formatCurrency(fee), refund: formatCurrency(refund) });

        const confirmed = await showConfirm(
          message,
          { 
            title: isWaitlist ? t('cancel_order_title') : t('renounce_order_title'),
            confirmText: isWaitlist ? t('yes_cancel') : t('yes_renounce'), 
            cancelText: t('no_keep_order') 
          }
        );

        if (!confirmed) return;

        setCancellingId(orderId);
        await cancelOrder(orderId, currentUser.id);
        showAlert(t('order_renounced_success'), { type: 'success' });
        refreshUser();
        await loadData();
    } catch (err: any) {
        showAlert(err.message || t('review_error'), { type: 'error' });
    } finally {
        setCancellingId(null);
    }
  };

  const handleConfirmReceipt = async (orderId: string) => {
    const confirmed = await showConfirm(
        t('confirm_receipt_q'),
        {
            title: t('confirm_receipt'),
            confirmText: t('yes_receipt') || "Sim, Recebi",
            cancelText: t('not_yet') || "Ainda não"
        }
    );

    if (!confirmed) return;

    setConfirmingId(orderId);
    try {
        await confirmProductReceipt(orderId);
        showAlert(t('receipt_confirmed_success'), { type: 'success' });
        await loadData();
    } catch (err: any) {
        showAlert(err.message || t('review_error'), { type: 'error' });
    } finally {
        setConfirmingId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    switch (status) {
      case OrderStatus.COMPLETED:
      case OrderStatus.DELIVERED:
        return <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> {t('delivered_label')}</span>;
      case OrderStatus.PROCESSING:
        return <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 animate-pulse"><ArrowPathIcon className="w-3 h-3" /> {t('in_preparation_label')}</span>;
      case OrderStatus.SHIPPING:
        return <span className="bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><TruckIcon className="w-3 h-3" /> {t('in_transit_label')}</span>;
      case OrderStatus.WAITLIST:
        return <span className="bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {t('awaiting_collection_label')}</span>;
      case OrderStatus.CANCELED:
        return <span className="bg-red-500/10 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1">{t('canceled')}</span>;
      default:
        return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">{status}</span>;
    }
  };

  const getTimeline = (status: OrderStatus) => {
    const steps = [
      { id: OrderStatus.WAITLIST, label: t('confirmed'), icon: CheckCircleIcon },
      { id: OrderStatus.PROCESSING, label: t('processing'), icon: ArchiveBoxIcon },
      { id: OrderStatus.SHIPPING, label: t('sent'), icon: TruckIcon },
      { id: OrderStatus.DELIVERED, label: t('delivered_label'), icon: MapPinIcon },
    ];

    const currentIdx = status === OrderStatus.COMPLETED 
        ? steps.length - 1 
        : steps.findIndex(s => s.id === status);

    return (
      <div className="flex items-center justify-between mt-4 px-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-100 dark:bg-white/5 text-gray-300'
                } ${isCurrent ? 'ring-4 ring-blue-500/20' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'text-blue-600' : 'text-gray-300'}`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-[2px] flex-grow mx-2 rounded-full ${idx < currentIdx ? 'bg-blue-600' : 'bg-gray-100 dark:bg-white/5'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 pb-32">
       <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 dark:text-white flex items-center gap-4">
              {t('my_purchases')} <ShoppingBagIcon className="w-8 h-8 text-indigo-600" />
            </h1>
            <div className="flex items-center gap-2 mt-2">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">{t('cart_sentinel_desc')}</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('store')} 
            className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/10 px-6 py-3 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            {t('explore_store')} <ShoppingBagIcon className="w-4 h-4" />
          </button>
       </div>

       {loading ? (
         <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-white/5 h-48 rounded-[2.5rem] animate-pulse border border-gray-100 dark:border-white/10" />
            ))}
         </div>
       ) : orders.length > 0 ? (
         <div className="space-y-6">
            {orders.map((order) => {
              const product = productsCache[order.productId];
              const isExpanded = selectedOrder === order.id;

              return (
                <motion.div 
                  layout
                  key={order.id} 
                  className="bg-white dark:bg-white/5 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 dark:border-white/10">
                        {product?.imageUrls?.[0] ? (
                          <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <CubeIcon className="w-10 h-10 text-gray-300" />
                        )}
                      </div>
                      
                      <div className="flex-grow text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                          <StatusBadge status={order.status} />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(order.timestamp).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-1 line-clamp-1">
                          {product?.name || '...'}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('order_id')}: #{order.id.slice(-8).toUpperCase()}</p>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-center md:items-end">
                        <p className="text-2xl font-black text-gray-900 dark:text-white mb-2">{formatCurrency(order.saleAmount)}</p>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => setSelectedOrder(isExpanded ? null : order.id)}
                             className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                           >
                              {isExpanded ? t('see_less') : t('track')}
                           </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pt-8 border-t dark:border-white/10 mt-6"
                        >
                          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">{t('track_status')}</h4>
                          {getTimeline(order.status)}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                            {/* Tracking Info */}
                            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                              <h5 className="text-[10px] font-black uppercase text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <TruckIcon className="w-4 h-4 text-blue-600" /> {t('logistics')}
                              </h5>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">{t('carrier')}</p>
                                  <p className="text-sm font-black text-gray-900 dark:text-white">{order.carrierName || t('in_definition')}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">{t('tracking_code')}</p>
                                  <p className="text-sm font-black text-blue-600 font-mono tracking-tighter uppercase">{order.trackingCode || t('not_available')}</p>
                                </div>
                              </div>
                            </div>

                            {/* Shipping Address */}
                            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                              <h5 className="text-[10px] font-black uppercase text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-emerald-600" /> {t('destination')}
                              </h5>
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{order.shippingAddress?.address}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.zipCode}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 flex justify-end gap-3 px-2">
                            <button className="flex items-center gap-2 px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-blue-600 rounded-2xl transition-all font-black uppercase text-[9px] tracking-widest">
                              <ChatBubbleLeftEllipsisIcon className="w-5 h-5" /> {t('support')}
                            </button>
                            {!order.isRated && (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED) && (
                                <button 
                                    onClick={() => setRatingOrder(order)}
                                    className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl transition-all font-black uppercase text-[9px] tracking-widest shadow-xl shadow-blue-600/30 active:scale-95"
                                >
                                    <StarSolid className="w-5 h-5 text-yellow-400" /> {t('rate_product')}
                                </button>
                            )}
                            {order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.DELIVERED && (
                                <button 
                                    onClick={() => handleCancelOrder(order)}
                                    disabled={cancellingId === order.id}
                                    className="flex items-center gap-2 px-6 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all font-black uppercase text-[9px] tracking-widest disabled:opacity-50"
                                >
                                    {cancellingId === order.id ? (
                                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <ArrowUturnLeftIcon className="w-5 h-5" />
                                    )} {t('renounce_order_title')}
                                </button>
                            )}
                            {(order.status === OrderStatus.CANCELED || order.status === OrderStatus.COMPLETED) && (
                                <button 
                                    onClick={async () => {
                                      const confirmed = await showConfirm(
                                        t('delete_history_q'),
                                        { title: t('delete_order_title'), confirmText: t('yes_delete'), cancelText: t('no') }
                                      );
                                      if (confirmed) {
                                        setDeletingId(order.id);
                                        try {
                                          const success = await deleteOrder(order.id);
                                          if (success) {
                                            showAlert(t('order_removed_success'), { type: 'success' });
                                            await loadData();
                                          } else {
                                            showAlert(t('checkout_error'), { type: 'error' });
                                          }
                                        } catch (err) {
                                          showAlert(t('checkout_error'), { type: 'error' });
                                        } finally {
                                          setDeletingId(null);
                                        }
                                      }
                                    }}
                                    disabled={deletingId === order.id}
                                    className="flex items-center gap-2 px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all font-black uppercase text-[9px] tracking-widest disabled:opacity-50"
                                >
                                    {deletingId === order.id ? (
                                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <ArchiveBoxIcon className="w-5 h-5" />
                                    )} {t('delete_order_title')}
                                </button>
                            )}
                            {order.status === OrderStatus.SHIPPING || order.status === OrderStatus.DELIVERED ? (
                                <button 
                                    onClick={() => handleConfirmReceipt(order.id)}
                                    disabled={confirmingId === order.id}
                                    className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl transition-all font-black uppercase text-[9px] tracking-widest shadow-xl shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                                >
                                    {confirmingId === order.id ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircleIcon className="w-5 h-5" />
                                    )} {t('confirm_receipt')}
                                </button>
                            ) : null}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
         </div>
       ) : (
         <div className="py-24 bg-white dark:bg-white/5 rounded-[3rem] border border-gray-100 dark:border-white/10 text-center">
            <ArchiveBoxIcon className="w-16 h-16 text-gray-200 mx-auto mb-6" />
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2">{t('no_purchases')}</h3>
            <p className="text-gray-400 text-sm font-medium mb-10 max-w-xs mx-auto">{t('no_purchases_desc')}</p>
            <button 
              onClick={() => onNavigate('store')}
              className="bg-blue-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
            >
               {t('go_to_shopping')}
            </button>
         </div>
       )}

       <AnimatePresence>
          {ratingOrder && productsCache[ratingOrder.productId] && (
              <ReviewModal 
                order={ratingOrder} 
                product={productsCache[ratingOrder.productId]!} 
                onClose={() => setRatingOrder(null)}
                onSuccess={() => {
                    setRatingOrder(null);
                    loadData();
                }}
              />
          )}
       </AnimatePresence>

       <div className="mt-16 pt-10 border-t dark:border-white/10 text-center">
          <div className="flex flex-col items-center gap-4 mb-8">
             <div className="flex items-center gap-3 px-6 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-full border border-blue-500/20">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{t('sentinel_protected_trans')}</span>
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase max-w-md">
                {t('sentinel_trans_desc')}
             </p>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">{t('guarantee_label')}</p>
          <div className="flex items-center justify-center gap-8 opacity-40 grayscale">
             <ReceiptPercentIcon className="w-8 h-8" />
             <CheckCircleIcon className="w-8 h-8" />
             <CubeIcon className="w-8 h-8" />
          </div>
       </div>
    </div>
  );
};

export default PurchasesPage;
