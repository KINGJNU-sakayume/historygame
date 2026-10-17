import { h } from '../dom.ts';
import { situation, type PlayCtx } from '../common.ts';

export function briefing(ctx: PlayCtx): HTMLElement {
  const { scenario, play } = ctx;
  const body = h('div', { class: 'briefing-body', hidden: true }, situation(scenario, ctx.mapSvg),
    h('p', { class: 'hint' }, play.limit === null
      ? '자문관 다섯에게 원하는 만큼 물을 수 있다.'
      : `시한이 촉박하다. 자문관에게 물을 수 있는 것은 ${play.limit}번뿐이다.`),
    h('button', {
      class: 'btn primary',
      onclick: () => ctx.commit((p) => (p.phase = 'inquiry'), { top: true }),
    }, '자문 회의를 소집한다'),
  );
  const envelope = h('div', { class: 'envelope' },
    h('div', { class: 'envelope-flap' }),
    h('p', { class: 'envelope-to' }, '친전(親展)'),
    h('p', { class: 'envelope-title' }, scenario.masked.title),
    h('button', {
      class: 'seal',
      'aria-label': '봉인을 뜯는다',
      onclick: () => {
        envelope.classList.add('opened');
        body.hidden = false;
        setTimeout(() => body.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
      },
    }, '封'),
    h('p', { class: 'envelope-hint' }, '봉인을 눌러 연다'),
  );
  return h('section', { class: 'screen briefing' }, envelope, body);
}
