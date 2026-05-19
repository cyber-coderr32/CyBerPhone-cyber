import React, { useState, useEffect } from 'react';
import { User, CyberEvent, Page } from '../types';
import { getEvents } from '../services/storageService';
import { 
  CalendarDaysIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  TicketIcon,
  PlusIcon,
  VideoCameraIcon,
  FireIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { motion } from 'motion/react';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';

interface EventsPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

const EventsPage: React.FC<EventsPageProps> = ({ currentUser, onNavigate }) => {
  const [events, setEvents] = useState<CyberEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'conferences' | 'concerts' | 'workshops'>('all');

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const allEvents = await getEvents();
        setEvents(allEvents);
      } catch (error) {
        console.error("Erro ao carregar eventos:", safeJsonStringify(error));
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const EventCard = ({ event }: { event: CyberEvent }) => (
    <div className="bg-white dark:bg-white/5 rounded-[3rem] overflow-hidden border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:shadow-xl group">
      <div className="h-64 relative">
        <img src={event.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={event.title} />
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl flex flex-col items-center justify-center shadow-lg">
           <span className="text-[10px] font-black uppercase text-blue-600 leading-none">{new Date(event.dateTime).toLocaleDateString('pt-BR', { month: 'short' })}</span>
           <span className="text-xl font-black text-gray-900 leading-none mt-1">{new Date(event.dateTime).getDate()}</span>
        </div>
        {event.type === 'ONLINE' && (
          <div className="absolute top-6 right-6 bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg animate-pulse">
            <VideoCameraIcon className="w-3.5 h-3.5" /> Live
          </div>
        )}
      </div>
      <div className="p-8">
        <div className="flex items-center gap-2 mb-3">
           <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20">{event.type}</span>
        </div>
        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-4 line-clamp-2">{event.title}</h3>
        
        <div className="space-y-3 mb-8">
           <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
             <MapPinIcon className="w-5 h-5 text-red-500" />
             <span className="text-xs font-bold uppercase tracking-widest">{event.location || 'Local a definir'}</span>
           </div>
           <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
             <UserGroupIcon className="w-5 h-5 text-indigo-500" />
             <span className="text-xs font-bold uppercase tracking-widest">{event.attendees.length} participantes confirmados</span>
           </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t dark:border-white/5">
           <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">
                {event.isPublic ? 'Evento Público' : 'Privado'}
              </p>
           </div>
           <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
             Garantir Vaga
           </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 md:px-8 pb-32">
       <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white flex items-center gap-4">
                Grandes Eventos <CalendarDaysIcon className="w-10 h-10 text-brand" />
              </h1>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em]">Experiências únicas em todo o mundo</p>
          </div>
          <button className="bg-white dark:bg-white/5 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-4 group active:scale-95 transition-all">
             <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg group-hover:rotate-12 transition-transform">
                <PlusIcon className="w-6 h-6 stroke-[3]" />
             </div>
             <div className="text-left">
                <p className="text-[10px] font-black uppercase text-gray-900 dark:text-white leading-none mb-1">Organizar</p>
                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none">Criar meu evento</p>
             </div>
          </button>
       </div>

       {/* Banner Superior - Featured */}
       <div className="mb-16 relative overflow-hidden bg-gray-900 rounded-[4rem] p-12 md:p-20 text-white shadow-2xl">
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-30 bg-gradient-to-l from-indigo-600 to-transparent"></div>
          <div className="relative z-10 max-w-xl">
             <div className="flex items-center gap-2 mb-6 text-yellow-400">
                <FireIcon className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Destaque da Temporada</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-none">CyberCon Global 2024</h2>
             <p className="text-base md:text-lg font-medium text-gray-400 mb-10 leading-relaxed">
               A maior conferência de tecnologia e cultura digital. 3 dias de inovação, networking e futuro.
             </p>
             <div className="flex flex-wrap gap-4">
                <button className="bg-white text-gray-900 px-10 py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">Saiba Mais</button>
                <div className="flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10">
                   <ClockIcon className="w-5 h-5 text-blue-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Inicia em 12 Dias</span>
                </div>
             </div>
          </div>
       </div>

       {/* Filtros */}
       <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-8 mb-4">
          {['Todos', 'Conferências', 'Música', 'Cursos', 'Meetups'].map((f) => (
            <button 
              key={f}
              className={`px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                f === 'Todos' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20' 
                : 'bg-white dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:border-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
       </div>

       {/* Grid de Eventos */}
       {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3,4,5,6].map(i => (
               <div key={i} className="bg-white dark:bg-white/5 h-[500px] rounded-[3rem] animate-pulse border border-gray-100 dark:border-white/10" />
            ))}
         </div>
       ) : events.length > 0 ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(event => (
               <EventCard key={event.id} event={event} />
            ))}
         </div>
       ) : (
         <div className="text-center py-32 bg-white dark:bg-white/5 rounded-[4rem] border border-gray-100 dark:border-white/10">
            <SparklesIcon className="w-16 h-16 text-gray-200 mx-auto mb-6" />
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2">Novos Eventos em Breve</h3>
            <p className="text-gray-400 text-sm font-medium">Estamos preparando as melhores experiências para você.</p>
         </div>
       )}
    </div>
  );
};

export default EventsPage;
