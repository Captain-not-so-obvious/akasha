import React, { useEffect, useRef } from 'react';
import { useBookRecommendations } from '../../hooks/useBookRecommendations';
import type { BookRecommendationItem } from '../../types/book';
import { BookOpen } from 'lucide-react';
import { ThematicLoader } from '../ui/ThematicLoader';

interface BookRecommendationRailProps {
  onSelectBook?: (book: BookRecommendationItem) => void;
  onQuickAdd?: (book: BookRecommendationItem) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23283618'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

export const BookRecommendationRail: React.FC<BookRecommendationRailProps> = ({
  onSelectBook,
  onQuickAdd,
}) => {
  const { recommendations, isLoading, error, fetchRecommendations } = useBookRecommendations();
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecommendations(12);
  }, [fetchRecommendations]);

  const handleCardFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (typeof e.currentTarget.scrollIntoView === 'function') {
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, item: BookRecommendationItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onSelectBook) {
        onSelectBook(item);
      }
    }
  };

  if (isLoading && recommendations.length === 0) {
    return (
      <div className="w-full py-8 flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
        <ThematicLoader
          domain="book"
          size="md"
          subtext="Recomendações Literárias"
        />
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Recomendações Literárias"
      className="w-full flex flex-col gap-4 py-4 border-y border-white/10"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <div>
            <h2 className="text-lg md:text-xl font-cinzel font-bold text-[var(--color-seda-milharal)]">
              Akasha Sugere para Ler
            </h2>
            <p className="text-xs text-[var(--color-seda-milharal)]/70 font-outfit">
              Baseado nos seus autores favoritos e histórico de leituras
            </p>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        tabIndex={-1}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth focus:outline-none [-webkit-overflow-scrolling:touch]"
        style={{ scrollbarWidth: 'thin' }}
      >
        {recommendations.map((book) => {
          const authorDisplay = book.authors.length > 0 ? book.authors.join(', ') : 'Autor Desconhecido';
          return (
            <div
              key={book.id}
              role="button"
              tabIndex={0}
              aria-label={`Livro recomendado: ${book.title}. ${book.reason}`}
              onClick={() => onSelectBook?.(book)}
              onKeyDown={(e) => handleKeyDown(e, book)}
              onFocus={handleCardFocus}
              className="flex-shrink-0 w-44 md:w-52 group cursor-pointer flex flex-col bg-white/5 border border-white/10 hover:border-[var(--color-caramelo-claro)]/60 rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-[var(--color-caramelo-claro)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-caramelo-claro)] focus:scale-[1.05] focus:shadow-2xl relative"
            >
              {/* Capa com Proporção Editorial */}
              <div className="relative aspect-[1/1.5] w-full overflow-hidden bg-black/40">
                <img
                  src={book.coverUrl || FALLBACK_COVER}
                  alt={book.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_COVER;
                  }}
                />

                {/* Lombada de livro */}
                <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />

                {/* Badge de tipo */}
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-[var(--color-folha-oliva)]/90 backdrop-blur-sm px-2 py-0.5 shadow">
                  <BookOpen className="w-3 h-3 text-[var(--color-seda-milharal)]" />
                  <span className="text-[10px] font-outfit font-semibold text-[var(--color-seda-milharal)]">
                    Livro
                  </span>
                </div>

                {/* Botão de adição rápida no hover */}
                {onQuickAdd && (
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={`Adicionar ${book.title} à estante`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAdd(book);
                    }}
                    className="absolute bottom-2 right-2 p-2 bg-[var(--color-folha-oliva)] text-white rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity hover:scale-110 shadow-lg cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center tv-focus-glow"
                  >
                    <span className="text-base font-bold leading-none">+</span>
                  </button>
                )}
              </div>

              {/* Informações */}
              <div className="p-3 flex flex-col flex-grow justify-between gap-2">
                <div>
                  <h3 className="font-outfit font-semibold text-sm text-[var(--color-seda-milharal)] line-clamp-1 group-hover:text-[var(--color-caramelo-claro)] transition-colors">
                    {book.title}
                  </h3>
                  <p className="font-outfit text-xs text-stone-300 opacity-90 line-clamp-1 mt-0.5">
                    {authorDisplay}
                  </p>
                </div>

                <div className="mt-auto">
                  <p className="font-outfit text-[11px] text-[var(--color-caramelo-claro)] line-clamp-2 leading-tight bg-[var(--color-caramelo-claro)]/10 px-2 py-1 rounded border border-[var(--color-caramelo-claro)]/20">
                    💡 {book.reason}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
