/**
 * Transparent generic cochlear-implant processor. Contact 0 is basal/high.
 * Independent educational CIS/n-of-m, not a manufacturer's complete processor.
 * Matrices are frame-major. Envelopes are peak-equivalent digital amplitude;
 * normalizedEnvelopes precede selection; currentsUA contains delivered current.
 * Events describe complete symmetric biphasic pulses. Onsets use a 1 ns grid.
 */
export const DEFAULT_PROCESSOR_CONFIG = Object.freeze({
  channelCount:12, lowHz:200, highHz:8000, strategy:'cis', frameRateHz:600,
  maxima:8, envelopeCutoffHz:150, inputMinDbfs:-55, inputMaxDbfs:0,
  minCurrentUA:0, maxCurrentUA:350, gamma:0.7, phaseWidthUs:25, gapUs:8,
  guardUs:2, polarity:'cathodic',
});
const TAU=2*Math.PI, EPS=1e-9;

export function validateProcessorConfig(input={},sampleRate=24000){
  const config={...DEFAULT_PROCESSOR_CONFIG,...input};
  if(input.maxima==null)config.maxima=Math.min(DEFAULT_PROCESSOR_CONFIG.maxima,config.channelCount);
  const errors=[],warnings=[];
  const finite=key=>{if(!Number.isFinite(config[key]))errors.push(`${key} must be finite.`);};
  ['channelCount','lowHz','highHz','frameRateHz','maxima','envelopeCutoffHz','inputMinDbfs','inputMaxDbfs','minCurrentUA','maxCurrentUA','gamma','phaseWidthUs','gapUs','guardUs'].forEach(finite);
  if(!Number.isFinite(sampleRate)||sampleRate<1000)errors.push('The audio sample rate must be at least 1000 Hz.');
  if(!Number.isInteger(config.channelCount)||config.channelCount<1||config.channelCount>64)errors.push('channelCount must be an integer from 1 through 64.');
  if(!(config.lowHz>0&&config.highHz>config.lowHz&&config.highHz<sampleRate/2))errors.push('Frequency limits must satisfy 0 < lowHz < highHz < audio Nyquist frequency.');
  if(!['cis','nofm'].includes(config.strategy))errors.push('strategy must be cis or nofm.');
  if(!(config.frameRateHz>0&&config.frameRateHz<=sampleRate))errors.push('frameRateHz must be positive and no greater than the audio sample rate.');
  if(!Number.isInteger(config.maxima)||config.maxima<1||config.maxima>config.channelCount)errors.push('maxima must be an integer from 1 through channelCount.');
  if(!(config.envelopeCutoffHz>0&&config.envelopeCutoffHz<sampleRate/2))errors.push('envelopeCutoffHz must be positive and below the audio Nyquist frequency.');
  if(config.envelopeCutoffHz>config.frameRateHz/2)warnings.push('Envelope cutoff exceeds half the selection-frame rate; fast envelope variations may alias when sampled.');
  if(!(config.inputMinDbfs<config.inputMaxDbfs))errors.push('inputMinDbfs must be below inputMaxDbfs.');
  if(!(config.minCurrentUA>=0&&config.maxCurrentUA>=config.minCurrentUA))errors.push('Electrical levels must satisfy 0 <= minCurrentUA <= maxCurrentUA.');
  if(!(config.gamma>0))errors.push('gamma must be positive.');
  if(!(config.phaseWidthUs>0&&config.gapUs>=0&&config.guardUs>=0))errors.push('Pulse phase width must be positive; interphase gap and guard must be nonnegative.');
  if(!['cathodic','anodic'].includes(config.polarity))errors.push('polarity must be cathodic or anodic.');
  if(input.activeMask==null){config.activeMask=Array.from({length:Math.max(0,Math.min(64,Math.floor(config.channelCount)||0))},()=>true);}
  else if(!Array.isArray(input.activeMask)||input.activeMask.length!==config.channelCount||input.activeMask.some(x=>typeof x!=='boolean')){errors.push('activeMask must contain one boolean per contact.');config.activeMask=[];}
  else config.activeMask=input.activeMask.slice();
  const enabledCount=config.activeMask.filter(Boolean).length;
  const maximumPulsesPerFrame=config.strategy==='nofm'?Math.min(config.maxima,enabledCount):enabledCount;
  const pulseDurationUs=2*config.phaseWidthUs+config.gapUs;
  const slotDurationUs=pulseDurationUs+config.guardUs;
  const frameDurationUs=1e6/config.frameRateHz;
  const maxOccupancy=maximumPulsesPerFrame*slotDurationUs/frameDurationUs;
  if(Number.isFinite(maxOccupancy)&&maxOccupancy>1+EPS)errors.push(`Sequential pulses require ${(100*maxOccupancy).toFixed(1)}% of the frame. Reduce contacts, maxima, rate, phase width, or gap.`);
  if(!enabledCount)warnings.push('All contacts are disabled; no pulses will be delivered.');
  if(config.strategy==='nofm'&&config.maxima>enabledCount&&enabledCount>0)warnings.push(`Only ${enabledCount} contacts are enabled; at most ${enabledCount} maxima can be delivered.`);
  return {valid:errors.length===0,errors,warnings,config,timing:{enabledCount,maximumPulsesPerFrame,pulseDurationUs,slotDurationUs,frameDurationUs,maxOccupancy}};
}

