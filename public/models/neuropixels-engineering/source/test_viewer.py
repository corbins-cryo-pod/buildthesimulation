from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64
R=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=gl','--disable-gpu-sandbox'])
 pg=b.new_page(viewport={'width':1600,'height':1100},device_scale_factor=1)
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('console',lambda m:print('CONSOLE',m.type,m.text) if m.type=='error' else None)
 pg.set_content((R/'neuropixels-3d-viewer.html').read_text(),wait_until='load')
 pg.wait_for_function('window.NPX && window.NPX.state && window.NPX.state().ready',timeout=30000)
 print('STATE',pg.evaluate('NPX.state()'));print('RENDER',pg.evaluate('NPX.lastRender'))
 pg.screenshot(path=str(R/'validation/viewer-initial.png'))
 for view in ['head','tip','array','electrode']:
  pg.evaluate('(v)=>NPX.setView(v)',view);pg.wait_for_timeout(300)
  pg.screenshot(path=str(R/f'validation/viewer-{view}.png'))
  print(view,pg.evaluate('NPX.lastRender'))
 pg.evaluate("NPX.setModel('reference')")
 pg.evaluate("NPX.setView('iso')")
 pg.screenshot(path=str(R/'validation/viewer-reference.png'))
 print('ERRORS',errors)
 (R/'validation/browser-first-run.json').write_text(json.dumps({'errors':errors,'render':pg.evaluate('NPX.lastRender')},indent=2))
 b.close()
