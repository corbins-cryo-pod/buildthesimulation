import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.env.MLA_URL||'http://127.0.0.1:4321';
const route=base+'/simulations/equipment/02-03/simulator/';
const out=process.env.MLA_QA_DIR||'mla-qa';await mkdir(out,{recursive:true});
let ready=false,lastCheck='not attempted';for(let i=0;i<60;i++){try{const response=await fetch(route,{cache:'no-store',signal:AbortSignal.timeout(10000)});const html=await response.text();const version=html.match(/MODEL\s+\d+(?:\.\d+)+/)?.[0]||'no model marker';lastCheck='HTTP '+response.status+' · '+response.url+' · '+version;if(response.ok&&html.includes('MODEL 1.1')){ready=true;break}}catch(e){lastCheck=String(e.cause||e)}if(i%10===0)console.log('Readiness check:',lastCheck);await new Promise(r=>setTimeout(r,4000))}
await writeFile(out+'/readiness.json',JSON.stringify({route,ready,lastCheck},null,2));
assert.ok(ready,'MODEL 1.1 simulator route must be reachable; last check: '+lastCheck);
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{
 const ctx=await browser.newContext({viewport:{width:1280,height:960},acceptDownloads:true});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(route,{waitUntil:'networkidle'});await page.locator('#mla-model-status').filter({hasText:'Metric glTF loaded'}).waitFor({timeout:25000});
 assert.equal(await page.locator('#mla-view canvas').count(),1);
 await page.locator('[data-mla-view=front]').click();await page.locator('#mla-view').screenshot({path:out+'/front.png'});
 await page.locator('[data-mla-view=stage]').click();await page.locator('#mla-view').screenshot({path:out+'/stage.png'});
 await page.locator('[data-mla-view=whole]').click();await page.locator('#mla-view').screenshot({path:out+'/whole.png'});
 assert.equal(await page.locator('#mla-write').isDisabled(),true);
 await page.locator('#mla-light').click();await page.locator('#mla-window').click();assert.equal(await page.locator('#mla-load').isDisabled(),true);
 await page.locator('#mla-light').click();await page.locator('#mla-load').click();await page.locator('#mla-vacuum').click();
 await page.locator('#mla-window').click();assert.equal(await page.locator('#mla-write').isDisabled(),true);
 await page.locator('#mla-window').click();await page.locator('#mla-aid').click();assert.equal(await page.locator('#mla-unload').isDisabled(),true);
 await page.locator('#mla-window').click();await page.locator('#mla-write').click();await page.locator('#mla-readout').filter({hasText:'seam Δ 0.000 µm'}).waitFor();
 const dl=page.waitForEvent('download');await page.locator('#mla-export').click();const d=await dl;const r=JSON.parse(await readFile(await d.path(),'utf8'));assert.equal(r.metrics.seamDelta_um,0);assert.equal(r.grid.dose.length,20000);assert.equal(r.sampleId,'MLA-COUPON-001');
 const csv=page.waitForEvent('download');await page.locator('#mla-csv').click();const cd=await csv;assert.equal((await readFile(await cd.path(),'utf8')).split('\n').length,20001);
 const glb=page.waitForEvent('download');await page.locator('#mla-glb').click();const gd=await glb;assert.equal((await readFile(await gd.path())).subarray(0,4).toString(),'glTF');
 await page.locator('#mla-offset_um').fill('4');await page.locator('#mla-write').click();await page.locator('#mla-readout').filter({hasText:'seam Δ 4.000 µm'}).waitFor();
 await page.locator('#mla-map').screenshot({path:out+'/dose.png'});
 await page.locator('#mla-offset_um').fill('0.6');await page.locator('#mla-write').click();await page.locator('#mla-readout').filter({hasText:'seam Δ 0.600 µm'}).waitFor();
 await page.locator('#mla-write').click();await page.locator('#mla-cancel').click();assert.equal(await page.locator('#mla-export').isDisabled(),true);await page.locator('#mla-status').filter({hasText:'cancelled'}).waitFor();
 await page.locator('#mla-window').click();assert.equal(await page.locator('#mla-unload').isDisabled(),true);await page.locator('#mla-vacuum').click();await page.locator('#mla-unload').click();assert.equal(await page.locator('#mla-load').isDisabled(),false);
 await page.locator('#mla-reset').click();await page.locator('#mla-coupon_mm').fill('2');await page.locator('#mla-example').click();await page.locator('#mla-status').filter({hasText:'Rejected'}).waitFor();assert.equal(await page.locator('#mla-export').isDisabled(),true);
 assert.deepEqual(errors,[]);
 await page.goto(base+'/simulations/equipment/02-03/',{waitUntil:'domcontentloaded'});assert.equal(await page.locator('a[href="/simulations/equipment/02-03/simulator/"]').count(),1);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.goto(route,{waitUntil:'networkidle'});await mobile.locator('#mla-model-status').filter({hasText:'Metric glTF loaded'}).waitFor({timeout:25000});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));await mobile.locator('#mla-example').click();await mobile.locator('#mla-readout').filter({hasText:'seam Δ 0.000 µm'}).waitFor();await mobile.screenshot({path:out+'/mobile.png',fullPage:true});
 await writeFile(out+'/result.json',JSON.stringify({route,pass:true,checks:['asset and 3D canvas','front, stage, whole presets','default 0 µm seam','offset 4 µm and 0.6 µm seam','manual light, vacuum and positioning-aid interlocks','cancel and release/unload','JSON/CSV/GLB exports','invalid coupon','record link','390px mobile']},null,2));
}finally{await browser.close()}
