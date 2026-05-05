
import React, { useState, useEffect } from 'react';
import { User, Post, AdCampaign, Product, PostType, Page } from '../types';
import { 
  findUserById, 
  updateUser,
  getPosts,
  getAds,
  getProducts,
  toggleFollowUser,
  toggleAdActive,
  formatLastSeen,
  isUserOnline,
  getMutualBlockedUserIds
} from '../services/storageService';
import { getAoaExchangeRate } from '../services/currencyService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { 
  CheckBadgeIcon, 
  TrophyIcon,
  WalletIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  UserIcon,
  Squares2X2Icon,
  ShoppingBagIcon,
  MegaphoneIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  PlusIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  MapPinIcon,
  VideoCameraIcon,
  BanknotesIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid';
import PostCard from './PostCard';
import AdCard from './AdCard';

interface ProfilePageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  refreshUser: () => void;
  userId?: string;
  onOpenWallet: (mode: 'deposit' | 'withdraw') => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, onNavigate, refreshUser, userId, onOpenWallet }) => {
  const profileId = userId || currentUser.id;
  
  const [profile, setProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'classes' | 'about' | 'store' | 'ads'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userClasses, setUserClasses] = useState<Post[]>([]);
  const [userAds, setUserAds] = useState<AdCampaign[]>([]);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(930);
  
  useEffect(() => {
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchRate();
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      let targetUser = await findUserById(profileId);
      
      if (!targetUser && profileId === currentUser.id) {
        targetUser = currentUser;
      }

      setProfile(targetUser || null);
      
      if (targetUser) {
          // Verificação de Bloqueio Mútuo
          const hiddenIds = await getMutualBlockedUserIds(currentUser.id);
          if (hiddenIds.includes(targetUser.id)) {
              setProfile(null);
              setLoading(false);
              return;
          }

          setIsFollowing(targetUser.followers?.includes(currentUser.id) || false);
          const allPosts = await getPosts(currentUser.id);
          const filteredPosts = allPosts.filter(p => p.userId === profileId).sort((a, b) => b.timestamp - a.timestamp);
          
          const recordedLives = filteredPosts.filter(p => p.type === PostType.LIVE && p.liveStream?.status === 'ENDED' && p.liveStream?.recordingUrl);
          const normalFeed = filteredPosts.filter(p => !(p.type === PostType.LIVE && p.liveStream?.status === 'ENDED'));

          setUserClasses(recordedLives);
          setUserPosts(normalFeed);

          const allAds = await getAds();
          setUserAds(allAds.filter(a => a.professorId === profileId));

          if (targetUser.storeId) {
              const allProducts = await getProducts();
              setUserProducts(allProducts.filter(p => p.storeId === targetUser.storeId));
          }
      }
      
      setLoading(false);
    };
    fetchData();
  }, [profileId, currentUser]);

  const handleToggleFollow = async () => {
    if (!profile) return;
    try {
      await toggleFollowUser(currentUser.id, profile.id);
      setIsFollowing(!isFollowing);
      refreshUser();
      
      // Update local profile state to reflect new follower count
      setProfile(prev => {
        if (!prev) return null;
        const newFollowers = isFollowing 
          ? prev.followers.filter(id => id !== currentUser.id)
          : [...prev.followers, currentUser.id];
        return { ...prev, followers: newFollowers };
      });
    } catch (error) {
      console.error("Erro ao seguir usuário:", error);
    }
  };

  if (!profile) {
    return (
        <div className="flex flex-col items-center justify-center pt-32 px-4 text-center animate-fade-in">
            <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-full mb-6">
                <UserIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Perfil Indisponível</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">Não foi possível carregar as informações deste usuário no momento.</p>
            <button 
              onClick={() => onNavigate('feed')} 
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
               <ArrowPathIcon className="h-4 w-4" /> Voltar ao Feed
            </button>
        </div>
    );
  }

  const isOwnProfile = currentUser.id === profile.id;
  const followerCount = profile.followers?.length || 0;
  
  // Condição: Se sigo ou se sou seguido
  const canChat = isFollowing || (profile.followedUsers?.includes(currentUser.id));
  
  const joinDate = new Date(parseInt(profile.id.split('-')[1]) || Date.now()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="container mx-auto px-4 pt-6 md:pt-10 pb-32 max-w-6xl animate-fade-in">
       
       {/* ÁREA ADMINISTRATIVA (Apenas Admin Próprio) */}
       {isOwnProfile && currentUser.isAdmin && (
         <div className="mb-8 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 rounded-[2.5rem] p-1 shadow-2xl animate-fade-in">
            <div className="bg-[#0a0c10] rounded-[2.4rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
               <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
                  <ShieldCheckIcon className="h-48 w-48 text-white" />
               </div>
               <div className="flex items-center gap-6 relative z-10">
                  <div className="p-5 bg-red-600/20 rounded-[1.8rem] border border-red-500/30">
                     <ShieldCheckIcon className="h-10 w-10 text-red-500" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Portal Administrativo</h3>
                     <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                        Painel de Controle Global <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                     </p>
                  </div>
               </div>
               <button 
                 onClick={() => onNavigate('admin')}
                 className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-red-900 relative z-10"
               >
                 Acessar Painel de Comando
               </button>
            </div>
         </div>
       )}
 
       {/* HEADER DO PERFIL */}
       <div className="bg-white dark:bg-[#1a1c23] rounded-[3rem] shadow-2xl border border-gray-100 dark:border-white/5 mb-8 relative flex flex-col">
          
          {/* Banner */}
          <div className="h-40 md:h-64 relative shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-900 rounded-t-[3rem]">
             {profile.coverPhoto ? (
                <img 
                  src={profile.coverPhoto} 
                  className="absolute inset-0 w-full h-full object-cover" 
                  alt="Capa do Perfil" 
                  referrerPolicy="no-referrer"
                />
             ) : (
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             )}
          </div>
          
          {/* Foto de Perfil */}
          <div className="absolute top-40 md:top-64 -mt-16 left-1/2 -translate-x-1/2 md:left-12 md:translate-x-0 z-30">
             <div className="relative group">
                <img 
                  src={profile.profilePicture || DEFAULT_PROFILE_PIC} 
                  className="w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] border-[6px] border-white dark:border-[#1a1c23] shadow-2xl object-cover bg-gray-200" 
                  alt={profile.firstName}
                  referrerPolicy="no-referrer"
                />
                {isUserOnline(profile.lastSeen, profile.isOnline) && (
                  <div className="absolute bottom-2 right-2 w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full border-4 border-white dark:border-[#1a1c23] shadow-lg animate-pulse"></div>
                )}
             </div>
          </div>
 
          {/* Informações do Usuário */}
          <div className="pt-20 px-6 pb-8 md:pl-64 md:pt-4 md:pr-12 flex flex-col items-center md:items-start text-center md:text-left">
             <div className="mb-6 w-full">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                                {profile.firstName} {profile.lastName}
                            </h2>
                            {profile.isVerified && <CheckBadgeIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />}
                            {profile.isMonetized && (
                              <div className="bg-gradient-to-r from-brand to-indigo-600 p-1.5 rounded-xl shadow-lg border border-white/20" title="Criador Parceiro CyberPhone">
                                <BanknotesIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                              </div>
                            )}
                            {profile.isPremium && (
                              <div className="bg-amber-400 px-2 py-0.5 rounded-lg shadow-sm" title="Usuário Premium">
                                <span className="text-[9px] font-black text-black uppercase tracking-tighter">Premium</span>
                              </div>
                            )}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" /> Membro da Comunidade</span>
                            <span className={`flex items-center gap-1.5 ${isUserOnline(profile.lastSeen, profile.isOnline) ? 'text-green-500' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${isUserOnline(profile.lastSeen, profile.isOnline) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                {formatLastSeen(profile.lastSeen, profile.isOnline)}
                            </span>
                        </div>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0 justify-center">
                        {!isOwnProfile ? (
                            <>
                            <button 
                                onClick={handleToggleFollow}
                                className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all ${
                                    isFollowing 
                                    ? 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                {isFollowing ? 'Seguindo' : 'Seguir'}
                            </button>
                            <button 
                                onClick={() => canChat ? onNavigate('chat', { userId: profile.id }) : null} 
                                disabled={!canChat}
                                className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all flex items-center justify-center gap-2 ${
                                    canChat 
                                    ? 'bg-gray-100 dark:bg-white/10 dark:text-white border border-transparent hover:border-gray-200 dark:hover:border-white/20' 
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed grayscale'
                                }`}
                                title={!canChat ? "Você precisa seguir ou ser seguido por este usuário para iniciar um chat." : ""}
                            >
                                <EnvelopeIcon className="h-4 w-4" /> Msg
                            </button>
                            </>
                        ) : (
                            <button onClick={() => onNavigate('settings')} className="bg-gray-100 dark:bg-white/5 dark:text-white px-8 py-3 rounded-2xl font-black uppercase text-xs border border-gray-200 dark:border-white/10 active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/10">
                                Editar Perfil
                            </button>
                        )}
                    </div>
                </div>
             </div>

             {/* Stats */}
             <div className="flex items-center justify-center md:justify-start gap-8 md:gap-12 w-full border-t border-gray-100 dark:border-white/5 pt-6">
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{userPosts.length + userClasses.length}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Publicações</p>
                </div>
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{followerCount}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Seguidores</p>
                </div>
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{profile.followedUsers?.length || 0}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Seguindo</p>
                </div>
             </div>

             {/* Carteira (Apenas Dono) */}
             {isOwnProfile && (
                <div className="mt-8 w-full bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] p-6 border border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <WalletIcon className="h-32 w-32 text-blue-600" />
                   </div>
                   
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="p-4 bg-white dark:bg-white/10 rounded-2xl shadow-sm text-blue-600">
                         <WalletIcon className="h-8 w-8" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Saldo Disponível</p>
                         <p className="text-3xl font-black text-blue-900 dark:text-white">${(currentUser.balance || 0).toFixed(2)}</p>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter mt-1">≈ {((currentUser.balance || 0) * exchangeRate).toLocaleString()} KZ</p>
                      </div>
                   </div>

                   <div className="flex gap-3 w-full md:w-auto relative z-10">
                      <button 
                        onClick={() => onOpenWallet('deposit')} 
                        className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                         <ArrowDownCircleIcon className="h-4 w-4" /> Depósito
                      </button>
                      <button 
                        onClick={() => onOpenWallet('withdraw')} 
                        className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-blue-600 dark:text-white rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                      >
                         <ArrowUpCircleIcon className="h-4 w-4" /> Saque
                      </button>
                   </div>
                </div>
             )}
          </div>

          {/* Navegação de Abas */}
          <div className="px-4 pb-4 md:px-8">
             <div className="flex bg-gray-50 dark:bg-white/5 p-1.5 rounded-2xl w-full overflow-x-auto no-scrollbar">
                {[
                  { id: 'posts', label: 'Feed', icon: Squares2X2Icon },
                  { id: 'classes', label: 'Aulas', icon: VideoCameraIcon, hidden: userClasses.length === 0 },
                  { id: 'about', label: 'Sobre', icon: UserIcon },
                  { id: 'store', label: 'Loja', icon: ShoppingBagIcon, hidden: userProducts.length === 0 },
                  { id: 'ads', label: 'Destaques', icon: MegaphoneIcon, hidden: userAds.length === 0 }
                ].filter(t => !t.hidden).map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-darkcard text-blue-600 shadow-lg scale-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </button>
                ))}
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CONTEÚDO PRINCIPAL */}
          <div className="lg:col-span-8">
             
              {/* ABA POSTS */}
              {activeTab === 'posts' && (
                 <div className="space-y-6 animate-slide-up">
                    {!isOwnProfile && !isFollowing ? (
                      <div className="bg-white dark:bg-darkcard p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-100 dark:border-white/5">
                         <ShieldCheckIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                         <p className="text-gray-900 dark:text-white font-black uppercase text-sm tracking-widest mb-2">Perfil Privado</p>
                         <p className="text-gray-400 text-xs font-medium">Siga este usuário para ver suas publicações.</p>
                         <button 
                           onClick={handleToggleFollow}
                           className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 transition-all"
                         >
                           Seguir agora
                         </button>
                      </div>
                    ) : userPosts.length > 0 ? userPosts.map(post => (
                      <PostCard key={post.id} post={post} currentUser={currentUser} onNavigate={onNavigate} onFollowToggle={handleToggleFollow} refreshUser={refreshUser} onPostUpdatedOrDeleted={refreshUser} onPinToggle={() => {}} />
                    )) : (
                      <div className="bg-white dark:bg-darkcard p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-100 dark:border-white/5">
                         <Squares2X2Icon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                         <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nenhuma publicação ainda</p>
                      </div>
                    )}
                 </div>
              )}

             {/* ABA AULAS */}
             {activeTab === 'classes' && (
                <div className="space-y-6 animate-slide-up">
                   <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center gap-3">
                      <VideoCameraIcon className="h-6 w-6 text-blue-600" />
                      <div>
                         <h4 className="font-black text-blue-800 dark:text-blue-300 text-sm uppercase">Acervo de Aulas</h4>
                         <p className="text-[10px] text-blue-600 dark:text-blue-400">Replays de transmissões ao vivo gratuitas.</p>
                      </div>
                   </div>
                   {userClasses.length > 0 ? userClasses.map(post => (
                     <PostCard key={post.id} post={post} currentUser={currentUser} onNavigate={onNavigate} onFollowToggle={handleToggleFollow} refreshUser={refreshUser} onPostUpdatedOrDeleted={refreshUser} onPinToggle={() => {}} />
                   )) : (
                     <div className="bg-white dark:bg-darkcard p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-100 dark:border-white/5">
                        <VideoCameraIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nenhuma aula gravada</p>
                     </div>
                   )}
                </div>
             )}

             {/* ABA SOBRE */}
             {activeTab === 'about' && (
                <div className="space-y-6 animate-slide-up">
                   <div className="bg-white dark:bg-darkcard p-10 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5">
                       <h3 className="text-lg font-black dark:text-white mb-6 tracking-tighter uppercase flex items-center gap-2">
                          <UserIcon className="h-5 w-5 text-blue-600" /> Biografia
                       </h3>
                       <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base font-medium whitespace-pre-line">
                          {profile.bio || "Este usuário ainda não escreveu uma biografia."}
                       </p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-lg border border-gray-100 dark:border-white/5">
                         <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Informações</h4>
                         <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-sm font-bold dark:text-white">
                               <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
                               Membro desde {joinDate}
                            </li>
                            <li className="flex items-center gap-3 text-sm font-bold dark:text-white">
                               <MapPinIcon className="h-5 w-5 text-red-500" />
                               Global / Online
                            </li>
                         </ul>
                      </div>

                      <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-lg border border-gray-100 dark:border-white/5">
                         <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Conquistas</h4>
                         <div className="flex flex-wrap gap-2">
                            {profile.isVerified && (
                               <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1">
                                  <CheckBadgeIcon className="h-3 w-3" /> Verificado
                               </span>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {/* ABA LOJA */}
             {activeTab === 'store' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                   {userProducts.length > 0 ? userProducts.map(product => (
                      <div 
                        key={product.id} 
                        className="bg-white dark:bg-darkcard p-4 rounded-[2rem] shadow-md border border-gray-100 dark:border-white/5 group cursor-pointer hover:shadow-xl transition-all"
                        onClick={() => onNavigate('store', { storeId: profile.storeId })}
                      >
                         <div className="h-40 rounded-[1.5rem] overflow-hidden mb-4 relative">
                            <img src={product.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black uppercase text-gray-900 shadow-sm">
                               ${product.price.toFixed(2)}
                            </div>
                         </div>
                         <h4 className="font-black text-sm dark:text-white line-clamp-1 px-1">{product.name}</h4>
                         <button className="mt-3 w-full py-3 bg-gray-50 dark:bg-white/5 text-blue-600 font-black text-[10px] uppercase rounded-xl hover:bg-blue-600 hover:text-white transition-colors">
                            Ver na Loja
                         </button>
                      </div>
                   )) : (
                      <div className="col-span-2 py-12 text-center text-gray-400 font-black text-xs uppercase">Nenhum produto cadastrado</div>
                   )}
                </div>
             )}

             {/* ABA ADS */}
             {activeTab === 'ads' && (
                <div className="space-y-6 animate-slide-up">
                   {userAds.length > 0 ? userAds.map(ad => (
                     <div key={ad.id} className="relative group">
                        {isOwnProfile && (
                           <div className="absolute top-4 left-4 z-20 flex gap-2">
                              <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg border border-white/20 backdrop-blur-md ${ad.isActive ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                 {ad.isActive ? 'Ativo' : 'Pausado'}
                              </div>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                     await toggleAdActive(ad.id, currentUser.id, !ad.isActive);
                                     refreshUser();
                                  } catch (err: any) {
                                     alert(err.message);
                                  }
                                }}
                                className="px-4 py-2 bg-white dark:bg-darkcard hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl text-[9px] font-black uppercase shadow-lg border border-gray-100 dark:border-white/10 transition-all active:scale-95 flex items-center gap-2"
                              >
                                 {ad.isActive ? (
                                    <><SparklesIcon className="h-3 w-3 text-yellow-500" /> Pausar</>
                                 ) : (
                                    <><RocketLaunchIcon className="h-3 w-3 text-blue-500" /> Reativar</>
                                 )}
                              </button>
                           </div>
                        )}
                        <AdCard ad={ad} />
                     </div>
                   )) : (
                     <div className="bg-white dark:bg-darkcard p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-100 dark:border-white/5">
                        <MegaphoneIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-black uppercase text-xs">Sem campanhas ativas</p>
                     </div>
                   )}
                </div>
             )}
          </div>

          {/* SIDEBAR LATERAL */}
          <div className="lg:col-span-4 space-y-6">
             
             {/* Meus Pedidos Widget */}
             {isOwnProfile && (
                <div 
                  onClick={() => onNavigate('purchases')}
                  className="bg-white dark:bg-darkcard p-6 rounded-[2.5rem] shadow-lg border border-gray-100 dark:border-white/5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                >
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/10 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                         <ShoppingBagIcon className="h-6 w-6" />
                      </div>
                      <div>
                         <h4 className="font-black dark:text-white text-sm uppercase tracking-tight">Meus Pedidos</h4>
                         <p className="text-[9px] text-gray-400 font-bold uppercase">Rastreio e Downloads</p>
                      </div>
                   </div>
                   <ClockIcon className="h-5 w-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                </div>
             )}

             {/* Widget Criar Grupo */}
             {isOwnProfile && (
               <div 
                 onClick={() => onNavigate('create-group')}
                 className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[3rem] border border-blue-100 dark:border-blue-900/30 cursor-pointer hover:shadow-lg transition-all group"
               >
                  <div className="flex items-center gap-4 mb-4">
                     <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                        <UserGroupIcon className="h-6 w-6" />
                     </div>
                     <h4 className="font-black text-blue-900 dark:text-blue-100 text-sm uppercase tracking-tight">Comunidade</h4>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed mb-4">Crie grupos para seus amigos e seguidores.</p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase">
                     <PlusIcon className="h-4 w-4 stroke-[3]" /> Criar Novo Grupo
                  </div>
               </div>
             )}

             {/* Monetização Widget */}
             {isOwnProfile && profile.monetizationGoals && (
                <div className="bg-white dark:bg-darkcard p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 opacity-5">
                      <BanknotesIcon className="h-24 w-24 text-yellow-500" />
                   </div>
                   
                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <ChartBarIcon className="h-4 w-4 text-yellow-500" /> Metas de Monetização
                   </h4>

                   <div className="space-y-6">
                      {/* Seguidores */}
                      <div>
                         <div className="flex justify-between items-end mb-2">
                            <p className="text-[10px] font-black uppercase dark:text-white">Seguidores</p>
                            <p className="text-[10px] font-bold text-gray-400">{profile.monetizationGoals.currentFollowers} / {profile.monetizationGoals.followersGoal}</p>
                         </div>
                         <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 transition-all duration-1000" 
                              style={{ width: `${Math.min(100, (profile.monetizationGoals.currentFollowers / profile.monetizationGoals.followersGoal) * 100)}%` }}
                            />
                         </div>
                      </div>

                      {/* Horas de Vídeo */}
                      <div>
                         <div className="flex justify-between items-end mb-2">
                            <p className="text-[10px] font-black uppercase dark:text-white">Horas de Vídeo</p>
                            <p className="text-[10px] font-bold text-gray-400">{Math.floor(profile.monetizationGoals.currentWatchHours)} / {profile.monetizationGoals.watchHoursGoal}</p>
                         </div>
                         <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 transition-all duration-1000" 
                              style={{ width: `${Math.min(100, (profile.monetizationGoals.currentWatchHours / profile.monetizationGoals.watchHoursGoal) * 100)}%` }}
                            />
                         </div>
                      </div>

                      {profile.isMonetized ? (
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/30 text-center">
                           <p className="text-[10px] font-black text-green-600 uppercase">Parabéns! Conta Monetizada</p>
                           <p className="text-[9px] text-green-500 mt-1">Você já está qualificado para receber ganhos.</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-center">
                           <p className="text-[10px] font-black text-gray-500 uppercase">Quase lá!</p>
                           <p className="text-[9px] text-gray-400 mt-1">Atingir as metas para habilitar anúncios.</p>
                        </div>
                      )}
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default ProfilePage;
