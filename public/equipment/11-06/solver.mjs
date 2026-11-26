// Millimetres in the local breadboard frame. Entirely passive dry geometric fit.
export const grid=Object.freeze({width:900,depth:750,pitch:25,columns:36,rows:30,border:12.5,originX:-437.5,originZ:-362.5});
export const mounts=Object.freeze({A:Object.freeze({width:80,depth:60,height:35}),B:Object.freeze({width:70,depth:50,height:30})});
export const presets=Object.freeze({
 clear:Object.freeze({A:Object.freeze({col:12,row:14}),B:Object.freeze({col:16,row:14})}),
 collision:Object.freeze({A:Object.freeze({col:12,row:14}),B:Object.freeze({col:12,row:14})}),
 edge:Object.freeze({A:Object.freeze({col:12,row:14}),B:Object.freeze({col:35,row:29})})
});
const invalid='Choose a valid hole: column 0–35 and row 0–29.';
export function center(p){
 if(!p||!Number.isInteger(p.col)||!Number.isInteger(p.row)||p.col<0||p.col>=grid.columns||p.row<0||p.row>=grid.rows)throw Error(invalid);
 return {x:grid.originX+grid.pitch*p.col,z:grid.originZ+grid.pitch*p.row};
}
export function snap(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>grid.width/2||Math.abs(z)>grid.depth/2)throw Error('Pick a point on the breadboard face.');
 return {col:Math.min(grid.columns-1,Math.round((x-grid.originX)/grid.pitch)),row:Math.min(grid.rows-1,Math.round((z-grid.originZ)/grid.pitch))};
}
const box=(id,p)=>{const {x,z}=center(p),d=mounts[id];return {x0:x-d.width/2,x1:x+d.width/2,y0:0,y1:d.height,z0:z-d.depth/2,z1:z+d.depth/2};};
const overhang=b=>({left:Math.max(0,-grid.width/2-b.x0),right:Math.max(0,b.x1-grid.width/2),rear:Math.max(0,-grid.depth/2-b.z0),front:Math.max(0,b.z1-grid.depth/2)});
const span=(a,b,k)=>Math.min(a[k+'1'],b[k+'1'])-Math.max(a[k+'0'],b[k+'0']);
export function compare(pos,revision=0){
 const A=box('A',pos.A),B=box('B',pos.B),a=center(pos.A),b=center(pos.B),ovA=overhang(A),ovB=overhang(B),cross=['x','y','z'].map(k=>span(A,B,k));
 const overlapMm3=cross.reduce((q,v)=>q*Math.max(0,v),1),edgeGapMm=overlapMm3>0?null:Math.hypot(...cross.map(v=>Math.max(0,-v)));
 const spills=[...Object.values(ovA),...Object.values(ovB)].some(v=>v>0),touching=overlapMm3===0&&edgeGapMm===0;
 return {schema:'bts.breadboard-placement.v1',deviceId:'11-06',kind:'simulated rigid envelope',revision,frame:'B7590A: +X right, +Y up, +Z toward operator; origin center at surface',units:{length:'mm',volume:'mm^3'},indices:'zero-based columns increasing +X, rows increasing +Z',hardware:'SDPM7590+B7590A',grid:{...grid},
  mounts:{A:{id:'dry-base-A',hole:{...pos.A},center:{x:a.x,y:0,z:a.z},size:{...mounts.A}},B:{id:'dry-base-B',hole:{...pos.B},center:{x:b.x,y:0,z:b.z},size:{...mounts.B}}},centerDistanceMm:Math.hypot(a.x-b.x,a.z-b.z),edgeGapMm,overlapMm3,overhangA:ovA,overhangB:ovB,collision:overlapMm3>0,touching,fit:!spills,status:overlapMm3>0?'collision':spills?'overhang':touching?'touching':'clear'};
}
function refresh(s,pos,active=s.active){try{const revision=s.revision+1;return {...s,pos,active,revision,result:compare(pos,revision),error:''};}catch(e){return {...s,error:e.message};}}
export const initial=()=>({pos:presets.clear,active:'B',revision:1,result:compare(presets.clear,1),error:''});
export function act(s,id,p){
 if(id==='reset')return refresh(s,presets.clear,'B');
 if(id==='preset'&&Object.hasOwn(presets,p))return refresh(s,presets[p]);
 if(id==='select'&&Object.hasOwn(mounts,p))return {...s,active:p,error:''};
 if(id==='place')return refresh(s,{...s.pos,[s.active]:p});
 if(id==='snap'){try{return act(s,'place',snap(p?.x,p?.z));}catch(e){return {...s,error:e.message};}}
 throw Error('Unknown dry mount action.');
}
