import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number | null;
  max?: number;
  size?: number;
  className?: string;
}

export function RatingStars({ rating, max = 5, size = 14, className = '' }: RatingStarsProps) {
  if (rating === null) return null;

  return (
    <div className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'text-[var(--color-caramelo-claro)] fill-[var(--color-caramelo-claro)]' : 'text-white/10'}
        />
      ))}
    </div>
  );
}
