
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShoppingBagIcon, 
  ChatBubbleBottomCenterIcon, 
  VideoCameraIcon, 
  RocketLaunchIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  UserGroupIcon,
  PlayIcon,
  HeartIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  ChevronDownIcon,
  BoltIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';
import { Post, Product, User, Page, PostType } from '../types';
import { getPosts, getProducts, findUserById } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';

interface LandingPageProps {
  currentUser: User | null;
  onGoToAuth: () => void;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string, affiliateId?: string) => void;
  onOpenCart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ currentUser, onGoToAuth, onNavigate, refreshUser, onAddToCart, onOpenCart }) => {
  const [activeTab, setActiveTab ] = useState<'hero' | 'discover'>('hero');
  const [discoverMode, setDiscoverMode] = useState<'reels' | 'videos' | 'shop'>('reels');
  const [publicReels, setPublicReels] = useState<Post[]>([]);
  const [publicVideos, setPublicVideos] = useState<Post[]>([]);
  const [publicProducts, setPublicProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentReelIdx, setCurrentReelIdx] = useState(0);
  const reelContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [posts, products] = await Promise.all([
          getPosts('guest'), 
          getProducts()
        ]);
        setPublicReels(posts.filter(p => p.type === PostType.REEL).slice(0, 15));
        setPublicVideos(posts.filter(p => p.type === PostType.VIDEO).slice(0, 12));
        setPublicProducts(products.slice(0, 12));
      } catch (e) {
        console.error("Error fetching guest content", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGoToAuth();
  };

  const scrollDiscovery = () => {
    setActiveTab('discover');
    setTimeout(() => {
      document.getElementById('discovery-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0c10] overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-xs">CP</span>
          </div>
          <span className="text-xl font-black tracking-tighter text-gray-900 dark:text-white uppercase transition-colors">CyBerPhone</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onGoToAuth}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            Entrar agora
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -translate-x-1/2" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full translate-x-1/2" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">A revolução digital chegou</span>
          </div>
          
          <h1 className="text-[13vw] sm:text-[10vw] md:text-[8vw] font-black text-gray-900 dark:text-white tracking-tighter leading-[0.85] mb-8 uppercase text-balance">
            Angola em <br />
            <span className="text-blue-600 italic font-serif lowercase tracking-normal">outra</span> dimensão
          </h1>
          
          <p className="text-gray-500 dark:text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed mb-12 px-4 italic font-serif">
            "Mais do que uma rede social, o CyBerPhone é o epicentro da nova economia digital angolana. Conecte-se com o que realmente importa."
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollDiscovery}
              className="group relative w-full sm:w-auto px-12 py-6 bg-blue-600 text-white rounded-full font-black uppercase text-sm tracking-widest overflow-hidden shadow-2xl shadow-blue-500/40"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                Explorar Feed
                <PlayIcon className="h-5 w-5 group-hover:scale-125 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
            <button 
              onClick={onGoToAuth}
              className="px-12 py-6 border-2 border-gray-200 dark:border-white/10 rounded-full font-black uppercase text-sm tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95 text-gray-900 dark:text-white"
            >
              Criar Conta
            </button>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:block"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-blue-600 to-transparent" />
        </motion.div>
      </section>

      {/* TikTok Discovery Section */}
      <section id="discovery-section" className="min-h-screen bg-black text-white relative">
         {/* Discovery Header */}
         <div className="sticky top-[72px] z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-md">
            <div className="flex items-center gap-8 flex-1 justify-center">
               <button 
                  onClick={() => setDiscoverMode('reels')}
                  className={`text-sm font-black uppercase tracking-widest transition-all ${discoverMode === 'reels' ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500 hover:text-gray-300'}`}
               >
                  Reels
               </button>
               <button 
                  onClick={() => setDiscoverMode('videos')}
                  className={`text-sm font-black uppercase tracking-widest transition-all ${discoverMode === 'videos' ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500 hover:text-gray-300'}`}
               >
                  Vídeos
               </button>
               <button 
                  onClick={() => setDiscoverMode('shop')}
                  className={`text-sm font-black uppercase tracking-widest transition-all ${discoverMode === 'shop' ? 'text-white border-b-2 border-white pb-1' : 'text-gray-500 hover:text-gray-300'}`}
               >
                  Shop
               </button>
            </div>
            <button onClick={onGoToAuth} className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-colors">
               <BoltIcon className="h-3 w-3" />
               Entrar
            </button>
         </div>

         <div className="h-[calc(100vh-130px)] flex">
            {/* TikTok Style Side Nav */}
            <div className="hidden md:flex flex-col w-20 border-r border-white/5 items-center py-8 gap-10">
               <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex flex-col items-center gap-1">
                  <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-blue-600 transition-colors">
                     <GlobeAltIcon className="h-5 w-5 text-gray-400 group-hover:text-white" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Home</span>
               </button>
               <button onClick={handleAction} className="group flex flex-col items-center gap-1">
                  <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-blue-600 transition-colors">
                     <UserGroupIcon className="h-5 w-5 text-gray-400 group-hover:text-white" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Seguir</span>
               </button>
               <button onClick={handleAction} className="group flex flex-col items-center gap-1">
                  <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-blue-600 transition-colors">
                     <PlayIcon className="h-5 w-5 text-gray-400 group-hover:text-white" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">LIVE</span>
               </button>
            </div>

            <div className="flex-1 relative">
               <AnimatePresence mode="wait">
               {discoverMode === 'reels' ? (
                  <motion.div 
                    key="reels-discovery"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
                  >
                     {publicReels.length > 0 ? (
                        <>
                           {/* Guest Mode Banner */}
                           <div className="sticky top-0 z-40 bg-blue-600/20 backdrop-blur-md px-6 py-2 border-b border-blue-500/20 text-center">
                              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center justify-center gap-2">
                                 <BoltIcon className="h-3 w-3" />
                                 Você está no modo visitante — Algumas interações estão limitadas
                              </p>
                           </div>
                           
                           {publicReels.map((reel, idx) => (
                           <div key={reel.id} className="h-full w-full snap-start snap-always relative flex items-center justify-center overflow-hidden bg-black">
                              {/* Fake Reel Background (Image/Video Placeholder) */}
                              {reel.reel && (
                                <video 
                                  src={reel.reel.videoUrl} 
                                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                                  autoPlay 
                                  muted 
                                  loop 
                                  playsInline
                                  controlsList="nodownload"
                                  onContextMenu={(e) => e.preventDefault()}
                                />
                              )}
                              
                              {/* Overlay for actions blocked */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="absolute bottom-24 right-4 flex flex-col items-center gap-6 pointer-events-auto">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="relative group cursor-pointer" onClick={handleAction}>
                                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/40 transition-colors">
                                          <HeartIcon className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 rounded-full p-0.5 border border-black group-hover:scale-125 transition-transform">
                                           <BoltIcon className="h-2 w-2 text-white" />
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-black">{reel.likes?.length || 0}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                      <button onClick={handleAction} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/40 transition-colors">
                                        <ChatBubbleBottomCenterIcon className="h-6 w-6 text-white" />
                                      </button>
                                      <span className="text-[10px] font-black">{reel.comments?.length || 0}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                      <button onClick={handleAction} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/40 transition-colors">
                                        <ArrowRightIcon className="h-6 w-6 text-white" />
                                      </button>
                                      <span className="text-[10px] font-black">Share</span>
                                    </div>

                                    <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-black animate-spin-slow">
                                       <img src={DEFAULT_PROFILE_PIC} className="w-full h-full object-cover" />
                                    </div>
                                </div>

                                <div className="absolute bottom-10 left-6 right-24 pointer-events-auto overflow-hidden">
                                   <div className="flex items-center gap-2 mb-3">
                                      <div className="relative">
                                         <div className="w-10 h-10 rounded-full border-2 border-white shadow-xl overflow-hidden bg-white/10">
                                            <img src={DEFAULT_PROFILE_PIC} className="w-full h-full object-cover" />
                                         </div>
                                         <button onClick={handleAction} className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border border-black hover:scale-125 transition-transform">
                                            <ArrowRightIcon className="h-2 w-2 text-white" />
                                         </button>
                                      </div>
                                      <span className="font-black text-sm uppercase tracking-tighter cursor-pointer hover:underline" onClick={handleAction}>@{reel.authorName}</span>
                                   </div>
                                   <p className="text-xs font-medium text-white/90 line-clamp-2 mb-4 leading-relaxed tracking-tight max-w-[80%]">{reel.reel?.description}</p>
                                   <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full w-fit">
                                      <MusicalNoteIcon className="h-3 w-3 text-white animate-pulse" />
                                      <div className="overflow-hidden w-24">
                                         <p className="text-[9px] font-black uppercase tracking-widest text-white/80 whitespace-nowrap animate-marquee">Áudio Original - {reel.authorName}</p>
                                      </div>
                                   </div>
                                </div>
                              </div>

                              {/* Interaction Warning Backdrop */}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] text-center max-w-xs hidden md:block">
                                   <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Gostou desse conteúdo?</h3>
                                   <p className="text-xs text-gray-400 mb-6 font-medium">Faça login para interagir, comentar e seguir seus criadores favoritos.</p>
                                   <button onClick={onGoToAuth} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Entrar agora</button>
                                </div>
                              </div>
                           </div>
                        ))}
                     </>
                  ) : (
                     <div className="h-full flex items-center justify-center bg-zinc-900">
                           <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
                        </div>
                     )}
                  </motion.div>
               ) : discoverMode === 'videos' ? (
                  <motion.div 
                     key="videos-discovery"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     className="h-full w-full overflow-y-auto p-6 scrollbar-thin"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 pb-20">
                        {publicVideos.map(video => (
                           <div key={video.id} className="bg-[#1a1c23] rounded-2xl overflow-hidden border border-white/5 group cursor-pointer" onClick={handleAction}>
                              <div className="aspect-video relative overflow-hidden bg-black">
                                 {video.reel?.videoUrl && (
                                   <video src={video.reel.videoUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                                 )}
                                 <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                                    <PlayIcon className="h-10 w-10 text-white/50" />
                                 </div>
                              </div>
                              <div className="p-4">
                                 <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2 line-clamp-2">{video.reel?.description || video.content || 'Sem título'}</h4>
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                          <span className="text-[8px] font-black">{video.authorName?.[0]}</span>
                                       </div>
                                       <span className="text-[10px] font-black text-gray-400 capitalize">{video.authorName}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Ver agora</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </motion.div>
               ) : (
                  <motion.div 
                     key="shop-discovery"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     className="h-full w-full overflow-y-auto p-6 scrollbar-thin"
                  >
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-6 pb-20">
                        {publicProducts.map(product => (
                           <div key={product.id} className="bg-[#1a1c23] rounded-2xl overflow-hidden border border-white/5 flex flex-col group cursor-pointer" onClick={handleAction}>
                              <div className="aspect-square relative overflow-hidden bg-zinc-900">
                                 <img src={product.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                 <div className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider text-white">Promo</div>
                              </div>
                              <div className="p-3">
                                 <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">{product.name}</h4>
                                 <div className="flex items-center justify-between">
                                    <span className="text-sm font-black text-white">${product.price.toFixed(2)}</span>
                                    <button className="p-2 bg-blue-600/20 text-blue-500 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                       <ShoppingBagIcon className="h-3 w-3" />
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>

      {/* Sticky Footer Reminder */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-xl z-[60]">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white p-4 md:p-6 rounded-[2rem] shadow-2xl flex items-center justify-between gap-4 md:gap-8"
            >
               <div className="hidden md:block">
                  <h4 className="text-gray-900 font-black uppercase text-xs tracking-widest mb-1">Crie sua conta</h4>
                  <p className="text-[10px] text-gray-500 font-medium">Participe da conversa em Angola.</p>
               </div>
               <button onClick={onGoToAuth} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/30">Inscrever-se Grátis</button>
               <button onClick={onGoToAuth} className="px-6 py-4 border-2 border-gray-100 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-900">Login</button>
            </motion.div>
         </div>
      </section>

      {/* Feature Showcase - Editorial Layout */}
      <section className="py-24 px-6 border-y border-gray-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative aspect-square md:aspect-video lg:aspect-[4/5] bg-gray-900 rounded-[3rem] overflow-hidden group shadow-2xl">
                 <div className="absolute inset-0 bg-blue-600/20 group-hover:bg-blue-600/10 transition-colors" />
                 {/* Fake Screen UI */}
                 <div className="absolute inset-4 bg-black rounded-[2rem] border border-white/10 p-6 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                       <div className="w-10 h-1 bg-white/20 rounded-full" />
                       <div className="flex gap-2">
                          <div className="w-4 h-4 rounded-full bg-white/10" />
                          <div className="w-4 h-4 rounded-full bg-blue-600/40" />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                       <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                       <div className="aspect-video bg-white/5 rounded-2xl w-full" />
                       <div className="flex gap-4">
                          <div className="h-8 w-8 rounded-lg bg-blue-600/20" />
                          <div className="h-8 w-8 rounded-lg bg-blue-600/20" />
                       </div>
                    </div>
                 </div>
                 {/* Floating Label */}
                 <div className="absolute -bottom-6 -right-6 bg-white dark:bg-[#1a1c23] p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 max-w-[200px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Social Feed</p>
                    <p className="text-sm font-bold leading-tight">Onde a comunidade se encontra.</p>
                 </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-600">01. Conectividade</p>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">
                Não é apenas <br /> 
                <span className="text-blue-600">Postar</span>. <br />
                É Pertencer.
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-serif italic text-xl">
                 "No CyBerPhone, cada interação é uma oportunidade de crescimento. Nossa tecnologia aproxima quem está longe e fortalece quem está perto."
              </p>
              <ul className="space-y-4 pt-4">
                {['Feed Inteligente', 'Comunidades Temáticas', 'ID Digital Verificado'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-black uppercase tracking-wider">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2 - Marketplace */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-black/40">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <p className="text-xs font-black uppercase tracking-[0.4em] text-green-600">02. Economia Digital</p>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">
                Transforme <br /> 
                Ideias em <br />
                <span className="text-green-600">AKZ</span>.
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-serif italic text-xl">
                 "O maior marketplace seguro de Angola agora no seu bolso. Escrow, integridade e oportunidades para todos os empreendedores."
              </p>
              <div className="flex gap-4 pt-6">
                 <div className="p-6 bg-white dark:bg-white/5 rounded-3xl shadow-xl flex-1 border border-gray-100 dark:border-white/5 group hover:border-green-500/30 transition-colors">
                    <BanknotesIcon className="h-8 w-8 text-green-600 mb-4" />
                    <h4 className="font-black uppercase text-xs tracking-widest mb-1">Venda Seguro</h4>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Checkout Otimizado</p>
                 </div>
                 <div className="p-6 bg-white dark:bg-white/5 rounded-3xl shadow-xl flex-1 border border-gray-100 dark:border-white/5 group hover:border-green-500/30 transition-colors">
                    <ShoppingBagIcon className="h-8 w-8 text-green-600 mb-4" />
                    <h4 className="font-black uppercase text-xs tracking-widest mb-1">Compre VIP</h4>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Produtos Curados</p>
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-4">
                  <div className="h-64 bg-gray-200 dark:bg-white/5 rounded-[2rem] overflow-hidden" />
                  <div className="h-40 bg-green-600/10 rounded-[2rem] border border-green-500/20" />
               </div>
               <div className="space-y-4 pt-12">
                  <div className="h-40 bg-gray-200 dark:bg-white/5 rounded-[2rem]" />
                  <div className="h-64 bg-gray-200 dark:bg-white/5 rounded-[2rem] overflow-hidden" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reels Feature - Full Width Immersive */}
      <section className="py-32 px-6 bg-[#050505] text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center mb-20">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-500 mb-6 transition-all duration-700">Exploração Infinita</p>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-8">
            Momentos <br /> Que <span className="text-blue-500">Inspiram</span>.
          </h2>
          <p className="text-gray-400 font-serif italic text-xl max-w-xl mx-auto">
            "Descubra o talento angolano através de vídeos curtos. Música, humor e criatividade sem limites."
          </p>
        </div>

        <div className="flex gap-4 md:gap-8 justify-center overflow-hidden px-4">
           {[1, 2, 3, 4, 5].map((i) => (
             <motion.div 
               key={i}
               whileHover={{ y: -20, scale: 1.02 }}
               className={`relative h-[400px] md:h-[600px] w-64 rounded-[2rem] bg-gray-900 border border-white/10 flex-shrink-0 overflow-hidden ${i % 2 === 0 ? 'mt-12' : ''}`}
             >
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm" />
                    <div className="w-20 h-2 bg-white/20 rounded-full" />
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                   <PlayIcon className="w-12 h-12 text-white/40" />
                </div>
             </motion.div>
           ))}
        </div>
      </section>

      {/* Stats / Trust Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
             {[
               { label: 'Cidadãos', val: '100K+', icon: UserGroupIcon },
               { label: 'Negócios', val: '5K+', icon: ShoppingBagIcon },
               { label: 'Transações', val: '2B+', icon: BanknotesIcon },
               { label: 'Alcance', val: 'Global', icon: GlobeAltIcon }
             ].map((stat, i) => (
               <div key={i} className="group cursor-default">
                  <div className="mb-6 mx-auto w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-500">
                     <stat.icon className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <h4 className="text-4xl font-black tracking-tighter mb-2">{stat.val}</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{stat.label}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Final */}
      <section className="py-32 px-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-blue-600 -z-10" />
         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent -z-10" />
         
         <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-12">
               O futuro não <br /> espera. <span className="text-blue-200 italic font-serif lowercase tracking-normal">e você?</span>
            </h2>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGoToAuth}
              className="px-16 py-8 bg-white text-blue-600 rounded-full font-black uppercase text-lg tracking-[0.2em] shadow-2xl transition-all"
            >
              Criar minha conta agora
            </motion.button>
            <p className="mt-8 text-blue-100/60 text-xs font-black uppercase tracking-[0.3em]">Junte-se a milhares de angolanos hoje.</p>
         </div>
      </section>

      {/* Footer refined */}
      <footer className="pt-32 pb-16 px-6 bg-white dark:bg-[#0a0c10]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
             <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-blue-600 rounded-[12px] flex items-center justify-center">
                    <span className="text-white font-black text-xs">CP</span>
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">CyBerPhone</span>
                </div>
                <p className="text-gray-400 font-serif italic text-lg max-w-sm">
                  "Redefinindo os limites da conexão digital no coração de África."
                </p>
             </div>
             <div>
                <h5 className="font-black uppercase text-[10px] tracking-widest text-blue-600 mb-6">Plataforma</h5>
                <ul className="space-y-4">
                   {['Marketplace', 'Feed Social', 'CyBer Reels', 'CyBer Wallet'].map(link => (
                     <li key={link}>
                       <button onClick={onGoToAuth} className="text-sm font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider transition-colors">{link}</button>
                     </li>
                   ))}
                </ul>
             </div>
             <div>
                <h5 className="font-black uppercase text-[10px] tracking-widest text-blue-600 mb-6">Legal</h5>
                <ul className="space-y-4">
                   {['Termos de Uso', 'Privacidade', 'Cookies', 'Suporte'].map(link => (
                     <li key={link}>
                       <button onClick={onGoToAuth} className="text-sm font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider transition-colors">{link}</button>
                     </li>
                   ))}
                </ul>
             </div>
          </div>
          <div className="pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col md:row items-center justify-between gap-6">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">© 2026 CyBerPhone Angola — All Rights Reserved.</p>
             <div className="flex gap-6">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors group cursor-pointer">
                   <GlobeAltIcon className="h-4 w-4 text-gray-400 group-hover:text-white" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors group cursor-pointer">
                   <HeartIcon className="h-4 w-4 text-gray-400 group-hover:text-white" />
                </div>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
