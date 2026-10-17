import type { Play } from '../store.ts';
import type { PublicScenario } from '../types.ts';
import { h, type Child } from './dom.ts';
import { tally } from './tally.ts';

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
  const ids = scenario.masked.entities.map((e) => e.id);
  if (ids.length === 0) return null;
  return new RegExp(`(?<![A-Za-z0-9])(${ids.join('|')})(?![A-Za-z0-9])`, 'g');
}

export interface EntOpts {
  /** 공개 화면: 기호 대신 실명(작은 기호 첨자와 함께) */
  names?: Record<string, string>;
  /** 이 묶음(보고 한 건, 선택지 하나 …)에서 이미 풀이를 단 기호. 처음 나오는 기호에만 풀이를 붙인다. */
  gloss?: Set<string>;
}

/** 첫 언급 풀이용 짧은 설명. 플레이어의 나라는 '우리'. */
function glossOf(scenario: PublicScenario, id: string): string {
  const e = scenario.masked.entities.find((x) => x.id === id);
  return e?.self ? '우리' : (e?.label ?? id);
}

/** 본문 속 세력 기호(A, B …)를 표시한다. 가리지 않고 기호로 치환된 글자 그대로 보여 준다. */
export function ents(scenario: PublicScenario, text: string, opts: EntOpts = {}): Child[] {
  const re = entityPattern(scenario);
  if (!re) return [text];
  const out: Child[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    out.push(text.slice(last, m.index));
    const id = m[1];
    const self = scenario.masked.entities.find((e) => e.id === id)?.self ? ' self' : '';
    if (opts.names?.[id]) {
      out.push(h('span', { class: `ent named${self}` }, opts.names[id], h('sup', null, id)));
    } else {
      out.push(h('span', { class: `ent${self}`, title: glossOf(scenario, id) }, id));
      if (opts.gloss && !opts.gloss.has(id)) {
        opts.gloss.add(id);
        out.push(h('span', { class: 'gloss' }, `(${glossOf(scenario, id)})`));
      }
    }
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

/** 빈 줄로 나눈 문단. opts.gloss는 문단들 사이에 이어진다. */
export function prose(scenario: PublicScenario, text: string, opts: EntOpts = {}): HTMLElement[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => h('p', null, ...ents(scenario, p, opts)));
}

export function optionText(scenario: PublicScenario, key: string | null, opts: EntOpts = {}): Child[] {
  const o = optionOf(scenario, key);
  if (!o) return ['—'];
  return [h('span', { class: 'letter' }, o.letter ?? ''), ...ents(scenario, o.text, opts)];
}

export function decisionText(scenario: PublicScenario, id: string, opts: EntOpts = {}): Child[] {
  return ents(scenario, decisionLabel(scenario, id), opts);
}

export function legend(scenario: PublicScenario, names?: Record<string, string>) {
  return h(
    'dl',
    { class: 'legend' },
    scenario.masked.entities.map((e) =>
      h('div', null,
        h('dt', null, h('span', { class: `ent${e.self ? ' self' : ''}` }, e.id)),
        h('dd', null,
          ...ents(scenario, e.label),
          e.self ? h('span', { class: 'gloss' }, '(당신의 나라)') : null,
          names?.[e.id] ? h('strong', null, names[e.id]) : null,
        ),
      ),
    ),
  );
}

/** 탐문·결정·반론 화면에서 언제든 펼쳐 보는 기호 풀이 */
export function keyPanel(scenario: PublicScenario) {
  return h('details', { class: 'key' }, h('summary', null, '기호 풀이'), legend(scenario));
}

/** 저장소에 커밋된 자체 SVG(빌드 시 복사)만 넣는다 */
export function svgFigure(svg: string | null, cls = 'map'): HTMLElement | null {
  if (!svg) return null;
  const fig = h('figure', { class: cls });
  fig.innerHTML = svg;
  return fig;
}

/** 상황 글과 관계도. 넓은 화면에서는 글 | 그림 두 칸이 된다. */
export function situation(scenario: PublicScenario, mapSvg: string | null) {
  return h(
    'div',
    { class: 'situation' },
    h('div', { class: 'situation-text' },
      h('p', { class: 'role' }, ...ents(scenario, scenario.masked.role)),
      ...scenario.masked.situation.flatMap((p) => prose(scenario, p)),
    ),
    h('div', { class: 'situation-figure' }, svgFigure(mapSvg), legend(scenario)),
  );
}

/**
 * 왼쪽 사건 레일. 넓은 화면에서는 사건 정보·단계·남은 질문·기호표·관계도를 늘 보여 주고,
 * 좁은 화면에서는 단계 표시만 남는다(나머지는 각 화면 안의 도구가 맡는다).
 */
export function caseRail(ctx: PlayCtx): HTMLElement {
  const { scenario, play } = ctx;
  const showMap = play.phase !== 'briefing';
  return h('aside', { class: 'rail', 'aria-label': '사건 요약' },
    h('div', { class: 'rail-wide' },
      h('p', { class: 'rail-case' }, `사건 ${scenario.id}`),
      h('p', { class: 'rail-title' }, scenario.masked.title),
    ),
    phaseNav(play.phase),
    h('div', { class: 'rail-wide' },
      play.phase === 'inquiry' || play.phase === 'decision' ? tally(play.limit, play.inquiry.opened.length) : null,
      h('h2', { class: 'rail-h' }, '기호 풀이'),
      legend(scenario),
      showMap ? svgFigure(ctx.mapSvg, 'map rail-map') : null,
    ),
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
