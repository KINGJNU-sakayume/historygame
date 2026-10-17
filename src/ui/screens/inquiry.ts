import { applyResult, ask, cardsFor, remaining, reportText, type InquiryResult } from '../../engine/inquiry.ts';
import { ADVISORS, TOPICS, type AdvisorId, type Card, type TopicId } from '../../types.ts';
import { clock } from '../clock.ts';
import { situation, telegram, type PlayCtx } from '../common.ts';
import { h, paragraphs } from '../dom.ts';
import { ADVISOR_GLYPH, ADVISOR_LABEL, ADVISOR_MOTTO, TOPIC_LABEL } from '../labels.ts';

// 화면 안에서만 쓰는 상태 (저장하지 않음)
let selected: AdvisorId | null = null;
let last: { advisor: AdvisorId; topic: TopicId; result: InquiryResult } | null = null;
let lastPlayId = '';

export function cardTelegram(card: Card, seed: string, fresh = false) {
  return telegram(
    {
      from: ADVISOR_LABEL[card.advisor],
      subject: `${TOPIC_LABEL[card.topic]} · ${card.title}`,
      cls: fresh ? 'fresh' : '',
    },
    ...paragraphs(reportText(card, seed)),
  );
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
    setTimeout(() => document.querySelector('.response')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  };

  const topicState = (advisor: AdvisorId, topic: TopicId) => {
    if (play.inquiry.unknown.includes(`${advisor}:${topic}`)) return 'unknown';
    const cards = cardsFor(scenario.dossier, advisor, topic);
    if (cards.length > 0 && cards.every((c) => play.inquiry.opened.includes(c.id))) return 'heard';
    return '';
  };

  const response = (() => {
    if (!last) return h('p', { class: 'muted' }, selected ? '무엇을 물을지 고르라.' : '먼저 자문관을 고르라.');
    const who = ADVISOR_LABEL[last.advisor];
    switch (last.result.kind) {
      case 'card':
        return cardTelegram(last.result.card, play.seed, true);
      case 'unknown':
        return telegram({ from: who, cls: 'unknown' }, h('p', null, '당시 정보망으로는 알 수 없음.'));
      case 'no-more':
        return telegram({ from: who, cls: 'unknown' }, h('p', null, '그 일에 대해서는 이미 아뢴 것이 전부입니다.'));
      case 'exhausted':
        return telegram({ from: '시종장', cls: 'unknown' }, h('p', null, '시한이 다 되었습니다. 더는 물으실 수 없습니다.'));
    }
  })();

  return h(
    'section',
    { class: 'screen inquiry' },
    h(
      'div',
      { class: 'toolbar' },
      clock(play.limit, play.inquiry.opened.length),
      h('div', { class: 'toolbar-text' },
        h('strong', null, '자문 회의'),
        h('span', null, left === 0 ? '시한이 다 되었다' : '자문관에게 물어라'),
      ),
      h('button', { class: 'btn primary', onclick: () => ctx.commit((p) => (p.phase = 'decision'), { top: true }) }, '판단하기'),
    ),
    h('details', { class: 'recap' }, h('summary', null, '상황 다시 보기'), situation(scenario, ctx.mapSvg)),
    h(
      'div',
      { class: 'advisors', role: 'radiogroup', 'aria-label': '자문관' },
      ADVISORS.map((a) =>
        h(
          'button',
          {
            class: `advisor ${selected === a ? 'selected' : ''}`,
            role: 'radio',
            'aria-checked': String(selected === a),
            onclick: () => {
              selected = a;
              last = null;
              ctx.commit(() => {}, { rerender: true });
            },
          },
          h('span', { class: 'advisor-glyph', 'aria-hidden': 'true' }, ADVISOR_GLYPH[a]),
          h('span', { class: 'advisor-name' }, ADVISOR_LABEL[a]),
          h('span', { class: 'advisor-motto' }, ADVISOR_MOTTO[a]),
        ),
      ),
    ),
    selected
      ? h(
          'div',
          { class: 'topics', 'aria-label': `${ADVISOR_LABEL[selected]}에게 물을 주제` },
          TOPICS.map((t) => {
            const st = topicState(selected!, t);
            return h(
              'button',
              { class: `chip ${st}`, onclick: () => onAsk(selected!, t) },
              TOPIC_LABEL[t],
              st === 'heard' ? h('small', null, ' · 들음') : st === 'unknown' ? h('small', null, ' · 모름') : null,
            );
          }),
        )
      : null,
    h('div', { class: 'response', 'aria-live': 'polite' }, response),
    h(
      'div',
      { class: 'dossier' },
      h('h2', null, `서류철 (${opened.length})`),
      opened.length === 0
        ? h('p', { class: 'muted' }, '아직 받은 보고가 없다.')
        : opened
            .filter((c) => !(last?.result.kind === 'card' && last.result.card.id === c.id))
            .reverse()
            .map((c) => cardTelegram(c, play.seed)),
    ),
  );
}
