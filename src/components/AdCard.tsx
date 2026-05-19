
import React, { useState, useEffect } from 'react';
import { AdCampaign, User } from '../types';
import { findUserById } from '../services/storageService';
import { 
  HeartIcon as HeartOutline, 
  ChatBubbleLeftIcon, 
  ShareIcon, 
  EllipsisHorizontalIcon,
  GlobeAltIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_PROFILE_PIC } from '../data/constants';

interface AdCardProps {
  ad: AdCampaign;
  rank?: number; // Posição no leilão
}

const AdCard: React.FC<AdCardProps> = ({ ad, rank }) => {
  const [advertiser, setAdvertiser] = useState<User | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(Math.floor(Math.random() * 500) + 100);
  const [commentsCount] = useState(Math.floor(Math.random() * 50) + 10);

  useEffect(() => {
    if (ad.userId) {
      findUserById(ad.userId).then(user => {
        if (user) setAdvertiser(user);
      });
    }
  }, [ad.userId]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#0a0c10] rounded-[2.5rem] md:rounded-[3.5rem] border border-gray-100 dark:border-white/10 shadow-xl overflow-hidden mb-4 group"
    >
      {/* Header Estilo Facebook */}
      <div className="p-5 md:p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-blue-500/20 p-0.5">
              <img 
                src={advertiser?.profilePicture || DEFAULT_PROFILE_PIC} 
                className="w-full h-full object-cover rounded-full"
                alt="Perfil"
              />
            </div>
            {advertiser?.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-darkbg rounded-full p-0.5">
                <CheckBadgeIcon className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-black text-sm md:text-base uppercase tracking-tight dark:text-white">
                {advertiser ? `${advertiser.firstName} ${advertiser.lastName}` : (ad.userName || 'Patrocinado')}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Patrocinado</span>
              <span className="text-[10px] md:text-xs text-gray-300">•</span>
              <GlobeAltIcon className="h-3 w-3" />
            </div>
          </div>
        </div>
        <button className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-gray-400">
          <EllipsisHorizontalIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Texto do Anúncio */}
      <div className="px-5 md:px-8 pb-4">
        <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
          <span className="font-black italic text-blue-600 block mb-1 uppercase text-xs tracking-widest">{ad.title}</span>
          {ad.description}
        </p>
      </div>

      {/* Mídia do Anúncio */}
      <div className="relative aspect-video bg-gray-100 dark:bg-black overflow-hidden border-y border-gray-100 dark:border-white/5">
        {ad.videoUrl ? (
            <video 
              src={ad.videoUrl} 
              className="w-full h-full object-cover" 
              autoPlay 
              muted 
              loop 
              playsInline 
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                video.play().catch(err => {
                  if (err.name !== 'AbortError') {
                    console.error('Video Ad playback failed:', err);
                  }
                });
              }}
              onError={() => {
                console.error("Ad video playback error");
              }}
            />
        ) : (
            <img 
              src={ad.imageUrl} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
              alt={ad.title}
            />
        )}
        
        {/* Selo de Top Leilão (Se for Rank 0) */}
        {rank === 0 && (
          <div className="absolute top-4 right-4 bg-yellow-400/90 backdrop-blur-sm text-black px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 border border-yellow-200">
             <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
             Recomendação Master
          </div>
        )}
      </div>

      {/* Banner de Engajamento / CTA */}
      <div className="p-5 md:p-6 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest truncate">{ad.linkUrl?.replace(/^https?:\/\//, '')}</p>
          <h5 className="font-black text-sm md:text-base dark:text-white uppercase tracking-tighter truncate">{ad.title}</h5>
        </div>
        <a 
          href={ad.linkUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-blue-600 text-white px-6 md:px-8 py-3.5 md:py-4 rounded-2xl md:rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
        >
          {ad.ctaText || 'Saiba Mais'}
        </a>
      </div>

      {/* Rodapé Social */}
      <div className="px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 font-bold text-xs uppercase tracking-tight transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
          >
            {isLiked ? <HeartSolid className="h-6 w-6" /> : <HeartOutline className="h-6 w-6" />}
            <span className="hidden sm:inline">{likesCount}</span>
          </button>
          <button className="flex items-center gap-2 text-gray-400 hover:text-blue-500 font-bold text-xs uppercase tracking-tight transition-colors">
            <ChatBubbleLeftIcon className="h-6 w-6" />
            <span className="hidden sm:inline">{commentsCount}</span>
          </button>
          <button className="flex items-center gap-2 text-gray-400 hover:text-emerald-500 font-bold text-xs uppercase tracking-tight transition-colors">
            <ShareIcon className="h-6 w-6" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdCard;
