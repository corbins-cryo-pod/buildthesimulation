#!/usr/bin/env python3
"""Read two small public NSx 2.2 byte ranges, preserve calibrated source samples.
Requires numpy. No full 578MB NSx download. NSx parser follows manufacturer layout:
https://github.com/BlackrockNeurotech/NPMK/blob/master/NPMK/openNSx.m
"""
import argparse,base64,hashlib,json,struct,urllib.parse,urllib.request
from pathlib import Path
import numpy as np

def digest(b):return hashlib.sha256(b).hexdigest()
def fetch(url,path,range_=None):
 if path.exists():return path.read_bytes()
 headers={} if range_ is None else {'Range':f'bytes={range_[0]}-{range_[1]}'}
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=90) as r:
  if range_:assert r.status==206
  b=r.read()
 if range_:assert len(b)==range_[1]-range_[0]+1
 path.write_bytes(b);return b

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--cache',type=Path,default=Path('/tmp/carbon-fiber-source'));ap.add_argument('--out',type=Path,default=Path('public/data/recordings'));a=ap.parse_args();a.cache.mkdir(parents=True,exist_ok=True);a.out.mkdir(parents=True,exist_ok=True)
 sourcePath='files/source/sub-01-EN/EN_0003/EN_0003.ns5';sourceVersion='4WJdJHOj5IFJfuHeiKDDiUMKQv_mGv7e';fullSha='hioy0jx3DRjVvIvkVs1YLY6WKd31n0Br1URYCuVy0xg='
 url='https://sparc-prod-aod-discover-publish50-use1.s3.amazonaws.com/177/'+sourcePath+'?versionId='+sourceVersion
 head=fetch(url,a.cache/'177-ns5-header.bin',(0,8191))
 assert head[:10]==b'NEURALCD\x02\x02'
 headerBytes=struct.unpack_from('<I',head,10)[0];period,timeResolution=struct.unpack_from('<II',head,286);channelCount=struct.unpack_from('<I',head,310)[0]
 assert headerBytes==314+66*channelCount and head[headerBytes]==1
 timestamp,totalSamples=struct.unpack_from('<II',head,headerBytes+1)
 assert timeResolution==30000 and period==1 and channelCount==32 and timestamp==0
 fs=30000;sampleCount=3000;segments=[];sources=[{'url':url,'sourcePath':sourcePath,'s3VersionId':sourceVersion,'fullFileBytes':577526915,'publishedFullFileSha256Base64':fullSha,'fullFileHashVerified':False,'rangeInclusive':[0,8191],'rangeSha256':digest(head),'format':'NSx2.2','headerBytes':headerBytes,'channelCount':channelCount,'sourceSampleRateHz':fs,'sourcePacketTimestamp':timestamp,'sourcePacketSamples':totalSamples}]
 for seconds in [10,20]:
  start=seconds*fs;lo=headerBytes+9+start*channelCount*2;hi=lo+sampleCount*channelCount*2-1
  assert start+sampleCount<=totalSamples
  raw=fetch(url,a.cache/f'177-ns5-{seconds}s.bin',(lo,hi));samples=np.frombuffer(raw,dtype='<i2').reshape(sampleCount,channelCount)
  channels=[]
  for electrodeId in [2,10,18,26]:
   i=electrodeId-1;ch=head[314+66*i:314+66*(i+1)];assert ch[:2]==b'CC'
   assert struct.unpack_from('<H',ch,2)[0]==electrodeId
   label=ch[4:20].split(b'\0')[0].decode();mnD,mxD,mnA,mxA=struct.unpack_from('<hhhh',ch,22);unit=ch[30:46].split(b'\0')[0].decode();assert unit=='uV'
   scale=(mxA-mnA)/(mxD-mnD);offset=mnA-mnD*scale;values=samples[:,i].astype(float)*scale+offset
   highHz=struct.unpack_from('<I',ch,46)[0]/1000;lowHz=struct.unpack_from('<I',ch,56)[0]/1000
   channels.append({'id':f'ch{electrodeId}','label':f'Acquisition channel {electrodeId}','unit':'µV','sourceLabel':label,'sourceChannelIndex':i,'digitalRange':[mnD,mxD],'analogRange':[mnA,mxA],'microvoltsPerCount':scale,'offsetMicrovolts':offset,'acquisitionFilterHz':[highHz,lowHz],'samples':values.tolist()})
  sources.append({'url':url,'rangeInclusive':[lo,hi],'rangeSha256':digest(raw),'sourceStartSample':start,'sourceStopSampleExclusive':start+sampleCount,'bytes':len(raw)})
  segments.append({'id':f'cfma-en0003-{seconds}s','label':f'EN_0003 · {seconds}.0–{seconds}.1 s','sampleRateHz':fs,'startTimeSeconds':seconds,'timeReference':'Seconds from excerpt start; source clock offset appears in excerpt label.','unit':'µV','sourceStartSample':start,'sourceStopSampleExclusive':start+sampleCount,'channels':channels,'events':[]})
 data={'schemaVersion':1,'id':'carbon-fiber-vagus','title':'Carbon-fiber array · direct vagus recording','sourceUrl':'https://discover.pennsieve.io/datasets/177','license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','citation':'Jiman, A., Ratze, D., Welle, E., Patel, P., Bottorff, E., Richie, J., Seymour, J., Chestek, C., & Bruns, T. (2021). Intraneural recordings in rat vagus nerves using carbon fiber microelectrode arrays (Version 1, revision 2). SPARC. doi:10.26275/j5wc-rwcr.','version':'1, revision 2','species':'Rat','signalType':'Continuous intraneural extracellular voltage','originalSampleRateHz':30000,'releasedSampleRateHz':30000,'processing':'Two 100ms NSx excerpts at 10s and 20s from EN_0003. Four acquisition channels retained. Native int16 values linearly scaled to µV using each NSx channel header; no added filtering, averaging, baseline subtraction, spike sorting or decimation. Acquisition header specifies 0.3Hz high-pass and 7500Hz low-pass.','provenance':{'datasetVersion':1,'datasetRevision':2,'subject':'sub-01-EN','recording':'EN_0003','selection':'Fixed 10.0–10.1s and20.0–20.1s intervals; acquisition channels2,10,18,26. Intervals selected without screening for spike yield.','sourceSystemTime':[2019,9,3,4,17,21,41,991],'channelMap':'Acquisition channel IDs retained. Dataset supplies a Grapevine-to-CFMA connector map, but this viewer does not claim contact-by-contact mapping to the cortical device model.','scaling':'µV = digitalCount × (maxAnalog−minAnalog)/(maxDigital−minDigital) + minAnalog − minDigital×scale. Header values: digital±32767, analog±8191µV.','sourceFiles':sources,'parserReference':'https://github.com/BlackrockNeurotech/NPMK/blob/master/NPMK/openNSx.m'},'limitations':['These are rat vagus-nerve recordings from the Michigan carbon-fiber research family; the catalog sheet describes separate cortical configurations.','Continuous extracellular voltage contains noise and possible non-neural artifacts; no identified single units or spike labels are inferred here.','Only four acquisition channels and two short fixed intervals are shown; the full dataset has additional channels, conditions and subjects.','No source stimulation or movement events were assigned to these excerpts.','Byte-range hashes are retained, but the full578MB source file SHA256 was not verified because the file was not downloaded in full.'],'segments':segments}
 (a.out/'carbon-fiber-vagus.json').write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False,allow_nan=False)+'\n')
 print(json.dumps({'file':str(a.out/'carbon-fiber-vagus.json'),'bytes':(a.out/'carbon-fiber-vagus.json').stat().st_size,'sha256':digest((a.out/'carbon-fiber-vagus.json').read_bytes()),'ranges':sources,'extrema':[[(c['id'],min(c['samples']),max(c['samples'])) for c in s['channels']] for s in segments]},indent=2),flush=True)
if __name__=='__main__':main()
