
export type Page = 'auth' | 'feed' | 'profile' | 'chat' | 'ads' | 'live' | 'store' | 'manage-store' | 'reels-page' | 'search-results' | 'notifications' | 'settings' | 'admin' | 'events' | 'purchases' | 'cart' | 'affiliates' | 'create-group' | 'support' | 'monetization' | 'terms' | 'privacy' | 'saved' | 'blocked-users' | 'premium' | 'landing' | 'creator-center' | 'explore' | 'cyber-assistant' | 'product-detail' | 'post-detail';

export type MonetizationStatus = 'INELIGIBLE' | 'ELIGIBLE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export enum MonetizationTier {
  LEVEL_1 = 'LEVEL_1', 
  LEVEL_2 = 'LEVEL_2', 
  LEVEL_3 = 'LEVEL_3', 
  LEVEL_4 = 'LEVEL_4'  
}

export enum ChatType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP'
}

export type GroupTheme = 
  | 'blue' 
  | 'green' 
  | 'black' 
  | 'orange' 
  | 'purple' 
  | 'red' 
  | 'teal' 
  | 'pink' 
  | 'indigo' 
  | 'cyan';

export interface ChatConversation {
  id: string;
  type: ChatType;
  participants: string[]; // IDs dos usuários
  messages: Message[];
  groupName?: string;
  groupImage?: string;
  adminId?: string;
  isPublic?: boolean; 
  description?: string;
  theme?: GroupTheme; // NOVO: Tema visual do grupo
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; 
  groupId?: string;    
  timestamp: number;
  text?: string;
  // Campos de Mídia e Arquivos
  imageUrl?: string; // Mantido para compatibilidade, mas preferir fileUrl
  fileUrl?: string;
  fileType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  
  isDeleted?: boolean;
  isEdited?: boolean;
  isRead?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    senderAvatar?: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'document'; // Tipo do reply
  };
  reactions?: Record<string, string[]>; // emoji -> userIds
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  CHAT_FEE = 'CHAT_FEE',
  BOOST = 'BOOST',
  DONATION = 'DONATION',
  TICKET = 'TICKET',
  REFUND = 'REFUND'
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface SystemLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  details: string;
  timestamp: number;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetId: string; 
  targetType: 'POST' | 'COMMENT' | 'USER';
  reason: string;
  details: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  timestamp: number;
}

export interface AffiliateLink {
  id: string;
  affiliateId: string;
  productId: string;
  sellerId: string;
  link: string;
  clicks: number;
  timestamp: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentId: string;
  birthDate: number; 
  gender?: 'Masculino' | 'Feminino' | 'Personalizado' | null;
  profilePicture?: string;
  coverPhoto?: string;
  followedUsers: string[]; 
  followers: string[];     
  balance?: number;
  pendingBalance?: number;
  totalEarnings?: number;
  totalWithdrawn?: number;
  bio?: string;
  storeId?: string | null;
  isAdmin?: boolean;
  isVerified?: boolean;
  country?: string;
  idVerificationStatus?: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  idVerificationDocs?: {
    frontUrl?: string;
    backUrl?: string;
    selfieUrl?: string;
    rejectionReason?: string;
    submittedAt?: number;
    expiresAt?: number;
    aiConfidence?: number;
    extractedId?: string;
  };
  userType?: 'STANDARD' | 'CREATOR';
  isSuspended?: boolean;
  isFrozen?: boolean;
  verificationFileUrl?: string;
  blockedUserIds?: string[];
  // Status Online
  isOnline?: boolean;
  lastSeen?: number;
  preferredLanguage?: string;
  // Monetização
  isMonetized?: boolean;
  monetizationStatus?: MonetizationStatus;
  monetizationTier?: MonetizationTier;
  monetizationGoals?: {
    followersGoal: number;
    watchHoursGoal: number;
    shortsViewsGoal: number;
    currentFollowers: number;
    currentWatchHours: number;
    currentShortsViews: number;
    termsAccepted?: boolean;
    verificationStep?: boolean;
  };
  creatorStats?: {
    totalViews: number;
    totalWatchHours: number;
    revenueRPM: number; 
    estimatedEarnings: number;
    strikes?: number;
  };
  isPremium?: boolean;
  premiumExpiry?: number;
  autoTranslateEnabled?: boolean;
  address?: ShippingAddress;
  resellerName?: string;
  resellerBio?: string;
  resellerBanner?: string;
  createdAt?: number;
}

