import {spectralFamilies,spectralWavelengths,createSpectralPhotocurrent,SPECTRAL_SOURCES} from './spectral-opsin.mjs';
import {surfaceCoefficients} from './optical-surface.mjs';

export function experimentChannels(settings,geometry){
 if(settings.modality!=='spectral')return geometry.channels.map((c,i)=>({...c,sourceIndex:i}));
 return geometry.channels.flatMap((c,i)=>spectralWavelengths(settings.spectralFamilyCount).map(nm=>({...c,id:c.id+'-'+nm+'nm',sourceIndex:i,wavelengthNm:nm})));
}
export function wavelengthTransport(settings,nm){
 return {muAbsPerMm:settings.muAbs470PerMm*(nm/470)**(-settings.absorptionExponent),muScatterPerMm:settings.muScatter470PerMm*(nm/470)**(-settings.scatteringExponent),provenance:'Hypothetical homogeneous coefficients and power-law wavelength dependence, exposed for sensitivity. Not a measured human organoid/tissue spectrum.'};
}
export function spectralPhoto(settings,morphology,optical,cellIndex,amplitude,{side='mean',blocked=false,expressionScale=1,rateScale=1,convention='declared',traceStride=16}={}){
 return createSpectralPhotocurrent(morphology,{modelId:spectralFamilies(settings.spectralFamilyCount)[cellIndex%settings.spectralFamilyCount].id,bins:[{nm:optical.wavelengthNm,fluencePerMw:surfaceCoefficients(optical,morphology,cellIndex,side)}],emittedMw:amplitude,expressionMultiplier:settings.spectralExpression*expressionScale,rateScale:settings.spectralRateScale*rateScale,convention,pulseWidthMs:settings.opticalPulseMs,blocked,traceStride});
}
export function spectralAssignment(settings,geometry){
 if(settings.modality!=='spectral')return null;
 const families=spectralFamilies(settings.spectralFamilyCount);
 return {families,cells:geometry.cells.map((c,j)=>({cellId:c.id,modelId:families[j%families.length].id})),sources:SPECTRAL_SOURCES,channelGainAssumed:false,commonActionSupportNm:[470,560],illumination:'Separate equal-emitted-power monochromatic trials at each physical source and wavelength. Mixed-bin photocurrents are independently tested; simultaneous source patterns are not inferred from this isolated-input matrix.',kineticTemperature:'Published room-temperature rates applied on a 37 C cable without a validated Q10; explicit 0.5x/2x rate probes.',expression:'Published whole-cell conductance multiplied by an exposed hypothetical expression factor; normalized soma area weights preserve total conductance on mesh refinement.',uncertainty:'Every pair also runs lower/upper photon-field probes, alternate ChR2 normalization, 0.5x/2x kinetic-rate probes and 0.5x/2x expression probes. These finite probes are not a certified nonlinear uncertainty enclosure.'};
}
