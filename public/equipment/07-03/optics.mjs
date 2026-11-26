// Nikon ECLIPSE Ts2-FL optical sandbox. Lengths are in the specimen plane unless stated.
export const OPTICS = Object.freeze({
  width: 384, height: 256, sensorPitchUm: 2.4, relay: 0.63, focusLimitUm: 12,
  stageLimitUm: 150, phaseWavelengthUm: 0.55, emissionWavelengthUm: 0.525,
  sensor: 'Nikon DS-Fi3', relayModel: 'Nikon C-0.63X-TS2',
  objectives: Object.freeze({
    10: Object.freeze({name:'CFI Achromat ADL 10XF', na:0.25, workingDistanceMm:6.2}),
    20: Object.freeze({name:'CFI Achromat LWD ADL 20XF', na:0.4, workingDistanceMm:3.1})
  })
});
const {width:W, height:H} = OPTICS;
const count = W * H;
const schema = 'bts.equipment.07-03.observation.v1';
const specIds = new Set(['micrometer','neurites','raster']);
const finite = (x, lo, hi) => Number.isFinite(x) && x >= lo && x <= hi;
const scalar = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function makeExample() {
  return {sampleId:'MICROMETER-10UM', fixture:'micrometer', objective:10, variant:'Ts2-FL',
    mode:'phase', epiInstalled:true, focusUm:0, stageXUm:0, stageYUm:0, parentRevision:0, history:[], contactIds:[]};
}

function checkJob(job) {
  if (!job || typeof job !== 'object') throw Error('Provide an acquisition job.');
  if (typeof job.sampleId !== 'string' || !job.sampleId.trim() || job.sampleId.length > 128) throw Error('A sample ID of 1–128 characters is required.');
  if (!specIds.has(job.fixture)) throw Error('Choose a micrometer, neurites or a calibrated raster.');
  if (![10,20].includes(job.objective)) throw Error('Install the documented 10× or 20× objective.');
  if (!['Ts2-FL','Ts2'].includes(job.variant)) throw Error('Choose the Ts2-FL or Ts2 stand.');
  if (!['phase','fluorescence'].includes(job.mode)) throw Error('Choose phase or fluorescence acquisition.');
  if (job.epiInstalled != null && typeof job.epiInstalled !== 'boolean') throw Error('Epi-module installation must be true or false.');
  if (job.mode === 'fluorescence' && (job.variant !== 'Ts2-FL' || job.epiInstalled===false)) throw Error('Fluorescence requires the configured Ts2-FL stand, blue LED and filter cube.');
  if (!finite(job.focusUm,-12,12)) throw Error('Focus offset is outside the modeled ±12 µm range.');
  if (![job.stageXUm,job.stageYUm].every(x=>finite(x,-150,150))) throw Error('The digital field center must be within ±150 µm of the specimen origin.');
  if (!Number.isSafeInteger(job.parentRevision ?? 0) || !finite(job.parentRevision ?? 0,0,Number.MAX_SAFE_INTEGER-1)) throw Error('Provide a nonnegative parent revision.');
  if (!Array.isArray(job.history ?? []) || !(job.history ?? []).every(x => x && typeof x==='object' && !Array.isArray(x))) throw Error('History must be a list of provenance records.');
  if (!Array.isArray(job.contactIds ?? []) || !(job.contactIds ?? []).every(x => typeof x === 'string')) throw Error('Contact IDs must be a list of strings.');
}

function checkRaster(r, mode) {
  if (!r) throw Error('Load a raster and specify its specimen-plane calibration.');
  if (!Number.isInteger(r.width) || !Number.isInteger(r.height) || !finite(r.width,2,4096) || !finite(r.height,2,4096) || r.width*r.height>4194304) throw Error('Calibrated rasters must be 2–4096 pixels per axis and at most 4 megapixels.');
  if (!finite(r.pixelSizeUm,0.01,100)) throw Error('Enter a source calibration from 0.01 to 100 µm/pixel.');
  if (r.channel !== mode) throw Error('The imported image channel does not match the selected acquisition mode.');
  if (typeof r.sourceName !== 'string' || !r.sourceName.trim()) throw Error('Give the imported raster a source name.');
  if (!(r.pixels instanceof Uint8Array || r.pixels instanceof Uint8ClampedArray) || r.pixels.length!==r.width*r.height) throw Error('The raster must contain one 8-bit intensity per pixel.');
}

