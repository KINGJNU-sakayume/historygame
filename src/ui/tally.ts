// 남은 질문 수. 한 번 물을 때마다 연필로 한 획씩 긋는다.
import { h } from './dom.ts';

export function tally(limit: number | null, used: number): HTMLElement {
  if (limit === null) {
    return h('p', { class: 'tally', role: 'status', 'aria-label': '질문 제한 없음' }, '질문 제한 없음');
  }
  const left = Math.max(0, limit - used);
  return h(
    'div',
    { class: 'tally', role: 'status', 'aria-label': `남은 질문 ${left}회` },
    h('span', { class: 'tally-count' }, `남은 질문 ${left}`),
    h('span', { class: 'tally-marks', 'aria-hidden': 'true' },
      Array.from({ length: limit }, (_, i) => h('i', { class: i < used ? 'used' : '' })),
    ),
  );
}