export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LIVE = 'LIVE',
  REEL = 'REEL',
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  profilePic?: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji -> userIds
  replies?: Comment[];
  isAnonymous?: boolean;
  isSuperChat?: boolean;
  superChatAmount?: number;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorProfilePic?: string;
  type: PostType;
  timestamp: number;
  content?: string;
  imageUrl?: string;
  groupId?: string; 
  groupName?: string; 
  fontFamily?: string;
  textColor?: string;
  fontSize?: string;
  backgroundColor?: string;
  isBoosted?: boolean;
  boostExpires?: number;
  boostBid?: number; // Valor do lance para o leilão de visibilidade
  targetLocations?: string[]; // NOVO: Localizações alvo para posts impulsionados
  minAge?: number; // NOVO: Idade mínima para posts impulsionados
  maxAge?: number; // NOVO: Idade máxima para posts impulsionados
  disableComments?: boolean; // Controle do criador
  likes: string[];
  comments: Comment[];
  shares: string[];
  saves: string[];
  isPinned?: boolean;
  isMonetized?: boolean;
  indicatedUserIds?: string[];
  reactions?: Record<string, string[]>;
  tags?: string[];
  isAnonymous?: boolean;
  reel?: {
    videoUrl: string;
    coverImageUrl?: string; // NOVO: Capa do vídeo
    description: string;
    audioTrackId?: string;
    aiEffectPrompt?: string;
    filter?: string;
  };
  liveStream?: {
    title: string;
    description: string;
    status?: 'LIVE' | 'ENDED'; // Status da transmissão
    recordingUrl?: string;     // URL da gravação se for Free
    guests?: any[];            // Lista de co-hosts convidados ou participando
    signaling?: Record<string, any>; // WebRTC signaling para os participantes
  };
  // Dados persistentes da Live
  liveChat?: Comment[];
  liveViewerCount?: number;
  liveHeartCount?: number;
  liveViewersMap?: Record<string, number>;
  views?: number; // NOVO: Contador de visualizações para Reels
  isVerified?: boolean; // NOVO: Status de verificação do autor no momento do post
}

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL_COURSE = 'DIGITAL_COURSE',
  DIGITAL_EBOOK = 'DIGITAL_EBOOK',
  DIGITAL_OTHER = 'DIGITAL_OTHER',
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Red, XL"
  price: number;
  stock: number;
  sku?: string;
  imageUrl?: string;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  affiliateCommissionRate: number;
  type: ProductType;
  ratings: ProductRating[];
  averageRating: number;
  ratingCount: number;
  soldCount?: number;
  category: string;
  status: 'active' | 'inactive';
  userId: string;
  digitalContentUrl?: string;
  digitalDownloadInstructions?: string;
  colors?: string[];
  
  // Atributos e Variantes (AliExpress Style)
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  videoUrl?: string;
  brand?: string;
  sku?: string;
  
  // Dados de Preço e Promoção
  originalPrice?: number;
  discountPercentage?: number;
  hasFreeShipping?: boolean;
  shippingFee?: number;
  
  // Posicionamento e Bidding (Leilão)
  positioning?: 'STANDARD' | 'TOP_SEARCH' | 'MAIN_BANNER';
  bidAmount?: number; // Valor pago para aparecer no topo/banner
  promotedUntil?: number; // Data de expiração da promoção
  promotionDays?: number; // Quantidade de dias contratados
  
  // Detalhes Específicos
  courseDetails?: {
    lessonsCount: number;
    totalHours: number;
    hasCertificate: boolean;
    modules: string[];
  };
  physicalDetails?: {
    weight?: number;
    dimensions?: string;
    stock: number;
  };
  digitalDetails?: {
    fileFormat: string;
    pageCount?: number;
    fileSize?: string;
  };
  
  condition?: 'NEW' | 'USED';
  timestamp?: number;
}

