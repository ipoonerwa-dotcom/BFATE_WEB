/* 排八字与今日黄历：把公历生辰换成四柱干支，把今天换成老黄历。 */
import { LunarUtil, Solar } from "lunar-javascript";
import { GAN_WX, SHENGXIAO, WUXING, ZHI, ZHI_WX, type WuXing } from "./tables";

export type Gender = "male" | "female";

export interface BirthInput {
  /** 公历年月日。 */
  year: number;
  month: number;
  day: number;
  /** 出生的小时（0–23）；不知道时辰就留空，时柱不参与计算。 */
  hour: number | null;
  gender: Gender;
  /** 合盘时显示的称呼，可不填。 */
  name?: string;
}

export interface Pillar {
  gan: string;
  zhi: string;
}

export interface Bazi {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  time: Pillar | null;
  /** 日主：日柱天干，代表本人。 */
  dayMaster: string;
  dayMasterWx: WuXing;
  shengxiao: string;
  /** 农历生日，例如「乙亥年五月廿一」。 */
  lunarText: string;
  /** 四柱（或三柱）天干地支里五行各出现几次。 */
  wuxing: Record<WuXing, number>;
  /** 年柱纳音，例如「山头火」。 */
  yearNaYin: string;
}

export function validBirth(b: BirthInput): string | null {
  const { year, month, day, hour } = b;
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return "出生年份需在 1900–2100 之间";
  if (!Number.isInteger(month) || month < 1 || month > 12) return "月份不正确";
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!Number.isInteger(day) || day < 1 || day > dim) return "日期不正确";
  if (hour !== null && (!Number.isInteger(hour) || hour < 0 || hour > 23)) return "时辰不正确";
  if (b.gender !== "male" && b.gender !== "female") return "请选择性别";
  return null;
}

const split = (gz: string): Pillar => ({ gan: gz[0], zhi: gz[1] });

export function computeBazi(b: BirthInput): Bazi {
  // 时辰未知时取正午排盘，但时柱不展示、不计入五行。
  const lunar = Solar.fromYmdHms(b.year, b.month, b.day, b.hour ?? 12, 0, 0).getLunar();
  const ec = lunar.getEightChar();
  const year = split(ec.getYear());
  const month = split(ec.getMonth());
  const day = split(ec.getDay());
  const time = b.hour === null ? null : split(ec.getTime());

  const wuxing = Object.fromEntries(WUXING.map((w) => [w, 0])) as Record<WuXing, number>;
  for (const p of [year, month, day, time]) {
    if (!p) continue;
    wuxing[GAN_WX[p.gan]] += 1;
    wuxing[ZHI_WX[p.zhi]] += 1;
  }

  return {
    year,
    month,
    day,
    time,
    dayMaster: day.gan,
    dayMasterWx: GAN_WX[day.gan],
    shengxiao: SHENGXIAO[year.zhi],
    lunarText: `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    wuxing,
    yearNaYin: ec.getYearNaYin(),
  };
}

/** 十神：以日主看另一个天干，例如甲见己为「正财」。 */
export function shiShen(dayMaster: string, other: string): string {
  return LunarUtil.SHI_SHEN[dayMaster + other] as string;
}

/** 北京时间的今天（每日次数、今日运势都按北京时间零点换日）。 */
export function todayYmd(tz = "Asia/Shanghai", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get("year");
  const m = get("month");
  const d = get("day");
  return { y, m, d, key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

export interface HourAlmanac {
  zhi: string;
  ganzhi: string;
  /** 时辰起止，例如「23:00–00:59」。 */
  range: string;
  /** 黄道 / 黑道。 */
  luck: "吉" | "凶";
  tianShen: string;
}

export interface Almanac {
  date: string;
  weekday: string;
  lunar: string;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  shengxiao: string;
  yi: string[];
  ji: string[];
  chong: string;
  sha: string;
  xi: string;
  cai: string;
  fu: string;
  zhiXing: string;
  xiu: string;
  xiuLuck: string;
  tianShen: string;
  tianShenLuck: string;
  naYin: string;
  jieQi: string;
  hours: HourAlmanac[];
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 子时跨零点，其余每个时辰两小时。 */
export function hourRange(zhiIndex: number) {
  const start = (zhiIndex * 2 + 23) % 24;
  const end = (start + 1) % 24;
  return `${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:59`;
}

export function almanacFor(y: number, m: number, d: number): Almanac {
  const solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
  const lunar = solar.getLunar();
  // getTimes() 给出 13 段：0 点的早子时 … 23 点的晚子时；取前 12 段，早子时代表整个子时。
  const times = lunar.getTimes().slice(0, 12);
  return {
    date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    weekday: `星期${WEEK[solar.getWeek()]}`,
    lunar: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    yearGanZhi: lunar.getYearInGanZhi(),
    monthGanZhi: lunar.getMonthInGanZhi(),
    dayGanZhi: lunar.getDayInGanZhi(),
    shengxiao: lunar.getYearShengXiao(),
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    chong: `冲${lunar.getDayChongShengXiao()}`,
    sha: `煞${lunar.getDaySha()}`,
    xi: lunar.getDayPositionXiDesc(),
    cai: lunar.getDayPositionCaiDesc(),
    fu: lunar.getDayPositionFuDesc(),
    zhiXing: lunar.getZhiXing(),
    xiu: lunar.getXiu(),
    xiuLuck: lunar.getXiuLuck(),
    tianShen: lunar.getDayTianShen(),
    tianShenLuck: lunar.getDayTianShenLuck(),
    naYin: lunar.getDayNaYin(),
    jieQi: lunar.getJieQi() || "",
    hours: times.map((t: { getZhi(): string; getGanZhi(): string; getTianShenLuck(): string; getTianShen(): string }, i: number) => ({
      zhi: t.getZhi(),
      ganzhi: t.getGanZhi(),
      range: hourRange(ZHI.indexOf(t.getZhi() as (typeof ZHI)[number]) >= 0 ? ZHI.indexOf(t.getZhi() as (typeof ZHI)[number]) : i),
      luck: t.getTianShenLuck() === "吉" ? "吉" : "凶",
      tianShen: t.getTianShen(),
    })),
  };
}

/** 某年某月（农历节令月）的月柱干支，用于姻缘 K 线按月推演。 */
export function monthGanZhi(y: number, m: number): Pillar {
  const lunar = Solar.fromYmdHms(y, m, 15, 12, 0, 0).getLunar();
  return split(lunar.getMonthInGanZhiExact ? lunar.getMonthInGanZhiExact() : lunar.getMonthInGanZhi());
}
