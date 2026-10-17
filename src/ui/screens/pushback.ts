import { triggeredPushbacks } from '../../engine/pushback.ts';
import { tagsForChoice } from '../../engine/tags.ts';
import { update } from '../../store.ts';
import { h, paragraphs } from '../dom.ts';
import { ADVISOR_LABEL } from '../labels.ts';
import { decisionLabel, optionLabel, telegram, type PlayCtx } from '../common.ts';

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
    h('h2', null, '봉인 전 이의 제기'),
    telegram({ from: '당신의 결정', cls: 'mine' },
      h('p', null, h('strong', null, optionLabel(scenario, play.option))),
      play.details.length ? h('ul', null, play.details.map((d) => h('li', null, decisionLabel(scenario, d)))) : null,
    ),
    events.length === 0
      ? h('p', { class: 'muted' }, '자문관들이 이의를 제기하지 않았다.')
      : h('div', { class: 'pushbacks' },
          h('p', { class: 'counter' }, done ? `이의 ${events.length}건을 모두 들었다` : `이의 ${i + 1} / ${events.length}`),
          events.slice(0, done ? events.length : i + 1).map((ev, n) =>
            telegram({ from: ADVISOR_LABEL[ev.advisor], subject: ev.title, stamp: '異議', cls: n === i ? 'fresh' : '' }, ...paragraphs(ev.text)),
          ),
        ),
    done
      ? h('div', { class: 'afterthought' },
          h('label', { class: 'reason' },
            h('span', { class: 'reason-label' }, '이의를 듣고 덧붙일 생각 (선택)'),
            h('textarea', {
              rows: 4,
              placeholder: '사절은? 본국 여론은? 결정은 이미 봉인되었다. 생각이 바뀌었다면 여기에 남겨라.',
              value: play.afterthought,
              oninput: (e: Event) => ctx.commit((p) => (p.afterthought = (e.target as HTMLTextAreaElement).value), { rerender: false }),
            }),
          ),
          h('button', { class: 'btn primary', onclick: finish }, '봉투를 열어 정체를 확인한다'),
        )
      : h('button', { class: 'btn primary', onclick: () => ctx.commit((p) => (p.pushbackIndex = i + 1)) },
          i + 1 < events.length ? '다음 이의' : '이의를 모두 들었다'),
  );
}
