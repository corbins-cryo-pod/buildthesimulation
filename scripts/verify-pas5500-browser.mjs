import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const base=process.env.PAS_URL||'http://127.0.0.1:4321';const qa=process.env.PAS_QA_DIR||'pas-qa';
await mkdir(qa,{recursive:true});const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
 const page=await browser.newPage({viewport,acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const route=base+'/simulations/equipment/02-06/simulator/';let ready=false;
 for(let i=0;i<60;i++){try{const r=await page.goto(route,{waitUntil:'domcontentloaded',timeout:15000});if(r?.ok()&&await page.locator('#pas-auto').count()){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,5000))}
 assert.ok(ready,'Simulator route not available');await page.locator('#pas-model[data-loaded=true]').waitFor({timeout:45000});await page.locator('[data-pas-view=stage]').click();assert.equal(await page.locator('#pas-cut').getAttribute('aria-pressed'),'true');await page.screenshot({path:qa+'/stage-'+viewport.width+'.png',fullPage:true});
 await page.locator('#pas-auto').click();await page.waitForFunction(()=>document.querySelector('#pas-state').textContent==='COMPLETE',{timeout:30000});assert.match(await page.locator('#pas-result').textContent(),/6 \/ 6 fields exposed/);
 const downloading=page.waitForEvent('download');await page.locator('#pas-export').click();const file=await downloading;const json=JSON.parse(await readFile(await file.path(),'utf8'));assert.equal(json.tally.exposed,6);assert.equal(json.fields[0].features[2].projectedWidth_mm,1);
 await page.screenshot({path:qa+'/result-'+viewport.width+'.png',fullPage:true});
 await page.locator('#pas-reset').click();await page.locator('#pas-pitchX_mm').fill('10');assert.match(await page.locator('#pas-status').textContent(),/Overlapping/);
 await page.locator('#pas-pitchX_mm').fill('20');await page.locator('#pas-overlayX_nm').fill('30');await page.locator('#pas-overlayY_nm').fill('40');await page.locator('#pas-auto').click();await page.waitForFunction(()=>document.querySelector('#pas-state').textContent==='COMPLETE');assert.match(await page.locator('#pas-result').textContent(),/50.00 nm/);
 assert.deepEqual(errors,[]);await page.close();
}}finally{await browser.close()}
