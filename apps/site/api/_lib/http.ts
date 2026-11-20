import Stripe from "stripe";

// Minimal shapes of Vercel's Node request/response, so no extra type package is needed.
export type Req = { method?: string; query: Record<string, string | string[] | undefined>; headers: Record<string, string | string[] | undefined> };
export type Res = {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  redirect(status: number, url: string): void;
};

export function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** The site's own address. Fixed in production so a request can't redirect buyers elsewhere. */
export function origin(): string {
  return process.env.SITE_ORIGIN ?? "https://www.waymarkprep.co.uk";
}

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export function noStore(res: Res): void {
  res.setHeader("Cache-Control", "no-store");
}
