/**
 * Content lint: validates every item and fact file under the content folder.
 * Usage: pnpm content:check   (exit code 1 on any error)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FactSchema, ItemSchema, type Item } from "./index.ts";

const root = process.argv[2] ?? "content";

function jsonFiles(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(jsonFiles(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

let errors = 0;
const items: Item[] = [];
const itemIds = new Map<string, string>();
const factIds = new Set<string>();

for (const file of jsonFiles(join(root, "facts"))) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  for (const [i, entry] of (Array.isArray(raw) ? raw : [raw]).entries()) {
    const r = FactSchema.safeParse(entry);
    if (!r.success) {
      errors++;
      console.error(`✗ ${file}[${i}]: ${r.error.issues.map((x) => x.message).join("; ")}`);
    } else {
      factIds.add(r.data.fact_id);
    }
  }
}

for (const file of jsonFiles(join(root, "items"))) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  for (const [i, entry] of (Array.isArray(raw) ? raw : [raw]).entries()) {
    const r = ItemSchema.safeParse(entry);
    const where = `${file}[${i}]${entry?.item_id ? ` ${entry.item_id}` : ""}`;
    if (!r.success) {
      errors++;
      console.error(`✗ ${where}: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
      continue;
    }
    const prev = itemIds.get(r.data.item_id);
    if (prev) {
      errors++;
      console.error(`✗ ${where}: duplicate item_id (also in ${prev})`);
    }
    itemIds.set(r.data.item_id, file);
    if (factIds.size > 0 && !factIds.has(r.data.fact_id)) {
      console.warn(`! ${where}: fact_id ${r.data.fact_id} not in fact inventory`);
    }
    items.push(r.data);
  }
}

const byStatus = items.reduce<Record<string, number>>((acc, it) => {
  acc[it.status] = (acc[it.status] ?? 0) + 1;
  return acc;
}, {});
const byChapter = items.reduce<Record<number, number>>((acc, it) => {
  acc[it.source.chapter_id] = (acc[it.source.chapter_id] ?? 0) + 1;
  return acc;
}, {});

console.log(`\n${items.length} items, ${factIds.size} facts`);
console.log("by status:", byStatus);
console.log("by chapter:", byChapter);
if (errors > 0) {
  console.error(`\n${errors} error(s)`);
  process.exit(1);
}
console.log("✓ content OK");
