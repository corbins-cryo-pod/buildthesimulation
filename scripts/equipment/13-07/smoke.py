import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':930,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/13-07/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#uc-view[data-ready=true]',timeout=27000)
 g.locator('#uc-view').screenshot(path=os.environ.get('UC7_SHOT','/tmp/bts-uc7-actual.png'));assert '300 display px' in g.inner_text('#uc-result') and '75.00 µm' in g.inner_text('#uc-result')
 g.click('#uc-gauge');g.click('#uc-zoom');assert '450 display px' in g.inner_text('#uc-result') and '75.00 µm' in g.inner_text('#uc-result')
 g.click('#uc-B');assert '300 display px' in g.inner_text('#uc-result') and '50.00 µm' in g.inner_text('#uc-result')
 with g.expect_download() as d:g.click('#uc-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='FIDUCIAL-CARD-UC7-01' and r['pair']=='B' and r['distanceUm']==50 and r['revision']==1 and r['displayZoom']==1.5
 assert not errors,errors;print('PASS: linked exterior GLB, independent chart pair B, invariant 75 µm under zoom, scale-aware export');b.close()
