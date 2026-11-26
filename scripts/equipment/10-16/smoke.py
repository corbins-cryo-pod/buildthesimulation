import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 g=b.new_page(viewport={'width':850,'height':760},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/10-16/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#vt-view[data-ready=true]',timeout=24000)
 g.click('#vt-tray');g.click('#vt-verify');assert 'PASS · minimum 3.0 mm' in g.inner_text('#vt-result')
 g.click('#vt-rotate');g.locator('#vt-offset').fill('2');g.click('#vt-verify');assert 'FAIL · minimum -7.0 mm' in g.inner_text('#vt-result')
 assert '(9, 4, 15) mm' in g.inner_text('#vt-point')
 with g.expect_download() as d:g.click('#vt-save')
 r=json.loads(d.value.path().read_text());assert r['sampleId']=='DRY-TEAL-01' and r['landmark']['trayPositionMm']==[9,4,15] and r['revision']==2 and r['fits'] is False
 g.click('#vt-reset');g.get_by_label('Inspect landmark').select_option('P2');assert '(15, 4, -7) mm' in g.inner_text('#vt-point')
 assert not errors,errors;print('PASS: linked metric exterior, centered clearance, rotated interference, landmark coordinates and immutable JSON revision');b.close()
