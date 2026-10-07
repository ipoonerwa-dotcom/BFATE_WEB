import { fail, ok, unauthorized } from "@/lib/server/http";
import { ensureInterpretation } from "@/lib/server/readings";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 为本人的解读生成「先生细说」（AI，可选）。 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await getSession();
    if (!s) return unauthorized();
    const { id } = await ctx.params;
    return ok({ interpretation: await ensureInterpretation(s, id) });
  } catch (e) {
    return fail(e);
  }
}
