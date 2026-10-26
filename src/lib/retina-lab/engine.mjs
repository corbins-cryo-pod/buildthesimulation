import { normalize, VERSION, experimentId } from "./schema.mjs";
import {
  COORDINATES,
  retinalToVisual,
  visualToRetinal,
  placePoint,
  localPoint,
  sampleRetinal,
  sampleRaster,
} from "./coordinates.mjs";
import { population, morphology, layersAt, ANATOMY_NOTE } from "./anatomy.mjs";
import { runNetwork, runCable } from "./neural.mjs";
import { opticalTransmission, thermalTrace, pulseAt } from "./optics.mjs";
import {
  generateContacts,
  createElectricalSources,
  buildWaveform,
  createStimulusRaster,
  scheduleInfo,
} from "../retinal-implant/model.mjs";
import { evaluateField } from "../retinal-implant/field.mjs";
import { predictPercept } from "../retinal-implant/percept.mjs";
import { simulateExperiment as legacyElectrical } from "../retinal-implant/engine.mjs";
import {
  simulateExperiment as legacyPrima,
  samplePixelIllumination,
} from "../prima/engine.mjs";
import { createPrimaGeometry } from "../prima/geometry.mjs";
import {
  solvePhysics,
  makeCircuitModel,
  evaluateFields,
  surfaceGreenOhm,
} from "../prima/physics.mjs";
import { predictPercept as primaPercept } from "../prima/percept.mjs";
import { renderInput } from "../prima/stimuli.mjs";

const maxAbs = (a) => {
  let m = 0;
  for (const v of a ?? []) m = Math.max(m, Math.abs(v));
  return m;
};
const enabled = (c, mode) =>
  c.modality === mode ||
  (c.modality === "hybrid" &&
    (mode === "electrical" || mode === "optogenetic"));
