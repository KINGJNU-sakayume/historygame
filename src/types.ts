// 시나리오 데이터 타입. config/scenario.schema.json과 1:1로 맞춘다.

export const ADVISORS = ['foreign', 'general', 'finance', 'spymaster', 'chamberlain'] as const;
export type AdvisorId = (typeof ADVISORS)[number];

export const TOPICS = ['geography', 'military', 'finance', 'lineage', 'opinion', 'ally', 'enemy'] as const;
export type TopicId = (typeof TOPICS)[number];

export interface Source {
  title: string;
  url: string;
}

export interface Entity {
  id: string;
  label: string;
  /** 플레이어가 맡은 나라. 한 시나리오에 하나. */
  self?: boolean;
}

export interface Option {
  key: string;
  text: string;
  /** 빌드 시 셔플 후 부여되는 갑·을·병·정. 원본 JSON에는 없다. */
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

/** 세부 결정 하나에 대한 실제 기록. did: 했다(true) / 하지 않았다(false) / 기록 없음·출처 충돌(null) */
export interface DecisionFact {
  did: boolean | null;
  note: string;
}

export interface Figure {
  name: string;
  role: string;
  /** scenarios/<id>/figures/ 안의 파일 이름. 퍼블릭 도메인만. */
  image?: string;
  caption?: string;
  credit: string;
  license: string;
  source_url: string;
}

export interface Reveal {
  who: string;
  identities: { entity: string; name: string }[];
  /** 마스킹 영역에 나오면 안 되는 실명·지명·연도. identities의 name과 reveal 본문의 연도는 자동으로 추가된다. */
  redact: string[];
  actual_choice: string;
  /** 모든 세부 결정 id를 빠짐없이 덮는다 */
  decisions: Record<string, DecisionFact>;
  /** 실제 결정자의 논리 요약 2~4줄 */
  summary_points: string[];
  actual_reasoning: string;
  timeline: { when: string; text: string }[];
  figures: Figure[];
  /** 공개 화면 전용 실제 지리 지도 (scenarios/<id>/ 안의 파일 이름) */
  map_svg?: string;
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
