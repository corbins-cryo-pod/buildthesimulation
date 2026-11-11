import {TracePlot} from './Charts.jsx';
const fmt=(n,d=5)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';

export function ApertureStudyTable({study,channel=0}){
 if(study?.kind!=='aperture')return null;
 const rows=study.runs.map((run,index)=>{
  const pair=run.geometry?.channels[channel],cell=run.geometry?.cells.findIndex(c=>c.id===pair?.targetCellId);
  const field=run.field?.diagnostics.find(d=>d.channel===pair?.id),bore=field?.apertures.find(a=>a.wellId===pair?.wellId&&a.direction==='peripheral');
  const outward=bore?.outwardCurrentUaPerUa;
  return {radius:study.values[index],pair,bore,ratio:run.field?.confinement[channel]?.[cell],outward,driveRatio:Number.isFinite(outward)&&Math.abs(outward)>1e-12?1/Math.abs(outward):null};
 });
 return <article class="ax-contact-table">
  <h3>Aperture confinement and escape-current cost</h3>
  <p class="ax-fine">{rows.find(r=>r.pair)?.pair.id??'Selected channel'} · driven well, peripheral aperture. Computed rows use their recalculated physical field; unavailable coefficients are shown as dashes.</p>
  <div class="ax-table-scroll"><table><thead><tr><th>Aperture radius / µm</th><th>Target / largest off-target potential range</th><th>Outward bore current / µA per +1 µA drive</th><th>|Drive| / |outward bore current|</th><th>Bore resistance / kΩ</th></tr></thead><tbody>{rows.map(r=><tr><td>{r.radius}</td><td>{fmt(r.ratio,3)}</td><td>{fmt(r.outward,6)}</td><td>{fmt(r.driveRatio,3)}</td><td>{fmt(r.bore?.measuredBoreResistanceMvPerUa,3)}</td></tr>)}</tbody></table></div>
  <p class="ax-fine">The potential-range ratio describes field confinement, not recruitment. The magnitude ratio is the dimensionless factor required to obtain a chosen outward bore-current magnitude in the stated linear conductor. It is not a host-axon threshold or a recommended operating amplitude. The opposite aperture carries the return path; its magnitude is not added again.</p>
 </article>;
}

export function NoDeviceAudit({result}){
 const comparator=result?.comparators?.noDevice,ledger=result?.identities;
 if(!comparator||!ledger)return null;
 const diagnostic=result.comparators.viableStumpDiagnostic;
 return <article class="ax-comparator">
  <h3>Same resection · matched no-device anatomy</h3>
  <p>The original census stays fixed. Removing the implanted E cells, wells and contacts leaves no excitable population in this declared domain. Original remnant processes are assumed absent in both matched conditions. This is a fixed anatomical comparison; it does not calculate degeneration, spontaneous repair or a clinical postoperative timeline.</p>
  <div class="ax-table-scroll"><table><thead><tr><th>Retained quantity</th><th>Replacement</th><th>No device</th></tr></thead><tbody>
   <tr><td>Original H census</td><td>{ledger.originalCensus}</td><td>{comparator.originalCensus}</td></tr>
   <tr><td>Continuous original identities</td><td>{result.metrics.originalHostPreservedCount}</td><td>{comparator.continuousOriginalCount}</td></tr>
   <tr><td>Introduced E cells</td><td>{ledger.engineered.length}</td><td>{comparator.implantedCellIds.length}</td></tr>
   <tr><td>Physical insulating wells</td><td>{result.geometry.wells.length}</td><td>{comparator.wellIds.length}</td></tr>
   <tr><td>Driven contact pairs per trial</td><td>1 isolated pair</td><td>{comparator.contactIds.length}</td></tr>
   <tr><td>Imposed current magnitude / µA</td><td>{result.settings.amplitudeUa}</td><td>{comparator.implantDriveUa}</td></tr>
   <tr><td>Original-host Y</td><td>0 / {ledger.originalCensus}</td><td>0 / {ledger.originalCensus}</td></tr>
  </tbody></table></div>
  <p class="ax-fine">With no current sources and zero-potential outer boundaries, the no-device field is exactly zero. With no excitable cells in the domain, its neural current is zero. These are analytical zero solutions under the stated anatomy, not uncomputed repair yields.</p>
  <details class="ax-inspection"><summary>Original identity derivation and complete ledger</summary><pre>Y_original = |H_original ∩ continuous ∩ recruited ∩ exclusive ∩ mechanism-dependent| / |H_original|
continuous = empty under the declared complete resection
Y_original = 0 / {ledger.originalCensus}</pre><div class="ax-table-scroll"><table><thead><tr><th>Original identity</th><th>Physical slot</th><th>Continuous after declared resection?</th><th>Reason</th></tr></thead><tbody>{ledger.original.map(h=><tr><td>{h.id}</td><td>{h.slotId}</td><td>{String(h.postoperativeContinuity)}</td><td>{h.continuityCause}</td></tr>)}</tbody></table></div><p class="ax-fine">Introduced E identities remain distinct and carry no original-host identity. The intact native count is a separate preoperative context, not the postoperative no-device comparator.</p></details>
  {diagnostic&&<details class="ax-inspection"><summary>Separate viable-stump diagnostic</summary><p>This additional condition introduces viable disconnected native stumps. It has a different remnant assumption and is not the matched no-device control. Ordered local events cannot bridge the physical gap between its two separate solver graphs.</p><div class="ax-trace-columns">{Object.entries(diagnostic.baselineTraces??{}).map(([arm,tr])=><article><h3>{arm} stump · zero drive</h3><TracePlot times={tr.timeMs} series={tr.voltageMv.map((values,i)=>({label:tr.siteLabels?.[i]??'Site '+(i+1),values,color:i%2?'#b98137':'#436f78'}))}/></article>)}</div><p class="ax-fine">Stump viability is an imposed instantaneous electrical assumption, not a survival or degeneration forecast. The full traces and topology remain in the JSON export.</p></details>}
 </article>;
}

export function ContactTable({result}){
 const rows=result?.geometryDiagnostics?.chargeByContact;if(!rows)return null;
 return <article class="ax-contact-table">
  <h3>Completed experiment · physical contact arithmetic</h3>
  <p class="ax-fine">Retained settings: {result.settings.amplitudeUa} µA per phase, {result.settings.phaseWidthMs} ms per phase. These values belong to the completed mesh and do not change when the input controls are edited.</p>
  <div class="ax-table-scroll"><table><thead><tr><th>Channel</th><th>Contact</th><th>Actual area / µm²</th><th>Charge / nC per phase</th><th>Geometric density / µC cm⁻²</th><th>Shannon k arithmetic</th></tr></thead><tbody>{rows.map(r=><tr><td>{r.channel}</td><td>{r.role}</td><td>{fmt(r.areaUm2)}</td><td>{fmt(r.chargePerPhaseNc)}</td><td>{fmt(r.geometricChargeDensityUcCm2)}</td><td>{fmt(r.shannonK)}</td></tr>)}</tbody></table></div>
  <p class="ax-fine">k = log₁₀(Q / µC) + log₁₀(D / µC cm⁻²). Zero-charge k is undefined and shown as a dash. This arithmetic does not establish tissue safety; electrode polarization, double-layer impedance and reaction kinetics are absent.</p>
 </article>;
}
