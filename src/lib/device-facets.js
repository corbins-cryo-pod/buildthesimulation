// Controlled vocabulary for device filters. The schema and the Devices page
// both read this list, so a typo in front matter fails the build.
export const AXIS = [
  ["cortex", "Cortex"],
  ["deep-brain", "Deep brain"],
  ["peripheral-nerve", "Peripheral nerve"],
  ["spinal-cord", "Spinal cord"],
  ["retina", "Retina"],
  ["cochlea", "Cochlea"],
  ["vasculature", "Vasculature"],
  ["other", "Other"],
];
export const FUNCTION = [
  ["recording", "Recording"],
  ["stimulation", "Stimulation"],
  ["bidirectional", "Bidirectional"],
];
export const FORM = [
  ["array", "Array"],
  ["film", "Thin film"],
  ["cuff", "Cuff"],
  ["fiber", "Fiber or thread"],
  ["probe", "Probe or shank"],
  ["microwire", "Microwire"],
  ["microelectrode", "Microelectrode"],
  ["intrafascicular", "Intrafascicular"],
  ["regenerative", "Regenerative"],
  ["stent", "Stent"],
  ["other", "Other"],
];
export const REGULATORY = [
  ["fda-approved", "FDA approved"],
  ["fda-cleared", "FDA cleared"],
  ["fda-authorized", "FDA authorized (De Novo)"],
  ["fda-hde", "FDA humanitarian device exemption"],
  ["ce-marked", "CE marked"],
  ["nmpa-approved", "NMPA approved"],
  ["registration-trial", "Registration trial"],
  ["investigational", "Investigational"],
];
export const slugs = (list) => list.map(([v]) => v);
export const facetSlug = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "-");

// Fallback for entries not yet backfilled: read the old free-text tags.
const TAG_AXIS = { cortex: "cortex", "peripheral nerve": "peripheral-nerve", "spinal cord": "spinal-cord" };
const TAG_FORM = { array: "array", cuff: "cuff", intrafascicular: "intrafascicular", regenerative: "regenerative", microelectrode: "microelectrode", film: "film" };
const TAG_REG = { "fda approved": "fda-approved", "fda cleared": "fda-cleared", "fda authorized": "fda-authorized", investigational: "investigational", "registration trial": "registration-trial" };
export function resolveFacets(data) {
  const tags = new Set((data.tags ?? []).map((t) => String(t).trim().toLowerCase()));
  const pick = (map) => Object.keys(map).filter((k) => tags.has(k)).map((k) => map[k]);
  const own = (field, fallback) => (Array.isArray(field) && field.length ? field : fallback);
  const tagFn = FUNCTION.map(([v]) => v).filter((v) => tags.has(v));
  const tagReg = pick(TAG_REG)[0];
  const tagOrigin = tags.has("china") ? "China" : "";
  return {
    axis: own(data.axis, pick(TAG_AXIS)),
    function: own(data.function, tagFn),
    form: own(data.form, pick(TAG_FORM)),
    regulatory: data.regulatory ?? tagReg ?? "",
    origin: data.origin ?? tagOrigin,
  };
}