export function measureDistance(job, start, end) {
  checkJob(job);
  for (const point of [start,end]) {
    if (!Array.isArray(point) || point.length!==2 || !finite(point[0],0,W-1) || !finite(point[1],0,H-1)) throw Error('Place both ruler points at valid image pixel centers.');
  }
  const pitch = OPTICS.sensorPitchUm/(job.objective*OPTICS.relay);
  const distancePx = Math.hypot(end[0]-start[0],end[1]-start[1]);
  return {startPx:[...start], endPx:[...end], distancePx, distanceUm:distancePx*pitch};
}

// The calibration object is a finite 1 mm-long virtual grating with 1.5 µm-wide
// absorbing marks, long at every fifth division. Pixel apertures integrate the mark edges.
function micrometer(job, pitch) {
  const object = new Float32Array(count);
  if (job.mode === 'fluorescence') return object;
  for (let x=0; x<W; x++) {
    const u = job.stageXUm+(x+0.5-W/2)*pitch;
    const mark = Math.round(u/10);
    if (Math.abs(mark)>50) continue;
    const halfHeight = mark%5===0 ? 22 : 13;
    const d = u-10*mark;
    const fraction = Math.max(0, Math.min(0.75,d+pitch/2) - Math.max(-0.75,d-pitch/2))/pitch;
    if (!fraction) continue;
    for (let y=0; y<H; y++) {
      const v = Math.abs(job.stageYUm+(y+0.5-H/2)*pitch);
      object[y*W+x]=fraction*scalar((halfHeight+pitch/2-v)/pitch,0,1);
    }
  }
  return object;
}

// An original seeded drawing of soma profiles and tapering branched curves on a plane.
// The outline and emission are arbitrary static targets. No biological dynamics are assumed.
const somata = [[-35,-16,6.1,4.6,.4],[7,9,7,5.1,-.6],[45,-24,6,4,-.4],[-49,35,5.3,4.4,.9],[64,34,6,4.2,.3],[-7,-44,5.6,4,-.9],[-92,-38,6.2,4.1,.7],[101,-43,6,5.1,.3],[-16,66,6.6,5.3,.3]];
function morphologyPaths() {
  let seed = 73116;
  const random = () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const lines=[];
  function grow(x,y,angle,length,radius,depth) {
    const steps=Math.ceil(length/2), step=length/steps;
    let bend=(random()-.5)*.15;
    for(let i=0;i<steps;i++){
      const fraction=i/steps;
      bend=bend*.83+(random()-.5)*.15;
      angle+=bend;
      const xx=x+step*Math.cos(angle), yy=y+step*Math.sin(angle);
      lines.push([x,y,xx,yy,radius*(1-.57*fraction)]);
      if(depth && i===Math.floor(steps*.56)){
        grow(xx,yy,angle+(random()>.5?1:-1)*(.48+.45*random()),length*(.35+.27*random()),radius*.56,depth-1);
      }
      x=xx;y=yy;
    }
  }
  for (const [x,y,r] of somata) {
    const phase=random()*2*Math.PI;
    for(let k=0;k<5;k++){
      const angle=phase+2*Math.PI*(k+random()*.4)/5;
      grow(x+.63*r*Math.cos(angle),y+.63*r*Math.sin(angle),angle,k===0?67:19+random()*24,k===0?.62:1.25,2);
    }
  }
  return lines;
}
const processes=morphologyPaths();

