// A depth-buffered canvas renderer for browsers without WebGL2. Both renderers
// consume the loaded glTF meshes, camera and articulated scene graph.
import { Color, Matrix4, Vector3 } from 'three';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function softwareRenderer(){
  const domElement=document.createElement('canvas'),ctx=domElement.getContext('2d',{alpha:false});
  const clip=new Matrix4(),pv=new Matrix4(),light=new Vector3(-.4,.8,.7).normalize();
  const scratch=new WeakMap(),colors=new WeakMap(),textures=new WeakMap();
  let width=1,height=1,pixels,depth;
  function setSize(w,h){
    const ratio=Math.min(1,640/Math.max(w,h));
    width=domElement.width=Math.max(1,Math.round(w*ratio));
    height=domElement.height=Math.max(1,Math.round(h*ratio));
    pixels=ctx.createImageData(width,height);depth=new Float32Array(width*height);
  }
  function baseColor(material){
    if(!colors.has(material)){
      const c=(material.color??new Color(0xffffff)).clone().convertLinearToSRGB();
      colors.set(material,[c.r*255,c.g*255,c.b*255]);
    }
    return colors.get(material);
  }
  function materialTexture(material){
    const tex=material.map;
    if(!tex?.isCanvasTexture)return null;
    if(textures.get(tex)?.version!==tex.version){
      const img=tex.image;
      textures.set(tex,{version:tex.version,image:img.getContext('2d').getImageData(0,0,img.width,img.height)});
    }
    return textures.get(tex).image;
  }
  function renderMesh(m){
    const geo=m.geometry,pos=geo.attributes.position,idx=geo.index,mat=m.material;
    const color=baseColor(mat),tex=materialTexture(mat),uv=geo.attributes.uv;
    const alpha=mat.transparent?mat.opacity:1;
    let out=scratch.get(geo);
    if(!out){out=new Float32Array(pos.count*3);scratch.set(geo,out);}
    const e=clip.multiplyMatrices(pv,m.matrixWorld).elements;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const w=e[3]*x+e[7]*y+e[11]*z+e[15],off=i*3;
      out[off]=width*(.5+.5*(e[0]*x+e[4]*y+e[8]*z+e[12])/w);
      out[off+1]=height*(.5-.5*(e[1]*x+e[5]*y+e[9]*z+e[13])/w);
      out[off+2]=1/w;
    }
    const length=idx?.count??pos.count,world=m.matrixWorld.elements;
    for(let i=0;i<length;i+=3){
      const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;
      const ax=out[a*3],ay=out[a*3+1],az=out[a*3+2];
      const bx=out[b*3],by=out[b*3+1],bz=out[b*3+2];
      const cx=out[c*3],cy=out[c*3+1],cz=out[c*3+2];
      if(Math.min(az,bz,cz)<=0)continue;
      const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
      if(Math.abs(area)<.012 || (area>0&&mat.side===0))continue;
      const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(width-1,Math.ceil(Math.max(ax,bx,cx)));
      const y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(height-1,Math.ceil(Math.max(ay,by,cy)));
      if(x1<x0||y1<y0)continue;
      const abx=pos.getX(b)-pos.getX(a),aby=pos.getY(b)-pos.getY(a),abz=pos.getZ(b)-pos.getZ(a);
      const acx=pos.getX(c)-pos.getX(a),acy=pos.getY(c)-pos.getY(a),acz=pos.getZ(c)-pos.getZ(a);
      const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
      const wx=world[0]*nx+world[4]*ny+world[8]*nz,wy=world[1]*nx+world[5]*ny+world[9]*nz,wz=world[2]*nx+world[6]*ny+world[10]*nz;
      const lambert=(wx*light.x+wy*light.y+wz*light.z)/(Math.hypot(wx,wy,wz)||1);
      const shade=.69+.34*Math.max(0,lambert);
      const red=color[0]*shade,green=color[1]*shade,blue=color[2]*shade;
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const px=x+.5-ax,py=y+.5-ay;
        const v=(px*(cy-ay)-py*(cx-ax))/area,u=((bx-ax)*py-(by-ay)*px)/area,t=1-v-u;
        if(v<0||u<0||t<0)continue;
        const z=t*az+v*bz+u*cz,j=y*width+x;
        if(z<=depth[j])continue;
        let r=red,g=green,bv=blue;
        if(tex&&uv){
          const tx=(t*az*uv.getX(a)+v*bz*uv.getX(b)+u*cz*uv.getX(c))/z;
          const ty=(t*az*uv.getY(a)+v*bz*uv.getY(b)+u*cz*uv.getY(c))/z;
          const k=4*(clamp(Math.floor((1-ty)*tex.height),0,tex.height-1)*tex.width+clamp(Math.floor(tx*tex.width),0,tex.width-1));
          r=tex.data[k];g=tex.data[k+1];bv=tex.data[k+2];
        }
        const k=j*4;
        if(alpha>=.99){depth[j]=z;pixels.data[k]=r;pixels.data[k+1]=g;pixels.data[k+2]=bv;}
        else {pixels.data[k]+=alpha*(r-pixels.data[k]);pixels.data[k+1]+=alpha*(g-pixels.data[k+1]);pixels.data[k+2]+=alpha*(bv-pixels.data[k+2]);}
      }
    }
  }
  function render(scene,camera){
    if(!pixels)return;
    scene.updateMatrixWorld(true);camera.updateMatrixWorld();pv.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    // Packed RGBA on the little-endian browsers supported by Three.js.
    new Uint32Array(pixels.data.buffer).fill(0xffd5e0e4);depth.fill(0);
    const transparent=[];
    scene.traverseVisible(node=>{
      if(!node.isMesh || !node.geometry.attributes.position)return;
      if(node.material.transparent)transparent.push(node);else renderMesh(node);
    });
    transparent.forEach(renderMesh);ctx.putImageData(pixels,0,0);
  }
  return {domElement,setSize,render};
}