export function makeLogBands(channelCount,lowHz,highHz){
  if(!Number.isInteger(channelCount)||channelCount<1||!(lowHz>0&&highHz>lowHz))throw new Error('Invalid logarithmic filter-bank limits.');
  const ratio=highHz/lowHz;
  return Array.from({length:channelCount},(_,index)=>{const lo=lowHz*ratio**((channelCount-index-1)/channelCount),hi=lowHz*ratio**((channelCount-index)/channelCount);return {index,contactIndex:index,lowHz:lo,highHz:hi,centerHz:Math.sqrt(lo*hi)};});
}

/** Two identical second-order sections; bilinear prewarping fixes -3 dB edges. */
export function bandpassCoefficients(lowHz,highHz,sampleRate){
  if(!(lowHz>0&&highHz>lowHz&&highHz<sampleRate/2))throw new Error('Invalid bandpass frequencies.');
  const low=Math.tan(Math.PI*lowHz/sampleRate),high=Math.tan(Math.PI*highHz/sampleRate);
  const center=Math.sqrt(low*high),width=(high-low)/Math.sqrt(Math.SQRT2-1),denominator=1+width+center*center;
  const section={b0:width/denominator,b1:0,b2:-width/denominator,a1:2*(center*center-1)/denominator,a2:(1-width+center*center)/denominator};
  return [section,{...section}];
}

export function lowpassCoefficients(cutoffHz,sampleRate){
  if(!(cutoffHz>0&&cutoffHz<sampleRate/2))throw new Error('Invalid lowpass frequency.');
  const omega=TAU*cutoffHz/sampleRate,cosine=Math.cos(omega);
  return [0.541196100146197,1.306562964876377].map(q=>{const alpha=Math.sin(omega)/(2*q),norm=1+alpha;return {b0:(1-cosine)/(2*norm),b1:(1-cosine)/norm,b2:(1-cosine)/(2*norm),a1:-2*cosine/norm,a2:(1-alpha)/norm};});
}

export function makeCascade(coefficients){
  const stages=coefficients.map(c=>({...c,z1:0,z2:0}));
  return sample=>{let x=sample;for(const c of stages){const y=c.b0*x+c.z1;c.z1=c.b1*x-c.a1*y+c.z2;c.z2=c.b2*x-c.a2*y;x=y;}return x;};
}
export function filterBuffer(samples,coefficients){const filter=makeCascade(coefficients),out=new Float32Array(samples.length);for(let i=0;i<samples.length;i++)out[i]=filter(samples[i]);return out;}

