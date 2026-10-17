import type { Play } from '../store.ts';
import type { PublicScenario } from '../types.ts';
import { crest } from './crest.ts';
import { h, paragraphs, type Child } from './dom.ts';

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

export function optionLabel(scenario: PublicScenario, key: string | null): string {
  const o = optionOf(scenario, key);
  return o ? `${o.letter}. ${o.text}` : '—';
}

export function decisionLabel(scenario: PublicScenario, id: string): string {
  return scenario.masked.decisions.find((d) => d.id === id)?.label ?? id;
}

/** 전문(電文) 모양 상자 */
export function telegram(opts: { from?: string; subject?: string; stamp?: string; cls?: string }, ...body: Child[]) {
  return h(
    'article',
    { class: `telegram ${opts.cls ?? ''}` },
    opts.from || opts.subject
      ? h(
          'header',
          { class: 'telegram-head' },
          opts.from ? h('span', { class: 'telegram-from' }, opts.from) : null,
          opts.subject ? h('span', { class: 'telegram-subject' }, opts.subject) : null,
          opts.stamp ? h('span', { class: 'stamp' }, opts.stamp) : null,
        )
      : null,
    h('div', { class: 'telegram-body' }, ...body),
  );
}

export function entityLegend(scenario: PublicScenario, names?: Record<string, string>) {
  return h(
    'ul',
    { class: 'legend' },
    scenario.masked.entities.map((e) =>
      h(
        'li',
        null,
        crest(e.crest, 36),
        h('span', { class: 'legend-id' }, `${e.id}`),
        h('span', { class: 'legend-label' }, e.label),
        names?.[e.id] ? h('span', { class: 'legend-real' }, `→ ${names[e.id]}`) : null,
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
    telegram(
      { from: '극비 전문', subject: scenario.masked.title, stamp: '機密' },
      h('p', { class: 'role' }, scenario.masked.role),
      ...scenario.masked.situation.flatMap((p) => paragraphs(p)),
    ),
    map,
    entityLegend(scenario),
  );
}

export function phaseNav(current: Play['phase']) {
  const steps: [Play['phase'], string][] = [
    ['briefing', '브리핑'],
    ['inquiry', '탐문'],
    ['decision', '판단'],
    ['pushback', '반론'],
    ['reveal', '공개'],
  ];
  const idx = steps.findIndex(([p]) => p === current);
  return h(
    'ol',
    { class: 'phases', 'aria-label': '진행 단계' },
    steps.map(([, label], i) =>
      h('li', { class: i < idx ? 'done' : i === idx ? 'now' : '', 'aria-current': i === idx ? 'step' : undefined }, label),
    ),
  );
}
