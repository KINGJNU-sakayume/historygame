import { domainOf } from './scenarios.ts';

export type Verdict = 'ok' | 'fail' | 'warn';

export interface UrlCheck {
  url: string;
  verdict: Verdict;
  status: number | null;
  finalUrl: string | null;
  method: 'HEAD' | 'GET';
  note: string;
}

export const USER_AGENT = 'historygame-linkcheck/1.0 (+https://github.com/kingjnu-sakayume/historygame)';

/** 2xx/3xx 통과, 404/410 실패, 나머지(403/429/5xx 등)는 유료벽·봇 차단일 수 있어 경고 */
export function classifyStatus(status: number): Verdict {
  if (status >= 200 && status < 400) return 'ok';
  if (status === 404 || status === 410) return 'fail';
  return 'warn';
}

export interface CheckOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRedirects?: number;
}

async function request(
  url: string,
  method: 'HEAD' | 'GET',
  opts: Required<CheckOptions>,
): Promise<{ status: number; finalUrl: string; redirects: number }> {
  let current = url;
  for (let i = 0; i <= opts.maxRedirects; i++) {
    const res = await opts.fetchImpl(current, {
      method,
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    // 본문은 필요 없다. 연결을 바로 놓아 준다.
    await res.body?.cancel().catch(() => {});
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return { status: res.status, finalUrl: current, redirects: i };
  }
  throw new Error(`리다이렉트 ${opts.maxRedirects}회 초과`);
}

export async function checkUrl(url: string, options: CheckOptions = {}): Promise<UrlCheck> {
  const opts: Required<CheckOptions> = {
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs: options.timeoutMs ?? 15000,
    maxRedirects: options.maxRedirects ?? 5,
  };
  let method: 'HEAD' | 'GET' = 'HEAD';
  try {
    let r = await request(url, 'HEAD', opts);
    // HEAD를 막거나 다르게 답하는 서버가 많다. 통과가 아니면 GET으로 다시 묻는다.
    if (classifyStatus(r.status) !== 'ok') {
      method = 'GET';
      r = await request(url, 'GET', opts);
    }
    const verdict = classifyStatus(r.status);
    const note =
      verdict === 'ok'
        ? r.finalUrl !== url
          ? `리다이렉트 → ${r.finalUrl}`
          : ''
        : verdict === 'fail'
          ? '페이지 없음'
          : r.status === 403 || r.status === 429
            ? '접근 제한(유료벽·봇 차단·속도 제한 가능성)'
            : '서버 응답 이상';
    return { url, verdict, status: r.status, finalUrl: r.finalUrl, method, note };
  } catch (e) {
    const err = e as Error;
    const timeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return {
      url,
      verdict: 'warn',
      status: null,
      finalUrl: null,
      method,
      note: timeout ? `타임아웃(${opts.timeoutMs / 1000}초)` : `요청 실패: ${err.message}`,
    };
  }
}

/** 도메인별로 요청 간격을 두며 순서대로 검사한다(도메인끼리는 병렬). */
export async function checkAll(
  urls: string[],
  options: CheckOptions & { perDomainDelayMs?: number; onResult?: (r: UrlCheck) => void } = {},
): Promise<UrlCheck[]> {
  const delay = options.perDomainDelayMs ?? 1500;
  const byDomain = new Map<string, string[]>();
  for (const url of new Set(urls)) {
    const d = domainOf(url) ?? '';
    byDomain.set(d, [...(byDomain.get(d) ?? []), url]);
  }
  const results = new Map<string, UrlCheck>();
  await Promise.all(
    [...byDomain.values()].map(async (list) => {
      for (let i = 0; i < list.length; i++) {
        if (i > 0 && delay > 0) await new Promise((r) => setTimeout(r, delay));
        const r = await checkUrl(list[i], options);
        results.set(list[i], r);
        options.onResult?.(r);
      }
    }),
  );
  return [...new Set(urls)].map((u) => results.get(u)!);
}
