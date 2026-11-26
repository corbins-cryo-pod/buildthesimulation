// Convert an ideal bts.cell.three-electrode.v1 boundary result to Gamry 09-01's virtual solve() arguments.
// This is a passive transfer-function equivalence. It never modifies actual hardware wiring.
export function toGamryEisConfig(packet){
 const p=packet,g=p?.cellCircuit,stim=p?.excitation;
 const bound=(z,a,b)=>Number.isFinite(z)&&z>=a&&z<=b;
 if(p?.schema!=='bts.cell.three-electrode.v1'||p?.deviceId!=='09-12'||p.provenance?.origin!=='simulated'||g?.referredTo!=='WE-minus-RE'||!g?.referenceInputIdeal||
  !Number.isSafeInteger(p.revision)||p.revision<1||typeof p.sampleId!=='string'||typeof p.contactId!=='string'||
  p.leadMap?.WE!=='WE'||p.leadMap?.RE!=='RE'||p.leadMap?.CE!=='CE')throw Error('Expected a valid simulated 09-12 three-electrode boundary result.');
 if(!bound(stim?.startHz,.1,1e5)||!bound(stim?.stopHz,stim?.startHz,1e5)||!bound(stim?.voltageRmsV,.0001,.03)||!Number.isInteger(stim?.samples)||!bound(stim.samples,5,181))throw Error('The 09-01 EIS solver requires at least 5 frequency samples.');
 let rsOhm,rpOhm,cF;
 if(g.kind==='series-r' && bound(g.solutionOhm,1,150000) && g.interfaceOhm===null && g.interfaceFarad===null){
  rsOhm=0;rpOhm=g.solutionOhm;cF=0;
 }else if(g.kind==='series-r-plus-parallel-rc' && bound(g.solutionOhm,1,1e5) && bound(g.interfaceOhm,1,1e5)&&bound(g.interfaceFarad,1e-8,.001)){
  rsOhm=g.solutionOhm;rpOhm=g.interfaceOhm;cF=g.interfaceFarad;
 }else{throw Error('Not representable in the 09-01 circuit bounds (RC mode permits up to 100 kΩ series resistance).')}
 return {config:{sampleId:p.sampleId,rsOhm,rpOhm,cF,pure:false,mode:'eis',fLo:stim.startHz,fHi:stim.stopHz,n:stim.samples,vRms:stim.voltageRmsV,currentRangeA:.6},nextParentRevision:p.revision,
  inputMetadata:{sourceDeviceId:'09-12',sampleId:p.sampleId,contactId:p.contactId,sourceTerminals:p.terminals,note:'WE–RE electrical equivalence only. Keep source contact/terminal identities with the receipt; this solver uses dummy-board terminal IDs.'}};
}
