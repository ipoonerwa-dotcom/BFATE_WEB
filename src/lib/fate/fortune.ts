/* 今日运势：以日主看今天的干支，结合黄历、合冲与桃花，算出四项分数、一支签和十二时辰 K 线。 */
import { almanacFor, computeBazi, shiShen, type Almanac, type Bazi, type BirthInput } from "./bazi";
import { clamp, pick, rng } from "./seed";
import { GAN_WX, WUXING, WX_LUCK, shengWo, taoHua, zhiRelation, type WuXing, type ZhiRelation } from "./tables";
import {
  DIM_TEXT,
  DIMENSIONS,
  QIAN_JIE,
  QIAN_LEVELS,
  QIAN_POEMS,
  REMEDY,
  SHISHEN_THEME,
  type Dimension,
  type QianLevel,
} from "./texts";

/** 十神对四项运势与总运的影响。 */
const SHISHEN_WEIGHT: Record<string, Record<Dimension | "总", number>> = {
  比肩: { 事业: 2, 财运: -2, 感情: 0, 健康: 3, 总: 1 },
  劫财: { 事业: 0, 财运: -7, 感情: -2, 健康: 1, 总: -2 },
  食神: { 事业: 2, 财运: 3, 感情: 4, 健康: 5, 总: 4 },
  伤官: { 事业: -3, 财运: 2, 感情: -3, 健康: -1, 总: -1 },
  偏财: { 事业: 1, 财运: 8, 感情: 3, 健康: 0, 总: 3 },
  正财: { 事业: 2, 财运: 7, 感情: 3, 健康: 0, 总: 4 },
  七杀: { 事业: 3, 财运: -1, 感情: -2, 健康: -5, 总: -2 },
  正官: { 事业: 7, 财运: 1, 感情: 3, 健康: 1, 总: 4 },
  偏印: { 事业: 1, 财运: -2, 感情: -2, 健康: 1, 总: 0 },
  正印: { 事业: 4, 财运: 0, 感情: 1, 健康: 4, 总: 3 },
};

/** 地支关系对运势的加减：先总运，再感情、健康。 */
const RELATION_ADJ: Record<ZhiRelation, { 总: number; 感情: number; 健康: number }> = {
  六合: { 总: 6, 感情: 6, 健康: 1 },
  三合: { 总: 4, 感情: 3, 健康: 1 },
  同支: { 总: 1, 感情: 0, 健康: 0 },
  六冲: { 总: -7, 感情: -5, 健康: -3 },
  六害: { 总: -4, 感情: -3, 健康: -1 },
  相刑: { 总: -3, 感情: -2, 健康: -2 },
  无: { 总: 0, 感情: 0, 健康: 0 },
};

/** 每种十神当天的个人宜忌。 */
const THEME_YIJI: Record<string, { yi: string[]; ji: string[] }> = {
  比肩: { yi: ["与朋友合作", "运动健身"], ji: ["独断专行"] },
  劫财: { yi: ["记账理财", "陪伴家人"], ji: ["借钱担保", "冲动消费"] },
  食神: { yi: ["创作表达", "品尝美食"], ji: ["暴饮暴食"] },
  伤官: { yi: ["头脑风暴", "学习新技能"], ji: ["口舌争执"] },
  偏财: { yi: ["拓展人脉", "小额尝试"], ji: ["孤注一掷"] },
  正财: { yi: ["谈合作", "处理账目"], ji: ["拖延收款"] },
  七杀: { yi: ["攻坚难题", "早睡养神"], ji: ["正面冲突"] },
  正官: { yi: ["面试汇报", "办理证件"], ji: ["越级行事"] },
  偏印: { yi: ["独处思考", "钻研学习"], ji: ["钻牛角尖"] },
  正印: { yi: ["请教前辈", "签订文书"], ji: ["懈怠拖延"] },
};

export interface Candle {
  label: string;
  range: string;
  open: number;
  close: number;
  high: number;
  low: number;
  luck?: "吉" | "凶";
}

export interface FortuneResult {
  kind: "fortune";
  date: string;
  almanac: Pick<Almanac, "lunar" | "weekday" | "yearGanZhi" | "monthGanZhi" | "dayGanZhi" | "yi" | "ji" | "chong" | "sha" | "xi" | "cai" | "fu" | "zhiXing" | "tianShen" | "tianShenLuck" | "jieQi">;
  bazi: Bazi;
  shishen: string;
  theme: { title: string; text: string };
  overall: number;
  dims: { name: Dimension; score: number; text: string }[];
  qian: { no: number; level: QianLevel; tone: string; poem: string[]; jie: string };
  hours: Candle[];
  bestHour: { label: string; range: string };
  worstHour: { label: string; range: string };
  lucky: { element: WuXing; color: string; colorHex: string; numbers: [number, number]; direction: string; wealth: string; joy: string };
  yi: string[];
  ji: string[];
  notes: string[];
  remedy: string | null;
}

