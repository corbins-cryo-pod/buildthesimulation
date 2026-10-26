import fs from 'node:fs';
import {preset} from '../src/advanced/config.js';
import {makeHeatGrid,heatStep,temperatureAt,runThermal} from '../src/advanced/thermal.js';
import {pulseIntervals} from '../src/simulation.js';
const reference=[],refinement=[];
for(const n of [17,25,33]){
 const cfg={...preset('microled').thermal,gridN:n,spacingUm:640/(n-1)},g=makeHeatGrid(cfg),L=(n-1)*g.h;
 for(let z=1;z<n-1;z++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++)g.temperature[z*n*n+y*n+x]=Math.sin(Math.PI*x/(n-1))*Math.sin(Math.PI*y/(n-1))*Math.sin(Math.PI*z/(n-1));
 const durationMs=50,dtMs=.025;for(let k=0;k<durationMs/dtMs;k++)heatStep(g,dtMs,0);
 const expected=Math.exp(-(3*Math.PI**2*g.conductivity/(g.rhoCp*L**2)+g.perfusionPerS)*durationMs/1000),actual=temperatureAt(g,[0,0,0]);reference.push({n,spacingUm:cfg.spacingUm,dtMs,expected,actual,error:Math.abs(actual-expected)});
}
for(const [n,h,dt]of [[25,80,.5],[25,80,.25],[33,60,.5],[41,48,.5],[33,80,.5]]){
 const c=preset('microled');Object.assign(c.thermal,{gridN:n,spacingUm:h,dtMs:dt});const times=Float64Array.from({length:341},(_,i)=>i*.5),r=runThermal(c,pulseIntervals(c.experiment),times,[[0,0,0],[-70,0,0]]);
 refinement.push({n,spacingUm:h,dtMs:dt,extentUm:(n-1)*h,maximumC:r.diagnostics.maximumC,somaPeakC:Math.max(...r.temperatureRiseC.filter((_,i)=>i%2===0)),energyResidualJ:r.diagnostics.energyResidualJ,opticalAbsorbedMw:r.diagnostics.absorbedOpticalMw});
}
const out={manufacturedContinuumMode:reference,microledRefinement:refinement,interpretation:'Continuum diffusion test verifies spatial discretization. LED hotspot peaks are unresolved and grid-deposition dependent, not converged device/tissue temperatures.'};fs.writeFileSync(new URL('../validation/phase3/thermal-refinement.json',import.meta.url),JSON.stringify(out,null,2));console.log(out);
