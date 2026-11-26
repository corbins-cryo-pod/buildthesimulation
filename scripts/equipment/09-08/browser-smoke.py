"""Real WebGL and numerical test. CHROMIUM_PATH points to a Chromium or Chrome binary."""
import os,sys,json
from playwright.sync_api import sync_playwright
origin=sys.argv[1].rstrip('/')
with sync_playwright() as p:
 opts=dict(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-watchdog','--ignore-gpu-blocklist'])
 if os.environ.get("BTS_BROWSER_PROXY"):opts['proxy']={'server':os.environ['BTS_BROWSER_PROXY']}
 b=p.chromium.launch(**opts)
 for w in (1200,390):
  pg=b.new_page(viewport={'width':w,'height':850},ignore_https_errors=os.environ.get('BTS_TEST_PROXY_TLS')=='1',accept_downloads=True)
  errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto(origin+'/simulations/equipment/09-08/',wait_until='domcontentloaded',timeout=90000);pg.get_by_role('link',name='Open simulator').click()
  pg.wait_for_selector('#vn-view[data-ready="true"]',timeout=90000);assert pg.locator('#vn-view canvas').count()==1
  for v in ['Front panel','Fixture','Rear connections','Reset view']:pg.get_by_role('button',name=v,exact=True).click()
  pg.click('#vn-run');assert 'delay 2 ns' in pg.inner_text('#vn-result')
  pg.select_option('#vn-fixture','thru');pg.click('#vn-cal');assert pg.input_value('#vn-correction')=='response'
  pg.select_option('#vn-fixture','line');pg.click('#vn-run');assert 'delay 1 ns' in pg.inner_text('#vn-result')
  with pg.expect_download() as dl:pg.click('#vn-s2p')
  text=dl.value.path().read_text();assert '# Hz S RI R 50' in text and len([s for s in text.splitlines() if s.startswith('!')==False and s.startswith('#')==False])==201
  with pg.expect_download() as dl:pg.click('#vn-json')
  r=json.loads(dl.value.path().read_text());assert r['ports']==['P1','P2'] and r['revision']==1 and abs(r['rows'][100][2][0]+.30901699437)<1e-8 and len(r['rawRows'])==201
  pg.select_option('#vn-term','S11');assert 'undefined' in pg.inner_text('#vn-result')
  pg.select_option('#vn-format','phase');pg.select_option('#vn-fixture','series');pg.click('#vn-run');assert '|S| 0.5' in pg.inner_text('#vn-result')
  pg.click('#vn-connect');pg.click('#vn-run');assert 'Connect' in pg.inner_text('#vn-status') and pg.is_disabled('#vn-s2p')
  pg.click('#vn-example');pg.locator('summary').filter(has_text='Load passive Touchstone data').click()
  pg.click('#vn-fixture-file');pg.wait_for_function("document.querySelector('#vn-fixture').value==='import'")
  pg.click('#vn-run');assert 'LINE-01' in pg.inner_text('#vn-result')
  pg.fill('#vn-startMHz','10');pg.click('#vn-run');assert 'Extrapolation' in pg.inner_text('#vn-status')
  pg.click('#vn-example');pg.select_option('#vn-term','S21');pg.select_option('#vn-format','db');pg.click('#vn-run')
  assert not errs,errs;assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1');print(str(w)+' px:',pg.inner_text('#vn-model'),pg.inner_text('#vn-result'),flush=True)
  if len(sys.argv)>2:pg.locator('.vnbench').screenshot(path=sys.argv[2]+'-'+str(w)+'.png')
  pg.close()
 b.close()