function checkAudio(samples,sampleRate){
  if(!samples||!Number.isInteger(samples.length)||samples.length<1)throw new Error('Provide at least one audio sample.');
  if(!(sampleRate>=1000&&Number.isFinite(sampleRate)))throw new Error('Invalid sample rate.');
  if(samples.length/sampleRate>60)throw new Error('Process clips of 60 seconds or less.');
  for(let i=0;i<samples.length;i++)if(!Number.isFinite(samples[i]))throw new Error(`Audio contains a non-finite sample at ${i}.`);
}
function levelToCurrent(envelope,config){
  if(!(envelope>0))return {normalized:0,current:0};
  const db=20*Math.log10(envelope);
  if(db<=config.inputMinDbfs)return {normalized:0,current:0};
  const inputFraction=Math.max(0,Math.min(1,(db-config.inputMinDbfs)/(config.inputMaxDbfs-config.inputMinDbfs)));
  const normalized=inputFraction**config.gamma;
  return {normalized,current:config.minCurrentUA+normalized*(config.maxCurrentUA-config.minCurrentUA)};
}

export function runProcessor(samples,sampleRate,inputConfig={}){
  checkAudio(samples,sampleRate);
  const validation=validateProcessorConfig(inputConfig,sampleRate);
  if(!validation.valid)throw new Error(validation.errors.join(' '));
  const {config,timing}=validation,count=config.channelCount,durationS=samples.length/sampleRate;
  const frameCount=Math.ceil(durationS*config.frameRateHz-1e-10);
  if(frameCount*count>4e6)throw new Error('This clip and frame rate exceed the interactive processing limit. Shorten the clip or reduce the frame rate.');
  const bands=makeLogBands(count,config.lowHz,config.highHz),frameTimesS=new Float64Array(frameCount),sampleIndices=new Uint32Array(frameCount);
  for(let frame=0;frame<frameCount;frame++){frameTimesS[frame]=frame/config.frameRateHz;sampleIndices[frame]=Math.min(samples.length-1,Math.floor(frameTimesS[frame]*sampleRate+1e-8));}
  const envelopes=new Float32Array(frameCount*count),normalizedEnvelopes=new Float32Array(frameCount*count),candidateCurrents=new Float32Array(frameCount*count),currentsUA=new Float32Array(frameCount*count);
  const lowpass=lowpassCoefficients(config.envelopeCutoffHz,sampleRate);
  for(const band of bands){
    const bandFilter=makeCascade(bandpassCoefficients(band.lowHz,band.highHz,sampleRate)),envelopeFilter=makeCascade(lowpass);
    let frame=0;
    for(let sample=0;sample<samples.length&&frame<frameCount;sample++){
      const envelope=Math.max(0,envelopeFilter(Math.abs(bandFilter(samples[sample])))*Math.PI/2);
      while(frame<frameCount&&sampleIndices[frame]===sample){const index=frame*count+band.index,mapped=levelToCurrent(envelope,config);envelopes[index]=envelope;normalizedEnvelopes[index]=mapped.normalized;candidateCurrents[index]=mapped.current;frame++;}
    }
  }
  const events=[],perContactPulseCounts=new Uint32Array(count);
  let maxCurrent=0,sumChargeNC=0,tailPulsesOmitted=0;
  for(let frame=0;frame<frameCount;frame++){
    const offset=frame*count;
    let selected=[];
    for(let contact=0;contact<count;contact++)if(config.activeMask[contact]&&candidateCurrents[offset+contact]>0)selected.push(contact);
    if(config.strategy==='nofm'){selected.sort((a,b)=>envelopes[offset+b]-envelopes[offset+a]||a-b);selected=selected.slice(0,config.maxima);}
    selected.sort((a,b)=>a-b);
    const slotUs=timing.maximumPulsesPerFrame?timing.frameDurationUs/timing.maximumPulsesPerFrame:timing.frameDurationUs;
    for(let rank=0;rank<selected.length;rank++){
      const contactIndex=selected[rank],onsetUs=Math.round((frameTimesS[frame]*1e6+rank*slotUs)*1000)/1000;
      if(onsetUs+timing.pulseDurationUs>durationS*1e6+0.001){tailPulsesOmitted++;continue;}
      const amplitudeUA=candidateCurrents[offset+contactIndex];currentsUA[offset+contactIndex]=amplitudeUA;
      events.push({onsetUs,contactIndex,amplitudeUA,frameIndex:frame});perContactPulseCounts[contactIndex]++;maxCurrent=Math.max(maxCurrent,amplitudeUA);sumChargeNC+=amplitudeUA*config.phaseWidthUs/1000;
    }
  }
  const perContactRateHz=Float64Array.from(perContactPulseCounts,n=>n/durationS);
  const metrics={durationS,frameCount,totalPulses:events.length,totalPulseRateHz:events.length/durationS,maxOccupancy:timing.maxOccupancy,actualOccupancy:events.length*timing.slotDurationUs/(durationS*1e6),maximumPulsesPerFrame:timing.maximumPulsesPerFrame,perContactPulseCounts,perContactRateHz,chargePerPhaseMaxNC:maxCurrent*config.phaseWidthUs/1000,summedFirstPhaseChargeNC:sumChargeNC,summedAbsoluteChargeNC:2*sumChargeNC,netChargeNC:0,peakCurrentUA:maxCurrent,tailPulsesOmitted};
  return {config,sampleRate,durationS,bands,frameTimesS,envelopes,normalizedEnvelopes,currentsUA,events,metrics,warnings:validation.warnings,model:'Generic fourth-order filter-bank CIS / n-of-m, v1'};
}

