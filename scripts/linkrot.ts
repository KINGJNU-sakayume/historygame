// 주간 링크 부패 검사. 모든 시나리오 출처를 다시 확인하고,
// 끊긴 링크(404/410)마다 web.archive.org 보존본을 찾아 이슈 본문을 만든다.
// 결과는 linkrot-report.json으로 쓰고, 이슈 등록은 워크플로가 gh CLI로 한다.
// 사용: npm run linkrot [-- <scenarios 폴더>]
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectSources, loadScenarios, SCENARIOS_DIR } from './lib/scenarios.ts';
import { checkAll, USER_AGENT } from './lib/urls.ts';

export interface LinkrotIssue {
  title: string;
  body: string;
}

async function archiveCandidate(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { archived_snapshots?: { closest?: { available?: boolean; url?: string } } };
    const closest = data.archived_snapshots?.closest;
    return closest?.available && closest.url ? closest.url.replace(/^http:/, 'https:') : null;
  } catch {
    return null;
  }
}

const dir = process.argv[2] ? resolve(process.argv[2]) : SCENARIOS_DIR;
const sources = loadScenarios(dir).flatMap((s) => collectSources(s.scenario));
const whereOf = new Map<string, string[]>();
for (const s of sources) whereOf.set(s.url, [...(whereOf.get(s.url) ?? []), s.where]);

const results = await checkAll([...whereOf.keys()]);
const issues: LinkrotIssue[] = [];
for (const r of results.filter((x) => x.verdict === 'fail')) {
  const archived = await archiveCandidate(r.url);
  issues.push({
    title: `[linkrot] ${r.url}`,
    body: [
      `주간 링크 검사에서 출처 링크가 끊긴 것을 발견했다 (HTTP ${r.status}).`,
      '',
      `- URL: ${r.url}`,
      `- 사용 위치: ${(whereOf.get(r.url) ?? []).join(', ')}`,
      archived
        ? `- 대체 후보(web.archive.org 보존본): ${archived}`
        : '- web.archive.org 보존본을 찾지 못했다. 다른 출처로 교체가 필요하다.',
      '',
      '보존본으로 바꾸기 전에 내용이 원래 인용한 것과 같은지 확인할 것.',
    ].join('\n'),
  });
}
const warns = results.filter((x) => x.verdict === 'warn');
writeFileSync('linkrot-report.json', JSON.stringify({ issues, warnings: warns }, null, 2));
console.log(`검사 ${results.length}, 끊긴 링크 ${issues.length}, 경고 ${warns.length}`);
for (const w of warns) console.log(`  ⚠ ${w.status ?? '---'} ${w.url} ${w.note}`);
