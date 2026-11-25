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
test('IONMILL browser: model, interlocks, example, physical output, exports and mobile', {timeout:300000},async()=>{
 assert.ok(chrome,'Chrome is required');
 const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'bts-ionmill-')),artifacts=process.env.IONMILL_QA_DIR||profile;
 mkdirSync(artifacts,{recursive:true});const external=process.env.IONMILL_URL;
 const base=external||'http://127.0.0.1:'+http,route=base+'/simulations/equipment/04-04/simulator/';
 const astro=external?null:spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port',String(http)],{stdio:['ignore','pipe','pipe']});
 let logs='';astro?.stdout.on('data',b=>logs+=b);astro?.stderr.on('data',b=>logs+=b);
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+debug,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let socket;const errors=[];
 try{
  await wait(async()=>{const response=await fetch(route,{cache:'no-store'});return response.ok&&(await response.text()).includes('mill-run');},external?180000:60000);
  const targets=await wait(async()=>{const t=await (await fetch('http://127.0.0.1:'+debug+'/json')).json();return t.find(v=>v.type==='page');});
  socket=new WebSocket(targets.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));});
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cmd('Page.navigate',{url:route});

  await wait(()=>ev("document.getElementById('mill-model-status')?.textContent==='3D asset loaded'"));
  assert.equal(await ev("document.querySelector('#mill-view canvas').width>0"),true);
  assert.equal(await ev("document.getElementById('door').disabled"),true);
  await ev("document.getElementById('vent').click();document.getElementById('door').click();document.getElementById('view-stage').click();true");
  assert.equal(await ev("document.getElementById('mill-run').disabled"),true);
  assert.ok((await ev("document.getElementById('mill-state').textContent")).includes('door open'));
  await ev("document.getElementById('load').click();document.getElementById('door').click();document.getElementById('pump').click();document.getElementById('view-reset').click();document.getElementById('cutaway').checked=false;document.getElementById('cutaway').dispatchEvent(new Event('change'));true");
  await sleep(500);
  const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'instrument.png'),Buffer.from(shot.data,'base64'));
  await ev("document.getElementById('mill-run').click();true");
  await wait(()=>ev("!document.getElementById('mill-export').disabled"));
  assert.ok((await ev("document.getElementById('mill-readout').textContent")).includes('140.000–200.000 nm'));
  const exported=await ev("(async()=>{const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('mill-export').click();URL.createObjectURL=original;HTMLAnchorElement.prototype.click=click;const d=JSON.parse(await blob.text());return {schema:d.schema,id:d.sample.sampleId,revision:d.sample.revision,protected:d.sample.thicknessNm[0],exposed:d.sample.thicknessNm[63],mean:d.meanRemovedNm,rows:d.shadowFraction.length};})()");
  assert.deepEqual(exported,{schema:'bts.ionmill.result.v1',id:'AU-COUPON-001',revision:1,protected:200,exposed:140,mean:30,rows:4096});
  console.log('Actual browser result:',JSON.stringify(exported));
  const csv=await ev("(async()=>{const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('mill-csv').click();URL.createObjectURL=original;HTMLAnchorElement.prototype.click=click;return (await blob.text()).split('\\n').length;})()");
  assert.equal(csv,4097);
  await ev("document.getElementById('mill-readout').scrollIntoView({block:'start'});true");await sleep(300);const mapShot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'maps.png'),Buffer.from(mapShot.data,'base64'));
  await ev("document.getElementById('angle').value='90';document.getElementById('angle').dispatchEvent(new Event('input'));document.getElementById('mill-run').click();true");
  await wait(()=>ev("document.getElementById('mill-error').textContent.includes('outside supported range')"));
  assert.equal(await ev("document.getElementById('mill-export').disabled"),true);
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);
  assert.ok(await ev("document.querySelector('.mill-grid').getBoundingClientRect().width<=window.innerWidth+2"));
  const mobile=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,'mobile.png'),Buffer.from(mobile.data,'base64'));
  assert.deepEqual(errors,[]);
  const record=await fetch(base+'/simulations/equipment/04-04/');assert.equal(record.status,200);assert.ok((await record.text()).includes('/simulations/equipment/04-04/simulator/'));
 }catch(e){throw Error(e.message+'\n'+logs.slice(-3000));}
 finally{socket?.close();browser.kill('SIGTERM');astro?.kill('SIGTERM');await sleep(300);rmSync(profile,{recursive:true,force:true});}
});
