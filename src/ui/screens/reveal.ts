import { isMisreported } from '../../engine/inquiry.ts';
import { loadReveal } from '../../data.ts';
import type { Card, PublicReveal, Source } from '../../types.ts';
import { h, paragraphs } from '../dom.ts';
import { ADVISOR_LABEL, TOPIC_LABEL } from '../labels.ts';
import { decisionText, legend, optionText, prose, redacted, type PlayCtx } from '../common.ts';

function sourceList(sources: (Source & { note?: string })[]) {
  return h('ol', { class: 'sources' },
    sources.map((s) =>
      h('li', null, s.note ? `${s.note} ` : null, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title)),
    ),
  );
}

export function reveal(ctx: PlayCtx, onReplay: () => void): HTMLElement {
  const section = h('section', { class: 'screen reveal' }, h('p', { class: 'muted' }, '가림을 걷는 중…'));
  loadReveal(ctx.scenario.id)
    .then((r) => section.replaceChildren(...revealBody(ctx, r, onReplay).filter((n): n is HTMLElement => n !== null)))
    .catch((e) => section.replaceChildren(h('p', { class: 'error' }, `공개 자료를 불러오지 못했다: ${(e as Error).message}`)));
  return section;
}

function revealBody(ctx: PlayCtx, r: PublicReveal, onReplay: () => void): (HTMLElement | null)[] {
  const { scenario, play } = ctx;
  const names = Object.fromEntries(r.identities.map((i) => [i.entity, i.name]));
  const same = play.option === r.actual_choice;
  const opened = play.inquiry.opened
    .map((id) => scenario.dossier.find((c) => c.id === id))
    .filter((c): c is Card => !!c);
  const misreported = opened.filter((c) => isMisreported(c, play.seed));
  const optionCf = new Map(r.counterfactuals.map((c) => [c.option, c.text]));
  const cardTitle = new Map(scenario.dossier.map((c) => [c.id, c.title]));
  const cardSources = Object.entries(r.card_sources).flatMap(([id, list]) =>
    list.map((s) => ({ ...s, note: `${cardTitle.get(id) ?? id}:` })),
  );

  return [
    // 단 한 번의 연출: 처음 읽었던 전문에서 가림 막대가 걷힌다
    h('div', { class: 'unmask' },
      h('h1', null, r.who),
      h('p', { class: 'role' }, ...redacted(scenario, scenario.masked.role, names)),
      ...scenario.masked.situation.flatMap((p) => prose(scenario, p, names)),
    ),
    legend(scenario, names),

    h('h2', null, '실제로 고른 길'),
    h('div', { class: 'actual' },
      h('p', { class: 'actual-choice' }, ...optionText(scenario, r.actual_choice, names)),
      r.actual_details?.length ? h('ul', null, r.actual_details.map((d) => h('li', null, ...decisionText(scenario, d, names)))) : null,
      h('p', { class: 'verdict' }, same ? '당신과 같은 길을 골랐다.' : '당신과 다른 길을 골랐다.'),
    ),

    h('h2', null, '두 사람의 이유'),
    h('div', { class: 'side-by-side' },
      h('div', { class: 'mine' },
        h('h3', null, '당신'),
        h('p', { class: 'mine-choice' }, ...optionText(scenario, play.option, names)),
        play.details.length ? h('ul', null, play.details.map((d) => h('li', null, ...decisionText(scenario, d, names)))) : null,
        ...paragraphs(play.reason || '(이유를 적지 않았다)'),
        play.afterthought ? h('div', { class: 'after' }, h('h4', null, '반론을 듣고 덧붙인 생각'), ...paragraphs(play.afterthought)) : null,
      ),
      h('div', { class: 'theirs' }, h('h3', null, '실제 결정자'), ...paragraphs(r.actual_reasoning)),
    ),

    h('h2', null, '그 뒤'),
    h('div', { class: 'outcome' }, ...paragraphs(r.outcome)),

    r.counterfactuals.length
      ? h('div', { class: 'counterfactuals' },
          h('h2', null, '가지 않은 길'),
          h('p', { class: 'muted' }, '아래는 정황과 역사가의 해석에 기댄 추정이다.'),
          scenario.masked.options
            .filter((o) => optionCf.has(o.key))
            .map((o) =>
              h('section', { class: 'cf' },
                h('h3', null, ...optionText(scenario, o.key, names)),
                ...paragraphs(optionCf.get(o.key)!),
              ),
            ),
        )
      : null,

    h('h2', null, '틀린 보고'),
    misreported.length
      ? h('div', { class: 'corrections' },
          misreported.map((c) =>
            h('div', { class: 'correction' },
              h('p', { class: 'report-from' }, `${ADVISOR_LABEL[c.advisor]}, ${TOPIC_LABEL[c.topic]}에 대해`),
              h('h3', null, ...redacted(scenario, c.title, names)),
              h('p', null, h('del', null, ...redacted(scenario, c.misreport!, names))),
              h('p', null, ...redacted(scenario, c.text, names)),
            ),
          ),
        )
      : h('p', { class: 'muted' }, '이번 판에서 받은 보고는 모두 사실이었다.'),
    r.misreport_notes ? h('div', { class: 'note' }, ...paragraphs(r.misreport_notes)) : null,
    h('p', { class: 'muted small' }, '틀린 보고는 당시 정보의 불확실성을 흉내 낸 게임 장치다. 판마다 다르게 나온다.'),

    h('h2', null, '이번 판의 성향'),
    play.tags.length ? h('p', { class: 'tags' }, play.tags.join(', ')) : h('p', { class: 'muted' }, '붙은 성향이 없다.'),
    h('p', { class: 'muted small' }, '점수는 없다. 실제 선택이 옳았다는 보장도 없다.'),

    h('h2', null, '출처'),
    sourceList(r.sources),
    cardSources.length
      ? h('details', { class: 'more-sources' }, h('summary', null, `보고별 출처 ${cardSources.length}건`), sourceList(cardSources))
      : null,

    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: onReplay }, '이 판 다시 하기'),
      h('a', { class: 'btn-text', href: '#/' }, '사건 목록'),
    ),
  ];
}
