import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Notification, NotificationType } from '../types';
import { getNotificationsForUser, markNotificationsAsRead, findUserById, deleteNotification, clearAllNotifications } from '../services/storageService';
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
  const { showConfirm } = useDialog();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actors, setActors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

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
    await markNotificationsAsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    refreshUser();
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      refreshUser();
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
      // Feedback imediato já via setNotifications([]), opcional alert ou toast se disponível
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

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            {t('notifications')}
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
              {notifications.filter(n => !n.isRead).length}
            </span>
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{t('notifications_subtitle') || 'Fique por dentro das novidades'}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-xl"
            >
              {t('notifications_mark_read') || 'Lidas'}
            </button>
          )}
          
          {notifications.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="text-[10px] font-black uppercase text-red-600 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-xl"
            >
              {t('notifications_delete') || 'Limpar Tudo'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[40px] shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
               <BellIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="font-black uppercase text-gray-900 dark:text-white">{t('notifications_empty_title') || 'Tudo em silêncio por aqui'}</h3>
          <p className="text-sm text-gray-500 font-medium max-w-[200px] mt-2">{t('no_notifications') || 'Suas notificações aparecerão aqui assim que algo acontecer.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifications.map((notif) => {
              const actor = actors[notif.actorId];
              const content = getNotificationContent(notif.type, actor?.firstName || 'Alguém', notif.groupName, notif.callType);
              
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`relative group flex items-start gap-4 p-4 rounded-[32px] transition-all cursor-pointer ${
                    notif.isRead 
                      ? 'bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10' 
                      : 'bg-blue-50/50 dark:bg-blue-900/10 border-l-[6px] border-blue-600'
                  }`}
                  onClick={() => {
                    if (notif.postId) onNavigate('feed', { postId: notif.postId });
                    else if (notif.type === NotificationType.NEW_FOLLOWER) onNavigate('profile', { userId: notif.actorId });
                    else if (notif.type === NotificationType.MESSAGE) onNavigate('chat');
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <img 
                      src={actor?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(actor?.firstName || 'A')}&background=random`} 
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white dark:ring-white/10" 
                      alt="" 
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#0a0c10] p-1 rounded-full shadow-sm ring-1 ring-gray-100 dark:ring-white/10">
                      {getIcon(notif.type)}
                    </div>
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                       <p className="text-sm text-gray-900 dark:text-white leading-tight">
                        <span className="font-black uppercase tracking-tight">{actor?.firstName} {actor?.lastName}</span>
                        {' '}{content.body}
                      </p>
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 shrink-0 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                        <ClockIcon className="w-3 h-3" />
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                    
                    {notif.type === NotificationType.NEW_FOLLOWER && (
                        <button 
                            className="mt-3 text-[10px] font-black uppercase bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('profile', { userId: notif.actorId });
                            }}
                        >
                            {t('view_profile') || 'Ver Perfil'}
                        </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!notif.isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notif.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                      title={t('delete_notification') || "Eliminar notificação"}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      
      <div className="mt-12 text-center">
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">CyberPhone Notifications System</p>
      </div>
    </div>
  );
};

export default NotificationsPage;
