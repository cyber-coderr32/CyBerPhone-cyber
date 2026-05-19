import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Page, User } from '../types';
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  ShoppingBagIcon, 
  SparklesIcon, 
  UserCircleIcon,
  VideoCameraIcon,
  PlusCircleIcon,
  Cog6ToothIcon,
  PowerIcon,
  ChartPieIcon,
  MegaphoneIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid, 
  ChatBubbleLeftRightIcon as ChatSolid, 
  ShoppingBagIcon as StoreSolid, 
  SparklesIcon as SparklesSolid, 
  UserCircleIcon as UserSolid,
  ChartPieIcon as ChartSolid,
  CpuChipIcon as CpuSolid
} from '@heroicons/react/24/solid';

import Logo from './Logo';

interface FooterProps {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
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
  const { t } = useTranslation();
  const isCreator = currentUser?.userType === 'CREATOR' || currentUser?.isAdmin;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      // Small delay because keyboard doesn't close immediately 
      // and we might be switching between inputs
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && 
            document.activeElement?.tagName !== 'TEXTAREA' && 
            !(document.activeElement as HTMLElement)?.isContentEditable) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    
    // Fallback: Viewport height change
    let initialHeight = window.visualViewport?.height || window.innerHeight;
    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      if (currentHeight < initialHeight * 0.8) {
        setIsKeyboardVisible(true);
      } else {
        // Only set to false if not focused on input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setIsKeyboardVisible(false);
        }
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  const navItems = [
    { id: 'feed', label: t('nav_feed'), icon: HomeIcon, activeIcon: HomeIconSolid },
    { id: 'reels-page', label: t('nav_reels'), icon: VideoCameraIcon, activeIcon: VideoCameraIcon },
    { id: 'chat', label: t('nav_messages'), icon: ChatBubbleLeftRightIcon, activeIcon: ChatSolid },
    { id: 'store', label: t('nav_marketplace'), icon: ShoppingBagIcon, activeIcon: StoreSolid },
    { id: 'profile', label: t('nav_profile'), icon: UserCircleIcon, activeIcon: UserSolid, params: { userId: currentUser?.id || '' } }
  ];

  return (
    <>
      {/* MOBILE BOTTOM BAR */}
      <footer className={`md:hidden bg-white/95 dark:bg-[#0a0c10]/95 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 fixed bottom-0 left-0 right-0 z-[100] pb-safe pt-3 px-4 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transition-all duration-300 ${isKeyboardVisible ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = isActive ? item.activeIcon : item.icon;
          return (
            <button 
              key={item.id}
              onClick={() => onNavigate(item.id as Page, item.params)} 
              className={`flex flex-col items-center gap-1.5 p-2 transition-all relative ${isActive ? 'text-brand' : 'text-gray-400'}`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
              {item.id === 'chat' && unreadMessagesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0a0c10]" />
              )}
            </button>
          );
        })}
      </footer>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-[#0a0c10] border-r dark:border-white/5 z-50 p-6">
        <div className="mb-10 px-2 cursor-pointer" onClick={() => onNavigate('feed')}>
          <Logo size="md" />
        </div>

        <nav className="flex-grow space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = isActive ? item.activeIcon : item.icon;
            return (
              <button 
                key={item.id}
                onClick={() => onNavigate(item.id as Page, item.params)} 
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${isActive ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
              >
                <Icon className={`h-6 w-6 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="font-black text-sm uppercase tracking-tighter">{item.label}</span>
                {item.id === 'chat' && unreadMessagesCount > 0 && !isActive && (
                   <span className="absolute top-3 right-4 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#0a0c10]">
                     {unreadMessagesCount}
                   </span>
                )}
              </button>
            );
          })}

            <div className="pt-6 mt-6 border-t dark:border-white/5 space-y-1">
              <p className="px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">{t('discovery_label')}</p>
              
              <button 
                  onClick={() => onNavigate('explore')} 
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${activePage === 'explore' ? 'bg-brand/10 text-brand' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <SparklesIcon className={`h-6 w-6 ${activePage === 'explore' ? 'text-brand' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className="font-black text-sm uppercase tracking-tighter">{t('nav_explorar')}</span>
              </button>

              <div className="pt-4 mt-4 border-t border-dashed dark:border-white/5 space-y-1">
                <p className="px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">{t('nav_business')}</p>
                
                <button 
                    onClick={() => onNavigate('creator-center')} 
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${activePage === 'creator-center' ? 'bg-brand/10 text-brand' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                  >
                    {activePage === 'creator-center' ? <ChartSolid className="h-6 w-6 text-brand" /> : <ChartPieIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />}
                    <span className="font-black text-sm uppercase tracking-tighter">{t('nav_performance')}</span>
                </button>

                <button 
                  onClick={() => onNavigate('monetization')} 
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${activePage === 'monetization' ? 'bg-brand/10 text-brand' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <SparklesIcon className={`h-6 w-6 ${activePage === 'monetization' ? 'text-brand' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className="font-black text-sm uppercase tracking-tighter">{t('nav_monetization')}</span>
                </button>

                <button 
                  onClick={() => onNavigate('ads')} 
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${activePage === 'ads' ? 'bg-brand/10 text-brand' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <MegaphoneIcon className={`h-6 w-6 ${activePage === 'ads' ? 'text-brand' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className="font-black text-sm uppercase tracking-tighter">{t('nav_ads')}</span>
                </button>

                <button 
                  onClick={() => onNavigate('cyber-assistant')} 
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${activePage === 'cyber-assistant' ? 'bg-brand/10 text-brand' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  {activePage === 'cyber-assistant' ? <CpuSolid className="h-6 w-6 text-brand" /> : <CpuChipIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />}
                  <span className="font-black text-sm uppercase tracking-tighter">{t('nav_cyber_assistant')}</span>
                  <span className="ml-auto text-[8px] font-black bg-brand/10 text-brand px-2 py-0.5 rounded-md uppercase">AI</span>
                </button>
              </div>
            </div>
        </nav>

        <div className="pt-6 border-t dark:border-white/5 space-y-2">
           <button 
            onClick={() => onNavigate('settings')} 
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activePage === 'settings' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
          >
            <Cog6ToothIcon className="h-6 w-6" />
            <span className="font-black text-xs uppercase tracking-widest">{t('nav_settings')}</span>
          </button>
          <button 
            onClick={onLogout} 
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
          >
            <PowerIcon className="h-6 w-6" />
            <span className="font-black text-xs uppercase tracking-widest">{t('nav_logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Footer;
