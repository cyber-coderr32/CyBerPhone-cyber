import React from 'react';
import { Page, User } from '../types';

interface FooterProps {
  onNavigate: (page: Page) => void;
  activePage: Page;
  currentUser: User | null;
  onLogout: () => Promise<void>;
  isMenuOpen: boolean;
  onCloseMenu: () => void;
  unreadMessagesCount: number;
}

const Footer: React.FC<FooterProps> = ({ 
  onNavigate, 
  activePage,
  currentUser,
  onLogout,
  isMenuOpen,
  onCloseMenu,
  unreadMessagesCount
}) => {
  return (
    <footer className="bg-white dark:bg-darkcard border-t dark:border-white/5 fixed bottom-0 left-0 right-0 z-50 p-3 flex justify-around">
      <button onClick={() => onNavigate('feed')} className={`p-2 rounded-xl ${activePage === 'feed' ? 'text-brand' : 'text-gray-400'}`}>Feed</button>
      <button onClick={() => onNavigate('chat')} className={`p-2 rounded-xl ${activePage === 'chat' ? 'text-brand' : 'text-gray-400'}`}>Chat</button>
      <button onClick={() => onNavigate('settings')} className={`p-2 rounded-xl ${activePage === 'settings' ? 'text-brand' : 'text-gray-400'}`}>Ajustes</button>
    </footer>
  );
};

export default Footer;
