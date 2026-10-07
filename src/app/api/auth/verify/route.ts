import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/http";
import { getQuota } from "@/lib/server/quota";
import { verifyLogin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { message?: string; signature?: string; wallet?: string };
    if (typeof body.message !== "string" || typeof body.signature !== "string" || !body.signature.startsWith("0x")) {
      return NextResponse.json({ error: "缺少签名" }, { status: 400 });
    }
    const session = await verifyLogin(body.message, body.signature as `0x${string}`, body.wallet === "binance" ? "binance" : "other");
    return ok({ address: session.address, wallet: session.wallet, quota: await getQuota(session) });
  } catch (e) {
    if (e instanceof Error && /签名|过期|域名|格式/.test(e.message)) return NextResponse.json({ error: e.message }, { status: 400 });
    return fail(e);
  }
}
