/* 姻缘合盘：两人八字的生肖、日主、夫妻宫与五行互补，加上未来十二个月的姻缘 K 线。 */
import { computeBazi, monthGanZhi, type Bazi, type BirthInput } from "./bazi";
import { birthKey, toCandles, type Candle } from "./fortune";
import { clamp, pick, rng } from "./seed";
import { GAN_WX, WUXING, ganHe, ke, sheng, taoHua, zhiRelation, type WuXing, type ZhiRelation } from "./tables";
import { MATCH_BANDS, MATCH_DIMENSIONS, MATCH_NOTES, type MatchDimension } from "./texts";

const REL_SCORE: Record<ZhiRelation, number> = { 六合: 10, 三合: 7, 同支: 2, 六冲: -9, 六害: -6, 相刑: -4, 无: 0 };

export interface MatchPerson {
  name: string;
  gender: BirthInput["gender"];
  bazi: Bazi;
}

export interface MatchResult {
  kind: "match";
  date: string;
  a: MatchPerson;
  b: MatchPerson;
  score: number;
  title: string;
  summary: string;
  dims: { name: MatchDimension; score: number }[];
  notes: string[];
  months: Candle[];
  bestMonth: string;
  worstMonth: string;
  advice: string;
}

/** 日主之间的关系：五合、相生、比和、相克。 */
function ganRelation(a: string, b: string): { kind: "合" | "生" | "比" | "克" | "无"; from?: string; to?: string } {
  if (ganHe(a, b)) return { kind: "合" };
  const wa = GAN_WX[a];
  const wb = GAN_WX[b];
  if (wa === wb) return { kind: "比" };
  if (sheng(wa, wb)) return { kind: "生", from: a, to: b };
  if (sheng(wb, wa)) return { kind: "生", from: b, to: a };
  if (ke(wa, wb)) return { kind: "克", from: a, to: b };
  if (ke(wb, wa)) return { kind: "克", from: b, to: a };
  return { kind: "无" };
}

/** 财星：日主所克的那一行。 */
const caiOf = (wx: WuXing) => WUXING.find((x) => ke(wx, x))!;

