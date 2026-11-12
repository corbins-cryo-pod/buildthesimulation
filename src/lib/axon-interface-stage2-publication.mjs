import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.cwd(),dir=path.join(root,'docs/axon-interface/stage2');
const read=(name)=>{try{return JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));}catch{return null;}};
export function publishedStage2(){
 const report=read('validation.json')??{schema:'axon-stage2-validation/1',completeStage2:false,status:'development',openReleaseGates:['Final reproduction and release review pending.']};
 const stale=Object.entries(report.sourceHashes??{}).filter(([p,h])=>{try{return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')!==h;}catch{return true;}}).map(([p])=>p);
 return {...report,sourceVerification:{manifestPresent:Object.keys(report.sourceHashes??{}).length>0,stale},completeStage2:report.completeStage2===true&&stale.length===0,
  coupling:read('coupling-validation.json'),magneticCoupling:read('magnetic-coupling-validation.json'),magneticPath:read('magnetic-path-validation.json'),magneticPolicy:read('magnetic-policy-validation.json'),inductionQuadrature:read('induction-quadrature-diagnostic.json'),inductionQuadrature11:read('induction-quadrature-11-diagnostic.json'),inductionDirect:read('induction-direct-equilibrated-diagnostic.json'),induction:read('induction-validation.json'),surface:read('surface-validation.json'),spatial:read('spatial-validation.json'),protocol:read('protocol-validation.json'),retainedFailures:read('retained-failures.json')??[]};
}
