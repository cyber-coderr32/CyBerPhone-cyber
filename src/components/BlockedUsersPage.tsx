
import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import { getUsers, toggleBlockUser } from '../services/storageService';
import { useDialog } from '../services/DialogContext';
import { ArrowLeftIcon, NoSymbolIcon, UserMinusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { safeJsonStringify } from '../lib/utils';

interface BlockedUsersPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const BlockedUsersPage: React.FC<BlockedUsersPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert, showConfirm } = useDialog();
  const { t } = useTranslation();

  const loadBlockedUsers = async () => {
    setIsLoading(true);
    try {
      // Pedimos todos os usuários (estratégia simples, já que o número de bloqueados costuma ser baixo)
      // Mas o getUsers agora filtra bloqueados mutuamente se não formos admin.
      // Precisamos de uma forma de ver quem NÓS bloqueamos.
      
      const all = await getUsers(currentUser);
      // Se quem bloqueamos sumiu de getUsers, precisamos buscar um por um ou mudar getUsers.
      // Na verdade, getUsers filtra quem a gente bloqueou se currentUser for passado.
      
      // Vamos buscar diretamente se houver IDs
      const blockedIds = currentUser.blockedUserIds || [];
      if (blockedIds.length === 0) {
        setBlockedUsers([]);
        setIsLoading(false);
        return;
      }

      // IMPORTANTE: Como getUsers filtra bloqueados, vamos buscar sem passar o currentUser para ver todos,
      // ou buscar especificamente os IDs se houver serviço para isso.
      // Por enquanto, vamos usar a lista do currentUser e tentar mapear.
      
      // Vamos usar a lista de IDs e buscar os perfis públicos.
      // Note: No storageService, findUserById pode ser usado.
      const resolvedUsers: User[] = [];
      for (const id of blockedIds) {
          const u = all.find(x => x.id === id); // Tenta achar no que veio (provavelmente não virá se filtrado)
          if (u) resolvedUsers.push(u);
      }

      // Se a lista estiver vazia mas temos IDs, significa que o filtro de getMutualBlockedUserIds está funcionando "bem demais"
      // Vamos tentar buscar sem passar o currentUser para getUsers (se permitido)
      if (resolvedUsers.length < blockedIds.length) {
          const unfiltered = await getUsers(); // Chama sem filtro de bloqueio (se as regras permitirem listagem básica)
          const matched = unfiltered.filter(u => blockedIds.includes(u.id));
          setBlockedUsers(matched);
      } else {
          setBlockedUsers(resolvedUsers);
      }
    } catch (err) {
      console.error("Erro ao carregar bloqueados:", safeJsonStringify(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, [currentUser.blockedUserIds]);

  const handleUnblock = async (user: User) => {
    const confirmed = await showConfirm(
      `Deseja realmente desbloquear ${user.firstName}? Vocês poderão interagir novamente.`,
      { title: 'Desbloquear Usuário', confirmText: 'Desbloquear' }
    );

    if (confirmed) {
      try {
        await toggleBlockUser(currentUser.id, user.id);
        refreshUser();
        showAlert("Usuário desbloqueado.");
      } catch (err) {
        showAlert("Erro ao desbloquear usuário.", { type: 'error' });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => onNavigate('settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
        >
          <ArrowLeftIcon className="h-6 w-6 dark:text-white" />
        </button>
        <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Usuários Bloqueados</h1>
      </div>

      <div className="bg-white dark:bg-[#12161f] rounded-3xl shadow-xl overflow-hidden border dark:border-white/5">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Carregando lista...</p>
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
               <NoSymbolIcon className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">Nenhum bloqueio</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Você não bloqueou nenhum usuário ainda. Bloqueios aparecem aqui para você gerenciar.</p>
          </div>
        ) : (
          <div className="divide-y dark:divide-white/5">
            {blockedUsers.map(user => (
              <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <img 
                    src={user.profilePicture || DEFAULT_PROFILE_PIC} 
                    alt={user.firstName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-gray-100 dark:border-white/10"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold dark:text-white">{user.firstName} {user.lastName}</h4>
                    <p className="text-xs text-gray-500">@{user.email?.split('@')[0]}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnblock(user)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                >
                  <UserMinusIcon className="h-4 w-4" />
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-900/20">
         <h4 className="text-orange-800 dark:text-orange-400 font-bold mb-2 flex items-center gap-2">
            <NoSymbolIcon className="h-5 w-5" /> Sobre o Bloqueio
         </h4>
         <p className="text-orange-700/80 dark:text-orange-400/80 text-xs leading-relaxed">
            Ao bloquear uma conta, ela não poderá ver seus posts, te enviar mensagens no chat ou te seguir. 
            Suas interações anteriores (likes e comentários) serão ocultadas para ambos.
         </p>
      </div>
    </div>
  );
};

export default BlockedUsersPage;
