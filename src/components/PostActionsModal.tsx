import React from 'react';
import { 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon, 
  BookmarkIcon, 
  ShareIcon, 
  FlagIcon,
  HandThumbUpIcon,
  ArrowUpIcon,
  LockClosedIcon,
  SignalIcon,
  BoltIcon,
  EyeIcon,
  MegaphoneIcon,
  UserPlusIcon,
  UserMinusIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import { pinPost, unpinPost } from '../services/storageService';
import { useTranslation } from 'react-i18next';

interface PostActionsModalProps {
  isAuthor: boolean;
  isPinned: boolean;
  isFollowing: boolean;
  isMonetized?: boolean;
  canMonetize?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onBoost: () => void;
  onPromoteCarousel: () => void;
  onFollow: () => void;
  onIndicate: () => void;
  onToggleMonetization: () => void;
  onReport: () => void;
}

const PostActionsModal: React.FC<PostActionsModalProps> = ({
  isAuthor,
  isPinned,
  isFollowing,
  isMonetized,
  canMonetize,
  onClose,
  onEdit,
  onDelete,
  onPin,
  onBoost,
  onPromoteCarousel,
  onFollow,
  onIndicate,
  onToggleMonetization,
  onReport,
}) => {
  const { t } = useTranslation();

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1a1c23] w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border border-black/5 dark:border-white/10 animate-slide-up sm:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Opções da Publicação</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
        </div>

        <div className="space-y-1">
          {isAuthor ? (
            <>
              <button 
                onClick={onEdit}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <PencilIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight dark:text-white">Editar Publicação</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Corrija erros ou mude o conteúdo</p>
                </div>
              </button>

              <button 
                onClick={onPromoteCarousel}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <RocketLaunchIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight dark:text-white">Destaque no Carrossel</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Apareça no topo do feed inicial</p>
                </div>
              </button>

              <button 
                onClick={onPin}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                    <ArrowUpIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight dark:text-white">{isPinned ? 'Desafixar do Perfil' : 'Fixar no Perfil'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{isPinned ? 'Remover destaque' : 'Manter no topo da sua página'}</p>
                </div>
              </button>

              <button 
                onClick={onBoost}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                    <BoltIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight dark:text-white">Patrocinar Alcançe</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Obtenha mais visitas e curtidas</p>
                </div>
              </button>

              {canMonetize && (
                <button 
                  onClick={onToggleMonetization}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/10 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                      <SignalIcon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tight dark:text-white">{isMonetized ? 'Desativar Ganho' : 'Ativar Monetização'}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Receba por tempo de visualização</p>
                  </div>
                </button>
              )}

              <div className="h-px bg-gray-100 dark:bg-white/5 my-2 mx-4"></div>

              <button 
                onClick={onDelete}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all group text-red-500"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrashIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight">Excluir Permanentemente</p>
                    <p className="text-[10px] text-red-400 font-bold uppercase">Esta ação é irreversível</p>
                </div>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={onFollow}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    {isFollowing ? <UserMinusIcon className="h-5 w-5" /> : <UserPlusIcon className="h-5 w-5" />}
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight dark:text-white">{isFollowing ? 'Deixar de Seguir' : 'Seguir Autor'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{isFollowing ? 'Remover da sua rede' : 'Ver mais conteúdos deste usuário'}</p>
                </div>
              </button>

              <button 
                onClick={onIndicate}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <MegaphoneIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight dark:text-white">Indicar este Conteúdo</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Recomende para outros membros</p>
                </div>
              </button>

              <button 
                onClick={onReport}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all group text-red-500"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FlagIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight font-black uppercase tracking-tight">Denunciar Publicação</p>
                    <p className="text-[10px] text-red-400 font-bold uppercase">Violação de regras ou ofensivo</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PostActionsModal;
