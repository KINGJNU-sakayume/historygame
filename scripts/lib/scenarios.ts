import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Scenario, Source } from '../../src/types.ts';

export const ROOT = resolve(import.meta.dirname, '../..');
export const SCENARIOS_DIR = join(ROOT, 'scenarios');

export interface LoadedScenario {
  dir: string;
  dirName: string;
  /** 스키마 검사 전이므로 unknown으로 다루다가 검증 후 Scenario로 쓴다. */
  raw: unknown;
  scenario: Scenario;
  svg: string | null;
}

export function loadScenarios(dir = SCENARIOS_DIR): LoadedScenario[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, 'scenario.json')))
    .map((e) => e.name)
    .sort()
    .map((dirName) => {
      const path = join(dir, dirName);
      const raw = JSON.parse(readFileSync(join(path, 'scenario.json'), 'utf8'));
      const scenario = raw as Scenario;
      const svgName = scenario.masked?.map_svg;
      const svgPath = svgName ? join(path, svgName) : null;
      const svg = svgPath && existsSync(svgPath) ? readFileSync(svgPath, 'utf8') : null;
      return { dir: path, dirName, raw, scenario, svg };
    });
}

/** 시나리오의 모든 출처 URL과 등장 위치 */
export function collectSources(s: Scenario): { url: string; where: string; title: string }[] {
  const out: { url: string; where: string; title: string }[] = [];
  const add = (src: Source[] | undefined, where: string) => {
    for (const x of src ?? []) out.push({ url: x.url, title: x.title, where });
  };
  add(s.reveal?.sources, `${s.id} reveal.sources`);
  for (const c of s.dossier ?? []) add(c.sources, `${s.id} dossier.${c.id}`);
  for (const f of s.reveal?.figures ?? []) out.push({ url: f.source_url, title: f.name, where: `${s.id} reveal.figures` });
  return out;
}

export function readAllowlist(path = join(ROOT, 'research-allowlist.txt')): Set<string> {
  return new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*/, '').trim().toLowerCase())
      .filter(Boolean),
  );
}

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
