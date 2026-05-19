
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Message, ChatConversation, ChatType, GroupTheme, Page } from '../types';
import {
  getChats,
  getChat,
  findUserById,
  sendMessage,
  deleteMessage,
  editMessage,
  generateUUID,
  getUsers,
  updateGroupTheme,
  leaveGroup,
  deleteChat,
  startPrivateChat,
  markChatMessagesAsRead,
  uploadFile,
  toggleReaction,
  toggleBlockUser,
  getMutualBlockedUserIds,
  formatLastSeen,
  isUserOnline
} from '../services/storageService';
import { translateText } from '../services/translationService';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';
import { 
  PhoneIcon, 
  VideoCameraIcon, 
  ChatBubbleLeftRightIcon, 
  PaperClipIcon, 
  ArrowLeftIcon, 
  PaperAirplaneIcon, 
  CheckBadgeIcon, 
  MagnifyingGlassIcon, 
  UserGroupIcon, 
  PlusIcon, 
  EllipsisVerticalIcon, 
  PaintBrushIcon, 
  PencilIcon, 
  TrashIcon, 
  ArrowUturnLeftIcon, 
  XMarkIcon, 
  DocumentDuplicateIcon, 
  ArrowRightOnRectangleIcon, 
  InformationCircleIcon,
  PlayIcon, 
  DocumentIcon,
  ArrowDownTrayIcon,
  MicrophoneIcon,
  StopIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';
import CallModal from './CallModal';
import ConfirmationModal, { ConfirmationType } from './ConfirmationModal';
import { checkContent, checkImageSecurity } from '../services/sentinelService';

import { startCall } from '../services/callService';
import { CallType } from '../types';

interface ChatPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  params?: Record<string, string>;
  onMessagesRead?: () => void;
  refreshUser?: () => void;
}
 
// Configuração expandida de Temas
const THEME_CONFIG: Record<GroupTheme, { primary: string, secondary: string, bg: string, bubble: string, text: string }> = {
  blue: { primary: 'bg-blue-600', secondary: 'bg-blue-500', bg: 'bg-[#7ca9d6]', bubble: 'bg-[#effdde]', text: 'text-blue-600' },
  green: { primary: 'bg-emerald-600', secondary: 'bg-emerald-500', bg: 'bg-[#7ebc89]', bubble: 'bg-[#e7fde8]', text: 'text-emerald-600' },
  black: { primary: 'bg-zinc-900', secondary: 'bg-zinc-800', bg: 'bg-[#1a1a1a]', bubble: 'bg-[#2b2b2b]', text: 'text-white' }, 
  orange: { primary: 'bg-orange-600', secondary: 'bg-orange-500', bg: 'bg-[#edb881]', bubble: 'bg-[#fff5e6]', text: 'text-orange-600' },
  purple: { primary: 'bg-purple-600', secondary: 'bg-purple-500', bg: 'bg-[#9d84c4]', bubble: 'bg-[#f3e5f5]', text: 'text-purple-600' },
  red: { primary: 'bg-red-600', secondary: 'bg-red-500', bg: 'bg-[#e57373]', bubble: 'bg-[#ffebee]', text: 'text-red-600' },
  teal: { primary: 'bg-teal-600', secondary: 'bg-teal-500', bg: 'bg-[#4db6ac]', bubble: 'bg-[#e0f2f1]', text: 'text-teal-600' },
  pink: { primary: 'bg-pink-600', secondary: 'bg-pink-500', bg: 'bg-[#f06292]', bubble: 'bg-[#fce4ec]', text: 'text-pink-600' },
  indigo: { primary: 'bg-indigo-600', secondary: 'bg-indigo-500', bg: 'bg-[#7986cb]', bubble: 'bg-[#e8eaf6]', text: 'text-indigo-600' },
  cyan: { primary: 'bg-cyan-600', secondary: 'bg-cyan-500', bg: 'bg-[#4dd0e1]', bubble: 'bg-[#e0f7fa]', text: 'text-cyan-600' }
};
 
