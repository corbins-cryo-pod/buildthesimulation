/** Reciprocal contact solve for the Stage 2 fine magnetic mesh.
 * The finite contact load and physical matrix are unchanged from Stage 1.
 */
import {solveInductionReference} from './induction-precision-solve.mjs';
import {sampleMembraneTransfer} from '../field-stage1.mjs';
export function solvePrecisionContact(model,channel,options={}){
 if(!model.geometry?.constructPresent)throw new Error('No-device geometry has no implant recording contacts.');
 if(!channel||typeof channel!=='object'||Array.isArray(channel))throw new Error('An explicit contact channel is required.');
 const {wellId,sourceContactId,returnContactId}=channel,source=model.contacts.find(c=>c.id===sourceContactId),sink=model.contacts.find(c=>c.id===returnContactId);
 if(!source||!sink||source===sink||source.wellId!==wellId||sink.wellId!==wellId)throw new Error('Distinct source and return contacts must belong to the declared well.');
 const load=new Float64Array(model.points.length);for(const [i,w]of source.load)load[i]+=w;for(const [i,w]of sink.load)load[i]-=w;
 const r=solveInductionReference(model,load,options);r.channel={...channel};r.diagnostics.contactAreasUm2={source:source.areaUm2,return:sink.areaUm2};r.diagnostics.units={potential:'mV/uA',current:'uA',coordinates:'um',conductivity:'S/m'};
 return r;
}
export function samplePrecisionContact(r,m,cell){
 const hi=sampleMembraneTransfer(r,m,cell),lo=sampleMembraneTransfer({...r,potentialMvPerUa:r.potentialLowMvPerUa},m,cell);return Float64Array.from(hi,(x,i)=>x+lo[i]);
}
