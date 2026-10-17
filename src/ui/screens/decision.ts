import { h } from '../dom.ts';
import { type PlayCtx } from '../common.ts';

export function decision(ctx: PlayCtx): HTMLElement {
  const { scenario, play } = ctx;
  const groups = new Map<string, typeof scenario.masked.decisions>();
  for (const d of scenario.masked.decisions) groups.set(d.group, [...(groups.get(d.group) ?? []), d]);
  const options = scenario.masked.options.slice().sort((a, b) => (a.letter ?? '').localeCompare(b.letter ?? ''));

  const error = h('p', { class: 'error', role: 'alert', hidden: true });
  const seal = () => {
    const missing = !play.option ? '큰 방침을 하나 고르라.' : !play.reason.trim() ? '왜 그렇게 판단했는지 적어라. 공개 때 실제 인물의 논리와 나란히 놓인다.' : '';
    if (missing) {
      error.textContent = missing;
      error.hidden = false;
      return;
    }
    ctx.commit((p) => {
      p.phase = 'pushback';
      p.pushbackIndex = 0;
    }, { top: true });
  };

  return h(
    'section',
    { class: 'screen decision' },
    h('h2', null, '어전 회의 — 결정'),
    h('fieldset', { class: 'options' },
      h('legend', null, '큰 방침'),
      options.map((o) =>
        h('label', { class: `option ${play.option === o.key ? 'selected' : ''}` },
          h('input', {
            type: 'radio',
            name: 'option',
            value: o.key,
            checked: play.option === o.key,
            onchange: () => ctx.commit((p) => (p.option = o.key)),
          }),
          h('span', { class: 'option-letter' }, o.letter ?? ''),
          h('span', { class: 'option-text' }, o.text),
        ),
      ),
    ),
    groups.size > 0
      ? h('fieldset', { class: 'details' },
          h('legend', null, '세부 결정'),
          h('p', { class: 'muted' }, '필요한 것만 고르라. 고르지 않은 것도 결정이다.'),
          [...groups].map(([group, items]) =>
            h('div', { class: 'detail-group' },
              h('h3', null, group),
              items.map((d) =>
                h('label', { class: 'check' },
                  h('input', {
                    type: 'checkbox',
                    checked: play.details.includes(d.id),
                    onchange: (e: Event) => {
                      const on = (e.target as HTMLInputElement).checked;
                      ctx.commit((p) => {
                        p.details = on ? [...p.details.filter((x) => x !== d.id), d.id] : p.details.filter((x) => x !== d.id);
                      }, { rerender: false });
                    },
                  }),
                  h('span', null, d.label),
                ),
              ),
            ),
          ),
        )
      : null,
    h('label', { class: 'reason' },
      h('span', { class: 'reason-label' }, '판단의 이유'),
      h('textarea', {
        rows: 6,
        placeholder: '무엇을 근거로, 무엇을 감수하고 이 길을 택하는가',
        value: play.reason,
        oninput: (e: Event) => ctx.commit((p) => (p.reason = (e.target as HTMLTextAreaElement).value), { rerender: false }),
      }),
    ),
    error,
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => ctx.commit((p) => (p.phase = 'inquiry'), { top: true }) }, '자문관에게 더 묻기'),
      h('button', { class: 'btn primary', onclick: seal }, '결정을 봉인한다'),
    ),
  );
}
