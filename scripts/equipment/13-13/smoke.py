import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':930,'height':850},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/13-13/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#cm-view[data-ready=true]',timeout=27000)
 g.locator('#cm-view').screenshot(path=os.environ.get('CM_SHOT','/tmp/bts-cm3050-actual.png'));assert '(14, 12) mm' in g.inner_text('#cm-result')
 g.click('#cm-card');g.click('#cm-Q');assert '(32, 36) mm' in g.inner_text('#cm-result') and 'separation 30 mm' in g.inner_text('#cm-result')
 with g.expect_download() as d:g.click('#cm-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='SLOPE-CARD-CM3050-01' and r['selected']=='Q' and r['fixedMarksMm']['P']==[14,12] and r['revision']==1
 assert not errors,errors;print('PASS: linked metric exterior, immutable P/Q positions, 30 mm chord, and ID-preserving JSON');b.close()