export function sceneImage(c, timeMs = 0, size = 128) {
  timeMs += c.scene.frameIndex * c.scene.frameMs;
  const s = c.scene,
    clip = s.stimulus === "video",
    frame = clip
      ? s.frames[Math.min(s.frames.length - 1, Math.floor(timeMs / s.frameMs))]
      : s.customImage;
  return {
    ...renderInput(
      {
        stimulus: clip ? "image" : s.stimulus,
        customImage: frame,
        letter: s.letter,
        implantWidthUm: s.fieldDeg * 288,
        landoltGapUm: s.featureUm,
        spotRadiusUm: s.featureUm,
        gratingCycles: s.gratingCycles,
        zoom: s.zoom,
        contrast: s.contrast,
        offsetXUm:
          (s.offsetXDeg + (s.motion ? 4 * Math.sin(timeMs / 300) : 0)) * 288,
        offsetYUm: s.offsetYDeg * 288,
      },
      size,
    ),
    fieldDeg: s.fieldDeg,
  };
}
function raster(size, fieldDeg, fn) {
  const values = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      values[y * size + x] = fn(
        ((x + 0.5) / size) * fieldDeg - fieldDeg / 2,
        fieldDeg / 2 - ((y + 0.5) / size) * fieldDeg,
      );
  return { width: size, height: size, values, fieldDeg };
}
export function projectPrima(scene, c, size = 128) {
  const values = new Float64Array(size * size),
    p = c.photovoltaic;
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const point = placePoint(
        {
          xUm: ((col + 0.5) / size - 0.5) * 2000 - p.offsetXUm,
          yUm: (0.5 - (row + 0.5) / size) * 2000 - p.offsetYUm,
        },
        c.placement,
      );
      values[row * size + col] = sampleRetinal(
        scene,
        point.xUm,
        point.yUm,
        c.scene.fieldDeg,
      );
    }
  return { width: size, height: size, values };
}
function sampleField(field, x, y, key = "potentialMv") {
  const span = field.xUm.at(-1) - field.xUm[0],
    cx = (field.xUm.at(-1) + field.xUm[0]) / 2,
    cy = (field.yUm[0] + field.yUm.at(-1)) / 2;
  return sampleRaster(
    { width: field.width, height: field.height, values: field[key] },
    x - cx,
    y - cy,
    span,
  );
}
export function encodedContacts(c, scene) {
  const e = { ...c.electrical, ...c.placement },
    base = c.customContacts
      ? c.customContacts.map((p, i) => ({
          ...p,
          ...placePoint(p, c.placement),
          zUm: e.gapUm,
          enabled: !e.disabledIds.includes(p.id),
          thresholdUa: e.thresholdUa,
          row: Math.floor(i / e.cols),
          col: i % e.cols,
        }))
      : generateContacts(e);
  if (c.inputMode === "legacy-electrical") return base;
  const contacts = base.map((p) => {
    let drive = 0;
    const r = p.radiusUm;
    for (const [dx, dy] of [
      [0, 0],
      [r / 2, 0],
      [-r / 2, 0],
      [0, r / 2],
      [0, -r / 2],
    ]) {
      let value = sampleRetinal(
        scene,
        p.xUm + dx,
        p.yUm + dy,
        c.scene.fieldDeg,
      );
      if (e.encoder === "edges") {
        const h = e.pitchUm / 4;
        value = Math.min(
          1,
          Math.hypot(
            sampleRetinal(scene, p.xUm + dx + h, p.yUm + dy, c.scene.fieldDeg) -
              sampleRetinal(
                scene,
                p.xUm + dx - h,
                p.yUm + dy,
                c.scene.fieldDeg,
              ),
            sampleRetinal(scene, p.xUm + dx, p.yUm + dy + h, c.scene.fieldDeg) -
              sampleRetinal(
                scene,
                p.xUm + dx,
                p.yUm + dy - h,
                c.scene.fieldDeg,
              ),
          ),
        );
      }
      drive += value / 5;
    }
    drive *= p.enabled ? (c.driveWeights[p.id] ?? 1) : 0;
    return {
      ...p,
      ...retinalToVisual(p.xUm, p.yUm),
      drive,
      amplitudeUa: e.amplitudeUa * drive,
    };
  });
  const sum = contacts.reduce((s, p) => s + p.amplitudeUa, 0);
  if (e.budgetMode === "total-current" && sum > e.totalCurrentUa)
    for (const p of contacts) p.amplitudeUa *= e.totalCurrentUa / sum;
  return contacts;
}
// Canonical aliases let the retained grid validator inspect any imported ID
// without changing interleaved order or the selected physical contact.
function electricalSources(e, contacts) {
  const aliases = contacts.map((p, i) => ({
      ...p,
      id: "E" + String(i + 1).padStart(2, "0"),
    })),
    map = new Map(aliases.map((p, i) => [p.id, contacts[i].id]));
  const selected = contacts.findIndex((p) => p.id === e.selectedId),
    result = createElectricalSources(
      {
        ...e,
        rows: 16,
        cols: 16,
        selectedId: aliases[Math.max(0, selected)].id,
      },
      aliases,
    );
  const restore = (p) => ({ ...p, id: map.get(p.id) ?? p.id });
  result.sources = result.sources.map(restore);
  result.schedule.active = result.schedule.active.map(restore);
  result.schedule.offsets = Object.fromEntries(
    Object.entries(result.schedule.offsets).map(([id, t]) => [
      map.get(id) ?? id,
      t,
    ]),
  );
  return result;
}
export function contactWaveform(c, contacts, id) {
  const e = { ...c.electrical, ...c.placement },
    s = scheduleInfo(e, contacts),
    p = contacts.find((x) => x.id === id) ?? contacts[0],
    offset = s.offsets[p.id] ?? 0,
    events = [],
    timeMs = [0],
    currentUa = [0];
  if (p.amplitudeUa > 0)
    for (
      let t = offset;
      t + s.pulseDurationMs <= e.trainDurationMs + 1e-10;
      t += s.periodMs
    ) {
      events.push(
        {
          startMs: t,
          endMs: t + e.phaseDurationMs,
          currentUa: (c.polarity === "anodic-first" ? 1 : -1) * p.amplitudeUa,
        },
        {
          startMs: t + e.phaseDurationMs + e.interphaseMs,
          endMs: t + s.pulseDurationMs,
          currentUa: (c.polarity === "anodic-first" ? -1 : 1) * p.amplitudeUa,
        },
      );
    }
  for (const q of events) {
    timeMs.push(q.startMs, q.startMs, q.endMs, q.endMs);
    currentUa.push(0, q.currentUa, q.currentUa, 0);
  }
  timeMs.push(e.trainDurationMs);
  currentUa.push(0);
  return {
    contactId: p.id,
    timeMs,
    currentUa,
    events,
    pulseCount: events.length / 2,
    phaseChargeNc: events.length ? p.amplitudeUa * e.phaseDurationMs : 0,
    chargeDensityUcCm2: events.length
      ? (p.amplitudeUa * e.phaseDurationMs * 1e5) / (Math.PI * p.radiusUm ** 2)
      : 0,
    netChargeNc: events.reduce(
      (s, p) => s + p.currentUa * (p.endMs - p.startMs),
      0,
    ),
  };
}
export function bipolarPulse(c, t, offset = 0) {
  const e = c.electrical;
  if (t < offset || t >= e.trainDurationMs) return 0;
  const period = 1000 / e.frequencyHz,
    start = offset + Math.floor((t - offset) / period) * period;
  if (
    start + 2 * e.phaseDurationMs + e.interphaseMs >
    e.trainDurationMs + 1e-10
  )
    return 0;
  const p = t - start;
  if (p < e.phaseDurationMs) return c.polarity === "anodic-first" ? -1 : 1;
  if (
    p >= e.phaseDurationMs + e.interphaseMs &&
    p < 2 * e.phaseDurationMs + e.interphaseMs
  )
    return c.polarity === "anodic-first" ? 1 : -1;
  return 0;
}
/** Linear field transfer including the solved shared return; current input is µA. */
export function primaTransfer(model, geometry, points) {
  const n = geometry.pixels.length,
    out = [];
  for (const point of points) {
    const a = new Float64Array(n),
      r = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      const p = geometry.pixels[j],
        dx = point.xUm - p.xUm,
        dy = point.yUm - p.yUm;
      a[j] =
        surfaceGreenOhm(
          dx,
          dy,
          point.zUm,
          model.activeWidthUm,
          model.conductivitySm,
        ) * 0.001;
      for (const d of model.offsets)
        r[j] +=
          d.weight *
          surfaceGreenOhm(
            dx - d.xUm,
            dy - d.yUm,
            point.zUm,
            model.returnWidthUm,
            model.conductivitySm,
          ) *
          0.001;
    }
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++) a[j] += r[k] * model.returnMap[k * n + j];
    out.push(a);
  }
  return out;
}
export function decodeResponse(c, neural, frame = null, size = 96) {
  const values = new Float32Array(size * size),
    span = c.scene.fieldDeg,
    activity = frame?.activity ?? neural.response;
  const sigma = (span / c.neural.gridSize) * 0.6;
  for (let i = 0; i < neural.cells.length; i++) {
    const cell = neural.cells[i],
      amplitude = Math.min(
        1,
        Math.max(0, activity[i]) /
          (frame ? 2 : c.fidelity === "recruitment" ? 1 : 100),
      );
    if (!amplitude) continue;
    const px = (cell.xDeg / span + 0.5) * size - 0.5,
      py = (0.5 - cell.yDeg / span) * size - 0.5,
      sig = (sigma / span) * size,
      r = Math.ceil(sig * 3);
    for (
      let y = Math.max(0, Math.floor(py - r));
      y <= Math.min(size - 1, Math.ceil(py + r));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(px - r));
        x <= Math.min(size - 1, Math.ceil(px + r));
        x++
      )
        values[y * size + x] +=
          amplitude *
          Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (2 * sig * sig));
  }
  for (let i = 0; i < values.length; i++) values[i] = Math.min(1, values[i]);
  return {
    width: size,
    height: size,
    values,
    fieldDeg: span,
    model:
      "Fixed-scale Gaussian retinal-output decoder. Illustrative activity map; not clinical vision or an acuity estimate.",
  };
}

