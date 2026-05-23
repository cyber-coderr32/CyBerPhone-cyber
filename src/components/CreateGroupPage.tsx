import React, { useState, useEffect } from 'react';
import { User, GroupTheme, Page } from '../types';
import { getUsers, createGroup, getGlobalSettings } from '../services/storageService';
import { 
  ArrowLeftIcon, 
  CameraIcon, 
  CheckBadgeIcon, 
  UserGroupIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlusIcon,
  PaintBrushIcon,
  InformationCircleIcon,
  LockClosedIcon,
  GlobeAmericasIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';

interface CreateGroupPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

const THEME_OPTIONS: { id: GroupTheme, color: string }[] = [
  { id: 'blue', color: 'bg-blue-600' },
  { id: 'green', color: 'bg-emerald-600' },
  { id: 'black', color: 'bg-zinc-900' },
  { id: 'orange', color: 'bg-orange-600' },
  { id: 'purple', color: 'bg-purple-600' },
  { id: 'red', color: 'bg-red-600' },
  { id: 'teal', color: 'bg-teal-600' },
  { id: 'pink', color: 'bg-pink-600' },
  { id: 'indigo', color: 'bg-indigo-600' },
  { id: 'cyan', color: 'bg-cyan-600' }
];

const CreateGroupPage: React.FC<CreateGroupPageProps> = ({ currentUser, onNavigate }) => {
  const { showAlert, showSuccess } = useDialog();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<GroupTheme>('blue');
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creationFee, setCreationFee] = useState<number | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      const users = await getUsers(currentUser);
      setAllUsers(users);
    };
    loadUsers();
  }, [currentUser]);

  useEffect(() => {
    const fetchFee = async () => {
      try {
        const settings = await getGlobalSettings();
        setCreationFee(settings.groupCreationFee ?? 5);
      } catch (e) {
        console.error('Error loading community creation fee:', e);
        setCreationFee(5);
      }
    };
    fetchFee();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showAlert('Por favor, defina um nome para a comunidade.', { type: 'alert' });
      return;
    }

    setLoading(true);
    try {
      // Use key/Set to ensure the user isn't duplicated
      const members = Array.from(new Set([currentUser.id, ...selectedUsers]));
      const chatId = await createGroup(name, members, currentUser.id, description, theme, imageFile || undefined, isPublic);
      
      if (chatId) {
        showSuccess('Comunidade criada com sucesso!', { title: 'Tudo Pronto!' });
        onNavigate('chat', { chatId });
      } else {
        showAlert('Erro ao criar o grupo. Verifique sua conexão.', { type: 'error' });
      }
    } catch (error: any) {
      console.error("Erro detalhado ao criar comunidade:", error);
      const msg = error?.message || '';
      if (msg.includes('SALDO_INSUFICIENTE|')) {
        const readableMsg = msg.split('|')[1];
        showAlert(readableMsg, { type: 'error' });
      } else if (msg) {
        showAlert(msg, { type: 'error' });
      } else {
        showAlert('Falha inesperada ao criar comunidade. Verifique sua conexão ou saldo.', { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-10 animate-fade-in pb-32">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => onNavigate('chat')} className="p-3 bg-white dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm">
          <ArrowLeftIcon className="h-5 w-5 dark:text-white" />
        </button>
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Nova Comunidade</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Organize papos e projetos em um lugar só</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side: Image & Theme */}
        <div className="md:col-span-1 space-y-8">
           <div className="relative group mx-auto md:mx-0 w-32 h-32 md:w-full md:aspect-square">
              <div className={`w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-white/5 shadow-2xl relative ${!imagePreview ? 'bg-gray-100 dark:bg-white/5' : ''}`}>
                 {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                       <UserGroupIcon className="h-10 w-10 mb-2 opacity-20" />
                       <span className="text-[8px] font-black uppercase tracking-widest opacity-40 text-center px-4">Foto do Grupo</span>
                    </div>
                 )}
                 <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <CameraIcon className="h-8 w-8 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                 </label>
              </div>
           </div>

           <div className="bg-white dark:bg-white/5 p-6 rounded-[2.5rem] shadow-xl border border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2 mb-6">
                 <PaintBrushIcon className="h-4 w-4 text-blue-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Identidade Visual</span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                 {THEME_OPTIONS.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setTheme(t.id)}
                      className={`w-full aspect-square rounded-xl transition-all ${t.color} ${theme === t.id ? ' ring-4 ring-offset-4 ring-blue-500 dark:ring-offset-[#0a0c10]' : 'opacity-40 hover:opacity-100 scale-90'}`}
                    />
                 ))}
              </div>
           </div>
        </div>

        {/* Right Side: Info & Members */}
        <div className="md:col-span-2 space-y-8">
           <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] shadow-xl border border-black/5 dark:border-white/10 space-y-6">
              <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Nome da Comunidade</label>
                 <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Ex: Amigos da CyBerPhone" 
                    className="w-full bg-gray-50 dark:bg-white/5 p-5 rounded-[1.8rem] outline-none font-bold text-lg dark:text-white border-2 border-transparent focus:border-blue-500/50 transition-all"
                 />
              </div>

              <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Descrição (Opcional)</label>
                 <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Sobre o que é este grupo?" 
                    className="w-full bg-gray-50 dark:bg-white/5 p-5 rounded-[1.8rem] outline-none font-bold dark:text-white border-2 border-transparent focus:border-blue-500/50 transition-all resize-none h-32"
                 />
              </div>

              <div className="flex bg-gray-100 dark:bg-black/20 p-2 rounded-2xl">
                 <button 
                   onClick={() => setIsPublic(true)}
                   className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${isPublic ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-gray-400'}`}
                 >
                    <GlobeAmericasIcon className="h-4 w-4" /> Público
                 </button>
                 <button 
                   onClick={() => setIsPublic(false)}
                   className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${!isPublic ? 'bg-white dark:bg-white/10 text-orange-600 shadow-sm' : 'text-gray-400'}`}
                 >
                    <LockClosedIcon className="h-4 w-4" /> Privado
                 </button>
              </div>
           </div>

           <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] shadow-xl border border-black/5 dark:border-white/10 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="font-black dark:text-white uppercase tracking-tight">Adicionar Membros</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedUsers.length} Membros Selecionados</p>
                 </div>
                 <div className="bg-gray-100 dark:bg-white/5 p-2 rounded-xl">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" />
                 </div>
              </div>

              <div className="relative mb-6">
                 <input 
                    placeholder="Pesquisar contatos..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 p-4 pl-6 rounded-full outline-none font-bold text-sm dark:text-white border-none"
                 />
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar max-h-[300px] pr-2">
                 {filteredUsers.map(user => (
                   <button 
                     key={user.id}
                     onClick={() => toggleUserSelection(user.id)}
                     className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all ${selectedUsers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200/50' : 'hover:bg-gray-50 dark:hover:bg-white/5 border-transparent'} border`}
                   >
                     <div className="flex items-center gap-4">
                        <img src={user.profilePicture} className="w-10 h-10 rounded-full object-cover" />
                        <div className="text-left">
                           <p className="text-sm font-black dark:text-white uppercase truncate">{user.firstName} {user.lastName}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase">@{(user as any).username || user.firstName.toLowerCase()}</p>
                        </div>
                     </div>
                     <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${selectedUsers.includes(user.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-white/10'}`}>
                        {selectedUsers.includes(user.id) && <CheckBadgeIcon className="h-4 w-4" />}
                     </div>
                   </button>
                 ))}
                 {filteredUsers.length === 0 && (
                    <div className="text-center py-20">
                       <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nenhum contato encontrado</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 md:p-8 bg-white/80 dark:bg-[#0a0c10]/80 backdrop-blur-xl border-t dark:border-white/5 z-50">
         <div className="max-w-3xl mx-auto space-y-3">
            {creationFee !== null && creationFee > 0 && (
              <div className="flex justify-between items-center text-xs px-2 font-bold">
                <span className="text-gray-400 uppercase tracking-widest text-[9px]">Custo de Criação:</span>
                <span className={`${currentUser.balance !== undefined && currentUser.balance < creationFee ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                  {creationFee} KZ {currentUser.balance !== undefined && `(Seu Saldo: ${currentUser.balance} KZ)`}
                </span>
              </div>
            )}
            <div className="flex gap-4">
               <button 
                   onClick={() => onNavigate('chat')}
                   className="flex-1 py-5 bg-gray-100 dark:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-all border border-transparent"
               >
                   Cancelar Tudo
               </button>
               <button 
                   onClick={handleCreate}
                   disabled={loading || !name || (creationFee !== null && currentUser.balance !== undefined && currentUser.balance < creationFee)}
                   className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
               >
                   {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Criar Comunidade'}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CreateGroupPage;
