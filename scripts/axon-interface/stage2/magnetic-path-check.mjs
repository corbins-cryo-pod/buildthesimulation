/** Conditional line-quadrature refinement; no qualification of the tissue mesh. */
import fs from 'node:fs';import crypto from 'node:crypto';
import {normalizeStage1Settings} from '../../../src/lib/axon-interface/stage1-settings.mjs';
import {createStage1Cohort} from '../../../src/lib/axon-interface/identities.mjs';
import {createBipolarMorphology} from '../../../src/lib/axon-interface/bipolar.mjs';
import {embeddedCoil} from '../../../src/lib/axon-interface/stage2/magnetic-coupling.mjs';
import {integrateCableLink} from '../../../public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs';
const dir='docs/axon-interface/stage2',fixture=JSON.parse(fs.readFileSync(dir+'/induction-validation.json')),acceptance=JSON.parse(fs.readFileSync(dir+'/coupling-acceptance.json'));
const settings=normalizeStage1Settings({axonCount:4,channelCount:1}),geometry=createStage1Cohort(settings),morphology=createBipolarMorphology(settings),coil=embeddedCoil(geometry.wells[0]),rows=[],start=performance.now();
const paths=['scripts/axon-interface/stage2/magnetic-path-check.mjs','public/simulations/biohybrid-axon-interface/stage2/modules/magnetic.mjs','src/lib/axon-interface/stage2/magnetic-coupling.mjs',dir+'/induction-validation.json',dir+'/coupling-acceptance.json'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),before=hashes();
const relative=(a,b)=>Math.sqrt(a.reduce((e,x,i)=>e+(x-b[i])**2,0)/b.reduce((e,x)=>e+x*x,0));
for(const [cellIndex,cell] of geometry.cells.entries()){
 const centers=morphology.compartments.map(c=>[c.positionUm[0]+cell.xUm,c.positionUm[1]+cell.yUm,c.positionUm[2]+(cell.zUm??0)].map(x=>x*1e-6));
 const fields=[8,16,32].map(subdivisions=>{
  const field=new Float64Array(centers.length);for(let i=1;i<field.length;i++)field[i]=field[i-1]+1000*integrateCableLink(coil,centers[i-1],centers[i],subdivisions);
  const reference=field[morphology.somaIndex];return Array.from(field,x=>x-reference);
 });
 const transfers=fields.map(p=>p.map((x,i)=>fixture.transfers[0][cellIndex][i]+x-fields[0][i]));
 for(let j=1;j<transfers.length;j++){const error=relative(transfers[j-1],transfers[j]);rows.push({name:`Cell ${cellIndex}: ${[8,16][j-1]} to ${[16,32][j-1]} subdivisions per link`,relativeL2:error,pass:error<=acceptance.inductionCableQuadratureRelativeL2});}
}
const report={schema:'axon-stage2-magnetic-path-validation/1',complete:true,passed:rows.every(r=>r.pass)&&JSON.stringify(before)===JSON.stringify(hashes()),rows,relativeL2Limit:acceptance.inductionCableQuadratureRelativeL2,sourceHashes:before,sourceChanged:JSON.stringify(before)!==JSON.stringify(hashes()),seconds:(performance.now()-start)/1000,fieldQualified:fixture.passed===true,scope:'Only the cable line integral is refined. The same production-refinement tissue scalar field is held fixed. Tissue-mesh convergence is verified in its separate required study.'};
fs.writeFileSync(dir+'/magnetic-path-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
