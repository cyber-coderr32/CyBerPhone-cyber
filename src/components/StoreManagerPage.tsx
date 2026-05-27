import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  User,
  Store,
  Product,
  ProductType,
  OrderStatus,
  AffiliateSale,
  GlobalSettings,
  AdminSignal,
} from "../types";
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
  getGlobalSettings,
  deleteOrder,
  promoteProduct,
  payStoreVerificationFee,
} from "../services/storageService";
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
  ExclamationTriangleIcon,
  BellAlertIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  ScaleIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/solid";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingBagIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import { useDialog } from "../services/DialogContext";
import { formatCurrency, safeJsonStringify } from "../lib/utils";
import ConfirmationModal, { ConfirmationType } from "./ConfirmationModal";
import { checkContent, checkImageSecurity } from "../services/sentinelService";
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
  Cell,
} from "recharts";

interface StoreManagerPageProps {
  currentUser: User;
  refreshUser: () => void;
  onNavigate: (page: any, params?: any) => void;
  params?: any;
}

type ManagerTab =
  | "dashboard"
  | "inventory"
  | "orders"
  | "branding"
  | "affiliates"
  | "verification";

const BRAND_COLORS = [
  { name: "Azul CyBer", hex: "#2563eb" },
  { name: "Roxo Royal", hex: "#7c3aed" },
  { name: "Verde Mint", hex: "#10b981" },
  { name: "Preto Carbono", hex: "#0f172a" },
  { name: "Laranja Solar", hex: "#f59e0b" },
  { name: "Rosa Shock", hex: "#db2777" },
];

const CATEGORIES = [
  "Tech & Gadgets",
  "Moda Masculina",
  "Moda Feminina",
  "Casa Inteligente",
  "Fitness",
  "Beleza",
];

const ITEMS_PER_PAGE = 8;

