/** Deterministic test sounds and acoustic vocoder demonstrations. No DOM. */
import {bandpassCoefficients,makeCascade} from './processor.js';
const TAU=Math.PI*2;
export function seededRandom(seed=12345){let value=(Number(seed)>>>0)||0x6d2b79f5;return()=>{value=(value+0x6d2b79f5)>>>0;let x=Math.imul(value^(value>>>15),value|1);x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296;};}
function audioStats(samples){let peak=0,energy=0;for(const value of samples){peak=Math.max(peak,Math.abs(value));energy+=value*value;}return {peak,rms:Math.sqrt(energy/Math.max(1,samples.length))};}

export function createSyntheticAudio(options={}){
  const {durationS=0.08,sampleRate=24000,toneHz=options.frequencyHz??1000,secondToneHz=2400,modulationHz=30,modulationDepth=0.8,seed=12345,amplitude=0.6,lowHz=250,highHz=6500}=options;
  const kind=options.kind==='speech-like'?'synthetic-vowel':(options.kind||'tone');
  if(!(sampleRate>=1000&&Number.isFinite(sampleRate)))throw new Error('Invalid synthesis sample rate.');
  if(!(durationS>0&&durationS<=60))throw new Error('Synthetic duration must be positive and at most 60 seconds.');
  if(!(amplitude>=0&&amplitude<=1))throw new Error('Synthetic peak amplitude must be from 0 to 1.');
  const usedFrequencies=kind==='sweep'?[['lowHz',lowHz],['highHz',highHz]]:kind==='two-tone'?[['toneHz',toneHz],['secondToneHz',secondToneHz]]:['tone','am'].includes(kind)?[['toneHz',toneHz]]:[];
  for(const [name,frequency]of usedFrequencies)if(!(frequency>0&&frequency<sampleRate/2))throw new Error(`${name} must be positive and below Nyquist.`);
  if(kind==='sweep'&&!(highHz>lowHz))throw new Error('Sweep highHz must exceed lowHz.');
  if(!(modulationHz>=0&&modulationHz<sampleRate/2))throw new Error('Invalid modulation rate.');
  if(!Number.isFinite(modulationDepth)||modulationDepth<0||modulationDepth>1)throw new Error('Modulation depth must be from 0 to 1.');
  if(!['tone','two-tone','sweep','am','synthetic-vowel','noise','silence'].includes(kind))throw new Error('Unknown synthetic sound.');
  const samples=new Float32Array(Math.max(1,Math.round(durationS*sampleRate))),actualDuration=samples.length/sampleRate,random=seededRandom(seed),rampS=Math.min(0.004,actualDuration/8),sweepLogRatio=Math.log(highHz/lowHz);
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate;let value=0;
    if(kind==='tone')value=Math.sin(TAU*toneHz*t);
    if(kind==='two-tone')value=0.5*(Math.sin(TAU*toneHz*t)+Math.sin(TAU*secondToneHz*t));
    if(kind==='am')value=(1+modulationDepth*Math.sin(TAU*modulationHz*t))/(1+modulationDepth)*Math.sin(TAU*toneHz*t);
    if(kind==='sweep'){const phaseCycles=lowHz*actualDuration*(Math.exp(sweepLogRatio*t/actualDuration)-1)/sweepLogRatio;value=Math.sin(TAU*phaseCycles);}
    if(kind==='noise')value=2*random()-1;
    if(kind==='synthetic-vowel'){
      const section=Math.min(2,Math.floor(t/Math.max(0.16,actualDuration/3))),formants=[[650,1100,2500],[350,2000,2900],[400,800,2400]][section],fundamental=120;
      for(let harmonic=1;harmonic<=Math.min(50,Math.floor((sampleRate/2-100)/fundamental));harmonic++){
        const frequency=harmonic*fundamental;let weight=0.03/Math.sqrt(harmonic);
        for(const center of formants)weight+=Math.exp(-0.5*((frequency-center)/(center<1000?100:160))**2)/Math.sqrt(harmonic);
        value+=weight*Math.sin(TAU*frequency*t+0.31*harmonic*harmonic);
      }
      value*=0.75+0.25*Math.cos(TAU*3*t);
    }
    const attack=Math.min(1,t/rampS),release=Math.min(1,Math.max(0,(actualDuration-t-1/sampleRate)/rampS));
    const ramp=Math.sin(Math.PI*attack/2)**2*Math.sin(Math.PI*release/2)**2;
    samples[i]=value*ramp;
  }
  const raw=audioStats(samples);if(raw.peak>0){const gain=amplitude/raw.peak;for(let i=0;i<samples.length;i++)samples[i]*=gain;}
  const descriptions={tone:`Synthetic ${toneHz} Hz tone`,'two-tone':`Synthetic ${toneHz} + ${secondToneHz} Hz tones`,sweep:`Synthetic logarithmic sweep, ${lowHz}–${highHz} Hz`,am:`Synthetic ${toneHz} Hz carrier, ${modulationHz} Hz amplitude modulation at ${(modulationDepth*100).toFixed(0)}% depth`,'synthetic-vowel':'Synthetic vowel-like harmonic sound (not recorded speech)',noise:'Seeded synthetic white noise',silence:'Digital silence'};
  return {samples,sampleRate,durationS:actualDuration,kind,label:descriptions[kind],seed,...audioStats(samples)};
}

