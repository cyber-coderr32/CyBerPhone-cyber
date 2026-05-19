import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Page } from '../types';
import Logo from './Logo';
import { 
  MagnifyingGlassIcon, 
  ShoppingBagIcon, 
  BellIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  currentUser: User | null;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  unreadNotificationsCount: number;
  unreadMessagesCount?: number;
  cartItemCount: number;
  onOpenCart: () => void;
  onToggleMenu: () => void;
  onToggleDarkMode?: () => void;
  darkMode?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onNavigate, 
  unreadNotificationsCount, 
  unreadMessagesCount, 
  cartItemCount, 
  onOpenCart,
  onToggleMenu,
  onToggleDarkMode, 
  darkMode 
}) => {
  const { t } = useTranslation();
  return (
    <header className="bg-white/80 dark:bg-[#0a0c10]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/10 sticky top-0 z-50 px-4 md:px-8 py-3 flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div onClick={() => onNavigate('feed')} className="flex items-center gap-2 cursor-pointer group">
          <Logo size="sm" />
        </div>
      </div>

      {currentUser && (
        <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/10 rounded-full border border-blue-500/20 active:scale-95 transition-all cursor-help hover:bg-blue-100 dark:hover:bg-blue-900/20">
          <div className="relative">
            <ShieldCheckIcon className="w-4 h-4 text-blue-600 animate-pulse" />
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm animate-ping opacity-20"></div>
          </div>
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest whitespace-nowrap">{t('protocol_active')}</span>
        </div>
      )}

      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        <button 
          onClick={() => onNavigate('search-results')}
          className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-2xl hover:bg-brand/10 hover:text-brand transition-all flex items-center justify-center"
          title={t('search')}
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>

        {currentUser && (
          <button 
            onClick={() => onNavigate('notifications')}
            className="relative p-2.5 bg-gray-100 dark:bg-white/5 rounded-2xl hover:bg-brand/10 hover:text-brand transition-all group"
            title={t('notifications')}
          >
            <BellIcon className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black min-w-[20px] h-5 px-1 rounded-full border-2 border-white dark:border-[#0a0c10] flex items-center justify-center">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {currentUser && (
          <button 
            onClick={() => onNavigate('cart')}
            className="relative p-2.5 bg-gray-100 dark:bg-white/5 rounded-2xl hover:bg-brand/10 hover:text-brand transition-all group"
          >
            <ShoppingBagIcon className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand text-white text-[9px] font-black w-5 h-5 rounded-full border-2 border-white dark:border-[#0a0c10] flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        )}

        {currentUser ? (
          <div 
            onClick={() => onNavigate('profile', { userId: currentUser.id })} 
            className="w-10 h-10 rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-brand transition-all ring-4 ring-gray-100 dark:ring-white/5"
          >
              <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
          </div>
        ) : (
          <button 
            onClick={() => onNavigate('auth')} 
            className="bg-brand text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 hover:scale-105 transition-all"
          >
            {t('login')}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
