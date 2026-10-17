// 시나리오 데이터 타입. config/scenario.schema.json과 1:1로 맞춘다.

export const ADVISORS = ['foreign', 'general', 'finance', 'spymaster', 'chamberlain'] as const;
export type AdvisorId = (typeof ADVISORS)[number];

export const TOPICS = ['geography', 'military', 'finance', 'lineage', 'opinion', 'ally', 'enemy'] as const;
export type TopicId = (typeof TOPICS)[number];

export const CRESTS = ['anchor', 'eagle', 'lion', 'tower', 'ship', 'crown', 'star', 'cross', 'sun', 'key'] as const;
export type CrestId = (typeof CRESTS)[number];

export interface Source {
  title: string;
  url: string;
}

export interface Entity {
  id: string;
  label: string;
  crest: CrestId;
}

export interface Option {
  key: string;
  text: string;
  /** 빌드 시 셔플 후 부여되는 A~D 글자. 원본 JSON에는 없다. */
  letter?: string;
}

export interface Decision {
  id: string;
  group: string;
  label: string;
}

export interface Card {
  id: string;
  advisor: AdvisorId;
  topic: TopicId;
  title: string;
  text: string;
  /** 0~1. misreport가 있을 때 (1 - reliability) 확률로 왜곡 보고가 나온다. */
  reliability: number;
  misreport?: string;
  /** 원본에만 있다. 빌드 시 공개용 파일로 옮겨진다. */
  sources?: Source[];
}

export interface PushbackCondition {
  /** 이 선택지 중 하나를 골랐을 때 */
  option?: string[];
  /** 이 세부 결정을 모두 체크했을 때 */
  all?: string[];
  /** 이 세부 결정 중 하나라도 체크했을 때 */
  any?: string[];
  /** 이 세부 결정을 하나도 체크하지 않았을 때 */
  none?: string[];
}

export interface Pushback {
  id: string;
  when: PushbackCondition;
  advisor: AdvisorId;
  title: string;
  text: string;
}

export interface Masked {
  title: string;
  role: string;
  situation: string[];
  map_svg?: string;
  entities: Entity[];
  options: Option[];
  decisions: Decision[];
  inquiry_limit?: number;
}

export interface Reveal {
  who: string;
  identities: { entity: string; name: string }[];
  /** 마스킹 영역에 나오면 안 되는 실명·지명·연도. identities의 name과 reveal 본문의 연도는 자동으로 추가된다. */
  redact: string[];
  actual_choice: string;
  actual_details?: string[];
  actual_reasoning: string;
  outcome: string;
  counterfactuals: { option: string; text: string }[];
  misreport_notes?: string;
  sources: Source[];
}

export interface Scenario {
  id: string;
  dossier: Card[];
  masked: Masked;
  pushbacks: Pushback[];
  tags: {
    options: Record<string, string[]>;
    decisions?: Record<string, string[]>;
  };
  reveal: Reveal;
}

/** 빌드 산출물: 플레이 중 읽는 파일 (reveal, 카드 출처 제외) */
export type PublicScenario = Omit<Scenario, 'reveal'>;

/** 빌드 산출물: 공개 화면에서만 읽는 파일 */
export interface PublicReveal extends Reveal {
  card_sources: Record<string, Source[]>;
}

export interface ScenarioIndexEntry {
  id: string;
  title: string;
}
