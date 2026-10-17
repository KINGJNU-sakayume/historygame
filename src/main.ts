import './ui/styles.css';
import { DEFAULT_INQUIRY_LIMIT } from './engine/inquiry.ts';
import { loadMap, loadScenario } from './data.ts';
import { load, newPlay, update, type Play } from './store.ts';
import { caseRail, type PlayCtx } from './ui/common.ts';
import { h } from './ui/dom.ts';
import { briefing } from './ui/screens/briefing.ts';
import { decision } from './ui/screens/decision.ts';
import { inquiry } from './ui/screens/inquiry.ts';
import { list } from './ui/screens/list.ts';
import { pushback } from './ui/screens/pushback.ts';
import { records } from './ui/screens/records.ts';
import { reveal } from './ui/screens/reveal.ts';

const app = document.getElementById('app')!;

/** 머리띠 + (사건 레일) + 본문. 레일이 없으면 본문이 전폭을 쓴다. */
function frame(rail: Node | null, ...content: (Node | null)[]) {
  app.replaceChildren(
    h('header', { class: 'masthead' },
      h('a', { href: '#/', class: 'brand' }, '역사의 봉투'),
      h('nav', null, h('a', { href: '#/' }, '사건'), h('a', { href: '#/records' }, '기록')),
    ),
    h('div', { class: rail ? 'layout' : 'layout single' }, rail, h('main', null, ...content)),
  );
}

async function playRoute(id: string, opts: { top?: boolean } = {}) {
  const scenario = await loadScenario(id);
  const mapSvg = scenario.masked.map_svg ? await loadMap(id).catch(() => null) : null;
  let play: Play | undefined = load().current[id];
  if (!play) {
    const limit = load().mode === 'unlimited' ? null : (scenario.masked.inquiry_limit ?? DEFAULT_INQUIRY_LIMIT);
    const fresh = newPlay(id, limit);
    update((d) => (d.current[id] = fresh));
    play = fresh;
  }
  const p = play;
  const ctx: PlayCtx = {
    scenario,
    play: p,
    mapSvg,
    commit(fn, o = {}) {
      fn(p);
      update((d) => (d.current[id] = p));
      if (o.rerender !== false) void playRoute(id, { top: o.top });
    },
  };
  const replay = () => {
    update((d) => delete d.current[id]);
    void playRoute(id, { top: true });
  };
  const screen = {
    briefing: () => briefing(ctx),
    inquiry: () => inquiry(ctx),
    decision: () => decision(ctx),
    pushback: () => pushback(ctx),
    reveal: () => reveal(ctx, replay),
  }[p.phase]();
  frame(caseRail(ctx), screen);
  if (opts.top) window.scrollTo({ top: 0 });
}

async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, arg] = hash.split('/');
  try {
    if (name === 'play' && arg) await playRoute(arg, { top: true });
    else if (name === 'records') frame(null, records());
    else frame(null, list());
  } catch (e) {
    frame(null, h('p', { class: 'error' }, `불러오지 못했다: ${(e as Error).message}`), h('a', { href: '#/', class: 'btn' }, '사건 목록'));
  }
}

window.addEventListener('hashchange', () => void route());
void route();
