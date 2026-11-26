import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);g=b.new_page(viewport={'width':850,'height':760},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/10-11/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#mx-view[data-ready=true]',timeout=30000);g.click('#mx-chip');g.click('#mx-run');assert 'not sampled' in g.inner_text('#mx-focus')
 g.get_by_text('Check the route budget',exact=True).click();g.click('#mx-limit');assert '1020-channel budget' in g.inner_text('#mx-status');g.click('#mx-ref');g.click('#mx-run');assert 'E-074-146 · (638.75, 253.75) µm · 120.0 µV' in g.inner_text('#mx-focus')
 with g.expect_download() as d:g.click('#mx-save')
 r=json.loads(d.value.path().read_text());assert len(r['mapV'])==26400 and r['mapV'].count(None)==26397 and r['mapV'][74*220+146]==.00012
 with g.expect_download() as d:g.click('#mx-wave')
 w=json.loads(d.value.path().read_text());assert w['channels'][0]['id']=='E-074-146' and w['channels'][0]['samples'][80]==.00012
 assert not errors,errors;print('PASS: metric model, masked site vs routed marker, exact coordinates, 1021 rejection, map and voltage downloads');b.close()
