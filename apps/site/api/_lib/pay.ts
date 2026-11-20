/**
 * Payment logic for Waymark's one-off purchase, kept apart from the HTTP handlers so it can be tested
 * without network access. No database: the unlock code lives in the PaymentIntent's metadata, and
 * Stripe is the single record of who has paid.
 */
import type Stripe from "stripe";

export const PLANS = {
  standard: {
    name: "Waymark Standard: full access",
    description: "Every chapter and question, unlimited mock exams, and a daily plan to your test date. One payment, no subscription.",
    amount: 999, // pence
  },
} as const;
export type Plan = keyof typeof PLANS;

// No 0/O or 1/I/L, so codes are easy to read back from a screen or a receipt.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_RE = /^WM-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

export function newCode(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const b = rand(8);
  const c = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
  return `WM-${c.slice(0, 4)}-${c.slice(4)}`;
}

/** Accepts what people type: lower case, spaces, missing dashes. Returns null if it can't be a code. */
export function normaliseCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^WM/, "");
  if (raw.length !== 8) return null;
  const code = `WM-${raw.slice(0, 4)}-${raw.slice(4)}`;
  return CODE_RE.test(code) ? code : null;
}

export function isPlan(p: unknown): p is Plan {
  return typeof p === "string" && Object.prototype.hasOwnProperty.call(PLANS, p);
}

export async function createCheckout(
  stripe: Stripe,
  opts: { plan: Plan; origin: string; consentAt: string; code?: string },
): Promise<string> {
  const plan = PLANS[opts.plan];
  const code = opts.code ?? newCode();
  const metadata = {
    plan: opts.plan,
    unlock_code: code,
    // The buyer ticked the box on Waymark's own buy screen before reaching Stripe (see /refunds).
    consent_immediate_access: opts.consentAt,
  };
  // Waymark is the seller (see /terms), so Stripe's merchant-of-record service stays off for every
  // checkout, whatever the account default. Not in this SDK version's types, hence the spread.
  const params: Stripe.Checkout.SessionCreateParams & { managed_payments?: { enabled: boolean } } = {
    managed_payments: { enabled: false },
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: plan.amount,
          product_data: { name: plan.name, description: plan.description },
        },
      },
    ],
    customer_creation: "always",
    allow_promotion_codes: true,
    metadata,
    payment_intent_data: { description: `${plan.name} · unlock code ${code}`, metadata },
    success_url: `${opts.origin}/app/unlock?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/app/unlock`,
  };
  const session = await stripe.checkout.sessions.create(params);
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}

export type Unlock = { plan: Plan; code: string };
/** "limit" means the code is already in use on MAX_DEVICES other devices. */
export type UnlockResult = Unlock | "limit" | null;

export const MAX_DEVICES = 3;
export const DEVICE_RE = /^[a-z0-9]{12}$/;

/**
 * Where an unlock code lives. Card purchases are PaymentIntents; codes made on the admin page for cash
 * sales are Customers with metadata source="manual". Either way the metadata holds plan, unlock_code and
 * devices (comma-separated device ids).
 */
export type CodeRecord = {
  kind: "payment" | "manual";
  id: string;
  plan: Plan;
  code: string;
  devices: string[];
  /** false once refunded (card) or cancelled on the admin page (manual) */
  active: boolean;
  metadata: Record<string, string>;
  created: number;
  name?: string | null;
  email?: string | null;
};

const devicesOf = (m: Record<string, string> | undefined) => (m?.devices ?? "").split(",").filter((d) => DEVICE_RE.test(d));

async function refunded(stripe: Stripe, pi: Stripe.PaymentIntent): Promise<boolean> {
  const charge = typeof pi.latest_charge === "string" ? await stripe.charges.retrieve(pi.latest_charge) : pi.latest_charge;
  return !!charge?.refunded;
}

export async function paymentRecord(stripe: Stripe, pi: Stripe.PaymentIntent): Promise<CodeRecord | null> {
  const plan = pi.metadata?.plan;
  const code = pi.metadata?.unlock_code;
  if (!isPlan(plan) || !code || !CODE_RE.test(code)) return null;
  return {
    kind: "payment", id: pi.id, plan, code, devices: devicesOf(pi.metadata), active: !(await refunded(stripe, pi)),
    metadata: pi.metadata ?? {}, created: pi.created, email: pi.receipt_email,
  };
}

export function manualRecord(c: Stripe.Customer): CodeRecord | null {
  const plan = c.metadata?.plan;
  const code = c.metadata?.unlock_code;
  if (c.metadata?.source !== "manual" || !isPlan(plan) || !code || !CODE_RE.test(code)) return null;
  return {
    kind: "manual", id: c.id, plan, code, devices: devicesOf(c.metadata), active: c.metadata.cancelled !== "yes",
    metadata: c.metadata, created: c.created, name: c.name, email: c.email,
  };
}

/** Finds a code among card purchases first, then among codes made on the admin page. */
export async function findRecord(stripe: Stripe, input: string): Promise<CodeRecord | null> {
  const code = normaliseCode(input);
  if (!code) return null;
  // `code` matches CODE_RE, so it is safe to place inside the search queries.
  const pis = await stripe.paymentIntents.search({ query: `metadata['unlock_code']:'${code}' AND status:'succeeded'`, limit: 1 });
  if (pis.data[0]) return paymentRecord(stripe, pis.data[0]);
  const cus = await stripe.customers.search({ query: `metadata['unlock_code']:'${code}' AND metadata['source']:'manual'`, limit: 1 });
  return cus.data[0] ? manualRecord(cus.data[0]) : null;
}

export async function saveDevices(stripe: Stripe, rec: CodeRecord, devices: string[]): Promise<void> {
  const metadata = { devices: devices.join(",") };
  if (rec.kind === "payment") await stripe.paymentIntents.update(rec.id, { metadata });
  else await stripe.customers.update(rec.id, { metadata });
}

/** Records `device` against the code. A device already listed can always unlock again. */
export async function claimDevice(stripe: Stripe, rec: CodeRecord, device: string): Promise<boolean> {
  if (rec.devices.includes(device)) return true;
  if (rec.devices.length >= MAX_DEVICES) return false;
  await saveDevices(stripe, rec, [...rec.devices, device]);
  return true;
}

export async function verifySession(stripe: Stripe, sessionId: string, device: string): Promise<UnlockResult> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId) || !DEVICE_RE.test(device)) return null;
  const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (s.payment_status !== "paid") return null;
  const plan = s.metadata?.plan;
  const code = s.metadata?.unlock_code;
  const pi = s.payment_intent;
  if (!isPlan(plan) || !code || !CODE_RE.test(code) || !pi || typeof pi === "string") return null;
  const rec = await paymentRecord(stripe, pi);
  if (!rec?.active) return null;
  // The return link could be shared too, so it counts towards the device limit like a code.
  return (await claimDevice(stripe, rec, device)) ? { plan, code } : "limit";
}

export async function restoreByCode(stripe: Stripe, input: string, device: string): Promise<UnlockResult> {
  if (!DEVICE_RE.test(device)) return null;
  const rec = await findRecord(stripe, input);
  // Refunded purchases and cancelled codes no longer unlock.
  if (!rec?.active) return null;
  return (await claimDevice(stripe, rec, device)) ? { plan: rec.plan, code: rec.code } : "limit";
}
