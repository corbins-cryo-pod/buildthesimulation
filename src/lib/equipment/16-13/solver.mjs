export const labels=Object.freeze({BNC:'BNC · 50 Ω coax',SMA:'SMA · 50 Ω coax',USB:'USB 2.0 Type A',FFC:'FFC · 0.5 mm / 6 contacts'});
export const PULSE=Object.freeze({sampleId:'bench-pulse-01',dtS:0.0001,startS:0,samples:Object.freeze(Array.from({length:51},(_,i)=>i>=12&&i<22?1.25:0))});
export const SOURCE='PANEL-BNC-OUT-01',SINK='PANEL-BNC-IN-01';
export const defaults=()=>({plug:'BNC',sink:'BNC',radiusMm:30});
export const initial=()=>({configuration:defaults(),connection:null,waveform:null,revision:0,error:''});
export function valid(c){return !!labels[c.plug]&&!!labels[c.sink]&&Object.hasOwn(labels,c.plug)&&Object.hasOwn(labels,c.sink)&&Number.isFinite(c.radiusMm)&&c.radiusMm>=8&&c.radiusMm<=50}
export function mate(c,revision=0){
 if(!valid(c))throw Error('Select an offered connector and a radius from 8 to 50 mm.');
 if(c.plug!==c.sink)throw Error('Connector families do not mate. No adapter is modeled and no edge was created.');
 if(c.plug!=='BNC')throw Error('Reference geometry only for this pair. This test source and receiver use BNC; no pulse path was created.');
 return {schema:'bts.passive-connection.v1',deviceId:'16-13',kind:'simulated',connectionId:'patch-bnc-01',sampleId:PULSE.sampleId,revision:revision+1,parentRevision:revision,sourcePort:SOURCE,sinkPort:SINK,receivingChannel:SINK,
  plugType:'BNC 50 ohm male',sinkType:'BNC 50 ohm female',signalClass:'ideal baseband analog voltage',
  pinMap:[{from:SOURCE+':center',to:SINK+':center'},{from:SOURCE+':shield',to:SINK+':shield'}],
  bend:{centerlineRadiusMm:c.radiusMm,demoMinimumMm:20,warning:c.radiusMm<20,actualCableRatingKnown:false},measured:false};
}
export function pulse(connection){
 if(connection?.sourcePort!==SOURCE||connection.sinkPort!==SINK||connection.connectionId!=='patch-bnc-01')throw Error('Mate a compatible BNC cable before sending the pulse.');
 return {schema:'bts.analog-waveform.v1',sampleId:PULSE.sampleId,revision:connection.revision+1,kind:'simulated',source:'16-13 ideally routed calibration pulse',dtS:PULSE.dtS,startS:PULSE.startS,channels:[{id:SINK,unit:'V',samples:[...PULSE.samples]}],provenance:{deviceId:'16-13',sourcePort:SOURCE,sinkPort:SINK,connectionId:connection.connectionId,parentRevision:connection.revision,assumption:'identity transfer; no RF, propagation, loading, noise or electrical protection'}};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='set')return {...s,configuration:{...s.configuration,...p},connection:null,waveform:null,error:''};
 if(id==='plug'||id==='sink')return act(s,'set',{[id]:p});
 if(id==='unmate')return {...s,connection:null,waveform:null,error:''};
 if(id==='mate'||id==='toggle'){if(id==='toggle'&&s.connection)return act(s,'unmate');
   try{const c=mate(s.configuration,s.revision);return {...s,connection:c,waveform:null,revision:c.revision,error:''};}
   catch(e){return {...s,connection:null,waveform:null,error:e.message};}}
 if(id==='pulse'){try{const previous={...s.connection,revision:s.revision};const w=pulse(previous);return {...s,waveform:w,revision:w.revision,error:''}}
   catch(e){return {...s,waveform:null,error:e.message};}}
 throw Error('Unknown fixture action');
}
// Centerline from the two post-relief exits. Millimeters in a metre-scale coordinate frame.
export function cablePoints(radiusMm,mated){
 const r=radiusMm/1000,y=.067,L=-.066,R=.066,Z=.147,F=.059,N=12,d=mated?0:.018;
 const out=[[L,y,F],[L,y,Z-r]];
 for(let i=1;i<=N;i++){const a=Math.PI*(1-i/(2*N));out.push([L+r+r*Math.cos(a),y,Z-r+r*Math.sin(a)]);}
 out.push([R-r,y,Z]);
 for(let i=1;i<=N;i++){const a=Math.PI/2*(1-i/N);out.push([R-r+r*Math.cos(a),y,Z-r+r*Math.sin(a)]);}
 out.push([R,y,F+d]);return out;
}
