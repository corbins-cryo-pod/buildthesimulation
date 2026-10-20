/** Runs in CI when Chrome and npm dependencies are installed; otherwise explicitly skips. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
const available=chrome&&existsSync('node_modules/astro/astro.js');
if(process.env.TISSUE_REQUIRE_BROWSER==='1'&&!available)throw new Error('Required browser verification cannot be skipped: install Astro and Chrome.');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function wait(fn,limit=45000){const start=Date.now();let last;while(Date.now()-start<limit){try{const value=await fn();if(value)return value;}catch(e){last=e;}await sleep(150);}throw new Error(`Timed out${last?`: ${last.message}`:''}`);}
test('browser: both mechanics pages solve, H01 loads, controls and cleanup work',{skip:available?false:'Chrome and installed Astro required; not a numerical test failure',timeout:240000},async()=>{
 const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'bts-tissue-')),errors=[];
 const artifactDir=process.env.TISSUE_QA_DIR||profile;mkdirSync(artifactDir,{recursive:true});
 const astro=spawn(process.execPath,['node_modules/astro/astro.js','dev','--host','127.0.0.1','--port',String(http)],{stdio:['ignore','pipe','pipe']});
 let logs='';astro.stdout.on('data',b=>logs+=b);astro.stderr.on('data',b=>logs+=b);
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let socket;
 try{
  await wait(async()=>{const r=await fetch(`http://127.0.0.1:${http}/simulations/tissue-mechanics/`);return r.ok;});
  const targets=await wait(async()=>{const r=await fetch(`http://127.0.0.1:${debug}/json`);const t=await r.json();return t.find(v=>v.type==='page');});
  socket=new WebSocket(targets.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let counter=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
  await command('Runtime.enable');await command('Page.enable');await command('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
  for(const mode of ['tissue-mechanics','cellular-mechanics']){
   await command('Page.navigate',{url:`http://127.0.0.1:${http}/simulations/${mode}/`});
   await wait(()=>evaluate(`document.querySelector('[data-tm="status"]')?.textContent.startsWith('Complete · converged')`));
   assert.equal(await evaluate(`document.querySelectorAll('[data-tissue-lab] canvas').length`),1);
   assert.ok((await evaluate(`document.querySelector('[data-tm="mesh-count"]').textContent`)).includes('tetrahedra'));
   if(mode==='cellular-mechanics')await wait(()=>evaluate(`/^[1-9][0-9]* clipped neurite/.test(document.querySelector('[data-tm="source-status"]')?.textContent||'')`));
   await evaluate(`(()=>{const input=document.querySelector('[data-tm="amplitude"]');input.value='4';input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
   await sleep(400);await wait(()=>evaluate(`document.querySelector('[data-tm="status"]')?.textContent.startsWith('Complete · converged')`));
   assert.ok((await evaluate(`document.querySelector('[data-tm="amplitude-value"]').textContent`)).includes('4.0%'));
   // Execute physical-time history through the actual browser worker, not a mock.
   await evaluate(`(()=>{const q=n=>document.querySelector('[data-tm="'+n+'"]');q('amplitude').value='3';q('protocol').value='relaxation';q('duration').value='4';q('ramp').value='1';q('dt').value='0.5';q('protocol').dispatchEvent(new Event('change',{bubbles:true}));q('solve').click();return true})()`);
   await wait(()=>evaluate(`document.querySelector('[data-tm="status"]')?.textContent.startsWith('Complete · converged')`));
   assert.ok((await evaluate(`document.querySelector('[data-tm="physical-time"]').textContent`)).includes('4.00 / 4.00 s'));
   assert.ok(await evaluate(`document.querySelector('[data-tm="history-path"]').getAttribute('d').length>20`));
   const last=await evaluate(`Number(document.querySelector('[data-tm="replay"]').max)`);assert.ok(last>=7);
   await evaluate(`(()=>{const e=document.querySelector('[data-tm="replay"]');e.value='0';e.dispatchEvent(new Event('input'));return true})()`);
   assert.ok((await evaluate(`document.querySelector('[data-tm="physical-time"]').textContent`)).includes('0.250'));
   await evaluate(`(()=>{const e=document.querySelector('[data-tm="replay"]');e.value=e.max;e.dispatchEvent(new Event('input'));return true})()`);
   const exported=await evaluate(`(async()=>{const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.querySelector('[data-tm="export"]').click();URL.createObjectURL=original;HTMLAnchorElement.prototype.click=click;const d=JSON.parse(await blob.text());return {schema:d.schema,complete:d.complete,steps:d.acceptedHistory.length,last:d.finalAcceptedTime,branches:d.finalViscousMetricInverse?.length,physicalTime:d.physicalTime};})()`);
   assert.equal(exported.schema,'bts-tissue-experiment-v2');assert.equal(exported.complete,true);assert.equal(exported.last,4);assert.equal(exported.branches,2);assert.equal(exported.steps,last+1);
   const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});assert.ok(shot.data.length>10000);writeFileSync(join(artifactDir,`${mode}.png`),Buffer.from(shot.data,'base64'));
   await evaluate(`document.querySelector('[data-tm="history-chart"]').scrollIntoView({block:'center'});true`);await sleep(200);
   const historyShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifactDir,`${mode}-history.png`),Buffer.from(historyShot.data,'base64'));
   console.log(`${mode}:`,await evaluate(`JSON.stringify({status:document.querySelector('[data-tm="status"]').textContent,source:document.querySelector('[data-tm="source-status"]')?.textContent,time:document.querySelector('[data-tm="time"]').textContent})`));
  }
  // Static calibration fits must not masquerade as calibrated time-dependent fits.
  await evaluate(`(()=>{const e=document.querySelector('[data-tm="preset"]');e.value='curve-cortex-ogden';e.dispatchEvent(new Event('change'));return true})()`);
  assert.equal(await evaluate(`document.querySelector('[data-tm="protocol"]').value`),'static');
  assert.equal(await evaluate(`document.querySelector('[data-tm="protocol"] option[value="creep"]').disabled`),true);
  await sleep(250);
  await wait(()=>evaluate(`document.querySelector('[data-tm="status"]')?.textContent.startsWith('Complete · converged')`));
  // Release 01 remains an available numerical reference.
  await evaluate(`(()=>{const e=document.querySelector('[data-tm="engine"]');e.value='legacy';e.dispatchEvent(new Event('change'));return true})()`);
  await sleep(250);await wait(()=>evaluate(`document.querySelector('[data-tm="status"]')?.textContent.startsWith('Complete · converged')`));
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(300);
  assert.ok(await evaluate(`document.querySelector('[data-tissue-lab]').getBoundingClientRect().width<=window.innerWidth+2`));
  const mobileShot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifactDir,'cellular-mobile.png'),Buffer.from(mobileShot.data,'base64'));
  await evaluate(`document.dispatchEvent(new Event('astro:before-swap'));true`);assert.equal(await evaluate(`document.querySelectorAll('[data-tissue-lab] canvas').length`),0);
  assert.deepEqual(errors,[]);
  const page=await fetch(`http://127.0.0.1:${http}/simulations/tissue-mechanics/validation/`);assert.equal(page.status,200);assert.ok((await page.text()).includes('Held-out')||(await (await fetch(`http://127.0.0.1:${http}/simulations/tissue-mechanics/validation/`)).text()).includes('held-out'));
 }catch(error){throw new Error(`${error.message}\n${logs.slice(-3500)}`);}
 finally{socket?.close();browser.kill('SIGTERM');astro.kill('SIGTERM');await sleep(200);rmSync(profile,{recursive:true,force:true});}
});
