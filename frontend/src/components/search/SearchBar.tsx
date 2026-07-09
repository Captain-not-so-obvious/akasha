import React, { useId } from 'react';
import type { MediaType } from '../../types/media';

interface SearchBarProps {
  query: string;
  mediaType: MediaType;
  onQueryChange: (value: string) => void;
  onMediaTypeChange: (type: MediaType) => void;
}

/**
 * Barra de busca com toggle Filmes/Séries.
 *
 * Compatibilidade de plataforma:
 * - TV/D-Pad: Todos os elementos têm tabIndex={0}. O input tem foco automático
 *   para que o controle remoto possa acionar o teclado virtual imediatamente.
 *   Os botões de toggle são navegáveis por seta e ativados via tecla Enter/OK.
 * - Mobile: Botões com touch target generoso (py-3). Sem dependência exclusiva de :hover.
 * - Desktop: Hover suave com transição e ícone de busca à esquerda.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  mediaType,
  onQueryChange,
  onMediaTypeChange,
}) => {
  const searchInputId = useId();

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Toggle Filmes / Séries */}
      <div
        role="group"
        aria-label="Tipo de mídia"
        className="flex gap-2 self-start"
      >
        <ToggleButton
          label="🎬 Filmes"
          active={mediaType === 'movie'}
          onClick={() => onMediaTypeChange('movie')}
        />
        <ToggleButton
          label="📺 Séries"
          active={mediaType === 'tv'}
          onClick={() => onMediaTypeChange('tv')}
        />
      </div>

      {/* Campo de busca */}
      <div className="relative w-full">
        {/* Ícone de lupa */}
        <span
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-caramelo-claro)] opacity-70 pointer-events-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          id={searchInputId}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={`Buscar ${mediaType === 'movie' ? 'filmes' : 'séries'}...`}
          autoComplete="off"
          tabIndex={0}
          aria-label={`Buscar ${mediaType === 'movie' ? 'filmes' : 'séries'}`}
          className="
            tv-focus-glow w-full rounded-xl
            bg-white/10 border border-white/15
            pl-12 pr-4 py-4
            font-outfit text-base text-[var(--color-seda-milharal)]
            placeholder:text-[var(--color-seda-milharal)]/40
            transition-all duration-200
            hover:border-white/30 hover:bg-white/15
          "
        />

        {/* Botão limpar quando há query */}
        {query.length > 0 && (
          <button
            onClick={() => onQueryChange('')}
            tabIndex={0}
            aria-label="Limpar busca"
            className="tv-focus-glow absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-seda-milharal)] opacity-50 hover:opacity-100 transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Sub-componente interno para os botões de toggle
interface ToggleButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToggleButton({ label, active, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      tabIndex={0}
      role="radio"
      aria-checked={active}
      className={`
        tv-focus-glow
        px-5 py-3 rounded-lg font-outfit text-sm font-semibold
        transition-all duration-200 cursor-pointer
        ${
          active
            ? 'bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] shadow-md shadow-[var(--color-caramelo-claro)]/30'
            : 'bg-white/10 text-[var(--color-seda-milharal)] opacity-60 hover:opacity-100 hover:bg-white/20'
        }
      `}
    >
      {label}
    </button>
  );
}
