import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
const origin=process.env.SPIN_URL||'http://127.0.0.1:4321',out=process.env.SPIN_QA_DIR||'spin-qa';
mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const p=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const url=origin+'/simulations/equipment/02-07/simulator/';let ok=false;
 for(let i=0;i<(process.env.SPIN_URL?30:15);i++){try{const res=await p.goto(url,{waitUntil:'domcontentloaded',timeout:12000});if(res?.ok()&&await p.locator('#spin-view').count()){ok=true;break}}catch{}await new Promise(r=>setTimeout(r,3000))}
 assert.ok(ok,'Simulator route unreachable');await p.waitForFunction(()=>document.querySelector('#spin-model-status')?.textContent.includes('3D geometry loaded'),null,{timeout:45000});assert.equal(await p.locator('#spin-view canvas').count(),1);
 await p.locator('[data-spin-view=front]').click();await p.waitForTimeout(350);await p.screenshot({path:out+'/front.png'});
 await p.locator('#spin-start').click();assert.match(await p.locator('#spin-status').textContent(),/Interlock/);
 await p.locator('#spin-lid').click();await p.locator('[data-spin-view=bowl]').click();await p.waitForTimeout(500);await p.screenshot({path:out+'/open-bowl.png'});
 await p.locator('#spin-load').click();await p.locator('#spin-vacuum').click();await p.locator('#spin-dispense').click();await p.locator('#spin-start').click();assert.match(await p.locator('#spin-status').textContent(),/Interlock/);
 await p.locator('#spin-lid').click();await p.locator('#spin-start').click();await p.waitForFunction(()=>!document.querySelector('#spin-json').disabled,null,{timeout:20000});assert.match(await p.locator('#spin-readout').textContent(),/1.326 µm/);
 const dl=p.waitForEvent('download');await p.locator('#spin-json').click();const file=await dl;await file.saveAs(out+'/resist-layer.json');const result=JSON.parse(readFileSync(out+'/resist-layer.json','utf8'));assert.equal(result.revision,1);assert.equal(result.grid.values.length,6561);
 const csv=p.waitForEvent('download');await p.locator('#spin-csv').click();await (await csv).saveAs(out+'/map.csv');assert.match(readFileSync(out+'/map.csv','utf8'),/^x_mm,z_mm,thickness_um/);
 const glb=p.waitForEvent('download');await p.locator('#spin-glb').click();await (await glb).saveAs(out+'/laurell.glb');assert.equal(readFileSync(out+'/laurell.glb').subarray(0,4).toString(),'glTF');
 await p.locator('[data-spin-view=rear]').click();await p.waitForTimeout(350);await p.screenshot({path:out+'/rear.png'});
 assert.equal(await p.locator('#spin-rpm').count(),1);await p.locator('#spin-rpm').fill('2000');assert.equal(await p.locator('#spin-rpm').inputValue(),'2000');await p.locator('#spin-example').click();await p.waitForFunction(()=>!document.querySelector('#spin-json').disabled,null,{timeout:20000});assert.match(await p.locator('#spin-readout').textContent(),/1.898 µm|1.897 µm/);
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile overflow');await p.screenshot({path:out+'/mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('Laurell browser checks passed: geometry, lid interlock, manual operation, export, speed response, mobile.');
}finally{await browser.close()}
