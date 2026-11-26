"""Run at repo root; optional MFCS_CHROME and MFCS_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,shlex
base=os.getenv('MFCS_BASE','http://127.0.0.1:44928');url=base+'/simulations/equipment/06-07/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('MFCS_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44928'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/mfcs-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',*shlex.split(os.getenv('MFCS_CHROME_ARGS',''))])
  if os.getenv('MFCS_CHROME'):opt['executable_path']=os.environ['MFCS_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#ez-model[data-ready=true]',timeout=14000)
  assert 'distance 30 mm' in q.locator('#status').inner_text()
  q.locator('[data-view=rear]').click()
  q.locator('#mirror').click();assert 'signed ΔX −30 mm' in q.locator('#status').inner_text()
  q.locator('#pair').select_option('AD');assert 'distance 90 mm' in q.locator('#status').inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['panel']['revision']=='1' and j['inspection']['deltaMm']==-90
  q.locator('#pair').select_option('AA');assert 'distance 0 mm' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, rear view, mirror, dot spacing, JSON export and mobile')
finally:
 if proc:proc.terminate();proc.wait()
