import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function wait(fn,limit=60000){const start=Date.now();let last;while(Date.now()-start<limit){try{const value=await fn();if(value)return value}catch(e){last=e}await sleep(250)}throw Error('Timed out'+(last?': '+last.message:''))}
test('MJB3 browser: physical GLB, stage interlocks, example, exports, mobile and register link',{timeout:300000},async()=>{
 assert.ok(chrome,'Chrome required');const http=await port(),debug=await port(),profile=mkdtempSync(join(tmpdir(),'bts-mjb3-')),artifacts=process.env.MJB3_QA_DIR||profile;mkdirSync(artifacts,{recursive:true});
 const external=process.env.MJB3_URL,base=external||'http://127.0.0.1:'+http,route=base+'/simulations/equipment/02-02/simulator/';
 const astro=external?null:spawn(process.execPath,['node_modules/astro/astro.js','preview','--host','127.0.0.1','--port',String(http)],{stdio:['ignore','pipe','pipe']});
 let logs='';astro?.stdout.on('data',b=>logs+=b);astro?.stderr.on('data',b=>logs+=b);
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port='+debug,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let socket;const errors=[];
 try{
  await wait(async()=>{const res=await fetch(route,{cache:'no-store'});return res.ok&&(await res.text()).includes('mjb-example')},external?180000:60000);
  const targets=await wait(async()=>{const t=await(await fetch('http://127.0.0.1:'+debug+'/json')).json();return t.find(v=>v.type==='page')});
  socket=new WebSocket(targets.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let seq=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''))});
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
  const ev=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
  const click=id=>ev("document.getElementById('mjb-"+id+"').click();true");
  const set=(name,value)=>ev("(()=>{const el=document.querySelector('[name="+name+"]');el.value="+JSON.stringify(String(value))+";el.dispatchEvent(new Event('input'));return true})()");
  const txt=id=>ev("document.getElementById('mjb-"+id+"').textContent");
  const disabled=id=>ev("document.getElementById('mjb-"+id+"').disabled");
  const snap=async name=>{const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,name+'.png'),Buffer.from(shot.data,'base64'))};
  await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await cmd('Page.navigate',{url:route});
  await wait(async()=>{const x=await txt('model-status');if(x?.includes('unavailable'))throw Error(x);return x?.includes('3D asset loaded')});
  assert.ok(await ev("document.getElementById('mjb-canvas').width>0&&document.querySelectorAll('.mjb-refs img[src^=\"data:image/png\"]').length===5"));
  assert.equal(await disabled('run'),true);
  await ev("document.querySelector('[data-view=load]').click();true");await snap('working-area');
  await click('slide');assert.match(await txt('machine'),/withdrawn/);await click('load');assert.match(await txt('machine'),/no coupon/);
  await set('widthMm',24);await set('heightMm',24);await click('load');assert.match(await txt('status'),/chuck:/);assert.match(await txt('machine'),/no coupon/);
  await set('widthMm',16);await set('heightMm',16);await click('load');await click('slide');await set('xMm',3.001);await click('apply');assert.match(await txt('status'),/travel:/);assert.equal(await disabled('json'),true);assert.match(await txt('machine'),/applied X 0.600/);
  await set('xMm',3);await click('apply');assert.match(await txt('machine'),/applied X 3.000/);
  await click('align');assert.match(await txt('machine'),/applied X 0.000/);await click('contact');assert.equal(await disabled('slide'),true);assert.equal(await disabled('run'),false);
  await click('run');await wait(async()=>!(await disabled('json')));assert.match(await txt('result'),/19.72 mm²/);assert.match(await txt('result'),/100 mJ\/cm²/);
  const exportJson=await ev("(async()=>{const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verify'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('mjb-json').click();URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;const d=JSON.parse(await blob.text());return {schema:d.schema,id:d.sampleId,revision:d.revision,cells:d.grid.values.length,lit:d.statistics.exposedPixels,dose:d.statistics.maxDoseMjCm2}})()");
  assert.deepEqual(exportJson,{schema:'bts.lithography.latent-dose.v1',id:'COUPON-001',revision:1,cells:25600,lit:1972,dose:100});
  const csv=await ev("(async()=>{const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:verify'};HTMLAnchorElement.prototype.click=()=>{};document.getElementById('mjb-csv').click();URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;const text=await blob.text();return {header:text.split('\\n')[0],rows:text.trim().split('\\n').length-1}})()");
  assert.deepEqual(csv,{header:'sample_id,revision,x_mm,y_mm,dose_mJ_cm2',rows:25600});
  await set('seconds',8);assert.equal(await disabled('json'),true);await click('run');await wait(async()=>!(await disabled('json')));assert.match(await txt('result'),/200 mJ\/cm²/);
  await click('example');await wait(async()=>!(await disabled('json')));assert.match(await txt('result'),/100 mJ\/cm²/);await ev("document.getElementById('mjb-result').scrollIntoView({block:'center'});true");await snap('exposure');
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);assert.ok(await ev("document.getElementById('mjb-lab').getBoundingClientRect().width<=window.innerWidth+2"));await snap('mobile');
  const model=await fetch(base+'/equipment/02-02/mjb3.glb');assert.equal(model.status,200);const bytes=await model.arrayBuffer();assert.equal(new DataView(bytes).getUint32(0,true),0x46546c67);
  const record=await fetch(base+'/simulations/equipment/02-02/');assert.equal(record.status,200);assert.ok((await record.text()).includes('/simulations/equipment/02-02/simulator/'));assert.deepEqual(errors,[]);
  console.log('Browser export evidence:',JSON.stringify(exportJson));
 }catch(e){throw Error(e.message+'\n'+logs.slice(-2500))}
 finally{socket?.close();browser.kill('SIGTERM');astro?.kill('SIGTERM');await sleep(300);rmSync(profile,{recursive:true,force:true})}
});
