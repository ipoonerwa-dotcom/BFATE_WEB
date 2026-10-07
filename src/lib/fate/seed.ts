/* 确定性随机数：同一个人、同一天、同一件事，每次算出来都一样。 */

/** FNV-1a 32 位哈希。 */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32：由种子生成 [0,1) 的伪随机序列。 */
export function rng(seedText: string) {
  let a = hash32(seedText) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 从数组里按随机数取一个。 */
export const pick = <T,>(items: readonly T[], r: () => number): T => items[Math.floor(r() * items.length) % items.length];

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
