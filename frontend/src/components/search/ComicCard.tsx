import React from 'react';
import type { ComicDetails } from '../../types/comic';
import { BookOpen, Layers, Bookmark } from 'lucide-react';

interface ComicCardProps {
  comic: ComicDetails;
  onSelect?: (comic: ComicDetails) => void;
  isInLibrary?: boolean;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%231b281f'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='sans-serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

/**
 * Card de exibição de uma Saga de Quadrinho ou Mangá com proporção editorial (aspect-[1/1.5]).
 *
 * Acessibilidade e Plataforma:
 * - TV/D-Pad: tabIndex={0} obrigatório. Efeito tv-focus-glow com tecla Enter/Espaço para acionamento.
 * - Mobile: Área de toque do card completo (touch target generoso).
 * - Visual: Liquid Glass, proporção de capa editorial, badges de tipo (Saga/Mangá/Manhwa), editora e contagem de edições/volumes.
 */
export const ComicCard: React.FC<ComicCardProps> = ({ comic, onSelect, isInLibrary = false }) => {
  const creatorDisplay =
    comic.creators && comic.creators.length > 0 ? comic.creators.join(', ') : comic.publisher || 'Criador Desconhecido';

  const typeLabel =
    comic.type === 'manhwa' ? 'Manhwa' : comic.type === 'manga' ? 'Mangá' : 'Saga / HQ';

  const scopeLabel = comic.issueCount
    ? `${comic.issueCount} Edições`
    : comic.volumeCount
      ? `${comic.volumeCount} Volumes`
      : 'Saga Fechada';

  const handleActivate = () => {
    onSelect?.(comic);
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
      aria-label={`${comic.title}, ${typeLabel} por ${creatorDisplay}${comic.releaseYear ? `, ${comic.releaseYear}` : ''}${isInLibrary ? ', Já está na sua biblioteca' : ''}`}
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
          src={comic.coverUrl ?? FALLBACK_COVER}
          alt={`Capa de ${comic.title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_COVER;
          }}
        />

        {/* Efeito de lombada e textura sutil na lateral */}
        <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />

        {/* Badge de tipo (Saga/HQ, Mangá ou Manhwa) */}
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-[var(--color-folha-oliva)]/90 backdrop-blur-sm px-2 py-1 shadow z-10">
          <BookOpen className="w-3 h-3 text-[var(--color-seda-milharal)]" />
          <span className="text-xs font-outfit font-semibold text-[var(--color-seda-milharal)]">
            {typeLabel}
          </span>
        </div>

        {/* Badge de escopo (Edições / Volumes) */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-sm px-2 py-1 shadow z-10">
          <Layers className="w-3 h-3 text-[var(--color-caramelo-claro)]" />
          <span className="text-xs font-outfit font-semibold text-white">
            {scopeLabel}
          </span>
        </div>

        {/* Badge "Na Biblioteca" */}
        {isInLibrary && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-md py-1 px-2 text-white shadow-lg border border-emerald-400/30 z-10">
            <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-outfit font-bold tracking-wide">Na Biblioteca</span>
          </div>
        )}
      </div>

      {/* Info da HQ / Mangá */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h3 className="font-outfit font-semibold text-sm text-[var(--color-seda-milharal)] line-clamp-2 leading-snug">
            {comic.title}
          </h3>
          <p className="font-outfit text-xs text-[var(--color-caramelo-claro)] opacity-90 line-clamp-1 mt-0.5" title={creatorDisplay}>
            {creatorDisplay}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] font-outfit text-stone-400 mt-1">
          {comic.releaseYear && <span>{comic.releaseYear}</span>}
          {comic.publisher && (
            <span className="truncate max-w-[120px] text-right" title={comic.publisher}>
              {comic.publisher}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
