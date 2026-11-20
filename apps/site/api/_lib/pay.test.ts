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

describe("verify and restore", () => {
  const paid = { payment_status: "paid", metadata: { plan: "standard", unlock_code: "WM-ABCD-2345" } };

  it("unlocks a paid session only", async () => {
    const retrieve = vi.fn().mockResolvedValueOnce(paid).mockResolvedValueOnce({ ...paid, payment_status: "unpaid" });
    const stripe = { checkout: { sessions: { retrieve } } } as unknown as Stripe;
    expect(await verifySession(stripe, "cs_test_abc123")).toEqual({ plan: "standard", code: "WM-ABCD-2345" });
    expect(await verifySession(stripe, "cs_test_abc123")).toBeNull();
    expect(await verifySession(stripe, "not-a-session")).toBeNull();
  });

  it("restores by code, but not after a refund", async () => {
    const pi = { metadata: { plan: "standard" }, latest_charge: "ch_1" };
    const search = vi.fn().mockResolvedValue({ data: [pi] });
    const charges = vi.fn().mockResolvedValueOnce({ refunded: false }).mockResolvedValueOnce({ refunded: true });
    const stripe = { paymentIntents: { search }, charges: { retrieve: charges } } as unknown as Stripe;
    expect(await restoreByCode(stripe, "wm abcd 2345")).toEqual({ plan: "standard", code: "WM-ABCD-2345" });
    expect(search.mock.calls[0]![0].query).toBe("metadata['unlock_code']:'WM-ABCD-2345' AND status:'succeeded'");
    expect(await restoreByCode(stripe, "WM-ABCD-2345")).toBeNull();
  });

  it("finds nothing for an unknown code", async () => {
    const stripe = { paymentIntents: { search: vi.fn().mockResolvedValue({ data: [] }) } } as unknown as Stripe;
    expect(await restoreByCode(stripe, "WM-ZZZZ-9999")).toBeNull();
  });
});
