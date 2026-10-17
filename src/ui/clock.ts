// 탐문 시계. 칸 하나가 탐문 한 번. 쓴 칸은 어둡게, 남은 수는 가운데.
import { h, svg } from './dom.ts';

export function clock(limit: number | null, used: number): HTMLElement {
  const face = svg('svg', { viewBox: '0 0 100 100', class: 'clock-face', 'aria-hidden': 'true' });
  face.appendChild(svg('circle', { cx: 50, cy: 50, r: 46, fill: 'var(--paper-hi)', stroke: 'var(--ink)', 'stroke-width': 2 }));
  if (limit !== null) {
    const gap = limit > 1 ? 4 : 0;
    for (let i = 0; i < limit; i++) {
      const a0 = ((i * 360) / limit + gap / 2 - 90) * (Math.PI / 180);
      const a1 = (((i + 1) * 360) / limit - gap / 2 - 90) * (Math.PI / 180);
      const r = 38;
      const large = 360 / limit - gap > 180 ? 1 : 0;
      const d = `M ${50 + r * Math.cos(a0)} ${50 + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${50 + r * Math.cos(a1)} ${50 + r * Math.sin(a1)}`;
      face.appendChild(
        svg('path', {
          d,
          fill: 'none',
          stroke: i < used ? 'var(--ink-faint)' : 'var(--seal)',
          'stroke-width': 9,
          'stroke-linecap': 'butt',
        }),
      );
    }
    // 시침: 쓴 만큼 돈다
    const angle = (used / limit) * 360;
    face.appendChild(
      svg('line', {
        x1: 50, y1: 50, x2: 50, y2: 22,
        stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-linecap': 'round',
        transform: `rotate(${angle} 50 50)`,
        class: 'clock-hand',
      }),
    );
  }
  face.appendChild(svg('circle', { cx: 50, cy: 50, r: 4, fill: 'var(--ink)' }));
  const left = limit === null ? '∞' : String(Math.max(0, limit - used));
  return h(
    'div',
    { class: 'clock', role: 'status', 'aria-label': limit === null ? '탐문 무제한' : `남은 탐문 ${left}회` },
    face,
    h('div', { class: 'clock-label' }, h('strong', null, left), h('span', null, limit === null ? '무제한' : '남은 탐문')),
  );
}
