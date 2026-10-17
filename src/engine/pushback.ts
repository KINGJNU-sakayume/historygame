import type { Pushback, PushbackCondition } from '../types.ts';

export function matches(when: PushbackCondition, option: string, details: readonly string[]): boolean {
  if (when.option && when.option.length > 0 && !when.option.includes(option)) return false;
  if (when.all && !when.all.every((d) => details.includes(d))) return false;
  if (when.any && when.any.length > 0 && !when.any.some((d) => details.includes(d))) return false;
  if (when.none && when.none.some((d) => details.includes(d))) return false;
  return true;
}

/** 선택지·세부 결정 조합에 걸리는 반론 이벤트 (시나리오에 적힌 순서) */
export function triggeredPushbacks(
  pushbacks: readonly Pushback[],
  option: string,
  details: readonly string[],
): Pushback[] {
  return pushbacks.filter((p) => matches(p.when, option, details));
}
