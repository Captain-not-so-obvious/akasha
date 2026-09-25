import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ActivityCard } from '../../../src/components/ActivityCard';
import type { ActivityItem } from '../../../src/types/activity';

describe('ActivityCard Component', () => {
  const mockActivity: ActivityItem = {
    id: 1,
    userId: 'user-1',
    type: 'RATED_MEDIA',
    tmdbId: 550,
    mediaType: 'movie',
    title: 'Clube da Luta',
    posterPath: '/poster.jpg',
    userRating: 5,
    status: 'completed',
    createdAt: new Date().toISOString(),
    profile: {
      id: 'user-1',
      username: 'cinefilo',
      avatarUrl: null,
    },
  };

  it('deve renderizar o username do amigo e o título da mídia', () => {
    render(<ActivityCard activity={mockActivity} />);

    expect(screen.getByText('@cinefilo')).toBeInTheDocument();
    expect(screen.getByText('Clube da Luta')).toBeInTheDocument();
    expect(screen.getByText(/Avaliou com 5\/5★/i)).toBeInTheDocument();
  });

  it('deve ter tabIndex={0} para suporte à navegação D-Pad em Android TV', () => {
    const { container } = render(<ActivityCard activity={mockActivity} />);
    const cardElement = container.querySelector('[tabindex="0"]');
    expect(cardElement).toBeInTheDocument();
  });

  it('deve exibir badge visual de status "Começou a assistir"', () => {
    const watchingActivity: ActivityItem = {
      ...mockActivity,
      type: 'STATUS_CHANGED',
      status: 'watching',
      userRating: null,
    };

    render(<ActivityCard activity={watchingActivity} />);
    expect(screen.getByText('Começou a assistir')).toBeInTheDocument();
  });

  it('deve exibir a opinião / resenha do usuário quando presente', () => {
    const activityWithReview: ActivityItem = {
      ...mockActivity,
      review: 'Filme impactante com final surpreendente!',
    };

    render(<ActivityCard activity={activityWithReview} />);
    expect(screen.getByText('Filme impactante com final surpreendente!')).toBeInTheDocument();
  });
});

