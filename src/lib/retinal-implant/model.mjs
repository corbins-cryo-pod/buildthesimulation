import { retinalToVisual } from './percept.mjs';

export const MODEL_VERSION = 'retinal-1.0.0';
export const EXPORT_SCHEMA = 'bts.retinal.experiment.v1';
export const DEFAULT_CONFIG = Object.freeze({
  device:'argus-ii',rows:6,cols:10,pitchUm:575,diameterUm:225,eye:'RE',
  xUm:0,yUm:0,rotationDeg:0,gapUm:200,conductivitySm:0.2,returnMode:'remote',
  amplitudeUa:80,thresholdUa:60,phaseDurationMs:0.45,interphaseMs:0.1,
  frequencyHz:20,trainDurationMs:200,sequence:'simultaneous',pattern:'letter-e',
  encoder:'intensity',selectedId:'E28',pairSpacing:1,disabledIds:Object.freeze([]),
  rhoUm:300,lambdaUm:700,perceptModel:'axon',gridStepDeg:0.5,sceneSizeDeg:18,
  budgetMode:'peak',totalCurrentUa:1200,compareCircular:true,fieldView:'array',
  fieldGridSize:61,fieldSpanUm:1000,
});
export const PRESETS = Object.freeze([
  {id:'single',title:'Single contact',description:'Inspect one finite source and its spatial phosphene.',config:{pattern:'single',selectedId:'E28',gapUm:100,perceptModel:'axon'}},
  {id:'axon-pathways',title:'Axon pathways',description:'Compare circular spread with reference retinal nerve-fiber pathways.',config:{pattern:'single',selectedId:'E14',xUm:-1000,yUm:500,lambdaUm:1300}},
  {id:'pair',title:'Two contacts',description:'Electrode drives sum along each axon before the maximum is selected.',config:{pattern:'pair',selectedId:'E25',pairSpacing:2,returnMode:'ring',lambdaUm:1000}},
  {id:'letter',title:'Letter encoding',description:'Follow a synthetic scene through sampling, electrode drive and the percept model.',config:{pattern:'letter-e',encoder:'intensity'}},
  {id:'pulse-model',title:'Pulse dependence',description:'A representative pulse-train percept with explicitly assumed thresholds.',config:{pattern:'single',perceptModel:'biphasic',amplitudeUa:120,thresholdUa:60}},
  {id:'dropout',title:'Missing contacts',description:'Compare a letter with a contiguous group of unavailable contacts.',config:{pattern:'letter-e',disabledIds:['E14','E15','E24','E25','E34','E35'],budgetMode:'total-current',totalCurrentUa:1000}},
  {id:'interleaved',title:'Interleaved delivery',description:'Nonoverlapping electrical pulses; the spatial percept remains timing-independent.',config:{pattern:'bars',sequence:'interleaved',phaseDurationMs:0.2,returnMode:'ring'}},
]);
const ENUMS={device:['argus-ii','grid','hex'],eye:['RE','LE'],returnMode:['remote','ring'],sequence:['simultaneous','interleaved'],pattern:['single','pair','letter-e','landolt-c','bars','checkerboard','blank'],encoder:['intensity','edges'],perceptModel:['axon','scoreboard','biphasic'],budgetMode:['peak','total-current'],fieldView:['array','selected']};
export const PARAMETER_BOUNDS=Object.freeze({rows:[2,16],cols:[2,16],pitchUm:[250,1000],diameterUm:[100,500],xUm:[-3000,3000],yUm:[-3000,3000],rotationDeg:[-180,180],gapUm:[25,1000],conductivitySm:[0.05,1],amplitudeUa:[0,300],thresholdUa:[10,500],phaseDurationMs:[0.05,1],interphaseMs:[0,0.5],frequencyHz:[1,100],trainDurationMs:[20,1000],pairSpacing:[1,5],rhoUm:[100,800],lambdaUm:[100,2000],sceneSizeDeg:[6,30],totalCurrentUa:[10,10000],fieldSpanUm:[500,10000]});
const KEYS=new Set(Object.keys(DEFAULT_CONFIG)), idFor=i=>'E'+String(i+1).padStart(2,'0');
const clamp01=n=>Math.max(0,Math.min(1,n));
export function normalizeConfig(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Experiment settings must be an object.');
  for(const k of Object.keys(input))if(!KEYS.has(k))throw new Error(`Unknown experiment setting: ${k}.`);
  const c={...DEFAULT_CONFIG,...input};
  for(const [k,values] of Object.entries(ENUMS))if(!values.includes(c[k]))throw new Error(`Unsupported ${k}: ${c[k]}.`);
  for(const [k,[lo,hi]] of Object.entries(PARAMETER_BOUNDS))if(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw new Error(`${k} must be a finite number from ${lo} to ${hi}.`);
  for(const k of ['rows','cols','pairSpacing'])if(!Number.isInteger(c[k]))throw new Error(`${k} must be an integer.`);
  if(![0.5,0.25].includes(c.gridStepDeg))throw new Error('Visual grid spacing must be 0.5° or 0.25°.');
  if(![61,121,241].includes(c.fieldGridSize))throw new Error('Electrical sampling must be 61, 121 or 241 points per side.');
  if(typeof c.compareCircular!=='boolean')throw new Error('compareCircular must be true or false.');
  if(c.diameterUm>=c.pitchUm)throw new Error('Contact diameter must be smaller than contact pitch.');
  if(!Array.isArray(c.disabledIds)||c.disabledIds.length>256||c.disabledIds.some(id=>typeof id!=='string'))throw new Error('Unavailable contacts must be electrode identifiers.');
  const valid=new Set(Array.from({length:c.rows*c.cols},(_,i)=>idFor(i)));
  if(typeof c.selectedId!=='string')throw new Error('Selected contact must be an electrode identifier.');
  if(!valid.has(c.selectedId))c.selectedId='E01';
  c.disabledIds=[...new Set(c.disabledIds.filter(id=>valid.has(id)))].sort();
  if(2*c.phaseDurationMs+c.interphaseMs>1000/c.frequencyHz+1e-10)throw new Error('The biphasic pulse must fit within its period.');
  return c;
}
function bareContacts(c) {
  const p=[];
  for(let row=0;row<c.rows;row++)for(let col=0;col<c.cols;col++)p.push({id:idFor(p.length),row,col,x:(col-(c.cols-1)/2)*c.pitchUm+(c.device==='hex'?((row%2)-0.5)*c.pitchUm/2:0),y:((c.rows-1)/2-row)*c.pitchUm*(c.device==='hex'?Math.sqrt(3)/2:1)});
  const mx=p.reduce((s,a)=>s+a.x,0)/p.length,t=c.rotationDeg*Math.PI/180,co=Math.cos(t),si=Math.sin(t);
  return p.map(a=>({id:a.id,row:a.row,col:a.col,xUm:c.xUm+(a.x-mx)*co-a.y*si,yUm:c.yUm+(a.x-mx)*si+a.y*co,zUm:c.gapUm,radiusUm:c.diameterUm/2}));
}
function probeIds(c,points) {
  const anchor=points.find(p=>p.id===c.selectedId)||points[0];
  if(c.pattern!=='pair')return [anchor.id];
  const t=c.rotationDeg*Math.PI/180,x=anchor.xUm+c.pairSpacing*c.pitchUm*Math.cos(t),y=anchor.yUm+c.pairSpacing*c.pitchUm*Math.sin(t);
  const next=points.filter(p=>p.id!==anchor.id).sort((a,b)=>Math.hypot(a.xUm-x,a.yUm-y)-Math.hypot(b.xUm-x,b.yUm-y)||a.id.localeCompare(b.id))[0];
  return [anchor.id,next.id];
}
export function samplePattern(c,xDeg,yDeg) {
  if(c.pattern==='blank')return 0;
  if(c.pattern==='single'||c.pattern==='pair'){
    const points=bareContacts(c),ids=new Set(probeIds(c,points));
    return points.some(p=>{if(!ids.has(p.id))return false;const v=retinalToVisual(p.xUm,p.yUm);return Math.hypot(xDeg-v.xDeg,yDeg-v.yDeg)<0.45;})?1:0;
  }
  const x=xDeg/(c.sceneSizeDeg/2),y=yDeg/(c.sceneSizeDeg/2);
  if(c.pattern==='letter-e')return ((x>-.68&&x<-.36&&Math.abs(y)<.72)||(x>-.68&&x<.65&&(Math.abs(y-.57)<.15||Math.abs(y+.57)<.15||Math.abs(y)<.15)))?1:0;
  if(c.pattern==='landolt-c'){const r=Math.hypot(x,y);return r>.38&&r<.72&&!(x>0&&Math.abs(y)<.2)?1:0;}
  if(c.pattern==='bars')return Math.abs(y)<.72&&(Math.abs(x-.4)<.14||Math.abs(x+.4)<.14)?1:0;
  if(c.pattern==='checkerboard')return Math.abs(x)<.78&&Math.abs(y)<.78&&((Math.floor((x+.8)/.4)+Math.floor((y+.8)/.4))%2===0)?1:0;
  return 0;
}
function encodedDrive(c,x,y) {
  const aperture=Math.max(.15,c.pitchUm/280/4);
  if(c.encoder==='edges'){
    let gx=0,gy=0;const weights=[1,2,1];
    for(let k=-1;k<=1;k++){gx+=weights[k+1]*(samplePattern(c,x+aperture,y+k*aperture)-samplePattern(c,x-aperture,y+k*aperture));gy+=weights[k+1]*(samplePattern(c,x+k*aperture,y+aperture)-samplePattern(c,x+k*aperture,y-aperture));}
    return clamp01(Math.hypot(gx,gy)/4);
  }
  let sum=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)sum+=samplePattern(c,x+i*aperture,y+j*aperture);return sum/9;
}
export function generateContacts(input=DEFAULT_CONFIG) {
  const c=normalizeConfig(input),points=bareContacts(c),ids=new Set(probeIds(c,points)),disabled=new Set(c.disabledIds);
  const direct=c.pattern==='single'||c.pattern==='pair';
  const result=points.map(p=>{const v=retinalToVisual(p.xUm,p.yUm),enabled=!disabled.has(p.id),drive=enabled?(direct?(ids.has(p.id)?1:0):encodedDrive(c,v.xDeg,v.yDeg)):0;return {...p,...v,enabled,drive,amplitudeUa:drive*c.amplitudeUa,thresholdUa:c.thresholdUa};});
  const sum=result.reduce((s,p)=>s+p.amplitudeUa,0);
  if(c.budgetMode==='total-current'&&sum>c.totalCurrentUa)for(const p of result)p.amplitudeUa*=c.totalCurrentUa/sum;
  return result;
}
export function scheduleInfo(input,contacts=generateContacts(input)) {
  const c=normalizeConfig(input),active=contacts.filter(p=>p.enabled&&p.amplitudeUa>0),periodMs=1000/c.frequencyHz,pulseDurationMs=2*c.phaseDurationMs+c.interphaseMs;
  const slotMs=c.sequence==='interleaved'&&active.length?periodMs/active.length:periodMs;
  if(active.length&&pulseDurationMs>slotMs+1e-10)throw new Error(`Pulse duration exceeds the available ${slotMs.toFixed(4)} ms interleaved slot.`);
  return {active,periodMs,pulseDurationMs,slotMs,offsets:Object.fromEntries(active.map((p,i)=>[p.id,c.sequence==='interleaved'?i*slotMs:0]))};
}
export function buildWaveform(input,contactId=input.selectedId??DEFAULT_CONFIG.selectedId) {
  const c=normalizeConfig(input),contacts=generateContacts(c),contact=contacts.find(p=>p.id===contactId);
  if(!contact)throw new Error('Unknown waveform contact.');
  const s=scheduleInfo(c,contacts),offsetMs=s.offsets[contactId]??0,events=[];
  const amplitudeUa=contact.amplitudeUa;
  if(amplitudeUa>0)for(let k=0;k<1001;k++){
    const start=offsetMs+k*s.periodMs;
    if(start+s.pulseDurationMs>c.trainDurationMs+1e-10)break;
    events.push({startMs:start,endMs:start+c.phaseDurationMs,currentUa:-amplitudeUa});
    events.push({startMs:start+c.phaseDurationMs+c.interphaseMs,endMs:start+s.pulseDurationMs,currentUa:amplitudeUa});
  }
  const timeMs=[0],currentUa=[0];
  for(const e of events){timeMs.push(e.startMs,e.startMs,e.endMs,e.endMs);currentUa.push(0,e.currentUa,e.currentUa,0);}
  timeMs.push(c.trainDurationMs);currentUa.push(0);
  const pulseCount=events.length/2,phaseChargeNc=pulseCount?amplitudeUa*c.phaseDurationMs:0;
  const netChargeNc=events.reduce((sum,e)=>sum+e.currentUa*(e.endMs-e.startMs),0);
  return {contactId,timeMs:Float64Array.from(timeMs),currentUa:Float64Array.from(currentUa),events,pulseCount,amplitudeUa,phaseChargeNc,chargeDensityUcCm2:phaseChargeNc*1e5/(Math.PI*contact.radiusUm**2),netChargeNc,totalAbsoluteChargeNc:2*pulseCount*phaseChargeNc,offsetMs,periodMs:s.periodMs,trainDurationMs:c.trainDurationMs,phaseDurationMs:c.phaseDurationMs,interphaseMs:c.interphaseMs};
}
export function createElectricalSources(input,contacts=generateContacts(input)) {
  const c=normalizeConfig(input),schedule=scheduleInfo(c,contacts),complete=schedule.active.filter(p=>(schedule.offsets[p.id]??0)+schedule.pulseDurationMs<=c.trainDurationMs+1e-10);
  const selected=complete.find(p=>p.id===c.selectedId)||complete[0];
  const active=c.sequence==='interleaved'?(selected?[selected]:[]):complete;
  const sources=active.map(p=>({...p,currentUa:-p.amplitudeUa,kind:'stimulating'}));
  const totalCurrentUa=active.reduce((s,p)=>s+p.amplitudeUa,0);
  if(totalCurrentUa>0){
    if(c.returnMode==='remote')sources.push({id:'R01',xUm:c.xUm+12000,yUm:c.yUm,zUm:c.gapUm,radiusUm:250,currentUa:totalCurrentUa,kind:'return'});
    else {const radius=Math.max(5000,...contacts.map(p=>Math.hypot(p.xUm-c.xUm,p.yUm-c.yUm)+1200));for(let i=0;i<8;i++){const t=i*Math.PI/4;sources.push({id:'R'+String(i+1).padStart(2,'0'),xUm:c.xUm+radius*Math.cos(t),yUm:c.yUm+radius*Math.sin(t),zUm:c.gapUm,radiusUm:250,currentUa:totalCurrentUa/8,kind:'return'});}}
  }
  return {sources,schedule,totalCurrentUa,netCurrentUa:sources.reduce((s,p)=>s+p.currentUa,0),snapshotTimeMs:(selected?schedule.offsets[selected.id]:0)+c.phaseDurationMs/2,snapshotLabel:c.sequence==='interleaved'?`Interleaved cathodic phase · ${selected?.id??'no active contact'}`:'Simultaneous cathodic phase'};
}
export function createStimulusRaster(input) {
  const c=normalizeConfig(input),width=121,height=121,xDeg=Float32Array.from({length:width},(_,i)=>-15+i*.25),yDeg=Float32Array.from({length:height},(_,i)=>15-i*.25),brightness=new Float32Array(width*height);
  for(let row=0;row<height;row++)for(let col=0;col<width;col++)brightness[row*width+col]=samplePattern(c,xDeg[col],yDeg[row]);
  return {width,height,xDeg,yDeg,brightness};
}
export function measurePercept(data,relativeThreshold=.5) {
  const {width,height,brightness,xDeg,yDeg}=data;let peak=0,integral=0;
  for(const v of brightness){if(!Number.isFinite(v)||v<0)throw new Error('Percept samples must be finite and nonnegative.');peak=Math.max(peak,v);integral+=v;}
  const dx=Math.abs(xDeg[1]-xDeg[0]),dy=Math.abs(yDeg[1]-yDeg[0]);
  if(peak===0)return {peak:0,areaDeg2:0,integratedBrightness:0,centroidXDeg:null,centroidYDeg:null,elongation:null,majorAxisDeg:null,minorAxisDeg:null,components:0,touchesEdge:false,relativeThreshold,threshold:0};
  const mask=new Uint8Array(brightness.length);let count=0,cx=0,cy=0,touchesEdge=false;
  for(let r=0;r<height;r++)for(let col=0;col<width;col++){const i=r*width+col;if(brightness[i]>=relativeThreshold*peak){mask[i]=1;count++;cx+=xDeg[col];cy+=yDeg[r];if(!r||!col||r===height-1||col===width-1)touchesEdge=true;}}
  cx/=count;cy/=count;let xx=0,yy=0,xy=0;
  for(let i=0;i<mask.length;i++)if(mask[i]){const x=xDeg[i%width]-cx,y=yDeg[Math.floor(i/width)]-cy;xx+=x*x;yy+=y*y;xy+=x*y;}
  xx/=count;yy/=count;xy/=count;const discriminant=Math.hypot(xx-yy,2*xy),a=Math.max(0,(xx+yy+discriminant)/2),b=Math.max(0,(xx+yy-discriminant)/2);
  let components=0;const visited=new Uint8Array(mask.length);
  for(let seed=0;seed<mask.length;seed++)if(mask[seed]&&!visited[seed]){components++;const queue=[seed];visited[seed]=1;for(let k=0;k<queue.length;k++){const i=queue[k],r=Math.floor(i/width),col=i%width;for(const n of [r>0?i-width:-1,r<height-1?i+width:-1,col>0?i-1:-1,col<width-1?i+1:-1])if(n>=0&&mask[n]&&!visited[n]){visited[n]=1;queue.push(n);}}}
  return {peak,areaDeg2:count*dx*dy,integratedBrightness:integral*dx*dy,centroidXDeg:cx,centroidYDeg:cy,elongation:b>1e-14?Math.sqrt(a/b):null,majorAxisDeg:4*Math.sqrt(a),minorAxisDeg:4*Math.sqrt(b),components,touchesEdge,relativeThreshold,threshold:relativeThreshold*peak};
}
export function configurationId(config){const s=JSON.stringify(normalizeConfig(config));let hash=2166136261;for(let i=0;i<s.length;i++){hash^=s.charCodeAt(i);hash=Math.imul(hash,16777619);}return 'RET-'+(hash>>>0).toString(16).padStart(8,'0').toUpperCase();}
function serializable(v){if(ArrayBuffer.isView(v))return Array.from(v);if(Array.isArray(v))return v.map(serializable);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,serializable(x)]));return v;}
export function exportExperiment(config,result=null){const settings=normalizeConfig(config);if(result&&JSON.stringify(normalizeConfig(result.config))!==JSON.stringify(settings))throw new Error('The results belong to different settings. Run the experiment before exporting.');return {schema:EXPORT_SCHEMA,modelVersion:MODEL_VERSION,experimentId:configurationId(settings),settings,results:result?serializable(result):null,restorePolicy:'Restore settings and recompute; imported results are not trusted.',coordinateConvention:'pulse2percept Watson2014: visual x preserved, visual y inverted; image row0 superior.',limitations:['Homogeneous full-space finite sources, without retinal layers or insulating backing.','Published phenomenological epiretinal percept models with assumed parameters.','No membrane-voltage, spike, safety, acuity or task-performance prediction.']};}
export function parseExperiment(text){if(typeof text!=='string'||text.length>20000000)throw new Error('Choose a retinal experiment JSON file smaller than 20 MB.');let doc;try{doc=JSON.parse(text);}catch{throw new Error('The experiment file is not valid JSON.');}if(!doc||doc.schema!==EXPORT_SCHEMA||doc.modelVersion!==MODEL_VERSION)throw new Error(`Expected ${EXPORT_SCHEMA} / ${MODEL_VERSION}.`);if(!doc.settings||typeof doc.settings!=='object')throw new Error('Missing experiment settings.');for(const k of KEYS)if(!(k in doc.settings))throw new Error(`Missing setting: ${k}.`);const c=normalizeConfig(doc.settings);if(c.selectedId!==doc.settings.selectedId||JSON.stringify(c.disabledIds)!==JSON.stringify(doc.settings.disabledIds))throw new Error('Noncanonical electrode identifiers.');return c;}
