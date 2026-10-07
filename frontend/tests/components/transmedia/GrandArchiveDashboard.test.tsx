import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrandArchiveDashboard } from '../../../src/components/transmedia/GrandArchiveDashboard';
import * as useTransmediaModule from '../../../src/hooks/useTransmedia';

vi.mock('../../../src/hooks/useTransmedia', () => ({
  useTransmedia: vi.fn(),
}));

describe('GrandArchiveDashboard Component', () => {
  const mockStats = {
    totalItems: 25,
    domainBreakdown: {
      movie: { count: 8, percentage: 32, averageRating: 4.8 },
      tv: { count: 4, percentage: 16, averageRating: 4.5 },
      game: { count: 6, percentage: 24, averageRating: 4.7 },
      book: { count: 4, percentage: 16, averageRating: 4.2 },
      comic: { count: 3, percentage: 12, averageRating: 5.0 },
    },
    statusBreakdown: {
      plan_to_watch: { count: 10, percentage: 40 },
      watching: { count: 5, percentage: 20 },
      completed: { count: 9, percentage: 36 },
      dropped: { count: 1, percentage: 4 },
    },
    ratingStats: {
      average: 4.6,
      ratedCount: 18,
      distribution: { '5': 12, '4': 4, '3': 2, '2': 0, '1': 0 },
    },
    consumptionMetrics: {
      estimatedScreenHours: 56,
      estimatedGameHours: 195,
      estimatedPagesRead: 2400,
      totalComicVolumes: 3,
    },
    franchiseStats: {
      totalFranchises: 2,
      topFranchises: [
        {
          name: 'The Witcher',
          count: 3,
          domains: ['game' as const, 'book' as const, 'tv' as const],
        },
      ],
    },
    diversityIndex: {
      score: 88,
      archetypeTitle: 'Polímata Transmídia',
      archetypeDescription: 'Você transcende os limites de uma única mídia e navega com maestria absoluta.',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [],
      stats: mockStats,
      franchises: [],
      isLoading: false,
      error: null,
      fetchRecommendations: vi.fn(),
      fetchStats: vi.fn(),
      fetchFranchises: vi.fn(),
    });
  });

  it('deve renderizar o arquétipo cultural e o score de amplitude Akasha', () => {
    render(<GrandArchiveDashboard />);

    expect(screen.getByText('Polímata Transmídia')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('25 obras catalogadas')).toBeInTheDocument();
  });

  it('deve renderizar os contadores dos 4 domínios culturais e estimativas', () => {
    render(<GrandArchiveDashboard />);

    expect(screen.getByText('Cinema & TV')).toBeInTheDocument();
    expect(screen.getByText('Jogos')).toBeInTheDocument();
    expect(screen.getAllByText('Livros')[0]).toBeInTheDocument();
    expect(screen.getByText('HQs & Mangás')).toBeInTheDocument();

    expect(screen.getByText(/~56h de tela/i)).toBeInTheDocument();
    expect(screen.getByText(/~195h jogadas/i)).toBeInTheDocument();
    expect(screen.getByText(/~2400 páginas/i)).toBeInTheDocument();
  });

  it('deve renderizar a franquia no topo do acervo', () => {
    render(<GrandArchiveDashboard />);

    expect(screen.getByText('The Witcher')).toBeInTheDocument();
    expect(screen.getByText('3 obras')).toBeInTheDocument();
  });
});
