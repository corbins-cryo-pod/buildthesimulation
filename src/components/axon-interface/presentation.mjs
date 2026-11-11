/** Display indices always refer to retained compartment identities. */
export function centralCompartment(result) {
  const m = result?.morphology;
  if (!m) return null;
  return m.somaIndex ?? m.nodeIndices?.[Math.floor(m.nodeIndices.length / 2)] ?? null;
}

export function centralTraceIndex(result, trace) {
  if (!trace) return -1;
  return trace.indices.indexOf(centralCompartment(result));
}

export function centralValues(result, trace) {
  return trace?.voltageMv[centralTraceIndex(result, trace)] ?? [];
}

export function siteLabel(trace, index) {
  if (trace.siteLabels?.[index]) return trace.siteLabels[index].replaceAll('_', ' ');
  const ordinal = trace.nodeOrdinals?.[index];
  return ordinal == null ? `Compartment ${trace.indices[index]}` : `Node ${ordinal + 1}`;
}

export function isBipolar(settings) {
  return settings?.mode === 'b3-fixed-topology';
}
