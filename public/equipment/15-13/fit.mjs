// Pure millimeter geometry. No signal, connection, hardware or specific device is represented.
const frozen=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(frozen);Object.freeze(o)}return o};
export const GAUGE=frozen({id:'BTS-OFFLINE-LOCATOR-1513',revision:1,body:{x:[-42,42],z:[-33,33]},positiveZRelief:{x:[7,25],z:[33,44]},blockId:'INERT-SHAPE-CARD'});
export const PARTS=frozen({NOMINAL:{size:[80,62],keyWidth:14,tip:42},ZERO:{size:[84,66],keyWidth:18,tip:44},LARGE:{size:[86,70],keyWidth:20,tip:47}});
const angles=[0,90,180,270];
function assertState(s){if(!s||!Object.hasOwn(PARTS,s.part)||!angles.includes(s.turnDeg)||typeof s.checked!=='boolean')throw RangeError('Unsupported offline locator pose')}
export function station(){return frozen({part:'NOMINAL',turnDeg:0,checked:false})}
export function act(s,action,value){
 assertState(s);
 if(action==='select'&&Object.hasOwn(PARTS,value))return frozen({...s,part:value,checked:false});
 if(action==='rotate')return frozen({...s,turnDeg:(s.turnDeg+90)%360,checked:false});
 if(action==='check')return frozen({...s,checked:true});
 if(action==='reset')return station();
 throw RangeError('Select one preset or turn, check, or reset the detached locator');
}
function range(x,z,q){
 if(q===0)return{x,z};
 if(q===90)return{x:z,z:[-x[1],-x[0]]};
 if(q===180)return{x:[-x[1],-x[0]],z:[-z[1],-z[0]]};
 return{x:[-z[1],-z[0]],z:x};
}
export function read(s){
 assertState(s);
 const p=PARTS[s.part],halfX=p.size[0]/2,halfZ=p.size[1]/2;
 const body=range([-halfX,halfX],[-halfZ,halfZ],s.turnDeg),key=range([16-p.keyWidth/2,16+p.keyWidth/2],[halfZ,p.tip],s.turnDeg);
 const c={positiveX:42-body.x[1],negativeX:body.x[0]+42,positiveZ:33-body.z[1],negativeZ:body.z[0]+33};
 const axes=key.z[1]<=33?{x:[-42,42],tipZ:33}: {x:GAUGE.positiveZRelief.x,tipZ:44};
 const k={left:key.x[0]-axes.x[0],right:axes.x[1]-key.x[1],positiveZ:axes.tipZ-key.z[1],negativeZ:key.z[0]+33};
 const signedMinimumMm=Math.min(...Object.values(c),...Object.values(k));
 const verdict=s.checked?(signedMinimumMm<0?'interference':signedMinimumMm===0?'touching':'clear'):'not checked';
 return frozen({schema:'bts.inert-locator-fit.v1',source:'Original virtual geometry; no physical measurement',part:s.part,revision:GAUGE.revision,jigId:GAUGE.id,units:'mm',frame:'x and z in tray plane; fixture datum fixed; +z toward keyed relief; y up',turnDeg:s.turnDeg,bodyClearanceMm:c,keyClearanceMm:k,signedMinimumMm,verdict,seated:s.checked&&signedMinimumMm>=0});
}
