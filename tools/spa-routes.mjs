// Give every app screen its own HTML file (a copy of the app shell), so opening or refreshing
// e.g. /app/unlock works on Vercel without relying on a rewrite. Dynamic screens with unknown ids
// (/app/result/<id>) still fall back to the rewrite in vercel.json.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

// Offline: list every built file under _expo/ and assets/ in the service worker, with a release id
// that changes whenever the files change (so installed copies update cleanly).
function walk(d) {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = ["_expo", "assets"].flatMap((d) => {
  try { return walk(join(dir, d)); } catch { return []; }
});
const urls = files.map((f) => "/app/" + f.slice(dir.length + 1).split("\\").join("/")).sort();
const release = createHash("sha256").update(urls.join("\n")).digest("hex").slice(0, 12);
const swPath = join(dir, "sw.js");
const sw = readFileSync(swPath, "utf8")
  .replace("__RELEASE__", release)
  .replace("[] /* __PRECACHE__ */", JSON.stringify(urls));
writeFileSync(swPath, sw);
console.log(`service worker: release ${release}, ${urls.length} files cached for offline use`);
