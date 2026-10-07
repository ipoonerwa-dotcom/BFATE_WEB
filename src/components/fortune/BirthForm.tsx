"use client";

import { useMemo } from "react";
import type { BirthPayload } from "@/lib/client/api";
import { SHICHEN } from "@/lib/client/format";
import { useHydrated, useStoredString, writeStored } from "@/lib/client/storage";

export interface BirthDraft {
  date: string; // YYYY-MM-DD
  hour: string; // "" = 不清楚，否则 0–22
  gender: "male" | "female" | "";
  name: string;
}

export const emptyDraft: BirthDraft = { date: "", hour: "", gender: "", name: "" };

export function draftToPayload(d: BirthDraft): BirthPayload | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.date);
  if (!m || !d.gender) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: d.hour === "" ? null : Number(d.hour),
    gender: d.gender,
    name: d.name.trim() || undefined,
  };
}

export function describeDraft(d: BirthDraft) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.date);
  if (!m) return "";
  const sc = SHICHEN.find((s) => String(s.hour) === d.hour);
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日 · ${sc ? `${sc.zhi}时` : "时辰不详"} · ${d.gender === "male" ? "男" : "女"}`;
}

/** 生辰存在本机（localStorage），下次打开直接用；不上传到任何地方，只在解读时随请求发送。 */
export function useStoredDraft(key: string) {
  const raw = useStoredString(key);
  const loaded = useHydrated();
  const draft = useMemo<BirthDraft>(() => {
    if (!raw) return emptyDraft;
    try {
      return { ...emptyDraft, ...(JSON.parse(raw) as Partial<BirthDraft>) };
    } catch {
      return emptyDraft;
    }
  }, [raw]);
  const save = (d: BirthDraft) => writeStored(key, JSON.stringify(d));
  return { draft, save, loaded };
}

export function BirthForm({
  value,
  onChange,
  title,
  withName = false,
  namePlaceholder = "称呼（选填）",
}: {
  value: BirthDraft;
  onChange: (d: BirthDraft) => void;
  title?: string;
  withName?: boolean;
  namePlaceholder?: string;
}) {
  const set = (patch: Partial<BirthDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      {title ? <h3 className="panel-title">{title}</h3> : null}
      {withName ? (
        <label className="block">
          <span className="field-label">称呼</span>
          <input className="field" value={value.name} maxLength={12} placeholder={namePlaceholder} onChange={(e) => set({ name: e.target.value })} />
        </label>
      ) : null}
      <label className="block">
        <span className="field-label">公历生日</span>
        <input type="date" className="field" value={value.date} min="1900-01-01" max="2100-12-31" onChange={(e) => set({ date: e.target.value })} />
      </label>
      <label className="block">
        <span className="field-label">出生时辰</span>
        <select className="field" value={value.hour} onChange={(e) => set({ hour: e.target.value })}>
          <option value="">不清楚（按三柱推算）</option>
          {SHICHEN.map((s) => (
            <option key={s.zhi} value={String(s.hour)}>
              {s.zhi}时（{s.range} 点）
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className="field-label">性别</span>
        <div className="grid grid-cols-2 gap-2.5">
          {(["male", "female"] as const).map((g) => (
            <button key={g} type="button" aria-pressed={value.gender === g} onClick={() => set({ gender: g })} className="choice">
              {g === "male" ? "乾 · 男" : "坤 · 女"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
