import React, { useState, useEffect } from 'react';
import { User, ChatConversation, GroupTheme } from '../types';
import { 
  XMarkIcon, 
  ShieldCheckIcon, 
  UserMinusIcon, 
  TrashIcon, 
  PaintBrushIcon, 
  PhotoIcon,
  GlobeAltIcon, 
  LockClosedIcon,
  CheckIcon,
  UserGroupIcon,
  NoSymbolIcon,
  UserPlusIcon
} from '@heroicons/react/24/solid';
import { findUserById, updateGroupDetails, updateGroupImage, getUsers } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { useDialog } from '../services/DialogContext';

interface GroupAdminModalProps {
  isOpen: boolean;
  chat: ChatConversation;
  currentUser: User;
  onClose: () => void;
}

const AVAILABLE_THEMES: { id: GroupTheme; name: string; color: string }[] = [
  { id: 'blue', name: 'Azul Espacial', color: 'bg-blue-500' },
  { id: 'green', name: 'Esmeralda', color: 'bg-emerald-500' },
  { id: 'black', name: 'Cyberpunk Dark', color: 'bg-zinc-800' },
  { id: 'orange', name: 'Lava Solar', color: 'bg-orange-500' },
  { id: 'purple', name: 'Nébula Violeta', color: 'bg-violet-500' },
  { id: 'red', name: 'Neon Rubí', color: 'bg-red-500' },
  { id: 'teal', name: 'Ciano Aquático', color: 'bg-teal-500' },
  { id: 'pink', name: 'Hyper Pink', color: 'bg-pink-500' },
  { id: 'indigo', name: 'Índigo Noturno', color: 'bg-indigo-500' },
  { id: 'cyan', name: 'Futurista Elétrico', color: 'bg-cyan-500' },
];

