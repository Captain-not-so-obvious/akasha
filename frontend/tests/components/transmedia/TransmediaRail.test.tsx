import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransmediaRail } from '../../../src/components/transmedia/TransmediaRail';
import * as useTransmediaModule from '../../../src/hooks/useTransmedia';

vi.mock('../../../src/hooks/useTransmedia', () => ({
  useTransmedia: vi.fn(),
}));

describe('TransmediaRail Component', () => {
  const mockFetchRecommendations = vi.fn();
  const mockSelectRecommendation = vi.fn();
  const mockQuickAdd = vi.fn();

  const mockItem = {
    franchiseName: 'Duna (Dune)',
    sourceItem: {
      externalId: '438631',
      domain: 'movie' as const,
      title: 'Duna',
    },
    targetItem: {
      externalId: 'kC40DwAAQBAJ',
      domain: 'book' as const,
      title: 'Duna (Volume 1)',
      coverUrl: null,
      releaseYear: 1965,
      creatorOrAuthor: 'Frank Herbert',
    },
    reason: 'Porque você assistiu ao filme, explore o livro seminal de Frank Herbert.',
    score: 95,
    isColdStart: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [mockItem],
      stats: null,
      franchises: [],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
      fetchStats: vi.fn(),
      fetchFranchises: vi.fn(),
    });
  });

  it('deve renderizar o título do rail e os cards recomendados', () => {
    render(
      <TransmediaRail
        onSelectRecommendation={mockSelectRecommendation}
        onQuickAdd={mockQuickAdd}
      />
    );

    expect(screen.getByText('Conexões Transmídia')).toBeInTheDocument();
    expect(screen.getByText('Duna (Dune)')).toBeInTheDocument();
    expect(screen.getByText('Duna (Volume 1)')).toBeInTheDocument();
  });

  it('deve disparar onSelectRecommendation ao clicar no card', () => {
    render(
      <TransmediaRail
        onSelectRecommendation={mockSelectRecommendation}
        onQuickAdd={mockQuickAdd}
      />
    );

    const card = screen.getByRole('button', { name: /Recomendação Transmídia: Duna \(Volume 1\)/i });
    fireEvent.click(card);

    expect(mockSelectRecommendation).toHaveBeenCalledWith(mockItem);
  });
});
