import {
  DEFAULT_CONFIG as ELECTRICAL,
  normalizeConfig as electricalConfig,
  parseExperiment as parseElectrical,
} from "../retinal-implant/model.mjs";
import {
  DEFAULT_CONFIG as PRIMA,
  normalizeConfig as primaConfig,
} from "../prima/model.mjs";
import { parseExperiment as parsePrima } from "../prima/export.mjs";
import { COORDINATES } from "./coordinates.mjs";

export const VERSION = "retina-unified-1.0.0";
export const SCHEMA = "bts.retina-laboratory.experiment.v1";
export const DEFAULTS = Object.freeze({
  polarity: "cathodic-first",
  modality: "electrical",
  fidelity: "network",
  seed: 431,
  placement: { xUm: 0, yUm: 0, rotationDeg: 0 },
  tissue: {
    condition: "degeneration",
    severity: 0.9,
    bipolar: 0.85,
    ganglion: 0.9,
    lesionRadiusUm: 1100,
    lesionXUm: 0,
    lesionYUm: 0,
    naturalVision: false,
  },
  scene: {
    stimulus: "letter",
    letter: "E",
    fieldDeg: 30,
    featureUm: 650,
    zoom: 1,
    contrast: 1,
    offsetXDeg: 0,
    offsetYDeg: 0,
    gratingCycles: 8,
    customImage: null,
    frames: null,
    frameMs: 100,
    frameIndex: 0,
    motion: false,
  },
  electrical: { ...ELECTRICAL, gapUm: 100, selectedId: "E25" },
  photovoltaic: { ...PRIMA, imageSize: 128, fieldGridSize: 31, cycles: 3 },
  optical: {
    wavelengthNm: 590,
    irradianceMwMm2: 1,
    pulseMs: 10,
    frequencyHz: 20,
    delayMs: 0,
    opsin: "chrimsonr",
    expression: 1,
    target: "ganglion",
    absorptionMmInv: 0.15,
    scatteringMmInv: 1.5,
    reducedScatteringPower: 1.2,
    tissueThicknessUm: 250,
    thermalCapacityJMm3K: 0.004,
    coolingMs: 500,
  },
  neural: {
    durationMs: 200,
    timeStepMs: 0.1,
    gridSize: 23,
    thresholdMv: 2,
    bipolarThresholdMv: 0.25,
    lateral: 0.3,
    tauMs: 15,
    selectedIndex: 264,
    cableDtMs: 0.02,
    cableInjectionPa: 0,
    electricalGainMv: 750,
    synapticGainMv: 220,
  },
  customContacts: null,
  driveWeights: {},
  inputMode: "shared",
  percept: "coupled",
});
const ENUMS = {
  polarity: ["cathodic-first", "anodic-first"],
  modality: ["electrical", "photovoltaic", "optogenetic", "hybrid"],
  fidelity: ["recruitment", "network", "cable"],
  inputMode: ["shared", "legacy-electrical", "legacy-prima"],
  percept: ["coupled", "baseline"],
};
export const cloneDefaults = () => structuredClone(DEFAULTS);
function num(v, lo, hi, name, integer = false) {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v < lo ||
    v > hi ||
    (integer && !Number.isInteger(v))
  )
    throw Error(
      `${name} must be ${integer ? "an integer" : "a finite number"} between ${lo} and ${hi}.`,
    );
  return v;
}
function object(value, defaults, name) {
  if (value === undefined) return structuredClone(defaults);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error(`${name} must be an object.`);
  for (const k of Object.keys(value))
    if (!(k in defaults)) throw Error(`Unknown ${name} setting: ${k}.`);
  return { ...structuredClone(defaults), ...value };
}
function image(value) {
  if (
    !value ||
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    value.width < 16 ||
    value.height < 16 ||
    value.width > 512 ||
    value.height > 512 ||
    !(Array.isArray(value.values) || ArrayBuffer.isView(value.values)) ||
    value.values.length !== value.width * value.height
  )
    throw Error(
      "Image must have 16–512 pixels per side and matching grayscale values.",
    );
  if (
    !Array.from(value.values).every(
      (x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1,
    )
  )
    throw Error("Image samples must be finite and between 0 and 1.");
  return {
    width: value.width,
    height: value.height,
    values: Array.from(value.values),
  };
}
export function normalize(input = {}) {
  const c = object(input, DEFAULTS, "experiment");
  for (const [k, list] of Object.entries(ENUMS))
    if (!list.includes(c[k])) throw Error(`Unsupported ${k}.`);
  num(c.seed, 0, 4294967295, "Seed", true);
  for (const k of ["placement", "tissue", "scene", "optical", "neural"])
    c[k] = object(input[k], DEFAULTS[k], k);
  for (const k of ["xUm", "yUm"]) num(c.placement[k], -3000, 3000, k);
  num(c.placement.rotationDeg, -180, 180, "Rotation");
  if (
    ![
      "healthy",
      "degeneration",
      "rp",
      "ga",
      "selective",
      "ganglion",
      "lesion",
    ].includes(c.tissue.condition)
  )
    throw Error("Unknown tissue condition.");
  for (const k of ["severity", "bipolar", "ganglion"])
    num(c.tissue[k], 0, 1, k);
  for (const k of ["lesionXUm", "lesionYUm"]) num(c.tissue[k], -4000, 4000, k);
  num(c.tissue.lesionRadiusUm, 100, 3500, "Lesion radius");
  if (typeof c.tissue.naturalVision !== "boolean")
    throw Error("Natural-vision input must be a boolean.");
  const s = c.scene;
  if (
    ![
      "letter",
      "landolt",
      "grating",
      "checkerboard",
      "face",
      "spot",
      "blank",
      "image",
      "video",
    ].includes(s.stimulus)
  )
    throw Error("Unknown scene.");
  if (!/^[A-Z]$/.test(s.letter))
    throw Error("Use a single uppercase Latin letter.");
  num(s.fieldDeg, 8, 30, "Scene field");
  num(s.featureUm, 30, 1000, "Feature size");
  num(s.zoom, 0.25, 12, "Magnification");
  num(s.contrast, 0, 1, "Contrast");
  num(s.gratingCycles, 1, 30, "Grating cycles");
  for (const k of ["offsetXDeg", "offsetYDeg"]) num(s[k], -15, 15, k);
  if (typeof s.motion !== "boolean") throw Error("Motion must be a boolean.");
  if (s.customImage) s.customImage = image(s.customImage);
  if (s.stimulus === "image" && !s.customImage)
    throw Error("Choose an image first.");
  if (s.frames !== null) {
    if (!Array.isArray(s.frames) || !s.frames.length || s.frames.length > 12)
      throw Error("A clip must contain 1–12 sampled frames.");
    s.frames = s.frames.map(image);
  }
  if (s.stimulus === "video" && !s.frames) throw Error("Choose a video first.");
  num(s.frameMs, 20, 1000, "Frame duration");
  num(s.frameIndex, 0, 11, "Frame index", true);
  c.electrical = electricalConfig(input.electrical ?? c.electrical);
  c.photovoltaic = primaConfig(input.photovoltaic ?? c.photovoltaic);
  const o = c.optical;
  for (const [k, lo, hi] of [
    ["wavelengthNm", 400, 950],
    ["irradianceMwMm2", 0, 4],
    ["pulseMs", 0.1, 30],
    ["frequencyHz", 1, 100],
    ["delayMs", 0, 100],
    ["expression", 0, 4],
    ["absorptionMmInv", 0, 5],
    ["scatteringMmInv", 0, 20],
    ["reducedScatteringPower", 0, 4],
    ["tissueThicknessUm", 50, 500],
    ["thermalCapacityJMm3K", 0.001, 0.01],
    ["coolingMs", 10, 5000],
  ])
    num(o[k], lo, hi, k);
  if (
    !["chrimsonr", "chr2", "chronos"].includes(o.opsin) ||
    !["ganglion", "bipolar"].includes(o.target)
  )
    throw Error("Unknown opsin or expression target.");
  if (o.pulseMs * o.frequencyHz >= 1000)
    throw Error("Optical pulses require a dark interval.");
  const n = c.neural;
  for (const [k, lo, hi] of [
    ["durationMs", 20, 400],
    ["timeStepMs", 0.025, 0.2],
    ["thresholdMv", 0.1, 50],
    ["bipolarThresholdMv", 0.01, 10],
    ["lateral", 0, 1],
    ["tauMs", 2, 50],
    ["cableDtMs", 0.005, 0.04],
    ["cableInjectionPa", 0, 500],
    ["electricalGainMv", 0, 1500],
    ["synapticGainMv", 0, 500],
  ])
    num(n[k], lo, hi, k);
  if (![15, 23, 31].includes(n.gridSize))
    throw Error("Neural sampling must be 15, 23 or 31.");
  num(
    n.selectedIndex,
    0,
    n.gridSize * n.gridSize - 1,
    "Selected population sample",
    true,
  );
  if (c.customContacts !== null) {
    c.customContacts = validateContacts(c.customContacts);
    const ids = new Set(c.customContacts.map((p) => p.id));
    c.electrical.selectedId = ids.has(input.electrical?.selectedId)
      ? input.electrical.selectedId
      : c.customContacts[0].id;
    c.electrical.disabledIds = (input.electrical?.disabledIds ?? []).filter(
      (id) => ids.has(id),
    );
  }
  if (
    !c.driveWeights ||
    typeof c.driveWeights !== "object" ||
    Array.isArray(c.driveWeights) ||
    Object.keys(c.driveWeights).length > 378
  )
    throw Error("Channel gains must be an object.");
  for (const [id, v] of Object.entries(c.driveWeights)) {
    if (!/^[\w-]{1,120}$/.test(id)) throw Error("Invalid contact ID.");
    num(v, 0, 1, "Channel gain");
  }
  return c;
}
export function validateContacts(contacts) {
  if (!Array.isArray(contacts) || !contacts.length || contacts.length > 256)
    throw Error("Import 1–256 circular contacts.");
  const ids = new Set();
  const result = contacts.map((p) => {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^[\w-]{1,120}$/.test(p.id) ||
      ids.has(p.id)
    )
      throw Error("Contact IDs must be unique.");
    ids.add(p.id);
    return {
      id: p.id,
      xUm: num(p.xUm, -4000, 4000, "Contact x"),
      yUm: num(p.yUm, -4000, 4000, "Contact y"),
      radiusUm: num(p.radiusUm, 5, 250, "Contact radius"),
      material: String(p.material ?? "unspecified").slice(0, 80),
    };
  });
  for (let i = 0; i < result.length; i++)
    for (let j = 0; j < i; j++)
      if (
        Math.hypot(
          result[i].xUm - result[j].xUm,
          result[i].yUm - result[j].yUm,
        ) <=
        result[i].radiusUm + result[j].radiusUm
      )
        throw Error("Imported contact surfaces overlap.");
  return result;
}
export function importDesigner(text) {
  if (typeof text !== "string" || text.length > 2e6)
    throw Error("Designer file must be smaller than 2 MB.");
  const d = JSON.parse(text);
  if (
    d.schema !== "bts-neural-interface" ||
    d.version !== 1 ||
    !["um", "µm"].includes(d.units)
  )
    throw Error("Expected a version 1 Neural Interface Designer export in µm.");
  if (!Array.isArray(d.contacts)) throw Error("Missing contacts.");
  if (
    d.contacts.some(
      (p) =>
        p.shape !== "circle" ||
        (p.layer !== undefined && p.layer !== 0 && p.layer !== 1),
    )
  )
    throw Error(
      "The verified disk solver accepts circular contacts on one plane. Other shapes are rejected without replacing their geometry.",
    );
  if (new Set(d.contacts.map((p) => p.layer ?? 0)).size > 1)
    throw Error("All imported contacts must lie on one plane.");
  return validateContacts(
    d.contacts.map((p) => ({
      id: p.id,
      xUm: p.x,
      yUm: -p.y,
      radiusUm: p.w / 2,
      material: d.routing?.material,
    })),
  );
}
export function fromLegacyElectrical(settings) {
  const e = electricalConfig(settings),
    c = cloneDefaults();
  c.electrical = e;
  c.placement = { xUm: e.xUm, yUm: e.yUm, rotationDeg: e.rotationDeg };
  c.inputMode = "legacy-electrical";
  c.percept = "baseline";
  return normalize(c);
}
export function fromLegacyPrima(settings) {
  const c = cloneDefaults();
  c.photovoltaic = primaConfig(settings);
  c.modality = "photovoltaic";
  c.inputMode = "legacy-prima";
  c.percept = "baseline";
  return normalize(c);
}
export function parseExperiment(text) {
  if (typeof text !== "string" || text.length > 45e6)
    throw Error("Choose an experiment JSON file smaller than 45 MB.");
  const d = JSON.parse(text);
  if (d.schema === "bts.retinal.experiment.v1")
    return fromLegacyElectrical(parseElectrical(text));
  if (
    d.schema === "bts.prima.experiment.v1" &&
    d.modelVersion === "prima-1.0.0"
  )
    return fromLegacyPrima(parsePrima(text));
  if (d.schema !== SCHEMA || d.modelVersion !== VERSION)
    throw Error("Unsupported retinal experiment version.");
  return normalize(d.settings);
}
export function serializable(v) {
  if (ArrayBuffer.isView(v)) return Array.from(v);
  if (Array.isArray(v)) return v.map(serializable);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, serializable(x)]),
    );
  return v;
}
export function experimentId(c) {
  const s = JSON.stringify(normalize(c));
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return "RTL-" + (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
}
export function exportExperiment(c, result = null) {
  const settings = normalize(c);
  if (result && JSON.stringify(settings) !== JSON.stringify(result.config))
    throw Error("Run the changed settings before exporting results.");
  return serializable({
    schema: SCHEMA,
    modelVersion: VERSION,
    experimentId: experimentId(c),
    settings,
    results: result,
    coordinates: COORDINATES,
    restorePolicy: "Recompute settings; imported results are never trusted.",
  });
}
