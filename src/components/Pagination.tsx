
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  itemsPerPage,
  totalItems
}) => {
  if (totalPages <= 1) return null;

  const startItem = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = itemsPerPage && totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
        {startItem !== null && endItem !== null && totalItems !== undefined ? (
          <span>A mostrar {startItem}-{endItem} de {totalItems} itens</span>
        ) : (
          <span>Página {currentPage} de {totalPages}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2.5 rounded-xl border border-gray-100 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            // Mostra apenas 5 páginas por vez se houverem muitas
            if (totalPages > 7) {
              if (pageNum !== 1 && pageNum !== totalPages && (pageNum < currentPage - 1 || pageNum > currentPage + 1)) {
                 if (pageNum === currentPage - 2 || pageNum === currentPage + 2) return <span key={pageNum} className="px-1 text-gray-300">...</span>;
                 return null;
              }
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-10 h-10 rounded-xl font-black text-xs transition-all active:scale-90 shadow-sm ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-white/10'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2.5 rounded-xl border border-gray-100 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
