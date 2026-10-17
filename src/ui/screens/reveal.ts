import { compare } from '../../engine/compare.ts';
import { isMisreported } from '../../engine/inquiry.ts';
import { figureUrl, loadReveal, loadRevealMap } from '../../data.ts';
import type { Card, Figure, PublicReveal, Source } from '../../types.ts';
import { h, paragraphs } from '../dom.ts';
import { ADVISOR_LABEL, TOPIC_LABEL } from '../labels.ts';
import { decisionText, ents, legend, optionOf, optionText, prose, svgFigure, type PlayCtx } from '../common.ts';

function sourceList(sources: (Source & { note?: string })[]) {
  return h('ol', { class: 'sources' },
    sources.map((s) =>
      h('li', null, s.note ? `${s.note} ` : null, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title)),
    ),
  );
}

export function reveal(ctx: PlayCtx, onReplay: () => void): HTMLElement {
  const section = h('section', { class: 'screen reveal' }, h('p', { class: 'muted' }, '공개 자료를 여는 중…'));
  const id = ctx.scenario.id;
  loadReveal(id)
    .then(async (r) => {
      const map = r.map_svg ? await loadRevealMap(id).catch(() => null) : null;
      section.replaceChildren(...revealBody(ctx, r, map, onReplay).filter((n): n is HTMLElement => n !== null));
    })
    .catch((e) => section.replaceChildren(h('p', { class: 'error' }, `공개 자료를 불러오지 못했다: ${(e as Error).message}`)));
  return section;
}

/** 인물 카드. 초상화는 게임 색으로 듀오톤 처리하고 출처를 붙인다. */
function figureCard(scenarioId: string, f: Figure) {
  return h('figure', { class: 'person' },
    f.image
      ? h('img', { src: figureUrl(scenarioId, f.image), alt: `${f.name} 초상`, loading: 'lazy' })
      : h('div', { class: 'person-blank', 'aria-hidden': 'true' }, f.name.slice(0, 1)),
    h('figcaption', null,
      h('strong', null, f.name),
      h('span', { class: 'person-role' }, f.role),
      f.caption ? h('span', { class: 'person-credit' }, f.caption) : null,
      h('a', { class: 'person-credit', href: f.source_url, target: '_blank', rel: 'noopener noreferrer' }, `${f.credit}, ${f.license}`),
    ),
  );
}

const DID = (v: boolean | null) => (v === null ? '기록 없음' : v ? '함' : '안 함');

