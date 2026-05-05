
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Post, PostType, User } from '../types';
import { addPost, updatePost, uploadFile, generateUUID, getPostById } from '../services/storageService';
import { safeJsonStringify } from '../lib/utils';
import { useDialog } from '../services/DialogContext';
import { 
  PhotoIcon, 
  XMarkIcon, 
  PaperAirplaneIcon, 
  LockClosedIcon, 
  LockOpenIcon, 
  VideoCameraIcon,
  PaintBrushIcon,
  SwatchIcon,
  SignalIcon,
  FilmIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/solid';
import { checkContent } from '../services/sentinelService';

const FONTS = [
  { id: 'font-sans', label: 'Sans' },
  { id: 'font-bebas', label: 'Bebas' },
  { id: 'font-montserrat', label: 'Montserrat' },
  { id: 'font-oswald', label: 'Oswald' },
  { id: 'font-playfair', label: 'Playfair' },
  { id: 'font-mono', label: 'Mono' },
  { id: 'font-pacifico', label: 'Pacifico' },
  { id: 'font-caveat', label: 'Caveat' },
  { id: 'font-lobster', label: 'Lobster' },
  { id: 'font-abril', label: 'Abril' },
  { id: 'font-righteous', label: 'Righteous' },
  { id: 'font-marker', label: 'Marker' },
  { id: 'font-special', label: 'Special' },
  { id: 'font-cinzel', label: 'Cinzel' },
  { id: 'font-dancing', label: 'Dancing' },
  { id: 'font-fredoka', label: 'Fredoka' },
  { id: 'font-press', label: 'Retro' },
  { id: 'font-satisfy', label: 'Satisfy' },
  { id: 'font-gothic', label: 'Gothic' },
  { id: 'font-zilla', label: 'Zilla' },
  { id: 'font-inline', label: 'Inline' },
  { id: 'font-bungee', label: 'Bungee' },
  { id: 'font-monoton', label: 'Monoton' },
  { id: 'font-vibes', label: 'Vibes' },
  { id: 'font-indie', label: 'Indie' },
  { id: 'font-shadows', label: 'Shadows' },
  { id: 'font-amatic', label: 'Amatic' },
  { id: 'font-alex', label: 'Alex' },
  { id: 'font-allura', label: 'Allura' }
];

const COLORS = [
  'text-white', 'text-blue-500', 'text-green-500', 'text-red-500', 
  'text-yellow-500', 'text-purple-500', 'text-pink-500', 'text-black'
];

const BG_COLORS = [
  'bg-transparent', 'bg-blue-600', 'bg-purple-600', 'bg-red-500', 
  'bg-green-500', 'bg-orange-500', 'bg-pink-600', 'bg-black', 'bg-white'
];

interface CreatePostProps {
  currentUser: User;
  onPostCreated: () => void;
  refreshUser: () => void;
  postId?: string;
}

const CreatePost: React.FC<CreatePostProps> = ({ currentUser, onPostCreated, refreshUser, postId }) => {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(!!postId);
  const [postType, setPostType] = useState<PostType>(PostType.TEXT);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fontFamily, setFontFamily] = useState('font-sans');
  const [textColor, setTextColor] = useState('text-white');
  const [backgroundColor, setBackgroundColor] = useState('bg-transparent');
  const [disableComments, setDisableComments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingPost, setExistingPost] = useState<Post | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  React.useEffect(() => {
    if (postId) {
      getPostById(postId).then(p => {
        if (p) {
          setExistingPost(p);
          setContent(p.content || '');
          setImageUrl(p.imageUrl || '');
          setPostType(p.type);
          setDisableComments(p.disableComments || false);
          if (p.fontFamily) setFontFamily(p.fontFamily);
          if (p.textColor) setTextColor(p.textColor);
          if (p.backgroundColor) setBackgroundColor(p.backgroundColor);
          if (p.isAnonymous !== undefined) setIsAnonymous(p.isAnonymous);
          if (p.reel?.coverImageUrl) setCoverUrl(p.reel.coverImageUrl);
          if (p.reel?.videoUrl) setVideoUrl(p.reel.videoUrl);
        }
      });
    }
  }, [postId]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPostInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setPostType(PostType.IMAGE);
      setVideoFile(null);
      setVideoUrl('');
      setCoverFile(null);
      setCoverUrl('');
    }
  };

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>, type: PostType) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setPostType(type);
      setImageFile(null);
      setImageUrl('');
    }
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !videoFile && postType !== PostType.LIVE) return;

    setLoading(true);
    try {
      // Sentinel AI Check
      if (content.trim()) {
        const sentinelResult = await checkContent(content, 'post');
        if (!sentinelResult.isSafe) {
          throw new Error(`SENTINEL_BLOCK: ${sentinelResult.reason || 'Conteúdo inadequado detectado.'}`);
        }
      }

      let finalImageUrl = '';
      let finalVideoUrl = '';
      let finalCoverUrl = '';

      if (imageFile) {
        finalImageUrl = await uploadFile(imageFile, 'posts');
      }
      if (videoFile) {
        finalVideoUrl = await uploadFile(videoFile, 'reels');
      }
      if (coverFile) {
        finalCoverUrl = await uploadFile(coverFile, 'covers');
      }

      if (postId && existingPost) {
        const updatedPost: Post = {
          ...existingPost,
          content: content,
          imageUrl: finalImageUrl || existingPost.imageUrl,
          type: postType,
          disableComments: disableComments,
          fontFamily,
          textColor,
          backgroundColor,
          isAnonymous,
          tags: ['SOCIAL']
        };
        if (postType === PostType.REEL || postType === PostType.VIDEO) {
           if (finalVideoUrl || existingPost.reel) {
              updatedPost.reel = { 
                 videoUrl: finalVideoUrl || existingPost.reel!.videoUrl, 
                 coverImageUrl: finalCoverUrl || existingPost.reel?.coverImageUrl,
                 description: content 
              };
           } else {
              throw new Error(t('select_video'));
           }
        }
        await updatePost(updatedPost);
      } else {
        if (postType === PostType.REEL && !videoFile) {
          throw new Error(t('select_video_reel'));
        }

        const newPost: Post = {
          id: generateUUID(),
          userId: currentUser.id,
          authorName: `${currentUser.firstName} ${currentUser.lastName}`,
          authorProfilePic: currentUser.profilePicture,
          type: postType,
          timestamp: Date.now(),
          content: content,
          imageUrl: finalImageUrl,
          likes: [],
          comments: [],
          shares: [],
          saves: [],
          disableComments: disableComments,
          fontFamily,
          textColor,
          backgroundColor,
          isAnonymous,
          tags: ['SOCIAL']
        };

        if (postType === PostType.REEL || postType === PostType.VIDEO) {
           if (!finalVideoUrl) throw new Error(t('video_process_error'));
           newPost.reel = { 
             videoUrl: finalVideoUrl, 
             coverImageUrl: finalCoverUrl,
             description: content 
           };
        }

        if (postType === PostType.LIVE) {
           newPost.liveStream = {
              title: content || t('starting_live'),
              description: content,
              status: 'LIVE'
           };
        }

        await addPost(newPost);
      }
      setContent(''); setImageUrl(''); setImageFile(null); setVideoUrl(''); setVideoFile(null); setCoverUrl(''); setCoverFile(null);
      setIsExpanded(false);
      onPostCreated();
    } catch (err: any) {
      console.error("Erro ao publicar:", safeJsonStringify(err));
      if (err.message?.includes('SENTINEL_BLOCK')) {
        showAlert(err.message.replace('SENTINEL_BLOCK: ', ''), { type: 'error', title: 'Sentinela de Segurança' });
      } else {
        showAlert(err.message || t('publish_error'), { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="bg-white dark:bg-darkcard md:rounded-[1.5rem] p-6 border border-gray-200 dark:border-white/5 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-all animate-fade-in" onClick={() => setIsExpanded(true)}>
        <img src={currentUser.profilePicture} className="w-12 h-12 rounded-2xl object-cover" />
        <div className="flex-1 text-gray-500 dark:text-gray-400 font-bold text-sm">
          {t('what_thinking')}
        </div>
        <div className="flex gap-2">
            <PhotoIcon className="h-6 w-6 text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-darkcard md:rounded-[1.5rem] p-8 border border-gray-200 dark:border-white/5 shadow-2xl animate-fade-in relative z-50">
       <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <img src={currentUser.profilePicture} className="w-10 h-10 rounded-xl object-cover" />
             <div>
                <p className="text-sm font-black text-gray-900 dark:text-white leading-none">{currentUser.firstName}</p>
                <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">{t('member')}</p>
             </div>
          </div>
          <button onClick={() => setIsExpanded(false)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><XMarkIcon className="h-6 w-6"/></button>
       </div>

        <form onSubmit={handleSubmit} className="space-y-6">
           <div key={fontFamily} className={`rounded-[2rem] p-5 transition-all duration-500 ease-in-out ${backgroundColor} ${fontFamily} ${backgroundColor !== 'bg-transparent' ? 'shadow-inner scale-[1.02]' : ''} animate-fade-in`}>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              autoFocus
              style={{ fontFamily: `var(--${fontFamily})` }}
              className={`w-full bg-transparent outline-none border-none ring-0 resize-none text-lg min-h-[120px] placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all duration-300 rounded-[2rem] p-1 ${textColor === 'text-white' && backgroundColor === 'bg-white' ? 'text-gray-900' : (backgroundColor === 'bg-transparent' ? 'text-gray-900 dark:text-white' : textColor)}`}
              placeholder={t('say_something')}
              onFocus={(e) => {
                const val = e.target.value;
                e.target.value = '';
                e.target.value = val;
              }}
            />
          </div>

          {imageUrl && (
            <div className="relative rounded-3xl overflow-hidden group">
               <img src={imageUrl} className="w-full h-64 object-cover" />
               <button type="button" onClick={() => {setImageUrl(''); setImageFile(null);}} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white"><XMarkIcon className="h-5 w-5"/></button>
            </div>
          )}

          {videoUrl && (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden group bg-black">
                 <video src={videoUrl} className="w-full h-64 object-contain" controls />
                 <button type="button" onClick={() => {setVideoUrl(''); setVideoFile(null); setCoverUrl(''); setCoverFile(null);}} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"><XMarkIcon className="h-5 w-5"/></button>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                 {coverUrl ? (
                    <div className="relative w-20 h-28 rounded-xl overflow-hidden shadow-md shrink-0">
                       <img src={coverUrl} className="w-full h-full object-cover" />
                       <button type="button" onClick={() => {setCoverUrl(''); setCoverFile(null);}} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white">
                          <XMarkIcon className="h-3 w-3" />
                       </button>
                    </div>
                 ) : (
                    <button 
                      type="button" 
                      onClick={() => coverInputRef.current?.click()}
                      className="w-20 h-28 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white dark:hover:bg-white/5 transition-all group shrink-0"
                    >
                       <PhotoIcon className="h-6 w-6 text-gray-400 group-hover:text-blue-500" />
                       <span className="text-[7px] font-black uppercase text-gray-400">Capa</span>
                    </button>
                 )}
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase mb-1">Capa do Vídeo</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">Recomendamos uma imagem vertical para melhor destaque no feed.</p>
                 </div>
                 <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverFile} />
              </div>
            </div>
          )}

          {/* Text Styling Controls */}
          <div className="flex flex-col gap-6 bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-inner">
             <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-transparent">
                      <PaintBrushIcon className="h-4 w-4 text-gray-400" />
                   </div>
                   <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none pb-1">
                      {BG_COLORS.map(c => (
                         <button 
                            key={c} 
                            type="button" 
                            onClick={() => setBackgroundColor(c)} 
                            className={`w-7 h-7 rounded-full border-2 transform active:scale-95 transition-all cursor-pointer ${c === 'bg-white' ? 'bg-white' : (c === 'bg-black' ? 'bg-black border-white/20' : c)} ${backgroundColor === c ? 'border-blue-500 scale-110 shadow-lg ring-2 ring-blue-500/20' : 'border-white/10 hover:border-white/30'}`} 
                         />
                      ))}
                   </div>
                </div>

                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-transparent">
                      <SwatchIcon className="h-4 w-4 text-gray-400" />
                   </div>
                   <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none pb-1">
                      {COLORS.map(c => (
                         <button 
                            key={c} 
                            type="button" 
                            onClick={() => setTextColor(c)} 
                            className={`w-7 h-7 rounded-full border-2 transform active:scale-95 transition-all cursor-pointer ${c.replace('text-', 'bg-')} ${textColor === c ? 'border-blue-500 scale-110 shadow-lg ring-2 ring-blue-500/20' : 'border-white/10 hover:border-white/30'}`} 
                         />
                      ))}
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t('typography') || 'Tipografia'}</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                   {FONTS.map(f => (
                      <button 
                        key={f.id} 
                        type="button" 
                        onClick={(e) => {
                           e.stopPropagation();
                           setFontFamily(f.id);
                        }} 
                        style={{ fontFamily: `var(--${f.id})` }}
                        className={`px-5 py-3 rounded-xl text-base border transition-all whitespace-nowrap transform active:scale-95 hover:scale-105 flex flex-col items-center gap-1 ${fontFamily === f.id ? 'bg-brand text-white border-brand shadow-xl shadow-brand/40 z-10 scale-105' : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                      >
                         <span>{f.label}</span>
                         {fontFamily === f.id && <div className="w-1 h-1 bg-white rounded-full animate-ping" />}
                      </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-white/5">
             <div className="flex gap-4">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-500 transition-all font-black text-[10px] uppercase">
                   <PhotoIcon className="h-6 w-6" /> {t('photo')}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />

                <button type="button" onClick={() => videoInputRef.current?.click()} className={`flex items-center gap-2 transition-all font-black text-[10px] uppercase ${postType === PostType.REEL ? 'text-purple-500' : 'text-gray-500 dark:text-gray-400 hover:text-purple-500'}`}>
                   <VideoCameraIcon className="h-6 w-6" /> {t('reel')}
                </button>
                <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={e => handleVideoFile(e, PostType.REEL)} />

                <button type="button" onClick={() => videoPostInputRef.current?.click()} className={`flex items-center gap-2 transition-all font-black text-[10px] uppercase ${postType === PostType.VIDEO ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'}`}>
                   <FilmIcon className="h-6 w-6" /> {t('video')}
                </button>
                <input type="file" ref={videoPostInputRef} className="hidden" accept="video/*" onChange={e => handleVideoFile(e, PostType.VIDEO)} />
                
                <button type="button" onClick={() => {setPostType(PostType.LIVE); setContent(t('starting_live'));}} className={`flex items-center gap-2 transition-all font-black text-[10px] uppercase ${postType === PostType.LIVE ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-400'}`}>
                  <span className="flex items-center gap-2 uppercase"><SignalIcon className="h-6 w-6" /> {t('live')}</span>
                </button>
             </div>

             <div className="flex items-center gap-3">
                <button 
                   type="button" 
                   onClick={() => setIsAnonymous(!isAnonymous)} 
                   className={`p-3 rounded-2xl transition-all ${isAnonymous ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                   title={t('post_anonymous')}
                >
                   {isAnonymous ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
                <button type="button" onClick={() => setDisableComments(!disableComments)} className={`p-3 rounded-2xl transition-all ${disableComments ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`} title={t('block_comments')}>
                  {disableComments ? <LockClosedIcon className="h-5 w-5" /> : <LockOpenIcon className="h-5 w-5" />}
                </button>
                <button 
                   type="submit" 
                   disabled={loading || (!content.trim() && !imageFile && !videoFile && postType !== PostType.LIVE)}
                   className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                   {loading ? t('sending') : <><PaperAirplaneIcon className="h-4 w-4 -rotate-45" /> {t('publish')}</>}
                </button>
             </div>
          </div>
       </form>
    </div>
  );
};

export default CreatePost;