export function expandPulsePhases(event,config){
  const sign=config.polarity==='anodic'?1:-1;
  return [{onsetUs:event.onsetUs,durationUs:config.phaseWidthUs,contactIndex:event.contactIndex,currentUA:sign*event.amplitudeUA},{onsetUs:event.onsetUs+config.phaseWidthUs+config.gapUs,durationUs:config.phaseWidthUs,contactIndex:event.contactIndex,currentUA:-sign*event.amplitudeUA}];
}

export function assertPulseSchedule(result){
  const {config,events}=result,check=validateProcessorConfig(config,result.sampleRate);
  if(!check.valid)throw new Error(check.errors.join(' '));
  let previousEndUs=-Infinity,maxChargeNC=0,netChargeNC=0;
  const countsByFrame=new Map();
  for(const event of events){
    if(!Number.isFinite(event.onsetUs)||event.onsetUs<0||!Number.isFinite(event.amplitudeUA)||event.amplitudeUA<=0)throw new Error('Invalid pulse event.');
    if(!Number.isInteger(event.contactIndex)||event.contactIndex<0||event.contactIndex>=config.channelCount||!config.activeMask[event.contactIndex])throw new Error('Pulse delivered to a disabled or invalid contact.');
    if(event.amplitudeUA>config.maxCurrentUA+1e-4||event.amplitudeUA<config.minCurrentUA-1e-4)throw new Error('Pulse current exceeds the configured range.');
    if(event.onsetUs<previousEndUs-0.0011)throw new Error('Sequential pulse events overlap or violate the guard interval.');
    const phases=expandPulsePhases(event,config),q0=phases[0].currentUA*phases[0].durationUs/1000,q1=phases[1].currentUA*phases[1].durationUs/1000;
    netChargeNC+=q0+q1;
    if(Math.abs(q0+q1)>1e-10)throw new Error('A biphasic pulse is not charge balanced.');
    maxChargeNC=Math.max(maxChargeNC,Math.abs(q0));
    const pulseEnd=phases[1].onsetUs+phases[1].durationUs;
    if(pulseEnd>result.durationS*1e6+0.0011)throw new Error('A pulse extends beyond the simulated duration.');
    previousEndUs=pulseEnd+config.guardUs;
    const set=countsByFrame.get(event.frameIndex)||new Set();
    if(set.has(event.contactIndex))throw new Error('A contact is stimulated twice in the same frame.');
    set.add(event.contactIndex);countsByFrame.set(event.frameIndex,set);
    if(set.size>check.timing.maximumPulsesPerFrame)throw new Error('A frame exceeds its configured number of maxima.');
    const delivered=result.currentsUA[event.frameIndex*config.channelCount+event.contactIndex];
    if(Math.abs(delivered-event.amplitudeUA)>1e-4)throw new Error('Electrodogram and pulse events disagree.');
  }
  return {valid:true,totalPulses:events.length,netChargeNC,maxChargePerPhaseNC:maxChargeNC};
}