const Pagination = ({
  total,
  current,
  onChange,
}: {
  total: number;
  current: number;
  onChange: (p: number) => void;
}) => {
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="p-2 rounded-xl border border-gray-100 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <div className="flex gap-2">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-10 h-10 rounded-xl font-black transition-all ${
              current === p
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        disabled={current === totalPages}
        onClick={() => onChange(current + 1)}
        className="p-2 rounded-xl border border-gray-100 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

const StoreManagerPage: React.FC<StoreManagerPageProps> = ({
  currentUser,
  refreshUser,
  onNavigate,
  params,
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Primary States
  const [pType, setPType] = useState<ProductType>(ProductType.DIGITAL_COURSE);
  const [userStore, setUserStore] = useState<Store | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeSales, setStoreSales] = useState<AffiliateSale[]>([]);
  const [storeAffiliateLinks, setStoreAffiliateLinks] = useState<any[]>([]);
  const [buyerProfiles, setBuyerProfiles] = useState<Record<string, User>>({});
  const [activeTab, setActiveTab] = useState<ManagerTab>(
    params?.tab || "dashboard",
  );
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination

  const [invPage, setInvPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [pFormStep, setPFormStep] = useState(1);

  // Digital Product Specifics
  const [pPageCount, setPPageCount] = useState("");
  const [pFileFormat, setPFileFormat] = useState("PDF");
  const [pFileSize, setPFileSize] = useState("");

  const [brandName, setBrandName] = useState("");
  const [brandDesc, setBrandDesc] = useState("");
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[0].hex);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  // Product Form
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pCategory, setPCategory] = useState(CATEGORIES[0]);
  const [pPrice, setPPrice] = useState("");
  const [pImageUrls, setPImageUrls] = useState<string[]>([]);
  const [pOriginalPrice, setPOriginalPrice] = useState("");
  const [pDiscount, setPDiscount] = useState("");
  const [pHasFreeShipping, setPHasFreeShipping] = useState(true);
  const [pShippingFee, setPShippingFee] = useState("");
  const [pCondition, setPCondition] = useState<"NEW" | "USED">("NEW");

  // Bidding & Positioning
  const [pPositioning, setPPositioning] = useState<
    "STANDARD" | "TOP_SEARCH" | "MAIN_BANNER"
  >("STANDARD");
  const [pBidAmount, setPBidAmount] = useState("");
  const [pPromotionDays, setPPromotionDays] = useState<number>(0);

  // Details
  const [pStock, setPStock] = useState("100");
  const [pWeight, setPWeight] = useState("");
  const [pDimensions, setPDimensions] = useState("");

  const [pLessonsCount, setPLessonsCount] = useState("");
  const [pTotalHours, setPTotalHours] = useState("");
  const [pHasCertificate, setPHasCertificate] = useState(true);
  const [pModules, setPModules] = useState("");

  const [pDigitalUrl, setPDigitalUrl] = useState("");
  const [pAffiliateRate, setPAffiliateRate] = useState("10");
  const [pBrand, setPBrand] = useState("");
  const [pSku, setPSku] = useState("");
  const [pVideoUrl, setPVideoUrl] = useState("");
  const [pAttributes, setPAttributes] = useState<
    { name: string; value: string }[]
  >([]);
  const [pVariants, setPVariants] = useState<
    { id: string; name: string; price: number; stock: number; sku?: string }[]
  >([]);

  const [uploading, setUploading] = useState(false);

  // Form Steps configuration
  const FORM_STEPS = useMemo(() => {
    return [
      { id: 1, name: "Básico", icon: ArchiveBoxIcon },
      { id: 2, name: "Galeria", icon: PhotoIcon },
      { id: 3, name: "Configuração", icon: RocketLaunchIcon }, // Dynamic content based on type
      { id: 4, name: "Atributos", icon: TagIcon },
      { id: 5, name: "Financeiro", icon: CurrencyDollarIcon },
      { id: 6, name: "Logística", icon: TruckIcon },
      { id: 7, name: "Marketing", icon: RocketLaunchIcon },
    ].filter((step) => {
      // Hide Logística for non-physical products
      if (step.id === 6 && pType !== ProductType.PHYSICAL) return false;
      return true;
    });
  }, [pType]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trackingModal, setTrackingModal] = useState<{ saleId: string } | null>(
    null,
  );
  const [trackingCode, setTrackingCode] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");

  // Confirmation Modal
  const [deleteProductTarget, setDeleteProductTarget] = useState<string | null>(
    null,
  );
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const totalRevenue = storeSales.reduce(
      (acc, sale) => acc + sale.saleAmount,
      0,
    );
    const totalProfit = storeSales.reduce(
      (acc, sale) => acc + sale.saleAmount,
      0,
    );

    const pendingOrders = storeSales.filter(
      (s) => s.status !== OrderStatus.COMPLETED,
    ).length;
    const completedOrders = storeSales.filter(
      (s) => s.status === OrderStatus.COMPLETED,
    ).length;

    // Process stock
    const lowStockProducts = storeProducts.filter(
      (p) =>
        p.type === ProductType.PHYSICAL &&
        p.physicalDetails &&
        p.physicalDetails.stock < 10,
    );

    // Sales by Period (Last 7 days)
    const salesByDay: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      salesByDay[key] = 0;
    }

    storeSales.forEach((sale) => {
      const date = new Date(sale.timestamp);
      const key = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      if (salesByDay[key] !== undefined) {
        salesByDay[key] += sale.saleAmount;
      }
    });

    const chartData = Object.entries(salesByDay).map(([name, value]) => ({
      name,
      value,
    }));

    // Top Products
    const productSales: Record<string, number> = {};
    storeSales.forEach((s) => {
      productSales[s.productId] = (productSales[s.productId] || 0) + 1;
    });

    const topProducts = Object.entries(productSales)
      .map(([id, count]) => ({
        id,
        count,
        product: storeProducts.find((p) => p.id === id),
      }))
      .filter((item) => item.product)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const pendingEarnings = storeSales
      .filter(
        (s) =>
          s.status !== OrderStatus.COMPLETED &&
          s.status !== OrderStatus.CANCELED,
      )
      .reduce((acc, sale) => acc + (sale.sellerEarnings || 0), 0);

    const affiliateStats: Record<
      string,
      { count: number; revenue: number; user?: User }
    > = {};
    storeSales.forEach((s) => {
      if (s.affiliateUserId) {
        if (!affiliateStats[s.affiliateUserId]) {
          affiliateStats[s.affiliateUserId] = {
            count: 0,
            revenue: 0,
            user: buyerProfiles[s.affiliateUserId],
          };
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
      topAffiliates,
    };
  }, [storeSales, storeProducts, buyerProfiles]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stores, currentSettings] = await Promise.all([
        getStores(),
        getGlobalSettings(),
      ]);
      setSettings(currentSettings);
      const myStore = stores.find((s) => s.userId === currentUser.id);
      if (myStore) {
        setUserStore(myStore);
        setBrandName(myStore.name);
        setBrandDesc(myStore.description);
        setBrandColor(myStore.brandColor || BRAND_COLORS[0].hex);
        const allProds = await getProducts();
        const myProducts = allProds.filter((p) => p.storeId === myStore.id);
        setStoreProducts(myProducts);

        if (params?.editProductId) {
          const matchingProduct = myProducts.find(p => p.id === params.editProductId);
          if (matchingProduct) {
            setTimeout(() => {
              openEditModal(matchingProduct);
            }, 100);
          }
        }

        const allSales = await getAffiliateSales({ sellerId: currentUser.id });
        const links = await getAffiliateLinks(undefined, currentUser.id);
        setStoreAffiliateLinks(links);

        // Carregar perfis dos compradores e afiliados
        const buyerIds = Array.from(
          new Set([
            ...allSales.map((s) => s.buyerId),
            ...(allSales
              .map((s) => s.affiliateUserId)
              .filter(Boolean) as string[]),
            ...links.map((l) => l.affiliateId),
          ]),
        );
        const profiles: Record<string, User> = { ...buyerProfiles };
        await Promise.all(
          buyerIds.map(async (id) => {
            if (!profiles[id]) {
              const u = await findUserById(id);
              if (u) profiles[id] = u;
            }
          }),
        );
        setBuyerProfiles(profiles);

        // Deduplicação Avançada:
        const idDedupedMap = new Map<string, AffiliateSale>();
        allSales.forEach((s) => {
          if (s.id) {
            const existing = idDedupedMap.get(s.id);
            if (
              !existing ||
              statusRank(s.status) > statusRank(existing.status)
            ) {
              idDedupedMap.set(s.id, s);
            }
          }
        });

        const uniqueByContentMap = new Map<string, AffiliateSale>();
        Array.from(idDedupedMap.values())
          .sort((a, b) => a.timestamp - b.timestamp)
          .forEach((sale) => {
            const date = new Date(sale.timestamp);
            const hourKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
            const halfHour = Math.floor(date.getMinutes() / 30);
            const logicalKey = `${sale.buyerId}-${sale.productId}-${hourKey}-${halfHour}`;
            const existing = uniqueByContentMap.get(logicalKey);
            if (
              !existing ||
              statusRank(sale.status) > statusRank(existing.status)
            ) {
              uniqueByContentMap.set(logicalKey, sale);
            }
          });

        const finalSales = Array.from(uniqueByContentMap.values());
        setStoreSales(finalSales.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error("Error loading store manager data:", safeJsonStringify(error));
      showAlert("Erro ao carregar dados da loja.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Helper para ranking de status
  const statusRank = (status: string) => {
    const ranks: Record<string, number> = {
      [OrderStatus.WAITLIST]: 1,
      [OrderStatus.PROCESSING]: 2,
      [OrderStatus.SHIPPING]: 3,
      [OrderStatus.DELIVERED]: 4,
      [OrderStatus.COMPLETED]: 5,
      [OrderStatus.DISPUTED]: 0,
    };
    return ranks[status] || 0;
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id, params]);



  const handleSaveBranding = async () => {
    if (!userStore) return;
    const updated = {
      ...userStore,
      name: brandName,
      description: brandDesc,
      brandColor,
    };
    await updateStore(updated);
    setUserStore(updated);
    showAlert("Identidade visual da loja atualizada!", { type: "success" });
  };

  const handlePayVerification = async (signal: AdminSignal) => {
    if (!userStore || !signal.requiresPayment || !signal.paymentAmount) return;
    
    const confirmed = await showConfirm(
      `Deseja pagar a taxa de verificação de ${formatCurrency(signal.paymentAmount)}?`,
      { type: 'confirm' }
    );
    
    if (confirmed) {
      setLoading(true);
      try {
        const success = await payStoreVerificationFee(
          userStore.id, 
          signal.id, 
          currentUser.id, 
          signal.paymentAmount
        );
        if (success) {
          showAlert('Pagamento realizado com sucesso! Sua verificação está sendo processada.', { type: 'success' });
          loadData();
          refreshUser();
        } else {
          showAlert('Saldo insuficiente ou erro no pagamento.', { type: 'error' });
        }
      } catch (err) {
        showAlert('Erro ao processar pagamento.', { type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          // Convert image to base64 for Sentinel check
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          const imageSentinelResult = await checkImageSecurity(base64, file.type);
          if (!imageSentinelResult.allowed) {
            showAlert(`Imagem "${file.name}" bloqueada: ${imageSentinelResult.reason}`, { type: "error", title: "Sentinela AI" });
            continue; // Skip this image
          }
        }
        const url = await uploadFile(file, "products");
        newUrls.push(url);
      }
      setPImageUrls((prev) => [...prev, ...newUrls]);
    } catch (err) {
      showAlert("Erro ao enviar imagens do produto.", { type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const removeProductImage = (index: number) => {
    setPImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userStore || uploading) return;

    const isRestrictedUser = (user: any) => {
      if (!user) return false;
      const emailLower = (user.email || '').toLowerCase().trim();
      const isAdminEmail = emailLower === 'alfaajmc@gmail.com' || emailLower === 'ac926815124@gmail.com';
      if (user.isAdmin || isAdminEmail) return false;
      
      const verificationStatus = user.idVerificationStatus || 'NOT_STARTED';
      const isExpired = user.idVerificationDocs?.expiresAt && user.idVerificationDocs.expiresAt < Date.now();
      const hasApprovedVerification = user.isVerified === true || String(user.isVerified) === 'true' || (verificationStatus === 'APPROVED' && !isExpired);
      return !hasApprovedVerification;
    };

    if (isRestrictedUser(currentUser)) {
      showAlert("Sua conta está em MODO RESTRITO por falta de verificação de identidade. Por favor, conclua a Verificação de Identidade em Configurações para vender e gerenciar produtos.", { type: "error", title: "Acesso Restrito" });
      return;
    }

    // Sentinel AI Check
    const combinedContent = `${pName} ${pDesc}`;
    const sentinelResult = await checkContent(combinedContent, "product");
    if (!sentinelResult.isSafe) {
      showAlert(
        sentinelResult.reason ||
          "Produto bloqueado por violar as políticas de segurança.",
        { type: "error", title: "Sentinela de Segurança" },
      );
      return;
    }

    // Positioning Bid Validation
    if (pPositioning !== "STANDARD" && settings?.positioningMinBid) {
      const bid = pBidAmount ? parseFloat(pBidAmount) : 0;
      if (bid < settings.positioningMinBid) {
        showAlert(
          `O lance mínimo para posicionamento especial é de ${formatCurrency(settings.positioningMinBid)}.`,
          { type: "error" },
        );
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
      status: "active",
      price: parseFloat(pPrice),
      originalPrice: pOriginalPrice ? parseFloat(pOriginalPrice) : undefined,
      discountPercentage: pDiscount ? parseFloat(pDiscount) : undefined,
      imageUrls:
        pImageUrls.length > 0
          ? pImageUrls
          : ["https://picsum.photos/400/400?random=prod"],
      affiliateCommissionRate: parseFloat(pAffiliateRate) || 0,
      type: pType,
      ratings: editingProduct ? editingProduct.ratings : [],
      averageRating: editingProduct ? editingProduct.averageRating : 0,
      ratingCount: editingProduct ? editingProduct.ratingCount : 0,
      soldCount: editingProduct ? editingProduct.soldCount : 0,
      digitalContentUrl:
        pType !== ProductType.PHYSICAL ? pDigitalUrl : undefined,
      condition: pCondition,
      brand: pBrand,
      sku: pSku,
      videoUrl: pVideoUrl,
      attributes: pAttributes,
      variants: pVariants,

      // Novos campos
      hasFreeShipping: pHasFreeShipping,
      shippingFee: pHasFreeShipping ? 0 : parseFloat(pShippingFee || "0"),
      positioning: pPositioning,
      bidAmount: pBidAmount ? parseFloat(pBidAmount) : 0,
      promotionDays: pPromotionDays,
      promotedUntil: pPromotionDays > 0 ? Date.now() + (pPromotionDays * 24 * 60 * 60 * 1000) : undefined,

      physicalDetails:
        pType === ProductType.PHYSICAL
          ? {
              stock: parseInt(pStock),
              weight: pWeight ? parseFloat(pWeight) : undefined,
              dimensions: pDimensions || undefined,
            }
          : undefined,

      courseDetails:
        pType === ProductType.DIGITAL_COURSE
          ? {
              lessonsCount: parseInt(pLessonsCount || "0"),
              totalHours: parseFloat(pTotalHours || "0"),
              hasCertificate: pHasCertificate,
              modules: pModules.split("\n").filter((m) => m.trim()),
            }
          : undefined,

      digitalDetails:
        pType === ProductType.DIGITAL_EBOOK ||
        pType === ProductType.DIGITAL_OTHER
          ? {
              fileFormat: pFileFormat,
              pageCount: pPageCount ? parseInt(pPageCount) : undefined,
              fileSize: pFileSize || undefined,
            }
          : undefined,
    };

    try {
      if (editingProduct) {
        // We need an updateProduct function in storageService, but createProduct uses setDoc which overwrites
        await createProduct(productData);

        // Se o usuário selecionou promoção no modo edição, processa o pagamento
        if (pPromotionDays > 0 && (!editingProduct.promotedUntil || editingProduct.promotedUntil < Date.now())) {
            const costPerDay = settings?.promotedCarouselMinBidPerDay || 500;
            await promoteProduct(currentUser.id, editingProduct.id, pPromotionDays, costPerDay);
        }
      } else {
        await createProduct(productData);
        
        // Se o usuário selecionou promoção no modo criação, processa o pagamento
        if (pPromotionDays) {
            const costPerDay = settings?.promotedCarouselMinBidPerDay || 500;
            await promoteProduct(currentUser.id, productData.id, pPromotionDays, costPerDay);
        }
      }

      setIsAddingProduct(false);
      setEditingProduct(null);
      setPImageUrls([]);
      setPName("");
      setPDesc("");
      setPPrice("");
      setPDigitalUrl("");
      setPOriginalPrice("");
      setPDiscount("");
      setPHasFreeShipping(true);
      setPShippingFee("");
      setPPositioning("STANDARD");
      setPBidAmount("");
      setPPromotionDays(0);
      setPStock("100");
      setPWeight("");
      setPDimensions("");
      setPLessonsCount("");
      setPTotalHours("");
      setPHasCertificate(true);
      setPModules("");
      setPAffiliateRate("10");
      setPBrand("");
      setPSku("");
      setPVideoUrl("");
      setPAttributes([]);
      setPVariants([]);
      loadData();
      showAlert(
        editingProduct ? "Produto atualizado!" : "Produto criado com sucesso!",
        { type: "success" },
      );
    } catch (err: any) {
      if (err.message?.includes("SENTINEL_BLOCK")) {
        showAlert(err.message.replace("SENTINEL_BLOCK: ", ""), {
          type: "error",
          title: "Sentinela de Segurança",
        });
      } else {
        showAlert("Erro ao salvar produto.", { type: "error" });
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
    setPDigitalUrl(p.digitalContentUrl || "");
    setPCondition(p.condition || "NEW");
    setPAffiliateRate(p.affiliateCommissionRate?.toString() || "10");
    setPBrand(p.brand || "");
    setPSku(p.sku || "");
    setPVideoUrl(p.videoUrl || "");
    setPAttributes(p.attributes || []);
    setPVariants(p.variants?.map((v) => ({ ...v })) || []);

    setPOriginalPrice(p.originalPrice?.toString() || "");
    setPDiscount(p.discountPercentage?.toString() || "");
    setPHasFreeShipping(p.hasFreeShipping ?? true);
    setPShippingFee(p.shippingFee?.toString() || "");
    setPPositioning(p.positioning || "STANDARD");
    setPBidAmount(p.bidAmount?.toString() || "");
    setPPromotionDays(p.promotionDays || 0);

    if (p.physicalDetails) {
      setPStock(p.physicalDetails.stock.toString());
      setPWeight(p.physicalDetails.weight?.toString() || "");
      setPDimensions(p.physicalDetails.dimensions || "");
    }

    if (p.courseDetails) {
      setPLessonsCount(p.courseDetails.lessonsCount.toString());
      setPTotalHours(p.courseDetails.totalHours.toString());
      setPHasCertificate(p.courseDetails.hasCertificate);
      setPModules(p.courseDetails.modules.join("\n"));
    }

    if (p.digitalDetails) {
      setPFileFormat(p.digitalDetails.fileFormat);
      setPPageCount(p.digitalDetails.pageCount?.toString() || "");
      setPFileSize(p.digitalDetails.fileSize || "");
    }

    setIsAddingProduct(true);
    setPFormStep(1);
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
    await updateSaleTracking(
      trackingModal.saleId,
      trackingCode,
      supplierOrderId,
    );
    setTrackingModal(null);
    setTrackingCode("");
    setSupplierOrderId("");
    loadData();
    showAlert("Código de rastreio atualizado!", { type: "success" });
  };

  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [creationStep, setCreationStep] = useState(1);
  const [newStoreName, setNewStoreName] = useState(
    `${currentUser.firstName}'s Store`,
  );
  const [newStoreDesc, setNewStoreDesc] = useState(
    `A loja oficial de ${currentUser.firstName}. Qualidade e exclusividade garantidas.`,
  );
  const [newStoreColor, setNewStoreColor] = useState(BRAND_COLORS[0].hex);
  const [creationLoading, setCreationLoading] = useState(false);

  const handleCreateStoreWizard = async () => {
    setCreationLoading(true);
    try {
      // IA Sentinela Auditing
      const audit = await checkContent(
        newStoreName + " " + newStoreDesc,
        "store",
      );
      if (!audit.isSafe) {
        showAlert(
          audit.reason ||
            "O nome ou descrição da loja contém termos impróprios para o protocolo de segurança.",
          { type: "error", title: "Sentinela AI" },
        );
        return;
      }

      const newStore: Store = {
        id: generateUUID(),
        userId: currentUser.id,
        name: newStoreName,
        description: newStoreDesc,
        brandColor: newStoreColor,
        productIds: [],
      };

      const success = await createStore(newStore);
      if (success) {
        loadData();
        setIsCreatingStore(false);
        showAlert(
          "Sua Loja Pro foi ativada com sucesso! Bem-vindo ao ecossistema CyberPhone.",
          { type: "success" },
        );
      } else {
        showAlert("Erro ao ativar loja. Tente novamente mais tarde.", {
          type: "error",
        });
      }
    } catch (err) {
      showAlert("Erro no protocolo de criação.", { type: "error" });
    } finally {
      setCreationLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userStore) {
    return (
      <div className="container mx-auto px-4 pt-12 pb-32 max-w-6xl animate-fade-in">
        {/* Landing Page for Sellers */}
        <div className="relative rounded-[2rem] md:rounded-[4rem] overflow-hidden bg-white dark:bg-darkcard border border-gray-100 dark:border-white/10 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 md:p-20 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-8 self-start">
                <RocketLaunchIcon className="w-4 h-4" /> Venda para milhares de
                pessoas
              </div>
              <h1 className="text-3xl md:text-7xl font-black tracking-tighter dark:text-white leading-[0.95] uppercase mb-8">
                Transforme seu{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Talento
                </span>{" "}
                em um Império.
              </h1>
              <p className="text-gray-500 text-sm md:text-lg font-medium leading-relaxed mb-12 max-w-md">
                Abra sua loja no CyberPhone em minutos. Venda produtos físicos
                ou digitais sem taxas extras de ativação e com gestão completa
                de afiliados.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                <div className="flex gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                    <CheckBadgeIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-black dark:text-white uppercase">
                      Gestão 100%
                    </h4>
                    <p className="text-[10px] md:text-xs text-gray-500">
                      Controle total de estoque e faturamento.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                    <ShareIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-black dark:text-white uppercase">
                      Rede de Afiliados
                    </h4>
                    <p className="text-[10px] md:text-xs text-gray-500">
                      Milhares de promotores para seus itens.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setIsCreatingStore(true)}
                  className="px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Ativar Loja Pro - GRATUITO
                </button>
                <button
                  onClick={() => onNavigate("legal")}
                  className="px-10 py-5 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
                >
                  Ler Regulamento
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-10 flex items-center justify-center relative overflow-hidden hidden lg:flex">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/5 blur-[120px] rounded-full"></div>
              <div className="relative grid grid-cols-2 gap-4 w-full max-w-sm">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`bg-white dark:bg-darkcard p-4 rounded-[2.5rem] shadow-xl border border-white/10 ${i % 2 === 0 ? "translate-y-8" : ""}`}
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-white/5 rounded-2xl mb-4 animate-pulse"></div>
                    <div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full w-3/4 mb-2"></div>
                    <div className="h-4 bg-blue-600/10 rounded-full w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      {isCreatingStore && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0a0c10] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-gray-100 dark:border-white/10 shadow-2xl relative max-h-[95vh] flex flex-col">
            <div className="shrink-0 absolute top-0 left-0 w-full h-1.5 flex z-10">
              <div
                className={`h-full bg-blue-600 transition-all duration-500 ${creationStep === 1 ? "w-1/3" : creationStep === 2 ? "w-2/3" : "w-full"}`}
              ></div>
              <div className="h-full bg-gray-100 flex-grow"></div>
            </div>

            <div className="p-8 md:p-16 overflow-y-auto">
              {creationStep === 1 && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-8 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <PaintBrushIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter dark:text-white">
                        Aparência da Loja
                      </h3>
                      <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Passo 1 de 3: Identidade Visual
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">
                        Nome da Sua Marca
                      </label>
                      <input
                        type="text"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 md:p-6 rounded-2xl md:rounded-3xl focus:ring-4 focus:ring-blue-600/10 outline-none transition-all text-lg md:text-xl font-black uppercase tracking-tighter"
                        placeholder="Ex: Cyber Galaxy Store"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">
                        Cor da Marca
                      </label>
                      <div className="flex flex-wrap gap-2 md:gap-4">
                        {BRAND_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => setNewStoreColor(c.hex)}
                            className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl transition-all relative ${newStoreColor === c.hex ? "scale-110 shadow-xl" : "opacity-40 grayscale-50 hover:opacity-100"}`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {newStoreColor === c.hex && (
                              <CheckBadgeIcon className="w-5 h-5 md:w-6 md:h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 md:mt-16 flex justify-end">
                    <button
                      onClick={() => setCreationStep(2)}
                      className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl md:rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {creationStep === 2 && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-8 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <TagIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter dark:text-white">
                        Sobre o Negócio
                      </h3>
                      <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Passo 2 de 3: Descrição e Alinhamento
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">
                        Slogan / Descrição da Loja
                      </label>
                      <textarea
                        value={newStoreDesc}
                        onChange={(e) => setNewStoreDesc(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-5 md:p-6 rounded-2xl md:rounded-3xl min-h-[100px] md:min-h-[120px] focus:ring-4 focus:ring-blue-600/10 outline-none transition-all text-sm font-medium leading-relaxed"
                        placeholder="Conte um pouco sobre o que você vende..."
                      />
                    </div>

                    <div className="p-4 md:p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl md:rounded-3xl border border-blue-500/20 flex gap-3 md:gap-4">
                      <RocketLaunchIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600 shrink-0" />
                      <div>
                        <h4 className="text-[9px] md:text-[10px] font-black uppercase text-blue-900 dark:text-blue-100 mb-1">
                          Dica de Sucesso
                        </h4>
                        <p className="text-[10px] md:text-xs text-blue-800 dark:text-blue-300">
                          Lojas com descrições claras e profissionais convertem até
                          40% mais. Seja direto sobre o que torna sua marca
                          especial.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 md:mt-16 flex flex-col md:flex-row gap-4 md:justify-between items-center">
                    <button
                      onClick={() => setCreationStep(1)}
                      className="order-2 md:order-1 text-gray-400 font-black uppercase text-[10px] tracking-widest"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setCreationStep(3)}
                      className="order-1 md:order-2 w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl md:rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all"
                    >
                      Ver Revisão
                    </button>
                  </div>
                </div>
              )}

              {creationStep === 3 && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-8 md:mb-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <CheckBadgeIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter dark:text-white">
                        Confirmação
                      </h3>
                      <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Último Passo: Ativação Profissional
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-6 md:p-10 rounded-3xl md:rounded-[3rem] text-center mb-8 md:mb-10">
                    <div
                      className="w-16 h-16 md:w-24 md:h-24 rounded-full mx-auto mb-4 md:mb-6 flex items-center justify-center shadow-2xl"
                      style={{ backgroundColor: newStoreColor }}
                    >
                      <CheckBadgeIcon className="w-8 h-8 md:w-12 md:h-12 text-white" />
                    </div>
                    <h4 className="text-xl md:text-2xl font-black dark:text-white uppercase tracking-tighter mb-2">
                      {newStoreName}
                    </h4>
                    <p className="text-[10px] md:text-xs text-gray-500 max-w-sm mx-auto line-clamp-2 mb-6">
                      {newStoreDesc}
                    </p>

                    <div className="flex items-center justify-center gap-3 py-4 border-y border-gray-100 dark:border-white/5">
                      <BanknotesIcon className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                      <span className="text-lg md:text-xl font-black dark:text-white tracking-tighter">
                        Taxa de Ativação:{" "}
                        <span className="text-emerald-600">GRATUITO</span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-orange-500/10 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-orange-500/20 flex gap-3 md:gap-4 mb-8 md:mb-12">
                    <ShieldCheckIcon className="w-6 h-6 md:w-8 md:h-8 text-orange-600 shrink-0" />
                    <p className="text-[9px] md:text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase leading-relaxed">
                      Ao ativar, seu perfil será auditado pelo protocolo IA
                      Sentinela. Atividades fraudulentas ou ilícitas resultarão no
                      bloqueio imediato da loja e retenção de fundos.
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 md:justify-between items-center">
                    <button
                      onClick={() => setCreationStep(2)}
                      className="order-2 md:order-1 text-gray-400 font-black uppercase text-[10px] tracking-widest underline underline-offset-8"
                    >
                      Editar Dados
                    </button>
                    <button
                      onClick={handleCreateStoreWizard}
                      disabled={creationLoading}
                      className="order-1 md:order-2 w-full md:w-auto px-10 md:px-12 py-5 md:py-6 bg-blue-600 text-white rounded-2xl md:rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {creationLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Validando Protocolo...
                        </>
                      ) : (
                        <>
                          Ativar Agora{" "}
                          <BoltIcon className="w-5 h-5 text-yellow-300" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCreatingStore(false)}
              className="absolute top-8 right-8 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {[
            {
              title: "Estoque Inteligente",
              desc: "Alertas automáticos quando seus produtos estiverem acabando.",
              icon: ArchiveBoxIcon,
            },
            {
              title: "Pagamento Seguro",
              desc: "Receba seus lucros direto na sua carteira digital com segurança.",
              icon: ShieldCheckIcon,
            },
            {
              title: "Suporte Elite",
              desc: "Time especializado para ajudar na sua jornada como empreendedor.",
              icon: RocketLaunchIcon,
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-lg"
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
                <f.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter mb-2">
                {f.title}
              </h3>
              <p className="text-gray-500 text-xs font-medium leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-w-6xl animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-[1.5rem] shadow-xl flex items-center justify-center text-white"
            style={{ backgroundColor: brandColor }}
          >
            <CheckBadgeIcon className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black dark:text-white tracking-tighter uppercase">
              {brandName || "Minha Vitrine"}
            </h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              Painel Profissional{" "}
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </p>
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-[1.8rem] shadow-inner overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: "dashboard", label: "Resumo", icon: ChartBarIcon },
            { id: "inventory", label: "Estoque", icon: ArchiveBoxIcon },
            { id: "orders", label: "Pedidos", icon: ClipboardDocumentListIcon },
            { id: "affiliates", label: "Afiliados", icon: LinkIcon },
            { id: "branding", label: "Marca", icon: PaintBrushIcon },
            { id: "verification", label: "Insights", icon: ShieldCheckIcon },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? "bg-white dark:bg-darkcard text-blue-600 shadow-lg" : "text-gray-500"}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
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
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">
                    Visão Financeira Geral
                  </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-10 md:gap-20">
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-200 mb-1">
                      Lucro Estimado
                    </p>
                    <h4 className="text-5xl md:text-6xl font-black tracking-tighter">
                      {formatCurrency(metrics.totalProfit)}
                    </h4>
                  </div>
                  <div className="h-16 w-px bg-white/10 hidden md:block"></div>
                  <div className="flex gap-12">
                    <div>
                      <p className="text-[10px] font-black uppercase text-blue-300 mb-1">
                        Faturamento Bruto
                      </p>
                      <p className="text-2xl font-black opacity-90">
                        {formatCurrency(metrics.totalRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-blue-300 mb-1">
                        A Liberar (Escrow)
                      </p>
                      <p className="text-2xl font-black text-indigo-200">
                        {formatCurrency(metrics.pendingEarnings)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-wrap gap-4">
                  <button
                    onClick={() => onNavigate("wallet")}
                    className="px-8 py-4 bg-white text-blue-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Sacar Saldo Disponivel
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    Histórico de Vendas
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-darkcard p-8 rounded-[3.5rem] border border-gray-100 dark:border-white/5 shadow-xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
                    <ClipboardDocumentListIcon className="h-7 w-7" />
                  </div>
                  <span className="text-[10px] font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full uppercase">
                    Ativo
                  </span>
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Pedidos Ativos
                </p>
                <h4 className="text-5xl font-black dark:text-white tracking-tighter">
                  {metrics.pendingOrders}
                </h4>
                <p className="text-[10px] font-bold text-gray-500 mt-2">
                  Necessário processar {metrics.pendingOrders} envios no
                  momento.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("orders")}
                className="w-full mt-8 py-5 bg-gray-50 dark:bg-white/5 rounded-2xl text-[10px] font-black text-gray-500 uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                Processar Agora &rsaquo;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Gráfico de Vendas */}
            <div className="lg:col-span-2 bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">
                    Fluxo de Caixa (7 Dias)
                  </h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    Desempenho diário de faturamento
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-white/5 p-2 rounded-xl">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#88888820"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: "bold", fill: "#888" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: "bold", fill: "#888" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111",
                        borderRadius: "1rem",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      cursor={{ fill: "#88888810" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {metrics.chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === metrics.chartData.length - 1
                              ? "#2563eb"
                              : "#60a5fa"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dashboard de Estoque Critico */}
            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">
                  Alertas de Estoque
                </h3>
                <div className="relative">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 animate-pulse" />
                  {metrics.lowStockProducts.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-darkcard">
                      {metrics.lowStockProducts.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {metrics.lowStockProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/10 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                      <CheckBadgeIcon className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-xs font-black text-gray-500 uppercase">
                      Estoque Seguro
                    </p>
                    <p className="text-[9px] text-gray-400 uppercase mt-1 leading-relaxed">
                      Não há itens com estoque
                      <br />
                      abaixo do limite crítico de 10 unid.
                    </p>
                  </div>
                ) : (
                  metrics.lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 rounded-[1.8rem] border border-orange-100 dark:border-orange-900/20"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={p.imageUrls[0]}
                          className="w-12 h-12 rounded-2xl object-cover shadow-sm"
                        />
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-black dark:text-white uppercase truncate">
                            {p.name}
                          </p>
                          <p className="text-[9px] font-bold text-orange-600 uppercase">
                            Restam {p.physicalDetails?.stock} UNID.
                          </p>
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
                onClick={() => setActiveTab("inventory")}
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
                <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">
                  Produtos Campeões
                </h3>
                <RocketLaunchIcon className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="space-y-4">
                {metrics.topProducts.length === 0 ? (
                  <p className="text-center p-12 text-gray-400 font-bold uppercase text-[10px] tracking-widest shadow-inner rounded-3xl bg-gray-50 dark:bg-white/5">
                    Vendas aparecerão aqui assim que ocorrerem.
                  </p>
                ) : (
                  metrics.topProducts.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[1.8rem] transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-[10px] shadow-sm ${
                            idx === 0
                              ? "bg-yellow-400 text-white"
                              : idx === 1
                                ? "bg-gray-300 text-white"
                                : idx === 2
                                  ? "bg-orange-400 text-white"
                                  : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <img
                          src={item.product?.imageUrls[0]}
                          className="w-12 h-12 rounded-2xl object-cover shadow-md"
                        />
                        <div>
                          <p className="text-xs font-black dark:text-white uppercase truncate max-w-[150px]">
                            {item.product?.name}
                          </p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">
                            {item.count} vendas efetuadas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-600">
                          {formatCurrency(item.count * (item.product?.price || 0))}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">
                          Receita Total
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Performance de Afiliados */}
            <div className="bg-white dark:bg-darkcard p-8 rounded-[3.5rem] border border-gray-100 dark:border-white/5 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">
                  Top Afiliados
                </h3>
                <AcademicCapIcon className="h-5 w-5 text-indigo-500" />
              </div>

              <div className="space-y-4">
                {metrics.topAffiliates.length === 0 ? (
                  <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-3xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Nenhum afiliado realizou vendas ainda.
                    </p>
                    <p className="text-[9px] text-gray-400 mt-2 uppercase">
                      Recrute promotores para bombar sua vitrine!
                    </p>
                  </div>
                ) : (
                  metrics.topAffiliates.map((aff, idx) => (
                    <div
                      key={aff.id}
                      className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl group hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            aff.user?.profilePicture ||
                            "https://ui-avatars.com/api/?name=Affiliate"
                          }
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="text-xs font-black dark:text-white uppercase">
                            {aff.user?.firstName} {aff.user?.lastName}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">
                            {aff.count} CONVERSÕES
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-600">
                          {formatCurrency(aff.revenue)}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">
                          GERADOS
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setActiveTab("affiliates")}
                className="mt-8 w-full py-4 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                Gerenciador de Afiliados
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-xl">
            <div>
              <h3 className="text-2xl font-black dark:text-white tracking-tighter uppercase mb-1">
                Gerenciador de Produtos
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {storeProducts.length} itens listados na sua vitrine
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsAddingProduct(true);
                // Reset form
                setPName("");
                setPDesc("");
                setPPrice("");
                setPDigitalUrl("");
                setPOriginalPrice("");
                setPDiscount("");
                setPHasFreeShipping(true);
                setPShippingFee("");
                setPPositioning("STANDARD");
                setPBidAmount("");
                setPStock("100");
                setPWeight("");
                setPDimensions("");
                setPLessonsCount("");
                setPTotalHours("");
                setPHasCertificate(true);
                setPModules("");
                setPBrand("");
                setPSku("");
                setPVideoUrl("");
                setPAttributes([]);
                setPVariants([]);
                setPImageUrls([]);
              }}
              className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <PlusIcon className="h-5 w-5" /> Novo Produto
            </button>
          </div>

          <div className="bg-white dark:bg-darkcard rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-8 py-6 text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                      Produto
                    </th>
                    <th className="px-8 py-6 text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                      Tipo
                    </th>
                    <th className="px-8 py-6 text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                      Preço
                    </th>
                    <th className="px-8 py-6 text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                      Estoque
                    </th>
                    <th className="px-8 py-6 text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                      Status
                    </th>
                    <th className="px-8 py-6 text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {storeProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                          Nenhum produto cadastrado
                        </p>
                      </td>
                    </tr>
                  ) : (
                    storeProducts
                    .slice(
                      (invPage - 1) * ITEMS_PER_PAGE,
                      invPage * ITEMS_PER_PAGE,
                    )
                    .map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-2xl overflow-hidden">
                              <img
                                src={p.imageUrls[0]}
                                alt=""
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-black dark:text-white uppercase tracking-tight line-clamp-1">
                                {p.name}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {p.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                            p.type === ProductType.PHYSICAL ? 'bg-blue-100 text-blue-600' :
                            p.type === ProductType.DIGITAL_COURSE ? 'bg-purple-100 text-purple-600' :
                            'bg-indigo-100 text-indigo-600'
                          }`}>
                            {p.type === ProductType.PHYSICAL ? 'Físico' :
                             p.type === ProductType.DIGITAL_COURSE ? 'Curso' :
                             p.type === ProductType.DIGITAL_EBOOK ? 'E-book' : 'Digital'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm font-black dark:text-white">
                          <div className="flex flex-col">
                            <span>{formatCurrency(p.price)}</span>
                            {p.discountPercentage && (
                              <span className="text-[9px] text-red-500 line-through opacity-60">
                                {formatCurrency(p.originalPrice || (p.price / (1 - p.discountPercentage / 100)))}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span
                            className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                              p.type === ProductType.PHYSICAL &&
                              p.physicalDetails &&
                              p.physicalDetails.stock < 10
                                ? "bg-red-100 text-red-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {p.type === ProductType.PHYSICAL
                              ? `${p.physicalDetails?.stock || 0} UNID.`
                              : "DIGITAL"}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-1">
                                <StarIcon className="h-3 w-3 text-yellow-400" />
                                <span className="text-[10px] font-black text-gray-400">
                                  {p.averageRating?.toFixed(1)}
                                </span>
                             </div>
                             {p.discountPercentage && (
                                <span className="bg-pink-100 text-pink-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase w-fit animate-pulse">
                                   Promoção {p.discountPercentage}%
                                </span>
                             )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/10 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                            >
                              <PaintBrushIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteProductTarget(p.id)}
                              className="p-3 bg-red-50 text-red-500 dark:bg-red-900/10 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              total={storeProducts.length}
              current={invPage}
              onChange={setInvPage}
            />
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
        type={ConfirmationType.DANGER}
      />

      {/* ... (Restante do código igual para orders, sourcing, branding e modals de criação) ... */}
      {activeTab === "orders" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-xl">
            <div className="p-6 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">
                Fulfillment & Rastreio
              </h3>
              <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                {storeSales.length} Pedidos
              </span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {storeSales.length === 0 ? (
                <div className="p-24 text-center text-gray-400 font-black uppercase text-xs tracking-widest">
                  Aguardando sua primeira venda...
                </div>
              ) : (
                storeSales
                  .slice(
                    (ordersPage - 1) * ITEMS_PER_PAGE,
                    ordersPage * ITEMS_PER_PAGE,
                  )
                  .map((sale) => {
                  const buyer = buyerProfiles[sale.buyerId];
                  const product = storeProducts.find(
                    (p) => p.id === sale.productId,
                  );

                  return (
                    <div
                      key={sale.id}
                      className="p-6 md:p-10 flex flex-col gap-8 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors border-b dark:border-white/5 last:border-0"
                    >
                      <div className="flex flex-col lg:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-4 w-full">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">
                                Pedido #{sale.id.slice(-8).toUpperCase()}
                              </p>
                              <h4 className="font-black text-2xl text-gray-900 dark:text-white leading-tight">
                                {product?.name || "Produtos Diversos"}
                              </h4>
                              <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">
                                {new Date(sale.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-black uppercase px-4 py-2 rounded-2xl border shadow-sm ${
                                sale.status === OrderStatus.COMPLETED
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : sale.status === OrderStatus.DELIVERED
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : sale.status === OrderStatus.PROCESSING
                                      ? "bg-purple-100 text-purple-700 border-purple-200"
                                      : sale.status === OrderStatus.SHIPPING
                                        ? "bg-blue-100 text-blue-700 border-blue-200"
                                        : sale.status === OrderStatus.CANCELED
                                          ? "bg-red-100 text-red-700 border-red-200"
                                          : "bg-orange-100 text-orange-700 border-orange-200"
                              }`}
                            >
                              {sale.status === OrderStatus.WAITLIST
                                ? "Pendente"
                                : sale.status === OrderStatus.PROCESSING
                                  ? "Em Processamento"
                                  : sale.status === OrderStatus.SHIPPING
                                    ? "A Caminho"
                                    : sale.status === OrderStatus.DELIVERED
                                      ? "No Destino"
                                      : sale.status === OrderStatus.CANCELED
                                        ? "Cancelado/Renunciado"
                                        : "Finalizado"}
                            </span>
                          </div>{" "}
                        </div>

                        {/* Informações do Cliente & Endereço */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/5">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <StarIcon className="h-4 w-4" /> Dados do Cliente
                            </p>
                            {buyer ? (
                              <div className="flex items-center gap-4">
                                {buyer.profilePicture && (
                                  <img
                                    src={buyer.profilePicture}
                                    className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-white/10"
                                  />
                                )}
                                <div>
                                  <p className="font-black text-gray-900 dark:text-white uppercase">
                                    {buyer.firstName} {buyer.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 font-medium">
                                    {buyer.email}
                                  </p>
                                  {buyer.phone && (
                                    <p className="text-xs text-gray-500 font-medium">
                                      {buyer.phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 font-bold italic">
                                Carregando dados do cliente...
                              </p>
                            )}
                          </div>

                          <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/5 relative group">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <TruckIcon className="h-4 w-4" /> Endereço de
                              Entrega
                            </p>
                            {sale.shippingAddress ? (
                              <>
                                <div className="space-y-1">
                                  <p className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase leading-snug">
                                    {sale.shippingAddress.address}
                                  </p>
                                  <p className="text-xs text-gray-500 font-bold uppercase">
                                    {sale.shippingAddress.city},{" "}
                                    {sale.shippingAddress.state}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-mono tracking-widest">
                                    {sale.shippingAddress.zipCode}
                                  </p>
                                  {sale.shippingAddress.carrierName && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/5">
                                        <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-2">
                                            <GlobeAmericasIcon className="h-3 w-3" /> Transp: {sale.shippingAddress.carrierName}
                                        </p>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    const addr = sale.shippingAddress;
                                    if (addr) {
                                      navigator.clipboard.writeText(
                                        `${addr.address}, ${addr.city} - ${addr.state}, CEP: ${addr.zipCode}`,
                                      );
                                      showAlert("Endereço copiado!", {
                                        type: "success",
                                      });
                                    }
                                  }}
                                  className="absolute top-4 right-4 p-2 bg-white dark:bg-white/10 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Copiar Endereço Completo"
                                >
                                  <ShareIcon className="h-3 w-3 text-blue-600" />
                                </button>
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 font-bold italic">
                                Endereço não informado.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 mt-6">
                          <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 px-6 py-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-inner">
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Valor da Venda
                              </p>
                              <p className="text-2xl font-black text-gray-900 dark:text-white">
                                {formatCurrency(sale.saleAmount)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              {sale.carrierName && (
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 px-4 py-2 rounded-xl text-blue-700 dark:text-blue-300">
                                  <GlobeAmericasIcon className="h-4 w-4" />
                                  <p className="text-[10px] font-black uppercase tracking-wider">
                                    {sale.carrierName}
                                  </p>
                                </div>
                              )}
                              {sale.trackingCode && (
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400">
                                  <TagIcon className="h-4 w-4" />
                                  <p className="text-[10px] font-mono font-bold tracking-widest uppercase">
                                    TRACK: {sale.trackingCode}
                                  </p>
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
                              await updateSaleStatus(
                                sale.id,
                                OrderStatus.PROCESSING,
                              );
                              loadData();
                              showAlert(
                                "Status atualizado para: EM PROCESSAMENTO",
                                { type: "success" },
                              );
                            }}
                            className="bg-purple-600 shadow-purple-600/30 text-white px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-purple-700 hover:scale-[1.02] active:scale-95 transition-all w-full"
                          >
                            <ArrowPathIcon className="h-5 w-5" /> Iniciar
                            Processamento
                          </button>
                        )}

                        {sale.status === OrderStatus.PROCESSING && (
                          <button
                            onClick={() =>
                              setTrackingModal({ saleId: sale.id })
                            }
                            className="bg-blue-600 shadow-blue-600/30 text-white px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all w-full"
                          >
                            <TruckIcon className="h-5 w-5" />{" "}
                            {sale.trackingCode
                              ? "Atualizar Rastreio"
                              : "Marcar como Enviado"}
                          </button>
                        )}

                        {sale.status === OrderStatus.SHIPPING && (
                          <button
                            onClick={async () => {
                              await updateSaleStatus(
                                sale.id,
                                OrderStatus.DELIVERED,
                              );
                              loadData();
                              showAlert(
                                "Status atualizado: PRODUTO NO DESTINO",
                                { type: "success" },
                              );
                            }}
                            className="bg-emerald-600 shadow-emerald-600/30 text-white px-8 py-5 rounded-[1.8rem] font-black text-[11px] uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all w-full"
                          >
                            <CheckBadgeIcon className="h-5 w-5" /> Chegou ao
                            Destino
                          </button>
                        )}

                        {sale.status === OrderStatus.DELIVERED && (
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-[1.8rem] text-center">
                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                              Aguardando Cliente Confirmar Recebimento
                            </p>
                          </div>
                        )}

                        {(sale.status === OrderStatus.CANCELED ||
                          sale.status === OrderStatus.COMPLETED) && (
                          <button
                            onClick={async () => {
                              const confirmed = await showConfirm(
                                "Deseja realmente eliminar este registro de venda do seu histórico? Esta ação é permanente.",
                                {
                                  title: "Eliminar Registro",
                                  confirmText: "Sim, Eliminar",
                                  cancelText: "Não",
                                },
                              );
                              if (confirmed) {
                                setDeletingSaleId(sale.id);
                                try {
                                  const success = await deleteOrder(sale.id);
                                  if (success) {
                                    showAlert("Registro de venda removido.", {
                                      type: "success",
                                    });
                                    loadData();
                                  } else {
                                    showAlert("Erro ao remover registro.", {
                                      type: "error",
                                    });
                                  }
                                } catch (err) {
                                  showAlert("Erro ao remover registro.", {
                                    type: "error",
                                  });
                                } finally {
                                  setDeletingSaleId(null);
                                }
                              }
                            }}
                            disabled={deletingSaleId === sale.id}
                            className="flex items-center justify-center gap-2 px-8 py-5 bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-500 hover:text-white rounded-[1.8rem] transition-all font-black uppercase text-[11px] tracking-widest disabled:opacity-50 w-full"
                          >
                            {deletingSaleId === sale.id ? (
                              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArchiveBoxIcon className="h-5 w-5" />
                            )}{" "}
                            Eliminar Registro
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Pagination
              total={storeSales.length}
              current={ordersPage}
              onChange={setOrdersPage}
            />
          </div>
        </div>
      )}

      {activeTab === "branding" && (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
          <div className="bg-white dark:bg-darkcard p-10 rounded-[3.5rem] shadow-2xl border border-gray-100 dark:border-white/5">
            <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight mb-10">
              Personalização de Marca
            </h3>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Nome Comercial
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white font-black outline-none border-2 border-transparent focus:border-blue-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Cor da Identidade
                  </label>
                  <div className="flex gap-2">
                    {BRAND_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setBrandColor(c.hex)}
                        className={`w-11 h-11 rounded-full border-4 transition-all ${brandColor === c.hex ? "border-white shadow-xl scale-110" : "opacity-40 border-transparent"}`}
                        style={{ backgroundColor: c.hex }}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea
                value={brandDesc}
                onChange={(e) => setBrandDesc(e.target.value)}
                className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white h-32 resize-none outline-none border-2 border-transparent focus:border-blue-600 font-medium"
                placeholder="Descreva o propósito da sua vitrine profissional..."
              />
              <button
                onClick={handleSaveBranding}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all tracking-[0.2em]"
              >
                Salvar Identidade
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "affiliates" && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Total de Promotores
              </p>
              <h4 className="text-4xl font-black dark:text-white tracking-tighter">
                {new Set(storeAffiliateLinks.map((l) => l.userId)).size}
              </h4>
            </div>
            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Vendas via Afiliados
              </p>
              <h4 className="text-4xl font-black dark:text-white tracking-tighter">
                {storeSales.filter((s) => s.affiliateUserId).length}
              </h4>
            </div>
            <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Comissões Pagas
              </p>
              <h4 className="text-4xl font-black text-indigo-600 tracking-tighter">
                {formatCurrency(storeSales
                  .filter((s) => s.affiliateUserId)
                  .reduce(
                    (acc, s) =>
                      acc +
                      (s.saleAmount *
                        (storeProducts.find((p) => p.id === s.productId)
                          ?.affiliateCommissionRate || 0)) /
                        100,
                    0,
                  ))}
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-xl">
            <div className="p-6 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">
                Links Ativos de Afiliados
              </h3>
            </div>
            <div className="p-0">
              {storeAffiliateLinks.length === 0 ? (
                <div className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                  Nenhum afiliado gerou links ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/5 border-b dark:border-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">
                          Afiliado
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">
                          Produto
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">
                          Data de Criação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-white/5">
                      {storeAffiliateLinks.map((link, idx) => {
                        const affiliate = buyerProfiles[link.userId];
                        const product = storeProducts.find(
                          (p) => p.id === link.productId,
                        );
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={
                                    affiliate?.profilePicture ||
                                    `https://ui-avatars.com/api/?name=${affiliate?.firstName || "A"}`
                                  }
                                  className="w-8 h-8 rounded-full"
                                />
                                <div>
                                  <p className="text-xs font-black dark:text-white uppercase">
                                    {affiliate
                                      ? `${affiliate.firstName} ${affiliate.lastName}`
                                      : "Afiliado Externo"}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    {affiliate?.email || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={product?.imageUrls[0]}
                                  className="w-8 h-8 rounded-lg object-cover"
                                />
                                <p className="text-xs font-bold dark:text-white uppercase">
                                  {product?.name || "Produto Removido"}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[10px] font-bold text-gray-400">
                                {new Date(link.timestamp).toLocaleDateString()}
                              </p>
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

       {activeTab === "verification" && (
         <div className="space-y-10 animate-fade-in pb-20">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-8">
                 <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl text-center">
                    <div className="relative inline-block mb-6">
                        <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mx-auto ${userStore?.isVerified ? 'bg-blue-600' : 'bg-gray-200 dark:bg-white/5'}`}>
                            <BuildingStorefrontIcon className="h-12 w-12" />
                        </div>
                        {userStore?.isVerified && (
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-2xl border-4 border-white dark:border-darkcard shadow-lg">
                                <CheckBadgeIcon className="h-6 w-6 text-white" />
                            </div>
                        )}
                    </div>
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2">{userStore?.name}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${userStore?.isVerified ? 'text-blue-600' : 'text-gray-500'}`}>
                        {userStore?.isVerified ? 'LOJA VERIFICADA E AUDITADA' : 'AGUARDANDO VERIFICAÇÃO'}
                    </p>
                 </div>

                 <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[3rem] text-white shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-[1.7] transition-transform duration-700">
                        <RocketLaunchIcon className="h-32 w-32" />
                    </div>
                    <div className="relative z-10 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Score de Desempenho</p>
                        <h4 className="text-6xl font-black mb-4">{userStore?.performanceScore || 0}%</h4>
                        <p className="text-[10px] font-bold text-indigo-100 leading-relaxed uppercase">
                           Este score é baseado na satisfação dos clientes e volume de vendas.
                        </p>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white dark:bg-darkcard p-8 md:p-10 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
                            <BellAlertIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">Sinais da Administração</h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Apoio, Suporte e Requisitos</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {(!userStore?.adminSignals || userStore.adminSignals.length === 0) ? (
                            <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[3rem]">
                                <EnvelopeIcon className="h-12 w-12 text-gray-200 dark:text-white/5 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum sinal no momento. Continue vendendo!</p>
                            </div>
                        ) : (
                            userStore.adminSignals.map((signal) => (
                                <div key={signal.id} className="bg-gray-50 dark:bg-white/[0.02] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                            {new Date(signal.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                            signal.type === 'VERIFICATION_REQUEST' ? 'bg-blue-600/20 text-blue-600' :
                                            signal.type === 'COMPLIANCE_NOTICE' ? 'bg-red-600/20 text-red-600' :
                                            'bg-orange-600/20 text-orange-600'
                                        }`}>
                                            {signal.type === 'VERIFICATION_REQUEST' ? <CheckBadgeIcon className="h-6 w-6" /> : 
                                             signal.type === 'COMPLIANCE_NOTICE' ? <ExclamationCircleIcon className="h-6 w-6" /> :
                                             <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-black dark:text-white uppercase tracking-tighter mb-2">{signal.title}</h4>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                                {signal.message}
                                            </p>
                                            
                                            {signal.requiresPayment && (
                                                <div className="bg-orange-500/10 p-6 rounded-[2rem] border border-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                                                    <div>
                                                        <p className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest mb-1">Custo de Serviço / Verificação</p>
                                                        <p className="text-2xl font-black text-orange-600">{formatCurrency(signal.paymentAmount || 0)}</p>
                                                    </div>
                                                    {signal.paymentStatus === 'COMPLETED' ? (
                                                        <div className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-2xl">
                                                            <CheckCircleIcon className="h-5 w-5" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">PAGO</span>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handlePayVerification(signal)}
                                                            className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-orange-700 transition-all active:scale-95"
                                                        >
                                                            Pagar e Iniciar Processo
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                 </div>

                 <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                        <ScaleIcon className="h-6 w-6 text-blue-600" />
                        <h4 className="font-black dark:text-white uppercase tracking-tight">Benefícios da Verificação</h4>
                    </div>
                    <ul className="space-y-4">
                        {[
                            "Selo de Confiança 'PRO' na Vitrine e Produtos",
                            "Prioridade em resultados de busca de categorias",
                            "Taxa de comissão reduzida em vendas (0.5% de desconto)",
                            "Acesso a Suporte Prioritário CyberPhone",
                            "Funcionalidades de e-mail marketing direto para clientes"
                        ].map((b, i) => (
                            <li key={i} className="flex items-center gap-3 text-xs font-medium text-gray-500">
                                <CheckBadgeIcon className="h-4 w-4 text-green-500" /> {b}
                            </li>
                        ))}
                    </ul>
                 </div>
              </div>
           </div>
         </div>
       )}

      {/* Modal de Novo Produto Próprio (AliExpress Style) */}
      {isAddingProduct && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto"
          onClick={() => setIsAddingProduct(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-3xl rounded-[1.5rem] md:rounded-[2rem] shadow-2xl relative border border-white/10 my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 md:p-6 border-b dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/5">
              <div>
                <h3 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tight">
                  {editingProduct ? "Editar Produto" : "Anunciar Novo Produto"}
                </h3>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  {editingProduct
                    ? "Altere os detalhes do seu item"
                    : "Preencha os detalhes para começar a vender"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddingProduct(false);
                  setEditingProduct(null);
                }}
                className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Form Content */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex-1 overflow-y-auto p-0 space-y-0 no-scrollbar bg-gray-50 dark:bg-black/40"
            >
            {/* Progress/Sections Nav */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md border-b dark:border-white/5 flex px-2 md:px-8 py-3 md:py-4 overflow-x-auto no-scrollbar gap-4 md:gap-10">
              {FORM_STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = pFormStep === step.id;
                const isPast = pFormStep > step.id;
                return (
                  <button
                    type="button"
                    key={step.id}
                    onClick={() => setPFormStep(step.id)}
                    className={`flex flex-col items-center gap-1 md:gap-2 group transition-all shrink-0 ${isActive ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
                  >
                    <div
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-105 md:scale-110" : isPast ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500"}`}
                    >
                      {isPast ? (
                        <CheckBadgeIcon className="h-5 w-5 md:h-6 md:w-6" />
                      ) : (
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      )}
                    </div>
                    <span
                      className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${isActive ? "text-blue-600" : "text-gray-500"}`}
                    >
                      {step.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 md:p-8 space-y-8 md:space-y-12">
              {/* Step 1: Basic Information */}
              {pFormStep === 1 && (
                <section className="animate-fade-in bg-white dark:bg-darkcard p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border dark:border-white/5 space-y-8 md:space-y-10">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <ArchiveBoxIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black dark:text-white uppercase tracking-tight">
                        Ficha Técnica Básica
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Defina o nome e a categoria do seu item
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8 mt-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Título Comercial do Produto
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Smartphone Cyber X1 - 512GB Titanium"
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        className="w-full p-6 bg-gray-50 dark:bg-white/5 dark:text-white rounded-3xl outline-none text-lg font-black uppercase tracking-tight border-2 border-transparent focus:border-blue-600 transition-all shadow-inner placeholder:text-gray-300 dark:placeholder:text-white/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Categoria Principal
                        </label>
                        <div className="relative">
                          <select
                            value={pCategory}
                            onChange={(e) => setPCategory(e.target.value)}
                            className="w-full p-6 bg-gray-50 dark:bg-white/5 dark:text-white rounded-3xl outline-none font-bold text-sm border-2 border-transparent focus:border-blue-600 shadow-inner appearance-none"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Tipo de Produto (Fundamental)
                        </label>
                        <div className="relative">
                          <select
                            value={pType}
                            onChange={(e) =>
                              setPType(e.target.value as ProductType)
                            }
                            className="w-full p-6 bg-gray-50 dark:bg-white/5 dark:text-white rounded-3xl outline-none font-bold text-sm border-2 border-transparent focus:border-blue-600 shadow-inner appearance-none"
                          >
                            <option value={ProductType.PHYSICAL}>
                              📦 PRODUTO FÍSICO (Ex: Celulares, Roupas, Objetos)
                            </option>
                            <option value={ProductType.DIGITAL_COURSE}>
                              🎓 CURSOS & TREINAMENTOS (Vídeos, Módulos, Certificados)
                            </option>
                            <option value={ProductType.DIGITAL_EBOOK}>
                              📚 E-BOOKS & PDF (Livros Digitais, Apostilas)
                            </option>
                            <option value={ProductType.DIGITAL_OTHER}>
                              🛠️ ARQUIVOS DIGITAIS (Software, Packs, Templates)
                            </option>
                          </select>
                        </div>
                        <p className="text-[9px] text-blue-600 font-bold uppercase ml-2 italic">
                          * Selecione corretamente pois isso altera as opções dos próximos passos.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Marca / Fabricante
                        </label>
                        <input
                          type="text"
                          value={pBrand}
                          onChange={(e) => setPBrand(e.target.value)}
                          className="w-full p-6 bg-gray-50 dark:bg-white/5 dark:text-white rounded-3xl font-black text-sm shadow-inner outline-none border-2 border-transparent focus:border-blue-600"
                          placeholder="Ex: CyberCorp ou Artesanal"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Código Identificador (SKU)
                        </label>
                        <input
                          type="text"
                          value={pSku}
                          onChange={(e) => setPSku(e.target.value)}
                          className="w-full p-6 bg-gray-50 dark:bg-white/5 dark:text-white rounded-3xl font-black text-sm shadow-inner outline-none border-2 border-transparent focus:border-blue-600"
                          placeholder="Ex: CBX-BL-2024"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 2: Media Management */}
              {pFormStep === 2 && (
                <section className="animate-fade-in bg-white dark:bg-darkcard p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border dark:border-white/5 space-y-8 md:space-y-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center text-pink-600 shrink-0">
                      <PhotoIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black dark:text-white uppercase tracking-tight">
                        Galeria Visual
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Adicione fotos e vídeos em alta resolução
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {pImageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-[2rem] overflow-hidden group border dark:border-white/5 shadow-xl"
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          alt={`Produto ${idx + 1}`}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeProductImage(idx)}
                            className="p-3 bg-red-500 text-white rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-red-500/40"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                        {idx === 0 && (
                          <div className="absolute top-0 left-0 w-full bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase py-2 text-center tracking-widest">
                            Foto de Capa
                          </div>
                        )}
                      </div>
                    ))}

                    {pImageUrls.length < 10 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border-4 border-dashed border-gray-100 dark:border-white/10 rounded-[2rem] flex flex-col items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 transition-all text-gray-300 hover:text-blue-600 group"
                      >
                        <PlusIcon className="h-10 w-10 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Adicionar
                        </span>
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />

                  <div className="pt-6 border-t dark:border-white/5 space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Vídeo de Apresentação (Link ou MP4)
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={pVideoUrl}
                        onChange={(e) => setPVideoUrl(e.target.value)}
                        className="flex-1 p-6 bg-gray-50 dark:bg-white/5 dark:text-white rounded-3xl font-black text-xs shadow-inner outline-none border-2 border-transparent focus:border-blue-600"
                        placeholder="Insira o link do YouTube, Vimeo ou URL direto do vídeo"
                      />
                    </div>
                    <div className="p-6 bg-pink-50 dark:bg-pink-900/10 rounded-[2rem] border border-pink-500/20 flex gap-4">
                      <BoltIcon className="w-8 h-8 text-pink-600 shrink-0" />
                      <div>
                        <h5 className="text-[10px] font-black uppercase text-pink-900 dark:text-pink-100 mb-1">
                          Impulso de Vendas
                        </h5>
                        <p className="text-xs text-pink-800 dark:text-pink-300 leading-relaxed">
                          Produtos com vídeo possuem uma taxa de conversão até
                          80% maior. Mostre como seu produto funciona!
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 3: Specific Content (Physical vs Course vs Digital) */}
              {pFormStep === 3 && (
                <section className="animate-fade-in bg-white dark:bg-darkcard p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border dark:border-white/5 space-y-8 md:space-y-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
                      <RocketLaunchIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black dark:text-white uppercase tracking-tight">
                        {pType === ProductType.PHYSICAL ? "Controle de Estoque Físico" : 
                         pType === ProductType.DIGITAL_COURSE ? "Gestão de Conteúdo Educacional" : 
                         "Especificações do Arquivo Digital"}
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Configure os detalhes técnicos obrigatórios para este formato
                      </p>
                    </div>
                  </div>

                  {pType === ProductType.PHYSICAL && (
                    <div className="space-y-8">
                        <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border dark:border-white/5 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Condição do Item</label>
                                    <div className="flex bg-white dark:bg-black/20 p-2 rounded-2xl border dark:border-white/10">
                                        <button 
                                            type="button"
                                            onClick={() => setPCondition('NEW')}
                                            className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${pCondition === 'NEW' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 opacity-50'}`}
                                        >Novo</button>
                                        <button 
                                            type="button"
                                            onClick={() => setPCondition('USED')}
                                            className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${pCondition === 'USED' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 opacity-50'}`}
                                        >Usado / Recondicionado</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estoque Inicial Disponível</label>
                                    <input 
                                        type="number" 
                                        value={pStock}
                                        onChange={(e) => setPStock(e.target.value)}
                                        className="w-full p-5 bg-white dark:bg-black/20 dark:text-white rounded-2xl font-black text-xl border-2 border-transparent focus:border-blue-600 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU / Código de Referência</label>
                                    <input 
                                        type="text" 
                                        value={pSku}
                                        onChange={(e) => setPSku(e.target.value)}
                                        className="w-full p-5 bg-white dark:bg-black/20 dark:text-white rounded-2xl font-bold text-sm border-2 border-transparent focus:border-blue-600 outline-none"
                                        placeholder="Ex: PROD-001"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t dark:border-white/5 pt-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Peso Estimado (KG/G)</label>
                                    <input 
                                        type="text" 
                                        value={pWeight}
                                        onChange={(e) => setPWeight(e.target.value)}
                                        className="w-full p-5 bg-white dark:bg-black/20 dark:text-white rounded-2xl font-bold text-sm border-2 border-transparent focus:border-blue-600 outline-none"
                                        placeholder="Ex: 0.5kg ou 500g"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dimensões (CxLxA em CM)</label>
                                    <input 
                                        type="text" 
                                        value={pDimensions}
                                        onChange={(e) => setPDimensions(e.target.value)}
                                        className="w-full p-5 bg-white dark:bg-black/20 dark:text-white rounded-2xl font-bold text-sm border-2 border-transparent focus:border-blue-600 outline-none"
                                        placeholder="Ex: 20x15x10 cm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {(pType === ProductType.DIGITAL_EBOOK || pType === ProductType.DIGITAL_OTHER) && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link de Entrega do Arquivo</label>
                                <input 
                                    type="text" 
                                    value={pDigitalUrl}
                                    onChange={(e) => setPDigitalUrl(e.target.value)}
                                    className="w-full p-5 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold text-sm border-2 border-transparent focus:border-blue-600 outline-none"
                                    placeholder="URL do arquivo para download automático"
                                />
                                <p className="text-[9px] text-gray-400 italic px-2">Este link será enviado ao comprador imediatamente após a confirmação do pagamento.</p>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Formato do Arquivo</label>
                                <input 
                                    type="text" 
                                    value={pFileFormat}
                                    onChange={(e) => setPFileFormat(e.target.value)}
                                    className="w-full p-5 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold uppercase"
                                    placeholder="Ex: PDF, ZIP, RAR, EXE"
                                />
                            </div>
                        </div>
                        {pType === ProductType.DIGITAL_EBOOK && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t dark:border-white/5 pt-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número de Páginas</label>
                                    <input 
                                        type="number" 
                                        value={pPageCount}
                                        onChange={(e) => setPPageCount(e.target.value)}
                                        className="w-full p-5 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold"
                                        placeholder="Ex: 120"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tamanho Estimado (MB/GB)</label>
                                    <input 
                                        type="text" 
                                        value={pFileSize}
                                        onChange={(e) => setPFileSize(e.target.value)}
                                        className="w-full p-5 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-bold"
                                        placeholder="Ex: 50 MB"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                  )}

                  {pType === ProductType.DIGITAL_COURSE && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total de Aulas</label>
                                <input 
                                    type="number"
                                    value={pLessonsCount}
                                    onChange={(e) => setPLessonsCount(e.target.value)}
                                    className="w-full p-5 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-black text-lg border-2 border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Carga Horária (Horas)</label>
                                <input 
                                    type="number"
                                    value={pTotalHours}
                                    onChange={(e) => setPTotalHours(e.target.value)}
                                    className="w-full p-5 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-black text-lg border-2 border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Certificação</label>
                                <div 
                                    onClick={() => setPHasCertificate(!pHasCertificate)}
                                    className={`w-full p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest ${pHasCertificate ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 border-transparent text-gray-400'}`}
                                >
                                    <ShieldCheckIcon className="w-5 h-5" />
                                    {pHasCertificate ? 'Com Certificado' : 'Sem Certificado'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Módulos do Curso (Um por linha)</label>
                                <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <textarea 
                                value={pModules}
                                onChange={(e) => setPModules(e.target.value)}
                                className="w-full p-6 bg-gray-50 dark:bg-white/5 dark:text-white rounded-[2rem] h-40 font-bold border-2 border-transparent focus:border-blue-600 resize-none shadow-inner"
                                placeholder="Fundamentos do Design&#10;Cores e Tipografia&#10;Design de Interface&#10;Prototipagem Avançada"
                            />
                        </div>
                    </div>
                  )}
                </section>
              )}

                {/* Step 4: Attributes & Specs */}
                {pFormStep === 4 && (
                  <section className="animate-fade-in bg-white dark:bg-darkcard p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border dark:border-white/5 space-y-8 md:space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
                          <TagIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black dark:text-white uppercase tracking-tight">
                            Especificações Técnicas
                          </h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Detalhe cada característica técnica do item
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPAttributes([
                            ...pAttributes,
                            { name: "", value: "" },
                          ])
                        }
                        className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 px-6 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all"
                      >
                        + Novo Campo
                      </button>
                    </div>

                    <div className="space-y-4">
                      {pAttributes.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-white/10">
                          <TagIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            Nenhuma especificação adicionada
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {pAttributes.map((attr, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 items-center bg-gray-50 dark:bg-white/5 p-3 rounded-3xl group border border-transparent hover:border-purple-500/20 transition-all"
                            >
                              <div className="flex-1 space-y-2">
                                  <input
                                      type="text"
                                      placeholder="Característica (Ex: Cor)"
                                      value={attr.name}
                                      onChange={(e) => {
                                          const newAttrs = [...pAttributes];
                                          newAttrs[idx].name = e.target.value;
                                          setPAttributes(newAttrs);
                                      }}
                                      className="w-full p-4 bg-white dark:bg-black/20 rounded-2xl text-[11px] font-black uppercase dark:text-white outline-none border-2 border-transparent focus:border-purple-500 shadow-sm"
                                  />
                                  <input
                                      type="text"
                                      placeholder="Valor (Ex: Titanium)"
                                      value={attr.value}
                                      onChange={(e) => {
                                          const newAttrs = [...pAttributes];
                                          newAttrs[idx].value = e.target.value;
                                          setPAttributes(newAttrs);
                                      }}
                                      className="w-full p-4 bg-white dark:bg-black/20 rounded-2xl text-[11px] font-bold dark:text-white outline-none border-2 border-transparent focus:border-purple-500 shadow-sm"
                                  />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPAttributes(
                                    pAttributes.filter((_, i) => i !== idx),
                                  )
                                }
                                className="p-4 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}
                {/* Step 5: Variants & Prices */}
                {pFormStep === 5 && (
                  <section className="animate-fade-in bg-white dark:bg-darkcard p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border dark:border-white/5 space-y-8 md:space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
                          <CurrencyDollarIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black dark:text-white uppercase tracking-tight">
                            Variantes & Preços
                          </h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Defina preços para cada versão do seu produto
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPVariants([
                            ...pVariants,
                            {
                              id: generateUUID(),
                              name: "",
                              price: parseFloat(pPrice) || 0,
                              stock: 100,
                            },
                          ])
                        }
                        className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 dark:bg-green-900/20 px-6 py-4 rounded-2xl"
                      >
                        + Nova Variante
                      </button>
                    </div>

                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-500/20">
                          <div className="space-y-3">
                              <label className="text-[10px] font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest ml-1">Preço Final de Venda (O que o cliente paga)</label>
                              <div className="relative">
                                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-blue-600">KZ</span>
                                  <input 
                                      type="number"
                                      step="0.01"
                                      value={pPrice}
                                      onChange={(e) => setPPrice(e.target.value)}
                                      className="w-full p-6 pl-12 bg-white dark:bg-black/40 dark:text-white rounded-3xl font-black text-2xl border-2 border-transparent focus:border-blue-600 outline-none shadow-xl"
                                  />
                              </div>
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest ml-1">Comissão para Afiliados (%)</label>
                              <input 
                                  type="number"
                                  value={pAffiliateRate}
                                  onChange={(e) => setPAffiliateRate(e.target.value)}
                                  className="w-full p-6 bg-white dark:bg-black/40 dark:text-white rounded-3xl font-black text-2xl border-2 border-transparent focus:border-blue-600 outline-none shadow-xl"
                              />
                          </div>
                      </div>

                      {/* Promoção Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-pink-50 dark:bg-pink-900/10 rounded-[2.5rem] border border-pink-500/20 mt-4">
                          <div className="space-y-3">
                              <label className="text-[10px] font-black text-pink-900 dark:text-pink-100 uppercase tracking-widest ml-1">Preço "De" (Sem desconto)</label>
                              <div className="relative">
                                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-pink-400">KZ</span>
                                  <input 
                                      type="number"
                                      step="0.01"
                                      value={pOriginalPrice}
                                      onChange={(e) => setPOriginalPrice(e.target.value)}
                                      className="w-full p-6 pl-12 bg-white dark:bg-black/40 dark:text-white rounded-3xl font-black text-2xl border-2 border-transparent focus:border-pink-600 outline-none shadow-xl"
                                      placeholder="Ex: 15.000"
                                  />
                              </div>
                              <p className="text-[9px] text-pink-600 font-bold uppercase ml-2 opacity-70">
                                  * Se preenchido, aparecerá o preço riscado.
                              </p>
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black text-pink-900 dark:text-pink-100 uppercase tracking-widest ml-1">Cálculo de Desconto Automático (%)</label>
                              <div className="relative">
                                  <input 
                                      type="number"
                                      value={pDiscount}
                                      onChange={(e) => setPDiscount(e.target.value)}
                                      className="w-full p-6 bg-white dark:bg-black/40 dark:text-white rounded-3xl font-black text-2xl border-2 border-transparent focus:border-pink-600 outline-none shadow-xl"
                                      placeholder="Ex: 20"
                                  />
                                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-pink-400">% OFF</span>
                              </div>
                          </div>
                      </div>

                      {pVariants.length > 0 && (
                          <div className="overflow-x-auto rounded-[2rem] border dark:border-white/5 bg-gray-50 dark:bg-white/5">
                              <table className="w-full text-left">
                                  <thead>
                                      <tr className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b dark:border-white/10">
                                          <th className="px-8 py-5">Identificação</th>
                                          <th className="px-8 py-5">Estoque</th>
                                          <th className="px-8 py-5">Preço Unitário</th>
                                          <th className="px-8 py-5">Ação</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y dark:divide-white/5">
                                      {pVariants.map((v, idx) => (
                                          <tr key={v.id} className="group">
                                              <td className="px-8 py-4">
                                                  <input 
                                                      type="text" 
                                                      value={v.name}
                                                      onChange={(e) => {
                                                          const newV = [...pVariants];
                                                          newV[idx].name = e.target.value;
                                                          setPVariants(newV);
                                                      }}
                                                      placeholder="Padrão"
                                                      className="w-full bg-white dark:bg-black/20 p-4 rounded-xl font-black text-[11px] uppercase outline-none border-2 border-transparent focus:border-green-500"
                                                  />
                                              </td>
                                              <td className="px-8 py-4">
                                                   <input 
                                                      type="number" 
                                                      value={v.stock}
                                                      onChange={(e) => {
                                                          const newV = [...pVariants];
                                                          newV[idx].stock = parseInt(e.target.value);
                                                          setPVariants(newV);
                                                      }}
                                                      className="w-24 bg-white dark:bg-black/20 p-4 rounded-xl font-black text-[11px] outline-none"
                                                  />
                                              </td>
                                              <td className="px-8 py-4">
                                                   <input 
                                                      type="number" 
                                                      step="0.01"
                                                      value={v.price}
                                                      onChange={(e) => {
                                                          const newV = [...pVariants];
                                                          newV[idx].price = parseFloat(e.target.value);
                                                          setPVariants(newV);
                                                      }}
                                                      className="w-32 bg-white dark:bg-black/20 p-4 rounded-xl font-black text-[11px] outline-none border-2 border-transparent focus:border-green-500"
                                                  />
                                              </td>
                                              <td className="px-8 py-4">
                                                   <button 
                                                      type="button"
                                                      onClick={() => setPVariants(pVariants.filter((_, i) => i !== idx))}
                                                      className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                                                   ><TrashIcon className="w-5 h-5" /></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Step 6: Shipping & Logistics */}
                {pFormStep === 6 && (
                  <section className="animate-fade-in bg-white dark:bg-darkcard p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border dark:border-white/5 space-y-8 md:space-y-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <TruckIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black dark:text-white uppercase tracking-tight">
                          {pType === ProductType.PHYSICAL ? "Logística de Envio" : "Finalização"}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {pType === ProductType.PHYSICAL ? "Configure custos e dimensões" : "Revise os detalhes antes de publicar"}
                        </p>
                      </div>
                    </div>

                    {pType === ProductType.PHYSICAL && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-6">
                              <div 
                                  onClick={() => setPHasFreeShipping(!pHasFreeShipping)}
                                  className={`p-10 rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center text-center gap-4 ${pHasFreeShipping ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                              >
                                  <GlobeAmericasIcon className={`w-16 h-16 ${pHasFreeShipping ? 'text-green-600' : 'text-gray-300'}`} />
                                  <div>
                                      <h5 className="font-black text-lg uppercase tracking-tight">Estratégia de Frete</h5>
                                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                                          {pHasFreeShipping ? 'Oferecendo Frete Grátis (Atrai mais clientes!)' : 'Cobrar Frete do Cliente'}
                                      </p>
                                  </div>
                                  <div className={`w-14 h-8 rounded-full p-1 transition-all ${pHasFreeShipping ? 'bg-green-600' : 'bg-gray-300'}`}>
                                      <div className={`w-6 h-6 bg-white rounded-full transition-all ${pHasFreeShipping ? 'translate-x-6' : 'translate-x-0'}`} />
                                  </div>
                              </div>

                              {!pHasFreeShipping && (
                                  <div className="space-y-3 animate-fade-in bg-white dark:bg-black/20 p-6 rounded-3xl border dark:border-white/5 shadow-xl">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Taxa de Entrega Fixa (KZ)</label>
                                      <div className="relative">
                                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-blue-600">KZ</span>
                                          <input 
                                              type="number"
                                              step="0.01"
                                              value={pShippingFee}
                                              onChange={(e) => setPShippingFee(e.target.value)}
                                              className="w-full p-6 pl-14 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl font-black text-2xl outline-none border-2 border-transparent focus:border-blue-600 shadow-inner"
                                              placeholder="Ex: 2.500"
                                          />
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div className="space-y-8 p-8 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border dark:border-white/5">
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Peso Bruto (kg)</label>
                                  <input 
                                      type="number"
                                      step="0.01"
                                      value={pWeight}
                                      onChange={(e) => setPWeight(e.target.value)}
                                      className="w-full p-5 bg-white dark:bg-black/20 dark:text-white rounded-2xl font-black border-2 border-transparent focus:border-blue-600 outline-none shadow-sm"
                                  />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dimensões da Caixa (cm)</label>
                                  <div className="grid grid-cols-3 gap-3">
                                      <input type="text" placeholder="Comp" className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold text-center text-xs" />
                                      <input type="text" placeholder="Larg" className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold text-center text-xs" />
                                      <input type="text" placeholder="Alt" className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold text-center text-xs" />
                                  </div>
                              </div>
                          </div>
                      </div>
                    )}

                    <div className="space-y-6 pt-6">
                      <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição Comercial Detalhada</label>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pDesc.length} / 5000</span>
                      </div>
                      <textarea 
                          value={pDesc}
                          onChange={(e) => setPDesc(e.target.value)}
                          className="w-full p-4 md:p-8 bg-gray-50 dark:bg-white/5 dark:text-white rounded-2xl md:rounded-[2.5rem] h-48 md:h-64 font-medium text-sm border-2 border-transparent focus:border-blue-600 outline-none resize-none shadow-inner"
                          placeholder="Descreva em detalhes as funcionalidades, benefícios e especificações do seu produto..."
                      />
                    </div>
                  </section>
                )}

                {/* Step 7: Promotion */}
                {pFormStep === 7 && (
                  <section className="animate-fade-in bg-white dark:bg-darkcard p-5 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border dark:border-white/5 space-y-8 md:space-y-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <RocketLaunchIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black dark:text-white uppercase tracking-tight">
                          Promover no Carrossel Principal
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Apareça no topo do feed para todos os usuários
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[1, 2, 5, 7, 15, 30].map(days => (
                            <button
                                type="button"
                                key={days}
                                onClick={() => setPPromotionDays(pPromotionDays === days ? 0 : days)}
                                className={`p-6 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${pPromotionDays === days ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500'}`}
                            >
                                <span className="text-2xl font-black">{days}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">DIAS</span>
                                <span className="text-[10px] font-bold mt-2 opacity-60">{formatCurrency(days * (settings?.promotedCarouselMinBidPerDay || 500))}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-500/20 flex gap-4">
                        <StarIcon className="w-8 h-8 text-blue-600 shrink-0" />
                        <div>
                            <h5 className="text-[10px] font-black uppercase text-blue-900 dark:text-blue-100 mb-1">Visibilidade Máxima</h5>
                            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                Ao promover seu produto, ele aparecerá em destaque no carrossel de promoções no topo do Feed de todos os usuários da CyberPhone. O valor será descontado do seu saldo após salvar.
                            </p>
                        </div>
                    </div>
                  </section>
                )}
              </div>
            </form>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white dark:bg-[#1a1a1a] border-t dark:border-white/5 p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-6 mt-auto">
              <button
                type="button"
                onClick={() => {
                  setIsAddingProduct(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 shrink-0"
              >
                Cancelar
              </button>
              
              <div className="flex flex-1 justify-end gap-3 sm:gap-4 overflow-hidden">
                {pFormStep > 1 && (
                    <button 
                        type="button"
                        onClick={() => setPFormStep(pFormStep - 1)}
                        className="px-4 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 whitespace-nowrap"
                    >Voltar</button>
                )}
                
                {pFormStep < FORM_STEPS[FORM_STEPS.length - 1].id ? (
                    <button 
                        type="button"
                        onClick={() => {
                           const currentIdx = FORM_STEPS.findIndex(s => s.id === pFormStep);
                           if (currentIdx !== -1 && currentIdx < FORM_STEPS.length - 1) {
                                setPFormStep(FORM_STEPS[currentIdx + 1].id);
                           }
                        }}
                        className="flex-1 sm:flex-none px-6 sm:px-12 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 transition-all active:scale-95 whitespace-nowrap"
                    >Próximo</button>
                ) : (
                    <button 
                        type="button"
                        onClick={handleCreateProduct}
                        disabled={uploading || !pName || !pPrice}
                        className="flex-1 sm:flex-none px-6 sm:px-12 py-3.5 bg-brand text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand/90 hover:shadow-xl hover:shadow-brand/20 transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        {uploading ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckBadgeIcon className="h-4 w-4" />
                            {editingProduct ? "Salvar" : "Publicar"}
                          </>
                        )}
                    </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {trackingModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-start sm:items-center justify-center p-4 animate-fade-in overflow-y-auto"
          onClick={() => setTrackingModal(null)}
        >
          <div
            className="bg-white dark:bg-darkcard w-full max-w-md rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative border border-white/10 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tight mb-6">
              Dados de Envio
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Código de Rastreio
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold dark:text-white outline-none"
                  placeholder="Ex: LB123456789HK"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  ID do Pedido no Fornecedor
                </label>
                <input
                  type="text"
                  value={supplierOrderId}
                  onChange={(e) => setSupplierOrderId(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold dark:text-white outline-none"
                  placeholder="Opcional"
                />
              </div>
              <button
                onClick={handleAddTracking}
                className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
              >
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManagerPage;
