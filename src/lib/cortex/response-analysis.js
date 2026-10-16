// Describe evidence already retained by the solver. This does not change the
// internal crossing detector or infer regenerative activity from voltage alone.
export function analyzeActiveResponse(result, world) {
  if (!result?.firstCrossingByCompartment || !world?.neuron?.nodes) return null;
  const nodes = world.neuron.nodes;
  const count = result.diagnostics?.compartments ?? nodes.length;
  const somaIndex = result.somaIndex ?? world.neuron.somaIndex;
  const thresholdMv = result.spikeDetection?.thresholdMv ?? -25;
  const times = result.timeMs;
  const voltage = result.membraneMv;
  const membraneIndices = nodes.flatMap((node, i) => node.areaUm2 > 0 ? [i] : []);
  const crossings = membraneIndices
    .filter((i) => Number.isFinite(result.firstCrossingByCompartment[i]))
    .map((i) => ({
      compartmentId: nodes[i].id,
      kind: nodes[i].kind,
      timeMs: result.firstCrossingByCompartment[i],
    }))
    .sort((a, b) => a.timeMs - b.timeMs);

  let maxAbsChangeMv = 0;
  let maxDepolarizationMv = 0;
  let maxHyperpolarizationMv = 0;
  for (let frame = 0; frame < times.length; frame++) {
    for (const i of membraneIndices) {
      const changeMv = voltage[frame * count + i] - voltage[i];
      if (!Number.isFinite(changeMv)) continue;
      maxAbsChangeMv = Math.max(maxAbsChangeMv, Math.abs(changeMv));
      maxDepolarizationMv = Math.max(maxDepolarizationMv, changeMv);
      maxHyperpolarizationMv = Math.min(maxHyperpolarizationMv, changeMv);
    }
  }

  const events = (result.spikes ?? []).map((event, eventIndex, all) => {
    const nextTimeMs = all[eventIndex + 1]?.timeMs ?? Infinity;
    let peakFrame = -1;
    let peakMv = -Infinity;
    let sampleCount = 0;
    for (let frame = 0; frame < times.length; frame++) {
      if (times[frame] < event.timeMs || times[frame] >= nextTimeMs) continue;
      const valueMv = voltage[frame * count + somaIndex];
      if (!Number.isFinite(valueMv)) continue;
      sampleCount++;
      if (valueMv > peakMv) {
        peakMv = valueMv;
        peakFrame = frame;
      }
    }
    let returnBelowThresholdTimeMs = null;
    for (let frame = peakFrame + 1; peakFrame >= 0 && frame < times.length; frame++) {
      if (times[frame] >= nextTimeMs) break;
      if (voltage[frame * count + somaIndex] < thresholdMv) {
        returnBelowThresholdTimeMs = times[frame];
        break;
      }
    }
    return {
      timeMs: event.timeMs,
      sampleCount,
      sampledPeakMv: peakFrame < 0 ? null : peakMv,
      sampledPeakTimeMs: peakFrame < 0 ? null : times[peakFrame],
      positivePeakObserved: peakFrame >= 0 && peakMv > 0,
      returnBelowThresholdTimeMs,
      overshootAndReturnObserved: peakFrame >= 0 && peakMv > 0 && returnBelowThresholdTimeMs !== null,
    };
  });
  const firstSomaCrossingTimeMs = Number.isFinite(result.firstCrossingByCompartment[somaIndex])
    ? result.firstCrossingByCompartment[somaIndex] : null;
  let maxOutputIntervalMs = 0;
  for (let frame = 1; frame < times.length; frame++) {
    maxOutputIntervalMs = Math.max(maxOutputIntervalMs, times[frame] - times[frame - 1]);
  }
  return {
    schemaVersion: 'cortex-response-analysis/1',
    polarization: {
      reference: 'Each membrane compartment at retained frame 0, after conditioning; excludes zero-area junctions.',
      sampling: 'Saved output frames only; extrema between frames may be missed.',
      maxAbsChangeMv,
      maxDepolarizationMv,
      maxHyperpolarizationMv,
    },
    membraneThresholdCrossings: {
      thresholdMv,
      compartmentCount: crossings.length,
      first: crossings[0] ?? null,
      convention: 'First upward crossing per positive-area membrane compartment, detected at internal solver steps. A local crossing does not establish a somatic action potential.',
    },
    soma: {
      thresholdEventCount: events.length,
      firstCrossingTimeMs: firstSomaCrossingTimeMs,
      waveformEvidenceCount: events.filter((event) => event.overshootAndReturnObserved).length,
      events,
      convention: 'Threshold events retain the internal detector and its refractory interval. Waveform evidence is a sampled positive-voltage peak followed by a return below the detection threshold before the next event or recording end; descriptive AP-like evidence, not confirmation of a regenerative action potential.',
      sampling: 'Saved traces can miss peaks and recovery, especially with coarse output or a short recording. Absence of waveform evidence does not disprove an action potential.',
      maxOutputIntervalMs,
    },
    propagation: {
      status: 'not-established',
      firstCrossingToSomaDelayMs: crossings.length && firstSomaCrossingTimeMs !== null
        ? firstSomaCrossingTimeMs - crossings[0].timeMs : null,
      convention: 'This is a descriptive delay from the earliest membrane threshold crossing to the first soma crossing. Crossing order alone cannot establish an initiation site or propagation; distributed extracellular forcing can polarize multiple compartments directly.',
    },
  };
}
