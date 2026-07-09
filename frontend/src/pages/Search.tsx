import React, { useState } from 'react';
import { SearchBar } from '../components/search/SearchBar';
import { MovieCard } from '../components/search/MovieCard';
import { useSearch } from '../hooks/useSearch';
import type { MediaType, MediaDetails } from '../types/media';

/**
 * Página de Busca — reúne SearchBar + hook useSearch + grid de resultados.
 *
 * Compatibilidade de plataforma:
 * - TV/D-Pad: Grid com 2 colunas em telas grandes, 1 em pequenas.
 *   A navegação entre cards com setas funciona via tabIndex={0} em cada MovieCard.
 * - Mobile: Grid de 2 colunas com gap generoso.
 * - Desktop/TV grande: Grid de até 5 colunas (1920px).
 */
export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [selectedMedia, setSelectedMedia] = useState<MediaDetails | null>(null);

  const { results, totalResults, isLoading, error } = useSearch(query, mediaType);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <h2 className="font-cinzel text-3xl font-bold text-[var(--color-caramelo-claro)] mb-1">
          Busca
        </h2>
        <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60">
          Encontre filmes e séries para adicionar à sua biblioteca.
        </p>
      </div>

      {/* SearchBar */}
      <SearchBar
        query={query}
        mediaType={mediaType}
        onQueryChange={setQuery}
        onMediaTypeChange={setMediaType}
      />

      {/* Estados */}
      <SearchResults
        query={query}
        isLoading={isLoading}
        error={error}
        results={results}
        totalResults={totalResults}
        onSelectMedia={setSelectedMedia}
      />

      {/* Modal de detalhes — placeholder para 3.3.5 */}
      {selectedMedia && (
        <MediaDetailOverlay
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
};

// --- Sub-componentes internos ---

interface SearchResultsProps {
  query: string;
  isLoading: boolean;
  error: string | null;
  results: MediaDetails[];
  totalResults: number;
  onSelectMedia: (media: MediaDetails) => void;
}

function SearchResults({ query, isLoading, error, results, totalResults, onSelectMedia }: SearchResultsProps) {
  // Estado inicial — nenhuma busca feita
  if (query.trim().length < 2 && !isLoading) {
    return (
      <EmptyState
        icon="🔍"
        title="O que você quer assistir?"
        description="Digite pelo menos 2 caracteres para iniciar a busca."
      />
    );
  }

  // Carregando
  if (isLoading) {
    return <LoadingGrid />;
  }

  // Erro
  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Algo deu errado"
        description={error}
        isError
      />
    );
  }

  // Sem resultados
  if (results.length === 0 && query.trim().length >= 2) {
    return (
      <EmptyState
        icon="😶‍🌫️"
        title="Nenhum resultado encontrado"
        description={`Não encontramos nada para "${query}". Tente outro título.`}
      />
    );
  }

  // Resultados
  return (
    <div className="flex flex-col gap-4">
      <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-50">
        {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
      </p>
      <div
        className="
          grid gap-4
          grid-cols-2
          sm:grid-cols-3
          md:grid-cols-4
          lg:grid-cols-5
          xl:grid-cols-6
          2xl:grid-cols-7
        "
        role="list"
        aria-label="Resultados da busca"
      >
        {results.map((media) => (
          <div key={`${media.mediaType}-${media.id}`} role="listitem">
            <MovieCard media={media} onSelect={onSelectMedia} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  isError?: boolean;
}

function EmptyState({ icon, title, description, isError = false }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="text-5xl" role="img" aria-hidden="true">{icon}</span>
      <h3 className={`font-cinzel text-xl font-bold ${isError ? 'text-red-400' : 'text-[var(--color-caramelo-claro)]'}`}>
        {title}
      </h3>
      <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60 max-w-xs">
        {description}
      </p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div
      className="
        grid gap-4
        grid-cols-2
        sm:grid-cols-3
        md:grid-cols-4
        lg:grid-cols-5
        xl:grid-cols-6
        2xl:grid-cols-7
      "
      aria-busy="true"
      aria-label="Carregando resultados"
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden bg-white/5 border border-white/10 animate-pulse"
          aria-hidden="true"
        >
          <div className="aspect-[2/3] bg-white/10" />
          <div className="p-3 flex flex-col gap-2">
            <div className="h-3 bg-white/10 rounded w-3/4" />
            <div className="h-2 bg-white/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Placeholder para o Modal de detalhes (item 3.3.5 do roadmap)
interface MediaDetailOverlayProps {
  media: MediaDetails;
  onClose: () => void;
}

function MediaDetailOverlay({ media, onClose }: MediaDetailOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${media.title}`}
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {media.posterUrl && (
            <img
              src={media.posterUrl}
              alt={`Pôster de ${media.title}`}
              className="w-24 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex flex-col gap-1">
            <h3 className="font-cinzel font-bold text-xl text-[var(--color-caramelo-claro)]">
              {media.title}
            </h3>
            <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-60">
              {media.releaseDate ? new Date(media.releaseDate).getFullYear() : 'Ano desconhecido'} • {media.mediaType === 'movie' ? 'Filme' : 'Série'}
              {media.voteAverage ? ` • ⭐ ${media.voteAverage.toFixed(1)}` : ''}
            </p>
          </div>
        </div>

        <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-80 leading-relaxed line-clamp-4">
          {media.overview}
        </p>

        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={onClose}
            tabIndex={0}
            className="tv-focus-glow font-outfit text-sm px-4 py-2 rounded-lg bg-white/10 text-[var(--color-seda-milharal)] hover:bg-white/20 transition cursor-pointer"
          >
            Fechar
          </button>
          <button
            tabIndex={0}
            className="tv-focus-glow font-outfit text-sm px-5 py-2 rounded-lg bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] font-semibold hover:bg-[var(--color-cobre)] transition cursor-pointer"
            onClick={onClose}
          >
            + Adicionar à Biblioteca
          </button>
        </div>
      </div>
    </div>
  );
}
