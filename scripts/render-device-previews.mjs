/** Actual-mesh CPU previews. Uses the viewer's measured geometry and camera math.
 * Run after Astro/export: node scripts/render-device-previews.mjs [output-directory]
 * This deterministic rasterizer is visual evidence, not browser/WebGL QA.
 * sharp is already supplied by the Astro image pipeline.
 */
import * as THREE from 'three';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deviceModels, getContactGeometry } from '../src/lib/devices/catalog.js';
import { buildDeviceMesh, disposeDeviceMesh } from '../src/lib/devices/geometry.js';
import { modelView, modelScaleBar, fitModelView, MODEL_FOV } from '../src/lib/devices/model-view.js';
const output = path.resolve(process.argv[2] ?? 'dist/models/devices');
const sparseFilms = new Set(['ptnrgrid-1024-recording-patch', 'ucsd-graphene-2024-256-recording-patch', 'cibr-agel-1024-bare-contact-patch']);
const previewView = model => ['flat-cuff', 'nerve-cuff'].includes(model.kind) ? 'cutaway' : 'default';
const width = 720, height = 460, samples = 2, W = width * samples, H = height * samples;
const vector = values => new THREE.Vector3(...values);
const escapeXml = value => String(value).replace(/[<>&"']/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' })[c]);
function clipNear(vertices, near) {
  const out = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length], ia = a[2] >= near, ib = b[2] >= near;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (near - a[2]) / (b[2] - a[2]); out.push(a.map((v, j) => v + (b[j] - v) * t)); }
  }
  return out;
}
function rasterize(model, group, pose) {
  const pixels = new Uint8Array(W * H * 3), depth = new Float64Array(W * H).fill(-Infinity), transparent = [];
  // Per-pixel fragment lists preserve correct translucent ordering even when
  // a large film triangle overlaps tiny contact faces. Triangle sorting cannot.
  const heads = new Int32Array(W * H).fill(-1);
  let capacity = 1048576, fragmentCount = 0;
  let fragmentDepth = new Float64Array(capacity), fragmentNext = new Int32Array(capacity), fragmentColor = new Uint32Array(capacity);
  function insertFragment(pixel, z, color) {
    let previous = -1, cursor = heads[pixel];
    while (cursor !== -1 && fragmentDepth[cursor] < z) { previous = cursor; cursor = fragmentNext[cursor]; }
    if (cursor !== -1 && Math.abs(fragmentDepth[cursor] - z) < Math.max(Math.abs(z) * 1e-12, 1e-12) && fragmentColor[cursor] === color) return;
    if (fragmentCount === capacity) {
      capacity *= 2;
      const dz = new Float64Array(capacity), nx = new Int32Array(capacity), cl = new Uint32Array(capacity);
      dz.set(fragmentDepth); nx.set(fragmentNext); cl.set(fragmentColor); fragmentDepth = dz; fragmentNext = nx; fragmentColor = cl;
    }
    const at = fragmentCount++; fragmentDepth[at] = z; fragmentColor[at] = color; fragmentNext[at] = cursor;
    if (previous === -1) heads[pixel] = at; else fragmentNext[previous] = at;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 3, glow = Math.max(0, 1 - Math.hypot((x / W - .43) * 1.25, (y / H - .4) * 1.1));
    pixels[k] = 16 + glow * 10; pixels[k+1] = 24 + glow * 12; pixels[k+2] = 35 + glow * 15;
  }
  const target = vector(pose.target), direction = vector(pose.direction), right = vector(pose.up).cross(direction).normalize(), up = direction.clone().cross(right).normalize();
  const key = right.clone().multiplyScalar(-.7).addScaledVector(up, 1).addScaledVector(direction, 1.2).normalize();
  const fill = right.clone().addScaledVector(up, .2).addScaledVector(direction, .7).normalize(), half = key.clone().add(direction).normalize();
  const focal = H / (2 * Math.tan(MODEL_FOV * Math.PI / 360)), near = Math.max(1e-7, pose.distance * .015);
  function triangle(a, b, c, style) {
    const area = (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);
    if (Math.abs(area) < 1e-10 || (!style.double && area >= 0)) return;
    const xmin = Math.max(0, Math.floor(Math.min(a[0],b[0],c[0]))), xmax = Math.min(W-1, Math.ceil(Math.max(a[0],b[0],c[0])));
    const ymin = Math.max(0, Math.floor(Math.min(a[1],b[1],c[1]))), ymax = Math.min(H-1, Math.ceil(Math.max(a[1],b[1],c[1])));
    if (xmin > xmax || ymin > ymax) return;
    const reverse = style.double && area > 0 ? -1 : 1;
    for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) {
      const px=x+.5, py=y+.5, wa=((b[0]-px)*(c[1]-py)-(b[1]-py)*(c[0]-px))/area, wb=((c[0]-px)*(a[1]-py)-(c[1]-py)*(a[0]-px))/area, wc=1-wa-wb;
      if (wa < -1e-7 || wb < -1e-7 || wc < -1e-7) continue;
      const inverseDepth=wa*a[2]+wb*b[2]+wc*c[2], k=y*W+x;
      if (inverseDepth <= depth[k]) continue;
      if (style.cutY) {
        // Match the interactive shell cutaway: discard only body fragments on
        // y < 0. Contacts and all original exported geometry stay untouched.
        const d = 1 / inverseDepth;
        const worldY = target.y + direction.y * (pose.distance - d) + right.y * (px - W / 2) * d / focal + up.y * (H / 2 - py) * d / focal;
        if (worldY < 0) continue;
      }
      if (style.opacity >= 1) depth[k]=inverseDepth;
      let nx=(wa*a[3]*a[2]+wb*b[3]*b[2]+wc*c[3]*c[2])/inverseDepth;
      let ny=(wa*a[4]*a[2]+wb*b[4]*b[2]+wc*c[4]*c[2])/inverseDepth;
      let nz=(wa*a[5]*a[2]+wb*b[5]*b[2]+wc*c[5]*c[2])/inverseDepth;
      const length=Math.hypot(nx,ny,nz); nx*=reverse/length; ny*=reverse/length; nz*=reverse/length;
      const shade=.38+.47*Math.max(0,nx*key.x+ny*key.y+nz*key.z)+.14*Math.max(0,nx*fill.x+ny*fill.y+nz*fill.z);
      const highlight=Math.pow(Math.max(0,nx*half.x+ny*half.y+nz*half.z),style.exponent)*style.specular;
      const rgb = style.color.map((channel, ch) => Math.min(255, Math.round(channel * shade + 255 * highlight + style.emissive[ch])));
      if (style.opacity < 1) insertFragment(k, inverseDepth, (rgb[0] | (rgb[1] << 8) | (rgb[2] << 16) | (Math.round(style.opacity * 255) << 24)) >>> 0);
      else for (let ch=0; ch<3; ch++) pixels[k*3+ch] = rgb[ch];
    }
  }
  group.updateMatrixWorld(true);
  group.traverse(mesh => {
    if (!mesh.isMesh || (pose.cutaway && mesh.parent.name === 'substrate-and-shanks')) return;
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const {position,normal}=mesh.geometry.attributes, index=mesh.geometry.index, normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const p=new THREE.Vector3(), n=new THREE.Vector3(), vertices=[];
    for (let i=0; i<position.count; i++) {
      p.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).sub(target); n.fromBufferAttribute(normal,i).applyMatrix3(normalMatrix).normalize();
      vertices.push([p.dot(right),p.dot(up),pose.distance-p.dot(direction),n.x,n.y,n.z]);
    }
    const styles=materials.map(material => ({color:material.color.clone().convertLinearToSRGB().toArray().map(c=>c*255),emissive:material.emissive?.clone().convertLinearToSRGB().toArray().map(c=>c*(material.emissiveIntensity??1)*28)??[0,0,0],exponent:Math.max(8,80*(1-(material.roughness??.5))),specular:.05+(material.metalness??0)*.17,double:material.side===THREE.DoubleSide,opacity:material.transparent?material.opacity:1,cutY:pose.view==='cutaway'&&mesh.parent.name==='substrate-and-shanks'}));
    const count=index?.count??position.count;
    for (let i=0; i<count; i+=3) {
      const materialIndex = mesh.geometry.groups.find(g => i >= g.start && i < g.start + g.count)?.materialIndex ?? 0;
      const style = styles[materialIndex] ?? styles[0];
      const clipped=clipNear([0,1,2].map(j=>vertices[index?index.getX(i+j):i+j]),near);
      for (let j=1; j+1<clipped.length; j++) {
        const t=[clipped[0],clipped[j],clipped[j+1]].map(v=>[W/2+v[0]*focal/v[2],H/2-v[1]*focal/v[2],1/v[2],...v.slice(3)]);
        if (style.opacity < 1) transparent.push({t,style,depth:(t[0][2]+t[1][2]+t[2][2])/3});
        else triangle(...t,style);
      }
    }
  });
  transparent.forEach(({t,style}) => triangle(...t,style));
  for (let k = 0; k < heads.length; k++) for (let f = heads[k]; f !== -1; f = fragmentNext[f]) {
    const rgba = fragmentColor[f], alpha = (rgba >>> 24) / 255;
    for (let ch = 0; ch < 3; ch++) pixels[k * 3 + ch] = ((rgba >>> (ch * 8)) & 255) * alpha + pixels[k * 3 + ch] * (1 - alpha);
  }
  return pixels;
}
await mkdir(output,{recursive:true});
const entries=[];
for (const model of Object.values(deviceModels)) {
  const {group}=buildDeviceMesh(model), box=new THREE.Box3().setFromObject(group);
  const sites = getContactGeometry(model);
  let pose=modelView(model,{min:box.min.toArray(),max:box.max.toArray()},sites,previewView(model),W/H);
  if (model.kind === 'nerve-cuff') {
    const center = sites[Math.floor(sites.length / 2)].positionMm, size = [model.innerDiameter * 1.2, model.innerDiameter * 1.2, model.contacts[0].length * 1.8];
    const bounds = {min:center.map((v,i)=>v-size[i]/2), max:center.map((v,i)=>v+size[i]/2)};
    pose = {...fitModelView(bounds,[1,-.4,.15],[0,0,1],W/H),bounds,view:'cutaway',detail:true,cutaway:false,label:'Shell cutaway · contact window'};
  }
  if (sparseFilms.has(model.id)) {
    const site = sites.reduce((a,b) => Math.hypot(...a.positionMm) < Math.hypot(...b.positionMm) ? a : b);
    const size = [model.siteSize * 6, model.siteSize * 6, model.thickness];
    const bounds = {min:site.positionMm.map((v,i)=>v-size[i]/2), max:site.positionMm.map((v,i)=>v+size[i]/2)};
    pose = {...fitModelView(bounds,[.35,-.6,1.5],[0,1,0],W/H),bounds,view:'detail',detail:true,cutaway:false,label:'Single recording contact'};
  }
  const pixels=rasterize(model,group,pose), scale=modelScaleBar(pose.distance,height,88), label=pose.detail?`${pose.label} · camera crop`:pose.label;
  const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="fade" x2="0" y2="1"><stop stop-color="#111a26" stop-opacity="0"/><stop offset="1" stop-color="#111a26" stop-opacity=".95"/></linearGradient></defs><rect y="${height-68}" width="${width}" height="68" fill="url(#fade)"/><g font-family="Arial,sans-serif" font-size="13" fill="#c5d1dd"><text x="20" y="${height-20}">${escapeXml(label)}</text><text x="${width-20}" y="${height-34}" text-anchor="end">${escapeXml(scale.label)}</text><path d="M${width-20-scale.pixels},${height-26}v7m0,-3.5h${scale.pixels}m0,-3.5v7" stroke="#c5d1dd" stroke-width="1.5" fill="none"/></g></svg>`);
  const file=`${model.id}.webp`;
  await sharp(Buffer.from(pixels),{raw:{width:W,height:H,channels:3}}).resize(width,height).composite([{input:overlay}]).webp({quality:92,effort:5}).toFile(path.join(output,file));
  disposeDeviceMesh(group);
  entries.push({id:model.id,revision:model.revision,visualRevision:model.visualRevision??model.revision,file,view:pose.view,label,units:'mm',scaleBarMm:scale.mm,note:'Actual model geometry. Scale bar at camera target plane; colors are visualization materials.'});
  console.log(`Rendered ${file}`);
}
await writeFile(path.join(output,'previews-index.json'),JSON.stringify({renderer:'CPU mesh preview',width,height,models:entries},null,2)+'\n');
