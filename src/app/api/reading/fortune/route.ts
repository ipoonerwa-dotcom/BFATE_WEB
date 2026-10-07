import { fail, ok, unauthorized } from "@/lib/server/http";
import { parseBirth, readFortune } from "@/lib/server/readings";
import { clientIp, getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return unauthorized();
    const body = (await req.json().catch(() => ({}))) as { birth?: unknown };
    const birth = parseBirth(body.birth);
    return ok(await readFortune(s, await clientIp(), birth));
  } catch (e) {
    return fail(e);
  }
}
