// Low-power virtual microscope analytical example; no control of a physical laser.
export const LAMBDA=532,SI=520.45,PS=1001.4,RAW_OFFSET=4;
export const refs={S:{name:'crystalline silicon',bands:[[SI,3.3,1]]},P:{name:'polystyrene',bands:[[620.9,4,.18],[PS,5,1],[1031.8,5,.30]]}};
export const windows={S:[508,533],P:[984,1018]};
export const objectives={10:{NA:.25},50:{NA:.75}};
const errors=(code,message)=>({ok:false,code,message}),within=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export const shift=(laserNm,scatteredNm)=>1e7*(1/laserNm-1/scatteredNm);
export const stokesNm=(laserNm,cm)=>1/(1/laserNm-cm/1e7);
export const gaussian=(delta,w)=>Math.exp(-4*Math.log(2)*(delta/w)**2);
export const broaden=(material,lsf)=>Math.hypot(material,lsf);
const normalization=w=>w*Math.sqrt(Math.PI/(4*Math.log(2)));
export function focusResponse(offset,mag){
 const axialHwhmUm=LAMBDA/1000/(2*objectives[mag].NA**2);
 return {axialHwhmUm,AiryRadiusUm:.61*(LAMBDA/1000)/objectives[mag].NA,eta:1/(1+(offset/axialHwhmUm)**2)};
}
export function tiles(rows=['SPSPS','PSPSP','SPSPS','PSPSP'],id='SI-PS-CHECKER-532',revision=1){
 return {schema:'bts.raman-tiles.v1',sampleId:id,revision,pitchUm:12,columns:rows[0].length,rows:rows.length,materials:rows.join('').split(''),references:{S:'NMIJ-Si-520.45',P:'ASTM-PS-1001.4'},frame:'row major; x right; y away from operator',provenance:'Synthetic inert two-material witness'};
}
export function validate(input){
 if(!input||input.schema!=='bts.raman-tiles.v1'||typeof input.sampleId!=='string'||!/^[A-Za-z0-9_-]{1,70}$/.test(input.sampleId)||!Number.isInteger(input.revision)||input.revision<0||!Number.isInteger(input.columns)||!Number.isInteger(input.rows)||!within(input.columns,1,15)||!within(input.rows,1,15)||!within(input.pitchUm,3,80)||!Array.isArray(input.materials)||input.materials.length!==input.columns*input.rows||input.materials.some(x=>!Object.hasOwn(refs,x)))return errors('sample','Use a 1–15 column by 1–15 row Si/PS tile file with 3–80 µm pitch, unique identity and reversible row-major coordinates.');
 return {ok:true,value:{...tiles(Array.from({length:input.rows},(_,r)=>input.materials.slice(r*input.columns,(r+1)*input.columns).join('')),input.sampleId,input.revision),pitchUm:input.pitchUm,provenance:String(input.provenance??'Imported inert tile layout').slice(0,160)}};
}
export const axis=Array.from({length:1181},(_,i)=>480+i*.5);
export function spectrum(key,axis0,opts={}){
 const {lsf=2,offset=RAW_OFFSET,correction=RAW_OFFSET,signal=1}=opts;
 const bands=refs[key].bands.map(([p,w,a])=>[p+offset-correction,broaden(w,lsf),a]);
 return axis0.map(x=>.004+.0000013*(x-480)+signal*bands.reduce((total,[p,w,a])=>total+a*gaussian(x-p,w)/normalization(w),0));
}
export function peak(x,y,[l,r]){
 const i0=x.findIndex(v=>v>=l),i1=x.findLastIndex(v=>v<=r),n=i1-i0+1;
 if(i0<0||n<4)return null;
 const base=(i)=>y[i0]+(y[i1]-y[i0])*(x[i]-x[i0])/(x[i1]-x[i0]);
 const heights=Array.from({length:n},(_,j)=>y[i0+j]-base(i0+j));
 let i=heights.indexOf(Math.max(...heights)),area=0;
 for(let j=1;j<n;j++)area+=(heights[j-1]+heights[j])*.5*(x[i0+j]-x[i0+j-1]);
 const h=heights[i],dx=x[i0+1]-x[i0];
 let center=x[i0+i],fwhm=null;
 if(i>0&&i<n-1&&h>1e-8){
  const dd=heights[i-1]-2*h+heights[i+1];
  if(dd!==0)center+=.5*dx*(heights[i-1]-heights[i+1])/dd;
  let a=i;while(a>0&&heights[a]>=h/2)a--;
  let b=i;while(b<n-1&&heights[b]>=h/2)b++;
  if(a<i&&b>i&&heights[a]<h/2&&heights[b]<h/2){
   const interp=(u,v)=>x[i0+u]+(x[i0+v]-x[i0+u])*(h/2-heights[u])/(heights[v]-heights[u]);
   fwhm=interp(b,b-1)-interp(a,a+1);
  }
 }
 return {centerCm:center,fwhmCm:fwhm,area:Math.max(0,area)};
}
export function calibration(lsf=2){
 const local=Array.from({length:241},(_,i)=>495+i*.25);
 const y=spectrum('S',local,{lsf,correction:0});
 const measured=peak(local,y,[500,550]).centerCm;
 return {id:'BTS-SI-532-IDEAL',referenceCm:SI,rawPeakCm:measured,correctionCm:measured-SI,provenance:'Virtual silicon line with published coordinate; not calibration of a physical device.'};
}
export function initial(){return {power:true,door:false,loaded:true,armed:true,fixture:tiles(),mag:50,defocus:0,lsf:2,exposure:.5,cal:calibration(),revision:0};}
export function dispatch(s,a,v){
 if(a==='reset')return {ok:true,state:{...initial(),revision:s.revision}};
 if(a==='power')return {ok:true,state:{...s,power:!s.power,armed:false}};
 if(a==='door')return {ok:true,state:{...s,door:!s.door,armed:false}};
 if(a==='arm')return s.power&&s.loaded&&!s.door?{ok:true,state:{...s,armed:!s.armed}}:errors('interlock','Close the virtual sample cover and install a coupon first.');
 if(a==='load'||a==='import'){
  if(!s.door)return errors('cover','Open the sample cover before changing a coupon.');
  if(a==='load')return {ok:true,state:{...s,loaded:!s.loaded,armed:false}};
  const q=validate(v);if(!q.ok)return q;
  return {ok:true,state:{...s,fixture:q.value,loaded:true,armed:false}};
 }
 if(a==='objective')return {ok:true,state:{...s,mag:s.mag===50?10:50}};
 if(a==='zero-focus')return {ok:true,state:{...s,defocus:0}};
 if(a==='settings')return {ok:true,state:{...s,...v}};
 if(a==='clear-axis')return {ok:true,state:{...s,cal:null}};
 if(a==='calibrate')return s.power&&s.loaded&&!s.door&&s.armed?{ok:true,state:{...s,cal:calibration(s.lsf)}}:errors('interlock','Close the cover and enable the simulated optical path to use the silicon witness.');
 if(a==='map')return scan(s);
 return errors('action','Unknown instrument action.');
}
export function scan(s){
 if(!s.power||s.door||!s.loaded||!s.armed)return errors('interlock','Power on, load the coupon, close the cover and enable the simulated optical path.');
 if(!s.cal)return errors('calibration','Apply the silicon witness correction before quantitative mapping.');
 if(!Object.hasOwn(objectives,s.mag)||!within(s.defocus,-12,12)||!within(s.lsf,1,8)||!within(s.exposure,.05,2))return errors('range','Choose a modeled focus (±12 µm), blur (1–8 cm⁻¹) and exposure (0.05–2 s).');
 const q=validate(s.fixture);if(!q.ok)return q;
 const a=q.value,focus=focusResponse(s.defocus,s.mag),sigs=Object.fromEntries(Object.keys(refs).map(k=>[
  k,spectrum(k,axis,{lsf:s.lsf,correction:s.cal.correctionCm,signal:focus.eta*s.exposure/.5})
 ]));
 const f=Object.fromEntries(Object.keys(sigs).map(k=>[k,{S:peak(axis,sigs[k],windows.S),P:peak(axis,sigs[k],windows.P)}]));
 const points=a.materials.map((k,i)=>({index:i,col:i%a.columns,row:Math.floor(i/a.columns),xUm:(i%a.columns+.5)*a.pitchUm,yUm:(Math.floor(i/a.columns)+.5)*a.pitchUm,sourceKey:k,fit:f[k],assigned:f[k].S.area>f[k].P.area?'S':'P'}));
 const revision=s.revision+1;
 return {ok:true,state:{...s,revision},result:{schema:'bts.raman-map.v1',classification:'simulated',sampleId:a.sampleId,sampleRevision:a.revision,mapRevision:revision,input:a,calibration:s.cal,instrument:'HORIBA LabRAM HR Evolution',shiftCm:axis,signalUnits:'relative counts (arbitrary)',signalTable:sigs,points,exposureS:s.exposure,recipe:{laserVacuumNm:LAMBDA,objectiveMag:s.mag,nominalNA:objectives[s.mag].NA,offsetUm:s.defocus,assumedInstrumentFwhmCm:s.lsf,focus,peakWindowsCm:windows},frame:'sample origin at lower-left coupon corner; x right, y away; row-major; row 0 first',spectraCompression:'point.sourceKey selects a shared material trace from signalTable; this ideal case has uniform exposure and defocus on all tiles'}};
}
export function mapCsv(out){return ['sample_id,sample_revision,map_revision,row,col,x_um,y_um,silicon_area_counts_cm_minus_1,polystyrene_area_counts_cm_minus_1,assigned',...out.points.map(p=>[out.sampleId,out.sampleRevision,out.mapRevision,p.row,p.col,p.xUm,p.yUm,p.fit.S.area,p.fit.P.area,p.assigned].join(','))].join('\n')+'\n';}
