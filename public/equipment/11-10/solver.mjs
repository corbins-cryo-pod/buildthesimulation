const lock=Object.freeze;
export const modes=lock(['complete','gap']);
export const labels=lock({complete:'Continuous ideal series card',gap:'Card with an ideal open gap'});
export const sourceV=1;
export const resistors=lock([lock({id:'DRAWN-R1',ohm:3300}),lock({id:'DRAWN-R2',ohm:6800})]);
export function solve(mode){
 if(!modes.includes(mode))throw new RangeError('Choose one of the two fixed passive card snapshots.');
 const closed=mode==='complete',equivalentOhm=closed?resistors.reduce((s,r)=>s+r.ohm,0):null,currentA=closed?sourceV/equivalentOhm:0,
  resistiveDrops=resistors.map(r=>({...r,dropV:currentA*r.ohm})),gapDropV=closed?0:sourceV;
 return {state:closed?'closed-series':'open-series',equivalentOhm,currentMicroamp:currentA*1e6,resistiveDrops,gapDropV,referenceV:sourceV};
}
export const blank=()=>({mode:'complete',revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='select'){
  const mode=a.type==='cycle'?modes[(modes.indexOf(s.mode)+1)%modes.length]:a.payload;solve(mode);return {...s,mode,report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive reading of the unrelated synthetic card is available.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-ideal-series-card.v1',revision,cardId:'SYNTHETIC-PAPER-SERIES-01',
  sourceRevision:'SERIES-DIAGRAM-A',mode:s.mode,units:{potential:'V',resistance:'Ω',current:'µA'},...solve(s.mode),
  provenance:'Fixed mathematical drawing with a normalized 1 V reference, not an equipment configuration, measured trace, specimen or operational output.'}};
}
