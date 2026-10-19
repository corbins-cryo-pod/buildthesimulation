/**
 * Joint finite-contact lead fields for the Interface Laboratory.
 *
 * Constant-current rectangular panels, a symmetric Galerkin approximation to
 * the half-space Green operator, and a Schur complement impose equipotential
 * contacts with prescribed TOTAL contact currents. Inactive contacts float
 * with zero net current; their induced panel currents are retained.
 *
 * Coordinates and geometry are in µm. The contact plane is y=0, tissue y>0.
 * Returned coefficients are mV/µA, numerically identical to µV/nA, so the same
 * lead fields project outward transmembrane currents to neural recordings by
 * reciprocity. The point-current approximation for neuronal compartments is
 * separate from the finite electrode surface integration performed here.
 *
 * This model has an INFINITE insulating backing plane and return at infinity.
 * The visible finite shaft, its tip and back face do not shape these fields.
 * No electrode interface impedance, capacitance, noise or tissue anisotropy.
 * This is an exploratory conductor model, not a verified implant prediction.
 */

const CONTACT_SIZES = [[12, 12], [20, 20], [30, 30], [12, 24], [12, 12], [20, 20], [30, 30], [12, 24]];

export const INTERFACE_DESIGN = Object.freeze({
  id: 'cortex-test-shank/1',
  name: 'Interface test shank',
  widthUm: 90,
  thicknessUm: 20,
  lengthUm: 1800,
  taperUm: 300,
  plane: 'y=0',
  tissueSide: '+y',
  description: 'A hypothetical 90 × 20 µm single shank with a 300 µm pointed tip and eight finite surface contacts. Neuropixels-inspired silhouette; dimensions and mixed contact sizes are a test design, not an optimized or manufactured device.',
  contacts: Object.freeze(CONTACT_SIZES.map(([widthUm, heightUm], index) => Object.freeze({
    id: `contact-${index + 1}`, index, label: String(index + 1),
    centerUm: Object.freeze([index % 2 ? 18 : -18, 0, 250 + index * 170]),
    widthUm, heightUm, areaUm2: widthUm * heightUm, shape: 'rectangle',
  }))),
  references: Object.freeze([
    { title: 'Jun et al. 2017 — Fully integrated silicon probes for high-density recording of neural activity', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/', supports: 'Neuropixels single-shank inspiration; the original is 70 × 20 µm with a 10 mm shank, not this test geometry.' },
    { title: 'Steinmetz et al. 2021 — Neuropixels 2.0', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/', supports: 'Slender shank and tapered tip inspiration; this test design does not reproduce the device.' },
    { title: 'COMSOL — Current Distribution, Boundary Elements', url: 'https://doc.comsol.com/6.4/doc/com.comsol.help.corr/corr_ug_electrochem.06.069.html', supports: 'Boundary integral conductor formulation; does not validate this implementation.' },
  ]),
});

const INV_SQRT_3 = 1 / Math.sqrt(3);

function position(point) {
  return Array.isArray(point) || ArrayBuffer.isView(point) ? point : [point?.x, point?.y, point?.z];
}

// Integral primitive for a rectangular, uniform source panel at normal height h.
function primitive(a, b, h) {
  const r = Math.hypot(a, b, h);
  const ah = Math.hypot(a, h), bh = Math.hypot(b, h);
  return (a === 0 ? 0 : a * Math.asinh(b / ah))
    + (b === 0 ? 0 : b * Math.asinh(a / bh))
    - (h === 0 ? 0 : h * Math.atan2(a * b, h * r));
}

// Panel-area average of 1/r, in 1/µm. Far panels use a stable 2×2 Gaussian
// rule; at 32 panel widths its truncation is far below the mesh error.
export function interfacePanelKernel(panel, point) {
  const [x, y, z] = position(point);
  const dx = x - panel.x, dz = z - panel.z, h = Math.abs(y);
  const hx = panel.widthUm / 2, hz = panel.heightUm / 2;
  if (Math.hypot(dx, h, dz) > 32 * Math.max(panel.widthUm, panel.heightUm)) {
    let sum = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      sum += 1 / Math.hypot(dx + sx * hx * INV_SQRT_3, h, dz + sz * hz * INV_SQRT_3);
    return sum / 4;
  }
  const a0 = -hx - dx, a1 = hx - dx, b0 = -hz - dz, b1 = hz - dz;
  return (primitive(a1, b1, h) - primitive(a0, b1, h)
    - primitive(a1, b0, h) + primitive(a0, b0, h)) / (4 * hx * hz);
}

function gaussLegendre(order) {
  const rule = [];
  for (let i = 0; i < order; i++) {
    let x = Math.cos(Math.PI * (i + .75) / (order + .5)), derivative;
    for (let iteration = 0; iteration < 25; iteration++) {
      let p0 = 1, p1 = x;
      for (let j = 2; j <= order; j++) { const p = ((2 * j - 1) * x * p1 - (j - 1) * p0) / j; p0 = p1; p1 = p; }
      derivative = order * (x * p1 - p0) / (x * x - 1);
      const next = x - p1 / derivative;
      if (Math.abs(next - x) < 1e-15) { x = next; break; }
      x = next;
    }
    rule.push([x, 2 / ((1 - x * x) * derivative * derivative)]);
  }
  return rule;
}

function panelAverage(target, source, rule) {
  let value = 0;
  for (const [x, wx] of rule) for (const [z, wz] of rule)
    value += wx * wz * interfacePanelKernel(source, [target.x + x * target.widthUm / 2, 0, target.z + z * target.heightUm / 2]) / 4;
  return value;
}

function cholesky(matrix, n) {
  const result = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let sum = matrix[i * n + j];
    for (let k = 0; k < j; k++) sum -= result[i * n + k] * result[j * n + k];
    if (i === j) {
      if (!(sum > 0) || !Number.isFinite(sum)) throw new Error('Finite-contact Green matrix is not positive definite.');
      result[i * n + j] = Math.sqrt(sum);
    } else result[i * n + j] = sum / result[j * n + j];
  }
  return result;
}

function solveCholesky(lower, rhs, n) {
  const x = Float64Array.from(rhs);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) x[i] -= lower[i * n + j] * x[j];
    x[i] /= lower[i * n + i];
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) x[i] -= lower[j * n + i] * x[j];
    x[i] /= lower[i * n + i];
  }
  return x;
}

