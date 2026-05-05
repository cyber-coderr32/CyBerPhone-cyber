import React from 'react';
import { User, Page } from '../types';

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
  return (
    <header className="bg-white dark:bg-darkcard border-b dark:border-white/5 sticky top-0 z-50 p-4 flex items-center justify-between">
      <div onClick={() => onNavigate('feed')} className="flex items-center gap-2 cursor-pointer">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white font-black">CP</div>
        <span className="font-black text-lg dark:text-white hidden sm:block">CYBERPHONE</span>
      </div>
      <div className="flex items-center gap-2">
        {currentUser ? (
          <div onClick={() => onNavigate('profile', { userId: currentUser.id })} className="w-8 h-8 rounded-full overflow-hidden cursor-pointer">
            <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
          </div>
        ) : (
          <button onClick={() => onNavigate('auth')} className="text-xs font-bold uppercase text-brand">Login</button>
        )}
      </div>
    </header>
  );
};

export default Header;
