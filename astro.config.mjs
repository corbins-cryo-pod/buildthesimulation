// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  site: "https://buildthesimulation.com",
  integrations: [preact()],
  redirects: {
    "/companies/map": "/companies/",
    '/devices/140-neuropixels-opto-prototype-2026': '/devices/107-neuropixels-opto-photonic-prototype/',
    '/devices/36-neuropixels-2-0': '/devices/88-neuropixels-20-alpha-probe/',
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
    '/simulations/interface-designer': '/devices/designer/',
    '/simulations/interface-designer/guide': '/devices/designer/guide/',
  },
  vite: {
    // Prevent Vite from inlining built assets as data: URLs.
    // (Some browsers/extensions treat these strangely; we want a normal /_astro/*.js URL.)
    build: {
      assetsInlineLimit: 0,
    },
  },
});
