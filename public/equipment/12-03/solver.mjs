export const phantom=Object.freeze({id:'BTS-SYN-GAUSS-12-03',revision:'analytic-r1',shape:Object.freeze([41,37,31]),spacingUm:Object.freeze([.10,.12,.20]),originUm:Object.freeze([-2,-2.16,-3]),centerIndex:Object.freeze([20,18,15]),sigmaUm:Object.freeze([.20,.24,.40]),background:.04});
export const orientations=Object.freeze({XY:Object.freeze({display:[0,1],fixed:2}),XZ:Object.freeze({display:[0,2],fixed:1}),YZ:Object.freeze({display:[1,2],fixed:0})});
export const channels=Object.freeze({signal:'Synthetic raised intensity trace',background:'Constant background reference'});
export function xyz(index){
 if(!Array.isArray(index)||index.length!==3||!index.every((x,i)=>Number.isInteger(x)&&x>=0&&x<phantom.shape[i]))throw Error('Sample index is outside the synthetic phantom.');
 return index.map((x,i)=>phantom.originUm[i]+x*phantom.spacingUm[i]);
}
export function intensity(index,channel){
 const r=xyz(index);
 if(!Object.hasOwn(channels,channel))throw Error('Choose the analytic signal or background track.');
 return channel==='background'?phantom.background:phantom.background+Math.exp(-.5*r.reduce((a,x,i)=>a+(x/phantom.sigmaUm[i])**2,0));
}
export function section(orientation,index,channel){
 if(!Object.hasOwn(orientations,orientation)||!Object.hasOwn(channels,channel))throw Error('Unknown display plane or track.');
 const {display:[u,v],fixed}=orientations[orientation],p=phantom.centerIndex.slice();p[fixed]=index;
 const anchor=xyz(p),width=phantom.shape[u],height=phantom.shape[v],values=[];
 for(let row=0;row<height;row++){p[v]=row;for(let column=0;column<width;column++){p[u]=column;values.push(intensity(p,channel));}}
 return {orientation,channel,fixedAxis:'XYZ'[fixed],displayAxes:['XYZ'[u],'XYZ'[v]],fixedIndex:index,fixedCoordinateUm:anchor[fixed],shape:[width,height],spacingUm:[phantom.spacingUm[u],phantom.spacingUm[v]],originUm:[phantom.originUm[u],phantom.originUm[v]],encoding:'flat row-major, increasing physical coordinates on display axes',values};
}
export function halfWidth(axis,channel){
 if(!Number.isInteger(axis)||axis<0||axis>2)throw Error('Width axis must be X, Y or Z.');
 const p=phantom.centerIndex.slice(),line=Array.from({length:phantom.shape[axis]},(_,i)=>{p[axis]=i;return intensity(p,channel)});
 const lo=phantom.background,hi=Math.max(...line),step=phantom.spacingUm[axis],o=phantom.originUm[axis],half=(lo+hi)/2;
 if(hi-lo<=1e-8)return {axis:'XYZ'[axis],widthUm:null,crossingsUm:null};
 const crossing=(a,b,i)=>o+step*(i+(half-a)/(b-a));
 let left=null,right=null;
 for(let i=0;i<line.length-1;i++){
  if(line[i]<half&&line[i+1]>=half)left=crossing(line[i],line[i+1],i);
  if(line[i]>=half&&line[i+1]<half)right=crossing(line[i],line[i+1],i);
 }
 return {axis:'XYZ'[axis],widthUm:left===null||right===null?null:right-left,crossingsUm:left===null||right===null?null:[left,right]};
}
export const blank=()=>({orientation:'XY',channel:'signal',index:phantom.centerIndex[2],revision:0,report:null});
export function action(s,{type,payload}){
 switch(type){
  case 'orientation': {if(!Object.hasOwn(orientations,payload))throw Error('Choose XY, XZ or YZ.');return {...s,orientation:payload,index:phantom.centerIndex[orientations[payload].fixed],report:null};}
  case 'cycle':return action(s,{type:'orientation',payload:{XY:'XZ',XZ:'YZ',YZ:'XY'}[s.orientation]});
  case 'channel':if(!Object.hasOwn(channels,payload))throw Error('Unknown synthetic track.');return {...s,channel:payload,report:null};
  case 'slice':section(s.orientation,payload,s.channel);return {...s,index:payload,report:null};
  case 'measure':{
   const revision=s.revision+1,plane=section(s.orientation,s.index,s.channel);
   return {...s,revision,report:{schema:'bts.gaussian-phantom.inspection.v1',deviceId:'12-03',origin:'analytic-synthetic-replay',phantom,revision,parentRevision:s.revision||null,plane,widths:[0,1,2].map(axis=>halfWidth(axis,s.channel)),scope:'Analytic bead-like intensity field only. Not acquired, replayed from hardware or calibrated to any microscope.'}};
  }
  case 'reset':return blank();
  default:throw Error('Only passive section and width inspection actions are available.');
 }
}
export function csv(r){
 const {plane:p}=r,[width]=p.shape;
 return [p.displayAxes.join('_um,')+'_um,intensity_rel',...p.values.map((v,i)=>[p.originUm[0]+(i%width)*p.spacingUm[0],p.originUm[1]+Math.floor(i/width)*p.spacingUm[1],v].join(','))].join('\n')+'\n';
}
