import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MemoItem from './index';
import { Memo } from '../../types/memo';

describe('MemoItem', () => {
  const mockMemo: Memo = {
    id: '1',
    title: 'Test Memo',
    content: 'This is a test memo\nWith multiple lines',
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders memo title from first line of content', () => {
    render(<MemoItem memo={mockMemo} onClick={mockOnClick} />);
    
    expect(screen.getByText('This is a test memo')).toBeInTheDocument();
  });

  it('displays "無題のメモ" when content is empty', () => {
    const emptyMemo = { ...mockMemo, content: '' };
    render(<MemoItem memo={emptyMemo} onClick={mockOnClick} />);
    
    expect(screen.getByText('無題のメモ')).toBeInTheDocument();
  });

  it('displays "無題のメモ" when content is only whitespace', () => {
    const whitespaceOnlyMemo = { ...mockMemo, content: '   \n  \t  ' };
    render(<MemoItem memo={whitespaceOnlyMemo} onClick={mockOnClick} />);
    
    expect(screen.getByText('無題のメモ')).toBeInTheDocument();
  });

  it('formats date correctly for today', () => {
    const today = new Date();
    const todayMemo = { ...mockMemo, createdAt: today };
    
    render(<MemoItem memo={todayMemo} onClick={mockOnClick} />);
    
    const expectedTime = today.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    expect(screen.getByText(expectedTime)).toBeInTheDocument();
  });

  it('formats date correctly for this year', () => {
    const thisYear = new Date();
    thisYear.setMonth(0, 1); // January 1st of current year
    const thisYearMemo = { ...mockMemo, createdAt: thisYear };
    
    render(<MemoItem memo={thisYearMemo} onClick={mockOnClick} />);
    
    const expectedDate = thisYear.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('formats date correctly for different year', () => {
    const differentYear = new Date('2020-06-15');
    const differentYearMemo = { ...mockMemo, createdAt: differentYear };
    
    render(<MemoItem memo={differentYearMemo} onClick={mockOnClick} />);
    
    const expectedDate = differentYear.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(<MemoItem memo={mockMemo} onClick={mockOnClick} />);
    
    const memoItem = screen.getByRole('listitem');
    fireEvent.click(memoItem);
    
    expect(mockOnClick).toHaveBeenCalledWith(mockMemo);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', () => {
    render(<MemoItem memo={mockMemo} onClick={mockOnClick} />);
    
    const memoItem = screen.getByRole('listitem');
    fireEvent.keyDown(memoItem, { key: 'Enter' });
    
    expect(mockOnClick).toHaveBeenCalledWith(mockMemo);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', () => {
    render(<MemoItem memo={mockMemo} onClick={mockOnClick} />);
    
    const memoItem = screen.getByRole('listitem');
    fireEvent.keyDown(memoItem, { key: ' ' });
    
    expect(mockOnClick).toHaveBeenCalledWith(mockMemo);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick for other keys', () => {
    render(<MemoItem memo={mockMemo} onClick={mockOnClick} />);
    
    const memoItem = screen.getByRole('listitem');
    fireEvent.keyDown(memoItem, { key: 'Tab' });
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<MemoItem memo={mockMemo} onClick={mockOnClick} />);
    
    const memoItem = screen.getByRole('listitem');
    expect(memoItem).toHaveAttribute('tabIndex', '0');
    expect(memoItem).toHaveAttribute('aria-label');
    expect(memoItem.getAttribute('aria-label')).toContain('This is a test memo');
  });

  it('truncates long titles properly', () => {
    const longContentMemo = {
      ...mockMemo,
      content: 'This is a very long title that should be truncated when displayed in the memo item component'
    };
    
    render(<MemoItem memo={longContentMemo} onClick={mockOnClick} />);
    
    expect(screen.getByText('This is a very long title that should be truncated when displayed in the memo item component')).toBeInTheDocument();
  });
});