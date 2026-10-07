import { fail, ok } from "@/lib/server/http";
import { getQuota } from "@/lib/server/quota";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return ok({ session: null });
    return ok({ session: { address: s.address, wallet: s.wallet }, quota: await getQuota(s) });
  } catch (e) {
    return fail(e);
  }
}
