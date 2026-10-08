// Full-space Green function for a homogeneous diagonal conductivity tensor.
// Geometry is µm, currents µA, returned potential mV and field V/m.
export const conductivityTensor = c => [c.conductivity, c.conductivity, c.conductivity * c.anisotropy];
function sourceArea(e) {
  if (e.shape === 'rectangle') return e.width * e.height;
  const a = Math.PI * (e.diameter / 2) ** 2;
  return e.shape === 'sphere' ? 4 * a : e.shape === 'ring' ? a * (1 - e.innerRatio ** 2) : a;
}

// Flat contacts are immersed sheets with both faces exposed and an insulated rim.
// The field uses their projected source area; the circuit uses both exposed faces.
export function contactArea(e) { return sourceArea(e) * (e.shape === 'sphere' ? 1 : 2); }

export function contactNodes(e, count = 144) {
  const nodes = [], r = e.diameter / 2, t = e.tilt * Math.PI / 180;
  const n = Math.max(8, Math.round(count)), golden = Math.PI * (3 - Math.sqrt(5));
  if (e.shape === 'rectangle') {
    const nx = Math.max(2, Math.round(Math.sqrt(n * e.width / e.height))), ny = Math.max(2, Math.round(n / nx));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const u = e.width * ((i + .5) / nx - .5), v = e.height * ((j + .5) / ny - .5);
      nodes.push([e.x + u * Math.cos(t), e.y + v, e.z - u * Math.sin(t)]);
    }
  } else for (let i = 0; i < n; i++) {
    const angle = i * golden;
    if (e.shape === 'sphere') {
      const z = 1 - 2 * (i + .5) / n, a = r * Math.sqrt(1 - z * z);
      nodes.push([e.x + a * Math.cos(angle), e.y + a * Math.sin(angle), e.z + r * z]);
    } else {
      const inner = e.shape === 'ring' ? e.innerRatio ** 2 : 0;
      const radius = r * Math.sqrt(inner + (1 - inner) * (i + .5) / n);
      const u = radius * Math.cos(angle), v = radius * Math.sin(angle);
      nodes.push([e.x + u * Math.cos(t), e.y + v, e.z - u * Math.sin(t)]);
    }
  }
  // Equivalent-area patch core has the exact central mean 1/r of a disk patch.
  // It regularizes quadrature, not electrode-neuron distance or an activation radius.
  return { electrode: e, nodes, core: Math.sqrt(sourceArea(e) / nodes.length / Math.PI) / 2 };
}

export function pointPotential(point, source, current, sigma = [.276, .276, .276]) {
  const d = point.map((v, k) => v - source[k]);
  const metric = Math.sqrt(d.reduce((s, v, k) => s + v * v / sigma[k], 0));
  return current * 1000 / (4 * Math.PI * Math.sqrt(sigma[0] * sigma[1] * sigma[2]) * metric);
}

export function contactField(point, contact, sigma, withField = false) {
  const inv = sigma.map(s => 1 / s), factor = 1000 / (4 * Math.PI * Math.sqrt(sigma[0] * sigma[1] * sigma[2]) * contact.nodes.length);
  const core2 = contact.core ** 2 * (inv[0] + inv[1] + inv[2]) / 3;
  let potential = 0, ex = 0, ey = 0, ez = 0;
  for (const node of contact.nodes) {
    const x = point[0] - node[0], y = point[1] - node[1], z = point[2] - node[2];
    const d2 = x * x * inv[0] + y * y * inv[1] + z * z * inv[2] + core2, r = Math.sqrt(d2);
    potential += 1 / r;
    if (withField) { const k = 1 / (d2 * r); ex += x * inv[0] * k; ey += y * inv[1] * k; ez += z * inv[2] * k; }
  }
  return withField ? { potential: potential * factor, field: [ex * factor * 1000, ey * factor * 1000, ez * factor * 1000] } : potential * factor;
}

export function fieldAt(point, contacts, currents, sigma) {
  const field = [0, 0, 0]; let potential = 0;
  contacts.forEach((contact, i) => { const v = contactField(point, contact, sigma, true); potential += currents[i] * v.potential; v.field.forEach((x, j) => { field[j] += currents[i] * x; }); });
  return { potential, field, magnitude: Math.hypot(...field) };
}

export function accessMatrix(contacts, sigma) {
  // Area-averaged full-space tissue voltages, in Ω. Same kernel as the field.
  return contacts.map(a => contacts.map(b => a.nodes.reduce((s, node) => s + contactField(node, b, sigma), 0) / a.nodes.length * 1000));
}

export function distanceToContact(point, e) {
  const x = point[0] - e.x, y = point[1] - e.y, z = point[2] - e.z, t = e.tilt * Math.PI / 180;
  if (e.shape === 'sphere') return Math.max(0, Math.hypot(x, y, z) - e.diameter / 2);
  const u = x * Math.cos(t) - z * Math.sin(t), w = x * Math.sin(t) + z * Math.cos(t);
  if (e.shape === 'rectangle') return Math.hypot(Math.max(0, Math.abs(u) - e.width / 2), Math.max(0, Math.abs(y) - e.height / 2), w);
  const radius = Math.hypot(u, y), outer = e.diameter / 2, inner = e.shape === 'ring' ? outer * e.innerRatio : 0;
  return Math.hypot(Math.max(inner - radius, radius - outer, 0), w);
}

export function interfaceStep(polarization, requested, contacts, matrix, dtMs, compliance, enabled = true) {
  const n = contacts.length, decay = [], slope = [], offset = []; let scale = 1;
  for (let i = 0; i < n; i++) {
    const e = contacts[i].electrode, areaCm2 = contactArea(e) * 1e-8;
    const capacitance = e.capacitance * 1e-6 * areaCm2, resistance = e.resistance / areaCm2;
    const a = Math.exp(-dtMs * .001 / (resistance * capacitance)); decay.push(a);
    offset[i] = enabled ? polarization[i] * a : 0;
    const access = requested.reduce((s, current, j) => s + matrix[i][j] * current * 1e-6, 0);
    slope[i] = access + (enabled ? requested[i] * 1e-6 * resistance * (1 - a) : 0);
    // Under a constant step current, polarization is monotonic. Check both
    // endpoints so polarity reversals cannot hide an initial voltage overshoot.
    if (enabled) for (const [base, gain] of [[polarization[i], access], [offset[i], slope[i]]]) {
      if (gain > 0) scale = Math.min(scale, (compliance - base) / gain);
      if (gain < 0) scale = Math.min(scale, (-compliance - base) / gain);
    }
  }
  scale = Math.max(0, Math.min(1, scale));
  const delivered = requested.map(i => i * scale), terminal = [], initialTerminal = [];
  for (let i = 0; i < n; i++) {
    const e = contacts[i].electrode, resistance = e.resistance / (contactArea(e) * 1e-8);
    const access = delivered.reduce((s, current, j) => s + matrix[i][j] * current * 1e-6, 0);
    initialTerminal[i] = access + (enabled ? polarization[i] : 0);
    polarization[i] = enabled ? offset[i] + delivered[i] * 1e-6 * resistance * (1 - decay[i]) : 0;
    terminal[i] = access + polarization[i];
  }
  return { delivered, terminal, initialTerminal, scale };
}
