export const MODEL_VERSION = 'cortical-stimulation-1.0.0';

// Equivalent circuit examples, not measured properties of a particular implant.
export const MATERIALS = {
  ptir: { name: 'Platinum–iridium', capacitance: 30, resistance: 100, note: '30 µF/cm² and 100 Ω·cm²: illustrative values within reported PtIr DBS interface ranges; not a microelectrode calibration.' },
  irox: { name: 'Iridium oxide', capacitance: 2000, resistance: 1000, note: 'Illustrative high-capacitance equivalent circuit. Coating, bias, fabrication and pulse history must be measured for a real electrode.' },
  tin: { name: 'Titanium nitride', capacitance: 1000, resistance: 500, note: 'Illustrative porous-coating equivalent circuit; these scalar values are sensitivity assumptions, not measured TiN constants.' },
  custom: { name: 'Custom interface', capacitance: 100, resistance: 100, note: 'Set effective capacitance and charge-transfer resistance from your own measurements.' },
};

export function electrode(id = 'E1', extra = {}) {
  return { id, x: 0, y: 0, z: 650, shape: 'disk', diameter: 40, width: 40, height: 80, innerRatio: .55, tilt: 90, weight: -1, material: 'irox', capacitance: 2000, resistance: 1000, ...extra };
}

export const DEFAULT_CONFIG = {
  version: MODEL_VERSION, seed: 7241, width: 600, depth: 600, top: 350,
  density: 99587, somaDiameter: 14, somaCV: .18, inhibitoryFraction: .13,
  conductivity: .276, anisotropy: 1, axonDiameter: .8, axonLength: 240, orientation: 'radial',
  axialResistivity: 150, sodiumScale: 1, sampleCount: 512, segmentLength: 20,
  amplitude: 10, phaseWidth: 200, gap: 50, recoveryRatio: 1, pulses: 1, frequency: 100,
  compliance: 10, interfaceEnabled: true, dt: .005, quadrature: 144,
  electrodes: [electrode()],
};

export const PRESETS = [
  { id: 'single', name: 'Single contact', description: 'A finite disk with a remote return. Inspect the first excited branch and the somatic response.' },
  { id: 'bipolar', name: 'Local return', description: 'A cathode and nearby anode. Compare field confinement with recruitment at both polarities.' },
  { id: 'steer', name: 'Current steering', description: 'Share cathodic current between two contacts with a distant return. Move the share slider, then rerun.' },
  { id: 'surround', name: 'Surround return', description: 'Four local returns share the central cathode’s current. Compare the same total cathodic drive.' },
];

export function presetConfig(id, previous = DEFAULT_CONFIG, spacing = 150) {
  const base = normalizeConfig(previous), z = base.top + base.depth / 2;
  const e = (id, values) => electrode(id, { z, ...values });
  if (id === 'bipolar') base.electrodes = [e('E1', { x: -spacing / 2 }), e('E2', { x: spacing / 2, weight: 1 })];
  else if (id === 'steer') base.electrodes = [e('E1', { x: -spacing / 2, weight: -.5 }), e('E2', { x: spacing / 2, weight: -.5 })];
  else if (id === 'surround') base.electrodes = [e('E1', {}), ...[[spacing, 0], [-spacing, 0], [0, spacing], [0, -spacing]].map(([x, y], i) => e(`E${i + 2}`, { x, y, weight: .25 }))];
  else base.electrodes = [e('E1', {})];
  return base;
}

export function normalizeConfig(input = {}) {
  const c = { ...DEFAULT_CONFIG, ...input };
  const bounds = {
    seed: [1, 2147483647], width: [300, 800], depth: [300, 600], top: [281, 403],
    density: [20000, 180000], somaDiameter: [8, 22], somaCV: [0, .3], inhibitoryFraction: [0, .5],
    conductivity: [.1, .6], anisotropy: [.5, 3], axonDiameter: [.4, 2], axonLength: [100, 400],
    axialResistivity: [70, 250], sodiumScale: [.5, 2], sampleCount: [64, 2048], segmentLength: [10, 30],
    amplitude: [0, 100], phaseWidth: [50, 1000], gap: [0, 500], recoveryRatio: [1, 5], pulses: [1, 4], frequency: [50, 200],
    compliance: [1, 30], dt: [.001, .01], quadrature: [64, 400],
  };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const n = Number(c[key]); c[key] = Math.max(min, Math.min(max, Number.isFinite(n) ? n : DEFAULT_CONFIG[key]));
  }
  for (const key of ['seed', 'sampleCount', 'pulses', 'quadrature']) c[key] = Math.round(c[key]);
  c.dt = c.phaseWidth <= 50 ? Math.min(c.dt, .001) : c.dt;
  c.frequency = Math.min(c.frequency, 1000 / (c.phaseWidth / 1000 * (1 + c.recoveryRatio) + c.gap / 1000 + c.dt));
  c.orientation = c.orientation === 'random' ? 'random' : 'radial';
  c.interfaceEnabled = c.interfaceEnabled !== false;
  const list = Array.isArray(input.electrodes) && input.electrodes.length ? input.electrodes.slice(0, 6) : DEFAULT_CONFIG.electrodes;
  c.electrodes = list.map((raw, i) => {
    const e = electrode(`E${i + 1}`, raw); e.id = `E${i + 1}`;
    for (const [key, lo, hi] of [['x', -500, 500], ['y', -500, 500], ['z', 100, 1200], ['diameter', 10, 200], ['width', 10, 200], ['height', 10, 300], ['innerRatio', .1, .9], ['tilt', 0, 180], ['weight', -2, 2], ['capacitance', 5, 20000], ['resistance', 10, 10000]]) {
      const value = Number(e[key]); e[key] = Math.max(lo, Math.min(hi, Number.isFinite(value) ? value : electrode()[key]));
    }
    if (!['disk', 'rectangle', 'ring', 'sphere'].includes(e.shape)) e.shape = 'disk';
    if (!MATERIALS[e.material]) e.material = 'custom';
    return e;
  });
  c.version = MODEL_VERSION;
  return c;
}

export function simulationDuration(c) { return 12 + (c.pulses - 1) * 1000 / c.frequency + c.phaseWidth / 1000 * (1 + c.recoveryRatio) + c.gap / 1000; }
// Positive scalar first phase; negative electrode weights are cathodes.
export function pulseAt(timeMs, c) {
  const elapsed = timeMs - 1;
  if (elapsed < 0) return 0;
  const period = 1000 / c.frequency, index = Math.floor(elapsed / period);
  if (index >= c.pulses) return 0;
  const t = elapsed - index * period, width = c.phaseWidth / 1000, gap = c.gap / 1000;
  if (t < width - 1e-10) return 1;
  if (t >= width + gap - 1e-10 && t < width * (1 + c.recoveryRatio) + gap - 1e-10) return -1 / c.recoveryRatio;
  return 0;
}
