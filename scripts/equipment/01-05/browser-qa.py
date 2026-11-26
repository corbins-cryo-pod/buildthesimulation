"""From repo root, CONSOLE_CHROME=<Chromium binary>; optional CONSOLE_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('CONSOLE_BASE','http://127.0.0.1:4345'); url=base+'/simulations/equipment/01-05/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4345'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/analysis-console-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opts=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('CONSOLE_CHROME'):opts['executable_path']=os.environ['CONSOLE_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opts);ctx=b.new_context(viewport={'width':1310,'height':900},accept_downloads=True,ignore_https_errors=True)
  q=ctx.new_page();err=[];q.on('pageerror',lambda e:err.append(str(e)));q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#console-model[data-ready=true]',timeout=14000)
  q.locator('#run').click();assert q.locator('#events tr').count()==4;assert 'trigger sample 20' in q.locator('#status').inner_text()
  assert q.locator('#events tr:first-child td:last-child').inner_text()=='-4'
  q.locator('#trigger-select').select_option('sync-21');q.locator('#run').click();assert q.locator('#events tr:first-child td:last-child').inner_text()=='-4.5'
  q.locator('#waveform').click();assert 'Time from labeled event (ms)' in q.locator('#plot').text_content()
  with q.expect_download() as d:q.locator('#export').click()
  f=Path(d.value.path());a=json.loads(f.read_text());assert a['triggerId']=='sync-21' and a['analysis']['summary'][0]['meanWaveformUV'][2]==-60
  q.locator('#import').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':f.read_bytes()})
  q.wait_for_function("document.querySelector('#status').textContent.includes('Press Run analysis')")
  q.locator('#run').click();assert q.locator('#events tr:first-child td:last-child').inner_text()=='-4.5'
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not err;print('PASS GLB, four labels, trigger -0.5 ms, waveform, JSON download+reload, mobile')
finally:
 if proc:proc.terminate();proc.wait()
