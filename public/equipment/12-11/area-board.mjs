// Independent fictional grid only. No calibration to the physical scene or Leica device.
export const id='fictional-teaching-grid-v1', width=100, height=70;
export const picks=Object.freeze({Synthetic_grid_panel:{action:'example',label:'Read the offline example rectangle'}});
const example=[[20,15],[60,15],[60,40],[20,40]];
export const initial=()=>({revision:0,vertices:[],closed:false});
const determinant=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const on=(a,b,p)=>determinant(a,b,p)===0&&[0,1].every(k=>Math.min(a[k],b[k])<=p[k]&&p[k]<=Math.max(a[k],b[k]));
const intersects=(a,b,c,d)=>on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)||(
 determinant(a,b,c)*determinant(a,b,d)<0&&determinant(c,d,a)*determinant(c,d,b)<0);
function checked(v){
 if(v.length<3)throw Error('Add at least three distinct points.');
 if(v.some((p,i)=>{const a=v[(i+v.length-1)%v.length],b=v[(i+1)%v.length];return on(p,a,b)||on(p,b,a)}))throw Error('Polygon backtracks on itself.');
 for(let i=0;i<v.length;i++)for(let j=i+2;j<v.length;j++){
  if(i===0&&j===v.length-1)continue;
  if(intersects(v[i],v[(i+1)%v.length],v[j],v[(j+1)%v.length]))throw Error('Polygon crosses or touches itself.');
 }
 let a2=0;for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length];a2+=a[0]*b[1]-a[1]*b[0]}
 if(!a2)throw Error('Polygon must have positive area.');
 return Math.abs(a2)/2;
}
export function reduce(s,action,value){
 if(action==='example')return {...s,vertices:example.map(v=>[...v]),closed:true,revision:s.revision+1};
 if(action==='clear')return {...initial(),revision:s.revision+1};
 if(action==='undo')return {...s,vertices:s.closed?s.vertices:s.vertices.slice(0,-1),closed:false,revision:s.revision+1};
 if(action==='close'){checked(s.vertices);return {...s,closed:true,revision:s.revision+1}}
 if(action==='add'){
  if(s.closed)throw Error('Start a new polygon or reopen this one first.');
  if(!Array.isArray(value)||value.length!==2||!value.every(Number.isInteger)||value[0]<0||value[0]>width||value[1]<0||value[1]>height)throw Error('Point outside the fictional grid.');
  if(s.vertices.length>=16)throw Error('At most 16 teaching-grid points.');
  if(s.vertices.some(v=>v[0]===value[0]&&v[1]===value[1]))throw Error('Point already present.');
  return {...s,vertices:[...s.vertices,[...value]],revision:s.revision+1};
 }
 throw Error('Unknown offline action.');
}
export function measure(s){return s.closed?{areaGridUnits2:checked(s.vertices),vertexCount:s.vertices.length}:null}
export function aggregate(s){return {schema:'bts.12-11.offline-annotation.v1',source:id,revision:s.revision,result:measure(s),deviceConnection:false,containsCoordinateData:false}}
