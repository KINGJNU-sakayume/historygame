import { isMisreported } from '../../engine/inquiry.ts';
import { loadReveal } from '../../data.ts';
import type { Card, PublicReveal, Source } from '../../types.ts';
import { h, paragraphs } from '../dom.ts';
import { ADVISOR_LABEL, TOPIC_LABEL } from '../labels.ts';
import { decisionLabel, entityLegend, optionLabel, telegram, type PlayCtx } from '../common.ts';

function sourceList(sources: Source[]) {
  return h('ul', { class: 'sources' },
    sources.map((s) => h('li', null, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title))),
  );
}

export function reveal(ctx: PlayCtx, onReplay: () => void): HTMLElement {
  const section = h('section', { class: 'screen reveal' }, h('p', { class: 'muted' }, '봉투를 여는 중…'));
  loadReveal(ctx.scenario.id)
    .then((r) => section.replaceChildren(...revealBody(ctx, r, onReplay).filter((n): n is Node => n !== null)))
    .catch((e) => section.replaceChildren(h('p', { class: 'error' }, `공개 자료를 불러오지 못했다: ${(e as Error).message}`)));
  return section;
}

function revealBody(ctx: PlayCtx, r: PublicReveal, onReplay: () => void): (Node | null)[] {
  const { scenario, play } = ctx;
  const names = Object.fromEntries(r.identities.map((i) => [i.entity, i.name]));
  const same = play.option === r.actual_choice;
  const opened = play.inquiry.opened
    .map((id) => scenario.dossier.find((c) => c.id === id))
    .filter((c): c is Card => !!c);
  const misreported = opened.filter((c) => isMisreported(c, play.seed));
  const optionCf = new Map(r.counterfactuals.map((c) => [c.option, c.text]));
  const cardSources = Object.entries(r.card_sources).flatMap(([id, list]) => list.map((s) => ({ ...s, id })));

  return [
    h('div', { class: 'reveal-head' },
      h('p', { class: 'stamp big' }, '解封'),
      h('h2', null, r.who),
    ),
    entityLegend(scenario, names),

    h('h3', null, '실제 선택'),
    telegram({ from: '역사의 기록', cls: same ? 'match' : '' },
      h('p', null, h('strong', null, optionLabel(scenario, r.actual_choice))),
      r.actual_details?.length ? h('ul', null, r.actual_details.map((d) => h('li', null, decisionLabel(scenario, d)))) : null,
      h('p', { class: 'muted' }, same ? '당신과 같은 길을 택했다.' : '당신과 다른 길을 택했다.'),
    ),

    h('h3', null, '판단의 논리, 나란히'),
    h('div', { class: 'side-by-side' },
      telegram({ from: '당신', cls: 'mine' },
        h('p', null, h('strong', null, optionLabel(scenario, play.option))),
        play.details.length ? h('ul', null, play.details.map((d) => h('li', null, decisionLabel(scenario, d)))) : null,
        ...paragraphs(play.reason || '(이유를 적지 않았다)'),
        play.afterthought ? h('div', { class: 'after' }, h('p', { class: 'muted' }, '이의를 듣고 덧붙인 생각'), ...paragraphs(play.afterthought)) : null,
      ),
      telegram({ from: '실제 결정자' }, ...paragraphs(r.actual_reasoning)),
    ),

    h('h3', null, '결과'),
    telegram({}, ...paragraphs(r.outcome)),

    r.counterfactuals.length
      ? h('div', null,
          h('h3', null, '가지 않은 길'),
          h('p', { class: 'muted' }, '아래는 역사가들의 견해와 정황에 기댄 추정이다. 사실이 아니다.'),
          scenario.masked.options
            .filter((o) => optionCf.has(o.key))
            .sort((a, b) => (a.letter ?? '').localeCompare(b.letter ?? ''))
            .map((o) =>
              telegram({ subject: `${o.letter}. ${o.text}`, stamp: '推定', cls: 'counterfactual' }, ...paragraphs(optionCf.get(o.key)!)),
            ),
        )
      : null,

    h('h3', null, '받은 보고 중 틀린 것'),
    misreported.length
      ? h('div', null,
          misreported.map((c) =>
            telegram({ from: ADVISOR_LABEL[c.advisor], subject: `${TOPIC_LABEL[c.topic]} · ${c.title}`, stamp: '誤報', cls: 'misreport' },
              h('p', null, h('span', { class: 'label' }, '당신이 받은 보고: '), c.misreport!),
              h('p', null, h('span', { class: 'label' }, '실제로는: '), c.text),
            ),
          ),
        )
      : h('p', { class: 'muted' }, '이번 판에서 받은 보고는 모두 정확했다.'),
    r.misreport_notes ? h('div', { class: 'note' }, ...paragraphs(r.misreport_notes)) : null,
    h('p', { class: 'muted small' }, '오보는 당시 정보의 불확실성을 흉내 내는 게임 장치다. 신뢰도에 따라 판마다 다르게 나온다.'),

    h('h3', null, '이번 판의 성향'),
    play.tags.length ? h('ul', { class: 'tags' }, play.tags.map((t) => h('li', null, t))) : h('p', { class: 'muted' }, '태그 없음'),
    h('p', { class: 'muted small' }, '점수는 없다. 실제 선택이 정답이라는 보장도 없다.'),

    h('h3', null, '출처'),
    sourceList(r.sources),
    cardSources.length
      ? h('details', null, h('summary', null, `정보 카드 출처 (${cardSources.length})`),
          h('ul', { class: 'sources' },
            cardSources.map((s) => h('li', null, `${s.id} `, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title))),
          ),
        )
      : null,

    h('div', { class: 'actions' },
      h('a', { class: 'btn', href: '#/' }, '문서함으로'),
      h('button', { class: 'btn primary', onclick: onReplay }, '이 판 다시 하기'),
    ),
  ];
}
