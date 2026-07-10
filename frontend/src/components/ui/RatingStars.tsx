import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number | null;
  max?: number;
  className?: string;
}

export function RatingStars({ rating, max = 5, className = '' }: RatingStarsProps) {
  if (rating === null) return null;

  return (
    <div className={`flex gap-1 ${className}`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < rating ? 'text-[var(--color-caramelo-claro)] fill-[var(--color-caramelo-claro)]' : 'text-white/20'}
        />
      ))}
    </div>
  );
}
