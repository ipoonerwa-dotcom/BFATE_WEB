import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/http";
import { getReading } from "@/lib/server/readings";

export const dynamic = "force-dynamic";

/** 分享链接：只读、公开，不含钱包地址。 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const r = await getReading(id);
    if (!r) return NextResponse.json({ error: "解读不存在或已过期" }, { status: 404 });
    return ok({ reading: r });
  } catch (e) {
    return fail(e);
  }
}
