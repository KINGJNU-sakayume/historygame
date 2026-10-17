import { triggeredPushbacks } from '../../engine/pushback.ts';
import { tagsForChoice } from '../../engine/tags.ts';
import { update } from '../../store.ts';
import { h } from '../dom.ts';
import { ADVISOR_LABEL } from '../labels.ts';
import { decisionText, optionText, prose, redacted, type PlayCtx } from '../common.ts';

export function pushback(ctx: PlayCtx): HTMLElement {
  const { scenario, play } = ctx;
  const events = triggeredPushbacks(scenario.pushbacks, play.option ?? '', play.details);
  const i = Math.min(play.pushbackIndex, events.length);
  const done = i >= events.length;

  const finish = () => {
    ctx.commit((p) => {
      p.tags = tagsForChoice(scenario.tags, p.option ?? '', p.details);
      p.finishedAt = new Date().toISOString();
      p.phase = 'reveal';
    }, { rerender: false });
    // 끝난 판을 기록에 남긴다 (같은 판이 두 번 들어가지 않게)
    update((d) => {
      const finished = d.current[scenario.id];
      if (finished && !d.finished.some((f) => f.playId === finished.playId)) d.finished.push(structuredClone(finished));
    });
    ctx.commit(() => {}, { top: true });
  };

  return h(
    'section',
    { class: 'screen pushback' },
    h('h1', null, '확정 전 반론'),
    h('div', { class: 'mine' },
      h('p', { class: 'mine-choice' }, ...optionText(scenario, play.option)),
      play.details.length ? h('ul', null, play.details.map((d) => h('li', null, ...decisionText(scenario, d)))) : null,
    ),
    events.length === 0
      ? h('p', { class: 'muted' }, '자문관들은 반대하지 않았다.')
      : h('ol', { class: 'objections' },
          events.slice(0, done ? events.length : i + 1).map((ev, n) =>
            h('li', { class: `objection${n === i ? ' fresh' : ''}` },
              h('p', { class: 'objection-who' }, ADVISOR_LABEL[ev.advisor]),
              h('h3', null, ...redacted(scenario, ev.title)),
              h('blockquote', null, ...prose(scenario, ev.text)),
            ),
          ),
        ),
    done
      ? h('div', { class: 'afterthought' },
          h('label', { class: 'reason' },
            h('span', { class: 'reason-label' }, '반론을 듣고 덧붙일 생각 (선택)'),
            h('textarea', {
              rows: 4,
              placeholder: '결정은 바꿀 수 없다. 생각이 달라졌다면 여기에 남겨라.',
              value: play.afterthought,
              oninput: (e: Event) => ctx.commit((p) => (p.afterthought = (e.target as HTMLTextAreaElement).value), { rerender: false }),
            }),
          ),
          h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: finish }, '정체 공개')),
        )
      : h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => ctx.commit((p) => (p.pushbackIndex = i + 1)) },
            i + 1 < events.length ? '다음 반론' : '반론 다 들음'),
        ),
  );
}
