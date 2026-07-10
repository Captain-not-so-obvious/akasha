import { useState, useRef, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
  initialRating?: number | null;
  title?: string;
}

export function RatingModal({ isOpen, onClose, onSubmit, initialRating, title = 'Avaliar' }: RatingModalProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focar o modal ao abrir para captura do D-Pad
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRating = hoverRating || initialRating || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel 
        className="relative w-full max-w-sm p-6 flex flex-col items-center" 
        tabIndex={-1} 
        ref={modalRef}
      >
        <button
          onClick={onClose}
          tabIndex={0}
          className="absolute top-4 right-4 text-white/60 hover:text-white tv-focus-glow rounded-full p-1"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <h3 className="text-2xl font-cinzel font-bold text-[var(--color-seda-milharal)] mb-6 text-center">
          {title}
        </h3>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              tabIndex={0}
              className="tv-focus-glow rounded-full p-2 transition-transform hover:scale-110 focus:scale-110"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onFocus={() => setHoverRating(star)}
              onBlur={() => setHoverRating(0)}
              onClick={() => {
                onSubmit(star);
                onClose();
              }}
            >
              <Star
                size={36}
                className={star <= currentRating ? 'text-[var(--color-caramelo-claro)] fill-[var(--color-caramelo-claro)]' : 'text-white/20'}
              />
            </button>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
