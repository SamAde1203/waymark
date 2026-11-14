import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.waymarkprep.co.uk",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
});
