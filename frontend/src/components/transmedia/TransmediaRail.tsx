import React, { useEffect, useRef } from 'react';
import { useTransmedia } from '../../hooks/useTransmedia';
import { TransmediaCard } from './TransmediaCard';
import type { TransmediaRecommendationItem } from '../../types/transmedia';
import { Sparkles, Compass } from 'lucide-react';
import { ThematicLoader } from '../ui/ThematicLoader';

interface TransmediaRailProps {
  onSelectRecommendation?: (item: TransmediaRecommendationItem) => void;
  onQuickAdd?: (item: TransmediaRecommendationItem) => void;
  title?: string;
  subtitle?: string;
}

export const TransmediaRail: React.FC<TransmediaRailProps> = ({
  onSelectRecommendation,
  onQuickAdd,
  title = 'Conexões Transmídia',
  subtitle = 'Descubra livros, séries, jogos e quadrinhos de franquias que você ama',
}) => {
  const { recommendations, isLoading, error, fetchRecommendations } = useTransmedia();
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecommendations(12);
  }, [fetchRecommendations]);

  if (isLoading && recommendations.length === 0) {
    return (
      <div className="w-full py-8 flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
        <ThematicLoader
          domain="movie"
          size="md"
          subtext="Tecendo pontes transmídia pelo Akasha..."
        />
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 w-full" aria-label={title}>
      {/* Cabeçalho do Rail */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-caramelo-claro)] animate-pulse" />
            <h2 className="text-xl md:text-2xl font-cinzel font-bold text-[var(--color-caramelo-claro)]">
              {title}
            </h2>
          </div>
          <p className="text-xs md:text-sm text-[var(--color-seda-milharal)]/70 mt-1 font-outfit">
            {subtitle}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--color-seda-milharal)]/60 font-mono">
          <Compass className="w-4 h-4 text-[var(--color-caramelo-claro)]" />
          <span>Multiverso Akasha</span>
        </div>
      </div>

      {/* Carrossel Horizontal com Suporte a D-Pad da TV e Scroll Suave */}
      <div
        ref={railRef}
        role="region"
        aria-label="Lista de obras transmídia recomendadas"
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth no-scrollbar focus:outline-none"
      >
        {recommendations.map((item) => (
          <TransmediaCard
            key={`${item.franchiseName}:${item.targetItem.domain}:${item.targetItem.externalId}`}
            item={item}
            onSelect={onSelectRecommendation}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>
    </section>
  );
};
