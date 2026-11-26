import { Color, Matrix3, Matrix4, Vector3 } from 'three';

// Rasterize the same GLB triangles into one canvas when WebGL is unavailable.
// The depth buffer keeps the tray, sample and glass correctly layered at close range.
export function createSoftwareRenderer() {
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d',{alpha:true});
  const projected=new WeakMap();
  const viewProjection=new Matrix4(), transform=new Matrix4(), normals=new Matrix3();
  const light=new Vector3(-.42,.7,.62).normalize();
  const fill=new Vector3(.65,.35,-.46).normalize();
  const worldNormal=new Vector3(),base=new Color();
  let frame,depth;
  function setSize(cssWidth,cssHeight) {
    const scale=Math.min(1.35,900/cssWidth,720/cssHeight);
    const w=Math.max(1,Math.round(cssWidth*scale)),h=Math.max(1,Math.round(cssHeight*scale));
    if(frame && canvas.width===w && canvas.height===h) return;
    canvas.width=w;canvas.height=h;
    frame=ctx.createImageData(w,h);depth=new Float32Array(w*h);
  }
  function drawMesh(mesh) {
    const geometry=mesh.geometry, positions=geometry.getAttribute('position');
    if(!positions || !mesh.material?.color) return;
    const mat=mesh.material;
    const normal=geometry.getAttribute('normal');
    const index=geometry.getIndex();
    let vertices=projected.get(geometry);
    if(!vertices){vertices=new Float32Array(positions.count*4);projected.set(geometry,vertices);}
    transform.multiplyMatrices(viewProjection,mesh.matrixWorld);
    normals.getNormalMatrix(mesh.matrixWorld);
    const m=transform.elements,w=canvas.width,h=canvas.height;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const clipW=m[3]*x+m[7]*y+m[11]*z+m[15];
      const k=i*4;
      if(clipW<=.01){vertices[k+2]=Infinity;continue;}
      vertices[k]=w*(.5+.5*(m[0]*x+m[4]*y+m[8]*z+m[12])/clipW);
      vertices[k+1]=h*(.5-.5*(m[1]*x+m[5]*y+m[9]*z+m[13])/clipW);
      vertices[k+2]=(m[2]*x+m[6]*y+m[10]*z+m[14])/clipW;
      if(normal) worldNormal.fromBufferAttribute(normal,i).applyNormalMatrix(normals);
      vertices[k+3]=normal ? .57+.32*Math.max(0,worldNormal.dot(light))+.14*Math.max(0,worldNormal.dot(fill)):1;
    }
    base.copy(mat.color).convertLinearToSRGB();
    const red=base.r*255,green=base.g*255,blue=base.b*255;
    const alpha=mat.transparent?mat.opacity:1;
    const count=index?index.count:positions.count;
    const pixels=frame.data;
    for(let tri=0;tri<count;tri+=3){
      const a=(index?index.getX(tri):tri)*4,b=(index?index.getX(tri+1):tri+1)*4,c=(index?index.getX(tri+2):tri+2)*4;
      const az=vertices[a+2],bz=vertices[b+2],cz=vertices[c+2];
      if(!Number.isFinite(az+bz+cz))continue;
      const ax=vertices[a],ay=vertices[a+1],bx=vertices[b],by=vertices[b+1],cx=vertices[c],cy=vertices[c+1];
      const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
      if(Math.abs(area)<.02 || (alpha<1 && area>=0))continue;
      const left=Math.max(0,Math.floor(Math.min(ax,bx,cx))),right=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx)));
      const top=Math.max(0,Math.floor(Math.min(ay,by,cy))),bottom=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
      const du=(by-cy)/area,dv=(cy-ay)/area;
      const shade=(vertices[a+3]+vertices[b+3]+vertices[c+3])/3;
      const r=Math.min(255,red*shade),g=Math.min(255,green*shade),bl=Math.min(255,blue*shade);
      for(let y=top;y<=bottom;y++){
        let u=((by-cy)*(left+.5-cx)+(cx-bx)*(y+.5-cy))/area;
        let v=((cy-ay)*(left+.5-cx)+(ax-cx)*(y+.5-cy))/area;
        for(let x=left;x<=right;x++,u+=du,v+=dv){
          if(u<0 || v<0 || u+v>1)continue;
          const z=cz+u*(az-cz)+v*(bz-cz),p=y*w+x;
          if(z< -1 || z>1 || z>=depth[p])continue;
          const k=p*4;
          if(alpha>=1){depth[p]=z;pixels[k]=r;pixels[k+1]=g;pixels[k+2]=bl;pixels[k+3]=255;}
          else {
            const old=pixels[k+3]/255, out=alpha+old*(1-alpha);
            const back=old*(1-alpha);
            pixels[k]=(r*alpha+pixels[k]*back)/out;pixels[k+1]=(g*alpha+pixels[k+1]*back)/out;
            pixels[k+2]=(bl*alpha+pixels[k+2]*back)/out;pixels[k+3]=255*out;
          }
        }
      }
    }
  }
  function render(scene,camera){
    if(!frame)return;
    scene.updateMatrixWorld();camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    frame.data.fill(0);depth.fill(Infinity);
    const glass=[];
    scene.traverseVisible(obj=>{
      if(!obj.isMesh)return;
      if(obj.material.transparent)glass.push(obj);else drawMesh(obj);
    });
    for(const mesh of glass)drawMesh(mesh);
    ctx.putImageData(frame,0,0);
  }
  return {domElement:canvas,setSize,render};
}
