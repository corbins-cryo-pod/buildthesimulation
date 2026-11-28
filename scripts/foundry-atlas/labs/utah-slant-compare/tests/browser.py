"""Use a Chromium loopback server to test the actual bundled artifact."""
import csv, functools, http.server, io, json, os, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
root=base.parents[2]
bin_path=os.environ.get('CHROMIUM_PATH') or str(root/'production-equipment-qa/runtime/chrome-bin/chrome')
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=base))
threading.Thread(target=srv.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{srv.server_port}'
testcount=0
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=bin_path,args=['--no-sandbox','--disable-gpu','--no-proxy-server'])
 for name,spec in [('desktop',{'viewport':{'width':1440,'height':1000}}),('iphone',pw.devices['iPhone 13']),('narrow',{'viewport':{'width':320,'height':720},'device_scale_factor':1,'is_mobile':True,'has_touch':True})]:
  ctx=b.new_context(accept_downloads=True,**spec)
  p=ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda q:external.append(q.url) if not q.url.startswith(origin) and not q.url.startswith('blob:') else None)
  p.goto(origin+'/index.html',wait_until='domcontentloaded')
  loc=lambda s:p.locator(s);msg=lambda s:loc(s).inner_text();choose=lambda i,v:p.select_option('#'+i,v);exp=lambda n:loc(f'[data-example={n}]').click()
  def fit():
   global testcount
   assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
   testcount+=1
  def export(id):
   with p.expect_download() as d:loc('#'+id).click()
   return Path(d.value.path()).read_text()
  assert '400 µm' in msg('#facts') and '3,600 µm' in msg('#facts') and '750 µm' in msg('#facts')
  assert 'All 180' in msg('#geoNotice');assert 'approximately' in msg('#rangeNote') or 'Approximate' in msg('#rangeNote')
  assert loc('#uniformFig polygon').count()>=100 and loc('#slantFig polygon').count()>=100
  for r,rise in [('overview','1,000 µm'),('options','750 µm'),('study','750 µm')]:
   choose('range',r)
   for dir in ['x+','x-','y+','y-']:
    choose('grade',dir);assert rise in msg('#facts');assert loc('#rowBand > div').count()==10;assert loc('#elevation circle').count()==10;assert dir[0].upper() in msg('#elevationNote');fit()
  choose('grade','x+');before=loc('#slantFig polyline').get_attribute('points');choose('rotation','90');assert before!=loc('#slantFig polyline').get_attribute('points');choose('rotation','0')
  one=loc('#plan .site[data-r="0"][data-c="0"]');x=float(one.get_attribute('cx'));y=float(one.get_attribute('cy'));choose('face','rear');assert float(one.get_attribute('cx'))==300-x and float(one.get_attribute('cy'))==y
  assert 'physical site IDs stay fixed' in loc('#planDesc').text_content();choose('face','front')
  choose('range','measured');loc('#measured').fill('700, 755');assert loc('#error').is_visible() and loc('#run').is_disabled() and loc('#geometryCsv').is_disabled()
  loc('#measured').fill('750 900 810 1080 1150 1200 1270 1350 1450 1500');assert 'reverses direction' in msg('#rangeNote') and loc('#error').is_hidden();fit();choose('range','study')
  l=loc('#run')
  l.click();assert 'All 96 virtual outputs' in msg('#checkStatus');assert loc('#channelsCsv').is_enabled()
  exp('shift');assert '10 candidate silicon bridges' in msg('#geoNotice') and '3,816 µm (+216 µm)' in msg('#spans') and '−16 µm' in msg('#edgeData').replace('-','−')
  l.click();assert '18 ambiguous outputs' in msg('#checkStatus')
  loc('#accountWeb').uncheck();assert loc('#channelsCsv').is_disabled()
  l.click();assert 'All 96 virtual outputs' in msg('#checkStatus')
  if name!='narrow':p.screenshot(path=str(base/'tests'/f'{name}.png'),full_page=True)
  exp('shelf');l.click();assert '180 candidate silicon bridges' in msg('#geoNotice') and '96 ambiguous outputs' in msg('#checkStatus');fit()
  exp('cap');l.click();assert '28 boundaries reaching the rear plane' in msg('#geoNotice') and 'All 96 virtual outputs' in msg('#checkStatus') and 'never create' in msg('#paths');fit()
  exp('mixed');l.click();assert '1 open output, 1 ambiguity' in msg('#checkStatus');assert 'R4C6: no tip path' in msg('#paths');fit()
  g=list(csv.DictReader(io.StringIO(export('geometryCsv'))));assert len(g)==180 and all(r['classification']=='joined' for r in g)
  c=list(csv.DictReader(io.StringIO(export('channelsCsv'))));assert len(c)==100 and sum(x['state']=='parked' for x in c)==4
  assert next(x for x in c if x['site']=='R5C6')['possible_symbolic_tips']=='R4C6|R5C6'
  j=json.loads(export('record'));assert j['synthetic'] and j['base']['nominalPitch']==400 and len(j['boundaries'])==180 and j['virtualFixture']['summary']['open']==1 and j['virtualFixture']['summary']['manualEdge']==['R4C6','R5C6']
  exp('historical');assert loc('#frontKerf').input_value()=='270' and '130 µm' in msg('#spans');fit()
  exp('nominal');choose('edgeRow','0');choose('edgeCol','0');loc('#open').check();l.click();assert 'parked site' in msg('#checkStatus');fit()
  # Parked fault validations, plus ensure far-axis controls always select a valid pair.
  choose('edgeRow','9');choose('edgeAxis','y');assert loc('#edgeRow').input_value()=='8';choose('edgeCol','9');choose('edgeAxis','x');assert loc('#edgeCol').input_value()=='8'
  if not loc('#reg').get_attribute('open')=='':loc('#reg summary').click()
  loc('#offsetX').fill('201');assert l.is_disabled() and 'Out of model' in msg('#geoNotice') and loc('#record').is_enabled();fit()
  j=json.loads(export('record'));assert j['virtualFixture'] is None and not j['cutModelValid']
  p.goto(origin+'/index.html?example=shift&range=overview');assert '10 candidate silicon bridges' in msg('#geoNotice') and '1,000 µm' in msg('#facts');fit()
  assert not errors,errors;assert not external,external
  print('PASS',name,'all published profiles and directions, mirror and camera, six distinct fixtures, measurement/channel/report download, bounds and width',flush=True)
  ctx.close()
 b.close()
srv.shutdown()
print('Viewport/state overflow checks:',testcount)
