// Detached fictional footprint layout. No relationship to any equipment or handling process.
const stops=Object.freeze(['aligned','diagonal','right']);
const angles=Object.freeze({aligned:[1,0],diagonal:[.8,.6],right:[0,1]});
const tile=Object.freeze([120,50]),frame=Object.freeze([128,110]);
export const picks=Object.freeze({Offline_footprint_token:{action:'next',label:'Turn the detached footprint tile to the next diagram angle'}});
export const initial=()=>({pose:'aligned',revision:0});
export function reduce(s,a,v){
 if(a==='next')v=stops[(stops.indexOf(s.pose)+1)%stops.length];else if(a!=='pose')throw Error('Unknown offline diagram action.');
 if(!stops.includes(v))throw Error('Unknown authored footprint pose.');
 return v===s.pose?s:{pose:v,revision:s.revision+1};
}
export function report(s){
 if(!stops.includes(s.pose))throw Error('Unknown authored footprint pose.');
 const [c,q]=angles[s.pose],[a,b]=tile,rotated=[a*c+b*q,a*q+b*c],margin=frame.map((v,i)=>v-rotated[i]);
 return {schema:'bts.06-10.offline-footprint.v1',source:'detached fictional top-view card',revision:s.revision,pose:s.pose,degrees:Math.atan2(q,c)*180/Math.PI,tile:[...tile],frame:[...frame],bounds:rotated,totalMargin:margin,fits:margin.every(v=>v>=0),units:'fictional diagram units',deviceConnection:false};
}
