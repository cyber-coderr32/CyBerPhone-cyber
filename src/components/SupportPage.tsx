import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket, SupportMessage } from '../types';
import { getSupportTickets, createSupportTicket, addSupportMessage } from '../services/storageService';
import { 
  LifebuoyIcon, 
  ChevronRightIcon, 
  PaperAirplaneIcon, 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  TagIcon,
  ArrowLeftIcon,
  PlusIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';
import { safeJsonStringify } from '../lib/utils';

interface SupportPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ currentUser, onNavigate }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'TECHNICAL' as any, details: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTickets();
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedTicket) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getSupportTickets(currentUser.id);
      setTickets(data);
    } catch (err) {
      console.error("Error loading tickets:", safeJsonStringify(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.details) return;

    try {
      await createSupportTicket(currentUser.id, newTicket.subject, newTicket.details, newTicket.category);
      setNewTicket({ subject: '', category: 'TECHNICAL', details: '' });
      setShowCreateForm(false);
      loadTickets();
    } catch (err) {
      console.error("Error creating ticket:", safeJsonStringify(err));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage || !selectedTicket) return;

    const msg: Partial<SupportMessage> = {
      senderId: currentUser.id,
      text: newMessage,
      timestamp: Date.now()
    };

    try {
      await addSupportMessage(selectedTicket.id, msg);
      setNewMessage('');
      // Optimistic update might be better but let's just reload for now or find it in state
      loadTickets().then(() => {
          const updated = tickets.find(t => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
      });
    } catch (err) {
      console.error("Error sending message:", safeJsonStringify(err));
    }
  };

  const categories = [
    { id: 'TECHNICAL', label: 'Suporte Técnico', color: 'bg-blue-500' },
    { id: 'BILLING', label: 'Financeiro / Pagamentos', color: 'bg-green-500' },
    { id: 'ABUSE', label: 'Denúncia / Abuso', color: 'bg-red-500' },
    { id: 'OTHER', label: 'Outros Assuntos', color: 'bg-gray-500' }
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 pb-24 md:pb-6 flex flex-col h-full min-h-[70vh]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
             {selectedTicket ? 'Visualizar Ticket' : 'Centro de Suporte'}
            <LifebuoyIcon className="w-6 h-6 text-blue-600" />
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            {selectedTicket ? `ID: #${selectedTicket.id.slice(0, 8)}` : 'Como podemos ajudar você hoje?'}
          </p>
        </div>

        {!selectedTicket && !showCreateForm && (
            <button 
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
                <PlusIcon className="w-4 h-4" />
                Novo Ticket
            </button>
        )}

        {selectedTicket && (
            <button 
                onClick={() => setSelectedTicket(null)}
                className="text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Voltar
            </button>
        )}
      </div>

      <div className="flex-grow">
        {loading && !selectedTicket ? (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-white/5 animate-pulse rounded-3xl" />)}
            </div>
        ) : showCreateForm ? (
            <motion.form 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleCreateTicket}
                className="bg-white dark:bg-white/5 p-8 rounded-[40px] shadow-sm space-y-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Assunto</label>
                        <input 
                            value={newTicket.subject}
                            onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                            placeholder="Ex: Problema com o carregamento do feed"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Categoria</label>
                        <select 
                            value={newTicket.category}
                            onChange={e => setNewTicket({ ...newTicket, category: e.target.value as any })}
                            className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none appearance-none"
                        >
                            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Detalhes do Problema</label>
                    <textarea 
                        value={newTicket.details}
                        onChange={e => setNewTicket({ ...newTicket, details: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-3xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none h-40 resize-none"
                        placeholder="Descreva o que está acontecendo o mais detalhadamente possível..."
                        required
                    />
                </div>

                <div className="flex items-center gap-4 pt-4">
                    <button 
                        type="submit"
                        className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex-grow md:flex-grow-0"
                    >
                        Abrir Chamado
                    </button>
                    <button 
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 px-6"
                    >
                        Cancelar
                    </button>
                </div>
            </motion.form>
        ) : selectedTicket ? (
            <div className="flex flex-col h-[70vh] bg-white dark:bg-white/5 rounded-[40px] shadow-sm overflow-hidden border border-gray-100 dark:border-white/10">
                {/* Chat Header */}
                <div className="p-6 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <div>
                        <h3 className="font-black uppercase text-gray-900 dark:text-white leading-tight">{selectedTicket.subject}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{categories.find(c => c.id === selectedTicket.category)?.label}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${selectedTicket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {selectedTicket.status === 'RESOLVED' ? 'Concluído' : 'Aberto'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Messages Hub */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {selectedTicket.messages.map((msg, idx) => {
                        const isSystem = msg.senderId === 'SUPPORT' || msg.senderId === 'system';
                        return (
                            <div key={idx} className={`flex ${isSystem ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] rounded-[30px] p-5 shadow-sm ${isSystem ? 'bg-gray-100 dark:bg-white/10 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
                                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                    <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold uppercase ${isSystem ? 'text-gray-400' : 'text-blue-100'}`}>
                                        <ClockIcon className="w-3 h-3" />
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                {selectedTicket.status === 'OPEN' && (
                    <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 flex gap-3">
                        <input 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            className="flex-grow bg-white dark:bg-white/5 border-none rounded-2xl px-6 py-4 font-medium text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                            placeholder="Digite sua resposta..."
                        />
                        <button 
                            type="submit"
                            className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                        >
                            <PaperAirplaneIcon className="w-6 h-6 -rotate-45" />
                        </button>
                    </form>
                )}
            </div>
        ) : (
            <div className="space-y-4">
                {tickets.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[40px] shadow-sm flex flex-col items-center border border-dashed border-gray-200 dark:border-white/10">
                        <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-4" />
                        <h3 className="font-black uppercase text-gray-900 dark:text-white">Nenhum chamado aberto</h3>
                        <p className="text-sm text-gray-500 font-medium max-w-[300px] mt-2">Se você tiver algum problema ou dúvida, nossa equipe está pronta para ajudar.</p>
                         <button 
                            onClick={() => setShowCreateForm(true)}
                            className="mt-8 bg-gray-900 dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-xl"
                        >
                            Abrir Primeiro Chamado
                        </button>
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <motion.div 
                            key={ticket.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => setSelectedTicket(ticket)}
                            className="bg-white dark:bg-white/5 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-blue-600 dark:hover:border-blue-600 transition-all cursor-pointer flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-5 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${categories.find(c => c.id === ticket.category)?.color} text-white shadow-lg`}>
                                    <TagIcon className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black uppercase text-gray-900 dark:text-white leading-tight truncate">{ticket.subject}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {ticket.status === 'RESOLVED' ? 'Resolvido' : 'Em Aberto'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" />
                                            {new Date(ticket.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRightIcon className="w-6 h-6 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </motion.div>
                    ))
                )}
            </div>
        )}
      </div>

      <div className="mt-12 text-center p-8 bg-gray-50 dark:bg-white/5 rounded-[40px] flex flex-col items-center justify-center gap-4">
        <div>
          <h4 className="text-sm font-black uppercase text-gray-900 dark:text-white mb-2">Precisa de ajuda imediata?</h4>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-loose">
              Nosso horário de atendimento é de Segunda a Sexta, das 09h às 18h.<br/>
              Suporte oficial via WhatsApp: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">+244 926815124</span>
          </p>
        </div>
        <a 
          href="https://wa.me/244926815124" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-[9px] tracking-wider transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.004 2a9.991 9.991 0 0 0-9.99 9.99c0 1.8.47 3.49 1.3 4.96l-1.38 5.05 5.17-1.35a9.96 9.96 0 0 0 4.9 1.28l.01.01h.01c5.51 0 9.99-4.48 9.99-9.99S17.514 2 12.004 2zm5.78 12.98c-.24.68-1.22 1.24-1.68 1.29-.44.05-.15.49-2.54-.46-2.52-1.01-4.11-3.61-4.23-3.77-.12-.17-.99-1.32-.99-2.52 0-1.2.62-1.79.84-2.03.24-.24.62-.3.9-.3.12 0 .22.01.3.01.24.01.55-.09.76.43.21.52.88 2.14.96 2.3.08.16.03.42-.08.57-.12.16-.24.27-.36.41-.1.12-.21.25-.09.46.21.36.93 1.54 2.01 2.5.95.84 1.74 1.1 1.98 1.22.24.12.38.09.52-.07.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.23.08 1.45.69 1.7.81.25.12.42.18.48.28.06.11.06.63-.18 1.31z" />
          </svg>
          Chamar no WhatsApp (+244 926815124)
        </a>
      </div>
    </div>
  );
};

export default SupportPage;
