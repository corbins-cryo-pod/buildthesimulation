#!/usr/bin/env python3
"""Fetch only two compressed 1-second IBL chunks and export calibrated voltage.
Requires Python 3 + numpy. No Alyx account or complete recording download needed.
Usage: python prepare-neuropixels-voltage.py [output-directory]
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote
import json, hashlib, zlib, io, re, sys
import numpy as np

OUT = Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent
CACHE = OUT / 'ibl-voltage-source'; CACHE.mkdir(parents=True,exist_ok=True)
HOST='https://ibl-brain-wide-map-public.s3.amazonaws.com/'
PREFIX='data/churchlandlab_ucla/Subjects/MFD_09/2023-10-19/001/'
RAW=PREFIX+'raw_ephys_data/probe00/_spikeglx_ephysData_g0_t0.imec0.'
FILES={
 'ap':{'cbin':RAW+'ap.d63b0223-a55e-4dae-b13e-370b4707a05d.cbin','ch':RAW+'ap.4ab1a57a-9971-4dfd-8917-0f17a0ab6574.ch','meta':RAW+'ap.ed1354dd-2e81-4405-b5b4-cd81e80f4e3d.meta'},
 'lf':{'cbin':RAW+'lf.5fd49960-20e1-44e8-b228-9ad60300d6f5.cbin','ch':RAW+'lf.cea4c960-3818-4c57-ad02-4bd4dfbc95d2.ch','meta':RAW+'lf.55060353-e4b9-4707-b14f-c318436e16d6.meta'},
}
KEY_COORD=PREFIX+'alf/probe00/pykilosort/channels.localCoordinates.92884e94-d997-4a6d-be39-131f29e4b760.npy'
KEY_RAW=PREFIX+'alf/probe00/pykilosort/channels.rawInd.8d2e2aaf-06c1-4bd0-92d6-bb75567cbd91.npy'
KEY_DESC=PREFIX+'alf/probes.description.7f7a24c1-8492-4991-b392-17967bd2a654.json'
SOURCE=[]
def fetch(key, byte_range=None):
 url=HOST+quote(key,safe='/');name=key.rsplit('/',1)[1]
 if byte_range:name+=f'.bytes-{byte_range[0]}-{byte_range[1]}'
 p=CACHE/name
 if p.exists():data=p.read_bytes()
 else:
  headers={'Range':f'bytes={byte_range[0]}-{byte_range[1]}'} if byte_range else {}
  with urlopen(Request(url,headers=headers),timeout=90) as response:
   if byte_range:
    assert response.status==206,'Server must honor byte-range requests'
    assert response.headers['Content-Range'].startswith(f'bytes {byte_range[0]}-{byte_range[1]}/')
   data=response.read()
  p.write_bytes(data)
 if byte_range:assert len(data)==byte_range[1]-byte_range[0]+1
 SOURCE.append({'url':url,'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'byteRangeInclusive':list(byte_range) if byte_range else None})
 return data
coords=np.load(io.BytesIO(fetch(KEY_COORD)));raw_ids=np.load(io.BytesIO(fetch(KEY_RAW)))
probe_description=json.loads(fetch(KEY_DESC))
assert len(coords)==len(raw_ids)==384
selected=list(range(200,208));segments=[];validations=[]
for band in ['ap','lf']:
 ch=json.loads(fetch(FILES[band]['ch']));meta_bytes=fetch(FILES[band]['meta']);meta=dict(line.lstrip('~').split('=',1) for line in meta_bytes.decode().splitlines() if '=' in line)
 assert ch['algorithm']=='zlib' and ch['dtype']=='int16' and ch['n_channels']==385
 assert int(meta['imDatPrb_type'])==0 and float(meta['imMaxInt'])==512
 idx=100;lo,hi=ch['chunk_offsets'][idx:idx+2];first,last=ch['chunk_bounds'][idx:idx+2]
 payload=fetch(FILES[band]['cbin'],(lo,hi-1))
 a=np.frombuffer(zlib.decompress(payload),dtype=ch['dtype']).reshape((last-first,ch['n_channels']),order=ch['chunk_order'])
 if ch['do_spatial_diff']:a=np.cumsum(a,axis=1,dtype=a.dtype)
 if ch['do_time_diff']:a=np.cumsum(a,axis=0,dtype=a.dtype)
 assert np.isfinite(a).all()
 np.save(CACHE/f'{band}-chunk100-adc.npy',a)
 # NP1 imro rows are: channel, bank, reference, AP gain, LF gain, highpass flag.
 imro=[list(map(int,row.split())) for row in re.findall(r'\(([^()]*)\)',meta['imroTbl'])[1:]]
 assert len(imro)==384
 fs=float(meta['imSampRate']);assert fs==ch['sample_rate']
 n=7500 if band=='ap' else 2500;channels=[]
 for cid in selected:
  row=imro[cid];assert row[0]==cid
  gain=row[3 if band=='ap' else 4]
  scale=float(meta['imAiRangeMax'])/float(meta['imMaxInt'])/gain*1e6
  loc=np.where(raw_ids==cid)[0];assert len(loc)==1
  pos=coords[loc[0]];values=a[:n,cid].astype(np.float64)*scale
  # Conversion is dyadic for this source, so JSON keeps exact calibrated values.
  channels.append({'id':str(cid),'label':f'Raw channel {cid}','unit':'µV','position':{'x':float(pos[0]),'y':float(pos[1]),'unit':'µm'},'adcGain':gain,'microvoltsPerAdcCount':scale,'samples':values.tolist()})
  assert np.array_equal(np.rint(values/scale).astype(np.int16),a[:n,cid])
 segments.append({'id':f'ibl-{band}-100s','label':('AP band · 250 ms' if band=='ap' else 'LFP band · 1 s'),'sampleRateHz':fs,'nominalSampleRateHz':30000 if band=='ap' else 2500,'startTimeSeconds':first/fs,'timeReference':'Probe acquisition clock; not aligned to the behavioral experiment clock','unit':'µV','sourceStartSample':first,'sourceEndSampleExclusive':first+n,'sampleCount':n,'channels':channels,'events':[]})
 validations.append({'band':band,'sourceChunkIndex':idx,'sourceChunkSamples':[first,last],'exportSamples':n,'channels':selected,'adcRoundtripExact':True,'rangeByteCount':hi-lo,'decodedShape':list(a.shape),'gain':500 if band=='ap' else 250})
result={'schema':'bts-recording-excerpt-v1','id':'ibl-neuropixels-voltage','title':'Neuropixels AP and LFP voltage','signalType':'recorded-voltage','species':'mouse','subject':'MFD_09','session':'ebce500b-c530-47de-8cb1-963c552703ea','sessionDate':'2023-10-19','probe':'probe00','hardware':'Neuropixels 1.0 (3B2)','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','sourceUrl':'https://openalyx.internationalbrainlab.org/sessions/ebce500b-c530-47de-8cb1-963c552703ea','citation':'International Brain Laboratory. Brain-Wide Map public release. Mouse MFD_09, Churchland lab at UCLA, 2023-10-19, probe00.','accessed':'2026-10-25','sourceVersion':'Immutable UUID-bearing IBL S3 object keys; original 2023-12-19 upload; file SHA256 hashes recorded below.','processing':['Lossless zlib/mtscomp decompression of chunk index 100 using the released compression header.','Retain channels 200–207 (zero-based raw acquisition indices); remove all other channels including the digital synchronization channel.','Convert original signed ADC counts to microvolts using imAiRangeMax/imMaxInt/gain from the acquisition .meta file.','AP: first 7500 samples of chunk 100. LFP: first 2500 samples of chunk 100. No resampling, smoothing, detrending, re-referencing, spike sorting or added filtering.','AP/LFP bands have acquisition hardware filtering; raw means no additional offline processing here.'], 'limitations':['Eight preselected adjacent channels from one mouse session, not representative of all recordings.','AP/LFP excerpts use the probe clock. They are not time synchronized to the existing trial-aligned spike raster or to behavioral events.','Local positions are released acquisition-channel coordinates, not anatomical coordinates and not contact IDs of the separate 960-site 3D illustration.','Raw acquisition signals include noise and artifacts; visible transients are not certified single-neuron spikes.'], 'coordinateSystem':'IBL channels.localCoordinates in µm; use source rawInd to associate coordinates with raw acquisition indices. No absolute tip offset inferred.','segments':segments,'provenance':{'sources':SOURCE,'probeDescription':probe_description,'validations':validations,'generator':'prepare-neuropixels-voltage.py'}}
(OUT/'ibl-neuropixels-voltage.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
(OUT/'ibl-neuropixels-voltage-provenance.json').write_text(json.dumps({k:v for k,v in result.items() if k!='segments'},indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'output':str(OUT/'ibl-neuropixels-voltage.json'),'bytes':(OUT/'ibl-neuropixels-voltage.json').stat().st_size,'segments':[{'id':s['id'],'fs':s['sampleRateHz'],'channels':len(s['channels']),'samples':s['sampleCount']} for s in segments]}))
