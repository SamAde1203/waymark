import { CHAPTERS, ItemSchema, toPublicItem, type PublicItem } from "@waymark/content-schema";

/**
 * Loads question items from /content at build time, validates them, and strips
 * internal fields. Only items with status draft/reviewed/live are returned;
 * callers decide which statuses they show.
 */
const files = import.meta.glob("../../../../content/items/*.json", { eager: true, import: "default" });

export function loadItems(): PublicItem[] {
  const out: PublicItem[] = [];
  for (const [file, data] of Object.entries(files)) {
    for (const raw of data as unknown[]) {
      const parsed = ItemSchema.safeParse(raw);
      if (!parsed.success) throw new Error(`Invalid item in ${file}: ${parsed.error.message}`);
      if (parsed.data.status !== "retired") out.push(toPublicItem(parsed.data));
    }
  }
  return out;
}

export { CHAPTERS };

/** Safe JSON for embedding in a <script type="application/json"> tag. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
