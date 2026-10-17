import type { AdvisorId, TopicId } from '../types.ts';

export const ADVISOR_LABEL: Record<AdvisorId, string> = {
  foreign: '외무대신',
  general: '장군',
  finance: '재무대신',
  spymaster: '첩보 책임자',
  chamberlain: '시종',
};

export const ADVISOR_MOTTO: Record<AdvisorId, string> = {
  foreign: '외교, 동맹, 사절',
  general: '병력, 요새, 전황',
  finance: '국고, 세수, 교역',
  spymaster: '밀정, 적국 동향',
  chamberlain: '궁정, 혈연, 민심',
};

export const TOPIC_LABEL: Record<TopicId, string> = {
  geography: '지리',
  military: '군사',
  finance: '재정',
  lineage: '혈연',
  opinion: '여론',
  ally: '동맹국 실체',
  enemy: '적국 내부 사정',
};
