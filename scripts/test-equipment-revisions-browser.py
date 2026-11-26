"""Exercise only local Astro output: simulations + register -> native revision -> exact ready HTML."""
from pathlib import Path
from hashlib import sha256
from playwright.sync_api import sync_playwright
import argparse,json,os,re
P=Path(__file__).resolve().parents[1]
q=argparse.ArgumentParser()
q.add_argument('--base',default='http://127.0.0.1:8766');q.add_argument('--require-ready',action='append',default=[])
q.add_argument('--out',type=Path,default=Path('/tmp/bts-equipment-revisions-browser.json'))
q.add_argument('--screenshot',type=Path);args=q.parse_args()
data=json.loads((P/'src/data/equipment-revisions.generated.json').read_text())['records']
d={row['id']:row for row in data}
R='/simulations/equipment/'
assert all(d[i]['status']=='ready' for i in args.require_ready)
chrome=os.getenv('CHROME_BIN',str(P.parents[1]/'production-equipment-qa/runtime/chrome-bin/chrome'))
checks={}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=chrome,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
 ctx=b.new_context(viewport={'width':1320,'height':940},color_scheme='light',accept_downloads=True)
 ctx.route('**/*',lambda r: r.continue_() if r.request.url.startswith(args.base+'/') else r.abort())
 page=ctx.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 def go(p):
  resp=page.goto(args.base+p,wait_until='domcontentloaded')
  assert resp and resp.status==200,(p,resp)
 def listing():
  assert page.url.startswith(args.base+R+'revised/')
  page.wait_for_selector('#revision-filter:not([hidden])');assert page.locator('#revision-list > [data-revision]').count()==199
 def shown(n):
  page.wait_for_function('n=>document.querySelector("#revision-count").textContent.startsWith(n+" of ")',arg=n)
  assert page.locator('[data-revision]:visible').count()==n
 def nav(id):
  return page.locator('#revision-list [data-revision="'+id+'"] .rev-link')
 go('/simulations/')
 page.get_by_role('link',name='Browse revised equipment').click();listing();shown(199)
 if args.screenshot:page.screenshot(path=str(args.screenshot/'equipment-revision-library-desktop.png'),timeout=15000)
 page.locator('#rev-q').fill('02-07');shown(1);assert '02-07' in page.url and nav('02-07').is_visible()
 page.locator('#rev-kind').select_option('documentary');shown(0);assert page.locator('#revision-empty').is_visible()
 page.get_by_role('button',name='Clear filters').click();shown(199)
 go(R+'revised/?q=synthecon&kind=documentary');listing();shown(1);assert nav('07-15').is_visible()
 go(R+'revised/?zone=07&kind=documentary');listing();shown(15)
 page.locator('#rev-status').select_option('ready');shown(sum(r['status']=='ready' and r['kind']=='documentary' and r['id'].startswith('07-') for r in data))
 checks['simulationsCatalogueFilters']=True
 go(R)
 assert page.get_by_role('link',name='Browse revised equipment').get_attribute('href')==R+'revised/'
 reg=page.locator('#equipment-02-07')
 assert reg.locator('.eq-revision-inline').get_attribute('href')==R+'02-07/revised/'
 reg.get_by_role('link',name='Spin coater',exact=True).click()
 page.locator('a[href="'+R+'02-07/revised/"]').first.click()
 assert page.url==args.base+R+'02-07/revised/'
 assert page.get_by_role('link',name='Open original simulator').is_visible()
 assert 'Bounded virtual exercise' in page.locator('.rev-badges').inner_text()
 checks['existingRecordDeepLinkAndOriginalSimulator']=True
 for id in ['02-07','07-15','15-13',*args.require_ready]:
  row=d[id]
  go(R+id+'/revised/')
  assert page.get_by_role('link',name='Original equipment record').get_attribute('href')==R+id+'/'
  label='Documentary model' if row['kind']=='documentary' else 'Bounded virtual exercise'
  assert label in page.locator('.rev-badges').inner_text() and page.get_by_role('heading',name='Evidence recorded for this revision').is_visible()
  a=page.locator('a[data-preview-launch]')
  if row['status']!='ready':
   assert a.count()==0 and 'not yet available' in page.locator('.rev-page-note').inner_text()
  else:
   assert a.count()==1
   u=a.get_attribute('href')
   res=ctx.request.get(args.base+u)
   assert res.status==200 and sha256(res.body()).hexdigest()==row['sha256']
   a.click()
   assert 'equipment-revised/'+id+'/' in page.url and not page.evaluate('window.top!==window')
   if id=='02-07':
    page.wait_for_selector('[data-ready=true]',timeout=30000)
    page.locator('[data-action="release"]').click();page.locator('[data-action="lid"]').click()
    assert page.locator('canvas').count()>0
   if id=='07-15':
    page.wait_for_selector('#scene[data-ready=true]',timeout=30000)
    page.locator('[data-action="square"]').click();page.wait_for_function('instrumentSnapshot().settled')
    page.locator('[data-action="record"]').click()
    with page.expect_download() as e:page.locator('#json').click()
    a1=json.loads(Path(e.value.path()).read_text());assert a1['areaMm2']==100 and a1['perimeterMm']==40 and not a1['capture']['physicalInstrumentConnected']
   checks['readyLaunchAndExactBytes-'+id]=True
 checks['unavailableDoesNotExposeLauncher']=any(r['status']!='ready' for r in data)
 ctx2=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,color_scheme='dark')
 ctx2.route('**/*',lambda r: r.continue_() if r.request.url.startswith(args.base+'/') else r.abort())
 p=ctx2.new_page();p.on('pageerror',lambda e:errs.append(str(e)))
 p.goto(args.base+R+'revised/?q=15-13',wait_until='domcontentloaded');p.wait_for_selector('#revision-filter:not([hidden])')
 assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert p.locator('[data-revision]:visible').count()==1 and p.locator('[data-revision]:visible').get_attribute('data-revision')=='15-13'
 if args.screenshot:p.screenshot(path=str(args.screenshot/'equipment-revision-library-mobile.png'),timeout=15000)
 p.locator('[data-revision]:visible .rev-link').click();assert '/15-13/revised/' in p.url
 assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errs,errs
 checks.update({'narrowWidth390':True,'browser':b.version,'pageErrors':errs})
 args.out.write_text(json.dumps(checks,indent=2)+'\n')
 print(checks);b.close()
