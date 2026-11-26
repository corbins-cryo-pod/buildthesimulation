// Passive electronic test load only. All internal calculations in SI.
export const defaults={mode:'IC',sampleId:'PATCH1U-CH1',parentRevision:0,connected:true,rmMOhm:500,rsMOhm:10,cmPf:33,holding:0,step:20,durationMs:100,gain:1};
export const schema='bts.multiclamp.passive-sweep.v1';
export const dt=1/100000,pre=.005,post=.025,rail=10;
export function check(p){
 if(!['VC','IC'].includes(p.mode))throw Error('Choose IC or VC.');
 if(p.connected!==true)throw Error('Connect the PATCH-1U CELL port to the CV-7B before running.');
 if(typeof p.sampleId!=='string'||!p.sampleId.trim()||p.sampleId.length>64)throw Error('Use a nonempty sample ID, maximum 64 characters.');
 if(!Number.isSafeInteger(p.parentRevision)||p.parentRevision<0||p.parentRevision>1e8)throw Error('Invalid incoming revision.');
 const limit=p.mode==='IC'?200:100;
 for(const [k,a,b] of [['rmMOhm',10,1000],['rsMOhm',0,50],['cmPf',1,250],['durationMs',1,500],['holding',-limit,limit],['step',-limit,limit]])if(!Number.isFinite(p[k])||p[k]<a||p[k]>b)throw Error(k+' must be between '+a+' and '+b+'.');
 if(Math.abs(p.holding+p.step)>limit)throw Error('Holding plus step exceeds the tutorial command range.');
 if(p.mode==='VC' && p.rsMOhm<.1)throw Error('VC requires at least 0.1 MΩ of series resistance; the zero-resistance instantaneous charging impulse is not resolved.');
 if(![1,2,5,10].includes(p.gain))throw Error('Unsupported output gain.');
}
export function sweep(input){
 const p={...input};check(p);const IC=p.mode==='IC',room=p.rmMOhm*1e6,access=p.rsMOhm*1e6,C=p.cmPf*1e-12;
 const h=p.holding*(IC?1e-12:1e-3),a=p.step*(IC?1e-12:1e-3);
 const sustain=IC?room:(room/(room+access)),tau=(IC?room:(room*access/(room+access)))*C;
 const duration=Math.round(p.durationMs/1000/dt)*dt,offset=pre+duration;
 const n0=Math.round(pre/dt),n1=Math.round(offset/dt),N=n1+Math.round(post/dt)+1;
 const gainVperSI=(IC?10:0.5e9)*p.gain; // 10 mV/mV or 0.5 V/nA.
 const columns={timeS:[],commandSI:[],membraneV:[],electrodeV:[],currentA:[],primaryOutputV:[],overrange:[]};
 const atEnd=h*sustain+a*sustain*(-Math.expm1(-duration/tau));let clipped=0;
 for(let i=0;i<N;i++){const t=i*dt,during=i>=n0&&i<n1,cmd=during?h+a:h;
 const vm=i<n0?h*sustain:during?h*sustain+a*sustain*(-Math.expm1(-(i-n0)*dt/tau)):h*sustain+(atEnd-h*sustain)*Math.exp(-(i-n1)*dt/tau);
 const ve=IC?vm+cmd*access:cmd, current=IC?cmd:(cmd-vm)/access;
 const v= (IC?ve:current)*gainVperSI, clip=Math.abs(v)>rail;
 columns.timeS.push(t);columns.commandSI.push(cmd);columns.membraneV.push(vm);columns.electrodeV.push(ve);columns.currentA.push(current);columns.primaryOutputV.push(Math.max(-rail,Math.min(rail,v)));columns.overrange.push(clip);clipped+=Number(clip);}
 return {schema,deviceId:'10-01',sampleId:p.sampleId,parentRevision:p.parentRevision,revision:p.parentRevision+1,contactId:'CH1-CELL',provenance:'analytical simulation / electronic load; not measured',bandwidth:'ideal mathematical bypass; unvalidated high-frequency response',parameters:p,dtS:dt,units:{timeS:'s',commandSI:IC?'A':'V',membraneV:'V',electrodeV:'V',currentA:'A',primaryOutputV:'V',overrange:'boolean'},settings:{preS:pre,holdDurationS:duration,postS:post,receiverRailV:rail,outputGainVPerSI:gainVperSI},summary:{tauMs:tau*1000,settledPrimarySI:IC?(h+a)*(room+access):(h+a)/(room+access),clippedSamples:clipped},columns};
}
export function analogTrace(r){return {schema:'bts.analog-waveform.v1',sampleId:r.sampleId,parentRevision:r.parentRevision,revision:r.revision,dtS:r.dtS,t0S:0,channels:[{id:r.contactId,unit:'V',samples:r.columns.primaryOutputV}],provenance:{source:'10-01',type:'simulated',inputSchema:r.schema,configuration:r.parameters,primaryScale:r.settings.outputGainVPerSI,physicalUnit:r.units.commandSI==='A'?'V':'A',clippedSamples:r.summary.clippedSamples,bandwidth:r.bandwidth}};}
