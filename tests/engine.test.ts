import { describe, expect, it } from 'vitest';
import { applyResult, ask, isMisreported, reportText, type InquiryState } from '../src/engine/inquiry.ts';
import { triggeredPushbacks } from '../src/engine/pushback.ts';
import { roll, shuffle } from '../src/engine/rng.ts';
import { tagsForChoice } from '../src/engine/tags.ts';
import type { Scenario } from '../src/types.ts';
import fixture from './fixtures/scenarios/900/scenario.json';

const s = fixture as unknown as Scenario;
const empty: InquiryState = { opened: [], unknown: [] };

describe('rng', () => {
  it('같은 시드면 같은 순서로 섞는다', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(shuffle(items, 'x')).toEqual(shuffle(items, 'x'));
    expect(shuffle(items, 'x').sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('시드가 다르면 대체로 다른 순서', () => {
    const items = ['a', 'b', 'c', 'd'];
    const orders = new Set(['1', '2', '3', '4', '5', '6'].map((k) => shuffle(items, k).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });
  it('roll은 [0,1) 범위', () => {
    for (let i = 0; i < 100; i++) {
      const r = roll('seed', String(i));
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});

describe('inquiry', () => {
  it('같은 조합의 카드를 순서대로 준다', () => {
    const r1 = ask(s.dossier, empty, 3, 'general', 'military');
    expect(r1).toMatchObject({ kind: 'card', card: { id: 'c01' } });
    const st = applyResult(empty, 'general', 'military', r1);
    expect(ask(s.dossier, st, 3, 'general', 'military')).toMatchObject({ kind: 'card', card: { id: 'c02' } });
  });
  it('카드가 없으면 알 수 없음, 횟수 차감 없음', () => {
    const r = ask(s.dossier, empty, 3, 'chamberlain', 'lineage');
    expect(r.kind).toBe('unknown');
    const st = applyResult(empty, 'chamberlain', 'lineage', r);
    expect(st.opened).toEqual([]);
    expect(st.unknown).toEqual(['chamberlain:lineage']);
  });
  it('다 들은 조합은 no-more', () => {
    const st = { opened: ['c05'], unknown: [] };
    expect(ask(s.dossier, st, null, 'finance', 'finance').kind).toBe('no-more');
  });
  it('제한 횟수를 다 쓰면 exhausted, 무제한이면 계속', () => {
    const st = { opened: ['c01', 'c02', 'c05'], unknown: [] };
    expect(ask(s.dossier, st, 3, 'foreign', 'ally').kind).toBe('exhausted');
    expect(ask(s.dossier, st, null, 'foreign', 'ally').kind).toBe('card');
  });
  it('오보는 판 시드로 고정되고, misreport가 없으면 항상 사실', () => {
    const c03 = s.dossier.find((c) => c.id === 'c03')!;
    const c01 = s.dossier.find((c) => c.id === 'c01')!;
    const seeds = Array.from({ length: 200 }, (_, i) => `play${i}`);
    const mis = seeds.filter((seed) => isMisreported(c03, seed)).length;
    expect(mis).toBeGreaterThan(60); // reliability 0.5 → 대략 절반
    expect(mis).toBeLessThan(140);
    expect(seeds.some((seed) => isMisreported(c01, seed))).toBe(false);
    expect(reportText(c03, 'play1')).toBe(reportText(c03, 'play1'));
  });
});

describe('pushback', () => {
  const ids = (option: string, details: string[]) => triggeredPushbacks(s.pushbacks, option, details).map((p) => p.id);
  it('선택지와 세부 결정 조합으로 발동한다', () => {
    expect(ids('flee', [])).toEqual(['p_flee_envoy']);
    expect(ids('flee', ['envoy_release'])).toEqual([]);
    expect(ids('fight', [])).toEqual(['p_fight_nomob']);
    expect(ids('fight', ['mobilize'])).toEqual([]);
    expect(ids('wait', ['envoy_detain'])).toEqual(['p_detain']);
    expect(ids('flee', ['envoy_detain'])).toEqual(['p_detain']);
  });
});

describe('tags', () => {
  it('선택지와 세부 결정 태그를 합친다', () => {
    expect(tagsForChoice(s.tags, 'fight', ['mobilize', 'envoy_detain']).sort()).toEqual(['명분', '위험선호'].sort());
  });
});
