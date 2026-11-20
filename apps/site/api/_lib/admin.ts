/**
 * Admin actions for unlock codes: make codes for cash or invoice sales, look up any code, reset its
 * devices, and cancel codes made here. Codes made here are Stripe Customers with metadata
 * source="manual", so Stripe stays the only record and they show under Customers in the dashboard.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { findRecord, manualRecord, newCode, saveDevices, type CodeRecord } from "./pay.js";

/** The admin password must be long, because the page is on the public internet. */
export const MIN_PASSWORD = 20;

export function passwordOk(given: string | undefined, expected: string | undefined): boolean {
  if (!expected || expected.length < MIN_PASSWORD || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export type NewCode = { name: string; email?: string; amount?: string; note?: string };

export async function createManualCode(stripe: Stripe, input: NewCode): Promise<CodeRecord> {
  const name = clean(input.name, 100);
  if (!name) throw new AdminError("Enter the person's name.");
  const email = clean(input.email, 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AdminError("That email address doesn't look right.");
  // Amount in pounds as typed ("9.99", "£10"); stored in pence for your records.
  const rawAmount = clean(input.amount, 20).replace(/[£,\s]/g, "");
  let amountPence = "";
  if (rawAmount) {
    if (!/^\d+(\.\d{1,2})?$/.test(rawAmount)) throw new AdminError("Enter the amount paid as a number, like 9.99.");
    amountPence = String(Math.round(Number(rawAmount) * 100));
  }
  const code = newCode();
  const customer = await stripe.customers.create({
    name,
    ...(email ? { email } : {}),
    description: `Waymark unlock code ${code} (made on the admin page)`,
    metadata: {
      source: "manual",
      plan: "standard",
      unlock_code: code,
      devices: "",
      amount_pence: amountPence,
      note: clean(input.note, 400),
      made_at: new Date().toISOString(),
    },
  });
  const rec = manualRecord(customer);
  if (!rec) throw new Error("Stripe did not store the code");
  return rec;
}

export async function listManualCodes(stripe: Stripe): Promise<CodeRecord[]> {
  const res = await stripe.customers.search({ query: "metadata['source']:'manual'", limit: 100 });
  return res.data
    .map(manualRecord)
    .filter((r): r is CodeRecord => r !== null)
    .sort((a, b) => b.created - a.created);
}

export async function lookupCode(stripe: Stripe, code: string): Promise<CodeRecord> {
  const rec = await findRecord(stripe, code);
  if (!rec) throw new AdminError("No purchase or admin-made code matches that. New codes can take up to a minute to appear.");
  return rec;
}

export async function resetDevices(stripe: Stripe, code: string): Promise<CodeRecord> {
  const rec = await lookupCode(stripe, code);
  await saveDevices(stripe, rec, []);
  return { ...rec, devices: [] };
}

export async function cancelCode(stripe: Stripe, code: string): Promise<CodeRecord> {
  const rec = await lookupCode(stripe, code);
  if (rec.kind !== "manual") throw new AdminError("Card purchases are cancelled by refunding the payment in Stripe.");
  await stripe.customers.update(rec.id, { metadata: { cancelled: "yes" } });
  return { ...rec, active: false };
}

/** An error whose message is safe and useful to show on the admin page. */
export class AdminError extends Error {}

/** What the admin page sees for a code. */
export function view(rec: CodeRecord) {
  return {
    code: rec.code,
    kind: rec.kind,
    active: rec.active,
    devicesUsed: rec.devices.length,
    name: rec.name ?? null,
    email: rec.email ?? null,
    amountPence: rec.kind === "manual" ? Number(rec.metadata.amount_pence || 0) || null : null,
    note: rec.metadata.note || null,
    created: new Date(rec.created * 1000).toISOString(),
    stripeId: rec.id,
  };
}
