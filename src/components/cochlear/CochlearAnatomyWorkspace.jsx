import { useState } from 'preact/hooks';
import AnatomyScene from './AnatomyScene.jsx';
import CochleaScene from './Scene.jsx';
import { IMPLANT_PROFILES, getImplantProfile, getImplantContactMap } from '../../lib/cochlear/implants.js';

const VIEWS = [
  ['cutaway', 'Cochlear cutaway'], ['whole', 'Whole cochlea'],
  ['organ', 'Hair cells & nerves'], ['neuron', 'Auditory neuron'], ['array', 'Implant models'],
  ['unrolled', 'Calculation space'], ['field', 'Contact field'],
];
const LAYERS = [
  ['scalae', 'Fluid chambers'], ['bone', 'Bone & lamina'], ['membranes', 'Membranes'],
  ['hairCells', 'Hair cells'], ['neurons', 'Nerve fibers'], ['implant', 'Electrodes'],
];
const DESCRIPTIONS = {
  cutaway: 'Look inside the cochlear spiral and follow the electrode array toward the apex.',
  whole: 'Explore the measured human cochlear chambers and the nerve leaving the inner ear.',
  organ: 'Inspect the sensory epithelium: inner and outer hair cells, stereocilia, and afferent endings.',
  neuron: 'Inspect the spiral-ganglion soma and its adjoining nerve processes at cellular scale.',
  array: 'Compare the physical construction of five electrode arrays, with dimensions and a millimetre scale bar.',
  unrolled: 'Inspect the coordinates used by the electrical field and active membrane calculations.',
  field: 'Inspect the calculated extracellular potential of a source contact and its return.',
};
const CAPTIONS = {
  cutaway: 'Measured OpenEar ZETA chamber surfaces with reconstructed membranes and sampled neurons. Calculated sources and nerve responses are mapped onto the anatomy for display.',
  whole: 'Human CT and serial-section surfaces preserve the cochlea’s asymmetric, stacked turns. Membranes and cellular detail are reconstructed anatomical context.',
  organ: 'Reconstructed organ of Corti, shown at cellular scale. Hair cells and type-II afferents are anatomical structures; the active cable calculation applies to the selected modeled type-I fiber.',
  neuron: 'A close-up of the selected modeled type-I neuron. Soma and process dimensions come from the cable model; myelin appearance and cellular context are reconstructed. Cropped processes continue beyond the view.',
  array: 'Manufacturer-dimension reference models. Intermediate taper, free-rest curvature, and inserted placement are reconstructed; this view does not show a manufacturer-specific electrical simulation.',
  unrolled: 'Physical calculation coordinates. Electrode projections sit above the nerve plane; compartment diameters are enlarged for visibility.',
  field: 'Uniform-source disk potential in an unbounded homogeneous conductor. The measured cochlear surfaces do not supply boundary conditions to this calculation.',
};
const number = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '—';
const frequency = value => value >= 1000 ? number(value / 1000, 2) + ' kHz' : number(value, 0) + ' Hz';
const size = values => Array.isArray(values) ? values.map(v => number(v, 2)).join(' × ') + ' mm' : 'See reference notes';

