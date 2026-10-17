import type { Play } from '../store.ts';
import type { PublicScenario } from '../types.ts';
import { h, type Child } from './dom.ts';

export interface PlayCtx {
  scenario: PublicScenario;
  play: Play;
  mapSvg: string | null;
  /** 판 상태를 바꾸고 저장한다. rerender가 true면 화면을 다시 그린다. */
  commit(fn: (p: Play) => void, opts?: { rerender?: boolean; top?: boolean }): void;
}

export function optionOf(scenario: PublicScenario, key: string | null) {
  return scenario.masked.options.find((o) => o.key === key);
}

export function decisionLabel(scenario: PublicScenario, id: string): string {
  return scenario.masked.decisions.find((d) => d.id === id)?.label ?? id;
}

function entityPattern(scenario: PublicScenario): RegExp | null {
  const ids = scenario.masked.entities.map((e) => e.id).sort((a, b) => b.length - a.length);
  if (ids.length === 0) return null;
  const alt = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`(?<![A-Za-z0-9])(${alt})(?![A-Za-z0-9])`, 'g');
}

/**
 * 본문 속 세력 기호(A, B …)를 검은 가림 막대로 바꾼다.
 * names를 주면 막대가 걷히며 실명이 드러난다(공개 화면).
 */
export function redacted(scenario: PublicScenario, text: string, names?: Record<string, string>): Child[] {
  const re = entityPattern(scenario);
  if (!re) return [text];
  const out: Child[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(re)) {
    out.push(text.slice(last, m.index));
    const id = m[1];
    const label = scenario.masked.entities.find((e) => e.id === id)?.label ?? id;
    if (names?.[id]) {
      out.push(
        h('span', { class: 'lift', style: `--i:${n++}` },
          h('span', { class: 'lift-name' }, names[id]),
          h('span', { class: 'bar', 'aria-hidden': 'true' }, id),
        ),
      );
    } else {
      out.push(h('span', { class: 'bar', title: label }, id));
    }
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

/** 빈 줄로 나눈 문단, 세력 기호는 가림 막대로 */
export function prose(scenario: PublicScenario, text: string, names?: Record<string, string>): HTMLElement[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => h('p', null, ...redacted(scenario, p, names)));
}

export function optionText(scenario: PublicScenario, key: string | null, names?: Record<string, string>): Child[] {
  const o = optionOf(scenario, key);
  if (!o) return ['—'];
  return [h('span', { class: 'letter' }, o.letter ?? ''), ...redacted(scenario, o.text, names)];
}

export function decisionText(scenario: PublicScenario, id: string, names?: Record<string, string>): Child[] {
  return redacted(scenario, decisionLabel(scenario, id), names);
}

export function legend(scenario: PublicScenario, names?: Record<string, string>) {
  return h(
    'dl',
    { class: 'legend' },
    scenario.masked.entities.map((e) =>
      h('div', null,
        h('dt', null, h('span', { class: names ? 'bar open' : 'bar' }, e.id)),
        h('dd', null, ...redacted(scenario, e.label), names?.[e.id] ? h('strong', null, names[e.id]) : null),
      ),
    ),
  );
}

export function situation(scenario: PublicScenario, mapSvg: string | null) {
  const map = mapSvg ? h('figure', { class: 'map' }) : null;
  if (map) map.innerHTML = mapSvg!; // 저장소에 커밋된 자체 파일(빌드 시 복사)만 넣는다
  return h(
    'div',
    { class: 'situation' },
    h('p', { class: 'role' }, ...redacted(scenario, scenario.masked.role)),
    ...scenario.masked.situation.flatMap((p) => prose(scenario, p)),
    map,
    legend(scenario),
  );
}

const STEPS: [Play['phase'], string][] = [
  ['briefing', '상황'],
  ['inquiry', '탐문'],
  ['decision', '결정'],
  ['pushback', '반론'],
  ['reveal', '공개'],
];

/** 다섯 단계는 실제 순서이므로 번호를 붙인다 */
export function phaseNav(current: Play['phase']) {
  const idx = STEPS.findIndex(([p]) => p === current);
  return h(
    'ol',
    { class: 'phases', 'aria-label': '진행 단계' },
    STEPS.map(([, label], i) =>
      h('li', { class: i < idx ? 'done' : i === idx ? 'now' : '', 'aria-current': i === idx ? 'step' : undefined }, label),
    ),
  );
}
