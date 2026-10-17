// 시드 고정 의사난수 생성기. 빌드 셔플(Node)과 오보 판정(브라우저)이 같이 쓴다.

/** 문자열을 32비트 시드로 바꾼다 (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: [0, 1) 균등 분포 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates 셔플. 원본은 건드리지 않는다. */
export function shuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed));
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 시드와 키로 정해지는 [0, 1) 값 하나 */
export function roll(seed: string, key: string): number {
  return mulberry32(hashSeed(`${seed}:${key}`))();
}
