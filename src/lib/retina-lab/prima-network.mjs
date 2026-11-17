// Compress the simulated contact-current histories before applying the linear tissue field.
// Each row is expanded using its own coefficients, including signs during recovery.
export function timeResolvedDrive(history, project) {
  const fields = [], weights = history.map(() => []);
  const residuals = history.map(({currentUa}) => currentUa.slice());
  const normSquared = row => row.reduce((sum, v) => sum + v*v, 0);
  const norms = residuals.map(normSquared);
  const peak = Math.sqrt(Math.max(0, ...norms));
  let maxResidual = peak;
  while (maxResidual > peak * 0.0001 && fields.length < 12) {
    // Start with the least well represented time sample, including recovery.
    const pivot = norms.indexOf(Math.max(...norms));
    const direction = Float64Array.from(residuals[pivot], v => v / maxResidual);
    fields.push(project(direction));
    for (let t = 0; t < history.length; t++) {
      const residual = residuals[t];
      let dot = 0, squared = 0;
      for (let i = 0; i < residual.length; i++) dot += residual[i] * direction[i];
      weights[t].push(dot);
      for (let i = 0; i < residual.length; i++) {
        residual[i] -= dot * direction[i];
        squared += residual[i] * residual[i];
      }
      norms[t] = squared;
    }
    maxResidual = Math.sqrt(Math.max(...norms));
  }
  let cursor = 0, last = -1;
  const result = new Float64Array(fields[0]?.length ?? 0);
  return {
    rank: fields.length, relativeResidual: peak ? maxResidual / peak : 0,
    at(t) {
      if (!fields.length || t > history.at(-1).timeMs) return null;
      while (cursor + 1 < history.length && history[cursor + 1].timeMs <= t) cursor++;
      if (last !== cursor) {
        result.fill(0);
        weights[cursor].forEach((weight, j) => {
          for (let i = 0; i < result.length; i++) result[i] += weight * fields[j][i];
        });
        last = cursor;
      }
      return result;
    },
  };
}

// Sample the center of a right-facing C's opening and its opposite semicircle.
export function landoltContrast(image, radiusDeg, fieldDeg, sample) {
  const read = (x, y) => sample(image, x, y, fieldDeg);
  let gap = 0, stroke = 0;
  for (let i = 0; i < 31; i++) {
    const angle = Math.PI * (0.5 + i / 30);
    stroke += read(radiusDeg * Math.cos(angle), radiusDeg * Math.sin(angle));
    gap += read(radiusDeg, radiusDeg * 0.15 * (i / 15 - 1));
  }
  return stroke > 0 ? 1 - gap / stroke : null;
}
