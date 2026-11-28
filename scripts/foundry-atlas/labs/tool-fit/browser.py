"""Test export, editable comparisons, missing-field refusal and narrow-device layout."""
import argparse,functools,json,os,shutil,http.server,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
here=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('html',nargs='?',type=Path,default=here/'index.html');p.add_argument('--screenshot-dir',type=Path);a=p.parse_args();pagePath=a.html.resolve()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=pagePath.parent));threading.Thread(target=server.serve_forever,daemon=True).start();url='http://127.0.0.1:%d/%s'%(server.server_port,pagePath.name)
try:
 with sync_playwright() as pw:
  fallback=here.parents[2]/'production-equipment-qa/runtime/chrome-bin/chrome'
  chrome=os.getenv('CHROME_BIN') or (str(fallback) if fallback.is_file() else shutil.which('chromium'))
  kw={'args':['--no-sandbox','--no-proxy-server','--disable-gpu','--disable-dev-shm-usage']}
  if chrome:kw['executable_path']=chrome
  browser=pw.chromium.launch(**kw)
  for name,device in [('desktop',{'viewport':{'width':1366,'height':930}}),('phone',pw.devices['iPhone 13']),('small',{'viewport':{'width':320,'height':700}})]:
   context=browser.new_context(**device,accept_downloads=True);page=context.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.goto(url+'#case=probe',wait_until='load')
   assert page.locator('#preset').input_value()=='probe'
   assert page.locator('#station-a option').count()==199
   def statuses(station):return page.locator('#result-'+station+' .chip').all_text_contents()
   assert statuses('a')==['Outside this configuration']*2
   page.locator('#size').fill('150');assert statuses('a')==['Within compared gates']*2
   page.locator('#end').select_option('release');assert statuses('a')==['Not established','Outside this configuration']
   page.locator('#preset').select_option('plate');assert statuses('a')==['Not established','Outside this configuration']
   page.locator('#job').select_option('eis');assert statuses('a')==['Within compared gates']*2;assert statuses('b')==['Outside this configuration']*2
   page.locator('#preset').select_option('dense')
   assert page.locator('#result-a li').filter(has_text='Mode II feature rule').locator('.gate-key').text_content().startswith('Outside')
   page.locator('#feature').fill('1.2');assert page.locator('#result-a li').filter(has_text='Mode II feature rule').locator('.gate-key').text_content().startswith('Within')
   page.locator('#width').fill('');assert statuses('a')==['Not established']*2
   page.locator('#preset').select_option('seal');page.locator('#station-a').select_option('01-01');assert statuses('a')==['Not established']*2
   page.locator('#preset').select_option('bond');page.locator('#result-a details summary').click()
   assert page.locator('#result-a details a[href*="aggiefab"]').is_visible()
   with page.expect_download() as task:page.locator('#export').click()
   out=json.loads(Path(task.value.path()).read_bytes());assert out['requirement']=={'job':'bond','shape':'round','size':100,'align':'evg610'},out['requirement']
   assert out['evidence']['04-12']['external']['AGGIE-EVG']['url'].startswith('https:') and out['stations'][0]['physicalResult']=='Not evaluated'
   for preset in ['panel','fullpanel','dense','fixture','coat','probe','trench','plate','bond','seal']:
    page.locator('#preset').select_option(preset);assert page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),(name,preset)
   page.locator('#preset').select_option('panel');assert not errs,errs
   if a.screenshot_dir:
    a.screenshot_dir.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(a.screenshot_dir/(name+'.png')))
   print('PASS',name,'10 presets, editable input, 199 tools, per-gate changes, unknown fallback, accessible disclosure and documented JSON export');context.close()
  browser.close()
finally:server.shutdown();server.server_close()
