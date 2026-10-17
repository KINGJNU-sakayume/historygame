// 마스킹된 세력의 문장(紋章). 방패 안에 단순한 상징 하나.
import type { CrestId } from '../types.ts';
import { svg } from './dom.ts';

const SYMBOL: Record<CrestId, string> = {
  anchor: 'M32 18a4 4 0 1 1 0 .1M32 22v24M24 28h16M18 38c2 8 8 12 14 12s12-4 14-12M18 38l-2 4M46 38l2 4',
  eagle: 'M32 20l-4 6 4 4 4-4zM32 30v18M16 26c6 2 10 6 16 8 6-2 10-6 16-8M20 34c4 2 8 4 12 4s8-2 12-4M28 48l4-4 4 4',
  lion: 'M24 22c4-4 12-4 16 0s2 10-2 12l2 12M24 22c-2 4 0 10 6 12v12M34 34h-8M30 26h.1M36 26h.1',
  tower: 'M22 48V26h20v22M22 26v-6h4v4h4v-4h4v4h4v-4h4v6M29 48v-8h6v8M28 31h2M34 31h2',
  ship: 'M18 40h28l-4 8H22zM32 18v22M32 20l10 14H32M32 24l-8 12h8',
  crown: 'M20 44h24M20 44l-2-18 8 8 6-12 6 12 8-8-2 18M32 22h.1',
  star: 'M32 18l4 10h10l-8 7 3 11-9-6-9 6 3-11-8-7h10z',
  cross: 'M28 18h8v10h10v8H36v14h-8V36H18v-8h10z',
  sun: 'M32 26a8 8 0 1 0 .1 0M32 16v5M32 43v5M16 34h5M43 34h5M21 23l3 3M40 42l3 3M21 45l3-3M40 26l3-3',
  key: 'M28 22a6 6 0 1 0 .1 0M28 34v16M28 42h6M28 48h4',
};

export function crest(id: CrestId, size = 40): SVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 64 64', width: size, height: size, class: 'crest', 'aria-hidden': 'true' },
    svg('path', {
      d: 'M10 8h44v22c0 14-10 24-22 28C20 54 10 44 10 30z',
      fill: 'var(--crest-field)',
      stroke: 'var(--ink)',
      'stroke-width': 2.5,
    }),
    svg('path', {
      d: SYMBOL[id],
      fill: 'none',
      stroke: 'var(--seal)',
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
}