/** 把一段增量序列画成 K 线，平均收盘落在 target 附近。 */
export function toCandles(
  deltas: number[],
  labels: { label: string; range: string; luck?: "吉" | "凶" }[],
  target: number,
  r: () => number,
): Candle[] {
  // 带均值回归的累加：有涨有跌，像真正的行情，而不是一路单边。
  let level = 0;
  const raw = deltas.map((d) => {
    const open = level;
    level += d - 0.35 * level;
    return { open, close: level };
  });
  const mean = raw.reduce((s, c) => s + c.close, 0) / raw.length;
  const shift = target - mean;
  return raw.map((c, i) => {
    const open = clamp(Math.round(c.open + shift), 8, 99);
    const close = clamp(Math.round(c.close + shift), 8, 99);
    const high = clamp(Math.max(open, close) + 1 + Math.round(r() * 4), 8, 100);
    const low = clamp(Math.min(open, close) - 1 - Math.round(r() * 4), 4, 99);
    return { ...labels[i], open, close, high, low };
  });
}

export function birthKey(b: BirthInput) {
  return `${b.year}-${b.month}-${b.day}-${b.hour ?? "x"}-${b.gender}`;
}

export function computeFortune(birth: BirthInput, ymd: { y: number; m: number; d: number; key: string }): FortuneResult {
  const bazi = computeBazi(birth);
  const alm = almanacFor(ymd.y, ymd.m, ymd.d);
  const r = rng(`fortune|${birthKey(birth)}|${ymd.key}`);
  const noise = (span: number) => Math.round((r() * 2 - 1) * span);

  const dayGan = alm.dayGanZhi[0];
  const dayZhi = alm.dayGanZhi[1];
  const ss = shiShen(bazi.dayMaster, dayGan);
  const w = SHISHEN_WEIGHT[ss] ?? SHISHEN_WEIGHT["比肩"];

  const notes: string[] = [];
  const adj = { 总: 0, 感情: 0, 健康: 0, 财运: 0, 事业: 0 };

  // 今日日支与本人日支（夫妻宫）、年支（本命）的关系。
  const relDay = zhiRelation(dayZhi, bazi.day.zhi);
  const relYear = zhiRelation(dayZhi, bazi.year.zhi);
  if (relDay !== "无") {
    adj.总 += RELATION_ADJ[relDay].总;
    adj.感情 += RELATION_ADJ[relDay].感情;
    adj.健康 += RELATION_ADJ[relDay].健康;
    if (relDay === "六合" || relDay === "三合") notes.push(`今日日支${dayZhi}与你的日支${bazi.day.zhi}${relDay}，人和气顺，办事有人帮。`);
    if (relDay === "六冲") notes.push(`今日日支${dayZhi}冲你的日支${bazi.day.zhi}，情绪易起伏，遇事先缓三分。`);
    if (relDay === "六害" || relDay === "相刑") notes.push(`今日与你的日支${relDay}，小心小人与口舌，重要的话当面说清。`);
  }
  if (relYear === "六冲") {
    adj.总 -= 4;
    adj.健康 -= 2;
    notes.push(`今日冲你的生肖${bazi.shengxiao}，出行与运动多留心，重要决定可延后。`);
  } else if (relYear === "六合") {
    adj.总 += 3;
    notes.push(`今日与你的生肖${bazi.shengxiao}相合，运势加持。`);
  }
  // 桃花日。
  if (dayZhi === taoHua(bazi.year.zhi) || dayZhi === taoHua(bazi.day.zhi)) {
    adj.感情 += 7;
    notes.push("今日逢你的桃花日，人缘与异性缘明显上扬。");
  }
  // 配偶星：男看财星，女看官杀。
  const spouseStar = birth.gender === "male" ? ["正财", "偏财"] : ["正官", "七杀"];
  if (spouseStar.includes(ss)) adj.感情 += 5;
  // 黄道 / 黑道。
  if (alm.tianShenLuck === "吉") {
    adj.总 += 4;
    notes.push(`今日为黄道日（${alm.tianShen}），宜把重要的事排在今天。`);
  } else {
    adj.总 -= 3;
  }
  // 今日天干五行补不补你的命局。
  const counts = bazi.wuxing;
  // 命局中最弱的一行；并列时优先「生我」的印星那一行。
  const yin = shengWo(bazi.dayMasterWx);
  const weakest = [...WUXING].sort((a, b) => counts[a] - counts[b] || (b === yin ? 1 : 0) - (a === yin ? 1 : 0))[0];
  const dayWx = GAN_WX[dayGan];
  if (dayWx === weakest) {
    adj.总 += 3;
    notes.push(`今日天干属${dayWx}，正好补你命局中偏弱的${weakest}。`);
  } else if (counts[dayWx] >= 3) {
    adj.总 -= 2;
  }

  const dims = DIMENSIONS.map((name) => {
    const extra = name === "感情" ? adj.感情 : name === "健康" ? adj.健康 : 0;
    const score = clamp(Math.round(68 + w[name] * 1.6 + adj.总 * 0.5 + extra + noise(5)), 40, 98);
    const band = score >= 80 ? "high" : score >= 60 ? "mid" : "low";
    return { name, score, text: pick(DIM_TEXT[name][band], r) };
  });
  const avg = dims.reduce((s, d) => s + d.score, 0) / dims.length;
  // 原始分集中在 70 上下，拉开后六档签都会出现：上上签约一成，下签很少。
  const raw = avg * 0.6 + (68 + w.总 * 2 + adj.总) * 0.4;
  const overall = clamp(Math.round(75 + (raw - 74) * 2.2 + noise(5)), 38, 99);

  const lv = QIAN_LEVELS.find((l) => overall >= l.min)!;
  const lvIndex = QIAN_LEVELS.indexOf(lv);
  const poemIndex = Math.floor(r() * QIAN_POEMS[lv.level].length);
  const qian = {
    no: lvIndex * 6 + poemIndex + 1,
    level: lv.level,
    tone: lv.tone,
    poem: QIAN_POEMS[lv.level][poemIndex],
    jie: pick(QIAN_JIE[lv.level], r),
  };

  // 十二时辰：时辰天神吉凶 + 时干十神 + 时支与本人日支的关系。
  const deltas = alm.hours.map((h) => {
    const hs = shiShen(bazi.dayMaster, h.ganzhi[0]);
    const rel = zhiRelation(h.zhi, bazi.day.zhi);
    const relAdj = { 六合: 4, 三合: 2, 同支: 0, 六冲: -6, 六害: -3, 相刑: -2, 无: 0 }[rel];
    return (h.luck === "吉" ? 5 : -4) + (SHISHEN_WEIGHT[hs]?.总 ?? 0) * 0.8 + relAdj + noise(3);
  });
  const hours = toCandles(
    deltas,
    alm.hours.map((h) => ({ label: `${h.zhi}时`, range: h.range, luck: h.luck })),
    overall,
    r,
  );
  const byClose = [...hours].sort((a, b) => b.close - a.close);

  const luck = WX_LUCK[weakest];
  const themeYiJi = THEME_YIJI[ss] ?? THEME_YIJI["比肩"];

  return {
    kind: "fortune",
    date: ymd.key,
    almanac: {
      lunar: alm.lunar,
      weekday: alm.weekday,
      yearGanZhi: alm.yearGanZhi,
      monthGanZhi: alm.monthGanZhi,
      dayGanZhi: alm.dayGanZhi,
      yi: alm.yi.slice(0, 6),
      ji: alm.ji.slice(0, 6),
      chong: alm.chong,
      sha: alm.sha,
      xi: alm.xi,
      cai: alm.cai,
      fu: alm.fu,
      zhiXing: alm.zhiXing,
      tianShen: alm.tianShen,
      tianShenLuck: alm.tianShenLuck,
      jieQi: alm.jieQi,
    },
    bazi,
    shishen: ss,
    theme: SHISHEN_THEME[ss] ?? SHISHEN_THEME["比肩"],
    overall,
    dims,
    qian,
    hours,
    bestHour: { label: byClose[0].label, range: byClose[0].range },
    worstHour: { label: byClose[byClose.length - 1].label, range: byClose[byClose.length - 1].range },
    lucky: {
      element: weakest,
      color: luck.color,
      colorHex: luck.colorHex,
      numbers: luck.numbers,
      direction: luck.direction,
      wealth: alm.cai,
      joy: alm.xi,
    },
    yi: themeYiJi.yi,
    ji: themeYiJi.ji,
    notes,
    remedy: overall < 62 ? pick(REMEDY, r) : null,
  };
}
