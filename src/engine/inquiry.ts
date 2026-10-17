import type { AdvisorId, Card, TopicId } from '../types.ts';
import { roll } from './rng.ts';

export const DEFAULT_INQUIRY_LIMIT = 6;

export interface InquiryState {
  /** 열람한 카드 id (열람 순서) */
  opened: string[];
  /** 'advisor:topic' — 답이 없던 질문. 횟수는 차감하지 않는다. */
  unknown: string[];
}

export type InquiryResult =
  | { kind: 'card'; card: Card }
  | { kind: 'unknown' }
  | { kind: 'exhausted' }
  | { kind: 'no-more' };

export function remaining(state: InquiryState, limit: number | null): number | null {
  return limit === null ? null : Math.max(0, limit - state.opened.length);
}

export function cardsFor(dossier: Card[], advisor: AdvisorId, topic: TopicId): Card[] {
  return dossier.filter((c) => c.advisor === advisor && c.topic === topic);
}

/**
 * 자문관에게 주제를 묻는다. 상태를 바꾸지 않고 결과만 돌려준다.
 * - 해당 조합에 카드가 없으면 unknown (차감 없음)
 * - 이미 다 들은 조합이면 no-more (차감 없음)
 * - 남은 횟수가 없으면 exhausted
 */
export function ask(
  dossier: Card[],
  state: InquiryState,
  limit: number | null,
  advisor: AdvisorId,
  topic: TopicId,
): InquiryResult {
  const cards = cardsFor(dossier, advisor, topic);
  if (cards.length === 0) return { kind: 'unknown' };
  const next = cards.find((c) => !state.opened.includes(c.id));
  if (!next) return { kind: 'no-more' };
  if (remaining(state, limit) === 0) return { kind: 'exhausted' };
  return { kind: 'card', card: next };
}

export function applyResult(
  state: InquiryState,
  advisor: AdvisorId,
  topic: TopicId,
  result: InquiryResult,
): InquiryState {
  if (result.kind === 'card') return { ...state, opened: [...state.opened, result.card.id] };
  if (result.kind === 'unknown') {
    const key = `${advisor}:${topic}`;
    return state.unknown.includes(key) ? state : { ...state, unknown: [...state.unknown, key] };
  }
  return state;
}

/** 이번 판에서 이 카드가 오보로 나오는지. 판 시드에 고정되어 새로고침해도 같다. */
export function isMisreported(card: Card, playSeed: string): boolean {
  if (!card.misreport) return false;
  return roll(playSeed, card.id) < 1 - card.reliability;
}

export function reportText(card: Card, playSeed: string): string {
  return isMisreported(card, playSeed) ? card.misreport! : card.text;
}
