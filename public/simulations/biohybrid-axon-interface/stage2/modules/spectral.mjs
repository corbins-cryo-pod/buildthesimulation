import {range,finite} from './common.mjs';
/** Linear interpolation only inside the supplied action-spectrum support. */
export function interpolateSpectrum(curve,wavelengthNm) {
 if(!Array.isArray(curve)||curve.length<2||curve.length>10000)throw new Error('An action spectrum needs 2–10000 tabulated points.');
 let prev=-Infinity;
 for(const row of curve){if(!Array.isArray(row)||row.length!==2)throw new Error('Use [wavelength nm, sensitivity] rows.');range(row[0],'wavelength',200,1500);range(row[1],'sensitivity',0,1);if(row[0]<=prev)throw new Error('Spectrum wavelengths must be strictly increasing.');prev=row[0];}
 range(wavelengthNm,'emitter wavelength',200,1500);if(wavelengthNm<curve[0][0]||wavelengthNm>curve.at(-1)[0])throw new Error('Emission lies outside the supplied action-spectrum support. No spectral extrapolation.');
 const upper=curve.findIndex(r=>r[0]>=wavelengthNm);if(upper===0)return curve[0][1];const a=curve[upper-1],b=curve[upper];return a[1]+(b[1]-a[1])*(wavelengthNm-a[0])/(b[0]-a[0]);
}
export function spectralPhotonRate(emitterBins,actionCurve,crossSectionM2=12e-20) {
 range(crossSectionM2,'absorption cross-section',0,1e-16);if(!Array.isArray(emitterBins)||emitterBins.length<1||emitterBins.length>10000)throw new Error('Explicit spectral power bins required.');
 let absorbedPerMoleculePerMs=0,powerMwMm2=0;
 for(const bin of emitterBins){range(bin.wavelengthNm,'wavelength',200,1500);range(bin.integratedIrradianceMwMm2,'integrated spectral-bin power',0,1000);const response=interpolateSpectrum(actionCurve,bin.wavelengthNm);
  // mW/mm2 -> W/m2 (x1000); per-second -> per-ms (/1000).
  absorbedPerMoleculePerMs+=crossSectionM2*response*bin.integratedIrradianceMwMm2*bin.wavelengthNm*1e-9/1.986446e-25;powerMwMm2+=bin.integratedIrradianceMwMm2;
 }
 return {absorbedPerMoleculePerMs,powerMwMm2,meaning:'Forward photon-weighted action-spectrum overlap; not a prediction of independently controllable cells.'};
}
export function hypotheticalSpectralExample(count=2) {
 if(![2,3,4].includes(count))throw new Error('Choose two, three or four hypothetical spectral populations.');
 const peaks=[470,535,590,650].slice(0,count),wavelengths=Array.from({length:111},(_,i)=>350+4*i);
 const curves=peaks.map(peak=>wavelengths.map(lambda=>{const main=Math.exp(-.5*((lambda-peak)/35)**2),blueTail=peak>470?.18*Math.exp(-.5*((lambda-460)/55)**2):0;return [lambda,(main+blueTail)/1.18];}));
 // These curves are declared mathematical examples, not named opsin measurements.
 const matrix=peaks.map(lambda=>curves.map(curve=>spectralPhotonRate([{wavelengthNm:lambda,integratedIrradianceMwMm2:1}],curve).absorbedPerMoleculePerMs));
 return {peaksNm:peaks,matrix,curves,evidence:'hypothetical',meaning:'Illustrative spectral overlap, including a blue-sensitive tail. No claim of two-, three- or fourfold channel gain; real action spectra and kinetics must replace these examples.'};
}
