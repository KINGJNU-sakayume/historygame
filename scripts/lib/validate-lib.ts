import Ajv from 'ajv';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADVISORS, type Scenario } from '../../src/types.ts';
import { findLeaks, maskedTexts } from './leak.ts';
import { ROOT, type LoadedScenario } from './scenarios.ts';

export interface Findings {
  errors: string[];
  warnings: string[];
}

const schema = JSON.parse(readFileSync(join(ROOT, 'config/scenario.schema.json'), 'utf8'));
const axes = JSON.parse(readFileSync(join(ROOT, 'config/tag-axes.json'), 'utf8')) as {
  axes: { poles: string[] }[];
};
const knownTags = new Set(axes.axes.flatMap((a) => a.poles));
const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(schema);

function dupes(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

/** 참조 무결성: 서로 가리키는 id가 실제로 있는지 */
function checkRefs(s: Scenario, dirName: string, dir: string, f: Findings) {
  const err = (m: string) => f.errors.push(`[${dirName}] ${m}`);
  const warn = (m: string) => f.warnings.push(`[${dirName}] ${m}`);

  if (s.id !== dirName) err(`id "${s.id}"가 폴더 이름과 다르다`);
  const options = s.masked.options.map((o) => o.key);
  const decisions = s.masked.decisions.map((d) => d.id);
  const entities = s.masked.entities.map((e) => e.id);
  for (const [what, ids] of [
    ['선택지 key', options],
    ['세부 결정 id', decisions],
    ['카드 id', s.dossier.map((c) => c.id)],
    ['반론 id', s.pushbacks.map((p) => p.id)],
    ['세력 id', entities],
  ] as const) {
    for (const d of dupes([...ids])) err(`${what} 중복: ${d}`);
  }
  const optionRef = (id: string, where: string) => {
    if (!options.includes(id)) err(`${where}: 없는 선택지 "${id}"`);
  };
  const decisionRef = (id: string, where: string) => {
    if (!decisions.includes(id)) err(`${where}: 없는 세부 결정 "${id}"`);
  };

  for (const p of s.pushbacks) {
    p.when.option?.forEach((o) => optionRef(o, `pushbacks.${p.id}.when.option`));
    for (const k of ['all', 'any', 'none'] as const) p.when[k]?.forEach((d) => decisionRef(d, `pushbacks.${p.id}.when.${k}`));
  }
  Object.keys(s.tags.options).forEach((o) => optionRef(o, 'tags.options'));
  Object.keys(s.tags.decisions ?? {}).forEach((d) => decisionRef(d, 'tags.decisions'));
  optionRef(s.reveal.actual_choice, 'reveal.actual_choice');
  const facts = Object.keys(s.reveal.decisions);
  facts.forEach((d) => decisionRef(d, 'reveal.decisions'));
  for (const d of decisions) if (!facts.includes(d)) err(`reveal.decisions에 세부 결정 "${d}"의 실제 기록이 없다 (모르면 did: null)`);
  s.reveal.counterfactuals.forEach((c) => optionRef(c.option, 'reveal.counterfactuals'));
  for (const i of s.reveal.identities) {
    if (!entities.includes(i.entity)) err(`reveal.identities: 없는 세력 "${i.entity}"`);
  }
  if (s.masked.map_svg && !existsSync(join(dir, s.masked.map_svg))) err(`지도 파일 없음: ${s.masked.map_svg}`);
  if (s.reveal.map_svg && !existsSync(join(dir, s.reveal.map_svg))) err(`공개 지도 파일 없음: ${s.reveal.map_svg}`);
  for (const f of s.reveal.figures) {
    if (f.image && !existsSync(join(dir, 'figures', f.image))) err(`인물 이미지 파일 없음: figures/${f.image}`);
  }
  if (s.masked.entities.filter((e) => e.self).length > 1) err('self(플레이어의 나라)는 하나만 둘 수 있다');

  // 정의되지 않은 대문자 한 글자는 세력 기호로 오인된다
  const stray = new Map<string, string>();
  for (const { path, text } of maskedTexts(s, null)) {
    for (const m of text.matchAll(/(?<![A-Za-z0-9])([A-Z])(?![A-Za-z0-9])/g)) {
      if (!entities.includes(m[1]) && !stray.has(m[1])) stray.set(m[1], path);
    }
  }
  for (const [letter, path] of stray) warn(`정의되지 않은 기호 "${letter}" @ ${path} — masked.entities에 넣거나 다른 말로 바꿀 것`);

  for (const o of options) if (!s.tags.options[o]?.length) warn(`선택지 "${o}"에 성향 태그가 없다`);

  // docs/EPISODE_GUIDE.md의 분량 기준 (벗어나면 경고)
  const range = (what: string, n: number, lo: number, hi: number) => {
    if (n < lo || n > hi) warn(`${what} ${n}개 — 지침은 ${lo}~${hi}개`);
  };
  range('정보 카드', s.dossier.length, 15, 20);
  range('방침(선택지)', options.length, 4, 4);
  range('세부 결정', decisions.length, 6, 10);
  range('반론', s.pushbacks.length, 8, 12);
  for (const a of ADVISORS) if (!s.dossier.some((c) => c.advisor === a)) warn(`자문관 "${a}"에게 카드가 없다`);
  if (!s.reveal.map_svg) warn('공개 화면용 실제 지도(reveal.map_svg)가 없다');
  if (!s.reveal.figures.some((f) => f.image)) warn('인물 이미지가 하나도 없다');
  const allTags = [...Object.values(s.tags.options), ...Object.values(s.tags.decisions ?? {})].flat();
  for (const t of new Set(allTags)) {
    if (!knownTags.has(t)) warn(`config/tag-axes.json에 없는 태그 "${t}"`);
  }
}

export function validateScenario(loaded: LoadedScenario): Findings {
  const f: Findings = { errors: [], warnings: [] };
  const { dirName, raw, scenario: s, svg, dir } = loaded;

  if (!validateSchema(raw)) {
    for (const e of validateSchema.errors ?? []) {
      f.errors.push(`[${dirName}] 스키마: ${e.instancePath || '/'} ${e.message}`);
    }
    return f; // 구조가 틀리면 아래 검사는 의미가 없다
  }

  checkRefs(s, dirName, dir, f);

  if (s.reveal.sources.length === 0) f.errors.push(`[${dirName}] 출처 필수: reveal.sources가 비어 있다`);
  if (s.reveal.redact.length === 0 && s.reveal.identities.length === 0) {
    f.errors.push(`[${dirName}] 누출 검사 불가: reveal.redact와 reveal.identities가 모두 비어 있다`);
  }
  for (const leak of findLeaks(s, svg)) {
    f.errors.push(`[${dirName}] 마스킹 누출: "${leak.term}" @ ${leak.path} — …${leak.excerpt}…`);
  }
  return f;
}
