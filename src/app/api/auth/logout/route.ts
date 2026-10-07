import { ok } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSession();
  return ok({ ok: true });
}
