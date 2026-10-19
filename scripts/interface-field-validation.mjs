import { createInterfaceField, INTERFACE_DESIGN } from '../src/lib/cortex/interface-field.js';

// These are numerical refinement checks of one half-space approximation.
// They are not an independent FEM comparison or a finite-shaft validation.
const fields = [4, 6, 8].map(panelDivisions => createInterfaceField({ panelDivisions }));
const points = [];
for (const contact of INTERFACE_DESIGN.contacts)
  for (const y of [10, 25, 100])
    for (const dx of [0, contact.widthUm / 2, contact.widthUm])
      for (const dz of [0, contact.heightUm / 2])
        points.push([contact.centerUm[0] + dx, y, contact.centerUm[2] + dz]);
const samples = fields.map(field => points.map(point => field.sample(point)));
const comparisons = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => {
  let maximumPotentialRelativeDifference = 0, maximumTerminalRelativeDifference = 0;
  samples[a].forEach((value, p) => value.forEach((v, c) => {
    maximumPotentialRelativeDifference = Math.max(maximumPotentialRelativeDifference, Math.abs(v / samples[b][p][c] - 1));
  }));
  fields[a].contactTransferMvPerUa.forEach((v, c) => {
    maximumTerminalRelativeDifference = Math.max(maximumTerminalRelativeDifference, Math.abs(v / fields[b].contactTransferMvPerUa[c] - 1));
  });
  return { coarseDivisions: fields[a].metadata.panelDivisions, fineDivisions: fields[b].metadata.panelDivisions, maximumPotentialRelativeDifference, maximumTerminalRelativeDifference };
});
const report = {
  schema: 'cortex-interface-field-numerics/1',
  model: fields[0].metadata.model,
  design: INTERFACE_DESIGN,
  sampledPointCount: points.length,
  sampleDomain: 'At each contact: y=10,25,100 µm; x offsets 0,width/2,width; z offsets 0,height/2. All 8 contact lead fields.',
  gates: { coarseToFinePotentialRelativeDifference: .03, coarseToFineTerminalRelativeDifference: .04 },
  comparisons,
  balance: fields.map(field => ({ panelDivisions: field.metadata.panelDivisions, panelCount: field.metadata.panelCount, currentBalanceError: field.metadata.currentBalanceError, weakEquipotentialRelativeError: field.metadata.weakEquipotentialRelativeError })),
  passed: comparisons[2].maximumPotentialRelativeDifference < .03 && comparisons[2].maximumTerminalRelativeDifference < .04,
  limitations: fields[0].metadata.limitations,
  independentConductorComparison: 'Not performed for this multi-contact configuration.',
};
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
