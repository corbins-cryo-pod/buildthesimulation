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
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function wait(fn,limit=45000){const start=Date.now();let last;while(Date.now()-start<limit){try{const value=await fn();if(value)return value;}catch(e){last=e;}await sleep(150);}throw new Error(`Timed out${last?`: ${last.message}`:''}`);}
test('browser: both mechanics pages solve, H01 loads, controls and cleanup work',{skip:available?false:'Chrome and installed Astro required; not a numerical test failure',timeout:120000},async()=>{
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
   await wait(()=>evaluate(`document.querySelector('[data-tm="status"]')?.textContent.includes('converged')`));
   assert.equal(await evaluate(`document.querySelectorAll('[data-tissue-lab] canvas').length`),1);
   assert.ok((await evaluate(`document.querySelector('[data-tm="mesh-count"]').textContent`)).includes('tetrahedra'));
   if(mode==='cellular-mechanics')await wait(()=>evaluate(`/^[1-9][0-9]* clipped neurite/.test(document.querySelector('[data-tm="source-status"]')?.textContent||'')`));
   await evaluate(`(()=>{const input=document.querySelector('[data-tm="amplitude"]');input.value='12';input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
   await sleep(400);await wait(()=>evaluate(`document.querySelector('[data-tm="status"]')?.textContent.includes('converged')`));
   assert.ok((await evaluate(`document.querySelector('[data-tm="amplitude-value"]').textContent`)).includes('12.0%'));
   const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});assert.ok(shot.data.length>10000);writeFileSync(join(artifactDir,`${mode}.png`),Buffer.from(shot.data,'base64'));
   console.log(`${mode}:`,await evaluate(`JSON.stringify({status:document.querySelector('[data-tm="status"]').textContent,source:document.querySelector('[data-tm="source-status"]')?.textContent,time:document.querySelector('[data-tm="time"]').textContent})`));
  }
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(300);
  assert.ok(await evaluate(`document.querySelector('[data-tissue-lab]').getBoundingClientRect().width<=window.innerWidth+2`));
  await evaluate(`document.dispatchEvent(new Event('astro:before-swap'));true`);assert.equal(await evaluate(`document.querySelectorAll('[data-tissue-lab] canvas').length`),0);
  assert.deepEqual(errors,[]);
 }catch(error){throw new Error(`${error.message}\n${logs.slice(-3500)}`);}
 finally{socket?.close();browser.kill('SIGTERM');astro.kill('SIGTERM');await sleep(200);rmSync(profile,{recursive:true,force:true});}
});