function morphology(job,pitch) {
  const object=new Float32Array(count);
  const left=job.stageXUm+(0.5-W/2)*pitch, top=job.stageYUm+(0.5-H/2)*pitch;
  function paint(minX,minY,maxX,maxY,profile){
    const x0=Math.max(0,Math.ceil((minX-left)/pitch)),x1=Math.min(W-1,Math.floor((maxX-left)/pitch));
    const y0=Math.max(0,Math.ceil((minY-top)/pitch)),y1=Math.min(H-1,Math.floor((maxY-top)/pitch));
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
      const i=y*W+x, value=profile(left+x*pitch,top+y*pitch);
      if(value>object[i]) object[i]=value;
    }
  }
  for (const [x1,y1,x2,y2,r] of processes) {
    const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy,extent=r+pitch;
    paint(Math.min(x1,x2)-extent,Math.min(y1,y2)-extent,Math.max(x1,x2)+extent,Math.max(y1,y2)+extent,(x,y)=>{
      const t=scalar(((x-x1)*dx+(y-y1)*dy)/len2,0,1);
      const dist=Math.hypot(x-x1-t*dx,y-y1-t*dy);
      return .65*scalar((r+pitch*.5-dist)/(r*.7+pitch*.5),0,1);
    });
  }
  for(const [cx,cy,a,b,angle] of somata) {
    const ca=Math.cos(angle),sa=Math.sin(angle);
    paint(cx-a,cy-a,cx+a,cy+a,(x,y)=>{
      const xx=x-cx,yy=y-cy, u=(xx*ca+yy*sa)/a,v=(-xx*sa+yy*ca)/b;
      const shell=Math.max(0,1-u*u-v*v);
      if(shell===0)return 0;
      const nucleus=Math.exp(-((u-.15)**2+(v+.11)**2)*12);
      return job.mode==='phase' ? .96*Math.sqrt(shell)-.23*nucleus : .93*Math.sqrt(shell)*(1-.68*nucleus);
    });
  }
  return object;
}

function imported(job,pitch,r) {
  checkRaster(r,job.mode);
  const object=new Float32Array(count);
  const background=job.mode==='phase'?.80:0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const u=(job.stageXUm+(x+.5-W/2)*pitch)/r.pixelSizeUm+(r.width-1)/2;
    const v=(job.stageYUm+(y+.5-H/2)*pitch)/r.pixelSizeUm+(r.height-1)/2;
    if(u<0||v<0||u>r.width-1||v>r.height-1){object[y*W+x]=background;continue;}
    const x0=Math.floor(u),y0=Math.floor(v),x1=Math.min(r.width-1,x0+1),y1=Math.min(r.height-1,y0+1);
    const tx=u-x0,ty=v-y0;
    const a=r.pixels[y0*r.width+x0]*(1-tx)+r.pixels[y0*r.width+x1]*tx;
    const b=r.pixels[y1*r.width+x0]*(1-tx)+r.pixels[y1*r.width+x1]*tx;
    object[y*W+x]=(a*(1-ty)+b*ty)/255;
  }
  return object;
}

function blurAxis(data,kernel,r,vertical) {
  const out=new Float32Array(count);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    let sum=0;
    for(let k=-r;k<=r;k++) {
      const i=vertical?scalar(y+k,0,H-1)*W+x:y*W+scalar(x+k,0,W-1);
      sum+=data[i]*kernel[k+r];
    }
    out[y*W+x]=sum;
  }
  return out;
}

// Gaussian approximation to the central diffraction lobe; geometric blur variances add.
function gaussian(data,sigma) {
  if(sigma<.08)return data;
  const r=Math.ceil(3*sigma), kernel=new Float64Array(2*r+1);
  let total=0;
  for(let k=-r;k<=r;k++){kernel[k+r]=Math.exp(-.5*(k/sigma)**2);total+=kernel[k+r];}
  for(let i=0;i<kernel.length;i++)kernel[i]/=total;
  return blurAxis(blurAxis(data,kernel,r,false),kernel,r,true);
}

// Image-only detection of absorbing ticks. Centroids use relative darkness; a least-squares
// fit of centroid position against consecutive mark index averages edge quantization.
export function measurePitch(frame) {
  const {width,height,pixels,metadata}=frame;
  if(metadata.acquisition.fixture!=='micrometer'||metadata.acquisition.mode!=='phase')return null;
  // Choose a row crossing all engraved divisions. A crop that shows only the long
  // fifth-division marks cannot support a fine-pitch reading.
  const pitch=metadata.pixelSizeUm, stageY=metadata.acquisition.stageYUm;
  const scanY=scalar(Math.round((height-1)/2-stageY/pitch),0,height-1);
  if(Math.abs(stageY+(scanY+.5-height/2)*pitch)>12)return null;
  const profile=new Float64Array(width);
  for(let x=0;x<width;x++)profile[x]=pixels[4*(scanY*width+x)+1];
  const dark=Math.min(...profile), light=Math.max(...profile);
  if(light-dark<20)return null;
  const cutoff=(light+dark)/2;
  const centers=[];
  let widthSum=0,moment=0,first=-1;
  for(let x=0;x<width;x++){
    if(profile[x]<cutoff){
      if(first<0)first=x;
      const darkness=light-profile[x];
      widthSum+=darkness;
      moment+=x*darkness;
    }else if(first>=0){
      if(first>0&&x<width)centers.push(moment/widthSum);
      widthSum=0;moment=0;first=-1;
    }
  }
  if(centers.length<3)return null;
  const meanIndex=(centers.length-1)/2;
  const meanX=centers.reduce((s,v)=>s+v,0)/centers.length;
  let numerator=0,denominator=0;
  centers.forEach((px,i)=>{numerator+=(i-meanIndex)*(px-meanX);denominator+=(i-meanIndex)**2;});
  const pitchPx=numerator/denominator;
  return {pitchPx,pitchUm:pitchPx*metadata.pixelSizeUm,markCount:centers.length};
}

