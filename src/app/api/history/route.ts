import { fail, ok, unauthorized } from "@/lib/server/http";
import { history } from "@/lib/server/readings";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return unauthorized();
    return ok({ items: await history(s) });
  } catch (e) {
    return fail(e);
  }
}
