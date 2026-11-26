export const grid=Object.freeze({dimensions:Object.freeze([64,40,21]),spacingUm:Object.freeze([8,8,20]),sampleId:'INERT-XYZ-FIDUCIAL-01',revision:1,markerRadiusUm:24});
const nominal=Object.freeze([Object.freeze({id:'F1',v:Object.freeze([16,15,10])}),Object.freeze({id:'F2',v:Object.freeze([40,15,10])}),Object.freeze({id:'F3',v:Object.freeze([28,28,16])})]);
export function coordinateUm(v){
 if(!Array.isArray(v)||v.length!==3||!v.every((n,k)=>Number.isInteger(n)&&n>=0&&n<grid.dimensions[k]))throw RangeError('Voxel index outside the synthetic extent.');
 return v.map((z,k)=>(z+.5)*grid.spacingUm[k]);
}
export const station=()=>({plane:10});
export function act(s,key,arg){
 if(key==='reset')return station();
 const end=grid.dimensions[2]-1,n=key==='prev'?Math.max(s.plane-1,0):key==='next'?Math.min(s.plane+1,end):key==='plane'?arg:-1;
 if(!Number.isInteger(n)||n<0||n>end)throw RangeError('Choose an integer plane from 0 to 20.');
 return {plane:n};
}
export function replay(s){
 const plane=act(station(),'plane',s.plane).plane,[nx,ny]=grid.dimensions,z=coordinateUm([0,0,plane])[2],rows=new Uint8Array(nx*ny);
 const markers=nominal.map(({id,v})=>({id,voxel:[...v],centerUm:coordinateUm(v),litPixels:0}));
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const xum=(x+.5)*grid.spacingUm[0],yum=(y+.5)*grid.spacingUm[1];
  for(let j=0;j<markers.length;j++){const m=markers[j],c=m.centerUm;if((c[0]-xum)**2+(c[1]-yum)**2+(c[2]-z)**2<=grid.markerRadiusUm**2){rows[y*nx+x]=j+1;m.litPixels++;break}}
 }
 const a=markers[0],b=markers[1];
 const separationUm=a.litPixels&&b.litPixels?Math.hypot(...a.centerUm.map((u,k)=>u-b.centerUm[k])):null;
 return {schema:'bts.synthetic-voxel-plane.v1',sampleId:grid.sampleId,revision:grid.revision,provenance:'Author-defined inert voxel phantom, not an acquired image or optical prediction.',coordinateSystem:'Right-handed sample frame with origin at minimum volume corner; voxel indices zero-based i,j,k; x right, y up, z increasing on plane scrub. Row-major labels from the bottom row.',dimensions:[...grid.dimensions],spacingUm:[...grid.spacingUm],planeIndex:plane,zUm:z,scaleBarUm:160,scaleBarPixels:20,labels:Array.from(rows),markers,separationUm};
}
