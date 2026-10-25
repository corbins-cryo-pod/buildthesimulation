import {DEFAULT_CONFIG,validateConfig} from '../simulation.js';
import {num,vec,validateDevice,makeLedArray} from './device.js';
import {OPSINS} from './opsins.js';
const ADVANCED_VERSION='opto-lab/0.3.0';
const ADVANCED_SCHEMA='bts-opto-experiment/3';
function defaults(){return {
 schema:ADVANCED_SCHEMA,version:ADVANCED_VERSION,
 experiment:{...DEFAULT_CONFIG,mode:'neuron',protocol:'step',durationMs:220,onsetMs:70,trainDurationMs:100,pulseWidthMs:5,sampleMs:.5,expression:'soma',conductanceDensityScm2:.003},
 opsin:'gtacr2',kinetics:{},chloride:{dynamic:true,insideMm:5,axonMm:20,outsideMm:130,recoveryMs:10000,volumeFraction:1},
 drive:{currentNa:.3,startMs:10,endMs:210},
 source:{kind:'uniform',irradianceMwMm2:1,wavelengthNm:470,powerMw:.05,positionUm:[-150,0,0],targetUm:[0,0,0],absorptionMmInv:.07,lossMmInv:3},
 device:makeLedArray(),population:{count:1,spacingUm:160,seed:17,expressionVariation:0,layout:'line',cells:[{id:'cell-1',offsetUm:[0,0,0],rotationDeg:[0,0,0],expressionScale:1}]},
 thermal:{enabled:false,gridN:25,spacingUm:80,centerUm:[0,0,0],dtMs:.5,conductivityWmK:.6,densityKgM3:1057,heatCapacityJkgK:3600,perfusionPerS:.008,deviceHeatFraction:1},matchedControl:true
};}
function random(seed){let s=seed>>>0;return ()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};}
function generateCells(count,spacingUm=160,seed=17,variation=0,layout='line'){
 num(count,1,8,'Population count');if(!Number.isInteger(count))throw Error('Cell count must be integer.');const rng=random(seed);
 return Array.from({length:count},(_,i)=>({id:`cell-${i+1}`,offsetUm:layout==='cloud'?[spacingUm*(rng()-.5)*2,spacingUm*(rng()-.5)*2,spacingUm*(rng()-.5)]:[(i-(count-1)/2)*spacingUm,0,0],rotationDeg:layout==='cloud'?[0,0,40*(rng()-.5)]:[0,0,0],expressionScale:1+variation*(2*rng()-1)}));
}
function validateAdvanced(input={}){
 const d=defaults();if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected experiment object.');
 if(input.schema!==undefined&&input.schema!==ADVANCED_SCHEMA)throw Error('Unsupported experiment schema.');
 const c={...d,...input,experiment:{...d.experiment,...input.experiment},source:{...d.source,...input.source},chloride:{...d.chloride,...input.chloride},drive:{...d.drive,...input.drive},population:{...d.population,...input.population},thermal:{...d.thermal,...input.thermal},kinetics:{...(input.kinetics??{})}};
 if(!OPSINS[c.opsin])throw Error('Unknown opsin.');
 const expression=c.experiment.expression;
 const base=validateConfig({...c.experiment,expression:expression==='soma-targeted'?'soma':expression,light:{kind:'uniform',irradianceMwMm2:1,wavelengthNm:470}});
 c.experiment={...base,expression};num(base.durationMs,10,500,'Advanced recording duration ms');num(base.dtMs,.0025,.02,'Advanced dt ms');num(base.sampleMs,.1,2,'Advanced sample ms');
 if(!['uniform','fiber','microled'].includes(c.source.kind))throw Error('Unknown source.');
 num(c.source.irradianceMwMm2,0,20,'Uniform exposure');num(c.source.wavelengthNm,400,700,'Wavelength');num(c.source.powerMw,0,1,'Fiber power');
 c.source.positionUm=vec(c.source.positionUm,'Source position');c.source.targetUm=vec(c.source.targetUm,'Source target');
 if(c.source.kind==='fiber'&&(c.source.wavelengthNm!==470||Math.hypot(...c.source.positionUm.map((x,k)=>x-c.source.targetUm[k]))<1e-6))throw Error('The recovered fiber kernel requires 470 nm and a distinct aiming point.');
 num(c.source.absorptionMmInv,0,2,'Absorption mm⁻¹');num(c.source.lossMmInv,0,20,'Empirical extra attenuation mm⁻¹');
 if(c.source.kind==='fiber'&&c.thermal.enabled)throw Error('Heat calculation is supported for uniform and microLED sources only; the recovered fiber kernel has no reproducible energy ledger.');
 c.device=validateDevice(c.device);
 for(const [key,lo,hi] of [['insideMm',.1,100],['axonMm',.1,100],['outsideMm',20,200],['recoveryMs',10,100000],['volumeFraction',.05,1]])num(c.chloride[key],lo,hi,'Chloride '+key);
 if(typeof c.chloride.dynamic!=='boolean'||typeof c.matchedControl!=='boolean'||typeof c.thermal.enabled!=='boolean')throw Error('Toggle values must be boolean.');
 num(c.drive.currentNa,-.5,3,'Drive current nA');num(c.drive.startMs,0,base.durationMs,'Drive onset');num(c.drive.endMs,c.drive.startMs,base.durationMs,'Drive end');
 const pop=c.population;num(pop.count,1,8,'Cell count');num(pop.spacingUm,20,1000,'Cell spacing');num(pop.seed,0,4294967295,'Seed');num(pop.expressionVariation,0,1,'Expression variation');
 if(!Number.isInteger(pop.count)||!Number.isInteger(pop.seed))throw Error('Count and seed must be integers.');
 if(!['line','cloud'].includes(pop.layout))throw Error('Unknown population layout.');
 if(!Array.isArray(pop.cells)||pop.cells.length!==pop.count)throw Error('Population cells must match count. Regenerate the population.');
 pop.cells=pop.cells.map((x,i)=>{
  if(!x||typeof x.id!=='string'||x.id.length<1||x.id.length>50)throw Error('Invalid cell ID');
  if(x.opsin!==undefined&&!OPSINS[x.opsin])throw Error('Invalid cell-specific opsin');
  return {id:x.id,offsetUm:vec(x.offsetUm,'Cell offset'),rotationDeg:vec(x.rotationDeg,'Cell rotation',360),expressionScale:num(x.expressionScale,0,3,'Cell expression factor'),...(x.opsin?{opsin:x.opsin}:{})};
 });
 if(new Set(pop.cells.map(x=>x.id)).size!==pop.count)throw Error('Cell IDs must be unique.');
 if(base.mode==='clamp'&&pop.count!==1)throw Error('Channel assay supports one patch at a time.');
 const th=c.thermal;if(![17,25,33,41].includes(th.gridN))throw Error('Thermal grid N must be 17,25,33 or41.');
 num(th.spacingUm,20,200,'Thermal spacing');th.centerUm=vec(th.centerUm,'Thermal center');num(th.dtMs,.05,2,'Thermal dt');num(th.conductivityWmK,.1,2,'Thermal conductivity');num(th.densityKgM3,800,1500,'Tissue density');num(th.heatCapacityJkgK,1000,5000,'Heat capacity');num(th.perfusionPerS,0,1,'Perfusion sink');num(th.deviceHeatFraction,0,1,'Device heat fraction');
 const allowed={tauOnMs:[.1,50],tauOffMs:[.1,1000],halfMwMm2:[.001,20],tauDesMs:[1,100000],tauRecMs:[1,100000]};
 for(const [k,v] of Object.entries(c.kinetics)){if(!allowed[k]||c.opsin==='chr2')throw Error('Unsupported opsin parameter override: '+k);num(v,...allowed[k],k);}
 const n=base.segmentLengthUm===20?444:286,frames=Math.ceil(base.durationMs/base.sampleMs)+1;
 if(n*frames*pop.count*5*4>96*1024*1024)throw Error('Recording exceeds 96 MiB. Reduce cells/duration or increase saved interval.');
 if(base.durationMs/base.dtMs*n*pop.count*(c.matchedControl?2:1)>260000000)throw Error('Experiment exceeds the browser work budget. Reduce population/duration or disable matched controls.');
 if(th.enabled){const a=th.conductivityWmK/(th.densityKgM3*th.heatCapacityJkgK),h=th.spacingUm*1e-6,dt=Math.min(th.dtMs,base.sampleMs,900/(6*a/h**2+th.perfusionPerS));if(th.gridN**3*base.durationMs/dt>150000000)throw Error('Thermal calculation exceeds 150 million voxel updates. Reduce grid size/duration or increase spacing and saved interval.');}
 return JSON.parse(JSON.stringify(c));
}
function preset(id){
 const c=defaults();
 if(id==='chloride-high'){c.chloride.insideMm=30;c.chloride.axonMm=40;c.experiment.expression='all';c.experiment.conductanceDensityScm2=.001;}
 if(id==='chloride-fixed'){c.chloride.dynamic=false;}
 if(id==='microled'||id==='population'||id==='heat-control'){
  c.opsin='chr2';c.drive.currentNa=0;c.experiment.expression='all';c.experiment.conductanceDensityScm2=.0005;c.experiment.protocol='train';c.experiment.durationMs=170;c.experiment.onsetMs=20;c.experiment.trainDurationMs=120;c.drive.endMs=160;c.source.kind='microled';c.thermal.enabled=true;c.matchedControl=false;
 }
 if(id==='population'){
  c.population.count=4;c.population.spacingUm=110;c.population.expressionVariation=.3;
  c.population.cells=generateCells(4,110,17,.3);c.device.emitters.forEach(e=>{e.positionUm=[-270,e.positionUm[1],0];e.powerMw=.06;});
 }
 if(id==='heat-control'){c.experiment.conductanceDensityScm2=0;c.experiment.protocol='step';c.device.emitters.forEach(e=>e.powerMw=.03);}
 if(id==='chronos'||id==='chrimsonr'){
  c.opsin=id;c.experiment.protocol='train';c.experiment.expression='all';c.experiment.conductanceDensityScm2=.001;c.experiment.onsetMs=20;c.experiment.trainDurationMs=150;c.drive.currentNa=0;c.matchedControl=false;c.source.wavelengthNm=id==='chronos'?500:590;
 }
 return validateAdvanced(c);
}
export {ADVANCED_VERSION,ADVANCED_SCHEMA,defaults,validateAdvanced,generateCells,preset};
