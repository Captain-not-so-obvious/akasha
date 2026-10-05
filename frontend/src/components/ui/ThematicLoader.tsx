import React, { useEffect, useState } from 'react';

export type LoaderDomain = 'movie' | 'game' | 'book' | 'comic' | 'general';

export interface ThematicLoaderProps {
  /**
   * Domínio temático para carregar frases contextuais ('book', 'movie', 'game', 'comic' ou 'general').
   * Padrão: 'general'.
   */
  domain?: LoaderDomain;
  /**
   * Frases customizadas caso deseje substituir o catálogo padrão de mensagens.
   */
  phrases?: string[];
  /**
   * Intervalo de rotação das frases em milissegundos. Padrão: 2600ms.
   */
  intervalMs?: number;
  /**
   * Tamanho do spinner e da tipografia. Padrão: 'md'.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Subtexto fixo ou legenda exibida abaixo da frase alternante.
   */
  subtext?: string;
  /**
   * Classes adicionais de estilização para o container.
   */
  className?: string;
}

export const DOMAIN_PHRASES: Record<LoaderDomain, string[]> = {
  book: [
    'Organizando a sua estante...',
    'Tem alguns livros empoeirados por aqui...',
    'Folheando os manuscritos do Akasha...',
    'Separando os melhores marcadores de página...',
    'Desvendando novos capítulos...',
    'Quase lá...',
  ],
  comic: [
    'Organizando as sagas da sua estante...',
    'Tirando as HQs dos sacos plásticos protetores...',
    'Lendo as páginas da direita para a esquerda...',
    'Sintonizando os multiversos e arcos épicos...',
    'Folheando os próximos volumes...',
    'Quase lá...',
  ],
  movie: [
    'Organizando a sua estante...',
    'Ajustando a lente do projetor...',
    'Rebobinando as fitas da estante...',
    'Estourando a pipoca quentinha...',
    'Sintonizando frequências cinematográficas...',
    'Quase lá...',
  ],
  game: [
    'Organizando a sua estante...',
    'Assoprando a poeira dos cartuchos...',
    'Compilando shaders na memória...',
    'Calibrando os controles e joysticks...',
    'Sintonizando o próximo checkpoint...',
    'Quase lá...',
  ],
  general: [
    'Organizando a sua estante...',
    'Tem alguns livros empoeirados por aqui...',
    'Consultando os registros etéreos do Akasha...',
    'Tirando a poeira das relíquias do acervo...',
    'Polindo as prateleiras da sua coleção...',
    'Quase lá...',
  ],
};

export const ThematicLoader: React.FC<ThematicLoaderProps> = ({
  domain = 'general',
  phrases,
  intervalMs = 2600,
  size = 'md',
  subtext,
  className = '',
}) => {
  const activePhrases = phrases && phrases.length > 0 ? phrases : DOMAIN_PHRASES[domain] || DOMAIN_PHRASES.general;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Reinicia o índice ao trocar de domínio ou lista de frases
  useEffect(() => {
    setCurrentIndex(0);
    setIsFading(false);
  }, [domain, phrases]);

  // Efeito de rotação periódica com micro-transição de fade
  useEffect(() => {
    if (activePhrases.length <= 1) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activePhrases.length);
        setIsFading(false);
      }, 250);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [activePhrases, intervalMs]);

  // Dimensionamento do spinner conforme a prop `size`
  const spinnerSizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-9 h-9 border-[3px]',
    lg: 'w-12 h-12 border-4',
  }[size];

  const glowSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base md:text-lg',
  }[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center select-none ${className}`}
    >
      {/* Círculo girando como padrão com brilho temático âmbar/ouro */}
      <div className="relative flex items-center justify-center mb-3">
        <div
          aria-hidden="true"
          className={`absolute rounded-full bg-[var(--color-caramelo-claro)]/15 blur-sm animate-pulse ${glowSizeClasses}`}
        />
        <div
          data-testid="spinning-circle"
          className={`rounded-full animate-spin border-[var(--color-caramelo-claro)]/25 border-t-[var(--color-caramelo-claro)] shadow-[0_0_12px_rgba(221,161,94,0.3)] ${spinnerSizeClasses}`}
        />
      </div>

      {/* Frase animada alternando com criatividade */}
      <div className="flex flex-col items-center justify-center min-h-[1.75rem] px-4 max-w-sm">
        <p
          data-testid="thematic-phrase"
          className={`font-outfit font-medium text-[var(--color-seda-milharal)] transition-all duration-250 transform ${
            isFading ? 'opacity-0 translate-y-1' : 'opacity-95 translate-y-0'
          } ${textSizeClasses}`}
        >
          {activePhrases[currentIndex]}
        </p>

        {subtext && (
          <span
            data-testid="thematic-subtext"
            className="font-cinzel text-[10px] md:text-xs tracking-wider uppercase text-[var(--color-caramelo-claro)]/70 mt-1"
          >
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
