import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Send, 
  Eye, 
  Loader2 
} from 'lucide-react';
import { GroupedStory, User, Message } from '../types';
import { 
  startPrivateChat, 
  sendMessage, 
  markStoryAsViewed, 
  generateUUID, 
  getUsers 
} from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';

interface StoryViewerModalProps {
  stories: GroupedStory[];
  initialIndex: number;
  onClose: () => void;
  currentUser: User;
}

const STORY_DURATION = 5000; // 5 seconds per story slide

const formatRelativeTime = (timestamp: number, t: any) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1) return t('now') || 'agora';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  onClose,
  currentUser
}) => {
  const { t } = useTranslation();
  const [userGroupIndex, setUserGroupIndex] = useState(initialIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [justViewedSent, setJustViewedSent] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load users to display viewers' details
  useEffect(() => {
    getUsers()
      .then(users => setAllUsers(users))
      .catch(err => console.error("Error loading users for story viewer:", err));
  }, []);

  const activeGroup = stories[userGroupIndex];
  const activeStory = activeGroup?.items[storyIndex];

  // Auto-advance loop
  useEffect(() => {
    if (!activeStory) return;
    if (isPaused) return;

    const intervalTime = 50; // Update progress every 50ms
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + (intervalTime / STORY_DURATION) * 100;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [userGroupIndex, storyIndex, isPaused, activeStory]);

  // Mark story as viewed by the currentUser
  useEffect(() => {
    if (!activeStory || !currentUser) return;
    
    // Check if it's not our own story, and we haven't read it yet, and haven't sent read receipt in this session
    const isOwnStory = activeStory.userId === currentUser.id;
    const charityCheck = activeStory.views || [];
    const alreadyViewed = charityCheck.includes(currentUser.id);
    
    if (!isOwnStory && !alreadyViewed && justViewedSent !== activeStory.id) {
      setJustViewedSent(activeStory.id);
      markStoryAsViewed(activeStory.id, currentUser.id).catch(err => {
        console.warn("Could not mark story as viewed:", err);
      });
    }
  }, [activeStory, currentUser, justViewedSent]);

  // Handlers
  const handleNext = () => {
    if (!activeGroup) return;
    
    // Reset view modal
    setShowViewers(false);
    
    if (storyIndex < activeGroup.items.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // Go to next user
      if (userGroupIndex < stories.length - 1) {
        setUserGroupIndex(prev => prev + 1);
        setStoryIndex(0);
        setProgress(0);
      } else {
        // Last story of last user, close viewer
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (!activeGroup) return;
    
    // Reset view modal
    setShowViewers(false);

    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
    } else {
      // Go to previous user
      if (userGroupIndex > 0) {
        const prevGroup = stories[userGroupIndex - 1];
        setUserGroupIndex(prev => prev - 1);
        setStoryIndex(prevGroup.items.length - 1);
        setProgress(0);
      } else {
        // First story of first user, just restart progress
        setProgress(0);
      }
    }
  };

  // Holding down pauses story
  const handleHoldStart = () => {
    setIsPaused(true);
  };

  const handleHoldEnd = () => {
    setIsPaused(false);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeStory) return;

    setIsSending(true);
    setIsPaused(true);

    try {
      const chatId = await startPrivateChat(currentUser.id, activeStory.userId);
      if (chatId) {
        let textContent = `Respondeu ao seu story: "${replyText.trim()}"`;
        if (activeStory.text) {
          textContent += `\n\n[Story: "${activeStory.text}"]`;
        }

        const msg: Message = {
          id: generateUUID(),
          senderId: currentUser.id,
          receiverId: activeStory.userId,
          timestamp: Date.now(),
          text: textContent,
          imageUrl: activeStory.imageUrl || undefined,
          isRead: false
        };

        await sendMessage(chatId, msg);
        setReplyText('');
      }
    } catch (err: any) {
      console.error("Error sending story reply:", err);
    } finally {
      setIsSending(false);
      setIsPaused(false);
    }
  };

  if (!activeGroup || !activeStory) {
    return null;
  }

  const isOwnStory = activeStory.userId === currentUser.id;

  // Resolve viewer profiles
  const viewerProfiles = (activeStory.views || []).map(vId => {
    const found = allUsers.find(u => u.id === vId);
    return found || {
      id: vId,
      firstName: t('user', 'Usuário'),
      lastName: '',
      profilePicture: DEFAULT_PROFILE_PIC
    };
  });

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 md:p-4 select-none touch-none animate-fade-in"
    >
      {/* Absolute Backdrop Close Trigger */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Main Container */}
      <div 
        className="relative w-full max-w-[480px] h-full md:h-[90vh] md:max-h-[850px] bg-neutral-950 md:rounded-[2.5rem] md:border md:border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between"
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onMouseLeave={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
      >
        {/* Navigation Overlays (Behind content, but in front of bg) */}
        <div className="absolute inset-0 z-10 flex">
          {/* Left Click Area for Prev */}
          <div 
            className="w-[30%] h-[calc(100%-80px)] cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          {/* Middle holding spot & Right tap zone */}
          <div 
            className="w-[70%] h-[calc(100%-80px)] cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* TOP COMPONENT: Progress bars + Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent">
          {/* Segmented Progress bar */}
          <div className="flex gap-1.5 mb-4">
            {activeGroup.items.map((item, idx) => {
              let barProgress = 0;
              if (idx < storyIndex) {
                barProgress = 100;
              } else if (idx === storyIndex) {
                barProgress = progress;
              }
              return (
                <div key={item.id} className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-75 ease-linear" 
                    style={{ width: `${barProgress}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Profile + Close Button */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3">
              <img 
                src={activeStory.userProfilePic || DEFAULT_PROFILE_PIC} 
                alt={activeStory.userName}
                className="w-10 h-10 rounded-full border border-white/20 object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="text-white font-bold text-sm tracking-tight leading-tight">
                  {activeStory.userName}
                </h4>
                <p className="text-white/60 text-xs">
                  {formatRelativeTime(activeStory.timestamp, t)}
                </p>
              </div>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all cursor-pointer backdrop-blur-sm"
              title={t('close', 'Fechar')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MIDDLE CONTENT: Text (Gradient BG) or Image */}
        <div className="flex-1 w-full h-full relative z-0 flex items-center justify-center">
          {activeStory.imageUrl ? (
            <div className="w-full h-full relative">
              <img 
                src={activeStory.imageUrl} 
                alt="" 
                className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-500 ${activeStory.filter || ''}`} 
                referrerPolicy="no-referrer"
              />
              {activeStory.text && (
                <div className="absolute bottom-28 left-4 right-4 z-20 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
                  <p className="text-white text-base text-center break-words font-medium leading-relaxed">
                    {activeStory.text}
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Text Story with background styled details
            <div className={`w-full h-full flex flex-col items-center justify-center px-8 text-center bg-gradient-to-br ${activeStory.backgroundColor || 'from-indigo-600 via-purple-600 to-pink-500'}`}>
              <p 
                style={{ fontFamily: activeStory.fontFamily ? `var(--${activeStory.fontFamily})` : 'inherit' }}
                className="text-white text-2xl md:text-3xl font-bold whitespace-pre-wrap break-words leading-relaxed drop-shadow-lg max-w-full"
              >
                {activeStory.text}
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Navigation buttons, view counts, or story reply */}
        <div className="relative z-30 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-4 pointer-events-auto">
          {/* If it's the owner's story, display viewers */}
          {isOwnStory ? (
            <div className="w-full flex justify-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                  setShowViewers(true);
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black uppercase tracking-wider py-2.5 px-5 rounded-full backdrop-blur-md border border-white/10 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>{activeStory.views?.length || 0} {t('views', 'Visualizações')}</span>
              </button>
            </div>
          ) : (
            // Reply Input Box
            <form onSubmit={handleSendReply} className="flex items-center gap-2 w-full bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/10">
              <input 
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                placeholder={t('comment_story_placeholder', 'Responda a este status...')}
                className="flex-1 bg-transparent border-none text-white text-sm py-2 px-3 focus:outline-none focus:ring-0 placeholder:text-white/50"
              />
              <button 
                type="submit" 
                disabled={isSending || !replyText.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          )}
        </div>

        {/* VIEWER LIST INTERACTIVE PANEL (MODAL DRAWDER OVERLAY) */}
        {showViewers && (
          <div 
            className="absolute inset-0 z-40 bg-black/95 flex flex-col justify-end animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clickable Area at top of list drawer to dismiss */}
            <div 
              className="absolute inset-x-0 top-0 h-[40%] cursor-pointer" 
              onClick={() => {
                setShowViewers(false);
                setIsPaused(false);
              }}
            />

            {/* List Body */}
            <div className="bg-neutral-900 border-t border-white/10 rounded-t-[2rem] w-full max-h-[60%] overflow-hidden flex flex-col p-6 z-50">
              {/* Handlebar */}
              <div 
                className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 cursor-pointer"
                onClick={() => {
                  setShowViewers(false);
                  setIsPaused(false);
                }}
              />

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400 animate-pulse" /> {t('viewed_by', 'Visto Por')} ({viewerProfiles.length})
                </h3>
                <button 
                  onClick={() => {
                    setShowViewers(false);
                    setIsPaused(false);
                  }}
                  className="p-1 px-3 text-xs bg-white/15 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all rounded-lg font-bold"
                >
                  {t('resume', 'Continuar')}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {viewerProfiles.length === 0 ? (
                  <div className="text-center py-8 text-white/40 text-xs font-semibold">
                    {t('no_views_yet', 'Ainda não há visualizações neste story')}
                  </div>
                ) : (
                  viewerProfiles.map((viewer) => (
                    <div key={viewer.id} className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <img 
                          src={viewer.profilePicture || DEFAULT_PROFILE_PIC} 
                          alt="" 
                          className="w-10 h-10 rounded-full border border-white/10 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-white text-sm font-bold truncate">
                            {viewer.firstName} {viewer.lastName}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewerModal;
