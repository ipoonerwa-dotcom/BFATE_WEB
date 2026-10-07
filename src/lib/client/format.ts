const DIGIT = "零一二三四五六七八九";

/** 1–99 的中文数字：17 → 十七，30 → 三十。 */
export function cnNumber(n: number): string {
  if (n < 10) return DIGIT[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens === 1 ? "" : DIGIT[tens]}十${ones ? DIGIT[ones] : ""}`;
}

/** 2026-10-07 → 二〇二六年十月七日 */
export function cnDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = [...m[1]].map((c) => "〇一二三四五六七八九"[Number(c)]).join("");
  return `${year}年${cnNumber(Number(m[2]))}月${cnNumber(Number(m[3]))}日`;
}

export const SHICHEN = [
  { zhi: "子", hour: 0, range: "23–01" },
  { zhi: "丑", hour: 2, range: "01–03" },
  { zhi: "寅", hour: 4, range: "03–05" },
  { zhi: "卯", hour: 6, range: "05–07" },
  { zhi: "辰", hour: 8, range: "07–09" },
  { zhi: "巳", hour: 10, range: "09–11" },
  { zhi: "午", hour: 12, range: "11–13" },
  { zhi: "未", hour: 14, range: "13–15" },
  { zhi: "申", hour: 16, range: "15–17" },
  { zhi: "酉", hour: 18, range: "17–19" },
  { zhi: "戌", hour: 20, range: "19–21" },
  { zhi: "亥", hour: 22, range: "21–23" },
] as const;

export const WX_COLOR: Record<string, string> = { 木: "#4f7a5a", 火: "#b3312a", 土: "#a9843f", 金: "#8f8a80", 水: "#2e4656" };
export const GAN_WX: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
export const ZHI_WX: Record<string, string> = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
