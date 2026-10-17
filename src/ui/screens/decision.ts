import { h } from '../dom.ts';
import { ents, keyPanel, type PlayCtx } from '../common.ts';

export function decision(ctx: PlayCtx): HTMLElement {
  const { scenario, play } = ctx;
  const groups = new Map<string, typeof scenario.masked.decisions>();
  for (const d of scenario.masked.decisions) groups.set(d.group, [...(groups.get(d.group) ?? []), d]);
  // 빌드가 셔플한 순서 그대로가 갑·을·병·정 순서다
  const options = scenario.masked.options;
  // 위에서부터 읽으므로 기호 풀이는 목록 전체에서 처음 한 번만
  const optionGloss = new Set<string>();
  const detailGloss = new Set<string>();

  const error = h('p', { class: 'error', role: 'alert', hidden: true });
  const confirm = () => {
    const missing = !play.option
      ? '방침을 하나 골라라.'
      : !play.reason.trim()
        ? '왜 그렇게 정했는지 적어라. 공개 화면에서 실제 결정자의 논리 옆에 놓인다.'
        : '';
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
    h('h1', null, '결정'),
    keyPanel(scenario),
    h('fieldset', { class: 'options' },
      h('legend', null, '방침'),
      options.map((o) =>
        h('label', { class: `option${play.option === o.key ? ' selected' : ''}` },
          h('input', {
            type: 'radio',
            name: 'option',
            value: o.key,
            checked: play.option === o.key,
            onchange: () => ctx.commit((p) => (p.option = o.key)),
          }),
          h('span', { class: 'letter' }, o.letter ?? ''),
          h('span', { class: 'option-text' }, ...ents(scenario, o.text, { gloss: optionGloss })),
        ),
      ),
    ),
    groups.size > 0
      ? h('fieldset', { class: 'details' },
          h('legend', null, '함께 정할 것'),
          h('p', { class: 'muted' }, '고르지 않은 것도 결정이다.'),
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
                  h('span', null, ...ents(scenario, d.label, { gloss: detailGloss })),
                ),
              ),
            ),
          ),
        )
      : null,
    h('label', { class: 'reason' },
      h('span', { class: 'reason-label' }, '이렇게 정한 이유'),
      h('textarea', {
        rows: 6,
        placeholder: '무엇을 믿고, 무엇을 감수하는가',
        value: play.reason,
        oninput: (e: Event) => ctx.commit((p) => (p.reason = (e.target as HTMLTextAreaElement).value), { rerender: false }),
      }),
    ),
    error,
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: confirm }, '결정 확정'),
      h('button', { class: 'btn-text', onclick: () => ctx.commit((p) => (p.phase = 'inquiry'), { top: true }) }, '자문관에게 더 묻기'),
    ),
  );
}
