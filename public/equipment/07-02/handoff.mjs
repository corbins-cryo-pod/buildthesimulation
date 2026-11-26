import { CONFIG,simulate as replayCabinet } from '../07-01/session.mjs';
import { SCHEMA,validateSamples } from './solver.mjs';

export function fromCabinet(snapshot,end_s) {
  if(snapshot?.schema!=='bts.equipment.07-01.sash-session.v1' || snapshot.deviceId!=='07-01' || snapshot.complete!==true || snapshot.state?.timeS!==snapshot.input?.durationS)throw Error('Choose a completed 07-01 session export.');
  const session=replayCabinet(snapshot.input);
  const available=session.sampleHistory.filter(s=>s.visits.at(-1)?.removedS!=null);
  if(!available.length || available.length>12)throw Error('The cabinet session must release 1–12 sealed specimens.');
  const batches=Math.ceil(available.length/3);
  return validateSamples(available.map((s,i)=>({
    sampleId:s.sampleId,shelf:i%3+1,enter_s:Math.floor(i/3)*end_s/batches,leave_s:(Math.floor(i/3)+1)*end_s/batches,
    parentRevision:0,history:[{deviceId:'07-01',sessionId:session.sessionId,operation:'sealed-token-handling',sourceSchema:session.schema,
      sourceClock:'seconds from cabinet session start',visits:s.visits,warningDurationS:s.warningDurationS}]
  })),end_s);
}
export function toCabinet(result,sessionId) {
  if(result?.schema!==SCHEMA || !result.samples?.length)throw Error('Run the chamber experiment before exporting a transfer.');
  const zero=Math.min(...result.samples.map(s=>s.leave_s));
  // The receiving station resolves one millisecond. Preserve original times in the sidecar.
  const events=result.samples.flatMap(s=>{
    const tick=Math.round((s.leave_s-zero)*1000);
    return [{timeS:tick/1000,type:'load',sampleId:s.sampleId,sampleKind:CONFIG.sampleKind},
      {timeS:(tick+30000)/1000,type:'remove',sampleId:s.sampleId,sampleKind:CONFIG.sampleKind}];
  }).sort((a,b)=>a.timeS-b.timeS);
  const input=replayCabinet({sessionId,durationS:events.at(-1).timeS,initialSashMm:CONFIG.nominalMm,events}).input;
  return {...input,incubatorSource:{schema:result.schema,deviceId:result.deviceId,provenance:result.provenance,
    cabinetZeroAtIncubator_s:zero,plannedVisit_s:30,samples:result.samples.map(s=>({sampleId:s.sampleId,revision:s.revision,
      parentRevision:s.parentRevision,leave_s:s.leave_s,contactIds:s.contactIds??[],history:s.history}))}};
}
