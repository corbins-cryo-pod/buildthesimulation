"""Run at repo root; optional GT2_CHROME and GT2_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('GT2_BASE','http://127.0.0.1:44926');url=base+'/simulations/equipment/06-01/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('GT2_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44926'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/gt2-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('GT2_CHROME'):opt['executable_path']=os.environ['GT2_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#gt2-model[data-ready=true]',timeout=14000)
  assert 'A → B: 50 µm' in q.locator('#status').inner_text()
  q.locator('#reverse').click();assert 'B → A: 50 µm. ΔX −30 µm, ΔY −40 µm.' in q.locator('#status').inner_text()
  q.locator('#pair').select_option('AC');assert 'C → A: 35 µm' in q.locator('#status').inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['drawing']['revision']=='1' and j['measurement']['deltaUm']==[-35,0]
  q.locator('#pair').select_option('AA');assert 'A → A: 0 µm' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, reverse, pair selection, JSON export and mobile')
finally:
 if proc:proc.terminate();proc.wait()
