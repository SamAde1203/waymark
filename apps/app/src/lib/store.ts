import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { FactCard } from "@waymark/shared";

/**
 * All study state lives on the device. No account is needed; nothing here is
 * personal beyond study progress and the optional test date.
 */
export interface AnswerRecord {
  itemId: string;
  factId: string;
  chapter: number;
  correct: boolean;
  /** First time this item was answered (unseen items are the honest readiness signal). */
  firstAttempt: boolean;
  mode: "review" | "learn" | "mock" | "diagnostic" | "mistakes";
  at: string;
}

export interface MockRecord {
  id: string;
  at: string;
  score: number;
  total: number;
  seconds: number;
  itemIds: string[];
  answers: Record<string, string[]>;
  byChapter: Record<number, { correct: number; total: number }>;
}

export interface State {
  version: 1;
  onboarded: boolean;
  examDate: string | null; // YYYY-MM-DD
  minutesPerDay: number;
  cards: Record<string, FactCard>;
  log: AnswerRecord[];
  mocks: MockRecord[];
  flagged: string[];
  /** item ids answered wrongly and not yet answered right since */
  mistakes: string[];
  unlocked: boolean;
}

const KEY = "waymark:v1";

const initial: State = {
  version: 1,
  onboarded: false,
  examDate: null,
  minutesPerDay: 20,
  cards: {},
  log: [],
  mocks: [],
  flagged: [],
  mistakes: [],
  unlocked: false,
};

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

export async function loadState(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = { ...initial, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    // Storage can be unavailable (private browsing); the app still works for this session.
  }
  loaded = true;
  listeners.forEach((l) => l());
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, 150);
}

export function getState(): State {
  return state;
}

export function setState(update: (s: State) => State): void {
  state = update(state);
  persist();
  listeners.forEach((l) => l());
}

export function resetState(): void {
  setState(() => ({ ...initial }));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}

export function useLoaded(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => loaded);
}
