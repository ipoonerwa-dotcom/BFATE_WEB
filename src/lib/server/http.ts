import "server-only";
import { NextResponse } from "next/server";
import { PayError } from "./payment";
import { ReadingError } from "./readings";

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

/** 业务错误照原样返回给前端，其余错误只记日志、给一句通用提示。 */
export function fail(e: unknown) {
  if (e instanceof ReadingError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  if (e instanceof PayError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  const msg = e instanceof Error && /签名|nonce|消息/.test(e.message) ? e.message : "服务繁忙，请稍后再试";
  return NextResponse.json({ error: msg }, { status: 500 });
}

export const unauthorized = () => NextResponse.json({ error: "请先连接钱包并签名登录", code: "auth_required" }, { status: 401 });
