import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n}
async function until(fn,ms=90000){const stop=Date.now()+ms;let e;while(Date.now()<stop){try{const v=await fn();if(v)return v}catch(err){e=err}await sleep(150)}throw Error('Timed out: '+(e?.message||'condition'))}
test('04-01 browser: glTF, controls, run, export, mobile and interlock',{skip:process.env.RIE_REQUIRE_BROWSER!=='1',timeout:480000},async()=>{
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);assert(chrome,'Chrome is required');
const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'rie-browser-'));
const production=process.env.RIE_PRODUCTION_ORIGIN;const origin=production||'http://127.0.0.1:'+http,route=origin+'/simulations/equipment/04-01/simulator/';
const server=production?null:spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port',String(http)],{stdio:'ignore'});
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+debug,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let ws;try{
 await until(async()=>{const response=await fetch(route,{cache:'no-store'});return response.ok&&(await response.text()).includes('id="rie-view"')},production?360000:90000);
 const target=await until(async()=> (await (await fetch('http://127.0.0.1:'+debug+'/json')).json()).find(p=>p.type==='page'));
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let seq=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const f=pending.get(m.id);if(f){pending.delete(m.id);m.error?f.reject(Error(m.error.message)):f.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text)});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const evalJS=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value};
 await call('Page.enable');await call('Runtime.enable');await call('Page.navigate',{url:route});
 await until(()=>evalJS("document.getElementById('model-status')?.textContent.includes('Scaled glTF loaded')"));
 assert.equal(await evalJS("document.querySelectorAll('#rie-view canvas').length"),1);
 await evalJS("document.getElementById('rie-run').click()");
 await until(()=>evalJS("document.getElementById('rie-readouts').textContent.includes('50.00 nm')"));
 assert.match(await evalJS("document.getElementById('rie-readouts').textContent"),/112.50 nm/);
 await call('Page.setDownloadBehavior',{behavior:'allow',downloadPath:profile});
 await evalJS("document.getElementById('rie-export').click()");
 const downloaded=join(profile,'rie-SiN-coupon-001.json');await until(()=>existsSync(downloaded));
 const data=JSON.parse(readFileSync(downloaded,'utf8'));assert.equal(data.schema,'bts.etch-result.v1');assert.equal(data.summary.centerDepthNm,50);
 await evalJS("document.getElementById('rie-glb').click()");
 const glb=join(profile,'Oxford-PlasmaPro-80-RIE.glb');await until(()=>existsSync(glb));assert.equal(readFileSync(glb).subarray(0,4).toString(),'glTF');
 await evalJS("document.getElementById('rie-vent').click();document.getElementById('rie-lid').click()");
 assert.equal(await evalJS("document.getElementById('rie-run').disabled"),true);
 await evalJS("document.getElementById('rie-load').click();document.getElementById('rie-load').click();document.getElementById('rie-lid').click();document.getElementById('rie-pump').click()");
 assert.equal(await evalJS("document.getElementById('rie-run').disabled"),false);
 await evalJS("document.getElementById('wafer').value='201';document.getElementById('rie-run').click()");
 assert.match(await evalJS("document.getElementById('rie-message').textContent"),/outside supported range/);
 await evalJS("document.getElementById('rie-reset').click()");
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await sleep(300);assert.equal(await evalJS("document.querySelector('.rie').scrollWidth<=document.querySelector('.rie').clientWidth+2"),true);
 assert.deepEqual(errors,[]);
 }finally{ws?.close();browser.kill();server?.kill();await sleep(300);try{rmSync(profile,{recursive:true,force:true})}catch{}}
});
