#!/usr/bin/env python3
"""Rendered Playwright tests of real standalone lab artifacts, no site network required."""
from pathlib import Path
import argparse
import json
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--laboratories',type=Path,default=ROOT/'built')
parser.add_argument('--chromium',default=os.environ.get('CHROME_BIN'))
parser.add_argument('--slug',action='append')
parser.add_argument('--write-screens',action='store_true')
args=parser.parse_args()
sceneCounts={
 'self-closing-cuff-foundry':11, 'stentrode-foundry':8, 'time-4h-foundry':13,'rolled-microchannels-foundry':14,'retinal-photovoltaic-foundry':13
}
viewPorts={
 'desktop':{'viewport':{'width':1360,'height':900}},
 'touch':{'viewport':{'width':390,'height':844},'is_mobile':True,'has_touch':True,'device_scale_factor':2},
 'reduced-320':{'viewport':{'width':320,'height':680},'is_mobile':True,'has_touch':True,'reduced_motion':'reduce'}
}
reports=[]
with sync_playwright() as p:
 kw={'args':['--no-sandbox','--disable-dev-shm-usage']}
 if args.chromium:kw['executable_path']=args.chromium
 browser=p.chromium.launch(**kw)
 for slug in args.slug or sceneCounts:
  file=(args.laboratories/slug/'index.html').resolve()
  for viewport,device in viewPorts.items():
   ctx=browser.new_context(**device);ctx.set_offline(True)
   page=ctx.new_page();page.set_default_timeout(7000);errors=[];requests=[]
   page.on('pageerror',lambda err:errors.append(str(err)));page.on('request',lambda req:requests.append(req.url))
   page.clock.install()
   page.goto(file.as_uri())
   play=page.locator('#foundry-workflow-player')
   act=play.locator('[data-fp=action]')
   def get(k):return play.get_attribute('data-'+k)
   def hit(locator):
    if isinstance(locator,str):locator=page.locator(locator)
    return locator.click() if viewport=='desktop' else locator.tap()
   def ctl(name):return play.locator('[data-fp='+name+']')
   def read(sel):return page.locator(sel).inner_text()
   def width():
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(slug,viewport,page.evaluate('[document.documentElement.scrollWidth,innerWidth]'))
   initial_state={
    'self-closing-cuff-foundry':lambda:page.evaluate('JSON.stringify(window.cuffState())'),
    'stentrode-foundry':lambda:read('#stageTitle')+'|'+read('#matrix'),
    'time-4h-foundry':lambda:read('#runnum')+'|'+page.locator('#station').input_value(),
    'rolled-microchannels-foundry':lambda:read('#progressLabel')+'|'+page.locator('#step').input_value()+'|'+page.locator('#mode').input_value(),
    'retinal-photovoltaic-foundry':lambda:read('#progress')+'|'+read('#current-title')+'|'+page.locator('#size').input_value()
   }[slug]
   act.wait_for(state='visible')
   width();assert act.inner_text()=='Play workflow' and get('state')=='idle'
   before=initial_state()
   hit(act)
   assert act.inner_text()=='Pause' and get('state')=='playing'
   assert get('total')==str(sceneCounts[slug]) and get('step')=='1',(slug,viewport,get('total'),errors)
   original=ctl('scene').inner_html();frame=int(get('frame'))
   page.clock.run_for(670)
   moved=ctl('scene').inner_html()
   if viewport=='reduced-320':
    assert int(get('frame'))==1000 and original==moved
    assert 'Reduced motion' in ctl('timing').inner_text()
   else:
    assert int(get('frame'))>frame and original!=moved,(slug,viewport,frame,get('frame'))
   hit(act)
   frozen=get('frame');first_scene=get('scene')
   page.clock.run_for(3500)
   assert get('state')=='paused' and get('scene')==first_scene and get('frame')==frozen
   # Use intrinsic scene selector to verify all final frames and only first-party motion output.
   seen=set()
   for i in range(sceneCounts[slug]):
    ctl('jump').select_option(str(i))
    assert get('state')=='paused' and get('step')==str(i+1)
    v=ctl('scene').inner_html()
    assert len(v)>650,(slug,i,len(v));assert not any(s in v for s in ('NaN','undefined','Infinity')),(slug,i)
    seen.add(get('scene'))
   assert len(seen)==sceneCounts[slug]
   width()
   hit(ctl('replay'));assert act.inner_text()=='Pause' and get('step')=='1'
   ctl('speed').select_option('2')
   page.clock.run_for(26000)
   assert get('step')==str(sceneCounts[slug]) and get('state')=='finished' and act.inner_text()=='Replay workflow',(slug,viewport,get('step'),get('state'),errors)
   assert initial_state()==before,(slug,viewport, before, initial_state())
   if args.write_screens and viewport=='desktop':
    w=ROOT/'screens';w.mkdir(exist_ok=True)
    play.scroll_into_view_if_needed()
    page.screenshot(path=str(w/(slug+'.png')))
   hit(act)
   assert get('state')=='playing' and get('step')=='1'
   if slug=='self-closing-cuff-foundry':
    page.locator('#view').select_option('section')
    assert get('state')=='idle'
    assert page.evaluate('window.cuffState().rev')==0
    page.locator('#f-layout').select_option('28')
    hit(act);assert '28 sensing sites' in ctl('description').inner_text()
    hit(ctl('close'));assert get('state')=='idle'
    hit('#commit');assert page.evaluate('window.cuffState().rev')==1
   elif slug=='stentrode-foundry':
    hit('#next');assert get('state')=='idle'
    assert 'Platinum discs' in read('#stageTitle')
    hit('#finish');assert 'Compare and export' in read('#stageTitle')
    hit('#baseline');assert 'Changed electrical rows: none' in read('#delta')
   elif slug=='time-4h-foundry':
    page.locator('#station').select_option('5')
    assert get('state')=='idle' and 'Open contact windows' in read('#stationTitle')
    assert '00 / 13' in read('#runnum')
    hit('#all');assert '13 / 13' in read('#runnum')
    assert page.locator('#bench').is_visible()
   elif slug=='rolled-microchannels-foundry':
    page.locator('#mode').select_option('open50')
    assert get('state')=='idle'
    hit(act);assert get('total')=='7'
    ctl('jump').select_option('6')
    assert get('scene')=='roll-openQC' and 'UNCAPPED' in ctl('scene').text_content()
    hit(ctl('close'));assert '00 / 7' in read('#progressLabel')
    page.locator('#mode').select_option('counter84')
    hit(act);assert get('total')=='14'
    ctl('jump').select_option('12');assert 'comparison only' in ctl('description').inner_text()
    hit('#runTop');assert get('state')=='idle'
    assert '14 / 14' in read('#progressLabel') and '84' in read('#metOpen')
   elif slug=='retinal-photovoltaic-foundry':
    hit('[data-route=prima]');assert get('state')=='idle' and not act.is_visible()
    assert page.locator('#prima').is_visible() and page.locator('#wang').is_hidden()
    hit('[data-route=wang]');assert act.is_visible()
    page.locator('#size').select_option('280')
    hit(act);assert '280 µm' in ctl('description').inner_text()
    hit('#load-witness');assert get('state')=='idle' and page.locator('#bench-run').is_visible()
   width();assert not errors,(slug,viewport,errors)
   assert all(k.startswith(('file:','blob:','data:')) for k in requests),(slug,viewport,requests)
   reports.append({'slug':slug,'viewport':viewport,'scenes':sceneCounts[slug],'checks':['in-stage content movement' if viewport!='reduced-320' else 'reduced motion static frames','full sequence','scene jump','pause freeze','resume/replay','manual precedence','native test gate','no overflow','no external requests','no page errors']})
   print('PASS',slug,viewport,flush=True)
   ctx.close()
 browser.close()
print(json.dumps(reports,indent=2))
