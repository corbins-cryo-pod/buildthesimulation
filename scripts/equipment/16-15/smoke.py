import os,sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or p.chromium.executable_path,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);g=b.new_page(viewport={'width':820,'height':760},accept_downloads=True);errors=[];g.on('pageerror',lambda e:errors.append(str(e)));g.goto(sys.argv[1].rstrip('/')+'/simulations/equipment/16-15/');g.get_by_role('link',name='Open simulator').click();g.wait_for_selector('#prop-view[data-ready=true]',timeout=30000)
 def save():
  with g.expect_download() as d:g.click('#prop-save')
  return json.loads(d.value.path().read_text())
 g.click('#prop-near');g.click('#prop-grab');g.click('#prop-store');assert 'Open the drawer' in g.inner_text('#prop-status');g.click('#prop-drawer');g.click('#prop-store');open1=save();g.click('#prop-drawer');g.click('#prop-drawer');open2=save();assert open1['item']==open2['item'] and open2['drawer']['occupant']=='PPE-CASE-01';g.click('#prop-lights');g.click('#prop-lamp');lit=save();assert lit==dict(open2,revision=open2['revision']+1,illumination=dict(open2['illumination'],enabled=True,visualIntensity=1));assert not errors,errors;print('PASS: GLB, closed transfer guard, same item and local pose after drawer cycle, independent lamp and exported JSON');b.close()