export default function CochlearAnatomyWorkspace({
  geometry, model, fibers, settings, result, theme, busy,
  selectedContact, selectedFiber, onContact, onFiber,
  timeMs, playing, durationMs, onTime, onToggleReplay, onUseChannelCount,
}) {
  const [view, setView] = useState('cutaway');
  const [profileId, setProfileId] = useState('cochlear-ci622');
  const [implantPose, setImplantPose] = useState('bench');
  const [implantContact, setImplantContact] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [layers, setLayers] = useState({ bone: false, scalae: true, membranes: true, hairCells: true, neurons: true, implant: true });
  const [copied, setCopied] = useState('');
  const [sceneMeta, setSceneMeta] = useState(null);
  const profile = getImplantProfile(profileId);
  const physicalPad = implantContact === null ? null : getImplantContactMap(profile)[implantContact];
  const anatomical = !['unrolled', 'field'].includes(view);
  const hardware = view === 'array';
  const placement = hardware && implantPose === 'inserted' ? sceneMeta?.placement : null;
  const selected = geometry.contacts[selectedContact];
  const allocation = result?.allocation?.[selectedContact];
  const fiber = fibers?.[selectedFiber];
  const chooseProfile = id => { setProfileId(id); setImplantContact(null); setCopied(''); };
  const copyChannels = () => {
    const applied = onUseChannelCount(profile.channelCount);
    setCopied('Reference experiment updated: ' + profile.channelCount + ' enabled source channels, generic ' + applied.maxima + '-of-' + profile.channelCount + ' selection at ' + applied.frameRateHz + ' Hz. The reference span and position are retained.');
  };
  return <section class="coch-anatomy-workspace" aria-labelledby="coch-anatomy-title">
    <header class="coch-atlas-heading">
      <div><p class="coch-kicker">Anatomy / Implant construction / Neural response</p><h2 id="coch-anatomy-title">Inside the cochlea</h2></div>
      <div class="coch-atlas-provenance"><span class="coch-live-dot" />Human CT + serial-section atlas<a href="/simulations/cochlear-implant/methods/#anatomy">Anatomy &amp; model sources ↗</a></div>
    </header>
    <div class="coch-atlas-viewbar" role="group" aria-label="Model view">
      {VIEWS.map(([id, label], index) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>)}
    </div>
    <div class="coch-atlas-description"><p>{DESCRIPTIONS[view]}</p><span>{hardware ? 'Physical reference model' : ['organ','neuron'].includes(view) ? 'Cellular anatomy' : anatomical ? 'Human anatomy + model overlay' : 'Calculated coordinates'}</span></div>
    {hardware && <div class="coch-implant-selector">
      <label><span class="coch-label">Implant array</span><select aria-label="Implant reference model" value={profileId} onChange={event => chooseProfile(event.currentTarget.value)}>{IMPLANT_PROFILES.map(p => <option key={p.id} value={p.id}>{p.manufacturer} · {p.name}</option>)}</select></label>
      <div class="coch-pose-controls" role="group" aria-label="Implant inspection pose"><button aria-pressed={implantPose === 'inserted'} onClick={() => setImplantPose('inserted')}>Within the cochlea</button><button aria-pressed={implantPose === 'bench'} onClick={() => setImplantPose('bench')}>Array on the bench</button></div>
      <label class="coch-pad-select"><span class="coch-label">Physical contact</span><select aria-label="Inspect physical implant pad" value={implantContact ?? ''} onChange={event => setImplantContact(event.currentTarget.value === '' ? null : Number(event.currentTarget.value))}><option value="">Select a pad</option>{Array.from({ length: profile.padCount }, (_, i) => <option key={i} value={i}>{'Pad ' + (i + 1)}</option>)}</select></label>
    </div>}
    {anatomical && <div class="coch-anatomy-layers" role="group" aria-label="Anatomical layers">
      <span class="coch-label">Layers</span>{LAYERS.filter(([id]) => view === 'neuron' ? id === 'neurons' : view === 'organ' ? ['membranes','hairCells','neurons'].includes(id) : !hardware || implantPose === 'inserted' || id === 'implant').map(([id, label]) => <label key={id}><input type="checkbox" checked={layers[id]} onChange={event => setLayers(old => ({ ...old, [id]: event.currentTarget.checked }))} /><span>{label}</span></label>)}
      <label class="coch-label-switch"><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.currentTarget.checked)} /><span>Labels</span></label>
    </div>}
    <div class={'coch-atlas-model-layout' + (hardware ? ' has-device-details' : '')}>
      <div class={'coch-atlas-viewport' + (anatomical ? ' is-anatomical' : '')}>
        {anatomical ? <AnatomyScene geometry={geometry} model={model} fibers={fibers} timeMs={timeMs} selectedContact={selectedContact} selectedFiber={selectedFiber} onContact={onContact} onFiber={onFiber} theme={theme} anatomyMode={view} layers={layers} showLabels={showLabels} implantProfile={profile} implantPose={implantPose} selectedImplantContact={implantContact} onImplantContact={setImplantContact} onSceneMetadata={setSceneMeta} /> : <CochleaScene geometry={geometry} model={model} fibers={fibers} timeMs={timeMs} selectedContact={selectedContact} selectedFiber={selectedFiber} onContact={onContact} onFiber={onFiber} theme={theme} settings={settings} view={view} />}
      </div>
      {hardware && <aside class="coch-device-detail" aria-label="Implant reference dimensions">
        <p class="coch-kicker">{profile.manufacturer}</p><h3>{profile.name}</h3><p class="coch-device-family">{String(profile.family).replaceAll('-', ' ')}</p>
        <p>{profile.description}</p>
        <dl><div><dt>Stimulation sites</dt><dd>{profile.channelCount}</dd></div><div><dt>Physical pads</dt><dd>{profile.padCount}</dd></div><div><dt>Reported active span</dt><dd>{number(profile.activeSpanMm, 1)} mm</dd></div><div><dt>Distal cross-section</dt><dd>{size(profile.tipSizeMm)}</dd></div><div><dt>Proximal cross-section</dt><dd>{size(profile.baseSizeMm)}</dd></div></dl>
        {placement && <div class="coch-placement-readout" role="status"><span class="coch-label">{placement.partialInsertion ? 'Partial geometric placement' : 'Geometric placement'}</span><strong>{number(placement.achievedInsertionMm, 2)} / {number(placement.requestedInsertionMm, 2)} mm</strong><p>Tip arc distance placed / requested. {placement.outsidePhysicalPadCount ? placement.outsidePhysicalPadCount + ' physical pads remain outside the reference path.' : 'All physical pads lie along the reference path.'} Dimensions are retained; this is not an insertion-mechanics prediction.</p></div>}
        {physicalPad && <p class="coch-pad-readout" role="status">Physical pad {implantContact + 1} of {profile.padCount} · site {physicalPad.siteNumber} · {physicalPad.padsAtSite === 2 ? 'paired site' : 'single pad'}. Sites use apical-first model order, independently of vendor and calculated-source numbering.</p>}
        <button class="coch-copy-channels" onClick={copyChannels} disabled={!!busy}>{'Use ' + profile.channelCount + ' channels in the experiment'}</button>
        <p class="coch-device-copy-note">Enables all source channels and selects a feasible generic eight-maxima processor. It keeps the experiment’s reference geometry.</p>
        {copied && <p class="coch-copy-status" role="status">{copied}</p>}
        <details class="coch-reference-details"><summary>Dimensions, assumptions &amp; sources</summary>{profile.notes?.map((note, i) => <p key={i}>{note}</p>)}<ul>{profile.sources?.map((source, i) => <li key={i}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details>
      </aside>}
    </div>
    <div class="coch-atlas-caption"><p>{CAPTIONS[view]}</p>{!hardware && view !== 'field' && <div class="coch-voltage-legend"><span>Modeled membrane</span><i /><span>−80</span><span>+30 mV</span></div>}</div>
    {view === 'organ' && <div class="coch-cell-guide"><div><span class="coch-cell-swatch inner" /><strong>Inner hair cells</strong><p>One sensory row with flask-shaped cell bodies and apical stereocilia.</p></div><div><span class="coch-cell-swatch outer" /><strong>Outer hair cells</strong><p>Three rows of cylindrical cells with stepped, chevron-shaped hair bundles.</p></div><div><span class="coch-cell-swatch nerve" /><strong>Afferent pathways</strong><p>Radial type-I endings at inner hair cells; type-II fibers spiral beneath outer hair cells.</p></div></div>}
    {!hardware && <>
      <div class="coch-atlas-replay"><button disabled={!result} onClick={onToggleReplay}>{playing ? 'Pause replay' : 'Play replay'}</button><label class="coch-timeline-label">Neural response<input type="range" aria-label="Shared simulation time" min="0" max={durationMs} step=".02" value={timeMs} disabled={!result} onInput={event => onTime(Number(event.currentTarget.value))} /></label><output>{number(timeMs, 2)} ms</output></div>
      <div class="coch-atlas-selection"><label><span class="coch-label">Calculated source contact</span><select aria-label="Inspect contact" value={selectedContact} onChange={event => onContact(Number(event.currentTarget.value))}>{geometry.contacts.map((contact, index) => <option key={index} value={index}>{contact.label}</option>)}</select></label><div><span class="coch-label">Frequency allocation</span><strong>{allocation ? frequency(allocation.lowHz) + '–' + frequency(allocation.highHz) : 'After calculation'}</strong><small>{selected ? 'Reference place: ' + frequency(selected.placeHz) : ''}</small></div><label><span class="coch-label">Modeled auditory nerve fiber</span><select aria-label="Inspect auditory nerve fiber" value={selectedFiber} onChange={event => onFiber(Number(event.currentTarget.value))}>{geometry.fibers.map((item, index) => <option key={index} value={index}>{item.label + ' · ' + number(item.placeMm, 1) + ' mm' + (!item.alive ? ' · removed' : '')}</option>)}</select></label><div><span class="coch-label">Selected response</span><strong>{fiber ? fiber.spikeTimesMs.length + ' spikes' : '65 compartments'}</strong><small>{fiber?.alive === false ? 'Removed from the surviving population' : 'Distal propagated events'}</small></div></div>
    </>}
  </section>;
}
