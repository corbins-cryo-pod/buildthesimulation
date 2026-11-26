// Static detached abstract outlines, not hardware parts or cultures.
const fixed=a=>Object.freeze(a.map(p=>Object.freeze(p)));
export const outlines=Object.freeze({
 rectangle:Object.freeze({label:'Rectangle',vertices:fixed([[0,0],[8,0],[8,6],[0,6]])}),
 notched:Object.freeze({label:'Notched outline',vertices:fixed([[0,0],[8,0],[8,3],[5,3],[5,7],[0,7]])}),
 flat:Object.freeze({label:'Flat negative fixture',vertices:fixed([[0,0],[8,0],[5,0]])})
});
export const initial=()=>({outline:'notched',result:null,error:'',revision:0});
export function read(id,rev=0){
 if(!Object.hasOwn(outlines,id))throw Error('Choose a stored geometric outline.');
 const v=outlines[id].vertices;
 const twice=v.reduce((a,p,i)=>{const q=v[(i+1)%v.length];return a+p[0]*q[1]-p[1]*q[0]},0),area=Math.abs(twice)/2;
 return {schema:'bts.abstract-outline-area.v1',deviceId:'07-15',kind:'static documentation',sourceId:'inert-outlines-01',sourceRevision:0,readRevision:rev+1,outlineId:id,
  vertices:v.map(p=>[...p]),vertexCount:v.length,status:area>0?'closed-region':'degenerate',area:area>0?area:null,units:'abstract units squared',instrumentStateModeled:false};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='select')return act({...s,outline:p},'view');
 if(id==='view'){try{const r=read(s.outline,s.revision);return {...s,result:r,error:'',revision:r.readRevision};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown detached area action');
}
