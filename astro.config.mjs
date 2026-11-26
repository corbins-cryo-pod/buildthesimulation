// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import { fileURLToPath } from "node:url";
import { unpack as unpackEquipmentRevisions } from "./scripts/unpack-equipment-revisions.mjs";
import { unpack as unpackPhase4 } from "./scripts/unpack-phase4-static.mjs";
import remarkCompanyBriefs from "./src/lib/remark-company-briefs.mjs";

// Materialize pinned revision assets even for hosts invoking Astro directly.
const equipmentRevisions = {
  name: "equipment-revisions-payload",
  hooks: {
    /** @type {NonNullable<import('astro').AstroIntegration['hooks']['astro:config:setup']>} */
    "astro:config:setup": async ({ config, command }) => {
      if (command !== "dev" && command !== "build") return;
      await unpackEquipmentRevisions(
        fileURLToPath(new URL("payloads/equipment-revised/", config.root)),
        fileURLToPath(new URL("equipment-revised/", config.publicDir)),
      );
      await unpackPhase4(
        fileURLToPath(new URL("payloads/phase4-static/", config.root)),
        fileURLToPath(config.publicDir),
      );
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: "https://buildthesimulation.com",
  integrations: [preact(), equipmentRevisions],
  // Bump this version when the formatter changes to invalidate cached Markdown.
  markdown: { remarkPlugins: [[remarkCompanyBriefs, { version: 1 }]] },
  redirects: {
    '/simulations/membrane': '/simulations/cellular-electrophysiology/#membrane',
    '/simulations/current-clamp': '/simulations/cellular-electrophysiology/#current-clamp',
    '/simulations/cable': '/simulations/cellular-electrophysiology/#cable',

    '/biology': '/simulations/',
    '/biology/membrane': '/simulations/cellular-electrophysiology/#membrane',
    '/biology/current-clamp': '/simulations/cellular-electrophysiology/#current-clamp',
    '/biology/cable': '/simulations/cellular-electrophysiology/#cable',
    "/china": "/companies/?region=Chinese",
    "/companies/map": "/companies/",
    '/devices/140-neuropixels-opto-prototype-2026': '/devices/107-neuropixels-opto-photonic-prototype/',
    '/devices/36-neuropixels-2-0': '/devices/88-neuropixels-20-alpha-probe/',
    '/devices/38-argus-ii-retinal-prosthesis': '/devices/165-argus-ii-retinal-prosthesis/',
    '/devices/37-braingate-pilot-2006': '/applications/37-braingate-pilot-2006/',
    '/devices/40-paradromics-connect-one-study': '/applications/40-paradromics-connect-one-study/',
    '/devices/44-synchron-command-study': '/applications/44-synchron-command-study/',
    '/devices/46-ucsf-speech-neuroprosthesis-2023': '/applications/46-ucsf-speech-neuroprosthesis-2023/',
    '/devices/47-intracortical-speech-bci-willett-2023': '/applications/47-intracortical-speech-bci-willett-2023/',
    '/devices/48-brain-spine-interface-lorach-2023': '/applications/48-brain-spine-interface-lorach-2023/',
    '/devices/49-handwriting-bci-willett-2021': '/applications/49-handwriting-bci-willett-2021/',
    '/devices/50-neural-robotic-arm-reach-grasp-2012': '/applications/50-neural-robotic-arm-reach-grasp-2012/',
    '/devices/51-moses-speech-neuroprosthesis-anarthria-2021': '/applications/51-moses-speech-neuroprosthesis-anarthria-2021/',
    '/devices/52-bidirectional-bci-tactile-feedback-flesher-2021': '/applications/52-bidirectional-bci-tactile-feedback-flesher-2021/',
    '/devices/53-ibci-typing-pandarinath-2017': '/applications/53-ibci-typing-pandarinath-2017/',
    '/devices/54-seven-dof-arm-collinger-2013': '/applications/54-seven-dof-arm-collinger-2013/',
    '/devices/57-neuralink-prime-enrollment': '/applications/57-neuralink-prime-enrollment/',
    '/devices/62-stentrode-switch-study': '/applications/62-stentrode-switch-study/',
    '/devices/designer': '/simulations/interface-designer/',
    '/devices/designer/guide': '/simulations/interface-designer/guide/',
  },
  vite: {
    // Explicit host for the managed development preview; production is static.
    server: { allowedHosts: ['terminal.local'] },
    // Prevent Vite from inlining built assets as data: URLs.
    // (Some browsers/extensions treat these strangely; we want a normal /_astro/*.js URL.)
    build: {
      assetsInlineLimit: 0,
    },
  },
});
