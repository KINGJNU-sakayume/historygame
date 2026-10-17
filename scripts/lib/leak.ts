import type { Scenario } from '../../src/types.ts';

export interface Leak {
  term: string;
  path: string;
  excerpt: string;
}

/** 비교용 정규화: 악센트 제거 + 소문자 */
export function normalize(text: string): string {
  // NFD로 악센트를 떼어 낸 뒤 NFC로 되돌려 한글 음절은 그대로 둔다.
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC').toLowerCase();
}

const YEAR = /(?<!\d)(1\d{3}|20\d{2})(?!\d)/g;

/** reveal에서 금지어를 모은다: redact + identities의 실명 + 본문에 나온 연도 */
export function leakTerms(reveal: Scenario['reveal']): string[] {
  const terms = new Set<string>();
  for (const t of reveal.redact ?? []) terms.add(t.trim());
  for (const i of reveal.identities ?? []) terms.add(i.name.trim());
  const prose = [
    reveal.who,
    reveal.actual_reasoning,
    reveal.outcome,
    reveal.misreport_notes ?? '',
    ...(reveal.counterfactuals ?? []).map((c) => c.text),
    ...(reveal.identities ?? []).map((i) => i.name),
    ...(reveal.redact ?? []),
  ].join('\n');
  for (const m of prose.matchAll(YEAR)) terms.add(m[1]);
  return [...terms].filter(Boolean);
}

/** 마스킹 영역의 모든 문자열과 JSON 경로. 출처(sources)는 공개 화면에서만 보이므로 제외한다. */
export function maskedTexts(s: Scenario, svg: string | null): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') out.push({ path, text: value });
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (k === 'sources') continue;
        walk(v, `${path}.${k}`);
      }
    }
  };
  walk(s.masked, 'masked');
  walk(s.dossier, 'dossier');
  walk(s.pushbacks, 'pushbacks');
  if (svg !== null) out.push({ path: `masked.map_svg(${s.masked.map_svg})`, text: svgScanText(svg) });
  return out;
}

/** 좌표 데이터(d, points 등)는 숫자가 연도로 오인될 수 있어 빼고, 나머지 속성·텍스트는 모두 검사한다. */
export function svgScanText(svg: string): string {
  return svg.replace(/\s(d|points|viewBox|transform)="[^"]*"/g, ' ');
}

const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\s.'’-]+$/u;

function termPattern(term: string): RegExp {
  const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 로마자 이름은 로마자 단어 경계로 찾는다("Rio"가 "priority"에 걸리지 않게, "Lisboa는"에는 걸리게).
  // 한글 등은 조사가 붙으므로 부분 문자열로 찾는다.
  return LATIN_ONLY.test(term)
    ? new RegExp(`(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'u')
    : new RegExp(escaped, 'u');
}

export function findLeaks(s: Scenario, svg: string | null): Leak[] {
  const terms = leakTerms(s.reveal).map((term) => ({ term, re: termPattern(term) }));
  const leaks: Leak[] = [];
  for (const { path, text } of maskedTexts(s, svg)) {
    const norm = normalize(text);
    for (const { term, re } of terms) {
      const m = re.exec(norm);
      if (m) {
        const start = Math.max(0, m.index - 20);
        leaks.push({ term, path, excerpt: norm.slice(start, m.index + m[0].length + 20).replace(/\s+/g, ' ') });
      }
    }
  }
  return leaks;
}
