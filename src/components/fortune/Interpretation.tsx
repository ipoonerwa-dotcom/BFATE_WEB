"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client/api";

/* 「先生细说」：AI 解读在出签之后异步落笔；没有配置 AI 或生成失败时整块不显示。
   换一份解读时父组件用 key 让它重新挂载，所以这里的状态只从 props 初始化一次。 */
export function Interpretation({ id, initial, enabled }: { id: string; initial: string | null; enabled: boolean }) {
  const [text, setText] = useState<string | null>(initial);
  const [state, setState] = useState<"waiting" | "done">(initial || !enabled ? "done" : "waiting");

  useEffect(() => {
    if (!enabled || text) return;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const res = await api.interpret(id);
          if (cancelled) return;
          setText(res.interpretation);
          setState("done");
          return;
        } catch (e) {
          // 409：另一个请求正在生成，稍后再取。
          if (e instanceof ApiError && e.status === 409) {
            await new Promise((r) => setTimeout(r, 4000));
            continue;
          }
          break;
        }
      }
      if (!cancelled) setState("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, id, text]);

  if (!text && state !== "waiting") return null;
  return (
    <section className="panel p-6 md:p-8">
      <h3 className="panel-title">先生细说</h3>
      {text ? (
        <p className="anim-ink-in mt-3 whitespace-pre-line text-[15px] leading-8 text-ink-2">{text}</p>
      ) : (
        <div className="mt-4 space-y-2.5" aria-live="polite">
          <p className="text-[13px] tracking-wider text-ink-3">先生正在落笔，稍候片刻…</p>
          {[92, 100, 76].map((w) => (
            <div key={w} className="h-3 animate-pulse rounded-[2px] bg-[rgba(169,133,68,0.16)]" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
    </section>
  );
}
