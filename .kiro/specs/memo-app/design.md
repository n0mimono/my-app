# Design Document

## Overview

フロントエンドのみで動作するメモ帳アプリケーション。React + TypeScript + Viteを使用し、ローカルストレージでデータを永続化する。シンプルなコンポーネント構成で、保守性と拡張性を重視した設計とする。

## Architecture

### Technology Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules + modern CSS features
- **State Management**: React hooks (useState, useEffect, useContext)
- **Data Persistence**: Browser LocalStorage API
- **Testing**: Vitest + React Testing Library

### Application Structure
```
src/
├── components/           # Reusable UI components
│   ├── MemoList/        # Memo list display
│   ├── MemoEditor/      # Memo editing interface
│   ├── MemoItem/        # Individual memo item
│   └── Layout/          # App layout wrapper
├── hooks/               # Custom React hooks
│   ├── useMemos.ts      # Memo data management
│   └── useLocalStorage.ts # LocalStorage abstraction
├── types/               # TypeScript type definitions
│   └── memo.ts          # Memo data types
├── utils/               # Utility functions
│   └── storage.ts       # Storage helper functions
└── App.tsx              # Main application component
```

## Components and Interfaces

### Core Data Types
```typescript
interface Memo {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoState {
  memos: Memo[];
  currentMemo: Memo | null;
  isEditing: boolean;
}
```

### Component Hierarchy
```
App
├── Layout
│   ├── Header (app title, new memo button)
│   └── Main
│       ├── MemoList (when not editing)
│       │   └── MemoItem[] (individual memo items)
│       └── MemoEditor (when editing)
│           ├── EditorHeader (save, delete, back buttons)
│           └── TextArea (memo content)
```

### Key Components

#### App Component
- Manages global application state
- Handles routing between list and editor views
- Provides memo context to child components

#### MemoList Component
- Displays all memos in a scrollable list
- Shows memo title (first line) and creation date
- Handles memo selection and deletion
- Displays empty state when no memos exist

#### MemoEditor Component
- Provides text editing interface
- Auto-saves content changes
- Handles memo creation and updates
- Provides navigation back to list

#### Custom Hooks

##### useMemos Hook
```typescript
interface UseMemos {
  memos: Memo[];
  currentMemo: Memo | null;
  createMemo: () => Memo;
  updateMemo: (id: string, content: string) => void;
  deleteMemo: (id: string) => void;
  selectMemo: (id: string) => void;
  clearSelection: () => void;
}
```

##### useLocalStorage Hook
```typescript
interface UseLocalStorage<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
}
```

## Data Models

### Memo Storage Format
```typescript
// LocalStorage key: 'memo-app-data'
interface StorageData {
  memos: Memo[];
  version: string; // for future migration support
}
```

### Data Operations
- **Create**: Generate UUID, set timestamps, add to array
- **Read**: Load from localStorage, parse JSON, validate structure
- **Update**: Find by ID, update content and timestamp
- **Delete**: Filter out by ID, update localStorage

## Error Handling

### LocalStorage Availability
- Check for localStorage support on app initialization
- Graceful degradation with in-memory storage fallback
- User notification when persistence is unavailable

### Data Corruption
- JSON parsing error handling
- Data validation on load
- Automatic recovery with empty state if data is corrupted

### User Experience
- Loading states for data operations
- Confirmation dialogs for destructive actions
- Auto-save feedback (subtle indicators)

## Testing Strategy

### Unit Tests
- Custom hooks (useMemos, useLocalStorage)
- Utility functions (storage helpers)
- Individual component logic

### Integration Tests
- Complete memo CRUD operations
- LocalStorage integration
- Component interaction flows

### User Experience Tests
- Responsive design verification
- Accessibility compliance
- Cross-browser compatibility

## Performance Considerations

### Optimization Strategies
- Debounced auto-save to reduce localStorage writes
- Virtual scrolling for large memo lists (future enhancement)
- Lazy loading of memo content for list view
- Memoization of expensive computations

### Memory Management
- Cleanup of event listeners
- Proper dependency arrays in useEffect
- Avoiding memory leaks in custom hooks

## Responsive Design

### Breakpoints
- Mobile: < 768px (single column, full-screen editor)
- Tablet: 768px - 1024px (adapted layout)
- Desktop: > 1024px (side-by-side layout option)

### Mobile-First Approach
- Touch-friendly interface elements
- Swipe gestures for navigation
- Optimized text input experience