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
test('Cobra browser: glTF, loadlock, Bosch fixture, export and mobile', {timeout:300000},async()=>{
 assert.ok(chrome,'Chrome is required');
 const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'bts-cobra-')),artifacts=process.env.COBRA_QA_DIR||profile;
 mkdirSync(artifacts,{recursive:true});const external=process.env.COBRA_URL;
 const base=external||'http://127.0.0.1:'+http,route=base+'/simulations/equipment/04-03/simulator/';
 const astro=external?null:spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port',String(http)],{stdio:['ignore','pipe','pipe']});
 let logs='';astro?.stdout.on('data',b=>logs+=b);astro?.stderr.on('data',b=>logs+=b);
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+debug,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let socket;const errors=[];
 try{
  await wait(async()=>{const response=await fetch(route,{cache:'no-store'});return response.ok&&(await response.text()).includes('cobra-lab');},external?180000:60000);
  const targets=await wait(async()=>{const t=await (await fetch('http://127.0.0.1:'+debug+'/json')).json();return t.find(v=>v.type==='page');});
  socket=new WebSocket(targets.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));});
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cmd('Page.navigate',{url:route});

  await wait(()=>ev("document.getElementById('viewer-note')?.textContent.includes('3D asset loaded')"));
  assert.equal(await ev("document.querySelector('#view canvas').width>0"),true);
  assert.equal(await ev("document.getElementById('load').disabled"),true);
  await ev("document.getElementById('lid').click();document.querySelector('[data-view=load]').click();true");
  assert.ok((await ev("document.getElementById('machine-status').textContent")).includes('open'));
  assert.equal(await ev("document.getElementById('run').disabled"),true);
  await sleep(250);const lock=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'loadlock.png'),Buffer.from(lock.data,'base64'));
  await ev("document.getElementById('load').click();document.getElementById('lid').click();true");
  assert.equal(await ev("document.getElementById('run').disabled"),true);
  await ev("document.getElementById('example').click();true");
  await wait(()=>ev("!document.getElementById('json').disabled"));
  assert.ok((await ev("document.getElementById('result').textContent")).includes('80.000'));
  const exported=await ev("(async()=>{const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('json').click();URL.createObjectURL=original;HTMLAnchorElement.prototype.click=click;const d=JSON.parse(await blob.text());return {schema:d.schema,id:d.sampleId,revision:d.revision,depth:d.depthUm,mask:d.remainingMaskUm,wall:d.wall.length,count:d.scallopCount};})()");
  assert.equal(exported.schema,'bts.drie.trench.v1');assert.equal(exported.id,'SI-DEMO-001');assert.equal(exported.revision,1);assert.ok(Math.abs(exported.depth-80)<1e-9);assert.ok(Math.abs(exported.mask-(1-80/150))<1e-9);assert.equal(exported.wall,1601);assert.equal(exported.count,100);console.log('Browser output',JSON.stringify(exported));
  const csvText=await ev("(async()=>{const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('csv').click();URL.createObjectURL=original;HTMLAnchorElement.prototype.click=click;return await blob.text();})()");assert.equal(csvText.split('\n').length,1602);assert.ok(csvText.startsWith('z_um,left_x_um,right_x_um'));
  await ev("document.getElementById('result').scrollIntoView({block:'center'});true");await sleep(250);const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'result.png'),Buffer.from(shot.data,'base64'));
  await ev("document.getElementById('return-carrier').click();document.getElementById('lid').click();document.getElementById('load').click();document.getElementById('load').click();document.getElementById('lid').click();const f=document.getElementById('settings');f.elements.maskUm.value='0.1';f.elements.maskUm.dispatchEvent(new Event('input'));document.getElementById('run').click();true");
  assert.ok((await ev("document.getElementById('process-message').textContent")).includes('mask exhausted'));assert.equal(await ev("document.getElementById('json').disabled"),true);
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await ev("document.getElementById('cobra-lab').scrollIntoView();true");await sleep(400);
  assert.ok(await ev("document.getElementById('cobra-lab').getBoundingClientRect().width<=window.innerWidth+2"));
  const mobile=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'mobile.png'),Buffer.from(mobile.data,'base64'));
  assert.deepEqual(errors,[]);
  const record=await fetch(base+'/simulations/equipment/04-03/');assert.equal(record.status,200);assert.ok((await record.text()).includes('/simulations/equipment/04-03/simulator/'));
 }catch(e){throw Error(e.message+'\n'+logs.slice(-3000));}
 finally{socket?.close();browser.kill('SIGTERM');astro?.kill('SIGTERM');await sleep(300);rmSync(profile,{recursive:true,force:true});}
});
