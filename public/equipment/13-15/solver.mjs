const dir='/equipment/13-15/';
const expect=(b,m)=>{if(!b)throw Error(m);};
export const initial=()=>({index:8});
export const load=async()=>{const r=await fetch(dir+'phantom.json');expect(r.ok,'Archive HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 expect(f?.schema==='bts.inert-label-stack.v1'&&f.sampleId==='BTS-CAL-TWO-BEAD-001'&&f.revision===1&&typeof f.provenance==='string','Unsupported inert archive metadata.');
 expect(f.shapeVox?.join()==='48,44,17'&&f.spacingMm?.join()==='0.1,0.1,0.2'&&f.originMm?.join()==='0,0,0','Unsupported archive units or bounds.');
 expect(Array.isArray(f.slices)&&f.slices.length===16,'Archive plane inventory is invalid.');
 const planes=new Map();
 for(const s of f.slices){
  expect(Number.isInteger(s.index)&&s.index>=0&&s.index<17&&!planes.has(s.index)&&Array.isArray(s.runs)&&s.encoding==='rle-row-major'&&s.id==='CT-TOY-Z'+String(s.index).padStart(2,'0'),'Malformed or duplicate archive plane.');
  const d=new Uint8Array(2112);let offset=0;
  for(const a of s.runs){expect(Array.isArray(a)&&a.length===2&&[0,1,2].includes(a[0])&&Number.isInteger(a[1])&&a[1]>0&&offset+a[1]<=d.length,'Invalid plane run.');d.fill(a[0],offset,offset+a[1]);offset+=a[1];}
  expect(offset===d.length,'Plane length does not match metadata.');planes.set(s.index,{id:s.id,labels:d});
 }
 expect(!planes.has(6),'The fixture declares plane 6 intentionally absent.');
 return {metadata:f,planes};
}
export function select(model,index){
 const f=model.metadata;
 expect(Number.isInteger(index)&&index>=0&&index<f.shapeVox[2],'Slice index outside the fixed archive.');
 const p=model.planes.get(index),[w,h]=f.shapeVox,z=f.originMm[2]+index*f.spacingMm[2];
 const o={schema:'bts.inert-slice-ruler.v1',kind:'synthetic-inert-geometry-replay',sampleId:f.sampleId,revision:f.revision,provenance:f.provenance,shapeVox:f.shapeVox,spacingMm:f.spacingMm,originMm:f.originMm,coordinateConvention:f.coordinateConvention,index,sliceId:p?.id??null,zMm:z,coverage:p?'stored':'missing',beads:[],distanceMm:null};
 if(!p)return o;
 const stats=[[0,0,0],[0,0,0]];
 for(let i=0;i<w*h;i++){const cl=p.labels[i];if(cl){const a=stats[cl-1];a[0]++;a[1]+=i%w;a[2]+=Math.floor(i/w);}}
 o.beads=stats.flatMap(([n,x,y],i)=>n?[{id:['A','B'][i],voxelsInPlane:n,centroidIndex:[x/n,y/n,index],centroidMm:[f.originMm[0]+x/n*f.spacingMm[0],f.originMm[1]+y/n*f.spacingMm[1],z]}]:[]);
 if(o.beads.length===2){const [a,b]=o.beads.map(q=>q.centroidMm);o.distanceMm=Math.hypot(b[0]-a[0],b[1]-a[1]);}
 return o;
}
export function act(model,s,action,value){
 try{
  const index=action==='next'?(s.index+1)%model.metadata.shapeVox[2]:action==='reset'?8:action==='select'?value:NaN,r=select(model,index);
  return {ok:true,state:{index},report:r,message:r.coverage==='missing'?'Missing archived plane; no interpolation or measurement.':r.distanceMm===null?'Ruler unavailable: both bead labels must be present.':'Ruler measures the two saved labels in this plane.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
