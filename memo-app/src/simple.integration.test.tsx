import { render, screen } from '@testing-library/react';
import App from './App';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Simple Integration Test', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('renders app with empty state', () => {
    render(<App />);
    expect(screen.getByText('メモがありません')).toBeInTheDocument();
  });
});