import React, { useState, useRef, useEffect } from 'react';
import { User, Page } from '../types';
import { safeJsonStringify } from '../lib/utils';
import { generateCyberResponse } from '../services/geminiService';
import { 
  CpuChipIcon, 
  PaperAirplaneIcon, 
  SparklesIcon, 
  ChatBubbleLeftRightIcon,
  EllipsisHorizontalIcon,
  UserCircleIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'motion/react';

interface CyberAssistantPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

const CyberAssistantPage: React.FC<CyberAssistantPageProps> = ({ currentUser, onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: `Olá ${currentUser.firstName}! Eu sou o CyberAssistant. Em que posso ajudar no seu mambo hoje?`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }));
      const response = await generateCyberResponse(history);
      
      setMessages(prev => [...prev, {
        role: 'model',
        content: response || "Desculpe, tive um problema técnico.",
        timestamp: Date.now()
      }]);
    } catch (err) {
      console.error("Assistant Error:", safeJsonStringify(err));
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "Como ganhar dinheiro no CyBerPhone?",
    "Dicas para viralizar no Reels",
    "Como criar uma loja virtual?",
    "Verificar minha conta"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto pb-20 md:pb-6">
       {/* Chat Header */}
       <div className="p-6 bg-white dark:bg-[#0a0c10] border-b dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <CpuChipIcon className="w-7 h-7" />
             </div>
             <div>
                <h1 className="text-lg font-black uppercase tracking-tighter dark:text-white">CyberAssistant</h1>
                <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> IA Online
                </p>
             </div>
          </div>
          <button className="text-gray-400 hover:text-blue-600 transition-colors">
            <CommandLineIcon className="w-6 h-6" />
          </button>
       </div>

       {/* Chat Messages */}
       <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar">
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
               <div className={`max-w-[80%] rounded-[2rem] p-5 shadow-sm ${
                 msg.role === 'user' 
                 ? 'bg-blue-600 text-white rounded-tr-none' 
                 : 'bg-white dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/10 rounded-tl-none'
               }`}>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[8px] font-black uppercase mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
               </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
               <div className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/10 animate-pulse">
                  <EllipsisHorizontalIcon className="w-6 h-6 text-gray-400" />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
       </div>

       {/* Suggestions & Input */}
       <div className="p-6 bg-gray-50/50 dark:bg-[#0a0c10]/50 backdrop-blur-xl">
          {messages.length < 3 && !isTyping && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4">
               {suggestions.map((s) => (
                 <button 
                  key={s}
                  onClick={() => {
                    setInput(s);
                  }}
                  className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-5 py-2.5 rounded-full text-[10px] font-black uppercase text-gray-400 hover:text-blue-600 hover:border-blue-600 transition-all whitespace-nowrap"
                 >
                   {s}
                 </button>
               ))}
            </div>
          )}

          <form onSubmit={handleSend} className="relative">
             <input 
                type="text" 
                placeholder="Pergunte qualquer mambo ao Cyber..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-3xl py-5 pl-6 pr-16 text-sm font-bold shadow-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white"
             />
             <button 
               type="submit" 
               disabled={!input.trim() || isTyping}
               className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:grayscale transition-all active:scale-90"
             >
                <PaperAirplaneIcon className="w-5 h-5 -rotate-12" />
             </button>
          </form>
       </div>
    </div>
  );
};

export default CyberAssistantPage;
