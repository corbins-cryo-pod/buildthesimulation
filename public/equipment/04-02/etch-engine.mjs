// 04-02: educational, rate-based cross-section; not a plasma solver or process recipe recommendation.
export const VERSION='04-02-etch-v1';
export const REFERENCE='https://doi.org/10.6028/jres.121.028';
export const CONDITIONS={chemistry:'HBr/Cl2',hbrSccm:10,cl2Sccm:5,pressureMtorr:15,temperatureC:20,waferMm:100,stack:'ZEP/Si/SiO2'};
export const BASELINE={source:REFERENCE,kind:'published summary + assumed nominal taper',conditions:CONDITIONS,points:[{coilW:700,biasW:60,siRate:95,maskRate:72,oxideRate:1.9,angle:88.5}]};
export const EXAMPLE={sampleId:'SOI-04-02-001',revision:0,stack:CONDITIONS.stack,waferMm:100,coilW:700,biasW:60,timeS:120,openingNm:1000,siNm:300,oxideNm:200,maskNm:200};
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
const inRange=(n,a,b)=>finite(n)&&n>=a&&n<=b;
const fail=(message)=>{throw new Error(message)};
const key=(x,y)=>x+':'+y;
export function normalizeCalibration(cal){
 if(!cal||typeof cal.source!=='string'||!cal.source.trim()||cal.source.length>500||!cal.conditions||!Array.isArray(cal.points)||!cal.points.length||cal.points.length>400)fail('Calibration needs a source, conditions and 1–400 points.');
 for(const [k,v] of Object.entries(CONDITIONS))if(cal.conditions[k]!==v)fail('Calibration must use identical documented fixed conditions: '+k);
 const map=new Map(),xs=[],ys=[];
 for(const p of cal.points){
  if(!p||!inRange(p.coilW,200,3000)||!inRange(p.biasW,5,300)||!inRange(p.siRate,0.001,100000)||!inRange(p.maskRate,0.001,100000)||!inRange(p.oxideRate,0,100000)||!inRange(p.angle,60,90))fail('Calibration point invalid: expected powers W, positive Si/mask rates nm/min, nonnegative oxide rate and inward angle 60–90 degrees.');
  if(map.has(key(p.coilW,p.biasW)))fail('Duplicate calibration point.');
  map.set(key(p.coilW,p.biasW),p);xs.push(p.coilW);ys.push(p.biasW);
 }
 const x=[...new Set(xs)].sort((a,b)=>a-b),y=[...new Set(ys)].sort((a,b)=>a-b);
 if(map.size!==x.length*y.length)fail('Calibration grid must be rectangular and complete.');
 return {map,x,y};
}
function bracket(a,v){if(!finite(v)||v<a[0]||v>a.at(-1))return null;const i=a.findIndex(x=>x>=v);if(a[i]===v)return [a[i],a[i],0];return [a[i-1],a[i],(v-a[i-1])/(a[i]-a[i-1])]}
export function interpolate(cal,coil,bias){
 const {map,x,y}=normalizeCalibration(cal),a=bracket(x,coil),b=bracket(y,bias);
 if(!a||!b)return null;
 const [x0,x1,u]=a,[y0,y1,v]=b;
 const z=[map.get(key(x0,y0)),map.get(key(x1,y0)),map.get(key(x0,y1)),map.get(key(x1,y1))];
 const result={};for(const k of ['siRate','maskRate','oxideRate','angle'])result[k]=(1-u)*(1-v)*z[0][k]+u*(1-v)*z[1][k]+(1-u)*v*z[2][k]+u*v*z[3][k];
 return result;
}
export function runEtch(input,cal=BASELINE){
 const base={schema:'bts.etch-cross-section.v1',deviceId:'04-02',modelVersion:VERSION,input:{...input},units:{length:'nm',time:'s',power:'W',angle:'deg',rate:'nm/min'},coordinateFrame:'x across trench; z depth positive into wafer from original Si surface',provenance:{source:cal?.source||null,kind:cal===BASELINE?'published-summary parameterization; not measured output':'user-provided calibration; not independently validated',conditions:CONDITIONS,calibrationPoints:cal?.points||[]}};
 const reject=(flag,message)=>({...base,flag,message,output:null});
 if(!input||typeof input.sampleId!=='string'||!input.sampleId.trim()||input.sampleId.length>100||!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>=Number.MAX_SAFE_INTEGER)return reject('invalid-input','Sample ID and nonnegative revision required.');
 if(input.stack!==CONDITIONS.stack||input.waferMm!==100)return reject('incompatible-sample','Only a 100 mm SOI wafer with ZEP resist and SiO2 BOX is supported.');
 for(const [k,a,b] of [['timeS',0,300],['openingNm',100,10000],['siNm',50,2000],['oxideNm',10,5000],['maskNm',10,2000],['coilW',200,3000],['biasW',5,300]])if(!inRange(input[k],a,b))return reject('invalid-input',k+' must be between '+a+' and '+b+'.');
 let rates;try{rates=interpolate(cal,input.coilW,input.biasW)}catch(e){return reject('invalid-calibration',e.message)}
 if(!rates)return reject('out-of-domain','No calibration supports this coil/bias combination; no predicted profile.');
 const {siRate,maskRate,oxideRate,angle}=rates;
 const requested=input.timeS/60,maskEnd=input.maskNm/maskRate,siEnd=input.siNm/siRate,oxideEnd=oxideRate>0?siEnd+input.oxideNm/oxideRate:Infinity;
 let t=Math.min(requested,maskEnd,oxideEnd);
 let flag=requested>=maskEnd?'mask-breakthrough':requested>=oxideEnd?'stack-exhausted':'in-domain';
 if(oxideEnd<maskEnd&&requested>=oxideEnd)flag='stack-exhausted';
 const slope=Math.tan((90-angle)*Math.PI/180);
 const maxDepth=slope>0?input.openingNm/(2*slope):Infinity;
 const depthAt=(m)=>Math.min(input.siNm,siRate*m)+Math.min(input.oxideNm,oxideRate*Math.max(0,m-siEnd));
 if(depthAt(t)>=maxDepth){const pinchTime=maxDepth<=input.siNm?maxDepth/siRate:siEnd+(maxDepth-input.siNm)/oxideRate;if(pinchTime<=t){t=pinchTime;flag='pinch-off'}}
 const siDepth=Math.min(input.siNm,siRate*t),oxideDepth=Math.min(input.oxideNm,oxideRate*Math.max(0,t-siEnd)),depth=siDepth+oxideDepth,remainingMask=Math.max(0,input.maskNm-maskRate*t);
 const bottomWidth=Math.max(0,input.openingNm-2*depth*slope);
 const output={sampleId:input.sampleId,revision:input.revision+1,parentRevision:input.revision,elapsedS:t*60,siDepthNm:siDepth,oxideDepthNm:oxideDepth,totalDepthNm:depth,remainingMaskNm:remainingMask,angleDeg:angle,topOpeningNm:input.openingNm,bottomOpeningNm:bottomWidth,siToMaskSelectivity:siRate/maskRate,siToOxideSelectivity:oxideRate>0?siRate/oxideRate:null,profile:[[-input.openingNm/2,0],[-bottomWidth/2,depth],[bottomWidth/2,depth],[input.openingNm/2,0]],rates,partial:flag!=='in-domain'};
 return {...base,flag,message:flag==='in-domain'?'Within supplied power grid; time-linear idealization.':'Stopped at '+flag+'; later evolution unsupported.',output};
}
export function compareHoldout(result,measurement){
 if(result.flag!=='in-domain'||!result.output)fail('Holdout prediction must finish in domain.');
 if(!measurement||typeof measurement.source!=='string'||!measurement.source.trim()||!inRange(measurement.depthNm,0,1e8)||!inRange(measurement.angleDeg,0,180)||!inRange(measurement.depthToleranceNm,0,1e8)||!inRange(measurement.angleToleranceDeg,0,180))fail('Holdout requires independent source, depth, angle and metrology tolerances.');
 const o=result.output;
 return {source:measurement.source,depth:{expected:measurement.depthNm,actual:o.totalDepthNm,tolerance:measurement.depthToleranceNm,unit:'nm',pass:Math.abs(o.totalDepthNm-measurement.depthNm)<=measurement.depthToleranceNm},angle:{expected:measurement.angleDeg,actual:o.angleDeg,tolerance:measurement.angleToleranceDeg,unit:'deg',pass:Math.abs(o.angleDeg-measurement.angleDeg)<=measurement.angleToleranceDeg}};
}