export async function simulate(
  input,
  reference,
  { onProgress = () => {}, timeMs = 0 } = {},
) {
  const start = performance.now(),
    c = normalize(input),
    cells = population(c),
    n = cells.length,
    scene = sceneImage(c, timeMs),
    warnings = [ANATOMY_NOTE],
    report = (progress, message) => onProgress({ progress, message });
  report(0.02, "Registering anatomy, visual scene and device placement");
  if (c.inputMode === "legacy-electrical") {
    const original = createStimulusRaster({ ...c.electrical, ...c.placement });
    Object.assign(scene, {
      width: original.width,
      height: original.height,
      values: original.brightness,
      fieldDeg: 30,
    });
  } else if (c.inputMode === "legacy-prima") {
    const original = renderInput(c.photovoltaic, c.photovoltaic.imageSize);
    Object.assign(
      scene,
      raster(128, c.scene.fieldDeg, (x, y) => {
        const p = localPoint(visualToRetinal(x, y), c.placement);
        return sampleRaster(original, p.xUm, p.yUm, 2000);
      }),
    );
  }
  const ganglionMv = new Float64Array(n),
    bipolarMv = new Float64Array(n),
    optical = new Float64Array(n),
    native = Float64Array.from(cells, (p) =>
      sampleRetinal(scene, p.receptorXUm, p.receptorYUm, c.scene.fieldDeg),
    );
  let electrical = null,
    photovoltaic = null,
    baseline = null,
    deviceInput = null,
    thermal = null,
    cableField;
  const nodes =
    c.fidelity === "cable" ? morphology(cells[c.neural.selectedIndex]) : null;
  const zeroCable = new Float64Array(nodes?.length ?? 0);
  cableField = () => zeroCable;
  if (enabled(c, "electrical")) {
    report(0.12, "Solving retained finite-contact electrical fields");
    const e = { ...c.electrical, ...c.placement },
      contacts = encodedContacts(c, scene),
      sourceInfo = electricalSources(e, contacts),
      options = {
        conductivitySm: e.conductivitySm,
        quadratureOrder: 32,
        interpolation: false,
        requireBalanced: true,
      };
    const points = cells.flatMap((p) => [
      { xUm: p.xUm, yUm: p.yUm, zUm: -p.depthUm },
      { xUm: p.xUm, yUm: p.yUm, zUm: -p.dendriteDepthUm },
    ]);
    const probes = evaluateField(sourceInfo.sources, points, options);
    for (let i = 0; i < n; i++)
      ganglionMv[i] = Math.abs(
        probes.potentialMv[i * 2] - probes.potentialMv[i * 2 + 1],
      );
    const size = e.fieldGridSize,
      span =
        e.fieldView === "selected"
          ? e.fieldSpanUm
          : Math.max(7000, e.pitchUm * Math.max(e.rows, e.cols) + 1500),
      selected = contacts.find((p) => p.id === e.selectedId) ?? contacts[0],
      cx = e.fieldView === "selected" ? selected.xUm : c.placement.xUm,
      cy = e.fieldView === "selected" ? selected.yUm : c.placement.yUm;
    const xUm = Array.from(
        { length: size },
        (_, i) => cx - span / 2 + (i * span) / (size - 1),
      ),
      yUm = Array.from(
        { length: size },
        (_, i) => cy + span / 2 - (i * span) / (size - 1),
      );
    const grid = yUm.flatMap((y) =>
        xUm.map((x) => ({ xUm: x, yUm: y, zUm: 0 })),
      ),
      field = {
        width: size,
        height: size,
        xUm,
        yUm,
        ...evaluateField(sourceInfo.sources, grid, {
          ...options,
          interpolation: true,
        }),
      };
    const waveform = contactWaveform(c, contacts, e.selectedId),
      poptions = {
        electrodes: contacts,
        eye: e.eye,
        model: e.perceptModel,
        rhoUm: e.rhoUm,
        lambdaUm: e.lambdaUm,
        frequencyHz: e.frequencyHz,
        phaseDurationMs: e.phaseDurationMs,
        gridStepDeg: e.gridStepDeg,
      };
    if (e.perceptModel === "biphasic" && e.sequence !== "simultaneous")
      throw Error(
        "The published biphasic percept requires simultaneous trains. Select the axon or scoreboard model for interleaved delivery.",
      );
    for (const p of contacts)
      p.pulseCount = contactWaveform(c, contacts, p.id).pulseCount;
    poptions.electrodes = contacts.map((p) => ({
      ...p,
      amplitudeUa: p.pulseCount ? p.amplitudeUa : 0,
    }));
    const percept = predictPercept(reference, poptions);
    baseline = raster(96, c.scene.fieldDeg, (x, y) =>
      sampleRaster(percept, x, y, 30),
    );
    baseline.model =
      e.perceptModel === "biphasic"
        ? "Published biphasic axon model · empirical units"
        : "Published pulse2percept spatial model · drive units";
    const peak = maxAbs(baseline.values);
    if (peak > 0)
      baseline.values = Float32Array.from(
        baseline.values,
        (v) =>
          v / (e.perceptModel === "biphasic" ? 1 : Math.max(1, e.amplitudeUa)),
      );
    deviceInput = raster(128, c.scene.fieldDeg, (x, y) => {
      const p = visualToRetinal(x, y);
      let v = 0;
      for (const q of contacts)
        if (Math.hypot(q.xUm - p.xUm, q.yUm - p.yUm) < q.radiusUm * 1.4)
          v = Math.max(v, q.drive ?? q.amplitudeUa / e.amplitudeUa);
      return v;
    });
    electrical = {
      contacts,
      sources: sourceInfo.sources,
      field,
      waveform,
      percept,
      metrics: {
        activeContacts: contacts.filter((p) => p.amplitudeUa > 0).length,
        totalContacts: contacts.length,
        currentBalanceUa: sourceInfo.netCurrentUa,
        peakPotentialMv: maxAbs(field.potentialMv),
        phaseChargeNc: waveform.phaseChargeNc,
        chargeDensityUcCm2: waveform.chargeDensityUcCm2,
      },
      snapshotTimeMs: sourceInfo.snapshotTimeMs,
      model: "Uniform-current disks, homogeneous infinite isotropic conductor",
    };
    if (c.inputMode === "legacy-electrical") {
      electrical.legacy = await legacyElectrical(e, reference);
      const old = electrical.legacy.stimulus;
      Object.assign(scene, {
        width: old.width,
        height: old.height,
        values: old.brightness,
        fieldDeg: 30,
      });
    }
    if (nodes) {
      const ps = nodes.map((p) => ({
        xUm: p.xUm,
        yUm: p.yUm,
        zUm: -p.depthUm,
      }));
      if (e.sequence === "simultaneous") {
        const potential = evaluateField(
          sourceInfo.sources,
          ps,
          options,
        ).potentialMv;
        cableField = (t) =>
          Float64Array.from(potential, (v) => v * bipolarPulse(c, t));
      } else {
        const active = sourceInfo.schedule.active,
          all = createElectricalSources(
            { ...e, sequence: "simultaneous" },
            contacts,
          ),
          returns = all.sources.filter((p) => p.kind === "return"),
          sum = active.reduce((s, p) => s + p.amplitudeUa, 0);
        const basis = active.map(
          (p) =>
            evaluateField(
              [
                { ...p, currentUa: -p.amplitudeUa },
                ...returns.map((r) => ({
                  ...r,
                  currentUa: (r.currentUa * p.amplitudeUa) / sum,
                })),
              ],
              ps,
              options,
            ).potentialMv,
        );
        cableField = (t) => {
          const out = new Float64Array(nodes.length);
          active.forEach((p, j) => {
            const f = bipolarPulse(c, t, sourceInfo.schedule.offsets[p.id]);
            for (let i = 0; i < out.length; i++) out[i] += basis[j][i] * f;
          });
          return out;
        };
      }
    }
    if (e.sequence === "interleaved")
      warnings.push(
        "The population surrogate uses the selected electrical snapshot; the detailed cable resolves individual interleaved contact schedules.",
      );
  }
  if (c.modality === "photovoltaic") {
    report(0.18, "Converting projected light to photovoltaic current");
    const p = c.photovoltaic,
      geometry = createPrimaGeometry(p),
      projection =
        c.inputMode === "legacy-prima"
          ? renderInput(p, p.imageSize)
          : projectPrima(scene, c, p.imageSize),
      illumination = samplePixelIllumination(projection, geometry);
    for (let i = 0; i < illumination.length; i++)
      illumination[i] *= c.driveWeights[geometry.pixels[i].id] ?? 1;
    const history = [];
    const physics = solvePhysics(
      p,
      illumination,
      (q) => report(0.2 + 0.35 * (q.progress ?? 0), q.message),
      {
        onSample: nodes
          ? (t, values) =>
              history.push({
                timeMs: t,
                currentUa: Float64Array.from(values, (v) => v * 1e6),
              })
          : undefined,
      },
    );
    const model = makeCircuitModel(p, geometry),
      currents = Float64Array.from(
        physics.pixelMetrics,
        (v) => v.snapshotCurrentUa * 1e-6,
      );
    const points = cells.flatMap((cell) => {
      const xy = localPoint(cell, c.placement);
      return [
        { ...xy, zUm: p.gapUm },
        { ...xy, zUm: p.gapUm + p.bipolarLengthUm },
      ];
    });
    const fields = evaluateFields(model, geometry, currents, points);
    for (let i = 0; i < n; i++)
      bipolarMv[i] = Math.abs(
        fields[2 * i].potentialMv - fields[2 * i + 1].potentialMv,
      );
    const percept = primaPercept(projection, p);
    baseline = raster(96, c.scene.fieldDeg, (x, y) => {
      const local = localPoint(visualToRetinal(x, y), c.placement);
      return sampleRaster(
        {
          width: percept.width,
          height: percept.height,
          values: percept.values ?? percept.percept,
        },
        local.xUm,
        local.yUm,
        2000,
      );
    });
    baseline.model =
      "ProViSim v2.0.0 · conditional image baseline, independent of current";
    deviceInput = raster(128, c.scene.fieldDeg, (x, y) => {
      const local = localPoint(visualToRetinal(x, y), c.placement);
      return sampleRaster(projection, local.xUm, local.yUm, 2000);
    });
    photovoltaic = {
      geometry,
      projection,
      illumination,
      physics,
      percept,
      metrics: physics.metrics,
      model: physics.provenance.version,
    };
    if (c.inputMode === "legacy-prima")
      photovoltaic.legacy = await legacyPrima(p);
    thermal = thermalTrace(
      {
        ...c.optical,
        irradianceMwMm2: p.irradianceMwMm2,
        pulseMs: p.pulseDurationMs,
        frequencyHz: p.frequencyHz,
        delayMs: 0,
        trainDurationMs: (p.cycles * 1000) / p.frequencyHz,
      },
      c.neural.durationMs,
    );
    if (nodes) {
      const cell = cells[c.neural.selectedIndex],
        ps = nodes.map((q) => ({
          ...localPoint(q, c.placement),
          zUm: Math.max(
            1,
            p.gapUm +
              layersAt(q.xUm, q.yUm).find((l) => l.id === "INL").bottom -
              q.depthUm,
          ),
        })),
        transfer = primaTransfer(model, geometry, ps);
      let cursor = 0;
      cableField = (t) => {
        while (cursor + 1 < history.length && history[cursor + 1].timeMs <= t)
          cursor++;
        if (t > history.at(-1).timeMs) return new Float64Array(nodes.length);
        return Float64Array.from(transfer, (row) =>
          row.reduce((s, v, j) => s + v * history[cursor].currentUa[j], 0),
        );
      };
    }
  }
  if (enabled(c, "optogenetic")) {
    report(0.64, "Propagating light and evaluating opsin expression");
    for (let i = 0; i < n; i++) {
      const p = cells[i],
        local = localPoint(p, c.placement);
      if (Math.abs(local.xUm) <= 2000 && Math.abs(local.yUm) <= 2000)
        optical[i] =
          sampleRetinal(scene, p.xUm, p.yUm, c.scene.fieldDeg) *
          c.optical.irradianceMwMm2 *
          opticalTransmission(
            c.optical.target === "ganglion" ? p.depthUm : p.bipolarDepthUm,
            c.optical,
          );
    }
    if (!deviceInput)
      deviceInput = raster(128, c.scene.fieldDeg, (x, y) => {
        const p = visualToRetinal(x, y),
          local = localPoint(p, c.placement);
        return Math.abs(local.xUm) < 2000 && Math.abs(local.yUm) < 2000
          ? sampleRaster(scene, x, y, c.scene.fieldDeg)
          : 0;
      });
    thermal = thermalTrace(c.optical, c.neural.durationMs);
  }
  report(0.76, "Integrating the shared retinal response");
  const pv = photovoltaic?.physics,
    w = pv?.waveform,
    pvPeak = w
      ? Math.max(
          1e-12,
          Math.abs(
            w.arrayCurrentUa[
              w.timeMs.findIndex(
                (t) => Math.abs(t - pv.metrics.snapshotTimeMs) < 1e-6,
              )
            ],
          ),
        )
      : 1;
  let wi = 0;
  const drive = {
    scene: native,
    ganglionMv,
    bipolarMv,
    optical,
    electricalEnvelope: (t) =>
      enabled(c, "electrical") ? bipolarPulse(c, t) : 0,
    photovoltaicEnvelope: (t) => {
      if (!w || t > w.timeMs.at(-1)) return 0;
      while (wi + 1 < w.timeMs.length && w.timeMs[wi + 1] <= t) wi++;
      return Math.max(0, w.arrayCurrentUa[wi] / pvPeak);
    },
  };
  const neural = runNetwork(c, cells, drive);
  let cable = null;
  if (nodes && cells[c.neural.selectedIndex].survival.ganglion > 0) {
    report(0.84, "Solving the selected neuron’s active compartments");
    cable = runCable(c, cells[c.neural.selectedIndex], cableField, {
      nodes,
      synapticDrive: (t) =>
        neural.frames[Math.min(neural.frames.length - 1, Math.floor(t / 5))]
          .bipolar[c.neural.selectedIndex],
      opticalDrive: optical[c.neural.selectedIndex],
    });
  }
  const response = decodeResponse(c, neural),
    percept = c.percept === "baseline" && baseline ? baseline : response;
  if (c.polarity === "anodic-first" && enabled(c, "electrical"))
    warnings.push(
      "Anodic-first polarity reverses the delivered waveform and active-cable field. The static field map and published appearance baselines retain the cathodic reference snapshot; no validated polarity-dependent percept model is claimed.",
    );
  if (c.percept === "baseline")
    warnings.push(
      "Published appearance baselines bypass the new neural model. Their brightness scales differ between technologies; PRIMA’s baseline can remain nonzero without stimulation.",
    );
  if (c.modality === "photovoltaic")
    warnings.push(
      "The network uses the final-pulse field pattern with the calculated array-current envelope. The detailed cable instead receives all pixel currents through the field transfer.",
    );
  warnings.push(
    "Electrical tissue is homogeneous and isotropic. Curvature is registered display geometry; a curved, layered or anisotropic conductor is not solved.",
  );
  const metrics = {
    meanResponse: neural.response.reduce((a, b) => a + b, 0) / n,
    respondingSamples: Array.from(neural.response).filter((v) => v > 0).length,
    totalSamples: n,
    totalSpikes: neural.spikes.length,
    meanPhotoreceptorSurvival:
      cells.reduce((s, p) => s + p.survival.photoreceptor, 0) / n,
    peakGanglionDriveMv: maxAbs(ganglionMv),
    peakBipolarDriveMv: maxAbs(bipolarMv),
    peakIrradianceMwMm2: maxAbs(optical),
    peakTemperatureRiseK: thermal?.peakDeltaK ?? 0,
    cableSpikeCount: cable?.spikes.length ?? null,
    selectedNetworkSpikeCount: neural.counts[c.neural.selectedIndex],
    elapsedMs: performance.now() - start,
  };
  const selectedCell = cells[c.neural.selectedIndex];
  const selectedContact = electrical?.contacts.find(
    (p) => p.id === c.electrical.selectedId,
  );
  const selectedPixel = photovoltaic?.geometry.pixels.find(
    (p) => p.id === c.photovoltaic.selectedPixelId,
  );
  if (selectedContact)
    metrics.selectedContactToSomaUm = Math.hypot(
      selectedContact.xUm - selectedCell.xUm,
      selectedContact.yUm - selectedCell.yUm,
      c.electrical.gapUm + selectedCell.depthUm,
    );
  else if (selectedPixel) {
    const p = placePoint(selectedPixel, c.placement);
    metrics.selectedContactToSomaUm = Math.hypot(
      p.xUm - selectedCell.xUm,
      p.yUm - selectedCell.yUm,
      layersAt(selectedCell.xUm, selectedCell.yUm).find((l) => l.id === "INL")
        .bottom +
        c.photovoltaic.gapUm -
        selectedCell.depthUm,
    );
  } else metrics.selectedContactToSomaUm = null;
  metrics.sampledResponseAreaDeg2 =
    (metrics.respondingSamples * c.scene.fieldDeg ** 2) / n;
  metrics.incidentTrainEnergyUj = photovoltaic
    ? (photovoltaic.metrics.averageIncidentPowerMw *
        c.photovoltaic.cycles *
        1000) /
      c.photovoltaic.frequencyHz
    : null;
  const physicalContacts = electrical?.contacts;
  metrics.boundingFootprintMm2 = physicalContacts
    ? ((Math.max(...physicalContacts.map((p) => p.xUm + p.radiusUm)) -
        Math.min(...physicalContacts.map((p) => p.xUm - p.radiusUm))) *
        (Math.max(...physicalContacts.map((p) => p.yUm + p.radiusUm)) -
          Math.min(...physicalContacts.map((p) => p.yUm - p.radiusUm)))) /
      1e6
    : photovoltaic
      ? 4
      : 16;
  report(1, "Experiment complete");
  return {
    config: c,
    experimentId: experimentId(c),
    modelVersion: VERSION,
    scene,
    deviceInput,
    response,
    percept,
    baseline,
    electrical,
    photovoltaic,
    neural,
    cable,
    thermal,
    drive: {
      ganglionMv,
      bipolarMv,
      optical,
      incidentLight: Float64Array.from(cells, (p) => {
        const xy = localPoint(p, c.placement);
        return photovoltaic
          ? sampleRaster(photovoltaic.projection, xy.xUm, xy.yUm, 2000) *
              c.photovoltaic.irradianceMwMm2
          : enabled(c, "optogenetic") &&
              Math.abs(xy.xUm) <= 2000 &&
              Math.abs(xy.yUm) <= 2000
            ? sampleRetinal(scene, p.xUm, p.yUm, c.scene.fieldDeg) *
              c.optical.irradianceMwMm2
            : 0;
      }),
    },
    metrics,
    warnings,
    provenance: {
      coordinates: COORDINATES,
      anatomy: ANATOMY_NOTE,
      neural: neural.note,
      percept: percept.model,
      referenceSha256: reference?.manifest.dataSha256 ?? null,
      retainedSourceCommit: "ea663c2360b315d5a846e6a0aba5cdf254f82ed7",
      thermal: thermal?.model ?? "No optical input",
      createdAt: new Date().toISOString(),
    },
  };
}
