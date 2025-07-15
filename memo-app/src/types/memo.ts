// TypeScript type definitions for memo data structures
export interface Memo {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoState {
  memos: Memo[];
  currentMemo: Memo | null;
  isEditing: boolean;
}

export interface StorageData {
  memos: Memo[];
  version: string;
}