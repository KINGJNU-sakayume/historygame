import { applyResult, ask, cardsFor, remaining, reportText, type InquiryResult } from '../../engine/inquiry.ts';
import { ADVISORS, TOPICS, type AdvisorId, type Card, type PublicScenario, type TopicId } from '../../types.ts';
import { ents, keyPanel, prose, situation, type PlayCtx } from '../common.ts';
import { h } from '../dom.ts';
import { ADVISOR_LABEL, ADVISOR_MOTTO, TOPIC_LABEL } from '../labels.ts';
import { tally } from '../tally.ts';

// 화면 안에서만 쓰는 상태 (저장하지 않음)
let selected: AdvisorId | null = null;
let last: { advisor: AdvisorId; topic: TopicId; result: InquiryResult } | null = null;
let lastPlayId = '';

/** 받은 보고 한 건. n은 받은 순서. */
export function report(scenario: PublicScenario, card: Card, seed: string, n?: number, fresh = false) {
  // 보고 한 건 안에서 처음 나오는 기호에만 풀이를 단다
  const gloss = new Set<string>();
  return h('article', { class: `report${fresh ? ' fresh' : ''}` },
    h('p', { class: 'report-from' },
      n !== undefined ? h('span', { class: 'report-no' }, String(n)) : null,
      `${ADVISOR_LABEL[card.advisor]}, ${TOPIC_LABEL[card.topic]}에 대해`,
    ),
    h('h3', null, ...ents(scenario, card.title)),
    ...prose(scenario, reportText(card, seed), { gloss }),
  );
}

function reply(who: string, text: string) {
  return h('p', { class: 'reply' }, h('span', { class: 'reply-who' }, who), text);
}

export function inquiry(ctx: PlayCtx): HTMLElement {
  const { scenario, play } = ctx;
  if (lastPlayId !== play.playId) {
    selected = null;
    last = null;
    lastPlayId = play.playId;
  }
  const left = remaining(play.inquiry, play.limit);
  const opened = play.inquiry.opened
    .map((id) => scenario.dossier.find((c) => c.id === id))
    .filter((c): c is Card => !!c);

  const onAsk = (advisor: AdvisorId, topic: TopicId) => {
    const result = ask(scenario.dossier, play.inquiry, play.limit, advisor, topic);
    last = { advisor, topic, result };
    ctx.commit((p) => (p.inquiry = applyResult(p.inquiry, advisor, topic, result)));
    setTimeout(() => document.querySelector('.answer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  };

  const topicState = (advisor: AdvisorId, topic: TopicId) => {
    if (play.inquiry.unknown.includes(`${advisor}:${topic}`)) return 'unknown';
    const cards = cardsFor(scenario.dossier, advisor, topic);
    if (cards.length > 0 && cards.every((c) => play.inquiry.opened.includes(c.id))) return 'heard';
    return '';
  };

  const answer = (() => {
    if (!last) return null;
    const who = ADVISOR_LABEL[last.advisor];
    switch (last.result.kind) {
      case 'card':
        return report(scenario, last.result.card, play.seed, opened.length, true);
      case 'unknown':
        return reply(who, '당시 정보망으로는 알 수 없음.');
      case 'no-more':
        return reply(who, '그 일은 이미 아뢴 것이 전부입니다.');
      case 'exhausted':
        return reply('시종장', '시간이 다 되었습니다. 더는 물으실 수 없습니다.');
    }
  })();

  const earlier = opened.filter((c) => !(last?.result.kind === 'card' && last.result.card.id === c.id));

  return h(
    'section',
    { class: 'screen inquiry' },
    h('div', { class: 'toolbar' },
      tally(play.limit, play.inquiry.opened.length),
      keyPanel(scenario),
      h('button', { class: 'btn', onclick: () => ctx.commit((p) => (p.phase = 'decision'), { top: true }) }, '결정하러 가기'),
    ),
    h('details', { class: 'recap' }, h('summary', null, '상황 다시 읽기'), situation(scenario, ctx.mapSvg)),
    h('div', { class: 'inquiry-grid' },
    h('div', { class: 'ask-col' },
    h('h2', null, left === 0 ? '더 물을 시간이 없다' : '누구에게 물을까'),
    h('ul', { class: 'advisors', role: 'radiogroup', 'aria-label': '자문관' },
      ADVISORS.map((a) =>
        h('li', null,
          h('button', {
            class: `advisor${selected === a ? ' selected' : ''}`,
            role: 'radio',
            'aria-checked': String(selected === a),
            onclick: () => {
              selected = a;
              last = null;
              ctx.commit(() => {});
            },
          },
            h('span', { class: 'advisor-name' }, ADVISOR_LABEL[a]),
            h('span', { class: 'advisor-motto' }, ADVISOR_MOTTO[a]),
          ),
          selected === a
            ? h('div', { class: 'topics', 'aria-label': `${ADVISOR_LABEL[a]}에게 물을 주제` },
                TOPICS.map((t) => {
                  const st = topicState(a, t);
                  return h('button', { class: `topic ${st}`, onclick: () => onAsk(a, t) },
                    TOPIC_LABEL[t],
                    st === 'heard' ? h('small', null, ' 들음') : st === 'unknown' ? h('small', null, ' 모름') : null,
                  );
                }),
              )
            : null,
        ),
      ),
    ),
    h('div', { class: 'answer', 'aria-live': 'polite' }, answer),
    ),
    h('div', { class: 'dossier' },
      h('h2', null, `받은 보고 (${opened.length})`),
      earlier.length === 0 && !answer
        ? h('p', { class: 'muted' }, '아직 받은 보고가 없다. 자문관을 골라 물어라.')
        : earlier
            .map((c) => report(scenario, c, play.seed, opened.indexOf(c) + 1))
            .reverse(),
    ),
    ),
  );
}
