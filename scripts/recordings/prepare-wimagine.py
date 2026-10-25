#!/usr/bin/env python3
"""Create a bounded measured WIMAGINE excerpt. Requires Python + numpy.
Usage: python prepare-wimagine.py [working_directory]
Downloads source files only if missing; validates the published SHA-256.
The output deliberately uses 'source units': NEMAR says its µV unit is assumed.
"""
import csv, hashlib, io, json, sys, urllib.request
from pathlib import Path
import numpy as np

OUT = Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://data.nemar.org/nm000408/v1.0.2/'
STEM = 'sub-01/ses-001/ieeg/sub-01_ses-001_task-mappingre_run-01_desc-bandpass1to250'
BINARY_HASH = '0e275ee68702ff071a9f29a78c96764fd9ca4abde314bac72c7757e6fbba6784'

def fetch(path):
    dest=OUT/Path(path).name
    if not dest.exists():
        with urllib.request.urlopen(BASE+path, timeout=90) as r: dest.write_bytes(r.read())
    return dest

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

files={suffix:fetch(STEM+suffix) for suffix in ['_channels.tsv','_events.tsv','_ieeg.eeg','_ieeg.vhdr','_ieeg.json']}
readme=fetch('README.md')
electrodes=fetch('sub-01/ses-001/ieeg/sub-01_ses-001_space-Other_electrodes.tsv')
assert digest(files['_ieeg.eeg'])==BINARY_HASH, 'Published source SHA-256 mismatch'
meta=json.loads(files['_ieeg.json'].read_text())
fs=meta['SamplingFrequency']
assert abs(fs-1e6/1709)<1e-8
channels=list(csv.DictReader(io.StringIO(files['_channels.tsv'].read_text()),delimiter='\t'))
regions={r['name']:r['anat_label'] for r in csv.DictReader(io.StringIO(electrodes.read_text()),delimiter='\t')}
data=np.fromfile(files['_ieeg.eeg'],dtype='<f4').reshape(-1,32)
assert len(channels)==32 and np.isfinite(data).all()
start=round(8*fs);end=start+round(20*fs)
selected=[0,1,8,12,16,20,24,28]
events=[]
for r in csv.DictReader(io.StringIO(files['_events.tsv'].read_text()),delimiter='\t'):
    t=float(r['onset'])-start/fs
    if 0<=t<(end-start)/fs:
        events.append({'timeSeconds':t,'durationSeconds':float(r['duration']),'label':r['trial_type'], 'sourceSample':int(r['sample'])})
segment={
 'id':'session-001-reaching-run-01','label':'Executed and imagined reaching · session 1, run 1',
 'sampleRateHz':fs,'startTimeSeconds':start/fs,'timeReference':'Seconds from excerpt start; excerpt begins at source sample 4681 (zero based).',
 'unit':'source units','sampleCount':end-start,
 'channels':[{'id':channels[i]['name'],'label':channels[i]['name']+' · '+regions[channels[i]['name']], 'unit':'source units','sourceIndex':i,'anatomicalRegion':regions[channels[i]['name']], 'samples':np.round(data[start:end,i].astype(float),6).tolist()} for i in selected],
 'events':events
}
provenance=[{'url':BASE+STEM+suffix,'sha256':digest(path),'bytes':path.stat().st_size} for suffix,path in files.items()]
provenance += [{'url':BASE+'README.md','sha256':digest(readme),'bytes':readme.stat().st_size},{'url':BASE+'sub-01/ses-001/ieeg/'+electrodes.name,'sha256':digest(electrodes),'bytes':electrodes.stat().st_size}]
result={
 'id':'wimagine-reaching','title':'WIMAGINE · executed and imagined reaching',
 'recordingType':'Measured, filtered human epidural ECoG',
 'sourceUrl':'https://www.nemar.org/dataset/nm000408',
 'sourceDoi':'10.82901/nemar.nm000408','sourceVersion':'v1.0.2','originalSourceDoi':'10.5281/zenodo.18703801',
 'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
 'citation':'Pollina L, Struber L, De Seta V, Russo E, Karakas S, Chabardes S, Aksenova T, Charvet G, Shokur S, Micera S (2026). Decoupling simultaneous motor imagination and execution via orthogonal ECoG neural representations. Nature Communications. doi:10.1038/s41467-026-71234-0. NEMAR derivative nm000408 v1.0.2, doi:10.82901/nemar.nm000408.',
 'species':'Human','participant':'sub-01','session':'ses-001','device':'WIMAGINE wireless epidural ECoG implant',
 'acquisitionSampleRateHz':fs,'releasedSampleRateHz':fs,'channelsInSource':32,
 'processing':['Authors applied zero-phase fifth-order Butterworth band-pass 1–250 Hz before release.','NEMAR repackaged source float64 values as float32 BrainVision without further signal processing.','This excerpt selects 8 of 32 channels and 20 seconds beginning at source sample 4681 (zero based); no resampling, re-referencing, normalization, or additional filtering.','JSON sample values rounded to six decimal places in source units.'],
 'limitations':['The original release does not state physical signal units. NEMAR labels µV as an assumption; the viewer therefore labels amplitudes as source units and does not assert calibrated microvolts.','No per-contact coordinates are released. M1/S1 labels are source annotations; channel order must not be used as a physical array map.','One participant and a short illustrative excerpt; not representative of all WIMAGINE implants, sessions or outcomes.','RE-E means executed reaching and RE-I means imagined reaching. Events are task instructions from the release, not decoded predictions or measurements of movement.','Filtered continuous ECoG, not original raw implant output and not single-neuron spike signals.'],
 'provenance':provenance,'segments':[segment]
}
out=OUT/'wimagine-reaching.json';out.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
print(json.dumps({'file':str(out),'bytes':out.stat().st_size,'sha256':digest(out),'sourceShape':list(data.shape),'samplesPerChannel':end-start,'startSample':start,'endExclusive':end,'min':float(data[start:end,selected].min()),'max':float(data[start:end,selected].max()),'events':events},indent=2))
