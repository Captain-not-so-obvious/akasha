import { useState, useRef, useEffect } from 'react';
import { Star, X, MessageSquareQuote } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

export const MAX_REVIEW_LENGTH = 300;

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review?: string) => void;
  initialRating?: number | null;
  initialReview?: string | null;
  title?: string;
}


export function RatingModal({
  isOpen,
  onClose,
  onSubmit,
  initialRating,
  initialReview,
  title = 'Avaliar',
}: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRating(initialRating || 0);
      setReview(initialReview || '');
      setHoverRating(0);
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
  }, [isOpen, initialRating, initialReview]);

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || selectedRating;

  const handleSave = () => {
    if (selectedRating > 0) {
      onSubmit(selectedRating, review.trim() || undefined);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all duration-300"
      onKeyDown={handleKeyDown}
    >
      <GlassPanel
        className="relative w-full max-w-md p-6 sm:p-8 flex flex-col items-center border border-stone-800/80 shadow-2xl bg-stone-950/85"
        tabIndex={-1}
        ref={modalRef}
      >
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          tabIndex={0}
          className="absolute top-4 right-4 text-white/60 hover:text-white tv-focus-glow rounded-full p-2 transition-colors focus:outline-none"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Título */}
        <h3 className="text-xl sm:text-2xl font-cinzel font-bold text-[var(--color-seda-milharal)] mb-6 text-center line-clamp-2 px-6">
          {title}
        </h3>

        {/* Seleção de Estrelas */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6" role="group" aria-label="Avaliação em estrelas">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= currentDisplayRating;
            return (
              <button
                key={star}
                type="button"
                tabIndex={0}
                aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                className="tv-focus-glow rounded-xl p-2.5 sm:p-3 transition-transform hover:scale-110 focus:scale-110 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onFocus={() => setHoverRating(star)}
                onBlur={() => setHoverRating(0)}
                onClick={() => {
                  setSelectedRating(star);
                }}
              >
                <Star
                  size={32}
                  className={`transition-colors duration-200 ${
                    isFilled
                      ? 'text-[var(--color-caramelo-claro)] fill-[var(--color-caramelo-claro)] filter drop-shadow-[0_0_8px_rgba(235,178,89,0.4)]'
                      : 'text-stone-600 hover:text-stone-400'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Campo de Opinião Opcional */}
        <div className="w-full flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between">
            <label
              htmlFor="opinion-input"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold font-outfit text-stone-300"
            >
              <MessageSquareQuote size={15} className="text-[var(--color-caramelo-claro)]" />
              <span>Quer deixar uma opinião?</span>
              <span className="text-[11px] font-normal text-stone-500">(opcional)</span>
            </label>
            <span
              className={`text-[11px] font-outfit ${
                review.length >= MAX_REVIEW_LENGTH ? 'text-red-400 font-bold' : 'text-stone-500'
              }`}
            >
              {review.length}/{MAX_REVIEW_LENGTH}
            </span>
          </div>

          <textarea
            id="opinion-input"
            tabIndex={0}
            rows={3}
            maxLength={MAX_REVIEW_LENGTH}
            placeholder="O que você achou dessa obra? Conte aos seus amigos..."
            value={review}
            onChange={(e) => setReview(e.target.value.slice(0, MAX_REVIEW_LENGTH))}
            className="w-full bg-stone-900/70 border border-stone-800 rounded-xl p-3 text-sm font-outfit text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-caramelo-claro)]/80 focus:border-[var(--color-caramelo-claro)] tv-focus-glow transition-all resize-none"
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            tabIndex={0}
            onClick={onClose}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800/60 font-outfit font-medium text-sm tv-focus-glow transition-all cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={handleSave}
            disabled={selectedRating === 0}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[var(--color-caramelo-claro)] text-stone-950 font-outfit font-bold text-sm tv-focus-glow hover:bg-[var(--color-cobre)] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px] shadow-lg shadow-amber-950/20"
          >
            Salvar Avaliação
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
