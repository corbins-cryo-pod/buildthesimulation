#!/usr/bin/env python3
"""Run complete browser journeys against real bundled production-format atlas HTML.

Usage: CHROME_BIN=/path/to/chromium python browser.py path/to/atlas.html [--screens dir]
The local HTTP server and the file: recheck use no third-party requests.
"""
import argparse,contextlib,functools,http.server,json,os,tempfile,threading,shutil
from pathlib import Path
from html.parser import HTMLParser
from playwright.sync_api import sync_playwright

class Extract(HTMLParser):
 def __init__(self):super().__init__();self.take=False;self.data=''
 def handle_starttag(self,t,a):
  if t=='script' and dict(a).get('id')=='atlas-data':self.take=True
 def handle_endtag(self,t):
  if self.take and t=='script':self.take=False
 def handle_data(self,d):
  if self.take:self.data+=d
ap=argparse.ArgumentParser();ap.add_argument('html',type=Path);ap.add_argument('--screens',type=Path);arg=ap.parse_args();arg.html=arg.html.resolve()
src=Extract();src.feed(arg.html.read_text());data=json.loads(src.data);devices=data['devices'];profiles=data['profiles'];equipment=data['equipment'];P={p['id']:p for p in profiles};E={e['id']:e for e in equipment}
assert len({d['slug'] for d in devices})==len(devices)
assert len({e['id'] for e in equipment})==len(equipment)
assert len({p['id'] for p in profiles})==len(profiles)
d=next(d for d in devices if any(len(P[p]['steps'])>1 and P[p]['variants'] and any(st['tools'] for st in P[p]['steps']) and any(st.get('sourceIds') for st in P[p]['steps']) for p in d['profileIds']))
route=next(P[p] for p in d['profileIds'] if len(P[p]['steps'])>1 and P[p]['variants'] and any(st['tools'] for st in P[p]['steps']) and any(st.get('sourceIds') for st in P[p]['steps']))
orphan=next((p for p in profiles if not any(p['id'] in d['profileIds'] for d in devices)),None)
class Serve(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Serve,directory=arg.html.parent));threading.Thread(target=srv.serve_forever,daemon=True).start()
home=f'http://127.0.0.1:{srv.server_port}/{arg.html.name}'
checks=[]
def put(test):checks.append(test)
def visible_count(page,sel):return page.locator(sel).count()
def assert_layout(page):
 assert page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")<=1,page.evaluate('({w:innerWidth,sw:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth})')
