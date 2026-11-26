// Immutable authored rectangle widths. Neither this module nor its output represents instrument readings.
const raw=(label,a,b)=>Object.freeze({label,A:Object.freeze(a),B:Object.freeze(b)});
export const fixtures=Object.freeze({
 growth:raw('One label grows',[100,110],[100,100]),
 mixed:raw('Labels change in opposite directions',[100,85],[100,105]),
 zero:raw('Zero-width reference',[0,15],[100,100])
});
export const initial=()=>({fixture:'growth',readRevision:0,result:null,error:''});
const width=a=>({referenceMm:a[0],comparisonMm:a[1],differenceMm:a[1]-a[0],relativePercent:a[0]>0?100*(a[1]-a[0])/a[0]:null,status:a[0]>0?'defined':'undefined zero reference'});
export function read(id,revision=0){
 if(!Object.hasOwn(fixtures,id))throw Error('Choose a stored drawing comparison.');
 const f=fixtures[id],A=width(f.A),B=width(f.B);
 return {schema:'bts.detached-reference-width.v1',deviceId:'15-08',kind:'original geometry drawing',sourceId:'detached-rectangle-pairs-01',sourceRevision:0,readRevision:revision+1,fixture:id,
  labels:{A,B},units:{width:'mm (illustration)',relative:'%'},status:A.relativePercent===null||B.relativePercent===null?'partial':'defined',
  caseLabel:f.label,displayDeltaA:A.relativePercent,displayDeltaB:B.relativePercent,deviceStateModeled:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,fixture:p},'view');
 if(id==='view'){try{const r=read(s.fixture,s.readRevision);return {...s,result:r,readRevision:r.readRevision,error:''}}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown detached drawing action.');
}
