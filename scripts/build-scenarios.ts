// 시나리오를 게임이 읽는 형태로 내보낸다.
// - 선택지를 시나리오 id 시드로 셔플하고 A~D 글자를 붙인다(실제 선택 위치가 판마다 다르게, 빌드마다 같게).
// - 플레이 중 파일(<id>.json)과 공개 화면 파일(<id>.reveal.json)을 나눈다.
//   카드 출처는 URL에 실명이 들어가므로 공개 파일로 옮긴다.
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { shuffle } from '../src/engine/rng.ts';
import type { PublicReveal, PublicScenario, ScenarioIndexEntry, Source } from '../src/types.ts';
import { loadScenarios, ROOT, SCENARIOS_DIR } from './lib/scenarios.ts';

// 세력 기호(A, B …)와 헷갈리지 않게 선택지에는 갑을병정을 쓴다.
const LETTERS = ['갑', '을', '병', '정', '무', '기'];
const src = process.argv[2] ? resolve(process.argv[2]) : SCENARIOS_DIR;
const out = join(ROOT, 'public', 'scenarios');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const index: ScenarioIndexEntry[] = [];
for (const { scenario: s, dir } of loadScenarios(src)) {
  const options = shuffle(s.masked.options, `options:${s.id}`).map((o, i) => ({ ...o, letter: LETTERS[i] }));
  const cardSources: Record<string, Source[]> = {};
  const dossier = s.dossier.map(({ sources, ...card }) => {
    cardSources[card.id] = sources ?? [];
    return card;
  });
  const { reveal, ...rest } = s;
  const play: PublicScenario = { ...rest, masked: { ...s.masked, options }, dossier };
  const publicReveal: PublicReveal = { ...reveal, card_sources: cardSources };

  writeFileSync(join(out, `${s.id}.json`), JSON.stringify(play));
  writeFileSync(join(out, `${s.id}.reveal.json`), JSON.stringify(publicReveal));
  // 그림 파일은 public/scenarios/<id>/ 아래로. 공개 화면 전용 파일(실제 지도, 인물)은 공개 때만 요청된다.
  const assets = join(out, s.id);
  mkdirSync(assets, { recursive: true });
  if (s.masked.map_svg) copyFileSync(join(dir, s.masked.map_svg), join(assets, 'map.svg'));
  if (reveal.map_svg) copyFileSync(join(dir, reveal.map_svg), join(assets, 'reveal-map.svg'));
  if (existsSync(join(dir, 'figures'))) cpSync(join(dir, 'figures'), join(assets, 'figures'), { recursive: true });
  index.push({ id: s.id, title: s.masked.title });
  console.log(`${s.id}: 선택지 순서 ${options.map((o) => `${o.letter}=${o.key}`).join(', ')}`);
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index));
console.log(`시나리오 ${index.length}개 → ${out}`);
