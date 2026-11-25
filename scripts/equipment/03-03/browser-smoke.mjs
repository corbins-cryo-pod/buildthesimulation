import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function wait(fn,limit=60000){const start=Date.now();let last;while(Date.now()-start<limit){try{const r=await fn();if(r)return r}catch(e){last=e}await sleep(150)}throw Error('Timed out: '+(last?.message||fn.toString()))}
test('PVD75 browser: model, chamber controls, run, missing map, export and mobile',{timeout:180000},async()=>{
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);assert.ok(chrome,'Chrome required');
const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'pvd75-'));
const astro=spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port',String(http)],{stdio:['ignore','pipe','pipe']});
let logs='';astro.stdout.on('data',b=>logs+=b);astro.stderr.on('data',b=>logs+=b);
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+debug,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let socket;const errors=[];
try{
const url='http://127.0.0.1:'+http+'/simulations/equipment/03-03/simulator/';
await wait(async()=> (await fetch(url)).ok);
const target=await wait(async()=> (await (await fetch('http://127.0.0.1:'+debug+'/json')).json()).find(t=>t.type==='page'));
socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})});
let counter=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)});
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
const click=id=>ev("document.getElementById("+JSON.stringify(id)+").click();true");
const txt=id=>ev("document.getElementById("+JSON.stringify(id)+").textContent");
await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});await cmd('Page.navigate',{url});
await wait(async()=> (await txt('pvd-model-status')).includes('glTF loaded'));
assert.equal(await ev("document.querySelectorAll('#pvd-viewer canvas').length"),1);
await click('pvd-door');assert.match(await txt('pvd-status'),/DOOR OPEN/);await click('pvd-load');assert.match(await txt('pvd-status'),/sample loaded/);await click('pvd-door');await click('pvd-pump');assert.match(await txt('pvd-status'),/PROCESS VACUUM/);await click('pvd-run');
await wait(async()=> (await txt('pvd-results')).includes('Centre 60.000 nm'));
const exported=await ev("(async()=>{let blob;const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('pvd-export').click();URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;const d=JSON.parse(await blob.text());return {schema:d.schema,centre:d.center_nm,revision:d.revision,sample:d.sampleId,points:d.points.length}})()");
assert.deepEqual(exported,{schema:'bts.sample.sputtered-layer.v1',centre:60,revision:1,sample:'WITNESS-001',points:1257});
await ev("document.getElementById('duration_s').value='240';document.getElementById('duration_s').dispatchEvent(new Event('change'));true");await click('pvd-run');await wait(async()=> (await txt('pvd-results')).includes('Centre 120.000 nm'));
await click('pvd-clear-cal');await click('pvd-run');assert.match(await txt('pvd-error'),/Missing matching rate calibration/);
await click('pvd-example');await wait(async()=> (await txt('pvd-results')).includes('Centre 60.000 nm'));
const glb=await ev("(async()=>{let blob;const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{blob=b;return 'blob:verification'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('pvd-glb').click();for(let i=0;i<100&&!blob;i++)await new Promise(r=>setTimeout(r,100));URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;if(!blob)return null;return new DataView(await blob.arrayBuffer()).getUint32(0,true)})()");
assert.equal(glb,0x46546c67);
await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);assert.ok(await ev("document.querySelector('[data-pvd75]').getBoundingClientRect().width<=window.innerWidth+2"));
assert.deepEqual(errors,[]);console.log('PVD75 browser checks: asset, interlocks, 60/120 nm, revision export, missing map rejection, GLB magic, mobile width PASS');
}catch(e){throw Error(e.message+'\n'+logs.slice(-3500))}
finally{socket?.close();browser.kill('SIGTERM');astro.kill('SIGTERM');await sleep(250);rmSync(profile,{recursive:true,force:true})}
});
