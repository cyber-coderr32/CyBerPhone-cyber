import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Notification, NotificationType } from '../types';
import { 
  getNotificationsForUser, 
  markNotificationsAsRead, 
  findUserById, 
  deleteNotification, 
  clearAllNotifications,
  updateNotificationReadState 
} from '../services/storageService';
import { getNotificationContent } from '../services/notificationService';
import { 
  HeartIcon, 
  ChatBubbleLeftEllipsisIcon, 
  UserPlusIcon, 
  ShoppingBagIcon, 
  SparklesIcon, 
  TrashIcon, 
  CheckIcon, 
  CheckBadgeIcon, 
  ExclamationCircleIcon,
  BellIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
import { 
  FunnelIcon, 
  MagnifyingGlassIcon, 
  XMarkIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';
import { safeJsonStringify } from '../lib/utils';
import { useDialog } from '../services/DialogContext';

interface NotificationsPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
  refreshUser: () => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const { showConfirm, showAlert } = useDialog();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actors, setActors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  
  // Advanced Features State
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unread' | 'interactions' | 'followers' | 'financial'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotifications();
  }, [currentUser.id]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotificationsForUser(currentUser.id);
      const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(sorted);

      // Fetch unique actors
      const actorIds = [...new Set(sorted.map(n => n.actorId))];
      const actorData: Record<string, User> = {};
      
      await Promise.all(actorIds.map(async id => {
        const user = await findUserById(id);
        if (user) actorData[id] = user;
      }));
      
      setActors(actorData);
    } catch (err) {
      console.error("Error loading notifications:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsAsRead(currentUser.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      refreshUser();
      showAlert(t('notifications_all_read', 'Todas as notificações marcadas como lidas'), { type: 'success' });
    } catch (err) {
      console.error("Error marking all read:", safeJsonStringify(err));
    }
  };

  const handleToggleRead = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    try {
      await updateNotificationReadState(id, !currentStatus);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !currentStatus } : n));
      refreshUser();
      showAlert(
        !currentStatus 
          ? t('notification_marked_read', 'Notificação marcada como lida!') 
          : t('notification_marked_unread', 'Notificação marcada como não lida!'),
        { type: 'success' }
      );
    } catch (err) {
      console.error("Error toggling read state:", safeJsonStringify(err));
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      t('notification_delete_confirm', 'Deseja eliminar esta notificação?'),
      { type: 'confirm', title: t('confirm') || 'Confirmar' }
    );
    if (!confirmed) return;

    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      refreshUser();
      showAlert(t('notification_deleted', 'Notificação eliminada com sucesso'), { type: 'success' });
    } catch (err) {
      console.error("Error deleting notification:", safeJsonStringify(err));
    }
  };

  const handleClearAll = async () => {
    const confirmed = await showConfirm(
      t('notifications_clear_all_confirm') || "Tem certeza que deseja limpar todas as notificações?",
      { type: 'confirm', title: t('confirm') || 'Confirmação' }
    );
    if (!confirmed) return;
    
    try {
      await clearAllNotifications(currentUser.id);
      setNotifications([]);
      refreshUser();
      showAlert(t('notifications_cleared', 'Banco de notificações limpo!'), { type: 'success' });
    } catch (err) {
      console.error("Error clearing notifications:", safeJsonStringify(err));
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.LIKE:
        return <HeartIcon className="w-5 h-5 text-red-500" />;
      case NotificationType.COMMENT:
        return <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-500" />;
      case NotificationType.NEW_FOLLOWER:
        return <UserPlusIcon className="w-5 h-5 text-green-500" />;
      case NotificationType.AFFILIATE_SALE:
        return <ShoppingBagIcon className="w-5 h-5 text-orange-500" />;
      case NotificationType.REACTION:
        return <SparklesIcon className="w-5 h-5 text-purple-500" />;
      case NotificationType.INDICATION:
        return <CheckBadgeIcon className="w-5 h-5 text-yellow-500" />;
      case NotificationType.MISSED_CALL:
        return <ExclamationCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (mins < 1) return t('now') || 'Agora';
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h`;
    return `${days}d`;
  };

  // Dynamically calculate counts for badged filters
  const countAll = notifications.length;
  const countUnread = notifications.filter(n => !n.isRead).length;
  const countInteractions = notifications.filter(n => 
    [NotificationType.LIKE, NotificationType.COMMENT, NotificationType.REACTION].includes(n.type)
  ).length;
  const countFollowers = notifications.filter(n => n.type === NotificationType.NEW_FOLLOWER).length;
  const countFinancial = notifications.filter(n => 
    [NotificationType.AFFILIATE_SALE, NotificationType.INDICATION].includes(n.type)
  ).length;

  // Filter list of notifications based on dynamic categories and keywords search
  const filteredNotifications = notifications.filter(notif => {
    // 1. Filter Category
    if (selectedCategory === 'unread' && notif.isRead) return false;
    if (selectedCategory === 'interactions' && ![NotificationType.LIKE, NotificationType.COMMENT, NotificationType.REACTION].includes(notif.type)) return false;
    if (selectedCategory === 'followers' && notif.type !== NotificationType.NEW_FOLLOWER) return false;
    if (selectedCategory === 'financial' && ![NotificationType.AFFILIATE_SALE, NotificationType.INDICATION].includes(notif.type)) return false;

    // 2. Filter Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const actor = actors[notif.actorId];
      const name = `${actor?.firstName || ''} ${actor?.lastName || ''}`.toLowerCase();
      const content = getNotificationContent(notif.type, actor?.firstName || 'Alguém', notif.groupName, notif.callType);
      const text = content.body.toLowerCase();
      return name.includes(q) || text.includes(q);
    }

    return true;
  });

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24 md:pb-12 text-left">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            {t('notifications')}
            {countUnread > 0 && (
              <span className="bg-red-500 scale-100 animate-pulse text-white text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full">
                {countUnread} {t('new_count', 'Novas')}
              </span>
            )}
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            {t('notifications_subtitle') || 'Acompanhe as interações e atividades da sua conta'}
          </p>
        </div>
        
        {/* Actions Deck (Styled Delete and Mark Lidas Buttons with Micro-animations) */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {notifications.some(n => !n.isRead) && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMarkAllRead}
              className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition-all bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer border border-blue-500/10 shadow-sm"
              title={t('notifications_mark_read_title', 'Marcar todas como lidas')}
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>{t('notifications_mark_read') || 'Marcar Lidas'}</span>
            </motion.button>
          )}
          
          {notifications.length > 0 && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClearAll}
              className="text-[10px] font-black uppercase text-red-500 hover:text-white transition-all bg-red-50 dark:bg-red-500/10 hover:bg-red-500 dark:hover:bg-red-500 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-500/25 shadow-sm"
              title={t('notifications_clear_all_title', 'Esfregar tudo permanentemente')}
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>{t('notifications_delete') || 'Limpar Tudo'}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Advanced Filter search panel */}
      <div className="bg-white dark:bg-[#151821] rounded-[2rem] p-4 shadow-xl border border-gray-100 dark:border-white/5 mb-6 space-y-4">
        {/* Magnifying search bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_notifications_placeholder', 'Filtrar notificações por nome de usuário e conteúdo...')}
            className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 border border-gray-100 dark:border-white/5 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'all' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <span>{t('tab_all', 'Todos')}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${selectedCategory === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-200 dark:bg-white/15 text-gray-600 dark:text-gray-400'}`}>
              {countAll}
            </span>
          </button>

          <button 
            onClick={() => setSelectedCategory('unread')}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'unread' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <span>{t('tab_unread', 'Não Lidas')}</span>
            {countUnread > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[8px] animate-pulse ${selectedCategory === 'unread' ? 'bg-amber-600 text-white' : 'bg-amber-500/20 text-amber-500 dark:text-amber-400'}`}>
                {countUnread}
              </span>
            )}
          </button>

          <button 
            onClick={() => setSelectedCategory('interactions')}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'interactions' 
                ? 'bg-[#818cf8] text-white shadow-md shadow-indigo-400/20' 
                : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <span>{t('tab_interactions', 'Interações')}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${selectedCategory === 'interactions' ? 'bg-[#6366f1] text-white' : 'bg-gray-200 dark:bg-white/15 text-gray-600 dark:text-gray-400'}`}>
              {countInteractions}
            </span>
          </button>

          <button 
            onClick={() => setSelectedCategory('followers')}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'followers' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <span>{t('tab_followers', 'Seguidores')}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${selectedCategory === 'followers' ? 'bg-emerald-700 text-white' : 'bg-gray-200 dark:bg-white/15 text-gray-600 dark:text-gray-400'}`}>
              {countFollowers}
            </span>
          </button>

          <button 
            onClick={() => setSelectedCategory('financial')}
            className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'financial' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <span>{t('tab_financial', 'Financeiro')}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${selectedCategory === 'financial' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-white/15 text-gray-600 dark:text-gray-400'}`}>
              {countFinancial}
            </span>
          </button>
        </div>
      </div>

      {/* Main Listing Viewport */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#151821] rounded-[3rem] shadow-xl flex flex-col items-center p-8 border border-gray-100 dark:border-white/5">
          <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-white/5">
               <BellIcon className="w-7 h-7 text-gray-300 dark:text-gray-600 animate-bounce" />
          </div>
          <h3 className="font-extrabold text-[#1a1c23] dark:text-white uppercase text-sm tracking-widest">{t('notifications_empty_title', 'Tudo limpo por aqui')}</h3>
          <p className="text-xs text-gray-400 font-bold max-w-sm mt-2 uppercase tracking-wider">
            {searchQuery 
              ? t('no_search_results', 'Nenhuma notificação corresponde à sua busca.') 
              : t('no_notifications_in_category', 'Não há notificações registradas nesta categoria.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => {
              const actor = actors[notif.actorId];
              const content = getNotificationContent(notif.type, actor?.firstName || 'Alguém', notif.groupName, notif.callType);
              
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }}
                  whileHover={{ y: -2 }}
                  className={`relative group flex items-start gap-4 p-4 rounded-[2.5rem] border transition-all cursor-pointer ${
                    notif.isRead 
                      ? 'bg-white dark:bg-[#151821] hover:bg-gray-50 dark:hover:bg-[#181c27] border-gray-100 dark:border-white/5' 
                      : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500/30 shadow-md shadow-blue-500/5 dark:shadow-none'
                  }`}
                  onClick={() => {
                    if (notif.postId) onNavigate('feed', { postId: notif.postId });
                    else if (notif.type === NotificationType.NEW_FOLLOWER) onNavigate('profile', { userId: notif.actorId });
                    else if (notif.type === NotificationType.MESSAGE) onNavigate('chat');
                  }}
                >
                  {/* Left margin Indicator Line for Unread */}
                  {!notif.isRead && (
                    <div className="absolute top-4 bottom-4 left-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full" />
                  )}

                  {/* Actor Avatar and Embedded Small Badgework */}
                  <div className="relative flex-shrink-0">
                    <img 
                      src={actor?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(actor?.firstName || 'A')}&background=random`} 
                      className="w-13 h-13 rounded-[1.3rem] object-cover ring-2 ring-white dark:ring-white/10 shadow-md" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#0a0c10] p-1 rounded-full shadow-sm ring-1 ring-gray-100 dark:ring-white/10">
                      {getIcon(notif.type)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-grow min-w-0 pt-0.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100 leading-snug">
                        <span className="font-extrabold uppercase tracking-tight text-gray-950 dark:text-white">{actor?.firstName} {actor?.lastName}</span>
                        {' '}{content.body}
                      </p>
                      
                      {/* Responsive time indicator badge */}
                      <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 self-start sm:self-center uppercase tracking-wide">
                        <ClockIcon className="w-3 h-3 text-gray-400" />
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                    
                    {/* Unique Profile Quick Navigation */}
                    {notif.type === NotificationType.NEW_FOLLOWER && (
                        <button 
                            className="mt-3.5 text-[9px] font-black uppercase bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer tracking-wider"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('profile', { userId: notif.actorId });
                            }}
                        >
                            {t('view_profile') || 'Ver Perfil'}
                        </button>
                    )}
                  </div>
                  
                  {/* Micro actions Panel (Styled Delete and Read Toggle triggers with Luxury Highlight states!) */}
                  <div className="flex flex-row sm:flex-col items-center gap-1 self-center sm:self-stretch justify-center shrink-0 ml-1">
                    
                    {/* Read & Unread toggling button with interactive dynamic triggers */}
                    <button
                      onClick={(e) => handleToggleRead(e, notif.id, notif.isRead)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                        notif.isRead 
                          ? 'text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 border-transparent hover:border-blue-500/10' 
                          : 'text-blue-500 hover:text-amber-500 hover:bg-amber-500/10 border-blue-500/10 hover:border-amber-500/10'
                      }`}
                      title={notif.isRead ? t('mark_unread', 'Marcar como não lida') : t('mark_read', 'Marcar como lida')}
                    >
                      {notif.isRead ? (
                        <EnvelopeIcon className="w-3.5 h-3.5" />
                      ) : (
                        <EnvelopeOpenIcon className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Highly stylized individual deletion button with red highlight effect */}
                    <button
                      onClick={(e) => handleDeleteNotification(e, notif.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/10 transition-all cursor-pointer active:scale-90"
                      title={t('delete_notification') || "Eliminar notificação"}
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      
      {/* Small Ambient Credit Line */}
      <div className="mt-16 text-center">
        <p className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.3em]">CyberPhone Premium Pulse Network</p>
      </div>
    </div>
  );
};

export default NotificationsPage;

