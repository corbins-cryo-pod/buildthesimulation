import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':930,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/04-09/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#pp-view[data-ready=true]',timeout=27000)
 g.locator('#pp-view').screenshot(path=os.environ.get('POLI_SHOT','/tmp/bts-poli500-actual.png'));assert '15 mm · inside band' in g.inner_text('#pp-result')
 g.click('#pp-viewer');g.click('#pp-M2');assert '10 mm · on boundary' in g.inner_text('#pp-result')
 g.click('#pp-M3');assert '20 mm · outside band · signed edge margin -2 mm' in g.inner_text('#pp-result')
 with g.expect_download() as d:g.click('#pp-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='POLI-DETACHED-RADIAL-01' and r['selected']=='M3' and r['signedClearanceMm']==-2 and r['revision']==1
 assert not errors,errors;print('PASS: linked dormant GLB, interior/boundary/exterior chart cases, and immutable JSON export');b.close()
