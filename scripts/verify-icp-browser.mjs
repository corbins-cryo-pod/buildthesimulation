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
test('ICP browser: 3D asset, load-lock, etch result, exports, domain, mobile', {timeout:300000},async()=>{
 assert.ok(chrome,'Chrome is required');
 const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'bts-icp-')),artifacts=process.env.ICP_QA_DIR||profile;
 mkdirSync(artifacts,{recursive:true});const external=process.env.ICP_URL;
 const base=external||'http://127.0.0.1:'+http,route=base+'/simulations/equipment/04-02/simulator/';
 const astro=external?null:spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port',String(http)],{stdio:['ignore','pipe','pipe']});
 let logs='';astro?.stdout.on('data',b=>logs+=b);astro?.stderr.on('data',b=>logs+=b);
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+debug,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let socket;const errors=[];
 try{
  await wait(async()=>{const response=await fetch(route,{cache:'no-store'});return response.ok&&(await response.text()).includes('run-etch');},external?180000:60000);
  const targets=await wait(async()=>{const t=await (await fetch('http://127.0.0.1:'+debug+'/json')).json();return t.find(v=>v.type==='page');});
  socket=new WebSocket(targets.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));});
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cmd('Page.navigate',{url:route});
  await wait(()=>ev("document.getElementById('icp-view-status')?.textContent.includes('Scale reconstruction')"));
  assert.ok(await ev("document.getElementById('icp-canvas').width>0&&document.getElementById('ref-front').src.startsWith('data:image/png')"));
  assert.equal(await ev("Array.from(document.querySelectorAll('#verification tr')).every(r=>r.lastElementChild.textContent==='PASS')&&document.querySelectorAll('#verification tr').length===6"),true);
  await ev("document.getElementById('transfer').click();document.getElementById('lid').click();document.getElementById('view-load').click();true");
  assert.equal(await ev("document.getElementById('run-etch').disabled"),true);
  await ev("document.getElementById('insert').click();document.getElementById('insert').click();document.getElementById('lid').click();document.getElementById('transfer').click();document.getElementById('view-cut').click();true");
  assert.equal(await ev("document.getElementById('run-etch').disabled"),false);
  const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'instrument-cutaway.png'),Buffer.from(shot.data,'base64'));
  await ev("document.getElementById('run-etch').click();true");
  await wait(()=>ev("document.getElementById('run-status')?.textContent.startsWith('in-domain')"));
  const exported=await ev("(async()=>{const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('export-result').click();URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;return JSON.parse(await blob.text())})()");
  assert.equal(exported.schema,'bts.etch-cross-section.v1');assert.equal(exported.output.sampleId,'SOI-04-02-001');assert.equal(exported.output.totalDepthNm,190);assert.equal(exported.output.remainingMaskNm,56);assert.equal(exported.output.revision,1);assert.equal(exported.output.profile.length,4);console.log('Actual browser result:',JSON.stringify(exported.output));
  const csv=await ev("(async()=>{const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('export-csv').click();URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;return await blob.text()})()");assert.ok(csv.includes('x_nm,z_nm')&&csv.includes('SOI-04-02-001'));
  const glb=await ev("(async()=>{const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('export-glb').click();for(let i=0;i<200&&!blob;i++)await new Promise(r=>setTimeout(r,50));URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;if(!blob)return null;const a=await blob.arrayBuffer();return {magic:new DataView(a).getUint32(0,true),size:a.byteLength}})()");assert.equal(glb?.magic,0x46546c67);assert.ok(glb.size>10000);console.log('GLB bytes:',glb.size);
  await ev("document.getElementById('result-panel').scrollIntoView({block:'start'});true");await sleep(250);const resultShot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'cross-section.png'),Buffer.from(resultShot.data,'base64'));
  await ev("document.getElementById('bias').value='61';document.getElementById('bias').dispatchEvent(new Event('input'));document.getElementById('run-etch').click();true");assert.ok(await ev("document.getElementById('run-status').textContent.startsWith('out-of-domain')&&document.getElementById('export-csv').disabled"));
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);assert.ok(await ev("document.querySelector('.icp-lab').getBoundingClientRect().width<=window.innerWidth+2"));const mobile=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'mobile.png'),Buffer.from(mobile.data,'base64'));
  assert.deepEqual(errors,[]);const record=await fetch(base+'/simulations/equipment/04-02/');assert.equal(record.status,200);assert.ok((await record.text()).includes('/simulations/equipment/04-02/simulator/'));
 }catch(e){throw Error(e.message+'\n'+logs.slice(-3000));}
 finally{socket?.close();browser.kill('SIGTERM');astro?.kill('SIGTERM');await sleep(300);rmSync(profile,{recursive:true,force:true});}
});
