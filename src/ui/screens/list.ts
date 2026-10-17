import { loadIndex } from '../../data.ts';
import { load, update, type Mode } from '../../store.ts';
import { h } from '../dom.ts';

const STATUS: Record<string, string> = {
  briefing: '상황을 읽는 중',
  inquiry: '탐문 중',
  decision: '결정 중',
  pushback: '반론 듣는 중',
  reveal: '공개됨',
};

export function list(): HTMLElement {
  const data = load();
  const items = h('ol', { class: 'cases' }, h('li', { class: 'muted' }, '사건을 불러오는 중…'));
  loadIndex()
    .then((index) =>
      items.replaceChildren(
        ...index.map((s) => {
          const cur = data.current[s.id];
          const count = data.finished.filter((f) => f.scenarioId === s.id).length;
          const status = [cur ? STATUS[cur.phase] : '', count ? `${count}번 끝냄` : ''].filter(Boolean).join(', ');
          return h('li', null,
            h('a', { class: 'case', href: `#/play/${s.id}` },
              h('span', { class: 'case-no' }, `사건 ${s.id}`),
              h('span', { class: 'case-title' }, s.title),
              h('span', { class: 'case-hidden', 'aria-label': '나라와 연도는 가려져 있다' },
                h('span', { class: 'bar wide', 'aria-hidden': 'true' }), h('span', { class: 'bar', 'aria-hidden': 'true' }),
              ),
              status ? h('span', { class: 'case-status' }, status) : null,
            ),
          );
        }),
      ),
    )
    .catch((e) => items.replaceChildren(h('li', { class: 'error' }, `사건 목록을 불러오지 못했다: ${(e as Error).message}`)));

  const modeInput = (mode: Mode, label: string) =>
    h('label', { class: 'mode' },
      h('input', {
        type: 'radio',
        name: 'mode',
        checked: data.mode === mode,
        onchange: () => update((d) => (d.mode = mode)),
      }),
      h('span', null, label),
    );

  return h('section', { class: 'screen list' },
    h('h1', null, '이름과 연도를 가린 역사의 장면들'),
    h('p', { class: 'lede' }, '당신이 결정자다. 자문관에게 묻고, 결정하고, 가림을 걷어 실제 역사와 맞대어 본다.'),
    items,
    h('fieldset', { class: 'modes' },
      h('legend', null, '새 판의 탐문'),
      modeInput('limited', '질문 횟수 제한'),
      modeInput('unlimited', '제한 없음'),
    ),
  );
}
