/* 把黄历里会显示出来的字（宜忌、冲煞、值神、星宿、方位、农历日期等）收集到 scripts/lunar-vocab.txt，
   供 subset-font.py 裁剪字体时使用。改了 bazi.ts 里用到的黄历字段后重新运行：node scripts/lunar-vocab.mjs */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Solar } = require("lunar-javascript");

const set = new Set();
const add = (x) => {
  for (const c of String(x ?? "")) if (/[㐀-鿿]/.test(c)) set.add(c);
};
let d = Solar.fromYmd(2020, 1, 1);
for (let i = 0; i < 366 * 12; i++) {
  const l = d.getLunar();
  l.getDayYi().forEach(add);
  l.getDayJi().forEach(add);
  [
    l.getWeekInChinese?.(),
    l.getMonthInChinese(),
    l.getDayInChinese(),
    l.getYearInGanZhi(),
    l.getMonthInGanZhi(),
    l.getMonthInGanZhiExact(),
    l.getDayInGanZhi(),
    l.getYearShengXiao(),
    l.getDayChongShengXiao(),
    l.getDayChongDesc(),
    l.getDaySha(),
    l.getDayPositionXiDesc(),
    l.getDayPositionCaiDesc(),
    l.getDayPositionFuDesc(),
    l.getZhiXing(),
    l.getXiu(),
    l.getXiuLuck(),
    l.getDayTianShen(),
    l.getDayTianShenLuck(),
    l.getDayNaYin(),
    l.getYearNaYin(),
    l.getJieQi(),
  ].forEach(add);
  for (const t of l.getTimes()) {
    add(t.getTianShen());
    add(t.getTianShenLuck());
    add(t.getGanZhi());
  }
  d = d.next(1);
}
const out = new URL("./lunar-vocab.txt", import.meta.url);
writeFileSync(out, [...set].sort().join("") + "\n", "utf8");
console.log(`lunar-vocab.txt: ${set.size} 字`);
