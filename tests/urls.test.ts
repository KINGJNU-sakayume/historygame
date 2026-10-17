import { describe, expect, it } from 'vitest';
import { checkAll, checkUrl, classifyStatus } from '../scripts/lib/urls.ts';
import { domainOf, readAllowlist } from '../scripts/lib/scenarios.ts';

type Route = (method: string) => { status: number; location?: string } | Error;

function fakeFetch(routes: Record<string, Route>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const route = routes[url];
    if (!route) return new Response(null, { status: 404 });
    const r = route(init?.method ?? 'GET');
    if (r instanceof Error) throw r;
    return new Response(null, { status: r.status, headers: r.location ? { location: r.location } : {} });
  }) as typeof fetch;
}

describe('classifyStatus', () => {
  it.each([
    [200, 'ok'],
    [301, 'ok'],
    [404, 'fail'],
    [410, 'fail'],
    [403, 'warn'],
    [429, 'warn'],
    [500, 'warn'],
  ])('%i → %s', (status, verdict) => expect(classifyStatus(status)).toBe(verdict));
});

describe('checkUrl', () => {
  it('리다이렉트를 따라가 최종 URL을 기록', async () => {
    const r = await checkUrl('https://a.test/old', {
      fetchImpl: fakeFetch({
        'https://a.test/old': () => ({ status: 301, location: '/new' }),
        'https://a.test/new': () => ({ status: 200 }),
      }),
    });
    expect(r).toMatchObject({ verdict: 'ok', status: 200, finalUrl: 'https://a.test/new', method: 'HEAD' });
  });

  it('HEAD가 막히면 GET으로 재시도', async () => {
    const r = await checkUrl('https://a.test/x', {
      fetchImpl: fakeFetch({ 'https://a.test/x': (m) => ({ status: m === 'HEAD' ? 405 : 200 }) }),
    });
    expect(r).toMatchObject({ verdict: 'ok', method: 'GET' });
  });

  it('404는 실패, 403·429는 경고', async () => {
    const fetchImpl = fakeFetch({
      'https://a.test/gone': () => ({ status: 410 }),
      'https://a.test/paywall': () => ({ status: 403 }),
      'https://a.test/slow': () => ({ status: 429 }),
    });
    expect((await checkUrl('https://a.test/missing', { fetchImpl })).verdict).toBe('fail');
    expect((await checkUrl('https://a.test/gone', { fetchImpl })).verdict).toBe('fail');
    expect((await checkUrl('https://a.test/paywall', { fetchImpl })).verdict).toBe('warn');
    expect((await checkUrl('https://a.test/slow', { fetchImpl })).verdict).toBe('warn');
  });

  it('타임아웃·네트워크 오류는 경고', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    const r = await checkUrl('https://a.test/t', { fetchImpl: fakeFetch({ 'https://a.test/t': () => timeout }) });
    expect(r.verdict).toBe('warn');
    expect(r.note).toContain('타임아웃');
  });

  it('리다이렉트 루프는 경고', async () => {
    const r = await checkUrl('https://a.test/loop', {
      fetchImpl: fakeFetch({ 'https://a.test/loop': () => ({ status: 302, location: '/loop' }) }),
    });
    expect(r.verdict).toBe('warn');
  });
});

describe('checkAll', () => {
  it('중복을 없애고 입력 순서대로 돌려준다', async () => {
    const fetchImpl = fakeFetch({ 'https://a.test/1': () => ({ status: 200 }), 'https://b.test/2': () => ({ status: 200 }) });
    const rs = await checkAll(['https://a.test/1', 'https://b.test/2', 'https://a.test/1'], { fetchImpl, perDomainDelayMs: 0 });
    expect(rs.map((r) => r.url)).toEqual(['https://a.test/1', 'https://b.test/2']);
  });
});

describe('allowlist', () => {
  it('주석과 빈 줄을 무시하고 호스트를 정확히 비교', () => {
    const list = readAllowlist();
    expect(list.has('en.wikipedia.org')).toBe(true);
    expect(list.has(domainOf('https://www.scielo.br/j/x')!)).toBe(true);
    expect(list.has(domainOf('https://namu.wiki/w/x')!)).toBe(false);
    expect([...list].some((d) => d.startsWith('#'))).toBe(false);
  });
});