const ChatPage: React.FC<ChatPageProps> = ({ currentUser, onNavigate, params, onMessagesRead, refreshUser }) => {
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  // Arquivos
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'document' | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PRIVATE' | 'GROUP'>('ALL');
  
  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: ConfirmationType;
    confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [followedUsersData, setFollowedUsersData] = useState<User[]>([]);

  // States for Actions
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<Message | null>(null);
  
  const [isSending, setIsSending] = useState(false);
  const hasAutoStarted = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadUsers = async () => {
      const users = await getUsers(currentUser);
      setAllUsers(users);
      // Condição: Quem eu sigo OU quem me segue
      const connections = users.filter(u => 
        (currentUser.followedUsers?.includes(u.id)) || 
        (u.followedUsers?.includes(currentUser.id))
      );
      setFollowedUsersData(connections);
    };
    loadUsers();
    const interval = setInterval(loadUsers, 10000);
    return () => clearInterval(interval);
  }, [currentUser.followedUsers, currentUser.id]);

  useEffect(() => {
    if (params?.userId && allUsers.length > 0 && hasAutoStarted.current !== params.userId) {
      hasAutoStarted.current = params.userId;
      handleStartChatWithUser(params.userId);
    }
    
    const handleUrlChatId = async () => {
        if (params?.chatId && !selectedChat) {
            // First try local list
            const localChat = conversations.find(c => c.id === params.chatId);
            if (localChat) {
                setSelectedChat(localChat);
            } else {
                // Fetch directly
                const remoteChat = await getChat(params.chatId);
                if (remoteChat) setSelectedChat(remoteChat);
            }
        }
    };
    handleUrlChatId();
  }, [params?.userId, params?.chatId, allUsers.length, conversations, selectedChat]);

  const loadData = useCallback(async () => {
    const userChats = await getChats(currentUser.id);
    
    // Filtro de Bloqueio Mútuo
    const blockedIds = await getMutualBlockedUserIds(currentUser.id);
    const filteredChats = userChats.filter(chat => {
        if (chat.type === ChatType.PRIVATE) {
            const partnerId = chat.participants.find(p => p !== currentUser.id);
            return !blockedIds.includes(partnerId || '');
        }
        return true;
    });

    setConversations(filteredChats);
    if (selectedChat) {
      const updated = filteredChats.find(c => c.id === selectedChat.id);
      if (updated) {
          // Check if there are new unread messages while open and mark them as read
          const hasUnread = updated.messages.some(m => m.senderId !== currentUser.id && !m.isRead);
          if (hasUnread) {
              markChatMessagesAsRead(selectedChat.id, currentUser.id);
              if (onMessagesRead) onMessagesRead();
          }
          setSelectedChat(updated);
      }
    }
  }, [currentUser.id, selectedChat?.id, onMessagesRead]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Mark as read when selecting chat
  useEffect(() => {
      if (selectedChat) {
          markChatMessagesAsRead(selectedChat.id, currentUser.id);
          if (onMessagesRead) onMessagesRead();
      }
  }, [selectedChat?.id]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages?.length, selectedChat?.id]);

  const getChatDisplayInfo = (chat: ChatConversation) => {
    if (chat.type === ChatType.GROUP) {
      return {
        name: chat.groupName || t('chat_group_default'),
        image: chat.groupImage || DEFAULT_PROFILE_PIC,
        isOnline: false,
        lastSeen: 0
      };
    }
    const partnerId = chat.participants.find(p => p !== currentUser.id);
    const partner = allUsers.find(u => u.id === partnerId);
    return {
      name: partner ? `${partner.firstName} ${partner.lastName}` : t('chat_unknown_user'),
      image: partner?.profilePicture || DEFAULT_PROFILE_PIC,
      isOnline: isUserOnline(partner?.lastSeen, partner?.isOnline),
      lastSeen: partner?.lastSeen || 0
    };
  };

  const handleStartChatWithUser = async (targetUserId: string) => {
    try {
      if (targetUserId === currentUser.id) return;
      console.log(`[CHAT] Iniciando chat com: ${targetUserId}`);
      const chatId = await startPrivateChat(currentUser.id, targetUserId);
      if (!chatId) throw new Error("Falha ao criar ou encontrar chatID");
      
      console.log(`[CHAT] ID da conversa: ${chatId}. Carregando dados...`);
      await loadData();
      
      // Busca direta do chat para garantir que ele seja aberto mesmo se não aparecer na lista imediatamente
      let chat = await getChat(chatId);
      
      // Pequeno retry caso o Firestore demore a persistir ou cache local esteja inconsistente
      if (!chat && chatId) {
          console.warn(`[CHAT] Chat ${chatId} não encontrado no primeiro fetch. Tentando retry em 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          chat = await getChat(chatId);
      }
      
      if (chat) {
        console.log(`[CHAT] Conversa ${chatId} aberta com sucesso.`);
        setSelectedChat(chat);
        setSearchTerm('');
      } else {
        console.error(`[CHAT] CRÍTICO: Chat ${chatId} criado mas não encontrado nem via fetch direto após retry.`);
        showAlert("A conversa foi iniciada, mas o servidor demorou a responder. Por favor, aguarde alguns segundos e tente novamente.", { type: 'alert' });
      }
    } catch (e) {
      console.error("Erro ao iniciar conversa:", safeJsonStringify(e));
      showAlert("Não foi possível iniciar a conversa. Verifique sua conexão.", { type: 'error' });
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setAttachedFile(file);
          
          let type: 'image' | 'video' | 'audio' | 'document' = 'document';
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type.startsWith('video/')) type = 'video';
          else if (file.type.startsWith('audio/')) type = 'audio';
          
          setFileType(type);

          if (type === 'image' || type === 'video') {
              const reader = new FileReader();
              reader.onloadend = () => setAttachedPreview(reader.result as string);
              reader.readAsDataURL(file);
          } else {
              setAttachedPreview(null);
          }
      }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    try {
      // Fetch o arquivo como blob para forçar o download
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erro ao baixar arquivo:", safeJsonStringify(error));
      // Fallback: abrir em nova aba
      window.open(url, '_blank');
    }
  };

  // --- AUDIO RECORDING FUNCTIONS ---

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showAlert(t('chat_audio_browser_error'), { type: 'error' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Erro ao acessar microfone:", safeJsonStringify(error));
      showAlert(t('chat_mic_permission_denied'), { type: 'error' });
    }
  };

  const handleStopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !selectedChat) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `audio_msg_${Date.now()}.webm`, { type: 'audio/webm' });
      
      // Stop timer and stream
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      setIsSending(true);

      try {
        const uploadedUrl = await uploadFile(audioFile, 'chat_audio');
        
        const msg: Message = {
          id: generateUUID(),
          senderId: currentUser.id,
          timestamp: Date.now(),
          fileUrl: uploadedUrl,
          fileType: 'audio',
          fileName: t('voice_message'),
          groupId: selectedChat.type === ChatType.GROUP ? selectedChat.id : undefined,
          isRead: false
        };

        await sendMessage(selectedChat.id, msg);
        loadData();
      } catch (err) {
        console.error("Falha ao enviar áudio", safeJsonStringify(err));
        showAlert(t('chat_audio_send_fail'), { type: 'error' });
      } finally {
        setIsSending(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const handleCancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    
    setIsRecording(false);
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- END AUDIO RECORDING FUNCTIONS ---

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || !selectedChat || isSending) return;

    setIsSending(true);

    try {
        // Sentinel AI Check
        if (newMessage.trim()) {
            const sentinelResult = await checkContent(newMessage.trim(), 'message');
            if (!sentinelResult.isSafe) {
                throw new Error(`SENTINEL_BLOCK: ${sentinelResult.reason || t('chat_sentinel_block_desc')}`);
            }
        }

        if (editingMessageId) {
            await editMessage(selectedChat.id, editingMessageId, newMessage.trim());
            setEditingMessageId(null);
        } else {
            let uploadedUrl = undefined;
            if (attachedFile) {
                if (attachedFile.type.startsWith('image/')) {
                    // Convert image to base64 for Sentinel check
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(attachedFile);
                    });
                    const base64 = await base64Promise;
                    const imageSentinelResult = await checkImageSecurity(base64, attachedFile.type);
                    if (!imageSentinelResult.allowed) {
                        throw new Error(`SENTINEL_BLOCK: ${imageSentinelResult.reason || t('chat_sentinel_block_desc')}`);
                    }
                }
                uploadedUrl = await uploadFile(attachedFile, 'chat_files');
            }

            let replySenderName = t('user_label');
            let replySenderAvatar = DEFAULT_PROFILE_PIC;

            if (replyingTo) {
                if (replyingTo.senderId === currentUser.id) {
                    replySenderName = t('you');
                    replySenderAvatar = currentUser.profilePicture || DEFAULT_PROFILE_PIC;
                } else {
                    const sender = allUsers.find(u => u.id === replyingTo.senderId);
                    if (sender) {
                        replySenderName = `${sender.firstName} ${sender.lastName}`;
                        replySenderAvatar = sender.profilePicture || DEFAULT_PROFILE_PIC;
                    }
                }
            }

            const replyContext: any = replyingTo ? {
                id: replyingTo.id,
                text: replyingTo.text || (replyingTo.fileType ? `[${replyingTo.fileType.toUpperCase()}]` : t('content_label')),
                senderName: replySenderName,
                senderAvatar: replySenderAvatar,
                type: (replyingTo.fileType || 'text') as any
            } : undefined;

            const msg: Message = {
              id: generateUUID(),
              senderId: currentUser.id,
              timestamp: Date.now(),
              text: newMessage.trim() || undefined,
              fileUrl: uploadedUrl,
              fileType: fileType || undefined,
              fileName: attachedFile ? attachedFile.name : undefined,
              imageUrl: fileType === 'image' ? uploadedUrl : undefined, // Mantido para compatibilidade
              groupId: selectedChat.type === ChatType.GROUP ? selectedChat.id : undefined,
              replyTo: replyContext,
              isRead: false
            };

            await sendMessage(selectedChat.id, msg);
            setReplyingTo(null);
        }

        setNewMessage('');
        setAttachedFile(null);
        setAttachedPreview(null);
        setFileType(null);
        loadData();
        if (inputRef.current) inputRef.current.style.height = 'auto';
    } catch (err: any) {
        console.error("Failed to send message", safeJsonStringify(err));
        if (err.message?.includes('SENTINEL_BLOCK')) {
            showAlert(err.message.replace('SENTINEL_BLOCK: ', ''), { type: 'error', title: 'Sentinela de Segurança' });
        } else if (err.message?.includes('BLOCK:')) {
            showAlert(err.message.replace('BLOCK: ', ''), { type: 'alert', title: 'Chat Bloqueado' });
        } else {
            showAlert(t('chat_send_fail'), { type: 'error' });
        }
    } finally {
        setIsSending(false);
    }
  };

  const handleAction = (action: 'reply' | 'edit' | 'delete' | 'copy') => {
    if (!selectedMessageForAction || !selectedChat) return;
    const msg = selectedMessageForAction;

    switch (action) {
        case 'reply':
            setReplyingTo(msg);
            setEditingMessageId(null);
            inputRef.current?.focus();
            break;
        case 'edit':
            // Só permite editar texto
            if (msg.text && !msg.fileUrl) {
                setNewMessage(msg.text || '');
                setEditingMessageId(msg.id);
                setReplyingTo(null);
                inputRef.current?.focus();
            } else {
                showAlert(t('chat_edit_text_only'), { type: 'error' });
            }
            break;
        case 'delete':
            const isHardDelete = !!msg.isDeleted;
            setConfirmConfig({
              isOpen: true,
              title: isHardDelete ? t('remove_definitively') : t('confirm_delete_title'),
              message: isHardDelete 
                ? t('delete_historical')
                : t('delete_confirm'),
              confirmText: isHardDelete ? t('remove') : t('delete'),
              type: ConfirmationType.DANGER,
              onConfirm: async () => {
                await deleteMessage(selectedChat.id, msg.id, isHardDelete);
                loadData();
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              }
            });
            break;
        case 'copy':
            if (msg.text) navigator.clipboard.writeText(msg.text);
            break;
    }
    setSelectedMessageForAction(null);
  };

  const cancelAction = () => {
    setReplyingTo(null);
    setEditingMessageId(null);
    setNewMessage('');
    setAttachedFile(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleChangeTheme = async (theme: GroupTheme) => {
    if (!selectedChat || selectedChat.adminId !== currentUser.id) return;
    await updateGroupTheme(selectedChat.id, theme);
    setShowThemeMenu(false);
    loadData();
  };

  const confirmLeaveGroup = () => {
    if (!selectedChat) return;
    setConfirmConfig({
      isOpen: true,
      title: t('chat_leave_group'),
      message: t('chat_leave_group_confirm'),
      confirmText: t('chat_leave_now'),
      type: ConfirmationType.WARNING,
      onConfirm: async () => {
        await leaveGroup(selectedChat.id, currentUser.id);
        setSelectedChat(null);
        loadData();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setShowGroupMenu(false);
      }
    });
  };

  const confirmDeleteChat = () => {
    if (!selectedChat) return;
    const isGroup = selectedChat.type === ChatType.GROUP;
    setConfirmConfig({
      isOpen: true,
      title: isGroup ? t('chat_delete_group') : t('chat_delete_conversation'),
      message: isGroup 
        ? t('chat_delete_group_warning')
        : t('delete_confirm'),
      confirmText: t('chat_delete_all'),
      type: ConfirmationType.DANGER,
      onConfirm: async () => {
        await deleteChat(selectedChat.id);
        setSelectedChat(null);
        loadData();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setShowGroupMenu(false);
      }
    });
  };

  const handleChatToggleBlock = () => {
    if (!selectedChat || selectedChat.type !== ChatType.PRIVATE) return;
    const partnerId = selectedChat.participants.find(p => p !== currentUser.id);
    if (!partnerId) return;

    setShowGroupMenu(false);

    const isBlocked = (currentUser.blockedUserIds || []).includes(partnerId);
    
    setConfirmConfig({
      isOpen: true,
      title: isBlocked ? t('chat_unblock_contact_q') : t('chat_block_contact_q'),
      message: isBlocked 
        ? t('chat_unblock_contact_desc') 
        : t('chat_block_contact_desc'),
      confirmText: isBlocked ? t('chat_unblock') : t('chat_block_and_hide'),
      type: 'warning' as any,
      onConfirm: async () => {
        try {
          const isNowBlocked = !isBlocked;
          await toggleBlockUser(currentUser.id, partnerId);
          
          if (refreshUser) refreshUser();
          
          if (isNowBlocked) {
            setSelectedChat(null);
            showAlert(t('chat_user_blocked_msg'), { type: 'success' });
          } else {
            showAlert(t('chat_user_unblocked_msg'), { type: 'success' });
          }
          await loadData();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setShowGroupMenu(false);
        } catch (err) {
          console.error("Erro ao alternar bloqueio:", safeJsonStringify(err));
          showAlert(t('chat_block_error'), { type: 'error' });
        }
      }
    });
  };

  const handleStartCall = async (type: CallType) => {
    if (!selectedChat) return;
    if (selectedChat.type === ChatType.PRIVATE) {
        const partnerId = selectedChat.participants.find(p => p !== currentUser.id);
        if (partnerId) {
            const partner = await findUserById(partnerId);
            if (partner) {
                // Send signal to the recipient - CallManager globally will pick this up
                await startCall(currentUser, partner, type);
            }
        }
    } else {
        const partnerId = selectedChat.participants.find(p => p !== currentUser.id);
        const partner = await findUserById(partnerId!);
        if (partner) {
           // Groups are basically just person-to-person for now or we could implement group calls
           await startCall(currentUser, partner, type);
        }
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedChat) return;
    try {
      await toggleReaction(messageId, 'MESSAGE', emoji, currentUser.id, selectedChat.id);
      loadData();
    } catch (err: any) {
      console.error("Erro ao reagir:", safeJsonStringify(err));
      if (err.message === 'OWNER_REACTION_NOT_ALLOWED') {
          showAlert(t('cannot_react_own_message') || "Você não pode reagir à sua própria mensagem.", { type: 'alert' });
      }
    }
  };

  const handleTranslateMessage = async (messageId: string, text: string) => {
    if (translatedMessages[messageId]) {
        const newTranslated = { ...translatedMessages };
        delete newTranslated[messageId];
        setTranslatedMessages(newTranslated);
        return;
    }

    setTranslatingIds(prev => new Set(prev).add(messageId));
    try {
        const langMap: Record<string, string> = {
            'pt': 'Português',
            'en': 'English',
            'es': 'Español'
        };
        const targetLang = langMap[i18n.language.split('-')[0]] || 'Português';
        const translated = await translateText(text, targetLang);
        setTranslatedMessages(prev => ({ ...prev, [messageId]: translated }));
    } catch (error) {
        showAlert(t('translation_error'));
    } finally {
        setTranslatingIds(prev => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
        });
    }
  };

  const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😂', '😮', '😢', '👍', '🙏'];

  const renderMessageContent = (msg: Message) => {
      if (msg.isDeleted) {
          return (
            <div className="italic text-gray-500 text-xs px-2 py-1 flex items-center gap-1 select-none">
                <XMarkIcon className="h-3 w-3" /> <span className="opacity-70">{t('message_deleted')}</span>
            </div>
          );
      }

      return (
          <div className="flex flex-col">
              {/* Message Reply Block */}
              {msg.replyTo && !msg.isDeleted && (
                  <div className="mb-2 pl-3 border-l-4 border-blue-500 bg-gray-50/50 dark:bg-white/5 rounded-r-xl p-2 opacity-90 flex gap-3">
                      <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 mb-0.5">{msg.replyTo.senderName}</p>
                          <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate leading-tight">{msg.replyTo.text}</p>
                          {msg.replyTo.type && msg.replyTo.type !== 'text' && (
                              <span className="text-[8px] bg-blue-500/20 px-1.5 py-0.5 rounded uppercase font-black mt-1 inline-block text-blue-600 dark:text-blue-400">{msg.replyTo.type}</span>
                          )}
                      </div>
                      {msg.replyTo.senderAvatar && (
                          <img 
                              src={msg.replyTo.senderAvatar} 
                              alt={msg.replyTo.senderName} 
                              className="w-10 h-10 rounded-lg object-cover bg-gray-200"
                              referrerPolicy="no-referrer"
                          />
                      )}
                  </div>
              )}

              {/* Media Content */}
              {msg.fileUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden relative group/media">
                      {msg.fileType === 'image' && (
                          <div className="relative">
                            <img src={msg.fileUrl} className="max-w-full h-auto rounded-xl max-h-60 object-cover" alt="Imagem" />
                            <button 
                              onClick={(e) => handleDownload(e, msg.fileUrl!, msg.fileName || 'image.png')}
                              className="absolute bottom-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/70 active:scale-90"
                              title="Baixar Imagem"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          </div>
                      )}
                      {msg.fileType === 'video' && (
                          <div className="relative">
                            <video 
                              src={msg.fileUrl} 
                              controls 
                              controlsList="nodownload noplaybackrate" 
                              disablePictureInPicture
                              className="max-w-full h-auto rounded-xl max-h-60" 
                            />
                            <button 
                              onClick={(e) => handleDownload(e, msg.fileUrl!, msg.fileName || 'video.mp4')}
                              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/70 active:scale-90 z-10"
                              title="Baixar Vídeo"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          </div>
                      )}
                      {msg.fileType === 'audio' && (
                          <div className="flex items-center gap-2 p-3 bg-gray-100/50 dark:bg-white/10 rounded-xl">
                             <audio 
                               src={msg.fileUrl} 
                               controls 
                               controlsList="nodownload noplaybackrate" 
                               className="w-full min-w-[200px]" 
                             />
                          </div>
                      )}
                      {msg.fileType === 'document' && (
                          <div className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/10 rounded-xl hover:bg-black/10 transition-colors cursor-pointer group/doc">
                              <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm">
                                  <DocumentIcon className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0" onClick={() => window.open(msg.fileUrl, '_blank')}>
                                  <p className="text-xs font-bold truncate">{msg.fileName || t('document')}</p>
                                  <p className="text-[9px] uppercase font-black opacity-70">{t('view')}</p>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {/* Text Content */}
              {msg.text && (
                  <div className="px-1">
                      <p className="text-[14px] font-medium leading-relaxed whitespace-pre-wrap break-words min-w-0 w-full text-left">
                          {translatedMessages[msg.id] || msg.text}
                          {msg.isEdited && <span className="text-[9px] opacity-60 ml-1 italic">{t('chat_edited_label')}</span>}
                      </p>
                      
                      <button 
                        onClick={() => handleTranslateMessage(msg.id, msg.text!)}
                        className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#2563eb] hover:underline flex items-center gap-1"
                      >
                        {translatingIds.has(msg.id) ? (
                            <ArrowPathIcon className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                            <span>{translatedMessages[msg.id] ? t('view_original') : t('translate')}</span>
                        )}
                      </button>
                  </div>
              )}

            {/* Reactions Display */}
            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-2 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                        users.length > 0 && (
                            <button 
                                key={emoji}
                                onClick={() => msg.senderId !== currentUser.id && handleReaction(msg.id, emoji)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border transition-all shadow-sm ${users.includes(currentUser.id) ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span>{emoji}</span>
                                <span className="font-bold">{users.length}</span>
                            </button>
                        )
                    ))}
                </div>
            )}
          </div>
      );
  };

  const filteredConversations = conversations.filter(c => {
    if (filterTab !== 'ALL' && c.type !== filterTab) return false;
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const { name } = getChatDisplayInfo(c);
        return name.toLowerCase().includes(term);
    }
    return true;
  });

  const filteredFollowers = searchTerm ? followedUsersData.filter(u => {
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      const hasChat = conversations.some(c => 
        c.type === ChatType.PRIVATE && c.participants.includes(u.id)
      );
      
      return name.includes(searchTerm.toLowerCase()) && !hasChat;
  }) : [];

  const chatTheme = selectedChat?.theme || 'blue';
  const themeStyles = THEME_CONFIG[chatTheme];
  const activeChatInfo = selectedChat ? getChatDisplayInfo(selectedChat) : null;

  return (
    <div className="flex h-[calc(100vh-128px)] md:h-[calc(100vh-72px)] bg-[#f0f2f5] dark:bg-[#0a0c10] overflow-hidden animate-fade-in">
      
      {/* SIDEBAR */}
      <div className={`
        flex-col bg-white dark:bg-[#12161f] border-r dark:border-white/5 z-40 transition-all
        ${selectedChat ? 'hidden md:flex md:w-80 lg:w-[360px]' : 'flex w-full md:w-80 lg:w-[360px]'}
      `}>
        <div className="p-4 space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">{t('messages')}</h2>
              </div>
              <button 
                onClick={() => onNavigate('create-group')}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg active:scale-90"
              >
                <PlusIcon className="h-5 w-5 stroke-[3]" />
              </button>
           </div>
           
           <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                placeholder={t('search_placeholder')} 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 rounded-full outline-none border-none ring-0 focus:ring-2 focus:ring-blue-500 transition-all font-bold text-xs dark:text-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>

           <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
              {['ALL', 'PRIVATE', 'GROUP'].map(tab => (
                 <button key={tab} onClick={() => setFilterTab(tab as any)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                    {tab === 'ALL' ? t('all') : tab === 'PRIVATE' ? t('privates') : t('groups')}
                 </button>
              ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
          {searchTerm && filteredFollowers.length > 0 && (
             <div className="mb-4 animate-fade-in">
                <p className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('start_new_chat')}</p>
                {filteredFollowers.map(user => (
                   <button
                     key={user.id}
                     onClick={() => handleStartChatWithUser(user.id)}
                     className="w-full flex items-center p-3 rounded-2xl transition-all hover:bg-blue-50 dark:hover:bg-blue-900/10"
                   >
                      <div className="relative">
                        <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-white/10" />
                        {isUserOnline(user.lastSeen, user.isOnline) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-darkbg"></div>}
                      </div>
                       <div className="ml-3 text-left">
                          <div className="flex items-center gap-2">
                             <p className="font-black text-sm dark:text-white">{user.firstName} {user.lastName}</p>
                          </div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{t('tap_to_chat')}</p>
                       </div>
                   </button>
                ))}
             </div>
          )}

          {filteredConversations.length === 0 && filteredFollowers.length === 0 ? (
             <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                {t('no_chats_found')}
             </div>
          ) : (
             filteredConversations.map(chat => {
                const isGroup = chat.type === ChatType.GROUP;
                const lastMsg = chat.messages[chat.messages.length - 1];
                const isActive = selectedChat?.id === chat.id;
                const { name, image, isOnline } = getChatDisplayInfo(chat);
                const itemChatTheme = chat.theme || 'blue';
                const itemThemeStyles = THEME_CONFIG[itemChatTheme];
                
                // Calculate unread messages (messages I didn't send and haven't read)
                const unreadCount = chat.messages.filter(m => m.senderId !== currentUser.id && !m.isRead).length;

                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full flex items-center p-3 rounded-2xl transition-all mb-0.5 ${isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    <div className="relative shrink-0">
                      <img src={image} className="w-12 h-12 rounded-full object-cover border border-black/5 shadow-sm bg-white" />
                      {isGroup ? (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 p-0.5 rounded-full border border-white"><UserGroupIcon className="h-2.5 w-2.5 text-white"/></div>
                      ) : (
                        isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-darkbg shadow-sm"></div>
                      )}
                    </div>
                    <div className="ml-3 text-left overflow-hidden flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`font-black text-sm truncate uppercase tracking-tighter ${isActive ? 'text-white' : 'dark:text-white'}`}>{name}</p>
                          </div>
                          <div className="flex flex-col items-end">
                             {lastMsg && <span className={`text-[8px] font-bold ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>{new Date(lastMsg.timestamp).getHours()}:{new Date(lastMsg.timestamp).getMinutes().toString().padStart(2, '0')}</span>}
                          </div>
                      </div>
                      <div className="flex justify-between items-center">
                          <p className={`text-[11px] truncate leading-tight ${isActive ? 'text-blue-100' : 'text-gray-400 font-medium'} max-w-[80%]`}>
                              {lastMsg ? (lastMsg.isDeleted ? t('chat_message_deleted_notice') : lastMsg.text || (lastMsg.fileType ? `[${lastMsg.fileType.toUpperCase()}]` : '📷 Mídia')) : t('chat_no_messages')}
                          </p>
                          {unreadCount > 0 && (
                             <span className={`text-[8px] font-black text-white px-2 py-0.5 rounded-full ml-2 shadow-sm ${isActive ? 'bg-white/20' : itemThemeStyles.primary}`}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                             </span>
                          )}
                      </div>
                    </div>
                  </button>
                );
             })
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={`flex-col h-full relative flex-1 min-w-0 ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedChat && activeChatInfo ? (
          <>
            <div className={`h-20 flex items-center justify-between px-4 text-white z-30 transition-colors duration-500 ${themeStyles.primary} shadow-lg shrink-0`}>
               <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedChat(null)} className="p-2 text-white/90 hover:bg-white/10 rounded-full transition-transform active:scale-95"><ArrowLeftIcon className="h-6 w-6 stroke-[3]"/></button>
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowGroupMenu(!showGroupMenu)}>
                     <div className="relative">
                        <img src={activeChatInfo.image} className="w-12 h-12 rounded-full object-cover border-2 border-white/20 bg-white shadow-md" />
                        {activeChatInfo.isOnline && !showGroupMenu && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-blue-600 shadow-sm"></div>}
                     </div>
                     <div className="leading-tight">
                        <div className="flex flex-col">
                           <h3 className="text-base font-black uppercase tracking-tight leading-none mb-1">{activeChatInfo.name}</h3>
                           <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">
                               {selectedChat.type === ChatType.GROUP 
                                   ? `${selectedChat.participants.length} ${t('chat_members_count')}` 
                                   : formatLastSeen(activeChatInfo.lastSeen, activeChatInfo.isOnline).toUpperCase()}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-0.5">
                  <button onClick={() => handleStartCall(CallType.VOICE)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><PhoneIcon className="h-6 w-6"/></button>
                  <button onClick={() => handleStartCall(CallType.VIDEO)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><VideoCameraIcon className="h-6 w-6"/></button>
                  
                  <div className="relative">
                    <button onClick={() => setShowGroupMenu(!showGroupMenu)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><EllipsisVerticalIcon className="h-6 w-6"/></button>
                    {showGroupMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1a1c23] rounded-3xl shadow-2xl border border-black/5 dark:border-white/10 z-[100] p-2 animate-fade-in">
                            <button className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-xs dark:text-white rounded-xl transition-all" onClick={() => { showAlert(`Chat: ${selectedChat.groupName || t('all')}`); setShowGroupMenu(false); }}>
                                <InformationCircleIcon className="h-4 w-4 text-blue-500" /> {t('chat_details')}
                            </button>
                            
                            {selectedChat.type === ChatType.GROUP && (
                                <button onClick={confirmLeaveGroup} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 text-xs text-red-500 rounded-xl transition-all">
                                    <ArrowRightOnRectangleIcon className="h-4 w-4" /> {t('chat_leave_group')}
                                </button>
                            )}

                            {selectedChat.type === ChatType.PRIVATE && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-white/5 my-1"></div>
                                    <button 
                                        onClick={handleChatToggleBlock} 
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-xs font-black uppercase transition-all ${(currentUser.blockedUserIds || []).includes(selectedChat.participants.find(p => p !== currentUser.id) || '') ? 'text-blue-600' : 'text-red-500'}`}
                                    >
                                        {(currentUser.blockedUserIds || []).includes(selectedChat.participants.find(p => p !== currentUser.id) || '') ? (
                                            <><ShieldCheckIcon className="h-4 w-4" /> {t('chat_unblock')}</>
                                        ) : (
                                            <><XMarkIcon className="h-4 w-4" /> {t('chat_block_user')}</>
                                        )}
                                    </button>

                                    <button onClick={confirmDeleteChat} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 text-xs font-black uppercase text-red-500 rounded-xl transition-all">
                                        <TrashIcon className="h-4 w-4" /> {t('chat_delete_conversation')}
                                    </button>
                                </>
                            )}

                            {selectedChat.type === ChatType.GROUP && selectedChat.adminId === currentUser.id && (
                                <button onClick={confirmDeleteChat} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 text-xs text-red-600 font-bold rounded-xl transition-all border-t border-gray-100 dark:border-white/5 mt-1">
                                    <TrashIcon className="h-4 w-4" /> {t('chat_delete_group')}
                                </button>
                            )}
                        </div>
                    )}
                  </div>
               </div>
            </div>

            <div className={`flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-6 custom-scrollbar relative transition-colors duration-500 ${themeStyles.bg}`}>
               <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
               
               <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 relative z-10 pb-4">
                  {selectedChat.messages.map((msg, i) => {
                    const isMine = msg.senderId === currentUser.id;
                    const prevMsg = selectedChat.messages[i-1];
                    const showName = selectedChat.type === ChatType.GROUP && !isMine && (!prevMsg || prevMsg.senderId !== msg.senderId);
                    
                    const senderBubbleStyle = isMine 
                        ? `${themeStyles.bubble} rounded-3xl rounded-tr-none text-gray-800` 
                        : 'bg-white rounded-3xl rounded-tl-none text-gray-800 border-none';

                    return (
                      <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} group/message mb-1`}>
                         <div 
                           onClick={() => setSelectedMessageForAction(msg)}
                           className={`
                             relative max-w-[85%] md:max-w-[65%] px-4 py-3 rounded-2xl shadow-sm cursor-pointer active:scale-[0.98] transition-all
                             ${senderBubbleStyle}
                           `}
                         >
                            {/* Reaction Picker Overlay */}
                            {!isMine && !msg.isDeleted && (
                              <div className={`absolute -top-12 ${isMine ? 'right-0' : 'left-0'} opacity-0 group-hover/message:opacity-100 transition-all flex items-center gap-0.5 bg-white p-1.5 rounded-full shadow-2xl border border-gray-100 z-50`}>
                                {REACTION_EMOJIS.map(emoji => (
                                  <button 
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                    className="hover:scale-125 transition-transform p-0.5 text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Options Button on Hover */}
                            <div className={`absolute top-2 ${isMine ? '-left-8' : '-right-8'} opacity-0 group-hover/message:opacity-100 transition-opacity`}>
                                <button className="p-1 rounded-full bg-black/5 hover:bg-black/10"><ChevronDownIcon className="h-4 w-4 text-gray-400" /></button>
                            </div>

                            {renderMessageContent(msg)}

                            <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-50">
                                <span className="text-[9px] font-bold">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                {isMine && (
                                    <div className="flex">
                                        <CheckBadgeIcon className={`h-3 w-3 ${msg.isRead ? 'text-blue-500' : 'text-gray-400'}`} />
                                    </div>
                                )}
                            </div>
                         </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
               </div>
            </div>

            <div className={`p-2 md:p-4 bg-white dark:bg-[#12161f] border-t dark:border-white/5 relative z-40 shrink-0`}>
               {/* BLOCKED STATUS CHECK */}
               {selectedChat.type === ChatType.PRIVATE && (currentUser.blockedUserIds?.includes(selectedChat.participants.find(p => p !== currentUser.id) || '') || allUsers.find(u => u.id === selectedChat.participants.find(p => p !== currentUser.id))?.blockedUserIds?.includes(currentUser.id)) ? (
                  <div className="max-w-4xl mx-auto flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10 animate-fade-in">
                    <div className="flex items-center gap-3 px-4">
                       <XMarkIcon className="h-5 w-5 text-gray-400" />
                       <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                           {currentUser.blockedUserIds?.includes(selectedChat.participants.find(p => p !== currentUser.id) || '') 
                             ? t('chat_you_blocked')
                             : t('chat_blocked_by_other')}
                       </p>
                    </div>
                    
                    {currentUser.blockedUserIds?.includes(selectedChat.participants.find(p => p !== currentUser.id) || '') && (
                       <button 
                            onClick={async () => {
                               const partnerId = selectedChat.participants.find(p => p !== currentUser.id);
                               if (partnerId) {
                                   try {
                                       await toggleBlockUser(currentUser.id, partnerId);
                                       if (refreshUser) refreshUser();
                                       showAlert(t('chat_unblock_success') || "Usuário desbloqueado com sucesso.");
                                   } catch (err) {
                                       showAlert(t('chat_unblock_error') || "Erro ao desbloquear usuário.", { type: 'error' });
                                   }
                               }
                           }}
                           className="px-4 py-2 bg-blue-600/10 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                       >
                           {t('chat_unblock')}
                       </button>
                    )}
                  </div>
               ) : (
                 <>
                   {/* PREVIEW OF ATTACHMENT OR REPLY */}
               {(replyingTo || editingMessageId || attachedFile) && (
                  <div className="absolute bottom-full left-0 w-full bg-gray-50 dark:bg-[#1a1c23] border-t border-black/5 dark:border-white/5 p-3 flex justify-between items-center animate-slide-up-full shadow-lg z-50">
                      <div className="flex items-center gap-3 px-2 border-l-4 border-blue-500 overflow-hidden">
                         {replyingTo && (
                             <img 
                                 src={allUsers.find(u => u.id === replyingTo.senderId)?.profilePicture || DEFAULT_PROFILE_PIC}
                                 className="w-8 h-8 rounded-lg object-cover bg-gray-200"
                                 alt=""
                                 referrerPolicy="no-referrer"
                             />
                         )}
                         {!replyingTo && (
                            <div className="text-blue-500 shrink-0">
                                {attachedFile ? <PaperClipIcon className="h-5 w-5" /> : <PencilIcon className="h-5 w-5" />}
                            </div>
                         )}
                         <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                               {attachedFile ? t('chat_attaching_file') : (replyingTo ? t('chat_replying_to') : t('chat_editing'))}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                               {attachedFile ? attachedFile.name : (replyingTo ? replyingTo.text || `[${replyingTo.fileType?.toUpperCase()}]` : '')}
                            </p>
                         </div>
                      </div>
                     <button onClick={cancelAction} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500"><XMarkIcon className="h-5 w-5" /></button>
                  </div>
               )}

               {isRecording ? (
                 <div className="max-w-4xl mx-auto flex items-center justify-between bg-red-50 dark:bg-red-900/10 p-3 rounded-[1.5rem] border border-red-200 dark:border-red-900/30 animate-pulse">
                    <button onClick={handleCancelRecording} className="p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-all">
                       <TrashIcon className="h-6 w-6" />
                    </button>
                    
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                       <span className="font-black text-red-600 text-sm tracking-widest">{t('recording')} {formatRecordingTime(recordingDuration)}</span>
                    </div>

                    <button onClick={handleStopAndSendRecording} className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-lg active:scale-95">
                       <PaperAirplaneIcon className="h-6 w-6 -rotate-45" />
                    </button>
                 </div>
               ) : (
                 <form onSubmit={handleSend} className="max-w-4xl mx-auto flex flex-col gap-2 px-2">
                    <div className="flex items-center gap-2 px-4 mb-0.5">
                       <ShieldCheckIcon className="w-3 h-3 text-blue-600/50" />
                       <span className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em] opacity-80">Sentinela AI Audita este Chat</span>
                    </div>
                    <div className="flex items-center gap-3 w-full">
                       <div className="flex-1 flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-full border border-gray-200 dark:border-white/10 focus-within:border-blue-500/30 transition-all">
                       <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="p-2 text-gray-400 hover:text-blue-500 transition-all shrink-0"
                       >
                          <PaperClipIcon className="h-6 w-6"/>
                       </button>
                       
                       <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleFileSelection} 
                          accept="*/*"
                       />
                       
                       <textarea 
                         ref={inputRef}
                         value={newMessage} 
                         onChange={e => setNewMessage(e.target.value)}
                         placeholder="Mensagem" 
                         rows={1}
                         className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium dark:text-white py-3 pr-4 max-h-32 resize-none no-scrollbar"
                         onInput={(e) => {
                           const target = e.target as HTMLTextAreaElement;
                           target.style.height = 'auto';
                           target.style.height = `${target.scrollHeight}px`;
                         }}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSend(e);
                           }
                         }}
                       />
                    </div>
                     <button 
                       type={newMessage.trim() || attachedFile ? "submit" : "button"}
                       onClick={newMessage.trim() || attachedFile ? undefined : handleStartRecording}
                       disabled={isSending} 
                       className={`p-4 rounded-full shadow-lg transition-all active:scale-90 disabled:opacity-50 text-white bg-blue-600 hover:bg-blue-700 mb-1`}
                     >
                        {isSending ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                        ) : (
                            newMessage.trim() || attachedFile ? (
                                <PaperAirplaneIcon className="h-6 w-6 -rotate-45 ml-0.5" />
                            ) : (
                                <MicrophoneIcon className="h-6 w-6" />
                            )
                        )}
                     </button>
                    </div>
                 </form>
               )}
                </>
              )}
           </div>

          {selectedMessageForAction && (
            <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMessageForAction(null)}>
               <div 
                 className="bg-white dark:bg-[#1a1c23] w-full md:w-[320px] rounded-t-[2.5rem] md:rounded-[2rem] p-6 pb-12 md:pb-6 shadow-2xl animate-slide-up-full border-t md:border border-white/10"
                 onClick={e => e.stopPropagation()}
               >
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-8 md:hidden"></div>
                  
                  <div className="flex flex-col gap-2">
                       {/* Reaction Picker in Modal for other's messages */}
                       {selectedMessageForAction.senderId !== currentUser.id && !selectedMessageForAction.isDeleted && (
                         <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-2xl mb-2">
                           {REACTION_EMOJIS.map(emoji => (
                             <button
                               key={emoji}
                               onClick={() => { handleReaction(selectedMessageForAction.id, emoji); setSelectedMessageForAction(null); }}
                               className="text-2xl hover:scale-125 transition-transform p-1"
                             >
                               {emoji}
                             </button>
                           ))}
                         </div>
                       )}

                       {/* Only show Reply/Copy if NOT deleted */}
                       {!selectedMessageForAction.isDeleted && (
                           <>
                               <button onClick={() => { handleAction('reply'); setSelectedMessageForAction(null); }} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all w-full text-left">
                                  <ArrowUturnLeftIcon className="h-5 w-5 text-blue-500" />
                                  <span className="font-black text-sm dark:text-white">{t('reply')}</span>
                               </button>
                               
                               <button onClick={() => { handleAction('copy'); setSelectedMessageForAction(null); }} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all w-full text-left">
                                  <DocumentDuplicateIcon className="h-5 w-5 text-gray-500" />
                                  <span className="font-black text-sm dark:text-white">{t('copy')}</span>
                               </button>
                           </>
                       )}

                       {/* Edit Option: Author Only (Agora permite editar legendas também, se tiver texto) */}
                       {selectedMessageForAction.senderId === currentUser.id && !selectedMessageForAction.isDeleted && (selectedMessageForAction.text || !selectedMessageForAction.fileUrl) && (
                          <button onClick={() => { handleAction('edit'); setSelectedMessageForAction(null); }} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all w-full text-left">
                             <PencilIcon className="h-5 w-5 text-gray-500" />
                             <span className="font-black text-sm dark:text-white">{t('edit')}</span>
                          </button>
                       )}

                       {/* Delete Option: Author OR Group Admin */}
                       {(selectedMessageForAction.senderId === currentUser.id || (selectedChat.type === ChatType.GROUP && selectedChat.adminId === currentUser.id)) && (
                          <button onClick={() => { handleAction('delete'); setSelectedMessageForAction(null); }} className="flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all text-red-500 w-full text-left">
                             <TrashIcon className="h-5 w-5" />
                             <span className="font-black text-sm">{selectedMessageForAction.isDeleted ? t('remove_definitively') : t('delete')}</span>
                          </button>
                       )}
                    </div>
                 </div>
              </div>
            )}

          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white dark:bg-[#0a0c10]">
             <div className="w-32 h-32 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-200 dark:text-gray-700" />
             </div>
             <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">{t('select_conversation')}</h3>
             <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 max-w-xs mb-8">{t('select_conversation_desc')}</p>
             <button 
               onClick={() => onNavigate('create-group')}
               className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3"
             >
               <PlusIcon className="h-5 w-5 stroke-[3]" /> {t('chat_new_community_btn')}
             </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
      />

      <style>{`
        /* Custom animations for ChatPage */
        .animate-slide-up-full { 
          animation: slide-up-full 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        @keyframes slide-up-full { 
          from { transform: translateY(100%); } 
          to { transform: translateY(0); } 
        }
      `}</style>
    </div>
  );
};

export default ChatPage;