function revealBody(ctx: PlayCtx, r: PublicReveal, mapSvg: string | null, onReplay: () => void): (HTMLElement | null)[] {
  const { scenario, play } = ctx;
  const names = Object.fromEntries(r.identities.map((i) => [i.entity, i.name]));
  const cmp = compare(scenario.masked.decisions.map((d) => d.id), play.option, play.details, r);
  const opened = play.inquiry.opened
    .map((id) => scenario.dossier.find((c) => c.id === id))
    .filter((c): c is Card => !!c);
  const misreported = opened.filter((c) => isMisreported(c, play.seed));
  const optionCf = new Map(r.counterfactuals.map((c) => [c.option, c.text]));
  const cardTitle = new Map(scenario.dossier.map((c) => [c.id, c.title]));
  const cardSources = Object.entries(r.card_sources).flatMap(([id, list]) =>
    list.map((s) => ({ ...s, note: `${cardTitle.get(id) ?? id}:` })),
  );
  const unknown = cmp.rows.length - cmp.known;

  return [
    // 정체: 결정자와 인물, 실제 지도
    h('div', { class: 'reveal-hero' },
      h('div', { class: 'identity' },
        h('p', { class: 'kicker' }, '정체'),
        h('h1', null, r.who),
        h('div', { class: 'people' }, r.figures.map((f) => figureCard(scenario.id, f))),
      ),
      svgFigure(mapSvg, 'map reveal-map'),
    ),
    legend(scenario, names),
    h('details', { class: 'reread' },
      h('summary', null, '처음 읽은 상황을 실명으로 다시 읽기'),
      h('p', { class: 'role' }, ...ents(scenario, scenario.masked.role, { names })),
      ...scenario.masked.situation.flatMap((p) => prose(scenario, p, { names })),
    ),

    // 당신 대 실제: 방침과 세부 결정을 한 줄씩
    h('h2', null, '당신과 실제'),
    h('p', { class: 'verdict' },
      cmp.sameOption ? '방침은 같았다. ' : '방침이 달랐다. ',
      `기록이 남은 세부 판단 ${cmp.known}개 가운데 ${cmp.same}개가 같았다.`,
      unknown ? ` 기록이 없는 것이 ${unknown}개 있다.` : '',
    ),
    h('div', { class: 'compare-wrap' },
      h('table', { class: 'compare' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, ''), h('th', { scope: 'col' }, '당신'), h('th', { scope: 'col' }, '실제'), h('th', { scope: 'col' }, ''))),
        h('tbody', null,
          h('tr', { class: `option-row ${cmp.sameOption ? 'same' : 'different'}` },
            h('th', { scope: 'row' },
              h('span', { class: 'row-label' }, '방침'),
              // 좁은 화면: 칸에는 갑·을만, 방침 글은 여기 한 줄로
              h('span', { class: 'row-note opt-note' },
                cmp.sameOption
                  ? optionText(scenario, r.actual_choice, { names })
                  : [h('span', { class: 'opt-line' }, '당신: ', ...optionText(scenario, play.option, { names })),
                     h('span', { class: 'opt-line' }, '실제: ', ...optionText(scenario, r.actual_choice, { names }))],
              ),
            ),
            h('td', { class: 'mine-cell' }, h('span', { class: 'letter' }, optionOf(scenario, play.option)?.letter ?? '—'), h('span', { class: 'opt-full' }, ...optionText(scenario, play.option, { names }).slice(1))),
            h('td', null, h('span', { class: 'letter' }, optionOf(scenario, r.actual_choice)?.letter ?? '—'), h('span', { class: 'opt-full' }, ...optionText(scenario, r.actual_choice, { names }).slice(1))),
            h('td', { class: 'agree' }, cmp.sameOption ? '같음' : '다름'),
          ),
          cmp.rows.map((row) =>
            h('tr', { class: row.agreement },
              h('th', { scope: 'row' },
                h('span', { class: 'row-label' }, ...decisionText(scenario, row.id, { names })),
                h('span', { class: 'row-note' }, row.note),
              ),
              h('td', { class: 'mine-cell' }, row.mine ? '함' : '안 함'),
              h('td', null, DID(row.actual)),
              h('td', { class: 'agree' }, row.agreement === 'same' ? '같음' : row.agreement === 'different' ? '다름' : '—'),
            ),
          ),
        ),
      ),
    ),

    h('h2', null, '두 사람의 이유'),
    h('div', { class: 'side-by-side' },
      h('div', { class: 'mine' },
        h('h3', null, '당신'),
        ...paragraphs(play.reason || '(이유를 적지 않았다)'),
        play.afterthought ? h('div', { class: 'after' }, h('h4', null, '반론을 듣고 덧붙인 생각'), ...paragraphs(play.afterthought)) : null,
      ),
      h('div', { class: 'theirs' },
        h('h3', null, '실제 결정자'),
        h('ul', { class: 'points' }, r.summary_points.map((p) => h('li', null, p))),
        h('details', { class: 'more' }, h('summary', null, '자세히 읽기'), ...paragraphs(r.actual_reasoning)),
      ),
    ),

    h('h2', null, '그 뒤'),
    h('ol', { class: 'timeline' },
      r.timeline.map((t) => h('li', null, h('span', { class: 'when' }, t.when), h('span', { class: 'what' }, t.text))),
    ),
    h('details', { class: 'more' }, h('summary', null, '결과 자세히 읽기'), ...paragraphs(r.outcome)),

    r.counterfactuals.length
      ? h('div', { class: 'counterfactuals' },
          h('h2', null, '가지 않은 길'),
          h('p', { class: 'muted' }, '정황과 역사가의 해석에 기댄 추정이다.'),
          h('div', { class: 'cf-grid' },
            scenario.masked.options
              .filter((o) => optionCf.has(o.key))
              .map((o) =>
                h('section', { class: 'cf' },
                  h('h3', null, h('span', { class: 'guess' }, '추정'), ...optionText(scenario, o.key, { names })),
                  ...paragraphs(optionCf.get(o.key)!),
                ),
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
              h('h3', null, ...ents(scenario, c.title, { names })),
              h('p', null, h('del', null, ...ents(scenario, c.misreport!, { names }))),
              h('p', null, ...ents(scenario, c.text, { names })),
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