export interface ProductRating {
  id: string;
  saleId: string;
  userId: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface AdminSignal {
  id: string;
  adminId: string;
  type: 'VERIFICATION_REQUEST' | 'SUPPORT' | 'SUGGESTION' | 'COMPLIANCE_NOTICE';
  title: string;
  message: string;
  timestamp: number;
  readByOwner?: boolean;
  requiresPayment?: boolean;
  paymentAmount?: number;
  paymentStatus?: 'PENDING' | 'COMPLETED';
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  description: string;
  productIds: string[];
  brandColor?: string;
  isVerified?: boolean;
  verificationStatus?: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  performanceScore?: number; // 0-100
  adminSignals?: AdminSignal[];
  lastSignalAt?: number;
}

export enum OrderStatus {
  WAITLIST = 'WAITLIST',
  PROCESSING = 'PROCESSING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  CANCELED = 'CANCELED'
}

export interface Carrier {
  id: string;
  name: string;
  countries: string[];
  type: 'ROAD' | 'AIR' | 'SEA' | 'LOCAL';
  estimatedDays: string;
}

export const CARRIERS: Carrier[] = [
  // Local
  { id: 'express-local', name: 'Express Local', countries: ['Local'], type: 'ROAD', estimatedDays: '1-3 dias' },
  { id: 'rapid-delivery', name: 'Rapid Delivery', countries: ['Local'], type: 'ROAD', estimatedDays: '1-2 dias' },
  { id: 'standard-cargo', name: 'Standard Cargo', countries: ['Local'], type: 'ROAD', estimatedDays: 'Mesmo dia/24h' },
  // Internacional / PALOP / CPLP
  { id: 'dhl', name: 'DHL Express', countries: ['Brasil', 'Portugal', 'Moçambique', 'Cabo Verde', 'Guiné-Bissau', 'São Tomé e Príncipe', 'Timor-Leste', 'EUA', 'China'], type: 'AIR', estimatedDays: '3-7 dias' },
  { id: 'fedex', name: 'FedEx', countries: ['EUA', 'Brasil', 'Portugal', 'Espanha', 'Reino Unido'], type: 'AIR', estimatedDays: '3-5 dias' },
  { id: 'ctt', name: 'CTT Portugal', countries: ['Portugal'], type: 'LOCAL', estimatedDays: '1-3 dias' },
  { id: 'correios-br', name: 'Correios Brasil', countries: ['Brasil'], type: 'LOCAL', estimatedDays: '2-10 dias' },
  { id: 'ups', name: 'UPS', countries: ['Mundial'], type: 'AIR', estimatedDays: '3-7 dias' }
];

export interface AffiliateSale {
  id: string;
  productId: string;
  buyerId: string;
  affiliateUserId: string;
  storeId: string;
  commissionEarned: number;
  saleAmount: number;
  timestamp: number;
  status: OrderStatus;
  carrierId?: string;
  carrierName?: string;
  isRated?: boolean;
  shippingAddress?: ShippingAddress;
  digitalContentUrl?: string;
  digitalDownloadInstructions?: string;
  supplierOrderId?: string;
  trackingCode?: string;
  sellerId: string;
  sellerEarnings?: number;
  affiliateEarnings?: number;
  fundsReleased?: boolean;
}

export interface ShippingAddress {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  carrierName?: string;
}

export interface AdCampaign {
  id: string;
  userId: string;
  userName?: string;
  name?: string;
  title: string;
  description: string;
  targetAudience: string;
  budget: number;
  dailyBudget?: number;
  reachedUsers?: string[];
  bidStrategy: 'CPM' | 'CPC';
  bidAmount: number;
  isActive: boolean;
  imageUrl?: string;
  videoUrl?: string; // NOVO: Suporte a anúncios em vídeo
  linkUrl?: string;
  ctaText?: string;
  timestamp: number;
  minAge?: number;
  maxAge?: number;
  locations?: string[]; 
  categories?: string[];
  performance?: {
    impressions: number;
    clicks: number;
    spend: number;
  };
  // Novos campos para Ciclo de Vida e Cobrança Recorrente
  billingCycle: 'DAILY' | 'WEEKLY';
  startDate: number;
  endDate: number;
  lastBillingDate: number;
  isAutoRenew: boolean;
  notifiedRenewal?: boolean;
  renewalAmount: number;
  promotedUntil?: number;
  promotionDays?: number;
}

export interface EarningRecord {
  id: string;
  creatorId: string;
  date: string; 
  adRevenue: number;
  donationsRevenue: number;
  subscriptionsRevenue: number;
  totalDaily: number;
  viewsCount: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: 'FREE' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';
  startDate: number;
  expiryDate: number;
  autoRenew: boolean;
}

export interface SuperChat {
  id: string;
  chatId: string;
  userId: string;
  userName: string;
  userProfilePic?: string;
  amount: number;
  currency: string;
  message: string;
  color: string;
  timestamp: number;
}

export interface CyberEvent {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  dateTime: number;
  endDateTime?: number;
  type: 'ONLINE' | 'PRESENTIAL';
  attendees: string[];
  imageUrl: string;
  mediaType?: 'image' | 'video'; // NOVO CAMPO: Suporte a vídeo
  location?: string;
  isPublic?: boolean;
}

export interface GlobalSettings {
  platformTax: number;
  minWithdrawal: number;
  maintenanceMode: boolean;
  boostFee: number;
  boostMinBid?: number; // Lance mínimo inicial
  boostDailyMin?: number; // Lance mínimo por dia
  adMinBudget?: number;
  adReachCost?: number;
  verificationFee?: number;
  groupCreationFee?: number;
  storeCreationFee?: number;
  positioningMinBid?: number;
  promotedCarouselMinBidPerDay?: number;
  monetizationMinFollowers?: number;
  monetizationMinWatchHours?: number;
  monetizationMinReelViews?: number;
  creatorRevenueShare?: number; // Percentual para o criador (ex: 0.7)
  orderCancellationFeePercentage?: number; // Taxa de cancelamento de pedido pelo comprador (%)
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedColor?: string;
  affiliateId?: string;
}

export enum NotificationType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  AFFILIATE_SALE = 'AFFILIATE_SALE',
  REACTION = 'REACTION',
  MESSAGE = 'MESSAGE',
  NEW_POST = 'NEW_POST',
  INDICATION = 'INDICATION',
  GROUP_POST = 'GROUP_POST',
  MISSED_CALL = 'MISSED_CALL'
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  timestamp: number;
  postId?: string;
  saleId?: string;
  isRead: boolean;
  groupName?: string;
  callType?: CallType;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userProfilePic: string;
  imageUrl?: string;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  filter?: string;
  timestamp: number;
  views: string[];
}

