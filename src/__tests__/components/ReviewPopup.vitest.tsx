import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPopup } from '../../components/ReviewPopup';
import { Card } from '../../lib/types';

const mockCards: Card[] = [
  {
    id: '1',
    deckId: 'd1',
    front: 'Front 1',
    back: 'Back 1',
    source: 'default',
    createdAt: '',
    updatedAt: ''
  },
  {
    id: '2',
    deckId: 'd1',
    front: 'Front 2',
    back: 'Back 2',
    source: 'default',
    createdAt: '',
    updatedAt: ''
  }
];

describe('ReviewPopup', () => {
  it('renders empty state when no cards', () => {
    render(<ReviewPopup cards={[]} onReview={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText('No cards due!')).toBeDefined();
  });

  it('renders first card front initially', () => {
    render(<ReviewPopup cards={mockCards} onReview={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText('Front 1')).toBeDefined();
    expect(screen.queryByText('Back 1')).toBeNull();
  });

  it('reveals back on button click', () => {
    render(<ReviewPopup cards={mockCards} onReview={() => {}} onDismiss={() => {}} />);
    const revealBtn = screen.getByText(/Show Answer/i);
    fireEvent.click(revealBtn);
    expect(screen.getByText('Back 1')).toBeDefined();
    expect(screen.getByText('Easy')).toBeDefined();
  });

  it('calls onReview and advances to next card', () => {
    const handleReview = vi.fn();
    render(<ReviewPopup cards={mockCards} onReview={handleReview} onDismiss={() => {}} />);
    
    fireEvent.click(screen.getByText(/Show Answer/i));
    
    fireEvent.click(screen.getByText('Good'));
    
    expect(handleReview).toHaveBeenCalledWith('1', 3);
    
    expect(screen.getByText('Front 2')).toBeDefined();
  });

  it('shows completion state after last card', () => {
    const handleReview = vi.fn();
    const singleCard = [mockCards[0]];
    render(<ReviewPopup cards={singleCard} onReview={handleReview} onDismiss={() => {}} />);
    
    fireEvent.click(screen.getByText(/Show Answer/i));
    fireEvent.click(screen.getByText('Good'));
    
    expect(screen.getByText('No cards due!')).toBeDefined();
  });
});
