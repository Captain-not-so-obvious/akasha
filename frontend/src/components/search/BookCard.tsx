import React from 'react';
import type { BookDetails } from '../../types/book';
import { BookOpen, Star, FileText } from 'lucide-react';

interface BookCardProps {
  book: BookDetails;
  onSelect?: (book: BookDetails) => void;
  isInLibrary?: boolean;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%231b281f'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='sans-serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

/**
 * Card de exibição de um livro na busca com proporção de capa editorial (aspect-[1/1.5]).
 *
 * Acessibilidade e Plataforma:
 * - TV/D-Pad: tabIndex={0} obrigatório. Efeito tv-focus-glow com tecla Enter/Espaço para acionamento.
 * - Mobile: Área de toque do card completo (touch target generoso).
 * - Visual: Liquid Glass, proporção de capa editorial, autores, páginas e badge "Na Estante".
 */
export const BookCard: React.FC<BookCardProps> = ({ book, onSelect, isInLibrary = false }) => {
  const formattedRating = book.averageRating ? book.averageRating.toFixed(1) : null;
  const authorDisplay = book.authors.length > 0 ? book.authors.join(', ') : 'Autor Desconhecido';

  const handleActivate = () => {
    onSelect?.(book);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${book.title} por ${authorDisplay}${book.releaseYear ? `, ${book.releaseYear}` : ''}${isInLibrary ? ', Já está na sua estante' : ''}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className="
        tv-focus-glow
        group relative flex flex-col rounded-xl overflow-hidden
        bg-white/5 border border-white/10
        cursor-pointer transition-all duration-300
        hover:-translate-y-1 hover:border-[var(--color-caramelo-claro)]/40
        hover:shadow-xl hover:shadow-black/40
      "
    >
      {/* Capa com Proporção Editorial */}
      <div className="relative aspect-[1/1.5] overflow-hidden bg-[var(--color-floresta-negra)]">
        <img
          src={book.coverUrl ?? FALLBACK_COVER}
          alt={`Capa de ${book.title}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_COVER;
          }}
        />

        {/* Efeito de lombada sutil de livro na borda esquerda */}
        <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />

        {/* Badge de nota */}
        {formattedRating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-sm px-2 py-1 shadow z-10">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-outfit font-semibold text-white">{formattedRating}</span>
          </div>
        )}

        {/* Badge de tipo (Livro) */}
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-[var(--color-folha-oliva)]/90 backdrop-blur-sm px-2 py-1 shadow z-10">
          <BookOpen className="w-3 h-3 text-[var(--color-seda-milharal)]" />
          <span className="text-xs font-outfit font-semibold text-[var(--color-seda-milharal)]">
            Livro
          </span>
        </div>

        {/* Badge "Na Estante" */}
        {isInLibrary && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-md py-1 px-2 text-white shadow-lg border border-emerald-400/30 z-10">
            <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-outfit font-bold tracking-wide">Na Estante</span>
          </div>
        )}
      </div>

      {/* Info do Livro */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h3 className="font-outfit font-semibold text-sm text-[var(--color-seda-milharal)] line-clamp-2 leading-snug">
            {book.title}
          </h3>
          <p className="font-outfit text-xs text-[var(--color-caramelo-claro)] opacity-90 line-clamp-1 mt-0.5" title={authorDisplay}>
            {authorDisplay}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] font-outfit text-stone-400 mt-1">
          {book.releaseYear && <span>{book.releaseYear}</span>}
          {book.pageCount && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 opacity-60" />
              {book.pageCount} pág.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
