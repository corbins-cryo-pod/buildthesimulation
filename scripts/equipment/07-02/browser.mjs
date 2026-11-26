// Run with Node 22+, Chrome and a built site. Set VIOS_ORIGIN to test a deployed site.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync,mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const origin=process.env.VIOS_ORIGIN||'http://127.0.0.1:4382';
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
assert.ok(chrome,'Chrome required');
const profile=mkdtempSync(join(tmpdir(),'vios-browser-')),downloads=mkdtempSync(join(tmpdir(),'vios-exports-'));
const browser=spawn(chrome,['--headless=new',...(process.env.VIOS_SOFTWARE?['--disable-webgl']:[]),'--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let socket,next=0;
const pending=new Map();
const errors=[];
async function until(condition,note,timeout=60000){
  const start=Date.now();let last;
  while(Date.now()-start<timeout){try{if(await condition())return;}catch(e){last=e;}await delay(150);}
  throw Error(note+(last?' · '+last.message:''));
}
async function send(method,params={}){
  const id=++next;
  return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
}
async function evaluate(expression){
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
}
const el=id=>'document.getElementById("vios-'+id+'")';
const textOf=id=>evaluate(el(id)+'.textContent');
const click=id=>evaluate(el(id)+'.click()');
try{
  const portFile=join(profile,'DevToolsActivePort');await until(()=>existsSync(portFile),'Browser failed to start');
  const port=readFileSync(portFile,'utf8').split('\n')[0];
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail;});
  socket.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
  };
  await send('Runtime.enable');await send('Page.enable');
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:880,deviceScaleFactor:1,mobile:false});
  const uri='/simulations/equipment/07-02/simulator/';
  await until(async()=>{const r=await fetch(origin+uri);return r.ok&&(await r.text()).includes('vios-run');},'Built route unavailable');
  await send('Page.navigate',{url:origin+uri});
  await until(async()=>(await textOf('model-msg')).startsWith('3D model loaded · metres'),'GLB and viewer must load');
  assert.equal(await evaluate(el('view')+'.querySelector("canvas").width>0'),true);
  assert.equal(await evaluate(el('view')+'.dataset.renderer'),process.env.VIOS_SOFTWARE?'software':'webgl');
  if(process.env.VIOS_SOFTWARE){
    const colorCount=await evaluate('(()=>{const c=document.querySelector("#vios-view canvas"),d=c.getContext("2d").getImageData(0,0,c.width,c.height);return new Set(new Uint32Array(d.data.buffer)).size})()');
    assert.ok(colorCount>40,'Software renderer drew the instrument');
  }
  await click('glass');assert.equal(await textOf('door-state'),'Glass open');
  assert.equal(await evaluate(el('outer')+'.disabled'),true);
  await evaluate('document.querySelector("[data-camera=rear]").click()');
  await click('run');
  assert.equal(await textOf('clock'),'317 s');assert.equal(await textOf('co2'),'0.71 %');
  assert.match(await textOf('metrics'),/VIOS-B3900–12000.05.00/);
  await click('json');await click('csv');
  const json=join(downloads,'07-02-sample-exposure.json'),csv=join(downloads,'07-02-sample-exposure.csv');
  await until(()=>existsSync(json)&&existsSync(csv),'Completed browser downloads required');
  const out=JSON.parse(readFileSync(json,'utf8'));
  assert.deepEqual(out.samples.map(s=>[s.sampleId,s.glassOpen_s,s.statistics.co2_pct.min]),[['VIOS-A',30,.71],['VIOS-B',0,5]]);
  assert.match(readFileSync(csv,'utf8'),/^sample_id,revision,shelf,clock_s,temp_C,co2_pct,occupied,glass_open,source_kind/);
  await evaluate(el('timeline')+'.value=270;'+el('timeline')+'.dispatchEvent(new Event("input"))');
  assert.equal(await textOf('door-state'),'Glass open');assert.equal(await textOf('occupants'),'VIOS-A · shelf 1');
  await evaluate(el('mode')+'.value="model";'+el('mode')+'.dispatchEvent(new Event("change"))');
  await click('run');
  assert.equal(await textOf('co2'),'1.28 %');
  await click('connected');assert.equal(await evaluate(el('run')+'.disabled'),true);
  assert.match(await textOf('status'),/supply/);
  await click('reset');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await until(()=>evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Mobile horizontal overflow');
  await click('run');assert.equal(await textOf('co2'),'0.71 %');
  await click('transfer');
  const transfer=join(downloads,'07-02-to-07-01.json');
  await until(()=>existsSync(transfer),'Cabinet transfer download');
  await send('Page.navigate',{url:origin+'/simulations/equipment/07-01/simulator/'});
  await until(()=>evaluate('!!document.getElementById("cab-import")?.onchange'),'Cabinet importer ready');
  const {root}=await send('DOM.getDocument');
  const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'#cab-import'});
  await send('DOM.setFileInputFiles',{nodeId,files:[transfer]});
  await until(()=>evaluate('document.body.textContent.includes("Loaded VIOS-")'),'Cabinet accepted the transfer');
  const record=await (await fetch(origin+'/simulations/equipment/07-02/')).text();assert.ok(record.includes('href="'+uri+'"'));
  assert.deepEqual(errors,[]);console.log('Passed GLB, cameras, interlocks, replay, simulation, 390px layout, JSON and CSV browser downloads for '+origin);
}finally{
  socket?.close();browser.kill();await delay(400);
  rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:200});rmSync(downloads,{recursive:true,force:true});
}
