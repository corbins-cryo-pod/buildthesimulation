"""pip install playwright; playwright install chromium. Set SR860_CHROME optional.
Run from repo root with optional SR860_BASE=https://buildthesimulation.com
and SR860_SHOTS=1 to capture original educational reference views locally."""
from playwright.sync_api import sync_playwright
import os,time,subprocess,tempfile,pathlib,json,math,urllib.request
root=pathlib.Path.cwd();out=root/'public/equipment/09-11'
os.environ['ASTRO_TELEMETRY_DISABLED']='1'
base=os.getenv('SR860_BASE','http://127.0.0.1:4318');proc=None
if '127.0.0.1' in base:
 log=open('/tmp/sr860-qa-server.log','w');proc=subprocess.Popen((['python','-m','http.server','4318','--bind','127.0.0.1','--directory','dist'] if os.getenv('SR860_STATIC') else ['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4318']),stdout=log,stderr=subprocess.STDOUT)
 for i in range(90):
  try:
   with urllib.request.urlopen(base+'/simulations/equipment/09-11/simulator/',timeout=2) as rr:assert rr.status==200
   break
  except Exception:time.sleep(.5)
try:
 with sync_playwright() as pw:
  opts=dict(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  if os.getenv('SR860_CHROME'):opts['executable_path']=os.environ['SR860_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  browser=pw.chromium.launch(**opts);ctx=browser.new_context(viewport={'width':1460,'height':960},ignore_https_errors=True,accept_downloads=True)
  page=ctx.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.on('console',lambda e:print('console',e.text[:220]) if e.type=='error' else None)
  path=base+'/simulations/equipment/09-11/simulator/';r=page.goto(path,wait_until='domcontentloaded',timeout=65000);assert r.status==200
  page.wait_for_selector('#inst[data-ready="true"]',timeout=60000);print('3D loaded',flush=True);page.locator('#run').click();assert 'Acquisition complete' in page.locator('#status').inner_text()
  with page.expect_download() as ev:page.locator('#json').click()
  data=json.loads(pathlib.Path(ev.value.path()).read_text());assert abs(data['final']['rV']-100e-6)<.05e-6;assert abs(data['final']['phaseDeg']-30)<.03
  with page.expect_download() as ev:page.locator('#csv').click()
  csv=pathlib.Path(ev.value.path()).read_text();assert data['columns'][2] in csv and csv.count('\n')>200
  for view,file in [('orbit','angle'),('front','front'),('rear','rear')]:
   page.locator(f'button[data-view="{view}"]').click();page.wait_for_timeout(120)
   if os.getenv('SR860_SHOTS')=='1':page.locator('#inst').screenshot(path=str(out/(file+'.png')))
  page.locator('#reset-view').click();page.locator('#phase90').click();assert page.locator('#json').is_disabled();page.locator('#run').click();deg=page.locator('[data-meter="3"]').inner_text();assert abs(float(deg[:-1])+60)<.1
  page.locator('#cable').click();page.locator('#run').click();assert 'disconnected' in page.locator('#status').inner_text() and page.locator('#json').is_disabled()
  page.locator('#example').click();page.locator('#load-file-example').click();page.wait_for_function("document.getElementById('input-file').textContent.includes('12801')");page.locator('#run').click();assert 'SR860-SYNTH-1K' in page.locator('#status').inner_text()
  page.goto(path+'?from=09-04',wait_until='domcontentloaded');page.wait_for_function("document.getElementById('status').textContent.includes('Acquisition complete')");scope=float(page.locator('[data-meter="2"]').inner_text().split()[0]);assert abs(scope-1414.21)<2;print('Scope transfer verified:',scope,'µV RMS')
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2');page.locator('#example').click();assert not page.locator('#json').is_disabled()
  print('PASS GLB → acquisition → JSON/CSV; phase +90; disconnected interlock; waveform import; 390px mobile;',data['final'],errs,flush=True);assert not errs;browser.close()
finally:
 if proc:proc.terminate();proc.wait()
