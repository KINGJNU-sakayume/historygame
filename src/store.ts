// 판단 기록 저장소. 브라우저 localStorage에 두고, JSON 내보내기·가져오기로 백업한다.
import type { InquiryState } from './engine/inquiry.ts';

export type Phase = 'briefing' | 'inquiry' | 'decision' | 'pushback' | 'reveal';
export type Mode = 'limited' | 'unlimited';

export interface Play {
  playId: string;
  scenarioId: string;
  /** 오보 판정용 판 시드 */
  seed: string;
  /** null = 무제한 */
  limit: number | null;
  phase: Phase;
  inquiry: InquiryState;
  option: string | null;
  details: string[];
  reason: string;
  afterthought: string;
  pushbackIndex: number;
  /** 확정 후 붙는 성향 태그 */
  tags: string[];
  startedAt: string;
  finishedAt?: string;
}

export interface Data {
  version: 1;
  mode: Mode;
  /** 시나리오별 진행 중(또는 공개 화면에 머문) 판 */
  current: Record<string, Play>;
  /** 끝난 판 기록 (성향 페이지용) */
  finished: Play[];
}

const KEY = 'hjg:v1';
const empty = (): Data => ({ version: 1, mode: 'limited', current: {}, finished: [] });

export function isData(x: unknown): x is Data {
  const d = x as Data;
  return !!d && d.version === 1 && typeof d.current === 'object' && Array.isArray(d.finished);
}

export function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return isData(parsed) ? parsed : empty();
  } catch {
    return empty();
  }
}

export function save(data: Data): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function update(fn: (d: Data) => void): Data {
  const d = load();
  fn(d);
  save(d);
  return d;
}

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function newPlay(scenarioId: string, limit: number | null): Play {
  return {
    playId: randomId(),
    scenarioId,
    seed: randomId(),
    limit,
    phase: 'briefing',
    inquiry: { opened: [], unknown: [] },
    option: null,
    details: [],
    reason: '',
    afterthought: '',
    pushbackIndex: 0,
    tags: [],
    startedAt: new Date().toISOString(),
  };
}

/** 가져온 기록을 합친다: 끝난 판은 playId 기준으로 더하고, 진행 중인 판은 지금 브라우저 것을 둔다. */
export function merge(into: Data, incoming: Data): Data {
  const seen = new Set(into.finished.map((p) => p.playId));
  return { ...into, finished: [...into.finished, ...incoming.finished.filter((p) => !seen.has(p.playId))] };
}
