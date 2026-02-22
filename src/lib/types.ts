export type Algorithm = "sm2" | "leitner";

export type Rating = 1 | 2 | 3 | 4;

export type ResponseType = "rated" | "no_response" | "skipped";

export type CardSource = "default" | "collinsdictionary";

export interface Deck {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  source: CardSource;
  createdAt: string;
  updatedAt: string;
}

export interface CardSchedulingState {
  id: string;
  cardId: string;
  algorithm: Algorithm;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  boxIndex: number;
  dueAt: string;
  lastReviewedAt: string | null;
  lapseCount: number;
  reviewCount: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  reviewedAt: string;
  rating: Rating;
  responseType: ResponseType;
  elapsedMs: number;
}

export interface Settings {
  key: string;
  value: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ImportResult {
  decksImported: number;
  cardsImported: number;
  reviewLogsImported: number;
  settingsImported: number;
  replacedExistingData: boolean;
  deckNameConflictsResolved: number;
}
