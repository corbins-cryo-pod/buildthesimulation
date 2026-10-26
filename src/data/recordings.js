// Deliberate device associations, never inferred from a broad modality match.
const ccby='https://creativecommons.org/licenses/by/4.0/';
const device=(id,slug,label,relationship,note)=>({id,slug,label,relationship,note});
export const recordingDatasets=[
  {
    id:'ibl-neuropixels-voltage',title:'Neuropixels · electrode voltage',signal:'AP & LFP voltage',species:'Mouse',license:'CC BY 4.0',licenseUrl:ccby,
    dataUrl:'/data/recordings/ibl-neuropixels-voltage.json',sourceUrl:'https://registry.opendata.aws/ibl-brain-wide-map/',paperUrl:'https://doi.org/10.1038/s41586-025-09235-0',version:'IBL UUID-pinned source objects',windowSeconds:.05,
    description:'Inspect real AP-band and LFP-band samples from eight adjacent Neuropixels 1.0 channels. Source contact coordinates accompany the calibrated voltage traces.',
    devices:[device('BTSD-0004','04-neuropixels-probe','Neuropixels 1.0','recorded','Recorded with Neuropixels 1.0 (3B2). These acquisition channels have their own mapping; they are not IDs on the illustrative 960-site model.')],
  },
  {
    id:'braingate-longterm',title:'Utah arrays · recording over time',signal:'Longitudinal study measurements',species:'Human',license:'CC0 data / MIT author summaries',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
    dataUrl:'/data/recordings/braingate-longterm.json',sourceUrl:'https://doi.org/10.5061/dryad.x0k6djj1h',version:'2026-09-09 / author CSV 93beb76b',kind:'summary',
    description:'Explore electrode yield, impedance and waveform summary metrics across 20 arrays in 14 BrainGate participants. Each point is a published array-session measurement.',
    devices:[device('BTSD-0001','01-utah-microelectrode-array','Utah microelectrode array','recorded','Recorded from 96-channel Utah arrays in BrainGate studies. The viewer uses author-published session summaries; it does not reconstruct voltage waveforms.')],
  },
  {
    id:'wimagine-reaching',title:'WIMAGINE · reaching activity',signal:'Filtered epidural ECoG',species:'Human',license:'CC BY 4.0',licenseUrl:ccby,
    dataUrl:'/data/recordings/wimagine-reaching.json',sourceUrl:'https://www.nemar.org/dataset/nm000408',paperUrl:'https://doi.org/10.1038/s41467-026-71234-0',version:'NEMAR v1.0.2',windowSeconds:5,
    description:'Explore eight recorded channels during executed and imagined reaching instructions. The released ECoG is filtered to 1–250 Hz; amplitude is shown in source units because physical calibration is not established.',
    devices:[device('BTSD-IMBCI-0004','07-wimagine-cea-clinatec-epidural-wireless-ecog','WIMAGINE','recorded','Recorded with the WIMAGINE implant. Task annotations are instructions, not decoded movements; anatomical labels do not supply contact coordinates.')],
  },
  {
    id:'sparc-cuff',title:'Nerve cuff · ENG & EMG',signal:'Evoked nerve and muscle recordings',species:'Rat',license:'CC BY 4.0',licenseUrl:ccby,
    dataUrl:'/data/recordings/sparc-cuff.json',sourceUrl:'https://discover.pennsieve.io/datasets/430',version:'SPARC 430 v1',windowSeconds:.01,
    description:'Compare single recorded events at three stimulation amplitudes, retaining the stimulus artifact, cuff ENG and muscle EMG. Amplitude units are unresolved in the source metadata and remain source units.',
    devices:[
      device('BTSD-PNI-0001','10-spiral-nerve-cuff-electrode-helical','CWRU / Ardiem spiral cuff','related','Related cuff experiment: a research polymer cuff stimulated the rat sciatic nerve; a separate silicone cuff recorded ENG. This is not a recording from the CWRU / Ardiem device.'),
      device('BTSD-PNI-0003','13-cwru-spiral-cuff-radial-nerve-sensory-amputees','CWRU sensory nerve cuff','related','Related rat sciatic-cuff experiment, not this human sensory-cuff deployment. Recording and stimulating cuffs are distinct.'),
    ],
  },
  {
    id:'mirpni',title:'RPNI · graft & muscle activity',signal:'Filtered intramuscular EMG',species:'Human',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    dataUrl:'/data/recordings/mirpni.json',sourceUrl:'https://zenodo.org/records/23377398',version:'miRPNI v8.0',windowSeconds:2,
    description:'Compare measured graft and residual-muscle signals during three cued phantom-hand gestures. These are the authors’ filtered 1 kHz EMG release, with channel identities retained.',
    devices:[device('BTSD-PNI-0010','19-teeni-rpni','Regenerative peripheral nerve interface','recorded','Human RPNI graft and residual-muscle recordings. These are muscle signals, not direct nerve-axon spikes. Gesture labels are cues, not decoder outputs.')],
  },
  {
    id:'carbon-fiber-vagus',title:'Carbon fibers · vagus nerve',signal:'Intraneural voltage',species:'Rat',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
    dataUrl:'/data/recordings/carbon-fiber-vagus.json',sourceUrl:'https://discover.pennsieve.io/datasets/177',version:'SPARC 177 v1, revision 2',windowSeconds:.02,
    description:'Inspect two short intraneural recordings from four carbon-fiber channels in the rat vagus nerve. Voltage calibration comes from the acquisition channel headers.',
    devices:[device('BTSD-ACAD-0005','26-carbon-fiber-electrode-arrays-michigan','Carbon-fiber electrode arrays','related','The dataset uses Michigan carbon-fiber arrays in the rat vagus nerve. This is a related configuration, distinct from the cortical-array configuration described in this sheet.')],
  },
  {
    id:'retinal-cmos-mea',title:'Retina · ganglion-cell spikes',signal:'Sorted spikes in 10 ms bins',species:'Mouse',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    dataUrl:'/data/recordings/retinal-cmos-mea.json',sourceUrl:'https://doi.gin.g-node.org/10.12751/g-node.0blveb/',paperUrl:'https://doi.org/10.1038/s41598-020-61899-y',version:'G-Node source commit 997bb78e',windowSeconds:2,
    description:'Inspect sorted retinal ganglion-cell activity from wildtype and rd10 mouse preparations during electrical stimulation. Exact accepted spike timestamps accompany the 10 ms counts.',
    devices:[
      device('BTSD-STUP-0004','177-science-prima-subretinal-photovoltaic-implant','Science PRIMA','related','Related retinal physiology measured ex vivo on an hdCMOS-MEA 5000. These are not PRIMA recordings and do not predict PRIMA percepts or clinical outcomes.'),
      device('BTSD-FDA-0016','165-argus-ii-retinal-prosthesis','Argus II','related','Related retinal physiology measured ex vivo on an hdCMOS-MEA 5000. These are not Argus II recordings or measurements of prosthetic visual perception.'),
    ],
  },
];
export const existingRecordingIntegrations=[
 {title:'Utah · attempted handwriting',href:'/devices/01-utah-microelectrode-array/#real-recordings',signal:'10 ms threshold-crossing counts',description:'Three BrainGate T5 excerpts, array/channel selection and a rate raster. Original integer counts are retained; no raw voltage is implied.'},
 {title:'Neuropixels · brain-wide activity',href:'/devices/04-neuropixels-probe/#neuropixels-recordings',signal:'Sorted spikes & stimulus-aligned rates',description:'IBL mouse spikes by estimated depth, trial events and stimulus-aligned firing rates. Preserved alongside the new raw-voltage viewer.'},
 {title:'Utah · handwriting decoder',href:'/devices/01-utah-microelectrode-array/#handwriting-decoder',signal:'Derived decoder output',description:'Existing FALCON H2 demonstration with character scores from measured features. Model predictions remain separate from recorded samples.'},
];
export function recordingsForDevice(id){return recordingDatasets.filter(d=>d.devices.some(device=>device.id===id));}
