// 출처 URL 도달 가능 검사 + 허용 목록 도메인 검사.
// 404/410은 실패, 403/429/타임아웃 등은 경고, 허용 목록 밖 도메인은 경고.
// 결과를 콘솔과 report.md(PR 코멘트용)에 쓴다.
// 사용: npm run check-urls [-- <scenarios 폴더>] [--report <파일>]
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectSources, domainOf, loadScenarios, readAllowlist, SCENARIOS_DIR } from './lib/scenarios.ts';
import { checkAll, type UrlCheck } from './lib/urls.ts';
import { validateScenario } from './lib/validate-lib.ts';

const args = process.argv.slice(2);
const reportIdx = args.indexOf('--report');
const reportPath = resolve(reportIdx >= 0 ? args[reportIdx + 1] : 'report.md');
const positional = reportIdx >= 0 ? args.filter((_, i) => i !== reportIdx && i !== reportIdx + 1) : args;
const dir = positional[0] ? resolve(positional[0]) : SCENARIOS_DIR;

const scenarios = loadScenarios(dir);
const allowlist = readAllowlist();
const sources = scenarios.flatMap((s) => collectSources(s.scenario));
const whereOf = new Map<string, string[]>();
for (const s of sources) whereOf.set(s.url, [...(whereOf.get(s.url) ?? []), s.where]);

const domainWarnings = [...whereOf.keys()]
  .filter((u) => !allowlist.has(domainOf(u) ?? ''))
  .map((u) => ({ url: u, domain: domainOf(u) ?? '(잘못된 URL)' }));

console.log(`출처 URL ${whereOf.size}개 검사 중…`);
const results = await checkAll([...whereOf.keys()], {
  onResult: (r) => console.log(`  ${r.verdict === 'ok' ? '✓' : r.verdict === 'fail' ? '✗' : '⚠'} ${r.status ?? '---'} ${r.url} ${r.note}`),
});

const fails = results.filter((r) => r.verdict === 'fail');
const warns = results.filter((r) => r.verdict === 'warn');
const validation = scenarios.map((s) => ({ id: s.dirName, ...validateScenario(s) }));

const row = (r: UrlCheck) =>
  `| ${r.status ?? '—'} | ${r.url} | ${r.note || ' '} | ${(whereOf.get(r.url) ?? []).join('<br>')} |`;
const table = (rs: UrlCheck[]) => ['| 상태 | URL | 비고 | 위치 |', '|---|---|---|---|', ...rs.map(row)].join('\n');

const lines = [
  '<!-- historygame-validation-report -->',
  '## 시나리오 검증 리포트',
  '',
  '### 누출·스키마 검사',
  ...validation.map(
    (v) =>
      `- **${v.id}**: ${v.errors.length ? `❌ 오류 ${v.errors.length}` : '✅ 통과'}${v.warnings.length ? `, ⚠️ 경고 ${v.warnings.length}` : ''}` +
      [...v.errors.map((e) => `\n  - ❌ ${e}`), ...v.warnings.map((w) => `\n  - ⚠️ ${w}`)].join(''),
  ),
  '',
  '### 출처 URL 검사',
  `검사 ${results.length} · 통과 ${results.length - fails.length - warns.length} · ❌ 실패 ${fails.length} · ⚠️ 경고 ${warns.length}`,
  '',
  ...(fails.length ? ['#### ❌ 실패 (404/410)', table(fails), ''] : []),
  ...(warns.length ? ['#### ⚠️ 경고 (접근 제한·타임아웃 등, 사람이 확인)', table(warns), ''] : []),
  '### 출처 도메인 검사',
  domainWarnings.length
    ? [`⚠️ \`research-allowlist.txt\`에 없는 도메인 ${domainWarnings.length}개:`, ...domainWarnings.map((d) => `- \`${d.domain}\` — ${d.url}`)].join('\n')
    : '✅ 모든 출처가 허용 목록 도메인',
  '',
  '<details><summary>통과한 URL (최종 주소)</summary>',
  '',
  ...results.filter((r) => r.verdict === 'ok').map((r) => `- ${r.url}${r.finalUrl && r.finalUrl !== r.url ? ` → ${r.finalUrl}` : ''}`),
  '',
  '</details>',
];
writeFileSync(reportPath, lines.join('\n') + '\n');

for (const d of domainWarnings) console.log(`  ⚠ 허용 목록 밖 도메인: ${d.domain} (${d.url})`);
console.log(`\n실패 ${fails.length}, 경고 ${warns.length + domainWarnings.length}. 리포트: ${reportPath}`);
if (process.env.GITHUB_ACTIONS) {
  for (const r of warns) console.log(`::warning title=출처 접근 제한::${r.status ?? ''} ${r.url} ${r.note}`);
  for (const d of domainWarnings) console.log(`::warning title=허용 목록 밖 도메인::${d.domain} ${d.url}`);
  for (const r of fails) console.log(`::error title=출처 링크 끊김::${r.status} ${r.url}`);
}
process.exit(fails.length ? 1 : 0);
