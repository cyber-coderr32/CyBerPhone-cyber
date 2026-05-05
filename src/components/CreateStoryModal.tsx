
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { addStory, uploadFile } from '../services/storageService';
import { XMarkIcon, SparklesIcon, ArrowUpTrayIcon, CheckCircleIcon, PhotoIcon } from '@heroicons/react/24/solid';
import { checkContent } from '../services/sentinelService';

interface CreateStoryModalProps {
  currentUser: User;
  onClose: () => void;
  onStoryCreated: () => void;
}

const BG_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-red-500', 'bg-green-500', 
  'bg-orange-500', 'bg-pink-600', 'bg-black', 'bg-indigo-700',
  'bg-gradient-to-br from-blue-400 to-purple-600',
  'bg-gradient-to-br from-yellow-400 to-red-500'
];

const FONTS = [
  { id: 'font-sans', label: 'Moderna' },
  { id: 'font-serif', label: 'Clássica' },
  { id: 'font-mono', label: 'Código' },
  { id: 'font-bebas', label: 'Impacto' }
];

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ currentUser, onClose, onStoryCreated }) => {
  const [mode, setMode] = useState<'image' | 'text'>('image');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [textColor, setTextColor] = useState('text-white');
  const [fontFamily, setFontFamily] = useState('font-sans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');

    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'image' && !selectedFile) return;
    if (mode === 'text' && !textContent.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      let finalImageUrl = '';
      let finalText = '';
      
      if (mode === 'text' && textContent.trim()) {
        const sentinelResult = await checkContent(textContent.trim(), 'story');
        if (!sentinelResult.isSafe) {
          setError(sentinelResult.reason || 'Sua mensagem foi bloqueada pelo Sentinela AI por motivos de segurança.');
          setLoading(false);
          return;
        }
      }

      if (mode === 'image' && selectedFile) {
         finalImageUrl = await uploadFile(selectedFile, 'stories');
      } else if (mode === 'text') {
         finalText = textContent;
      }

      await addStory(currentUser.id, { 
        imageUrl: finalImageUrl || '',
        text: finalText || '', 
        backgroundColor: mode === 'text' ? bgColor : '', 
        textColor: mode === 'text' ? textColor : '',
        fontFamily: mode === 'text' ? fontFamily : ''
      }, `${currentUser.firstName} ${currentUser.lastName}`, currentUser.profilePicture || '');
      
      onStoryCreated();
      onClose();
    } catch (err: any) {
      console.error("Erro no submit do Story:", err);
      setError(err.message || 'Erro ao publicar story. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
       <div className="bg-white dark:bg-darkcard w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative border border-white/10 overflow-y-auto max-h-[95vh] no-scrollbar">
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-10">
             <XMarkIcon className="h-6 w-6" />
          </button>

          <div className="text-center mb-6">
             <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Novo History</h3>
             <div className="flex justify-center gap-2 mt-4 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit mx-auto">
                <button 
                  type="button"
                  onClick={() => setMode('image')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'image' ? 'bg-white dark:bg-darkcard text-blue-600 shadow-sm' : 'text-gray-400'}`}
                >
                  Mídia
                </button>
                <button 
                  type="button"
                  onClick={() => setMode('text')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'text' ? 'bg-white dark:bg-darkcard text-blue-600 shadow-sm' : 'text-gray-400'}`}
                >
                  Texto
                </button>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
             {mode === 'image' ? (
                <div className="space-y-2">
                   <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                   {!selectedImage ? (
                     <div 
                       onClick={triggerFileInput}
                       className="w-full h-80 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group"
                     >
                        <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-full group-hover:scale-110 transition-transform">
                           <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 group-hover:text-blue-600" />
                        </div>
                        <div className="text-center px-4">
                           <p className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-tighter">Carregar Foto</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Sua aula ou momento em imagem</p>
                        </div>
                     </div>
                   ) : (
                     <div className="relative rounded-[2rem] overflow-hidden border-2 border-blue-500 shadow-2xl h-96 group">
                       <img src={selectedImage} className="w-full h-full object-cover" alt="Preview" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={triggerFileInput} className="bg-white text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">Trocar Foto</button>
                       </div>
                     </div>
                   )}
                </div>
             ) : (
                <div className="space-y-6 animate-fade-in">
                   <div className={`w-full h-96 rounded-[2rem] shadow-2xl p-8 flex flex-col items-center justify-center text-center relative transition-colors duration-500 ${bgColor}`}>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Escreva sua mensagem aqui..."
                        className={`bg-transparent w-full text-center outline-none resize-none placeholder:text-white/40 font-black leading-tight ${textColor} ${fontFamily} ${textContent.length > 50 ? 'text-2xl' : 'text-4xl'}`}
                        rows={6}
                      />
                   </div>

                   <div className="space-y-4">
                      <div>
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Cor de Fundo</label>
                         <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {BG_COLORS.map(color => (
                               <button 
                                 key={color} 
                                 type="button"
                                 onClick={() => setBgColor(color)}
                                 className={`w-8 h-8 rounded-full flex-shrink-0 border-2 transition-all ${color} ${bgColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                               />
                            ))}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Cor do Texto</label>
                            <div className="flex gap-2">
                               <button type="button" onClick={() => setTextColor('text-white')} className={`w-10 h-10 rounded-xl bg-white border-2 ${textColor === 'text-white' ? 'border-blue-600' : 'border-gray-100'}`}></button>
                               <button type="button" onClick={() => setTextColor('text-black')} className={`w-10 h-10 rounded-xl bg-black border-2 ${textColor === 'text-black' ? 'border-blue-600' : 'border-white/10'}`}></button>
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Tipografia</label>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                               {FONTS.map(f => (
                                 <button 
                                   key={f.id} 
                                   type="button" 
                                   onClick={() => setFontFamily(f.id)}
                                   className={`px-3 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${fontFamily === f.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 dark:bg-white/5 text-gray-500 border-transparent'}`}
                                 >
                                   {f.label}
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {error && <p className="text-red-500 text-[10px] font-black uppercase text-center bg-red-50 p-2 rounded-xl border border-red-100">{error}</p>}

             <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={loading || (mode === 'image' && !selectedFile) || (mode === 'text' && !textContent.trim())}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-30 transition-all flex items-center justify-center"
                >
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <>Publicar Story</>}
                </button>
             </div>
          </form>
       </div>
    </div>
  );
};

export default CreateStoryModal;
