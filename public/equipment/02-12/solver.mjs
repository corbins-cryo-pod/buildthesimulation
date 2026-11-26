export const optics=Object.freeze({10:Object.freeze({id:'MUE12100',magnification:10,na:.30,workingMm:17.5}),20:Object.freeze({id:'MUE12200',magnification:20,na:.45,workingMm:4.5})});
export const camera=Object.freeze({type:'ideal virtual sensor, not Nikon Digital Sight',widthPx:512,heightPx:320,imagePixelUm:5,relay:1,wavelengthUm:.55});
export const coupon=Object.freeze({sampleId:'BTS-LV100ND-INERT-GRATING',sampleRevision:'coupon-r1',referencePitchUm:40,finePitchUm:1.25,markUm:[15,-15],axis:'coupon XY' });
export const defaults=Object.freeze({objective:10,xUm:0,yUm:0,focusUm:0,illumination:1});
export function validate(p){
 if(!p||![10,20].includes(p.objective)||![p.xUm,p.yUm,p.focusUm,p.illumination].every(Number.isFinite)||Math.abs(p.xUm)>90||Math.abs(p.yUm)>90||Math.abs(p.focusUm)>30||p.illumination<.05||p.illumination>1.4)throw Error('Use 10×/20×, stage ±90 µm, focus ±30 µm, and illumination 0.05–1.4.');
 return {objective:p.objective,xUm:p.xUm,yUm:p.yUm,focusUm:p.focusUm,illumination:p.illumination};
}
export function profile(p){
 const s=validate(p),o=optics[s.objective],samplePixelUm=camera.imagePixelUm/(o.magnification*camera.relay),cutoffCycPerUm=2*o.na/camera.wavelengthUm;
 return {settings:s,objective:o,samplePixelUm,fovUm:[camera.widthPx*samplePixelUm,camera.heightPx*samplePixelUm],rayleighUm:.61*camera.wavelengthUm/o.na,cutoffCycPerUm,nyquistCycPerUm:1/(2*samplePixelUm),defocusSigmaUm:Math.abs(s.focusUm)*Math.tan(Math.asin(o.na))/2};
}
export function mtf(f,view){
 if(!Number.isFinite(f)||f<0)throw Error('Frequency must be finite and nonnegative.');
 const v=f/view.cutoffCycPerUm;if(v>=1)return 0;
 const incoherent=2/Math.PI*(Math.acos(v)-v*Math.sqrt(1-v*v)),x=Math.PI*f*view.samplePixelUm,pixel=x===0?1:Math.sin(x)/x;
 return incoherent*pixel*Math.exp(-2*Math.PI**2*view.defocusSigmaUm**2*f*f);
}
export function worldAt(view,u,v){
 const s=view.settings;
 return [s.xUm+(u+.5-camera.widthPx/2)*view.samplePixelUm,s.yUm-(v+.5-camera.heightPx/2)*view.samplePixelUm];
}
export function projected(view,x,y){
 const s=view.settings;
 return [(x-s.xUm)/view.samplePixelUm+camera.widthPx/2-.5,(s.yUm-y)/view.samplePixelUm+camera.heightPx/2-.5];
}
function values(view,xs,y){
 const fine=y>=-34&&y<=-26, pitch=fine?coupon.finePitchUm:coupon.referencePitchUm,C=mtf(1/pitch,view),phase=fine?2:13;
 const sigma=Math.hypot(1.9,view.defocusSigmaUm,view.rayleighUm*.45);
 const [mx,my]=coupon.markUm,fy=.28*(1.9/sigma)**2*Math.exp(-.5*((y-my)/sigma)**2);
 return xs.map(x=>Math.min(1,Math.max(0,view.settings.illumination*(.49+.33*C*Math.cos(2*Math.PI*(x-phase)/pitch)-fy*Math.exp(-.5*((x-mx)/sigma)**2)))));
}
export function measure(view){
 let row=30;
 while(row<camera.heightPx-1&&worldAt(view,0,row)[1]>=-38&&worldAt(view,0,row)[1]<=-5)row++;
 const xs=Array.from({length:camera.widthPx},(_,i)=>worldAt(view,i,row)[0]), pix=values(view,xs,worldAt(view,0,row)[1]).map(x=>Math.round(x*255)), crossings=[];
 const low=Math.min(...pix),high=Math.max(...pix),threshold=(low+high)/2;
 if(high-low>=4)for(let i=1;i<pix.length;i++)if(pix[i-1]<threshold&&pix[i]>=threshold)crossings.push(i-1+(threshold-pix[i-1])/(pix[i]-pix[i-1]));
 const ds=crossings.slice(1).map((x,i)=>x-crossings[i]).sort((a,b)=>a-b);
 const pixelPitch=ds.length?(ds[Math.floor((ds.length-1)/2)]+ds[Math.floor(ds.length/2)])/2:null;
 return {rowPx:row,crossingsPx:crossings,intervalCount:ds.length,pixelPitch,pitchUm:pixelPitch===null?null:pixelPitch*view.samplePixelUm,method:'median consecutive ascending midlevel crossings in captured 8-bit grating row; no nominal pitch input'};
}
export function raster(view){
 const a=new Uint8ClampedArray(camera.widthPx*camera.heightPx), xs=Array.from({length:camera.widthPx},(_,i)=>worldAt(view,i,0)[0]);
 for(let y=0;y<camera.heightPx;y++)a.set(values(view,xs,worldAt(view,0,y)[1]).map(x=>Math.round(x*255)),y*camera.widthPx);
 return a;
}
export function capture(settings,revision=1,parentRevision=null){
 const view=profile(settings),measurement=measure(view),markPx=projected(view,...coupon.markUm),inside=markPx.every((n,i)=>n>=-.5&&n<(i?camera.heightPx:camera.widthPx)-.5);
 return {schema:'bts.optical-inspection.image.v1',deviceId:'02-12',origin:'synthetic-ideal-optics',sample:coupon,revision,parentRevision,settings:view.settings,objective:view.objective,camera,measurement,scale:{samplePixelUm:view.samplePixelUm,fovUm:view.fovUm,barUm:20,barPx:20/view.samplePixelUm,originAtPixel00Um:worldAt(view,0,0),coordinateFrame:'sample XY: +x right, +y up; pixel coordinates +u right, +v down'},
  optics:{rayleighUm:view.rayleighUm,cutoffCycPerUm:view.cutoffCycPerUm,finePatchContrastTransfer:mtf(1/coupon.finePitchUm,view),defocusSigmaUm:view.defocusSigmaUm},fixtureMark:{centerUm:coupon.markUm,centerPx:inside?markPx:null,inField:inside,provenance:'known artificial feature, not automatic detection'}};
}
export const initial=()=>({settings:{...defaults},revision:0,result:null});
export function action(s,{type,payload}){
 switch(type){
  case 'focus':return {...s,settings:{...s.settings,focusUm:0},result:null};
  case 'objective':return {...s,settings:validate({...s.settings,objective:s.settings.objective===10?20:10}),result:null};
  case 'configure':return {...s,settings:validate(payload),result:null};
  case 'capture':{ const p=payload===undefined?s.settings:validate(payload);return {...s,settings:p,revision:s.revision+1,result:capture(p,s.revision+1,s.revision||null)}; }
  case 'reset':return initial();
  default:throw Error('Unknown inspection action.');
 }
}
