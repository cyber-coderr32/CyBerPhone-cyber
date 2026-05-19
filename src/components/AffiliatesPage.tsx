import React, { useState, useEffect } from 'react';
import { User, Page, Transaction, AffiliateSale } from '../types';
import { getAffiliateSales } from '../services/storageService';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ArrowTrendingUpIcon, 
  LinkIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  GiftIcon,
  ChartBarIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import { useDialog } from '../services/DialogContext';
import { safeJsonStringify } from '../lib/utils';

interface AffiliatesPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({ currentUser, onNavigate }) => {
  const { showSuccess } = useDialog();
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [loading, setLoading] = useState(true);
  
  const affiliateStats = {
    totalSales: sales.length,
    totalCommission: sales.reduce((acc, sale) => acc + (sale.commissionEarned || (sale.saleAmount * 0.1)), 0),
    clicks: Math.floor(sales.length * 15.4),
    conversion: '6.5%'
  };

  useEffect(() => {
    const loadAffiliateData = async () => {
      setLoading(true);
      try {
        const mySales = await getAffiliateSales({ affiliateUserId: currentUser.id });
        setSales(mySales);
      } catch (error) {
        console.error("Erro ao carregar dados de afiliado:", safeJsonStringify(error));
      } finally {
        setLoading(false);
      }
    };
    loadAffiliateData();
  }, [currentUser.id]);

  const copyRefLink = () => {
    const link = `${window.location.origin}/?ref=${currentUser.id}`;
    navigator.clipboard.writeText(link);
    showSuccess("Link de Afiliado copiado!");
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 md:px-8 pb-32">
       <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 text-center md:text-left">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white flex items-center gap-4">
              Programa de Afiliados <GiftIcon className="w-10 h-10 text-brand" />
            </h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Ganhe comissões indicando produtos e novos membros</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/10 flex items-center gap-4 shadow-sm">
             <div className="text-right hidden md:block">
                <p className="text-[10px] font-black uppercase text-gray-400">Seu Código de Ref.</p>
                <p className="text-sm font-black text-blue-600 uppercase">{currentUser.id.slice(0, 8)}</p>
             </div>
             <button 
                onClick={copyRefLink}
                className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
             >
                <LinkIcon className="w-4 h-4" /> Copiar Link Master
             </button>
          </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 bg-emerald-600/10 w-24 h-24 rounded-full"></div>
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Comissão Total</p>
             <h3 className="text-3xl font-black text-emerald-600 uppercase tracking-tight">KZ {affiliateStats.totalCommission.toLocaleString()}</h3>
             <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500 mt-4 opacity-50" />
          </div>
          <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 bg-blue-600/10 w-24 h-24 rounded-full"></div>
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Vendas Realizadas</p>
             <h3 className="text-3xl font-black text-blue-600 uppercase tracking-tight">{affiliateStats.totalSales}</h3>
             <CheckCircleIcon className="w-5 h-5 text-blue-500 mt-4 opacity-50" />
          </div>
          <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 bg-purple-600/10 w-24 h-24 rounded-full"></div>
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliques no Link</p>
             <h3 className="text-3xl font-black text-purple-600 uppercase tracking-tight">{affiliateStats.clicks}</h3>
             <UserGroupIcon className="w-5 h-5 text-purple-500 mt-4 opacity-50" />
          </div>
          <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 bg-orange-600/10 w-24 h-24 rounded-full"></div>
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Conversão Média</p>
             <h3 className="text-3xl font-black text-orange-600 uppercase tracking-tight">{affiliateStats.conversion}</h3>
             <ChartBarIcon className="w-5 h-5 text-orange-500 mt-4 opacity-50" />
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content: Sales List */}
          <div className="lg:col-span-8">
             <div className="bg-white dark:bg-white/5 rounded-[3rem] p-4 border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b dark:border-white/5 mb-4">
                   <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">Últimas Conversões</h3>
                   <button className="text-[10px] font-black uppercase text-blue-600 hover:underline">Download CSV</button>
                </div>
                {loading ? (
                   <div className="p-10 space-y-4">
                      {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 dark:bg-white/5 rounded-2xl animate-pulse" />)}
                   </div>
                ) : sales.length > 0 ? (
                   <div className="overflow-x-auto">
                      <table className="w-full">
                         <thead>
                            <tr className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-left">
                               <th className="px-6 py-4">ID Pedido</th>
                               <th className="px-6 py-4">Data</th>
                               <th className="px-6 py-4">Valor</th>
                               <th className="px-6 py-4">Comissão</th>
                               <th className="px-6 py-4">Status</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y dark:divide-white/5">
                            {sales.map((sale) => (
                               <tr key={sale.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-5 font-black text-[10px] uppercase dark:text-white">#{sale.id.slice(-6)}</td>
                                  <td className="px-6 py-5 text-[10px] font-bold text-gray-500">{new Date(sale.timestamp).toLocaleDateString()}</td>
                                  <td className="px-6 py-5 font-black text-[11px] dark:text-white">KZ {sale.saleAmount?.toLocaleString()}</td>
                                  <td className="px-6 py-5 font-black text-[11px] text-emerald-600">KZ {(sale.commissionEarned || (sale.saleAmount * 0.1)).toLocaleString()}</td>
                                  <td className="px-6 py-5">
                                     <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500 px-3 py-1 rounded-full text-[8px] font-black uppercase">Liquidado</span>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                ) : (
                   <div className="py-20 text-center">
                      <ArrowTrendingUpIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-black uppercase text-xs">Ainda não há vendas registradas</p>
                   </div>
                )}
             </div>
          </div>

          {/* Sidebar: Info and Tips */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                   <WalletIcon className="w-32 h-32" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Como Funciona?</h3>
                <ul className="space-y-6">
                   <li className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-xs">1</div>
                      <p className="text-xs font-medium text-blue-100 leading-relaxed">Compartilhe seu link único com amigos, familiares ou seguidores.</p>
                   </li>
                   <li className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-xs">2</div>
                      <p className="text-xs font-medium text-blue-100 leading-relaxed">Quando eles clicarem e comprarem qualquer produto na Store, você ganha 10%.</p>
                   </li>
                   <li className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-xs">3</div>
                      <p className="text-xs font-medium text-blue-100 leading-relaxed">O saldo é liberado automaticamente na sua carteira digital após 7 dias.</p>
                   </li>
                </ul>
             </div>

             <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-tight dark:text-white mb-6 flex items-center gap-2">
                   <SparklesIcon className="w-5 h-5 text-yellow-500" /> Dica de Top Afiliado
                </h3>
                <p className="text-xs font-bold text-gray-500 leading-relaxed italic border-l-4 border-blue-600 pl-4">
                   "Postar seu link de afiliado nos seus Reels com uma breve recomendação aumenta a conversão em até 300% em comparação com apenas colocar na Bio."
                </p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default AffiliatesPage;