export function acquire(job,raster) {
  checkJob(job);
  const {sampleId,fixture,variant,mode,objective,focusUm,stageXUm,stageYUm}=job;
  const lens=OPTICS.objectives[objective], pitch=OPTICS.sensorPitchUm/(objective*OPTICS.relay);
  const lambda=mode==='phase'?OPTICS.phaseWavelengthUm:OPTICS.emissionWavelengthUm;
  const diffractionSigmaUm=.51*lambda/(2.355*lens.na);
  const defocusSigmaUm=Math.abs(focusUm)*Math.tan(Math.asin(lens.na))/2;
  let image;
  if(fixture==='raster'){
    image=gaussian(imported(job,pitch,raster),defocusSigmaUm/pitch);
  }else{
    const object=fixture==='micrometer'?micrometer(job,pitch):morphology(job,pitch);
    const psf=gaussian(object,Math.hypot(diffractionSigmaUm,defocusSigmaUm)/pitch);
    if(mode==='fluorescence')image=psf;
    else if(fixture==='micrometer')image=psf.map(v=>.82-.73*v);
    else{
      const halo=gaussian(psf,1.9/pitch);
      image=psf.map((v,i)=>.71-.61*v+.45*halo[i]);
    }
  }
  const pixels=new Uint8ClampedArray(count*4);
  for(let i=0;i<count;i++){
    const v=Math.round(255*scalar(image[i],0,1));
    pixels[4*i]=mode==='phase'?v:Math.round(v*.10);
    pixels[4*i+1]=v;
    pixels[4*i+2]=mode==='phase'?v:Math.round(v*.17);
    pixels[4*i+3]=255;
  }
  const acquisition={fixture,variant,mode,objective,focusUm,stageXUm,stageYUm,epiInstalled:variant==='Ts2-FL'&&(job.epiInstalled??true)};
  const parentRevision=job.parentRevision??0, revision=parentRevision+1;
  const source=fixture==='raster'
    ? {kind:'calibrated-raster-resample',name:raster.sourceName,width:raster.width,height:raster.height,pixelSizeUm:raster.pixelSizeUm,channel:raster.channel}
    : {kind:'synthetic',name:fixture==='micrometer'?'10 µm stage micrometer':'Original planar neurite morphology',fixtureVersion:1};
  const lengthUm=objective===10?20:10;
  const metadata={
    schema,deviceId:'07-03',sampleId,parentRevision,revision,contactIds:[...(job.contactIds??[])],
    history:[...structuredClone(job.history??[]),{deviceId:'07-03',operation:'image-acquisition',sampleId,parentRevision,revision,fixture,objective,mode,sourceKind:source.kind}],
    source,acquisition,width:W,height:H,pixelSizeUm:pitch,fovUm:{width:W*pitch,height:H*pitch},
    coordinateFrame:'Pixel centers indexed from (0,0) at upper left; specimen x points right, y down. Stage X/Y is the physical center of the field in µm.',
    scaleBar:{lengthUm,lengthPx:lengthUm/pitch},
    optics:{objectiveName:lens.name,na:lens.na,relay:OPTICS.relay,relayModel:OPTICS.relayModel,detector:OPTICS.sensor,sensorPitchUm:OPTICS.sensorPitchUm,
      wavelengthUm:lambda,diffractionSigmaUm:fixture==='raster'?null:diffractionSigmaUm,defocusSigmaUm,stand:variant},
    provenance:'Simulated acquisition; nominal calibration from detector pitch and optics. Display intensities are relative 8-bit values.',
    measurement:null
  };
  const frame={width:W,height:H,pixels,metadata};
  metadata.measurement=measurePitch(frame);
  return frame;
}
