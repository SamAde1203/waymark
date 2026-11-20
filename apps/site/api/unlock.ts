// GET /api/unlock?session_id=cs_...  → confirms a just-finished checkout.
// GET /api/unlock?code=WM-XXXX-XXXX → restores a purchase on another device.
// Both answer { plan, code } or 404.
import { one, noStore, stripeClient, type Req, type Res } from "./_lib/http.js";
import { restoreByCode, verifySession } from "./_lib/pay.js";

export default async function handler(req: Req, res: Res) {
  noStore(res);
  const stripe = stripeClient();
  if (!stripe) return res.status(503).json({ error: "Payments are not open yet" });
  const sessionId = one(req.query.session_id);
  const code = one(req.query.code);
  try {
    const found = sessionId ? await verifySession(stripe, sessionId) : code ? await restoreByCode(stripe, code) : null;
    if (!found) return res.status(404).json({ error: "No paid purchase found" });
    return res.status(200).json(found);
  } catch (e) {
    console.error("unlock failed", e);
    return res.status(502).json({ error: "Could not check your purchase. Please try again." });
  }
}
