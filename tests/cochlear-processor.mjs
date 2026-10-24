import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PROCESSOR_CONFIG,validateProcessorConfig,makeLogBands,bandpassCoefficients,lowpassCoefficients,runProcessor,expandPulsePhases,assertPulseSchedule} from '../src/lib/cochlear/processor.js';
import {createSyntheticAudio,synthesizeVocoder} from '../src/lib/cochlear/audio.js';

function magnitude(coefficients,frequency,sampleRate){
  const omega=2*Math.PI*frequency/sampleRate;let product=1;
  for(const c of coefficients){const nr=c.b0+c.b1*Math.cos(omega)+c.b2*Math.cos(2*omega),ni=-c.b1*Math.sin(omega)-c.b2*Math.sin(2*omega),dr=1+c.a1*Math.cos(omega)+c.a2*Math.cos(2*omega),di=-c.a1*Math.sin(omega)-c.a2*Math.sin(2*omega);product*=Math.hypot(nr,ni)/Math.hypot(dr,di);}
  return product;
}
test('cochlear filter bank has documented -3 dB edges and anatomically ordered bands',()=>{
  const bands=makeLogBands(12,200,8000);assert.equal(bands[0].highHz,8000);assert.equal(bands.at(-1).lowHz,200);
  for(const band of bands){const coefficients=bandpassCoefficients(band.lowHz,band.highHz,24000);assert.ok(Math.abs(magnitude(coefficients,band.lowHz,24000)-Math.SQRT1_2)<1e-9);assert.ok(Math.abs(magnitude(coefficients,band.highHz,24000)-Math.SQRT1_2)<1e-9);if(band.index)assert.ok(bands[band.index-1].centerHz>band.centerHz);}
  const lowpass=lowpassCoefficients(150,24000);assert.ok(Math.abs(magnitude(lowpass,0,24000)-1)<1e-10);assert.ok(Math.abs(magnitude(lowpass,150,24000)-Math.SQRT1_2)<1e-9);
});
test('cochlear scheduler rejects impossible CIS timing and admits feasible maxima selection',()=>{
  const impossible=validateProcessorConfig({channelCount:22,frameRateHz:900,guardUs:0});assert.equal(impossible.valid,false);assert.ok(Math.abs(impossible.timing.maxOccupancy-1.1484)<1e-12);
  const possible=validateProcessorConfig({channelCount:22,frameRateHz:900,maxima:8,strategy:'nofm',guardUs:0});assert.equal(possible.valid,true);assert.ok(Math.abs(possible.timing.maxOccupancy-0.4176)<1e-12);assert.ok(validateProcessorConfig(DEFAULT_PROCESSOR_CONFIG).valid);
});
test('digital silence produces no pulses even with a positive minimum current',()=>{
  const result=runProcessor(new Float32Array(2400),24000,{minCurrentUA:60});assert.equal(result.events.length,0);assert.ok(result.currentsUA.every(v=>v===0));assert.equal(result.metrics.summedAbsoluteChargeNC,0);assert.equal(assertPulseSchedule(result).valid,true);
});
test('zero-current control is valid and emits no pulses for audible input',()=>{
  const source=createSyntheticAudio({kind:'tone',toneHz:1000}),config={minCurrentUA:0,maxCurrentUA:0};assert.equal(validateProcessorConfig(config).valid,true);
  const result=runProcessor(source.samples,source.sampleRate,config);assert.ok(result.envelopes.some(v=>v>0));assert.equal(result.events.length,0);assert.equal(result.metrics.peakCurrentUA,0);assert.ok(result.currentsUA.every(v=>v===0));assert.equal(assertPulseSchedule(result).valid,true);
});
test('steady tone peaks in its corresponding analysis band after the causal onset transient',()=>{
  const bands=makeLogBands(12,200,8000),target=7,source=createSyntheticAudio({kind:'tone',toneHz:bands[target].centerHz,durationS:0.2}),result=runProcessor(source.samples,source.sampleRate);
  const energy=Array.from({length:12},(_,contact)=>{let sum=0;for(let frame=30;frame<result.frameTimesS.length-5;frame++)sum+=result.envelopes[frame*12+contact]**2;return sum;});
  assert.equal(energy.indexOf(Math.max(...energy)),target);assert.ok(result.events.length>0);assert.equal(assertPulseSchedule(result).valid,true);
});
test('n-of-m excludes disabled contacts before ranking and obeys maxima',()=>{
  const source=createSyntheticAudio({kind:'noise',durationS:0.08}),activeMask=Array.from({length:12},(_,i)=>i>=6),result=runProcessor(source.samples,source.sampleRate,{strategy:'nofm',maxima:3,activeMask}),frames=new Map();
  for(const event of result.events){assert.ok(event.contactIndex>=6);frames.set(event.frameIndex,(frames.get(event.frameIndex)||0)+1);}
  assert.ok([...frames.values()].every(n=>n<=3));assert.ok([...frames.values()].some(n=>n===3));assert.equal(assertPulseSchedule(result).valid,true);
});
test('pulse phases have correct signs, return charge, microsecond duration and exported current',()=>{
  const source=createSyntheticAudio({kind:'tone'}),result=runProcessor(source.samples,source.sampleRate,{phaseWidthUs:25,gapUs:8,maxCurrentUA:200,polarity:'cathodic'}),event=result.events[Math.floor(result.events.length/2)],[first,second]=expandPulsePhases(event,result.config);
  assert.equal(first.currentUA,-event.amplitudeUA);assert.equal(second.currentUA,event.amplitudeUA);assert.equal(second.onsetUs-first.onsetUs,33);assert.equal(first.currentUA*first.durationUs+second.currentUA*second.durationUs,0);assert.ok(result.metrics.chargePerPhaseMaxNC<=5.000001);assert.ok(Math.abs(result.metrics.maxOccupancy-0.432)<1e-12);assert.equal(result.metrics.netChargeNC,0);assert.equal(assertPulseSchedule(result).valid,true);
});
test('pulse audit detects overlapping schedule and electrodogram corruption',()=>{
  const source=createSyntheticAudio({kind:'noise'}),result=runProcessor(source.samples,source.sampleRate),originalTime=result.events[1].onsetUs;result.events[1].onsetUs=result.events[0].onsetUs;assert.throws(()=>assertPulseSchedule(result),/overlap/);result.events[1].onsetUs=originalTime;
  const event=result.events[0];result.currentsUA[event.frameIndex*12+event.contactIndex]=0;assert.throws(()=>assertPulseSchedule(result),/disagree/);
});
test('electrodogram, disabled contacts and selection are deterministic',()=>{
  const source=createSyntheticAudio({kind:'synthetic-vowel',durationS:0.1}),config={strategy:'nofm',maxima:5,activeMask:Array.from({length:12},(_,i)=>i!==3)},a=runProcessor(source.samples,source.sampleRate,config),b=runProcessor(source.samples,source.sampleRate,config);
  assert.deepEqual(a.events,b.events);assert.deepEqual(a.currentsUA,b.currentsUA);assert.equal(a.metrics.perContactPulseCounts[3],0);assert.equal(a.metrics.perContactRateHz[3],0);
});
test('vocoder preserves silence, reports normalization and is repeatable for a noise seed',()=>{
  const silence=runProcessor(new Float32Array(1920),24000);assert.ok(synthesizeVocoder(silence).samples.every(v=>v===0));
  const audio=createSyntheticAudio({kind:'synthetic-vowel',durationS:0.15}),result=runProcessor(audio.samples,audio.sampleRate,{strategy:'nofm',maxima:8}),a=synthesizeVocoder(result,{carrier:'noise',seed:73}),b=synthesizeVocoder(result,{carrier:'noise',seed:73});
  assert.deepEqual(a.samples,b.samples);assert.ok(a.rms>0&&a.peak<=0.900001);assert.equal(a.normalized,true);assert.match(a.label,/not an individual/);
  const shifted=synthesizeVocoder(result,{carrier:'sine',shiftSemitones:12});assert.ok(Math.abs(shifted.carrierFrequenciesHz[5]/result.bands[5].centerHz-2)<1e-12);assert.ok(shifted.omittedCarrierCount>0);
});
test('non-finite audio and invalid processing parameters are rejected rather than rendered',()=>{
  assert.throws(()=>runProcessor(Float32Array.of(0,NaN),24000),/non-finite/);assert.equal(validateProcessorConfig({phaseWidthUs:0}).valid,false);assert.equal(validateProcessorConfig({highHz:12000},24000).valid,false);assert.equal(validateProcessorConfig({activeMask:[true]}).valid,false);
  const allOff=runProcessor(Float32Array.of(0,1,0),24000,{activeMask:Array(12).fill(false)});assert.equal(allOff.events.length,0);
});
test('AM modulation depth zero equals its carrier and invalid depths are rejected',()=>{
  const options={toneHz:1000,durationS:0.1,amplitude:0.6},tone=createSyntheticAudio({...options,kind:'tone'}),unmodulated=createSyntheticAudio({...options,kind:'am',modulationHz:40,modulationDepth:0});assert.deepEqual(unmodulated.samples,tone.samples);
  const modulated=createSyntheticAudio({...options,kind:'am',modulationHz:40,modulationDepth:0.8});assert.notDeepEqual(modulated.samples,unmodulated.samples);assert.ok(modulated.rms<unmodulated.rms);assert.match(modulated.label,/80% depth/);assert.throws(()=>createSyntheticAudio({kind:'am',modulationDepth:1.1}),/Modulation depth/);
});
