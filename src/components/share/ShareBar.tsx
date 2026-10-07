"use client";

import { useState } from "react";

/* 分享：生成一个只读链接（不含钱包地址），手机上优先调起系统分享面板。 */
export function ShareBar({ id, title, label = "分享这一签" }: { id: string; title: string; label?: string }) {
  const [done, setDone] = useState<string | null>(null);
  async function share() {
    const url = `${window.location.origin}/r/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(`${title} ${url}`);
      setDone("链接已复制，去分享给朋友吧");
    } catch {
      setDone(url);
    }
  }
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <button type="button" className="btn-seal w-full max-w-xs" onClick={() => void share()}>
        {label}
      </button>
      {done ? <p className="break-all text-center text-[13px] text-ink-3">{done}</p> : null}
    </div>
  );
}
