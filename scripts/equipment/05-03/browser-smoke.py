"""Device-only acceptance; CHROMIUM_PATH selects browser, BTS_BROWSER_PROXY is optional."""
import os,sys,json
from playwright.sync_api import sync_playwright
origin=sys.argv[1].rstrip('/')
with sync_playwright() as p:
 opts={'proxy':{'server':os.environ['BTS_BROWSER_PROXY']}} if os.getenv('BTS_BROWSER_PROXY') else {}
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-watchdog'],**opts)
 for w in (1030,390):
  page=b.new_page(viewport={'width':w,'height':820},accept_downloads=True,ignore_https_errors=bool(os.getenv('BTS_TEST_PROXY_TLS')))
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin+'/simulations/equipment/05-03/',wait_until='domcontentloaded',timeout=60000)
  page.get_by_role('link',name='Open simulator').click();page.wait_for_selector('#viewer[data-ready="true"]',timeout=70000);assert page.locator('#viewer canvas').count()==1
  page.click('#run');assert 'apparent base 32.0 nm' in page.inner_text('#readings')
  page.fill('#radiusNm','20');page.locator('#radiusNm').press('Tab');assert page.is_disabled('#csv');page.click('#run');assert 'apparent base 42.0 nm' in page.inner_text('#readings') and 'Peak–valley 4.000 nm' in page.inner_text('#readings')
  with page.expect_download() as dl:page.click('#json')
  r=json.loads(dl.value.path().read_text());assert r['sampleId']=='RIDGE-20' and r['revision']==1 and len(r['coordinatesNm'])==129 and r['units']=='nm'
  with page.expect_download() as dl:page.click('#csv')
  assert len(dl.value.path().read_text().splitlines())==130
  page.get_by_text('Operate the hardware',exact=True).click();page.click('#engage');page.click('#door');page.click('#load');page.click('#run');assert 'blocked' in page.inner_text('#status')
  page.click('#reset');page.get_by_text('Load a specimen file',exact=True).click();page.click('#fixture');page.click('#run');assert 'MESA-20-CONTROL / revision 4' in page.inner_text('#readings')
  page.click('[data-view=rear]');page.click('[data-view=probe]');assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1');assert not errors,errors
  print(w,page.inner_text('#model'),page.inner_text('#readings'),flush=True);page.close()
 b.close()
