import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TransmediaCard } from '../../../src/components/transmedia/TransmediaCard';
import type { TransmediaRecommendationItem } from '../../../src/types/transmedia';

describe('TransmediaCard Component', () => {
  const mockItem: TransmediaRecommendationItem = {
    franchiseName: 'The Witcher',
    sourceItem: {
      externalId: '1942',
      domain: 'game',
      title: 'The Witcher 3',
      userRating: 5,
    },
    targetItem: {
      externalId: 'yv_2DwAAQBAJ',
      domain: 'book',
      title: 'O Último Desejo',
      coverUrl: 'https://example.com/witcher.jpg',
      releaseYear: 1993,
      creatorOrAuthor: 'Andrzej Sapkowski',
    },
    reason: 'Porque você deu 5 estrelas ao jogo, descubra o romance original.',
    score: 96,
    isColdStart: false,
  };

  it('deve renderizar a franquia, título da obra recomendada, autor, score e justificativa', () => {
    render(<TransmediaCard item={mockItem} />);

    expect(screen.getByText('The Witcher')).toBeInTheDocument();
    expect(screen.getByText('O Último Desejo')).toBeInTheDocument();
    expect(screen.getByText('Andrzej Sapkowski')).toBeInTheDocument();
    expect(screen.getByText('96% match')).toBeInTheDocument();
    expect(screen.getByText(/"Porque você deu 5 estrelas ao jogo, descubra o romance original\."/i)).toBeInTheDocument();
  });

  it('deve disparar onSelect ao clicar no card e ao pressionar Enter (Android TV D-Pad)', () => {
    const handleSelect = vi.fn();
    render(<TransmediaCard item={mockItem} onSelect={handleSelect} />);

    const card = screen.getByRole('button', { name: /Recomendação Transmídia: O Último Desejo/i });
    fireEvent.click(card);
    expect(handleSelect).toHaveBeenCalledWith(mockItem);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledTimes(2);
  });

  it('deve disparar onQuickAdd ao clicar no botão de adicionar rápido', () => {
    const handleQuickAdd = vi.fn();
    render(<TransmediaCard item={mockItem} onQuickAdd={handleQuickAdd} />);

    const addBtn = screen.getByRole('button', { name: /Adicionar O Último Desejo ao acervo/i });
    fireEvent.click(addBtn);

    expect(handleQuickAdd).toHaveBeenCalledWith(mockItem);
  });
});
