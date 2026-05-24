import Store from 'electron-store';
import { randomUUID } from 'crypto';
import type { GenerationHistoryItem } from '../../shared/ipc-types';

const store = new Store<{ generationHistory: GenerationHistoryItem[] }>({
  defaults: { generationHistory: [] },
});

function getHistory(): GenerationHistoryItem[] {
  return store.get('generationHistory', []);
}

function setHistory(history: GenerationHistoryItem[]): void {
  store.set('generationHistory', history);
}

export function listHistory(): GenerationHistoryItem[] {
  return getHistory();
}

export function getById(id: string): GenerationHistoryItem | undefined {
  return getHistory().find((item) => item.id === id);
}

export function create(
  data: Omit<GenerationHistoryItem, 'id' | 'createdAt' | 'updatedAt'>
): GenerationHistoryItem {
  const now = new Date().toISOString();
  const item: GenerationHistoryItem = {
    ...data,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  const history = getHistory();
  history.unshift(item);
  setHistory(history);

  return item;
}

export function updateByJobId(
  jobId: string,
  patch: Partial<Omit<GenerationHistoryItem, 'id' | 'createdAt'>>
): GenerationHistoryItem | undefined {
  const history = getHistory();
  const idx = history.findIndex((item) => item.jobId === jobId);
  if (idx === -1) return undefined;

  history[idx] = {
    ...history[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  setHistory(history);
  return history[idx];
}

export function deleteFromHistory(id: string): void {
  setHistory(getHistory().filter((item) => item.id !== id));
}
