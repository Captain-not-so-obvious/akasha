import type { WishlistStatus, DomainType } from '../../types/wishlist';

interface StatusBadgeProps {
  status: WishlistStatus;
  domain?: DomainType;
  className?: string;
}

const statusConfig: Record<WishlistStatus, { label: string; gameLabel: string; bookLabel: string; bg: string; text: string }> = {
  plan_to_watch: {
    label: 'Quero Ver',
    gameLabel: 'Quero Jogar',
    bookLabel: 'Quero Ler',
    bg: 'bg-white/10',
    text: 'text-white',
  },
  watching: {
    label: 'Assistindo',
    gameLabel: 'Jogando',
    bookLabel: 'Lendo',
    bg: 'bg-[var(--color-caramelo-claro)]/20',
    text: 'text-[var(--color-caramelo-claro)]',
  },
  completed: {
    label: 'Concluído',
    gameLabel: 'Zerado',
    bookLabel: 'Lido',
    bg: 'bg-[var(--color-folha-oliva)]/30',
    text: 'text-[#d4e0a3]',
  },
  dropped: {
    label: 'Abandonei',
    gameLabel: 'Abandonei',
    bookLabel: 'Abandonei',
    bg: 'bg-[var(--color-cobre)]/30',
    text: 'text-[#ffb470]',
  },
};

export function StatusBadge({ status, domain, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const label =
    domain === 'game'
      ? config.gameLabel
      : domain === 'book' || domain === 'comic'
        ? config.bookLabel
        : config.label;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-outfit border border-current/20 ${config.bg} ${config.text} ${className}`}
    >
      {label}
    </span>
  );
}
