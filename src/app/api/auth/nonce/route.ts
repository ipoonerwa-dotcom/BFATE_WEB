import { fail, ok } from "@/lib/server/http";
import { newNonce } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ nonce: await newNonce() });
  } catch (e) {
    return fail(e);
  }
}
