import { describe, expect, it } from 'vitest';
import { compare } from '../src/engine/compare.ts';

const reveal = {
  actual_choice: 'flee',
  decisions: {
    a: { did: true, note: '했다' },
    b: { did: false, note: '안 했다' },
    c: { did: null, note: '기록 없음' },
  },
};

describe('compare', () => {
  it('세부 결정 순서대로 같음·다름·모름을 매긴다', () => {
    const c = compare(['a', 'b', 'c'], 'flee', ['a', 'b'], reveal);
    expect(c.sameOption).toBe(true);
    expect(c.rows.map((r) => r.agreement)).toEqual(['same', 'different', 'unknown']);
    expect(c.same).toBe(1);
    expect(c.known).toBe(2);
  });

  it('고르지 않은 것도 판단으로 센다', () => {
    const c = compare(['a', 'b'], 'stay', [], reveal);
    expect(c.sameOption).toBe(false);
    expect(c.rows.map((r) => r.agreement)).toEqual(['different', 'same']);
  });
});