export function synthesizeVocoder(result,options={}){
  const {carrier='noise',seed=12345,shiftSemitones=0,spreadOctaves=0,normalize=true,targetRms=0.12,synthesisFrequenciesHz=null}=options;
  if(!['noise','sine'].includes(carrier))throw new Error('Vocoder carrier must be noise or sine.');
  if(!Number.isFinite(shiftSemitones)||!Number.isFinite(spreadOctaves)||spreadOctaves<0)throw new Error('Invalid vocoder frequency mapping.');
  if(!(targetRms>0&&targetRms<1))throw new Error('Vocoder target RMS must be between 0 and 1.');
  const {sampleRate,durationS,bands,config,envelopes,currentsUA,frameTimesS}=result;
  const count=config.channelCount,frameCount=frameTimesS.length,sampleCount=Math.max(1,Math.round(durationS*sampleRate));
  if(synthesisFrequenciesHz&&(synthesisFrequenciesHz.length!==count||Array.from(synthesisFrequenciesHz).some(f=>!Number.isFinite(f)||f<=0)))throw new Error('Provide one positive synthesis frequency per contact.');
  const samples=new Float32Array(sampleCount),selected=new Float32Array(frameCount*count);
  for(let index=0;index<selected.length;index++)selected[index]=currentsUA[index]>0?envelopes[index]:0;
  const weights=Array.from({length:count},(_,output)=>{if(!spreadOctaves)return Array.from({length:count},(_,input)=>Number(input===output));const row=bands.map(b=>Math.exp(-0.5*(Math.log2(b.centerHz/bands[output].centerHz)/spreadOctaves)**2)),sum=row.reduce((a,b)=>a+b,0);return row.map(w=>w/sum);});
  const mixed=new Float32Array(selected.length);
  for(let frame=0;frame<frameCount;frame++)for(let output=0;output<count;output++){let sum=0;for(let input=0;input<count;input++)sum+=weights[output][input]*selected[frame*count+input];mixed[frame*count+output]=sum;}
  const frequencyScale=2**(shiftSemitones/12),warnings=[],carrierFrequenciesHz=[];let omittedCarrierCount=0;
  for(let contact=0;contact<count;contact++){
    const band=bands[contact],center=(synthesisFrequenciesHz?synthesisFrequenciesHz[contact]:band.centerHz)*frequencyScale;
    carrierFrequenciesHz.push(center);
    const edgeRatio=Math.sqrt(band.highHz/band.lowHz),lo=center/edgeRatio,hi=center*edgeRatio;
    if(center>=sampleRate*0.49||(carrier==='noise'&&hi>=sampleRate*0.49)){omittedCarrierCount++;continue;}
    const signal=new Float32Array(sampleCount);
    if(carrier==='sine'){for(let sample=0;sample<sampleCount;sample++)signal[sample]=Math.SQRT2*Math.sin(TAU*center*sample/sampleRate);}
    else{
      const random=seededRandom((seed+Math.imul(contact+1,0x9e3779b9))>>>0),filter=makeCascade(bandpassCoefficients(lo,hi,sampleRate));
      for(let i=0;i<Math.min(sampleRate,Math.ceil(8*sampleRate/lo));i++)filter(random()*2-1);
      for(let sample=0;sample<sampleCount;sample++)signal[sample]=filter(random()*2-1);
      const rms=audioStats(signal).rms;if(rms>0)for(let sample=0;sample<sampleCount;sample++)signal[sample]/=rms;
    }
    for(let sample=0;sample<sampleCount;sample++){
      const position=sample*config.frameRateHz/sampleRate,frame0=Math.min(frameCount-1,Math.floor(position)),frame1=Math.min(frameCount-1,frame0+1),blend=Math.max(0,Math.min(1,position-frame0)),a=mixed[frame0*count+contact],b=mixed[frame1*count+contact];
      samples[sample]+=(a+(b-a)*blend)*signal[sample];
    }
  }
  const fadeSamples=Math.min(Math.floor(sampleRate*0.004),Math.floor(sampleCount/8));
  for(let index=0;index<fadeSamples;index++){const gain=Math.sin(Math.PI*index/(2*Math.max(1,fadeSamples)))**2;samples[index]*=gain;samples[sampleCount-1-index]*=gain;}
  const before=audioStats(samples);let normalizationGain=normalize&&before.rms>0?targetRms/before.rms:1;
  if(before.peak*normalizationGain>0.9)normalizationGain=0.9/before.peak;
  for(let i=0;i<samples.length;i++)samples[i]*=normalizationGain;
  if(omittedCarrierCount)warnings.push(`${omittedCarrierCount} carrier(s) lie beyond the available audio bandwidth and were omitted.`);
  return {samples,sampleRate,durationS,carrier,seed,label:`${carrier==='noise'?'Noise':'Sine'} vocoder: acoustic coding demonstration, not an individual CI percept`,carrierFrequenciesHz,shiftSemitones,spreadOctaves,normalized:normalize,normalizationGain,targetRms,omittedCarrierCount,warnings,...audioStats(samples)};
}
