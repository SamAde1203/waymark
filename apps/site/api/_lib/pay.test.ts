import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { CODE_RE, createCheckout, newCode, normaliseCode, restoreByCode, verifySession } from "./pay.js";

describe("unlock codes", () => {
  it("are readable and well formed", () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(CODE_RE);
  });
  it("accept what people type", () => {
    expect(normaliseCode("wm-abcd-2345")).toBe("WM-ABCD-2345");
    expect(normaliseCode(" abcd 2345 ")).toBe("WM-ABCD-2345");
    expect(normaliseCode("WMABCD2345")).toBe("WM-ABCD-2345");
  });
  it("reject anything that could break the search query", () => {
    expect(normaliseCode("WM-ABCD-234")).toBeNull();
    expect(normaliseCode("WM-ABCD-0000")).toBeNull(); // 0 is not in the alphabet
    expect(normaliseCode("' OR status:'succeeded")).toBeNull();
  });
});

describe("checkout", () => {
  it("charges £9.99 in GBP, stores the code and consent, and returns to the app", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    const stripe = { checkout: { sessions: { create } } } as unknown as Stripe;
    const url = await createCheckout(stripe, {
      plan: "standard",
      origin: "https://www.waymarkprep.co.uk",
      consentAt: "2026-11-20T21:30:00.000Z",
      code: "WM-ABCD-2345",
    });
    expect(url).toBe("https://checkout.stripe.com/x");
    const arg = create.mock.calls[0]![0];
    expect(arg.mode).toBe("payment");
    expect(arg.managed_payments).toEqual({ enabled: false });
    expect(arg.line_items[0].price_data).toMatchObject({ currency: "gbp", unit_amount: 999 });
    expect(arg.payment_intent_data.metadata).toMatchObject({ plan: "standard", unlock_code: "WM-ABCD-2345" });
    expect(arg.metadata.consent_immediate_access).toBe("2026-11-20T21:30:00.000Z");
    expect(arg.success_url).toBe("https://www.waymarkprep.co.uk/app/unlock?session_id={CHECKOUT_SESSION_ID}");
  });
});

const D1 = "aaaaaaaaaaa1", D2 = "aaaaaaaaaaa2", D3 = "aaaaaaaaaaa3", D4 = "aaaaaaaaaaa4";

function fakeStripe(opts: { paid?: boolean; refunded?: boolean; devices?: string; found?: boolean } = {}) {
  const pi = { id: "pi_1", metadata: { plan: "standard", unlock_code: "WM-ABCD-2345", devices: opts.devices ?? "" }, latest_charge: "ch_1" };
  const update = vi.fn(async (_id: string, p: { metadata: { devices: string } }) => {
    pi.metadata.devices = p.metadata.devices;
    return pi;
  });
  const stripe = {
    checkout: {
      sessions: {
        retrieve: vi.fn(async () => ({
          payment_status: opts.paid === false ? "unpaid" : "paid",
          metadata: { plan: "standard", unlock_code: "WM-ABCD-2345" },
          payment_intent: pi,
        })),
      },
    },
    paymentIntents: { search: vi.fn(async () => ({ data: opts.found === false ? [] : [pi] })), update },
    charges: { retrieve: vi.fn(async () => ({ refunded: !!opts.refunded })) },
  } as unknown as Stripe;
  return { stripe, pi, update };
}

describe("verify and restore", () => {
  it("unlocks a paid session and records the device", async () => {
    const { stripe, pi } = fakeStripe();
    expect(await verifySession(stripe, "cs_test_abc123", D1)).toEqual({ plan: "standard", code: "WM-ABCD-2345" });
    expect(pi.metadata.devices).toBe(D1);
  });

  it("refuses unpaid sessions, bad ids and missing devices", async () => {
    expect(await verifySession(fakeStripe({ paid: false }).stripe, "cs_test_abc123", D1)).toBeNull();
    expect(await verifySession(fakeStripe().stripe, "not-a-session", D1)).toBeNull();
    expect(await verifySession(fakeStripe().stripe, "cs_test_abc123", "x")).toBeNull();
  });

  it("restores by code on up to 3 devices, then refuses a 4th", async () => {
    const { stripe, pi } = fakeStripe({ devices: D1 });
    expect(await restoreByCode(stripe, "wm abcd 2345", D2)).toEqual({ plan: "standard", code: "WM-ABCD-2345" });
    expect(await restoreByCode(stripe, "WM-ABCD-2345", D3)).not.toBe("limit");
    expect(pi.metadata.devices).toBe(`${D1},${D2},${D3}`);
    expect(await restoreByCode(stripe, "WM-ABCD-2345", D4)).toBe("limit");
  });

  it("lets a device that already used the code unlock again without using a slot", async () => {
    const { stripe, update } = fakeStripe({ devices: `${D1},${D2},${D3}` });
    expect(await restoreByCode(stripe, "WM-ABCD-2345", D2)).toEqual({ plan: "standard", code: "WM-ABCD-2345" });
    expect(update).not.toHaveBeenCalled();
  });

  it("counts the shared return link like a code", async () => {
    const { stripe } = fakeStripe({ devices: `${D1},${D2},${D3}` });
    expect(await verifySession(stripe, "cs_test_abc123", D4)).toBe("limit");
  });

  it("does not unlock refunded purchases or unknown codes", async () => {
    expect(await restoreByCode(fakeStripe({ refunded: true }).stripe, "WM-ABCD-2345", D1)).toBeNull();
    expect(await verifySession(fakeStripe({ refunded: true }).stripe, "cs_test_abc123", D1)).toBeNull();
    expect(await restoreByCode(fakeStripe({ found: false }).stripe, "WM-ZZZZ-9999", D1)).toBeNull();
  });

  it("searches Stripe with a safe, exact query", async () => {
    const { stripe } = fakeStripe();
    await restoreByCode(stripe, "wm abcd 2345", D1);
    expect((stripe.paymentIntents.search as ReturnType<typeof vi.fn>).mock.calls[0]![0].query).toBe(
      "metadata['unlock_code']:'WM-ABCD-2345' AND status:'succeeded'",
    );
  });
});
