import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function wait(fn,limit=60000){const start=Date.now();let last;while(Date.now()-start<limit){try{const value=await fn();if(value)return value;}catch(e){last=e;}await sleep(250);}throw Error('Timed out'+(last?': '+last.message:''));}
test('EBPG browser: model, interlocks, example, physical output, exports and mobile', {timeout:300000},async()=>{
 assert.ok(chrome,'Chrome is required');
 const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'bts-ebpg-')),artifacts=process.env.EBPG_QA_DIR||profile;
 mkdirSync(artifacts,{recursive:true});const external=process.env.EBPG_URL;
 const base=external||'http://127.0.0.1:'+http,route=base+'/simulations/equipment/02-05/simulator/';
 const astro=external?null:spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port',String(http)],{stdio:['ignore','pipe','pipe']});
 let logs='';astro?.stdout.on('data',b=>logs+=b);astro?.stderr.on('data',b=>logs+=b);
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+debug,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let socket;const errors=[];
 try{
  await wait(async()=>{const response=await fetch(route,{cache:'no-store'});return response.ok&&(await response.text()).includes('eb-auto');},external?180000:60000);
  const targets=await wait(async()=>{const t=await (await fetch('http://127.0.0.1:'+debug+'/json')).json();return t.find(v=>v.type==='page');});
  socket=new WebSocket(targets.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));});
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cmd('Page.navigate',{url:route});
  await wait(()=>ev("document.getElementById('eb-model-status')?.textContent.includes('3D asset loaded')"));
  assert.equal(await ev("document.querySelector('#eb-view canvas').width>0"),true);
  assert.equal(await ev("document.querySelector('[data-step=write]').disabled"),true);
  assert.equal(await ev("Array.from(document.querySelectorAll('#eb-checks tr')).every(r=>r.lastElementChild.textContent==='PASS')&&document.querySelectorAll('#eb-checks tr').length===5"),true);
  await ev("document.querySelector('[data-step=vent]').click();document.querySelector('[data-step=open]').click();document.querySelector('[data-view=lock]').click();true");
  assert.equal(await ev("document.getElementById('eb-state').textContent"),'OPEN');
  await ev("document.querySelector('[data-view=stage]').click();true");
  const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'instrument-cutaway.png'),Buffer.from(shot.data,'base64'));
  await ev("document.getElementById('eb-auto').click();true");
  await wait(()=>ev("document.getElementById('eb-state')?.textContent==='UNLOADED'&&!document.getElementById('eb-export').disabled"));
  assert.ok((await ev("document.getElementById('eb-result').textContent")).includes('ideal beam-on'));
  const exported=await ev("(async()=>{const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('eb-export').click();URL.createObjectURL=original;HTMLAnchorElement.prototype.click=click;const d=JSON.parse(await blob.text());return {schema:d.schema,sample:d.sample.id,mask:d.thresholdMask.length,dose:d.dose.length,peak:d.peak,cleared:d.clearedUm2,time:d.timing.beamOnS,history:d.history.length,origin:d.origin};})()");
  assert.equal(exported.schema,'bts.ebpg.exposure.v1');assert.equal(exported.sample,'EBPG-COUPON-001');assert.equal(exported.origin,'simulated');assert.equal(exported.dose,65536);assert.equal(exported.mask,65536);assert.ok(exported.peak>400&&exported.cleared>0&&exported.time>0);assert.equal(exported.history,12);console.log('Actual browser result:',JSON.stringify(exported));
  const glb=await ev("(async()=>{const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('eb-glb').click();for(let i=0;i<100&&!blob;i++)await new Promise(r=>setTimeout(r,50));URL.createObjectURL=original;HTMLAnchorElement.prototype.click=click;if(!blob)return null;const a=await blob.arrayBuffer();return {magic:new DataView(a).getUint32(0,true),size:a.byteLength};})()");
  assert.equal(glb?.magic,0x46546c67);assert.ok(glb.size>10000);console.log('GLB bytes:',glb.size);
  await ev("document.getElementById('eb-result').scrollIntoView({block:'start'});true");await sleep(300);const resultShot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'exposure.png'),Buffer.from(resultShot.data,'base64'));
  await ev("document.getElementById('eb-current').value='350';document.getElementById('eb-current').dispatchEvent(new Event('input'));document.getElementById('eb-auto').click();true");
  assert.ok((await ev("document.getElementById('eb-status').textContent")).includes('8 ns'));assert.equal(await ev("document.getElementById('eb-export').disabled"),true);
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);
  assert.ok(await ev("document.getElementById('ebpg').getBoundingClientRect().width<=window.innerWidth+2"));
  const mobile=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'mobile.png'),Buffer.from(mobile.data,'base64'));
  assert.deepEqual(errors,[]);
  const record=await fetch(base+'/simulations/equipment/02-05/');assert.equal(record.status,200);assert.ok((await record.text()).includes('/simulations/equipment/02-05/simulator/'));
 }catch(e){throw Error(e.message+'\n'+logs.slice(-3000));}
 finally{socket?.close();browser.kill('SIGTERM');astro?.kill('SIGTERM');await sleep(300);rmSync(profile,{recursive:true,force:true});}
});
