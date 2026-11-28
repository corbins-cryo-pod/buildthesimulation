"""Playwright checks against the exact standalone artifact (no external requests)."""
import argparse, functools, http.server, json, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
here=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('html',type=Path,nargs='?',default=here/'index.html');p.add_argument('--shots',type=Path);opts=p.parse_args()
page=opts.html.resolve()
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
httpd=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=page.parent));threading.Thread(target=httpd.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(httpd.server_port);url=base+'/'+page.name
tests={
 'carrier':[['incompatible','unknown','incompatible'],['unknown','unknown','incompatible'],['incompatible','incompatible','incompatible']],
 'panel':[['unknown','incompatible'],['incompatible','incompatible'],['incompatible','unknown'],['unknown','incompatible'],['unknown','match']],
 'develop':[['incompatible'],['match'],['incompatible']],
 'placement':[['incompatible','incompatible','incompatible'],['match','incompatible','incompatible']],
 'seal':[['match','incompatible','incompatible'],['incompatible','match','incompatible']],
 'record':[['incompatible','match','incompatible'],['match','incompatible','unknown'],['incompatible','incompatible','incompatible']]
}
try:
 with sync_playwright() as pw:
  fallback=here.parents[2]/'production-equipment-qa/runtime/chrome-bin/chrome'
  chrome=os.getenv('CHROME_BIN') or (str(fallback) if fallback.is_file() else shutil.which('chromium'))
  kw={'args':['--no-sandbox','--no-proxy-server','--disable-gpu','--disable-dev-shm-usage']}
  if chrome:kw['executable_path']=chrome
  b=pw.chromium.launch(**kw)
  for label,config in [('desktop',{'viewport':{'width':1400,'height':900}}),('phone',pw.devices['iPhone 13']),('small',{'viewport':{'width':320,'height':760},'is_mobile':True,'has_touch':True,'color_scheme':'dark'})]:
   ctx=b.new_context(**config,accept_downloads=True);p=ctx.new_page();errors=[];outside=[]
   p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:outside.append(r.url) if not r.url.startswith((base,'blob:')) else None)
   p.goto(url+'?case=develop&artifact=contact&demand=developer');assert p.locator('#artifact').input_value()=='contact'
   read=lambda:p.locator('#handoff-port').get_attribute('data-state')
   def receipt():
    with p.expect_download() as dl:p.locator('#download').click()
    payload=json.loads(Path(dl.value.path()).read_bytes())
    assert payload['schema']=='bts.process-handoff-receipt.v1' and payload['virtualOnly']
    return payload
   p.locator('#next').focus();p.keyboard.press('Enter');assert p.locator('#checks li[data-state=pending]').count()==2 and p.locator('#download').is_disabled()
   p.locator('#run').click();assert read()=='match';raw=receipt()
   assert raw['executed']['id']=='WAFER-MA6-001' and raw['executed']['outputRevision']==3
   p.locator('#reset').click();assert read()=='pending' and p.locator('#next').evaluate('(e)=>e===document.activeElement')
   p.locator('#artifact').select_option('rename');assert p.locator('#download').is_disabled();p.locator('#run').click();assert read()=='incompatible';raw=receipt()
   assert 'executed' not in raw and raw['receipt']['gates'][0]['status']=='match'
   p.locator('[data-case=record]').click();p.locator('#artifact').select_option('volts');p.locator('#run').click();raw=receipt()
   assert raw['executed']['terminal']=='AI0' and raw['executed']['points']==131
   p.locator('#demand').select_option('recording');assert p.locator('#download').is_disabled();p.locator('#run').click();assert read()=='unknown'
   p.locator('#sources summary').click();assert p.locator('#references a').count()>=2
   visited=0
   for c,rows in tests.items():
    p.locator('[data-case='+c+']').click()
    assert p.locator('[data-case='+c+']').get_attribute('aria-pressed')=='true'
    for i,row in enumerate(rows):
     p.locator('#artifact').select_option(index=i)
     for j,expect in enumerate(row):
      p.locator('#demand').select_option(index=j)
      assert read()=='pending'
      p.locator('#run').click();assert read()==expect,(c,i,j,expect,read())
      assert p.locator('#checks li[data-state=pending]').count()==0
      assert p.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1,(label,c,i,j)
      visited+=1
   p.goto(url+'?case=bad&artifact=bad&demand=bad');assert p.locator('#artifact').input_value()=='dry200' and p.locator('#demand').input_value()=='drie'
   p.locator('#run').click();assert read()=='incompatible'
   if opts.shots:
    opts.shots.mkdir(parents=True,exist_ok=True);p.evaluate('window.scrollTo(0,0)');p.screenshot(path=str(opts.shots/(label+'.png')),full_page=True)
   assert not errors,errors;assert not outside,outside
   print('PASS',label,visited,'case/artifact/demand combinations plus deep-link, staged checks, stale-receipt reset and download verification',flush=True)
   ctx.close()
  b.close()
finally:httpd.shutdown();httpd.server_close()
