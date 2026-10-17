// 시나리오 오프라인 검증: 스키마, 참조 무결성, 마스킹 누출, 출처 필수, 태그 축.
// 사용: npm run validate [-- <scenarios 폴더>]
import { resolve } from 'node:path';
import { loadScenarios, SCENARIOS_DIR } from './lib/scenarios.ts';
import { validateScenario } from './lib/validate-lib.ts';

const dir = process.argv[2] ? resolve(process.argv[2]) : SCENARIOS_DIR;
const scenarios = loadScenarios(dir);
let errors = 0;

if (scenarios.length === 0) {
  console.error(`시나리오가 없다: ${dir}`);
  process.exit(1);
}

for (const loaded of scenarios) {
  const f = validateScenario(loaded);
  errors += f.errors.length;
  console.log(`\n■ ${loaded.dirName}: 오류 ${f.errors.length}, 경고 ${f.warnings.length}`);
  for (const e of f.errors) console.log(`  ✗ ${e}`);
  for (const w of f.warnings) console.log(`  ⚠ ${w}`);
}

console.log(errors ? `\n실패: 오류 ${errors}건` : '\n통과');
process.exit(errors ? 1 : 0);
