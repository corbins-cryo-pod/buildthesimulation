import {VERSION} from './common.mjs';
import {makeCoil,primaryCableProfile,inductanceEstimate,coilDrive} from './magnetic.mjs';
import {opticalAssay,ledEnergy} from './optics.mjs';
import {clampAssay} from './opsin.mjs';
import {analyzeStage1Export,analyzeMatrix,analyzeSweep} from './selectivity.mjs';
import {hypotheticalSpectralExample} from './spectral.mjs';
export function perform(kind,input,progress=()=>{}) {
 if(kind==='magnetic') {const coil=makeCoil(input.coil),L=inductanceEstimate(coil),drive=coilDrive(coil,{...input.drive,inductanceH:L.henry});return {modelVersion:VERSION,kind,coil,inductance:L,drive,profile:primaryCableProfile(coil,{...input.profile,dIdtAperS:drive.dIdtAperS}),recruitment:null,releaseQualified:false};}
 if(kind==='optical'){const transport=opticalAssay(input.transport,progress);return {modelVersion:VERSION,kind,transport,energy:ledEnergy(input.energy),releaseQualified:false};}
 if(kind==='opsin')return {...clampAssay(input),kind,releaseQualified:false};
 if(kind==='import')return {...analyzeStage1Export(input),kind,releaseQualified:false};
 if(kind==='matrix')return {...analyzeMatrix(input),kind,releaseQualified:false};
 if(kind==='sweep')return {...analyzeSweep(input),kind,releaseQualified:false};
 if(kind==='spectral')return {...hypotheticalSpectralExample(input.count),kind,releaseQualified:false};
 throw new Error('Unknown component experiment.');
}
if(typeof self!=='undefined'&&typeof Window==='undefined')self.onmessage=({data})=>{
 const {id,kind,input}=data;
 try{const result=perform(kind,input,p=>self.postMessage({id,type:'progress',...p}));self.postMessage({id,type:'result',result});}
 catch(error){self.postMessage({id,type:'error',message:error?.message??String(error)});}
};
