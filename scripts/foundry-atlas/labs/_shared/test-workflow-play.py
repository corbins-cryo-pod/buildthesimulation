#!/usr/bin/env python3
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, re, tempfile, threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[4]
P=Path(os.environ.get('FOUNDRY_QA_OUTPUT', Path(tempfile.gettempdir())/'bts-foundry-workflow-qa'))
CHROME=os.environ.get('CHROMIUM_BIN')
SLUGS=['flex-rigid-ecog-foundry','ptnrgrid-foundry','mesh-electronics-foundry','graphene-stack-compare']

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*a): pass

def assert_name(button,name):
    assert button.get_attribute('aria-label')==name,(button.get_attribute('aria-label'),name)

def playback_case(page,slug,context,reduced):
    bar=page.locator('[data-foundry-playback]')
    play=bar.locator('button[data-foundry-play]')
    pos=lambda: int(bar.get_attribute('data-play-position'))
    stage_text=lambda: bar.locator('[data-foundry-current]').inner_text()
    latest={'flex-rigid-ecog-foundry':(0,16),'ptnrgrid-foundry':(1,19),'mesh-electronics-foundry':(1,10),'graphene-stack-compare':(2,24)}
    start,finish=latest[slug]
    assert pos()==start,(pos(),start)
    assert play.is_visible()
    assert page.get_by_role('button',name='Play workflow',exact=True).count()==1
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if slug=='graphene-stack-compare':
        page.locator('#delft-process').select_option('3')
        assert pos()==5
        assert page.locator('#clear-process').input_value()=='0'
        start=5
    if context=='touch': play.tap()
    else: play.click()
    assert_name(play,'Pause workflow')
    page.clock.run_for(1350)
    t=pos()
    increment=2 if slug=='graphene-stack-compare' else 1
    assert t==start+increment,(slug,context,t,start,stage_text())
    if slug=='flex-rigid-ecog-foundry':
        assert page.evaluate('window.flexEcog().n')==1
        assert 'Committed 1/16' in page.locator('#status').inner_text()
        page.locator('#focus').select_option('field')
        assert page.locator('#focus').input_value()=='field'
    elif slug=='ptnrgrid-foundry':
        assert page.locator('#stage-index').text_content().startswith('Station 02')
        page.locator('[data-view=grid]').click()
        assert page.locator('[data-view=grid]').get_attribute('aria-pressed')=='true'
    elif slug=='mesh-electronics-foundry':
        assert page.locator('#step-counter').inner_text()=='02 / 10'
        page.locator('[data-mask=gold]').click()
        assert page.locator('#mode-badge').inner_text()=='MASK 2 PREVIEW'
    else:
        assert page.locator('#clear-process').input_value()=='1'
        assert page.locator('#delft-process').input_value()=='4'
        page.locator('[data-view=section]').click()
        assert page.locator('[data-view=section]').get_attribute('aria-pressed')=='true'
    assert_name(play,'Play workflow')
    page.clock.run_for(4100)
    assert pos()==t,('manual pause moved',slug,context,pos(),t)
    play.click()
    assert_name(play,'Pause workflow')
    play.click()
    assert_name(play,'Play workflow')
    page.clock.run_for(2800)
    assert pos()==t
    play.click()
    if reduced:
        assert page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
    page.clock.run_for(27500)
    assert_name(play,'Replay workflow')
    assert pos()==finish
    assert int(bar.locator('progress').get_attribute('value'))==finish
    if slug=='flex-rigid-ecog-foundry':
        assert 'SIMULATED OUTPUT' in page.locator('#benchBadge').inner_text()
        page.locator('#preset').select_option('ref')
        page.locator('#experiment').click()
        recipe=page.evaluate('window.flexEcog().ledger')
        assert recipe[12]['inputs']['refFault']==0
        assert page.evaluate('window.flexEcog().counts.usable')==93
    elif slug=='ptnrgrid-foundry':
        assert page.locator('#stage-index').text_content().startswith('Station 19')
        assert page.locator('#export-csv').is_enabled()
    elif slug=='mesh-electronics-foundry':
        assert page.locator('#grade').inner_text()=='BENCH PASS'
    else:
        for i in ('clear','delft'):assert page.locator('#'+i+'-verdict').inner_text()=='VIRTUAL BENCH PASS'
    play.click()
    assert_name(play,'Pause workflow')
    assert pos()==latest[slug][0]
    if reduced:
        page.clock.run_for(1350)
        assert pos()==latest[slug][0]+increment
        # Reduced motion does not skip any process stage and creates no cross-fade.
        assert page.evaluate("document.getAnimations().filter(x=>x.playState==='running').length===0")
    if slug=='flex-rigid-ecog-foundry':
        page.clock.run_for(27000)
        assert_name(play,'Replay workflow')
        assert page.evaluate('window.flexEcog().ledger')==recipe
        assert page.evaluate('window.flexEcog().counts.usable')==93
    else:
        page.keyboard.press('Escape')
        assert_name(play,'Play workflow')
    print(context,slug,'✓ progress pause/resume manual override replay model gate reduced='+str(reduced),flush=True)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

def run():
  srv=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'public')))
  threading.Thread(target=srv.serve_forever,daemon=True).start()
  with sync_playwright() as p:
    b=p.chromium.launch(**({'executable_path':CHROME} if CHROME else {}),args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    for ctxname,options in [
      ('desktop',dict(viewport={'width':1440,'height':950})),
      ('touch',dict(p.devices['iPhone 13'],reduced_motion='reduce')),
      ('narrow',dict(viewport={'width':360,'height':740},has_touch=True,is_mobile=True))
    ]:
      context=b.new_context(**options)
      for s in SLUGS:
        page=context.new_page()
        errors=[];external=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:external.append(r.url) if r.url.startswith(('https:','http:')) and not r.url.startswith(f'http://127.0.0.1:{srv.server_port}/') else None)
        page.clock.install()
        page.goto(f'http://127.0.0.1:{srv.server_port}/simulations/{s}/')
        playback_case(page,s,ctxname,options.get('reduced_motion')=='reduce')
        assert not errors,errors
        assert not external,external
        if ctxname=='touch':
            page.locator('[data-foundry-playback]').scroll_into_view_if_needed()
            P.mkdir(parents=True,exist_ok=True)
            page.screenshot(path=P/f'{s}-touch.png')
        page.close()
      context.close()
    b.close()
  srv.shutdown()

if __name__=='__main__': run()
