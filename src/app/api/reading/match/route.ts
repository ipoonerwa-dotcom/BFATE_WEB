import { fail, ok, unauthorized } from "@/lib/server/http";
import { parseBirth, readMatch } from "@/lib/server/readings";
import { clientIp, getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return unauthorized();
    const body = (await req.json().catch(() => ({}))) as { a?: unknown; b?: unknown };
    const a = parseBirth(body.a, "你的生辰：");
    const b = parseBirth(body.b, "对方生辰：");
    return ok(await readMatch(s, await clientIp(), a, b));
  } catch (e) {
    return fail(e);
  }
}
