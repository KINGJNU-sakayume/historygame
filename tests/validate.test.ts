import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findLeaks, leakTerms, normalize } from '../scripts/lib/leak.ts';
import { loadScenarios, ROOT } from '../scripts/lib/scenarios.ts';
import { validateScenario } from '../scripts/lib/validate-lib.ts';
import type { LoadedScenario } from '../scripts/lib/scenarios.ts';

const [base] = loadScenarios(join(ROOT, 'tests/fixtures/scenarios'));
const clone = (mutate: (s: any) => void): LoadedScenario => {
  const raw = structuredClone(base.raw) as any;
  mutate(raw);
  return { ...base, raw, scenario: raw };
};

describe('validateScenario', () => {
  it('정상 픽스처는 통과', () => {
    const f = validateScenario(base);
    expect(f.errors).toEqual([]);
  });

  it('마스킹 영역에 실명이 있으면 실패', () => {
    const f = validateScenario(clone((s) => (s.masked.situation[0] = 'Testland의 국경이 위험하다.')));
    expect(f.errors.some((e) => e.includes('마스킹 누출') && e.includes('Testland'))).toBe(true);
  });

  it('악센트·대소문자가 달라도 잡는다', () => {
    const f = validateScenario(clone((s) => (s.dossier[0].text = 'FAKÉRIA 군이 온다')));
    expect(f.errors.some((e) => e.includes('Fakeria'))).toBe(true);
  });

  it('reveal 본문의 연도가 마스킹 영역에 나오면 실패', () => {
    expect(leakTerms(base.scenario.reveal)).toContain('1888');
    const f = validateScenario(clone((s) => (s.pushbacks[0].text = '1888년의 일을 기억하라')));
    expect(f.errors.some((e) => e.includes('"1888"'))).toBe(true);
  });

  it('한글 금지어는 조사가 붙어도 잡는다', () => {
    const f = validateScenario(clone((s) => (s.masked.role = '당신은 테스트랜드의 재상이다.')));
    expect(f.errors.some((e) => e.includes('테스트랜드'))).toBe(true);
  });

  it('로마자 금지어는 다른 단어 속에서는 무시하고, 한글 조사가 붙으면 잡는다', () => {
    expect(findLeaks(clone((s) => (s.masked.title = 'Rivertonian')).scenario, null)).toEqual([]);
    expect(findLeaks(clone((s) => (s.masked.title = 'Riverton은 어디인가')).scenario, null)).toHaveLength(1);
  });

  it('지도 SVG의 글자도 검사하지만 좌표는 무시한다', () => {
    const leakSvg = '<svg><path d="M 1888 0"/><text>Mockshire</text></svg>';
    const leaks = findLeaks(base.scenario, leakSvg);
    expect(leaks.map((l) => l.term)).toEqual(['Mockshire']);
  });

  it('출처(sources)는 누출 검사에서 제외', () => {
    const f = validateScenario(clone((s) => (s.dossier[0].sources[0].url = 'https://en.wikipedia.org/wiki/Testland')));
    expect(f.errors).toEqual([]);
  });

  it('reveal.sources가 비면 실패', () => {
    const f = validateScenario(clone((s) => (s.reveal.sources = [])));
    expect(f.errors.some((e) => e.includes('출처 필수'))).toBe(true);
  });

  it('스키마 위반은 실패', () => {
    const f = validateScenario(clone((s) => delete s.masked.options));
    expect(f.errors.some((e) => e.includes('스키마'))).toBe(true);
  });

  it('없는 선택지·세부 결정을 가리키면 실패', () => {
    const f = validateScenario(
      clone((s) => {
        s.pushbacks[0].when.option = ['nope'];
        s.reveal.decisions.ghost = { did: true, note: '없는 결정' };
      }),
    );
    expect(f.errors.some((e) => e.includes('"nope"'))).toBe(true);
    expect(f.errors.some((e) => e.includes('"ghost"'))).toBe(true);
  });

  it('세부 결정마다 실제 기록이 있어야 한다', () => {
    const f = validateScenario(clone((s) => delete s.reveal.decisions.mobilize));
    expect(f.errors.some((e) => e.includes('"mobilize"'))).toBe(true);
  });

  it('선언한 인물 이미지 파일이 없으면 실패', () => {
    const f = validateScenario(clone((s) => (s.reveal.figures[0].image = 'nobody.jpg')));
    expect(f.errors.some((e) => e.includes('figures/nobody.jpg'))).toBe(true);
  });

  it('정의되지 않은 대문자 기호는 경고', () => {
    const f = validateScenario(clone((s) => (s.dossier[0].text = 'G의 병력이 우리보다 두 배 많다.')));
    expect(f.errors).toEqual([]);
    expect(f.warnings.some((w) => w.includes('"G"'))).toBe(true);
  });

  it('세력 기호는 대문자 한 글자, self는 하나만', () => {
    expect(validateScenario(clone((s) => (s.masked.entities[1].id = 'BB'))).errors.some((e) => e.includes('스키마'))).toBe(true);
    expect(validateScenario(clone((s) => (s.masked.entities[1].self = true))).errors.some((e) => e.includes('self'))).toBe(true);
  });

  it('축 밖 태그는 경고만', () => {
    const f = validateScenario(clone((s) => (s.tags.options.fight = ['낭만'])));
    expect(f.errors).toEqual([]);
    expect(f.warnings.some((w) => w.includes('낭만'))).toBe(true);
  });

  it('docs의 시나리오 템플릿은 스키마와 맞는다', () => {
    const raw = JSON.parse(readFileSync(join(ROOT, 'docs/templates/scenario.template.json'), 'utf8'));
    const f = validateScenario({ ...base, dirName: raw.id, raw, scenario: raw, svg: null });
    expect(f.errors.filter((e) => e.includes('스키마'))).toEqual([]);
  });

  it('normalize는 악센트를 떼고 한글은 보존', () => {
    expect(normalize('João Lisbôa')).toBe('joao lisboa');
    expect(normalize('포르투갈')).toBe('포르투갈');
  });
});
