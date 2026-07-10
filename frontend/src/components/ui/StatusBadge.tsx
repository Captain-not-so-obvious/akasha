import type { WishlistStatus } from '../../types/wishlist';

interface StatusBadgeProps {
  status: WishlistStatus;
  className?: string;
}

const statusConfig: Record<WishlistStatus, { label: string; bg: string; text: string }> = {
  plan_to_watch: { label: 'Quero Ver', bg: 'bg-white/10', text: 'text-white' },
  watching: { label: 'Assistindo', bg: 'bg-[var(--color-caramelo-claro)]/20', text: 'text-[var(--color-caramelo-claro)]' },
  completed: { label: 'Concluído', bg: 'bg-[var(--color-folha-oliva)]/30', text: 'text-[#d4e0a3]' },
  dropped: { label: 'Abandonei', bg: 'bg-[var(--color-cobre)]/30', text: 'text-[#ffb470]' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-outfit border border-current/20 ${config.bg} ${config.text} ${className}`}>
      {config.label}
    </span>
  );
}
