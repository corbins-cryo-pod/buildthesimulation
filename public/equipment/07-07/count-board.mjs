// Offline toy square badges only; no captured images, device settings or specimen models.
export const width=48,height=32;
const isolated=Object.freeze([[8,6],[28,6],[8,19],[29,20]].map(Object.freeze));
const touching=Object.freeze([[8,6],[13,6],[8,19],[29,20]].map(Object.freeze));
const fixtures=Object.freeze({isolated,touching});
export const picks=Object.freeze({Offline_count_plate:{action:'next',label:'Switch between the fixed toy badge images'}});
export const initial=()=>({card:'isolated',revision:0});
export function reduce(s,a,v){
 if(a==='next')v=s.card==='isolated'?'touching':'isolated';else if(a!=='card')throw Error('Unknown offline action.');
 if(!Object.hasOwn(fixtures,v))throw Error('Choose one authored toy badge card.');
 return v===s.card?s:{card:v,revision:s.revision+1};
}
export function count(s){
 if(!Object.hasOwn(fixtures,s.card))throw Error('Unknown fixed toy card.');
 const image=new Uint8Array(width*height),labels=new Uint8Array(image.length);
 for(const [x,y] of fixtures[s.card])for(let dy=0;dy<5;dy++)for(let dx=0;dx<5;dx++)image[(y+dy)*width+x+dx]=1;
 const sizes=[];
 for(let i=0;i<image.length;i++)if(image[i]&&!labels[i]){
  const l=sizes.length+1,stack=[i];let n=0;labels[i]=l;
  while(stack.length){
   const p=stack.pop(),x=p%width; n++;
   const next=[p-width,p+width,...(x===0?[]:[p-1]),...(x===width-1?[]:[p+1])];
   for(const q of next)if(q>=0&&q<image.length&&image[q]&&!labels[q]){labels[q]=l;stack.push(q)}
  }
  sizes.push(n);
 }
 return {image,labels,areas:sizes};
}
export function report(s){
 const {areas}=count(s);return {schema:'bts.07-07.offline-badges.v1',source:'fixed nonbiological geometric badge card',revision:s.revision,card:s.card,authoredSquares:fixtures[s.card].length,connectedGroups:areas.length,groupPixels:areas,foregroundPixels:areas.reduce((a,b)=>a+b,0),connectivity:'four adjacent raster edges',deviceConnection:false};
}
