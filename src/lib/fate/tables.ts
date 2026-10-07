/* 干支、五行与合冲刑害——命理计算用到的全部固定表。 */

export const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export type Gan = (typeof GAN)[number];
export type Zhi = (typeof ZHI)[number];

export const WUXING = ["木", "火", "土", "金", "水"] as const;
export type WuXing = (typeof WUXING)[number];

export const GAN_WX: Record<string, WuXing> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
export const ZHI_WX: Record<string, WuXing> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
export const SHENGXIAO: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龙", 巳: "蛇", 午: "马", 未: "羊", 申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪",
};

/** 五行相生：木生火、火生土、土生金、金生水、水生木。 */
const SHENG: Record<WuXing, WuXing> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
/** 五行相克：木克土、土克水、水克火、火克金、金克木。 */
const KE: Record<WuXing, WuXing> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

export const sheng = (a: WuXing, b: WuXing) => SHENG[a] === b;
export const ke = (a: WuXing, b: WuXing) => KE[a] === b;
/** 生我者：能生出 x 的那一行。 */
export const shengWo = (x: WuXing) => (Object.keys(SHENG) as WuXing[]).find((k) => SHENG[k] === x)!;

const pair = (a: string, b: string) => [a, b].sort().join("");
const toSet = (pairs: string[]) => new Set(pairs.map((p) => pair(p[0], p[1])));

/** 天干五合。 */
const GAN_HE = toSet(["甲己", "乙庚", "丙辛", "丁壬", "戊癸"]);
/** 地支六合、六冲、六害。 */
const ZHI_LIUHE = toSet(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]);
const ZHI_CHONG = toSet(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"]);
const ZHI_HAI = toSet(["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"]);
/** 地支相刑（两两成刑的组合）：寅巳申、丑戌未为三刑，子卯相刑。 */
const ZHI_XING = toSet(["寅巳", "巳申", "申寅", "丑戌", "戌未", "未丑", "子卯"]);
/** 三合局。 */
const SANHE: string[][] = [
  ["申", "子", "辰"],
  ["亥", "卯", "未"],
  ["寅", "午", "戌"],
  ["巳", "酉", "丑"],
];

export const ganHe = (a: string, b: string) => GAN_HE.has(pair(a, b));
export const zhiLiuHe = (a: string, b: string) => ZHI_LIUHE.has(pair(a, b));
export const zhiChong = (a: string, b: string) => ZHI_CHONG.has(pair(a, b));
export const zhiHai = (a: string, b: string) => ZHI_HAI.has(pair(a, b));
export const zhiXing = (a: string, b: string) => a !== b && ZHI_XING.has(pair(a, b));
export const zhiSanHe = (a: string, b: string) => a !== b && SANHE.some((g) => g.includes(a) && g.includes(b));

export type ZhiRelation = "六合" | "三合" | "六冲" | "六害" | "相刑" | "同支" | "无";

/** 两个地支之间最显著的一种关系。 */
export function zhiRelation(a: string, b: string): ZhiRelation {
  if (a === b) return "同支";
  if (zhiLiuHe(a, b)) return "六合";
  if (zhiChong(a, b)) return "六冲";
  if (zhiSanHe(a, b)) return "三合";
  if (zhiHai(a, b)) return "六害";
  if (zhiXing(a, b)) return "相刑";
  return "无";
}

/** 桃花（咸池）：由年支或日支所在的三合局决定。 */
export function taoHua(zhi: string): string {
  if ("申子辰".includes(zhi)) return "酉";
  if ("寅午戌".includes(zhi)) return "卯";
  if ("巳酉丑".includes(zhi)) return "午";
  return "子"; // 亥卯未
}

/** 五行对应的颜色、数字（河图数）与方位，用于幸运提示。 */
export const WX_LUCK: Record<WuXing, { color: string; colorHex: string; numbers: [number, number]; direction: string }> = {
  木: { color: "青绿", colorHex: "#4F7A5A", numbers: [3, 8], direction: "东" },
  火: { color: "朱红", colorHex: "#B8352A", numbers: [2, 7], direction: "南" },
  土: { color: "赭黄", colorHex: "#B8893B", numbers: [5, 10], direction: "中" },
  金: { color: "月白", colorHex: "#C9C2B2", numbers: [4, 9], direction: "西" },
  水: { color: "玄青", colorHex: "#2E4057", numbers: [1, 6], direction: "北" },
};
