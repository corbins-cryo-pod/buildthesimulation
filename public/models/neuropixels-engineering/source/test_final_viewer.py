from pathlib import Path
from playwright.sync_api import sync_playwright
import json,struct
R=Path(__file__).resolve().parents[1];checks=[];errors=[];requests=[]
def ck(name,value,details=None):
 checks.append({'test':name,'passed':bool(value),'details':details})
 if not value:raise AssertionError(name)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=gl','--disable-gpu-sandbox'])
 context=b.new_context(viewport={'width':1600,'height':1100},device_scale_factor=1,accept_downloads=True)
 context.set_offline(True)
 pg=context.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('request',lambda r:requests.append(r.url))
 pg.set_content((R/'neuropixels-3d-viewer.html').read_text(),wait_until='load')
 pg.wait_for_function('window.NPX && window.NPX.state && window.NPX.state().ready',timeout=30000)
 ck('Standalone HTML initializes with browser networking disabled',pg.evaluate('NPX.state().ready'))
 for v in ['iso','front','side','head','shank','tip','array','electrode']:
  pg.locator(f'[data-view="{v}"]').click();pg.wait_for_function('(v)=>NPX.state().view===v && NPX.state().ready',arg=v)
  ck('View preset '+v,pg.evaluate('NPX.lastRender.drawCalls')>0)
 pg.screenshot(path=str(R/'validation/final-electrode.png'))
 pg.locator('[data-model="reference"]').click();pg.locator('[data-view="iso"]').click();pg.wait_for_function("NPX.state().ready && NPX.state().model==='reference' && NPX.state().view==='iso'")
 pg.locator('#flex').check();pg.wait_for_function('NPX.state().span===86')
 ck('Reference full-flex view',pg.evaluate('NPX.lastRender.drawCalls')==174)
 pg.screenshot(path=str(R/'validation/final-reference.png'))
 pg.locator('#flex').uncheck();pg.locator('[data-model="study"]').click();pg.wait_for_function("NPX.state().ready && NPX.state().model==='study'")
 ck('All 960 site nodes available in viewer',pg.evaluate("NPX.getGLTF('study').nodes.filter(n=>n.extras?.site_id!==undefined).length") ==960)
 before=pg.evaluate('NPX.state()')
 box=pg.locator('#gl').bounding_box();x=box['x']+box['width']*.55;y=box['y']+box['height']*.45
 pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x+60,y+20,steps=4);pg.mouse.up();after=pg.evaluate('NPX.state()')
 ck('Drag rotates model',after['yaw']!=before['yaw'])
 pg.mouse.wheel(0,-200);pg.wait_for_timeout(100);ck('Scroll zooms model',pg.evaluate('NPX.state().span')<before['span'])
 before=pg.evaluate('NPX.state().target');pg.keyboard.down('Shift');pg.mouse.down();pg.mouse.move(x+90,y+40,steps=3);pg.mouse.up();pg.keyboard.up('Shift');ck('Shift-drag pans',pg.evaluate('NPX.state().target')!=before)
 pg.locator('#wire').check();ck('Wireframe toggle',pg.locator('#wire').is_checked());pg.locator('#wire').uncheck()
 pg.locator('#evidence').check();ck('Evidence legend toggle',pg.locator('body').evaluate("e=>e.classList.contains('evidence-on')"));pg.locator('#evidence').uncheck()
 pg.locator('#theme').click();ck('Dark palette',pg.locator('body').evaluate("e=>e.classList.contains('dark')"));pg.locator('#theme').click()
 pg.evaluate("NPX.setView('iso')");pg.screenshot(path=str(R/'validation/final-desktop.png'))
 with pg.expect_download() as info:pg.locator('#download').click()
 d=info.value;p0=Path(d.path());head=p0.read_bytes()[:12]
 ck('Export GLB creates a real binary model',struct.unpack('<III',head)[0]==0x46546c67 and p0.stat().st_size==(R/'models/neuropixels-blueprint-study.glb').stat().st_size)
 pg.locator('#sheetBtn').click();pg.wait_for_function("document.getElementById('sheetImage').naturalWidth>0")
 ck('Embedded engineering sheet opens offline',pg.locator('#sheetImage').evaluate('e=>e.naturalWidth')==2800)
 pg.locator('#sheetModal .close').click()
 pg.locator('#sourcesBtn').click();ck('Source and limitation panel opens',pg.locator('#sourcesModal').evaluate("e=>e.classList.contains('open')"));pg.locator('#sourcesModal .close').click()
 pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(200)
 ck('Mobile viewport has no document-level horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
 pg.locator('#panel').click();ck('Mobile controls open',pg.locator('#sidebar').evaluate("e=>e.classList.contains('open')"));pg.locator('#panel').click()
 pg.screenshot(path=str(R/'validation/final-mobile.png'))
 ck('No JavaScript page errors',not errors,errors)
 remote=[u for u in requests if u.startswith('http:') or u.startswith('https:')]
 ck('No external network asset requests',not remote,remote)
 context.close();b.close()
report={'status':'PASS','tests':checks,'count':len(checks),'browser':'Chromium 144 / software OpenGL on Xvfb, WebGL 2','method':'Standalone HTML loaded into browser DOM with networking disabled. Direct file:// navigation is blocked by this environment policy; not tested here. All assets are inline, with no fetch or module imports.'}
(R/'validation/browser-validation.json').write_text(json.dumps(report,indent=2));print('PASS',len(checks),'browser interaction checks')
