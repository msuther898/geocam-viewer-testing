export interface Card {
  id: string;
  title: string;
  description: string;
  notes: string;
  createdAt: string;
  columnId: string;
  order: number;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  color: string;
}

export interface Board {
  columns: Column[];
  cards: Card[];
}

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'todo', title: 'TODO', order: 0, color: '#f59e0b' },
  { id: 'in-progress', title: 'In Progress', order: 1, color: '#3b82f6' },
  { id: 'completed', title: 'Completed', order: 2, color: '#22c55e' },
];

export const DEFAULT_BOARD: Board = {
  columns: DEFAULT_COLUMNS,
  cards: [],
};
