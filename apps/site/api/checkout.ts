// GET /api/checkout?plan=standard&consent=1 → redirects to Stripe Checkout.
import { one, noStore, origin, stripeClient, type Req, type Res } from "./_lib/http.js";
import { createCheckout, isPlan } from "./_lib/pay.js";

export default async function handler(req: Req, res: Res) {
  noStore(res);
  const plan = one(req.query.plan) || "standard";
  if (!isPlan(plan)) return res.status(400).json({ error: "Unknown plan" });
  if (one(req.query.consent) !== "1") return res.redirect(303, `${origin()}/app/unlock`);
  const stripe = stripeClient();
  if (!stripe) return res.status(503).json({ error: "Payments are not open yet" });
  try {
    const url = await createCheckout(stripe, { plan, origin: origin(), consentAt: new Date().toISOString() });
    return res.redirect(303, url);
  } catch (e) {
    console.error("checkout failed", e);
    return res.status(502).json({ error: "Could not start checkout. Please try again." });
  }
}
