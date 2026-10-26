#!/usr/bin/env python3
"""Reproducible true retinal spike excerpts; Python + numpy + h5py required.
Usage: python prepare-retinal-recordings.py [working_directory]
Data and adapted excerpts: CC BY-NC-SA 4.0. See source license below.
The pinned GIN annex MD5 verifies each downloaded .cmtr file.
"""
import hashlib,json,sys,urllib.request
from pathlib import Path
import h5py
import numpy as np

OUT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent
OUT.mkdir(parents=True,exist_ok=True)
COMMIT='997bb78e0eec02f3e0144047c483cb16f8c32f37'
BASE='https://gin.g-node.org/lhoefling/rgcElStim/raw/'+COMMIT+'/'
SOURCES=[
 {'id':'wildtype','session':'2017-12-19','label':'Wildtype mouse retina · electrical stimulation', 'path':'sorted/wildtype/2017-12-19/2017.12.19-15.05.43-standard_sf_mod_lara_appended.cmtr','md5':'d7ecd38dd1f4e6771732997487c6c0e6','bytes':87443672},
 {'id':'rd10','session':'2017-10-26','label':'rd10 mouse retina · electrical stimulation','path':'sorted/rd10/2017-10-26/2017.10.26-17.13.58-standard_subfield_mod_f_appended.cmtr','md5':'922bbb7a860127f83a7694a44063537c','bytes':58100148}
]
segments=[];provenance=[]
DURATION_US=20_000_000;BIN_US=10_000
for src in SOURCES:
 path=OUT/('retinal-'+src['id']+'.cmtr')
 if not path.exists():
  with urllib.request.urlopen(BASE+src['path'],timeout=120) as r,path.open('wb') as f:
   while block:=r.read(2**20):f.write(block)
 raw=path.read_bytes()
 assert len(raw)==src['bytes'] and hashlib.md5(raw).hexdigest()==src['md5'],'Published annex MD5/size mismatch'
 provenance.append({'url':BASE+src['path'],'gitCommit':COMMIT,'bytes':len(raw),'md5':src['md5'],'sha256':hashlib.sha256(raw).hexdigest()})
 with h5py.File(path,'r') as f:
  sorter=f['Spike Sorter'];available_until_us=int(sorter.attrs['To'][0]);assert available_until_us>=DURATION_US
  channels=[]
  for name in sorted((k for k in sorter if k.startswith('Unit ')),key=lambda k:int(k.split(' ')[1])):
   unit=sorter[name];info=unit['Unit Info'][0]
   # Preserve the source acceptance flag. No reliability or ISI selection added.
   assert info['Tags']==b'', 'Unexpected tagged unit: review source before publishing'
   peaks=unit['Peaks'][:];times=peaks['Timestamp'][peaks['IncludePeak'].astype(bool)]
   times=times[(times>=0)&(times<DURATION_US)]
   assert np.all(np.diff(times)>=0)
   assert int(unit['Peaks'].attrs['Tick'][0])==50
   counts=np.bincount(times//BIN_US,minlength=DURATION_US//BIN_US)
   assert len(counts)==2000 and int(counts.sum())==len(times)
   channels.append({'id':str(int(info['UnitID'])),'label':name,'unit':'spikes / 10 ms','samples':counts.tolist(),'spikeTimesMicroseconds':times.tolist(),'spikeTimesSeconds':np.round(times*1e-6,6).tolist(),'sourceSensorId':int(info['SensorID']),'sourceGrid':{'row':int(info['Row']),'column':int(info['Column']),'indexing':'1-based source recording grid; sorter-assigned source electrode, not exact soma position'}})
  segments.append({'id':src['id'],'label':src['label'],'session':src['session'],'signalKind':'spike-counts','binMs':10,'sampleRateHz':100,'startTimeSeconds':0,'timeReference':'Seconds from start of the released appended spike-sorted recording.','unit':'spikes / 10 ms','sampleCount':2000,'durationSeconds':20,'sourceRecordingDurationSeconds':available_until_us*1e-6,'nativeTimestampTickMicroseconds':50,'channels':channels,'events':[]})
result={
 'id':'retinal-cmos-mea','title':'Retinal ganglion cells · electrical stimulation','signalKind':'spike-counts','binMs':10,
 'recordingType':'Measured, spike-sorted ex-vivo mouse retinal recordings',
 'sourceUrl':'https://doi.gin.g-node.org/10.12751/g-node.0blveb/','sourceDoi':'10.12751/g-node.0blveb','sourceVersion':COMMIT,
 'license':'CC BY-NC-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-nc-sa/4.0/','licenseAppliesTo':'Source data and adapted excerpt data',
 'citation':'Höfling L, Zeck G (2021). CMOS-MEA recordings of mouse retinal ganglion cells upon smooth electrical stimulation. G-Node. doi:10.12751/g-node.0blveb. Related paper: Höfling L, Oesterle J, Berens P, Zeck G (2020), Scientific Reports 10:5248, doi:10.1038/s41598-020-61899-y.',
 'species':'Mouse (wildtype and rd10)','device':'Multi Channel Systems hdCMOS-MEA 5000 research array','nativeTimestampTickMicroseconds':50,
 'processing':['Source recordings were processed by the authors for stimulation-artifact removal and spike sorting.','For each of two released .cmtr files, retain all units with empty Tags and peaks marked IncludePeak by the source sorter. No extra reliability or inter-spike interval exclusion is applied.','Select accepted timestamps in the first 20 seconds [0,20000000 microseconds); count spikes in nonoverlapping 10 ms bins using integer timestamp arithmetic.','Original accepted spike timestamps are also retained as integer microseconds and seconds. No synthetic spike times, voltage reconstruction or additional smoothing is used.'],
 'limitations':['These data were recorded ex vivo from mouse retinal tissue on an hdCMOS-MEA 5000. They were not recorded by PRIMA, Argus II, or another clinical retinal implant.','Sorted units estimate neuronal spike trains; counts are not electrode voltage, and the excerpt does not include the delivered stimulation waveform or exact stimulus event timestamps.','The wildtype and rd10 examples come from different sessions and preparations. They are illustrative examples, not a matched experiment or a device-performance comparison.','Source row/column values identify sorter-assigned recording-grid locations. They are not clinical implant contact coordinates or precisely reconstructed soma positions.','This excerpt does not apply the published paper’s reliability-selection criteria, so it must not be presented as reproducing the paper’s response statistics.'],
 'provenance':provenance,
 'timestampFormatReference':'https://github.com/lhoefling/rgc-elstim-modeling/blob/ec04212dd110c0186afeba482e7ae5f265022892/src/analysis/spikes.py',
 'segments':segments
}
out=OUT/'retinal-cmos-mea.json';out.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
print(json.dumps({'file':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'segments':[{'id':s['id'],'units':len(s['channels']),'spikes':sum(sum(c['samples']) for c in s['channels']),'duration':s['durationSeconds']} for s in segments]},indent=2))
