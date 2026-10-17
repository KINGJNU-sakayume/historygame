import { h } from '../dom.ts';
import { situation, type PlayCtx } from '../common.ts';

export function briefing(ctx: PlayCtx): HTMLElement {
  const { scenario, play } = ctx;
  return h('section', { class: 'screen briefing' },
    h('h1', null, scenario.masked.title),
    situation(scenario, ctx.mapSvg),
    h('p', { class: 'limit-note' }, play.limit === null
      ? '자문관 다섯에게 원하는 만큼 물을 수 있다.'
      : `시간이 없다. 자문관에게 물을 수 있는 것은 ${play.limit}번이다.`),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => ctx.commit((p) => (p.phase = 'inquiry'), { top: true }) }, '자문 회의 열기'),
    ),
  );
}
