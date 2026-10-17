import type { Reveal } from '../types.ts';

export type Agreement = 'same' | 'different' | 'unknown';

export interface CompareRow {
  id: string;
  mine: boolean;
  actual: boolean | null;
  note: string;
  agreement: Agreement;
}

export interface Comparison {
  sameOption: boolean;
  rows: CompareRow[];
  /** 실제 기록이 있는 행 가운데 같은 판단 수 */
  same: number;
  /** 실제 기록이 있는 행 수 */
  known: number;
}

/** 내 판단과 실제 기록을 세부 결정 순서대로 맞대어 본다. 점수가 아니라 비교다. */
export function compare(
  decisionIds: readonly string[],
  option: string | null,
  details: readonly string[],
  reveal: Pick<Reveal, 'actual_choice' | 'decisions'>,
): Comparison {
  const rows = decisionIds.map((id): CompareRow => {
    const fact = reveal.decisions[id];
    const mine = details.includes(id);
    const actual = fact?.did ?? null;
    return {
      id,
      mine,
      actual,
      note: fact?.note ?? '',
      agreement: actual === null ? 'unknown' : actual === mine ? 'same' : 'different',
    };
  });
  const known = rows.filter((r) => r.agreement !== 'unknown');
  return {
    sameOption: option === reveal.actual_choice,
    rows,
    same: known.filter((r) => r.agreement === 'same').length,
    known: known.length,
  };
}
