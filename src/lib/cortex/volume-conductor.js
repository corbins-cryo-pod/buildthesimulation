const K = 1 / (4 * Math.PI);
const positive = (sigma) => {
  if (!(sigma > 0) || !Number.isFinite(sigma))
    throw new Error('Conductivity must be finite and positive.');
};
export const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
export function segmentDistance(point, a, b) {
  const d = b.map((x, i) => x - a[i]),
    length2 = d.reduce((s, x) => s + x * x, 0);
  const u = length2
    ? Math.max(0, Math.min(1, d.reduce((s, x, i) => s + x * (point[i] - a[i]), 0) / length2))
    : 0;
  return distance(
    point,
    a.map((x, i) => x + u * d[i]),
  );
}
// Transfer coefficient µV/nA: 1 nA / (1 µm) = 1e-3 A/m = 1000 µV S/m.
export function pointTransferUvPerNa(pointUm, sourceUm, sigma) {
  positive(sigma);
  const r = distance(pointUm, sourceUm);
  if (r <= 1e-9) throw new Error('Point-source potential is undefined at its source.');
  return (1000 * K) / (sigma * r);
}
export function lineTransferUvPerNa(point, start, end, sigma) {
  positive(sigma);
  const length = distance(start, end);
  if (length < 1e-9) return pointTransferUvPerNa(point, start, sigma);
  if (segmentDistance(point, start, end) < 1e-9)
    throw new Error('Line-source potential is undefined on its source.');
  const d = end.map((x, i) => (x - start[i]) / length),
    p = point.map((x, i) => x - start[i]);
  const projection = p.reduce((s, x, i) => s + x * d[i], 0),
    radial2 = p.reduce((s, x) => s + x * x, 0) - projection ** 2;
  const radial = Math.sqrt(Math.max(0, radial2));
  // Collinear points outside a segment have a finite logarithmic limit.
  const integral =
    radial < 1e-7
      ? Math.abs(Math.log(Math.abs(projection / (projection - length))))
      : Math.asinh(projection / radial) - Math.asinh((projection - length) / radial);
  return (1000 * K * integral) / (sigma * length);
}
// Input nA, output mV and V/m. Full-space, isotropic, real-valued conductor.
export function pointField(point, source, currentNa, sigma) {
  const voltageMv = (pointTransferUvPerNa(point, source, sigma) * currentNa) / 1000;
  const d = point.map((x, i) => x - source[i]),
    r2 = d.reduce((s, x) => s + x * x, 0);
  return { voltageMv, fieldVPerM: d.map((x) => (voltageMv * 1000 * x) / r2) };
}
export function membraneDistanceUm(point, node) {
  return node.pathUm?.length > 1
          ? Math.min(
              ...node.pathUm
                .slice(1)
                .map(
                  (p, j) =>
                    segmentDistance(point, node.pathUm[j], p) -
                    Math.max(node.pathDiameterUm[j], node.pathDiameterUm[j + 1]) / 2,
                ),
            )
          : node.kind === 'soma'
            ? distance(point, node.centerUm) - node.diameterUm / 2
            : segmentDistance(point, node.startUm, node.endUm) - node.diameterUm / 2;
}

export function leadField(nodes, contacts, sigma, approximation = 'line', exclusionUm = 25) {
  return contacts.map((contact) =>
    Float64Array.from(nodes, (node) => {
      if (node.kind === 'junction') return 0;
      const separation = membraneDistanceUm(contact.positionUm, node);
      if (separation < exclusionUm)
        throw new Error(
          `${contact.id} is within ${exclusionUm} µm of the modeled membrane. Move the implant; near-contact physics is not supported.`,
        );
      return node.kind === 'soma' || approximation === 'point'
        ? pointTransferUvPerNa(contact.positionUm, node.centerUm, sigma)
        : lineTransferUvPerNa(contact.positionUm, node.startUm, node.endUm, sigma);
    }),
  );
}
