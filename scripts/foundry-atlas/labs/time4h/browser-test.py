from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys,os,shutil
p=Path(__file__).resolve().parent; url=sys.argv[1] if len(sys.argv)>1 else (p/'index.html').as_uri();out=[]
with sync_playwright() as w:
 b=w.chromium.launch(executable_path=os.environ.get('CHROME_BIN') or (str(p.parents[2]/'production-equipment-qa/runtime/chrome-bin/chrome') if (p.parents[2]/'production-equipment-qa/runtime/chrome-bin/chrome').exists() else shutil.which('chromium')),args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,kwargs in [('desktop',dict(viewport={'width':1360,'height':900})),('touch',dict(viewport={'width':390,'height':844}, device_scale_factor=2,is_mobile=True,has_touch=True)),('narrow',dict(viewport={'width':320,'height':620},is_mobile=True,has_touch=True))]:
  ctx=b.new_context(**kwargs,accept_downloads=True);ctx.set_offline(url.startswith('file:'));pg=ctx.new_page();pg.set_default_timeout(6200);errors=[];requests=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('request',lambda a:requests.append(a.url));pg.goto(url);pg.wait_for_selector('#advance:enabled');act=lambda sel: (pg.locator(sel).tap() if name!='desktop' else pg.locator(sel).click());text=lambda sel:pg.locator(sel).inner_text().strip();setm=lambda sel,n:pg.locator(sel).select_option(n)
  def within():assert pg.evaluate('document.documentElement.scrollWidth <= innerWidth'),(name,pg.evaluate('[document.documentElement.scrollWidth,innerWidth]'))
  within();assert text('#runnum')=='00 / 13';setm('#station','9');assert pg.locator('#advance').is_disabled();assert 'external' in text('#stageText').lower();setm('#station','0')
  for i in range(13):act('#advance')
  assert text('#metN')=='16 / 16' and text('#metL')=='14 / 14';within()
  act('[data-case=gl]');assert text('#metN')=='15 / 16' and text('#metA')=='14 / 14' and text('#metL')=='7 / 14';setm('#loop','R2');assert '|Z|' in text('#loopRead');setm('#loop','L1');assert 'return mapping' in text('#loopRead');setm('#returnMode','GR');assert text('#metL')=='—';act('#runBench');assert text('#metL')=='14 / 14'
  act('[data-case=mask]');assert text('#metN')=='16 / 16' and text('#metL')=='7 / 14' and 'return window' in text('#loopRead');act('[data-case=skin]');assert text('#metL')=='14 / 14';act('[data-view=map]');setm('#leg','GL');assert '74 of 109' in text('#patchcap');setm('#leg','GR');assert '109 of 109' in text('#patchcap');setm('#net','R3');assert 'R3 / active shaft' in text('#netfacts');iso=pg.locator('#iso').inner_html();pg.locator('#yaw').fill('-55');pg.locator('#explode').fill('82');assert iso!=pg.locator('#iso').inner_html() and text('#runnum')=='13 / 13'
  pg.locator('#radius').fill('2.4');assert '0.250%' in text('#strain');within();act('[data-view=build]');assert text('#runnum')=='08 / 13'
  # Historical state must not be exported as tested after edits.
  act('[data-view=bench]');
  with pg.expect_download() as dl: act('#export')
  z=json.loads(Path(dl.value.path()).read_text());assert not z['finished'] and z['results'] is None
  act('[data-case=swap]');assert 'R2' in text('#loopRead') and text('#metL')=='12 / 14';act('[data-case=bridge]');assert text('#metL')=='12 / 14'
  act('[data-case=nom]');act('#bench > .paper details summary');pg.locator('#overlay').fill('100');act('#runBench');assert text('#metL')=='0 / 14' and text('#metA')=='14 / 14';pg.locator('#overlay').fill('0');act('#runBench');assert text('#metL')=='14 / 14';setm('#hz','100000');act('#runBench');assert '100000 Hz' in text('#loopRead')
  with pg.expect_download() as dl:act('#export')
  z=json.loads(Path(dl.value.path()).read_text());assert z['finished'] and z['results']['validLoops']==14 and len(z['results']['matrix'])==16;within()
  act('[data-view=notes]');assert pg.get_by_role('link',name='Boretius et al. (2010)').is_visible();within()
  act('#reset');assert text('#runnum')=='00 / 13';within()
  if name!='narrow':
   (p/'screens').mkdir(exist_ok=True);pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(p/'screens'/f'{name}-build.png'))
   act('[data-view=bench]');act('[data-case=gl]');pg.locator('.metrics').scroll_into_view_if_needed();pg.screenshot(path=str(p/'screens'/f'{name}-bench.png'))
  assert not errors,errors
  if url.startswith('file:'):assert all(u.startswith('file:') or u.startswith('blob:') for u in requests),requests
  out.append((name,'passed 13 sequential stations + 6 presets + matrix + fixture reroute + two JSON downloads + geometry + voltage-free inert mechanics + overflow + offline'));ctx.close()
 b.close();print(json.dumps(out,indent=2))
