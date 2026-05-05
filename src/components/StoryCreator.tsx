import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CameraIcon, PencilIcon, CheckIcon, Bars3BottomLeftIcon, Bars3Icon, Bars3BottomRightIcon, SwatchIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { User, Story } from '../types';
import { addStory, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../services/storageService';
import { safeJsonStringify } from '../lib/utils';
import { useDialog } from '../services/DialogContext';

interface StoryCreatorProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const BG_COLORS = [
  'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500',
  'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700',
  'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700',
  'bg-gradient-to-br from-orange-500 via-red-600 to-pink-700',
  'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600',
  'bg-black',
  'bg-zinc-900',
  'bg-blue-600',
  'bg-rose-600'
];

const FONTS = [
  { id: 'font-sans', name: 'Sans', class: 'font-sans' },
  { id: 'font-serif', name: 'Serif', class: 'font-serif' },
  { id: 'font-mono', name: 'Mono', class: 'font-mono' },
  { id: 'font-display', name: 'Bold', class: 'font-black uppercase tracking-tighter' },
];

const FILTERS = [
  { name: 'Normal', class: '' },
  { name: 'P&B', class: 'grayscale' },
  { name: 'Sépia', class: 'sepia' },
  { name: 'Vibrante', class: 'saturate-200' },
  { name: 'Frio', class: 'hue-rotate-180' },
];

const StoryCreator: React.FC<StoryCreatorProps> = ({ currentUser, onClose, onSuccess }) => {
  const { showAlert, showConfirm, showError } = useDialog();
  const [mode, setMode] = useState<'selection' | 'text' | 'image'>('selection');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [font, setFont] = useState(FONTS[0]);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [textStyle, setTextStyle] = useState<'none' | 'tinted' | 'solid'>('none');
  const [image, setImage] = useState<string | null>(null);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleClose = async () => {
    if (text.trim() || image) {
      const confirmed = await showConfirm('Descartar alterações?');
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setImage(data.secure_url);
      setMode('image');
    } catch (error) {
      console.error('Error uploading to Cloudinary:', safeJsonStringify(error));
      showError('Erro ao carregar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'image' && !image) return;

    setUploading(true);
    try {
      const storyData: Partial<Story> = {
        text: text.trim() || undefined,
        backgroundColor: mode === 'text' ? bgColor : undefined,
        fontFamily: mode === 'text' ? `${font.class} text-${alignment} ${textStyle === 'solid' ? 'bg-white !text-black p-2 rounded-lg' : textStyle === 'tinted' ? 'bg-black/30 p-2 rounded-lg' : ''}` : undefined,
        imageUrl: mode === 'image' ? image! : undefined,
        filter: mode === 'image' ? filter.class : undefined,
      };

      // Note: We're passing the filter as part of the image URL if possible, 
      // but since it's a CSS filter, we'd ideally need to process it.
      // For now, we'll just store the filter class in a custom property if the type supports it,
      // or just apply it in the viewer.
      
      await addStory(currentUser.id, storyData, `${currentUser.firstName} ${currentUser.lastName}`, currentUser.profilePicture || '');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error publishing story:', safeJsonStringify(error));
      showError('Erro ao publicar status.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className={`absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[120px] ${bgColor}`} />
        <div className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[120px] bg-blue-600" />
      </div>

      <div className="w-full h-full md:h-auto md:max-w-md md:aspect-[9/16] md:rounded-[3rem] overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border-8 border-zinc-900 bg-black flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
          <button 
            onClick={mode === 'selection' ? handleClose : () => setMode('selection')} 
            className="text-white bg-white/10 backdrop-blur-md hover:bg-white/20 p-3 rounded-2xl transition-all active:scale-90"
          >
            {mode === 'selection' ? <XMarkIcon className="h-6 w-6" /> : <PencilIcon className="h-6 w-6" />}
          </button>

          <div className="flex items-center gap-2">
            {mode === 'text' && (
              <>
                <button 
                  onClick={() => setAlignment(a => a === 'center' ? 'left' : a === 'left' ? 'right' : 'center')}
                  className="text-white bg-white/10 backdrop-blur-md hover:bg-white/20 p-3 rounded-2xl transition-all shadow-lg border border-white/5"
                  title="Alinhamento"
                >
                  {alignment === 'left' ? <Bars3BottomLeftIcon className="h-6 w-6" /> : alignment === 'right' ? <Bars3BottomRightIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                </button>
                <button 
                  onClick={() => setTextStyle(s => s === 'none' ? 'tinted' : s === 'tinted' ? 'solid' : 'none')}
                  className="text-white bg-white/10 backdrop-blur-md hover:bg-white/20 p-3 rounded-2xl transition-all shadow-lg border border-white/5"
                  title="Estilo do Texto"
                >
                  <SwatchIcon className="h-6 w-6" />
                </button>
              </>
            )}
            
            {mode === 'image' && (
              <button 
                onClick={() => {
                  const nextIdx = (FILTERS.indexOf(filter) + 1) % FILTERS.length;
                  setFilter(FILTERS[nextIdx]);
                }}
                className="text-white bg-white/10 backdrop-blur-md hover:bg-white/20 p-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg border border-white/5"
              >
                <SparklesIcon className="h-6 w-6 text-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">{filter.name}</span>
              </button>
            )}

            {mode !== 'selection' && (
              <button
                onClick={handlePublish}
                disabled={uploading || (mode === 'text' && !text.trim())}
                className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600 hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2 border border-emerald-400/20"
              >
                {uploading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Publicar <CheckIcon className="h-5 w-5" /></>
                )}
              </button>
            )}
          </div>
        </div>

        {mode === 'selection' && (
          <div 
            className="h-full flex flex-col items-center justify-center gap-12 p-8 bg-[#0a0c10] relative"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
            
            <div className="text-center space-y-3 relative z-10">
              <div className="inline-block bg-blue-600/10 text-blue-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4 border border-blue-500/20">
                Status Creator
              </div>
              <h2 className="text-white text-5xl font-black uppercase tracking-tighter leading-none">Novo<br/>Status</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">O que você está pensando agora?</p>
            </div>

            <div className="grid grid-cols-1 gap-5 w-full relative z-10">
              <button 
                onClick={() => setMode('text')}
                className="flex items-center gap-6 p-6 bg-zinc-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 hover:bg-zinc-800/80 hover:border-blue-500/30 transition-all group relative overflow-hidden shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-5 bg-blue-600 rounded-[1.5rem] relative z-10 shadow-[0_10px_20px_rgba(37,99,235,0.3)] group-hover:scale-110 transition-transform">
                  <PencilIcon className="h-8 w-8 text-white" />
                </div>
                <div className="text-left relative z-10">
                  <span className="text-white font-black text-xl uppercase block tracking-tight">Texto</span>
                  <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Escreva algo incrível</span>
                </div>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-6 p-6 bg-zinc-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 hover:bg-zinc-800/80 hover:border-emerald-500/30 transition-all group relative overflow-hidden shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-5 bg-emerald-600 rounded-[1.5rem] relative z-10 shadow-[0_10px_20px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform">
                  <CameraIcon className="h-8 w-8 text-white" />
                </div>
                <div className="text-left relative z-10">
                  <span className="text-white font-black text-xl uppercase block tracking-tight">Câmera</span>
                  <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Compartilhe uma foto</span>
                </div>
              </button>
            </div>

            <button 
              onClick={handleClose}
              className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors mt-4"
            >
              Cancelar
            </button>

            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>
        )}

        {mode === 'text' && (
          <div 
            className={`h-full ${bgColor} flex flex-col items-center justify-center p-8 relative transition-colors duration-700`}
          >
            <textarea
              ref={textareaRef}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              placeholder="Digite seu status..."
              className={`w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-white/40 resize-none leading-tight drop-shadow-xl transition-all duration-300 ${font.class} ${text.length > 100 ? 'text-2xl' : 'text-4xl'} ${alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left'} ${textStyle === 'solid' ? 'bg-white !text-black p-4 rounded-2xl' : textStyle === 'tinted' ? 'bg-black/30 p-4 rounded-2xl' : ''}`}
              rows={1}
            />
            
            <div className="absolute bottom-32 left-0 right-0 flex flex-col gap-6 items-center px-6">
              {/* Font Selector */}
              <div className="flex gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFont(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${font.id === f.id ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              {/* Color Selector */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar w-full justify-center pb-2">
                {BG_COLORS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setBgColor(bg)}
                    className={`w-10 h-10 rounded-full border-4 flex-shrink-0 transition-all hover:scale-110 ${bgColor === bg ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'} ${bg}`}
                  />
                ))}
              </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${text.length > 250 ? 'text-red-400' : 'text-white/40'}`}>
                {text.length} / 280
              </span>
            </div>
          </div>
        )}

        {mode === 'image' && image && (
          <div 
            className="h-full bg-black flex flex-col relative"
          >
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img src={image} className={`w-full h-full object-contain transition-all duration-500 ${filter.class}`} alt="Preview" />
            </div>
            
            <div className="p-6 pb-24 bg-gradient-to-t from-black to-transparent absolute bottom-0 left-0 right-0">
              <input 
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Adicione uma legenda..."
                className="w-full bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/40 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryCreator;
