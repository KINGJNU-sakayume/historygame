import type { PublicReveal, PublicScenario, ScenarioIndexEntry } from './types.ts';

const base = `${import.meta.env.BASE_URL}scenarios/`;
const cache = new Map<string, Promise<unknown>>();

function get<T>(path: string, as: 'json' | 'text' = 'json'): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(base + path).then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return as === 'json' ? r.json() : r.text();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export const loadIndex = () => get<ScenarioIndexEntry[]>('index.json');
export const loadScenario = (id: string) => get<PublicScenario>(`${id}.json`);
export const loadReveal = (id: string) => get<PublicReveal>(`${id}.reveal.json`);
export const loadMap = (id: string) => get<string>(`${id}.map.svg`, 'text');
