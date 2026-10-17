import type { Scenario } from '../types.ts';

/** 이번 판 판단에 붙는 성향 태그 (중복 제거) */
export function tagsForChoice(tags: Scenario['tags'], option: string, details: readonly string[]): string[] {
  const out = new Set<string>(tags.options[option] ?? []);
  for (const d of details) for (const t of tags.decisions?.[d] ?? []) out.add(t);
  return [...out];
}
