"""Native blocked/recovery and reduced-motion guards for the four local HTML files."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os
ROOT=Path(__file__).resolve().parents[1]
BROWSER=os.environ.get("CHROMIUM_PATH")
REPO_SIM=next((d/'public/simulations' for d in ROOT.parents if (d/'public/simulations').is_dir()),ROOT/'out')
ARTIFACTS=Path(os.environ.get("FOUNDRY_PLAY_ARTIFACTS",ROOT/'out' if (ROOT/'out').is_dir() else REPO_SIM))
play='[data-flow-role=play]';replay='[data-flow-role=replay]';status='[data-flow-role=status]'
player='.bts-workflow-player'
with sync_playwright() as s:
 b=s.chromium.launch(executable_path=BROWSER,args=['--no-sandbox','--disable-webgl','--disable-gpu'])
 for slug in ['neuropixels-foundry','masmanidis-64d-foundry','neuropixels-family','utah-array-fabrication']:
  p=b.new_page(viewport={'width':393,'height':850},is_mobile=True,has_touch=True,reduced_motion='reduce')
  p.set_default_timeout(3000)
  p.clock.install()
  p.goto((ARTIFACTS/slug/'index.html').as_uri())
  L=p.locator;phase=lambda:L(player).get_attribute('data-player-state')
  if slug in ['neuropixels-foundry','masmanidis-64d-foundry']:
   choice='#die' if slug=='neuropixels-foundry' else '#field'
   edge=p.evaluate("(id)=>[...document.querySelector(id).options].find(o=>/edge/i.test(o.textContent)).value",choice)
   p.select_option(choice,edge)
   L(play).click();p.clock.fast_forward(2400);assert phase()=='blocked' and L(choice).input_value()==edge,(slug,phase(),L(status).inner_text())
   assert L('#rev').text_content()=='r0';assert L('#status').evaluate("e=>e.classList.contains('bad')")
   # Use a trusted native control to protect a user-selected configuration before any commit.
   L(choice).focus();p.keyboard.press('ArrowDown')
   L(replay).click();assert L('[data-flow-role=confirm]').is_visible()
   L('[data-flow-role=keep]').click();assert L('#rev').text_content()=='r0'
   p.select_option(choice,'D072' if slug=='neuropixels-foundry' else 'F33')
   L(play).click();p.clock.fast_forward(2400);assert phase()=='running' and 'preview' in L(status).inner_text();L(play).click()
  elif slug=='neuropixels-family':
   L('[data-demo=collision]').click()
   L(play).click();p.clock.fast_forward(2500);p.clock.fast_forward(2500)
   assert phase()=='blocked' and 'both need line 0' in L(status).inner_text()
   assert L('#siteList').input_value()=='0,384' and L('#json').is_disabled()
   p.select_option('#model','nxt');p.select_option('#pattern','dense');p.select_option('#fault','site')
   L(play).click()
   for _ in range(7):p.clock.fast_forward(2500)
   assert phase()=='blocked' and 'unspecified' in L(status).inner_text(),(phase(),L(status).inner_text())
   assert L('#fault').input_value()=='site' and L('#json').is_disabled()
   p.select_option('#fault','lane')
   L(play).click()
   for _ in range(7):p.clock.fast_forward(2500)
   assert phase()=='done' and L('#json').is_enabled() and '1 selected tag' in L('#runStatus').inner_text()
  else:
   L(play).click()
   for _ in range(36):
    if L('#stageTitle').inner_text()=='Face labels and map':break
    assert phase()=='running',(phase(),L(status).inner_text());p.clock.fast_forward(2300)
   assert L('#stageTitle').inner_text()=='Face labels and map'
   L(play).click()
   p.select_option('#scenario','face-bridge')
   L(play).click()
   for _ in range(10):
    if phase()!='running':break
    p.clock.fast_forward(2200)
   assert phase()=='blocked',(phase(),L(status).inner_text())
   assert L('#scenario').input_value()=='face-bridge' and L('#revision').inner_text()=='r4' and L('#export').is_disabled()
  assert p.evaluate("!document.querySelector('[data-bts-flow-active]')?.getAnimations().length")
  print('PASS',slug,'native rejection without changing the chosen configuration; offline reduced-motion',flush=True)
  p.close()
 b.close()
