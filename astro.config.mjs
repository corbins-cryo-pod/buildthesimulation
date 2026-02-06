// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  site: "https://buildthesimulation.com",
  integrations: [preact()],
  vite: {
    // Prevent Vite from inlining built assets as data: URLs.
    // (Some browsers/extensions treat these strangely; we want a normal /_astro/*.js URL.)
    build: {
      assetsInlineLimit: 0,
    },
  },
});
