import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { AdminError, cancelCode, createManualCode, passwordOk, resetDevices, view } from "./admin.js";
import { CODE_RE } from "./pay.js";

const PW = "correct-horse-battery-staple-42";

describe("admin password", () => {
  it("accepts only the exact password", () => {
    expect(passwordOk(PW, PW)).toBe(true);
    expect(passwordOk(PW + "x", PW)).toBe(false);
    expect(passwordOk("", PW)).toBe(false);
  });
  it("refuses everything when the password is missing or too short", () => {
    expect(passwordOk("short", "short")).toBe(false);
    expect(passwordOk("anything", undefined)).toBe(false);
  });
});

function store() {
  const customers: Record<string, any> = {};
  let n = 0;
  const stripe = {
    paymentIntents: { search: vi.fn(async () => ({ data: [] })), update: vi.fn() },
    customers: {
      create: vi.fn(async (p: any) => {
        const c = { id: `cus_${++n}`, created: 1795200000 + n, name: p.name, email: p.email ?? null, metadata: { ...p.metadata } };
        customers[c.id] = c;
        return c;
      }),
      search: vi.fn(async ({ query }: { query: string }) => {
        const m = query.match(/unlock_code'\]:'([^']+)'/);
        return { data: Object.values(customers).filter((c) => !m || c.metadata.unlock_code === m[1]) };
      }),
      update: vi.fn(async (id: string, p: any) => Object.assign(customers[id].metadata, p.metadata) && customers[id]),
    },
  } as unknown as Stripe;
  return { stripe, customers };
}

describe("making codes for cash sales", () => {
  it("stores the person, amount in pence and a fresh code", async () => {
    const { stripe } = store();
    const rec = await createManualCode(stripe, { name: " Ada Lovelace ", email: "ada@example.com", amount: "£9.99", note: "Paid cash at church" });
    expect(rec.code).toMatch(CODE_RE);
    expect(view(rec)).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com", amountPence: 999, note: "Paid cash at church", kind: "manual", active: true, devicesUsed: 0 });
  });

  it("needs a name and checks the amount and email", async () => {
    const { stripe } = store();
    await expect(createManualCode(stripe, { name: "" })).rejects.toBeInstanceOf(AdminError);
    await expect(createManualCode(stripe, { name: "Ada", amount: "ten" })).rejects.toBeInstanceOf(AdminError);
    await expect(createManualCode(stripe, { name: "Ada", email: "not-an-email" })).rejects.toBeInstanceOf(AdminError);
  });

  it("can reset devices and cancel", async () => {
    const { stripe, customers } = store();
    const rec = await createManualCode(stripe, { name: "Ada" });
    customers[rec.id].metadata.devices = "aaaaaaaaaaa1,aaaaaaaaaaa2";
    expect((await resetDevices(stripe, rec.code)).devices).toEqual([]);
    expect(customers[rec.id].metadata.devices).toBe("");
    expect((await cancelCode(stripe, rec.code)).active).toBe(false);
    expect(customers[rec.id].metadata.cancelled).toBe("yes");
  });
});
