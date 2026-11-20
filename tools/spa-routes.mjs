// Give every app screen its own HTML file (a copy of the app shell), so opening or refreshing
// e.g. /app/unlock works on Vercel without relying on a rewrite. Dynamic screens with unknown ids
// (/app/result/<id>) still fall back to the rewrite in vercel.json.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const dir = process.argv[2] ?? "apps/site/dist/app";
const shell = join(dir, "index.html");
const routes = [
  "today", "learn", "practice", "progress", "onboarding", "unlock", "settings",
  "session", "mock", "test-day", "report",
  "learn/1", "learn/2", "learn/3", "learn/4", "learn/5",
];
for (const r of routes) {
  const out = join(dir, `${r}.html`);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(shell, out);
}
console.log(`app shell copied to ${routes.length} routes`);
