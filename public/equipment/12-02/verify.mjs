import fs from 'node:fs';
import {createStation,save,targets,pose} from './reticle.mjs';
const p=n=>new URL(n,import.meta.url),g=n=>JSON.parse(fs.readFileSync(p(n))),plan=g('reference-plan.json');
const e=plan.expected,s=createStation(),a=s.hit('Sealed_reticle'),f=save(a);s.hit('Controller_magnification_dial');const b=s.hit('Controller_capture_key');s.dispatch('focus',8);const bad=s.dispatch('measure');
const gb=fs.readFileSync(p('nikon-ti2-optical.glb')),nodes=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))).nodes,n=k=>nodes.find(n=>n.name===k),vr=g('vr-station.json');
const [bx,,bz]=n('Base_240x495p3').scale;const top=k=>n(k).translation[1]+n(k).scale[1]*.5;
const [x,,z]=n('Objective_1_window').translation,rotation=pose(b).nosepieceRotationRad;
const q=[
 ['10× line-group spacing',e.pitchPx10,a.result.meanSpacingPx,'px',.05],['20× line-group spacing',e.pitchPx20,b.result.meanSpacingPx,'px',.05],
 ['10× image-derived physical pitch',e.pitchUm,a.result.measuredPitchUm,'µm',1e-7],['20× image-derived physical pitch',e.pitchUm,b.result.measuredPitchUm,'µm',1e-7],
 ['10× horizontal FOV',e.fovUm10,a.result.fovWidthUm,'µm',1e-7],['20× horizontal FOV',e.fovUm20,b.result.fovWidthUm,'µm',1e-7],
 ['Fixed camera FOV ratio',e.ratio,a.result.fovWidthUm/b.result.fovWidthUm,'ratio',1e-7],['Out of focus measurement blocked',true,bad.result===null,'flag',0],
 ['Body width',e.baseMm[0]/1000,bx,'m',1e-8],['Body depth',e.baseMm[1]/1000,bz,'m',1e-8],['Single-layer stage top',e.stageTopMm/1000,top('Stage_457p6'),'m',1e-8],
 ['Single-layer lamp top',e.armTopMm/1000,top('Lamp_arm'),'m',1e-8],['20× turret lands on optical X axis',0,x*Math.cos(rotation)+z*Math.sin(rotation),'m',1e-8],
 ['Named scene actions',3,vr.hitTargets.filter(h=>n(h.node)&&targets[h.node]===h.action).length,'hits',0]
];
const out={equipment:'12-02',basis:plan.independentBasis,scope:'Synthetic optical scale and documented exterior dimensions; not measured performance.',checks:q.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:tolerance?Math.abs(expected-actual)<=tolerance:expected===actual}))};
for(const [n,x]of [['verification.json',out],['example-pitch.json',f]])fs.writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
for(const x of out.checks)console.log(x.pass?'PASS':'FAIL',x.id,JSON.stringify(x.actual),x.unit);
if(out.checks.some(c=>!c.pass))process.exitCode=1;