const GroupAdminModal: React.FC<GroupAdminModalProps> = ({
  isOpen,
  chat,
  currentUser,
  onClose,
}) => {
  const { showAlert, showConfirm } = useDialog();
  const [groupName, setGroupName] = useState(chat.groupName || '');
  const [description, setDescription] = useState(chat.description || '');
  const [isPublic, setIsPublic] = useState(chat.isPublic ?? true);
  const [selectedTheme, setSelectedTheme] = useState<GroupTheme>(chat.theme || 'blue');
  const [memberProfiles, setMemberProfiles] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(chat.groupImage || null);

  // Estados locais sincronizados para participantes e bloqueados
  const [participants, setParticipants] = useState<string[]>(chat.participants || []);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(chat.blockedUserIds || []);
  const [blockedProfiles, setBlockedProfiles] = useState<User[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);

  useEffect(() => {
    setParticipants(chat.participants || []);
    setBlockedUserIds(chat.blockedUserIds || []);
    setGroupName(chat.groupName || '');
    setDescription(chat.description || '');
    setIsPublic(chat.isPublic ?? true);
    setSelectedTheme(chat.theme || 'blue');
    setImagePreview(chat.groupImage || null);
  }, [chat, isOpen]);

  useEffect(() => {
    if (!participants || participants.length === 0) {
      setMemberProfiles([]);
      setIsLoadingMembers(false);
      return;
    }
    
    const loadMemberProfiles = async () => {
      setIsLoadingMembers(true);
      try {
        const profiles = await Promise.all(
          participants.map(async (pId) => {
            const user = await findUserById(pId);
            return user;
          })
        );
        setMemberProfiles(profiles.filter((p): p is User => !!p));
      } catch (err) {
        console.error("Erro ao carregar perfis de membros:", err);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadMemberProfiles();
  }, [participants]);

  useEffect(() => {
    if (!blockedUserIds || blockedUserIds.length === 0) {
      setBlockedProfiles([]);
      setIsLoadingBlocked(false);
      return;
    }

    const loadBlockedProfiles = async () => {
      setIsLoadingBlocked(true);
      try {
        const profiles = await Promise.all(
          blockedUserIds.map(async (pId) => {
            const user = await findUserById(pId);
            return user;
          })
        );
        setBlockedProfiles(profiles.filter((p): p is User => !!p));
      } catch (err) {
        console.error("Erro ao carregar perfis bloqueados:", err);
      } finally {
        setIsLoadingBlocked(false);
      }
    };

    loadBlockedProfiles();
  }, [blockedUserIds]);

  // Estados para busca e adição de novos membros
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAllUsers = async () => {
      setIsSearchingUsers(true);
      try {
        const users = await getUsers(currentUser);
        setAllUsers(users);
      } catch (err) {
        console.error("Erro ao buscar usuários do sistema:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    };
    fetchAllUsers();
  }, [isOpen, currentUser]);

  const eligibleUsers = allUsers.filter(u => {
    const isMember = participants.includes(u.id);
    const isBlocked = blockedUserIds.includes(u.id);
    const matchesSearch = searchQuery.trim() === '' || 
      `${u.firstName} ${u.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return !isMember && !isBlocked && matchesSearch;
  });

  const handleAddMember = async (userId: string, name: string) => {
    const confirmed = await showConfirm(
      `Deseja adicionar ${name} ao grupo imediatamente?`,
      { title: "Adicionar Membro", type: 'confirm', confirmText: "Adicionar" }
    );
    if (confirmed) {
      const updatedParticipants = [...participants, userId];
      const success = await updateGroupDetails(chat.id, { participants: updatedParticipants });
      if (success) {
        setParticipants(updatedParticipants);
        showAlert(`${name} foi adicionado ao grupo com sucesso!`, { type: 'success' });
      } else {
        showAlert("Erro ao adicionar membro.");
      }
    }
  };

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKickMember = async (memberId: string, name: string) => {
    const confirmed = await showConfirm(
      `Tem certeza que deseja remover ${name} do grupo?`,
      { title: "Expulsar Membro", type: 'warning', confirmText: "Remover" }
    );
    if (confirmed) {
      const updatedParticipants = participants.filter(pId => pId !== memberId);
      const success = await updateGroupDetails(chat.id, { participants: updatedParticipants });
      if (success) {
        showAlert(`${name} foi removido do grupo com sucesso.`);
        setParticipants(updatedParticipants);
      } else {
        showAlert("Erro ao remover o membro do grupo.");
      }
    }
  };

  const handleBlockMember = async (memberId: string, name: string) => {
    const confirmed = await showConfirm(
      `Deseja BLOQUEAR/BANIR ${name} deste grupo? Ele será removido imediatamente e não poderá reentrar.`,
      { title: "Bloquear Membro", type: 'warning', confirmText: "Bloquear e Expulsar" }
    );
    if (confirmed) {
      const updatedParticipants = participants.filter(pId => pId !== memberId);
      const updatedBlocked = [...new Set([...blockedUserIds, memberId])];
      const success = await updateGroupDetails(chat.id, { 
        participants: updatedParticipants,
        blockedUserIds: updatedBlocked
      });
      if (success) {
        showAlert(`${name} foi banido e bloqueado com sucesso!`, { type: 'success' });
        setParticipants(updatedParticipants);
        setBlockedUserIds(updatedBlocked);
      } else {
        showAlert("Erro ao bloquear o membro do grupo.");
      }
    }
  };

  const handleUnblockMember = async (memberId: string, name: string) => {
    const confirmed = await showConfirm(
      `Deseja ELIMINAR O BLOQUEIO de ${name}? Ele poderá entrar no grupo novamente.`,
      { title: "Eliminar Bloqueio", type: 'warning', confirmText: "Eliminar Bloqueio" }
    );
    if (confirmed) {
      const updatedBlocked = blockedUserIds.filter(pId => pId !== memberId);
      const success = await updateGroupDetails(chat.id, { 
        blockedUserIds: updatedBlocked
      });
      if (success) {
        showAlert(`O bloqueio de ${name} foi eliminado com sucesso.`, { type: 'success' });
        setBlockedUserIds(updatedBlocked);
      } else {
        showAlert("Erro ao remover o bloqueio.");
      }
    }
  };

  const handlePromoteAdmin = async (memberId: string, name: string) => {
    const confirmed = await showConfirm(
      `Deseja transferir a administração do grupo para ${name}? Você perderá privilégios administrativos.`,
      { title: "Transferir Administração", type: 'warning', confirmText: "Transferir" }
    );
    if (confirmed) {
      const success = await updateGroupDetails(chat.id, { adminId: memberId });
      if (success) {
        showAlert(`${name} agora é o administrador do grupo!`);
        onClose(); // Fecha o modal pois o usuário não é mais admin
      } else {
        showAlert("Erro ao transferir administração.");
      }
    }
  };

  const handleSaveAll = async () => {
    if (!groupName.trim()) {
      showAlert("O nome da comunidade não pode ser vazio.");
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = chat.groupImage || '';
      
      if (imageFile) {
        finalImageUrl = await updateGroupImage(chat.id, imageFile);
      }

      const success = await updateGroupDetails(chat.id, {
        groupName: groupName.trim(),
        description: description.trim(),
        isPublic,
        theme: selectedTheme,
        groupImage: finalImageUrl,
        participants,
        blockedUserIds
      });

      if (success) {
        showAlert("Configurações do grupo atualizadas com sucesso!");
        onClose();
      } else {
        showAlert("Ocorreu um erro ao atualizar os detalhes do grupo.");
      }
    } catch (err) {
      console.error("Erro ao salvar dados do grupo:", err);
      showAlert("Ocorreu um erro crítico ao atualizar o grupo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[12000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#121318] w-full max-w-2xl rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header estático */}
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <UserGroupIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Administrar Grupo</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Painel de gerenciamento comunitário</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all text-gray-500 dark:text-gray-400"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {/* Sessão 1: Imagem e Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5">
              <div className="relative group overflow-hidden w-24 h-24 rounded-full border border-black/10 dark:border-white/10 shadow-lg">
                <img 
                  src={imagePreview || DEFAULT_PROFILE_PIC} 
                  className="w-full h-full object-cover" 
                  alt="Previa"
                />
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <PhotoIcon className="h-6 w-6 text-white" />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-3">Logotipo do Grupo</p>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1.5">Nome da Comunidade</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-white/5 focus:bg-white border focus:border-indigo-500 border-black/5 dark:border-white/5 focus:ring-4 focus:ring-indigo-500/10 text-gray-800 dark:text-white rounded-2xl font-bold transition-all text-sm outline-none"
                  placeholder="Ex: Desenvolvedores Kotlin"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1.5">Descrição</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-white/5 focus:bg-white border focus:border-indigo-500 border-black/5 dark:border-white/5 focus:ring-4 focus:ring-indigo-500/10 text-gray-800 dark:text-white rounded-2xl font-bold transition-all text-sm outline-none resize-none h-20"
                  placeholder="Sobre o que é este grupo..."
                />
              </div>
            </div>
          </div>

          {/* Sessão 2: Privacidade e Tema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-zinc-50 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <div className="p-3 bg-emerald-500/10 rounded-2xl"><GlobeAltIcon className="h-5 w-5 text-emerald-500" /></div>
                ) : (
                  <div className="p-3 bg-orange-500/10 rounded-2xl"><LockClosedIcon className="h-5 w-5 text-orange-500" /></div>
                )}
                <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-tight">Privacidade</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    {isPublic ? 'Público (Qualquer um pode ver)' : 'Privado (Somente convidados)'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsPublic(!isPublic)}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all ${isPublic ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}
              >
                Mudar
              </button>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <PaintBrushIcon className="h-4 w-4 text-gray-400" />
                <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-tight">Gromática Visual</h4>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_THEMES.map((theme) => (
                  <button 
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`h-8 rounded-xl flex items-center justify-center relative border border-transparent hover:scale-105 active:scale-95 transition-all ${theme.color}`}
                    title={theme.name}
                  >
                    {selectedTheme === theme.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-xl">
                        <CheckIcon className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sessão Adicionar Membros Novos */}
          <div className="space-y-4 border-t border-gray-100 dark:border-white/5 pt-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
              <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlusIcon className="h-4.5 w-4.5" /> Adicionar Membros Novos
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Expandir comunidade</p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquise por nome, apelido ou email..."
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-white/5 focus:bg-white border focus:border-indigo-500 border-black/5 dark:border-white/5 focus:ring-4 focus:ring-indigo-500/10 text-gray-800 dark:text-white rounded-2xl font-bold transition-all text-xs outline-none"
              />
            </div>

            {isSearchingUsers ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 border-2 border-t-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : searchQuery.trim() !== '' ? (
              eligibleUsers.length === 0 ? (
                <p className="text-center py-4 text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">
                  Nenhum usuário qualificado encontrado
                </p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar border border-black/5 dark:border-white/5 rounded-2xl p-2 bg-zinc-50/50 dark:bg-neutral-900/40">
                  {eligibleUsers.map((u) => (
                    <div key={u.id} className="p-2 bg-white dark:bg-[#181920] border border-black/5 dark:border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={u.profilePicture || DEFAULT_PROFILE_PIC}
                          className="w-8 h-8 rounded-full object-cover border border-black/5"
                          alt={u.firstName}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase leading-none">
                            {u.firstName} {u.lastName || ''}
                          </h4>
                          <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">{u.email || '@username'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(u.id, u.firstName)}
                        className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              eligibleUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sugestões de usuários:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {eligibleUsers.slice(0, 4).map((u) => (
                      <div key={u.id} className="p-3 bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2 max-w-[65%]">
                          <img
                            src={u.profilePicture || DEFAULT_PROFILE_PIC}
                            className="w-8 h-8 rounded-full object-cover border border-black/5"
                            alt={u.firstName}
                            referrerPolicy="no-referrer"
                          />
                          <div className="overflow-hidden">
                            <h4 className="text-[11px] font-black text-gray-800 dark:text-white uppercase truncate">
                              {u.firstName} {u.lastName || ''}
                            </h4>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddMember(u.id, u.firstName)}
                          className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Sessão 3: Gerenciamento de Membros */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
              <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Membros Comunitários ({participants.length})</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ações de moderação</p>
            </div>

            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-t-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                {memberProfiles.map((member) => {
                  const isAdmin = member.id === chat.adminId;
                  const isMe = member.id === currentUser.id;
                  
                  return (
                    <div 
                      key={member.id} 
                      className="p-3 bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.profilePicture || DEFAULT_PROFILE_PIC} 
                          className="w-10 h-10 rounded-full object-cover border border-black/5" 
                          alt={member.firstName}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase">
                            {member.firstName} {member.lastName || ''} {isMe && '(Você)'}
                          </h4>
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            {isAdmin ? '👑 ADMINISTRADOR' : 'MEMBRO'}
                          </p>
                        </div>
                      </div>

                      {!isAdmin && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleKickMember(member.id, member.firstName)}
                            className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 rounded-xl transition-all"
                            title="Expulsar do Grupo (Kick)"
                          >
                            <UserMinusIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleBlockMember(member.id, member.firstName)}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                            title="Bloquear e Banir do Grupo"
                          >
                            <NoSymbolIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handlePromoteAdmin(member.id, member.firstName)}
                            className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-xl transition-all"
                            title="Promover a Proprietário"
                          >
                            <ShieldCheckIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sessão 4: Gerenciamento de Membros Bloqueados */}
          <div className="space-y-4 border-t border-gray-100 dark:border-white/5 pt-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
              <h3 className="text-xs font-black text-red-500 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                <NoSymbolIcon className="h-4 w-4" /> Membros Bloqueados ({blockedUserIds.length})
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ações de desbloqueio</p>
            </div>

            {isLoadingBlocked ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-t-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : blockedProfiles.length === 0 ? (
              <p className="text-center py-6 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide border border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                Nenhum membro bloqueado neste grupo
              </p>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                {blockedProfiles.map((member) => (
                  <div 
                    key={member.id} 
                    className="p-3 bg-red-500/5 dark:bg-white/5 border border-red-500/10 dark:border-white/5 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={member.profilePicture || DEFAULT_PROFILE_PIC} 
                        className="w-10 h-10 rounded-full object-cover border border-red-500/25" 
                        alt={member.firstName}
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase">
                          {member.firstName} {member.lastName || ''}
                        </h4>
                        <p className="text-[8px] text-red-500 font-bold uppercase tracking-widest mt-0.5">
                          🚫 BLOQUEADO / BANIDO
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleUnblockMember(member.id, member.firstName)}
                      className="px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500"
                      title="Eliminar Bloqueio"
                    >
                      <CheckIcon className="h-3.5 w-3.5" /> Eliminar Bloqueio
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer estático */}
        <div className="p-6 md:p-8 bg-zinc-50 dark:bg-[#0c0d10] border-t border-gray-100 dark:border-white/5 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Fechar
          </button>
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isSaving ? 'Salvando...' : 'Salvar Detalhes'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default GroupAdminModal;