def visit(page,loc):page.goto(loc,wait_until='load');page.wait_for_selector('#workspace:not([hidden])')
try:
 with sync_playwright() as pw:
  kw={'headless':True,'args':['--no-sandbox','--no-proxy-server','--disable-gpu','--disable-dev-shm-usage']}
  candidates=[os.environ.get('CHROME_BIN'),os.environ.get('CHROMIUM_PATH'),str(Path(__file__).resolve().parents[3]/'production-equipment-qa/runtime/chrome-bin/chrome'),shutil.which('chromium'),shutil.which('google-chrome')];exe=next((x for x in candidates if x and Path(x).is_file()),None)
  if exe:kw['executable_path']=exe
  browser=pw.chromium.launch(**kw)
  for label,dopts in [('desktop',dict(viewport={'width':1440,'height':1010})),('iPhone13',pw.devices['iPhone 13']),('small360',dict(viewport={'width':360,'height':740},is_mobile=True,has_touch=True,device_scale_factor=1,color_scheme='dark'))]:
   ctx=browser.new_context(**dopts,accept_downloads=True);page=ctx.new_page();page.set_default_timeout(6000)
   errors=[];req=[]
   page.on('pageerror',lambda exc:errors.append(str(exc)));page.on('request',lambda r:req.append(r.url));visit(page,home)
   assert [int(x.replace(',','')) for x in page.locator('#metrics strong').all_text_contents()]==[len(devices),len(profiles),len(equipment)]
   assert_layout(page);put(label+': real release totals and initial layout')
   if arg.screens:
    arg.screens.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(arg.screens/(label+'.png')))
   page.locator('#key summary').click();assert page.locator('#key[open]').count();assert_layout(page);page.locator('#key summary').click()
   page.locator('#search').fill('test-no-match-2197829');assert not page.locator('#mobile-select').is_enabled();assert 'No matching' in page.locator('#detail-heading').inner_text();assert page.locator('#result-count').inner_text().startswith('0');page.locator('#clear').click();assert page.locator('#mobile-select').is_enabled();put(label+': no-match recovery and evidence legend')
   page.locator('#search').fill(d['code'] or d['slug']);assert page.locator('#detail-heading').inner_text()==d['title'];assert page.locator('#mobile-select option').count()==1;page.locator('#clear').click()
   page.locator('#family').select_option(d['family']);page.locator('#evidence').select_option(d['status']);assert d['slug'] in page.locator('#mobile-select option').evaluate_all('(opts)=>opts.map(o=>o.value)');page.locator('#clear').click();put(label+': inclusive family + evidence filters, stable-id search')
   visit(page,home+'#device='+d['slug']+'&route='+route['id']);assert page.locator('#detail-heading').inner_text()==d['title'];assert visible_count(page,'details[data-step]')==len(route['steps']);assert page.locator('details[data-step][open]').count()>=1
   if len(d['profileIds'])>1:
    alt=next(i for i in d['profileIds'] if i!=route['id']);page.locator('#route-select').select_option(alt);assert page.locator('.route-header h4').inner_text()==P[alt]['title'];page.locator('#route-select').select_option(route['id'])
   if len(route['variants'])>1:
    page.locator('.branch-table summary').click();assert page.locator('.branch-table li').count()==len(route['variants']);page.locator('.branch-table summary').click()
   branch=next((v for v in route['variants'] if v['status']!='incompatible' and any(v['id'] in st.get('varies',[]) for st in route['steps'])),next(v for v in route['variants'] if v['status']!='incompatible'));page.locator('#variant-select').select_option(branch['id']);assert branch['description'] in page.locator('.branch-note').inner_text();assert 'variant=' in page.url
   applies=lambda st:branch['status']!='incompatible' and (not st.get('only') or branch['id'] in st['only'])
   assert page.locator('.not-applicable').count()==sum(not applies(st) for st in route['steps'])
   assert page.locator('.flag').count()==sum(applies(st) and branch['id'] in st.get('varies',[]) for st in route['steps']);selected_url=page.url;page.reload();assert page.locator('#variant-select').input_value()==branch['id'];assert_layout(page)
   page.locator('#toggle-steps').click();assert page.locator('details[data-step][open]').count()==len(route['steps']);assert_layout(page)
   page.locator('[data-source]').first.click();assert page.locator('#sources[open]').count();assert page.locator('.source-list li:focus').count()==1
   step_nr=next(i for i,x in enumerate(route['steps']) if x['tools'] and applies(x));eid=route['steps'][step_nr]['tools'][0];page.locator(f'details[data-step="{step_nr}"] [data-equipment]').first.click();assert page.locator('#detail-heading').inner_text()==E[eid]['name'];assert page.locator('#mode-equipment').get_attribute('aria-pressed')=='true';assert page.locator('[data-profile]').count()>=1;page.go_back();assert page.locator('#variant-select').input_value()==branch['id'];assert page.locator('#detail-heading').inner_text()==d['title'];put(label+': route handoffs, conditional branch flags, cited evidence, two-way equipment crosswalk and back navigation')
   with page.expect_download() as download:page.locator('[data-action=export]').click()
   with open(download.value.path()) as fp:j=json.load(fp)
   assert j['selectedVariant']['id']==branch['id'] and j['device']['slug']==d['slug'] and eid in [e['id'] for e in j['equipment']]
   assert j['applicableHandoffNumbers']==[i+1 for i,x in enumerate(route['steps']) if applies(x)]
   assert {e['id'] for e in j['equipment']}=={tool for x in route['steps'] if applies(x) for tool in x['tools']}
   put(label+': selected-configuration export and applicability')
   page.locator('#mode-profiles').click();assert page.locator('#result-count').inner_text().startswith(str(len(profiles)));page.locator('#search').fill(route['id']);assert route['title'] in page.locator('#detail-heading').inner_text();page.locator('#clear').click()
   if orphan:
    visit(page,home+'#profile='+orphan['id']);assert 'Standalone' in page.locator('.notice').inner_text();assert page.locator('#detail-heading').inner_text()==orphan['title']
    if orphan.get('lab'):assert page.get_by_text('Open interactive foundry lab →').count()==1
    with page.expect_download() as dl:page.locator('[data-action=export]').click()
    j=json.loads(Path(dl.value.path()).read_text());assert j['device'] is None and j['selectedProfile']['id']==orphan['id']
   page.locator('#mode-equipment').click();page.locator('#evidence').select_option('linked');assert page.locator('#mobile-select option').count()>0;page.locator('#search').fill(eid);assert page.locator('#detail-heading').inner_text()==E[eid]['name'];page.locator('[data-profile]').first.click();assert page.locator('#mode-profiles').get_attribute('aria-pressed')=='true';put(label+': full route index (including standalone), direct equipment reverse mapping')
   visit(page,home+'#device=nonexistent-7ys');assert 'could not be found' in page.locator('.notice').first.inner_text();visit(page,home+'#device='+d['slug']+'&route='+route['id']+'&variant=invalid-branch-xyz');assert 'branch is unavailable' in page.locator('.notice').first.inner_text();assert page.locator('#variant-select').input_value()=='';visit(page,selected_url+'&unknown=a');assert_layout(page)
   page.locator('#mode-equipment').click();
   if page.locator('#clear').is_visible():page.locator('#clear').click()
   if label=='desktop':
    page.locator('#pagination [data-page="1"]').click();assert 'Page 2' in page.locator('.paginator-count').inner_text()
   else:
    # page number only affects the desktop view.
    ids=page.locator('#mobile-select option').evaluate_all('(opts)=>opts.map(o=>o.value)');page.locator('#mobile-select').select_option(ids[-1]);assert page.locator('#detail-heading').inner_text()==E[ids[-1]]['name'];assert_layout(page)
   assert not errors,errors;assert not [u for u in req if not (u.startswith(home) or u.startswith('blob:'))],req
   put(label+': invalid link fallback, mobile native picker/desktop paging, no overflow/JS errors/external requests');ctx.close()
  page=browser.new_page();visit(page,arg.html.as_uri()+'#profile='+route['id']);assert page.locator('#detail-heading').inner_text()==route['title'];assert page.locator('.mast .brand').get_attribute('href')=='https://buildthesimulation.com/';assert_layout(page);put('Standalone file: no-server rendering with usable site links')
  browser.close()
finally:srv.shutdown()
print(json.dumps({'result':'PASS','devices':len(devices),'profiles':len(profiles),'equipment':len(equipment),'journeys':checks},indent=2))
