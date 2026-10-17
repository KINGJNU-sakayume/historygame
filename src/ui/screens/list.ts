import { loadIndex } from '../../data.ts';
import { load, update, type Mode } from '../../store.ts';
import { h } from '../dom.ts';

const STATUS: Record<string, string> = {
  briefing: '봉인됨',
  inquiry: '탐문 중',
  decision: '판단 중',
  pushback: '이의 청취 중',
  reveal: '공개됨',
};

export function list(): HTMLElement {
  const data = load();
  const items = h('ul', { class: 'cases' }, h('li', { class: 'muted' }, '문서함을 여는 중…'));
  loadIndex()
    .then((index) =>
      items.replaceChildren(
        ...index.map((s) => {
          const cur = data.current[s.id];
          const count = data.finished.filter((f) => f.scenarioId === s.id).length;
          return h('li', null,
            h('a', { class: 'case', href: `#/play/${s.id}` },
              h('span', { class: 'case-no' }, `제${s.id}호`),
              h('span', { class: 'case-title' }, s.title),
              h('span', { class: 'case-status' }, cur ? STATUS[cur.phase] : '봉인됨', count ? ` · ${count}회 완료` : ''),
            ),
          );
        }),
      ),
    )
    .catch((e) => items.replaceChildren(h('li', { class: 'error' }, `목록을 불러오지 못했다: ${(e as Error).message}`)));

  const modeInput = (mode: Mode, label: string, hint: string) =>
    h('label', { class: 'mode' },
      h('input', {
        type: 'radio',
        name: 'mode',
        checked: data.mode === mode,
        onchange: () => update((d) => (d.mode = mode)),
      }),
      h('span', null, h('strong', null, label), h('small', null, hint)),
    );

  return h('section', { class: 'screen list' },
    h('div', { class: 'intro' },
      h('p', null, '이름과 연도를 지운 역사의 한 장면. 당신이 결정자다. 자문관에게 묻고, 결정하고, 봉투를 열어 실제를 확인하라.'),
    ),
    h('fieldset', { class: 'modes' },
      h('legend', null, '탐문 방식 (새 판부터 적용)'),
      modeInput('limited', '시한 있음', '탐문 횟수 제한'),
      modeInput('unlimited', '시한 없음', '원하는 만큼 탐문'),
    ),
    h('h2', null, '기밀 문서함'),
    items,
  );
}
