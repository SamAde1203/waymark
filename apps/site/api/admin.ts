// POST /api/admin  (JSON body { action, ... }, header "Authorization: Bearer <ADMIN_PASSWORD>")
// Actions: create { name, email?, amount?, note? } · list · lookup { code } · reset { code } · cancel { code }
import { one, noStore, stripeClient, type Req, type Res } from "./_lib/http.js";
import {
  AdminError, cancelCode, createManualCode, listManualCodes, lookupCode, MIN_PASSWORD, passwordOk, resetDevices, view,
} from "./_lib/admin.js";

export default async function handler(req: Req & { body?: unknown }, res: Res) {
  noStore(res);
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < MIN_PASSWORD)
    return res.status(503).json({ error: `Admin is not set up: add ADMIN_PASSWORD (at least ${MIN_PASSWORD} characters) in Vercel.` });
  const auth = one(req.headers.authorization);
  if (!passwordOk(auth.replace(/^Bearer /, ""), expected)) {
    // Slow down guessing.
    await new Promise((ok) => setTimeout(ok, 800));
    return res.status(401).json({ error: "Wrong password" });
  }

  const stripe = stripeClient();
  if (!stripe) return res.status(503).json({ error: "STRIPE_SECRET_KEY is not set in Vercel" });

  const body = (typeof req.body === "string" ? safeJson(req.body) : req.body) as Record<string, string> | undefined;
  const action = body?.action;
  const code = body?.code ?? "";
  try {
    switch (action) {
      case "check":
        return res.status(200).json({ ok: true, mode: process.env.STRIPE_SECRET_KEY?.includes("_live_") ? "live" : "test" });
      case "create":
        return res.status(200).json(view(await createManualCode(stripe, body as never)));
      case "list":
        return res.status(200).json((await listManualCodes(stripe)).map(view));
      case "lookup":
        return res.status(200).json(view(await lookupCode(stripe, code)));
      case "reset":
        return res.status(200).json(view(await resetDevices(stripe, code)));
      case "cancel":
        return res.status(200).json(view(await cancelCode(stripe, code)));
      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (e) {
    if (e instanceof AdminError) return res.status(400).json({ error: e.message });
    console.error("admin failed", e);
    return res.status(502).json({ error: e instanceof Error ? e.message : "Something went wrong" });
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
