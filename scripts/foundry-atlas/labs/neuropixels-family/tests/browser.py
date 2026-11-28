"""Exercise the delivered, bundled HTML at phone and desktop sizes (no Internet requests)."""
import tempfile, functools, http.server, threading, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
repo=base.parents[2]
chrome=os.environ.get('CHROMIUM_PATH') or str(repo/'production-equipment-qa/runtime/chrome-bin/chrome')
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=base));th=threading.Thread(target=s.serve_forever,daemon=True);th.start()
url=f'http://127.0.0.1:{s.server_port}/index.html'
cases=0
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=chrome,args=['--no-sandbox','--disable-gpu','--no-proxy-server'])
 for name,spec in [('desktop',{'viewport':{'width':1440,'height':980}}),('iphone',pw.devices['iPhone 13']),('narrow',{'viewport':{'width':320,'height':720},'device_scale_factor':1,'is_mobile':True,'has_touch':True})]:
  ctx=b.new_context(accept_downloads=True,**spec);p=ctx.new_page();errors=[];foreign=[];p.on('pageerror',lambda exc:errors.append(str(exc)));p.on('request',lambda rq:foreign.append(rq.url) if not rq.url.startswith(url.rsplit('/',1)[0]) and not rq.url.startswith('blob:') else None)
  p.goto(url,wait_until='domcontentloaded');assert p.locator('#model').input_value()=='np1';assert p.locator('#requested').inner_text()=='384'
  p.locator('#run').click();assert 'every selected tag arrived' in p.locator('#runStatus').inner_text()
  p.select_option('#fault','site');p.locator('#run').click();assert '1 selected tag did not' in p.locator('#runStatus').inner_text();p.select_option('#pattern','b1');assert p.locator('#csv').is_disabled();p.locator('#run').click();assert 'does not intersect' in p.locator('#runStatus').inner_text()
  p.select_option('#fault','lane');p.locator('#run').click();assert '1 selected tag did not' in p.locator('#runStatus').inner_text()
  p.locator('[data-demo=collision]').click();assert p.locator('#run').is_disabled() and 'both need line 0' in p.locator('#reason').inner_text()
  p.locator('#siteList').fill('0,385');assert p.locator('#run').is_enabled();p.select_option('#fault','swap');p.locator('#run').click();assert '2 tags reached the wrong output' in p.locator('#runStatus').inner_text()
  for kind in ['json','csv']:
   with p.expect_download() as dl:p.locator('#'+kind).click()
   d=dl.value;data=Path(d.path()).read_text()
   if kind=='json':
    item=json.loads(data);assert item['synthetic'] and item['summary']=={'expected':2,'received':2,'missing':0,'wrong_tag':2};assert [r['physical_site_id'] for r in item['rows']]==[0,385]
   else:assert len(data.splitlines())==3 and 'NP1_nominal_hardware_line' in data and 'wrong_tag' in data
  p.locator('[data-demo=fixed]').click();assert p.locator('#model').input_value()=='quad' and p.locator('#run').is_disabled()
  p.get_by_role('button',name='Keep these counts').click();assert p.locator('#model').input_value()=='nxt' and p.locator('#status').inner_text().lower()=='within bounds only' and p.locator('#count0').input_value()=='385';p.locator('#run').click()
  p.select_option('#fault','site');p.locator('#run').click();assert 'unspecified' in p.locator('#runStatus').inner_text() and p.locator('#json').is_disabled()
  p.locator('[data-demo=span]').click();assert p.locator('#pattern').input_value()=='u8' and '282 µm' in p.locator('#art').text_content()
  p.locator('[data-demo=span]').click();assert p.locator('#pattern').input_value()=='u4' and '570 µm' in p.locator('#art').text_content()
  p.select_option('#model','np2s');p.locator('#start').fill('895');assert 'bounds only' in p.locator('#status').inner_text().lower();p.locator('#start').fill('896');assert 'documented layout' in p.locator('#status').inner_text().lower();p.locator('#start').fill('897');assert p.locator('#run').is_disabled()
  p.select_option('#model','np2m');p.select_option('#pattern','diag');p.select_option('#fault','shank');p.select_option('#faultshank','2');p.locator('#run').click();assert '96 selected tags did not' in p.locator('#runStatus').inner_text()
  if name!='narrow':p.screenshot(path=str(base/'tests'/f'{name}.png'),full_page=True)
  # Use user-visible controls for all models and all selectable presets.
  for k in p.locator('#model option').evaluate_all('(opts)=>opts.map(o=>o.value)'):
   p.select_option('#model',k)
   for mode in p.locator('#pattern option').evaluate_all('(opts)=>opts.map(o=>o.value)'):
    p.select_option('#pattern',mode);assert p.locator('#reason').inner_text().strip();assert p.locator('#diagramDesc').text_content().strip()
    assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1,(name,k,mode)
    if p.locator('#run').is_enabled():p.locator('#run').click();assert p.locator('#json').is_enabled(),(name,k,mode)
    else:assert 'Rejected' in p.locator('#status').inner_text().title()
    cases+=1
  p.goto(url+'?model=opto&pattern=color');p.select_option('#wavelength','638');p.select_option('#emitter','13');assert '638 nm, emitter 13' in p.locator('#caption').text_content();assert p.locator('#requested').inner_text()=='384'
  p.goto(url+'?model=bogus&pattern=bogus');assert p.locator('#model').input_value()=='np1' and p.locator('#pattern').input_value()=='b0'
  assert not errors,errors;assert not foreign,foreign
  print('PASS',name,'all variants + fault identity/DAQ distinctions, export round trip, width, no page errors or external requests',flush=True)
  ctx.close()
 b.close()
s.shutdown();print('Browser control sweeps:',cases)