function makePanels(contacts, divisions) {
  const panels = [];
  for (const contact of contacts) {
    const nx = divisions, nz = Math.max(2, Math.round(divisions * contact.heightUm / contact.widthUm));
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) panels.push({
      contactIndex: contact.index,
      x: contact.centerUm[0] + ((ix + .5) / nx - .5) * contact.widthUm,
      z: contact.centerUm[2] + ((iz + .5) / nz - .5) * contact.heightUm,
      widthUm: contact.widthUm / nx, heightUm: contact.heightUm / nz,
    });
  }
  return panels;
}

/** Build all current-driven contact bases jointly; defaults take <1 s in Node. */
export function createInterfaceField({ panelDivisions = 4, conductivitySm = .3, minimumHeightUm = 10 } = {}) {
  if (!Number.isInteger(panelDivisions) || panelDivisions < 2 || panelDivisions > 12) throw new Error('panelDivisions must be an integer from 2 through 12.');
  if (!(conductivitySm > 0) || !Number.isFinite(conductivitySm)) throw new Error('Conductivity must be finite and positive.');
  if (!(minimumHeightUm >= 10) || !Number.isFinite(minimumHeightUm)) throw new Error('Sampling height must be at least 10 µm.');
  const contacts = INTERFACE_DESIGN.contacts, nc = contacts.length;
  const panels = makePanels(contacts, panelDivisions), n = panels.length;
  const matrix = new Float64Array(n * n), lowRule = [[-INV_SQRT_3, 1], [INV_SQRT_3, 1]], selfRule = gaussLegendre(16);
  const selfValues = new Map();
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let value;
    if (i === j) {
      const key = `${panels[i].widthUm},${panels[i].heightUm}`;
      if (!selfValues.has(key)) selfValues.set(key, panelAverage(panels[i], panels[i], selfRule));
      value = selfValues.get(key);
    } else value = (panelAverage(panels[i], panels[j], lowRule) + panelAverage(panels[j], panels[i], lowRule)) / 2;
    matrix[i * n + j] = matrix[j * n + i] = value;
  }
  const lower = cholesky(matrix, n);
  // M Q = C U, Cᵀ Q = I. H = M⁻¹ C, U = (CᵀH)⁻¹ I.
  const h = [];
  for (let c = 0; c < nc; c++) h.push(solveCholesky(lower, panels.map(panel => panel.contactIndex === c ? 1 : 0), n));
  const admittance = new Float64Array(nc * nc);
  for (let c = 0; c < nc; c++) for (let p = 0; p < n; p++) admittance[panels[p].contactIndex * nc + c] += h[c][p];
  // Remove roundoff asymmetry before the small Schur-complement factorization.
  for (let i = 0; i < nc; i++) for (let j = 0; j < i; j++) admittance[i * nc + j] = admittance[j * nc + i] = (admittance[i * nc + j] + admittance[j * nc + i]) / 2;
  const smallLower = cholesky(admittance, nc), scale = 1000 / (2 * Math.PI * conductivitySm);
  const panelBasis = new Float64Array(n * nc), contactTransferMvPerUa = new Float64Array(nc * nc);
  for (let c = 0; c < nc; c++) {
    const rhs = new Float64Array(nc); rhs[c] = 1;
    const voltage = solveCholesky(smallLower, rhs, nc);
    for (let a = 0; a < nc; a++) contactTransferMvPerUa[a * nc + c] = voltage[a] * scale;
    for (let p = 0; p < n; p++) for (let a = 0; a < nc; a++) panelBasis[p * nc + c] += h[a][p] * voltage[a];
  }
  let currentBalanceError = 0, weakEquipotentialRelativeError = 0;
  for (let c = 0; c < nc; c++) {
    const sums = new Float64Array(nc);
    for (let p = 0; p < n; p++) {
      sums[panels[p].contactIndex] += panelBasis[p * nc + c];
      let voltage = 0;
      for (let j = 0; j < n; j++) voltage += matrix[p * n + j] * panelBasis[j * nc + c] * scale;
      const expected = contactTransferMvPerUa[panels[p].contactIndex * nc + c];
      weakEquipotentialRelativeError = Math.max(weakEquipotentialRelativeError, Math.abs(voltage - expected) / contactTransferMvPerUa[c * nc + c]);
    }
    for (let a = 0; a < nc; a++) currentBalanceError = Math.max(currentBalanceError, Math.abs(sums[a] - (a === c ? 1 : 0)));
  }
  const metadata = {
    model: 'cortex-joint-planar-contacts/1', designId: INTERFACE_DESIGN.id,
    method: 'Symmetric constant-panel Galerkin approximation; exact rectangular source integration, 2×2 target quadrature (16×16 for self panels), contact-current Schur complement.',
    status: 'exploratory', conductivitySm, panelDivisions, panelCount: n,
    minimumHeightUm, potentialCoefficientUnit: 'mV/µA = µV/nA',
    contactPlane: 'y=0', tissueHalfSpace: 'y>0', return: 'infinity',
    currentBalanceError, weakEquipotentialRelativeError,
    limitations: [
      'The visible finite shaft is approximated electrically by an infinite insulating backing plane. No fields around its sides, back or tip are represented.',
      'Floating inactive contacts have zero net current but may carry nonzero induced local panel currents.',
      'Homogeneous isotropic resistive tissue; ideal conducting contact surfaces; no interface impedance, capacitance, noise or amplifier model.',
      'No neural sample is accepted below 10 µm from the backing plane. Edge and surface fields are not reported.',
      'Neural recording uses point transmembrane-current sources at compartment centers and the reciprocal finite-contact lead fields.',
      'Numerical consistency and mesh checks do not establish real implant accuracy, tissue safety or biological selectivity.',
    ],
  };
  function supportsPoint(point, radiusUm = 0) {
    const p = position(point);
    return p.length === 3 && p.every(Number.isFinite) && Number.isFinite(radiusUm) && radiusUm >= 0 && p[1] - radiusUm >= minimumHeightUm;
  }
  function sample(point) {
    if (!supportsPoint(point)) return null;
    const result = new Float64Array(nc);
    for (let p = 0; p < n; p++) {
      const kernel = interfacePanelKernel(panels[p], point) * scale;
      for (let c = 0; c < nc; c++) result[c] += kernel * panelBasis[p * nc + c];
    }
    return result;
  }
  function prepare(points) {
    const coefficients = new Float64Array(points.length * nc), issues = [];
    for (let i = 0; i < points.length; i++) {
      const value = sample(points[i]);
      if (value) coefficients.set(value, i * nc);
      else { coefficients.fill(NaN, i * nc, (i + 1) * nc); issues.push({ index: i, reason: `Point must be finite and at least ${minimumHeightUm} µm into tissue (y>0).` }); }
    }
    return { coefficients, supported: issues.length === 0, issues, contactCount: nc, pointCount: points.length };
  }
  return { design: INTERFACE_DESIGN, contacts, panels, panelBasis, contactTransferMvPerUa, metadata, supportsPoint, sample, prepare };
}
