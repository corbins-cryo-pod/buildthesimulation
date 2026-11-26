// Two fixed, unrelated classroom line diagrams. No hardware, data import or specimen relationship.
const fixtures=Object.freeze({
 triangle:Object.freeze([[0,0],[8,0],[0,6]].map(Object.freeze)),
 flat:Object.freeze([[0,0],[5,0],[8,0]].map(Object.freeze)),
});
export const picks=Object.freeze({Offline_geometry_card:{action:'next',label:'Switch fixed classroom geometry card'}});
export const initial=()=>({card:'triangle',revision:0});
export function reduce(s,a,v){
 if(a==='next')v=s.card==='triangle'?'flat':'triangle';else if(a!=='card')throw Error('Unknown offline geometry action.');
 if(!Object.hasOwn(fixtures,v))throw Error('Choose an authored geometry card.');
 return v===s.card?s:{card:v,revision:s.revision+1};
}
export function points(s){if(!Object.hasOwn(fixtures,s.card))throw Error('Unknown geometry card.');return fixtures[s.card]}
export function report(s){
 const p=points(s), d=p.map(([x,y],i)=>{const [u,v]=p[(i+1)%3];return Math.hypot(x-u,y-v);});
 const [[x,y],[u,v],[r,t]]=p,area=Math.abs((u-x)*(t-y)-(v-y)*(r-x))/2;
 return {schema:'bts.07-12.offline-triangle.v1',source:'authored disconnected line drawing',revision:s.revision,card:s.card,edgeLengths:d,area,hasEnclosedArea:area>0,units:'fictional geometry units',deviceConnection:false};
}
