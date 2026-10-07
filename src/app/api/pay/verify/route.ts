import { fail, ok, unauthorized } from "@/lib/server/http";
import { verifyPayment } from "@/lib/server/payment";
import { getQuota } from "@/lib/server/quota";
import { getSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return unauthorized();
    const { txHash } = (await req.json().catch(() => ({}))) as { txHash?: string };
    const res = await verifyPayment(s.address, String(txHash ?? ""));
    return ok({ ...res, quota: await getQuota(s) });
  } catch (e) {
    return fail(e);
  }
}