export interface GroupedStory {
  userId: string;
  userName: string;
  userProfilePic: string;
  items: Story[];
}

export interface PaymentCard {
  id: string;
  userId: string;
  cardNumber: string;
  expiryDate: string;
  cardHolderName: string;
}

export enum CallType {
  VOICE = 'VOICE',
  VIDEO = 'VIDEO'
}

export enum CallStatus {
  RINGING = 'RINGING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
  TIMED_OUT = 'TIMED_OUT'
}

export interface Call {
  id: string;
  callerId: string;
  callerName: string;
  callerProfilePic?: string;
  receiverId: string;
  receiverName: string;
  receiverProfilePic?: string;
  type: CallType;
  status: CallStatus;
  timestamp: number;
  acceptedAt?: number;
  endedAt?: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: 'TECHNICAL' | 'BILLING' | 'ABUSE' | 'OTHER';
  status: 'OPEN' | 'RESOLVED';
  messages: SupportMessage[];
  createdAt: number;
  updatedAt: number;
  assignedAdminId?: string;
}

export interface SupportMessage {
  id: string;
  senderId: string; // 'SUPPORT' or UserID
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video';
  timestamp: number;
}

export interface VideoFilter {
  id: string;
  label: string;
  css: string;
}

export const AI_FILTERS: VideoFilter[] = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'ai-clean', label: 'IA Clean', css: 'brightness(1.08) contrast(1.05) saturate(1.1) blur(0.3px)' },
  { id: 'ai-pro', label: 'IA Pro', css: 'brightness(1.15) contrast(1.1) saturate(1.15) sepia(0.05)' },
  { id: 'ai-soft', label: 'IA Suave', css: 'brightness(1.05) saturate(1.05) blur(0.8px)' },
  { id: 'ai-noir', label: 'IA Cinema', css: 'grayscale(0.2) contrast(1.2) brightness(0.9) saturate(1.1)' }
];