export function computeMatch(aIn: BirthInput, bIn: BirthInput, ymd: { y: number; m: number; d: number; key: string }): MatchResult {
  const a = computeBazi(aIn);
  const b = computeBazi(bIn);
  // 种子与两人先后顺序无关，换个顺序再算结果不变。
  const r = rng(`match|${[birthKey(aIn), birthKey(bIn)].sort().join("|")}`);
  const noise = (span: number) => Math.round((r() * 2 - 1) * span);
  const nameA = aIn.name?.trim() || "你";
  const nameB = bIn.name?.trim() || "TA";
  const notes: string[] = [];

  // 生肖（年支）。
  const relYear = zhiRelation(a.year.zhi, b.year.zhi);
  const yearScore = { 六合: 14, 三合: 10, 同支: 3, 六冲: -12, 六害: -8, 相刑: -6, 无: 0 }[relYear];
  if (relYear === "同支") notes.push(MATCH_NOTES.生肖同支(a.shengxiao));
  else if (relYear === "六合") notes.push(MATCH_NOTES.生肖六合(a.shengxiao, b.shengxiao));
  else if (relYear === "三合") notes.push(MATCH_NOTES.生肖三合(a.shengxiao, b.shengxiao));
  else if (relYear === "六冲") notes.push(MATCH_NOTES.生肖六冲(a.shengxiao, b.shengxiao));
  else if (relYear === "六害") notes.push(MATCH_NOTES.生肖六害(a.shengxiao, b.shengxiao));
  else if (relYear === "相刑") notes.push(MATCH_NOTES.生肖相刑(a.shengxiao, b.shengxiao));

  // 日主。
  const gr = ganRelation(a.dayMaster, b.dayMaster);
  const ganScore = { 合: 12, 生: 6, 比: 3, 克: -4, 无: 0 }[gr.kind];
  if (gr.kind === "合") notes.push(MATCH_NOTES.日干五合(a.dayMaster, b.dayMaster));
  if (gr.kind === "生") notes.push(MATCH_NOTES.日干相生(gr.from!, gr.to!));
  if (gr.kind === "克") notes.push(MATCH_NOTES.日干相克(gr.from!, gr.to!));

  // 日支：夫妻宫。
  const relDay = zhiRelation(a.day.zhi, b.day.zhi);
  const dayScore = { 六合: 8, 三合: 5, 同支: 1, 六冲: -8, 六害: -5, 相刑: -4, 无: 0 }[relDay];
  if (relDay === "六合") notes.push(MATCH_NOTES.日支六合());
  if (relDay === "六冲") notes.push(MATCH_NOTES.日支六冲());

  // 五行互补：一方没有、另一方旺。
  let complement = 0;
  for (const wx of WUXING) {
    if (a.wuxing[wx] === 0 && b.wuxing[wx] >= 2) {
      complement += 4;
      if (complement <= 8) notes.push(MATCH_NOTES.五行互补(wx, wx));
    } else if (b.wuxing[wx] === 0 && a.wuxing[wx] >= 2) {
      complement += 4;
      if (complement <= 8) notes.push(MATCH_NOTES.五行互补(wx, wx));
    }
  }
  complement = Math.min(complement, 12);

  const score = clamp(Math.round(62 + yearScore + ganScore + dayScore + complement + noise(3)), 35, 99);
  const band = MATCH_BANDS.find((x) => score >= x.min)!;

  // 五个维度。
  const relMonth = zhiRelation(a.month.zhi, b.month.zhi);
  const caiA = caiOf(a.dayMasterWx);
  const caiB = caiOf(b.dayMasterWx);
  const peach = (b.year.zhi === taoHua(a.year.zhi) || b.day.zhi === taoHua(a.day.zhi) ? 15 : 0) + (a.year.zhi === taoHua(b.year.zhi) || a.day.zhi === taoHua(b.day.zhi) ? 15 : 0);
  const dimScore: Record<MatchDimension, number> = {
    性格契合: 62 + ganScore * 1.2 + yearScore * 0.6,
    沟通默契: 62 + REL_SCORE[relMonth] + (gr.kind === "合" ? 8 : 0),
    财运互助: 60 + (b.dayMasterWx === caiA || b.wuxing[caiA] >= 2 ? 10 : 0) + (a.dayMasterWx === caiB || a.wuxing[caiB] >= 2 ? 10 : 0),
    家庭长久: 62 + dayScore * 1.5 + yearScore * 0.5,
    心动指数: 60 + Math.min(peach, 24) + (gr.kind === "合" ? 6 : 0),
  };
  const dims = MATCH_DIMENSIONS.map((name) => ({ name, score: clamp(Math.round(dimScore[name] + noise(5)), 35, 99) }));

  // 未来十二个月：流月与两人日支、日主的互动。
  const labels: { label: string; range: string }[] = [];
  const deltas: number[] = [];
  for (let k = 0; k < 12; k++) {
    const mm = ((ymd.m - 1 + k) % 12) + 1;
    const yy = ymd.y + Math.floor((ymd.m - 1 + k) / 12);
    const mg = monthGanZhi(yy, mm);
    const rel = (x: ZhiRelation) => ({ 六合: 5, 三合: 3, 同支: 1, 六冲: -6, 六害: -3, 相刑: -2, 无: 0 })[x];
    let d = rel(zhiRelation(mg.zhi, a.day.zhi)) + rel(zhiRelation(mg.zhi, b.day.zhi));
    if (ganHe(mg.gan, a.dayMaster) || ganHe(mg.gan, b.dayMaster)) d += 4;
    if (mg.zhi === taoHua(a.year.zhi) || mg.zhi === taoHua(b.year.zhi)) d += 5;
    deltas.push(d + noise(3));
    labels.push({ label: `${mm}月`, range: `${yy}年${mm}月 · ${mg.gan}${mg.zhi}月` });
  }
  const months = toCandles(deltas, labels, score, r);
  const byClose = [...months].sort((x, y) => y.close - x.close);

  const advice =
    score >= 80
      ? `${byClose[0].label}是两人感情最旺的时候，适合定情、见家长或一起旅行；${byClose[11].label}节奏放慢，多陪伴少争论。`
      : `${byClose[0].label}最适合把话说开、增进感情；${byClose[11].label}容易有摩擦，遇事先冷静一晚再沟通。`;

  return {
    kind: "match",
    date: ymd.key,
    a: { name: nameA, gender: aIn.gender, bazi: a },
    b: { name: nameB, gender: bIn.gender, bazi: b },
    score,
    title: band.title,
    summary: pick(band.texts, r),
    dims,
    notes: notes.slice(0, 5),
    months,
    bestMonth: byClose[0].label,
    worstMonth: byClose[11].label,
    advice,
  };
}
