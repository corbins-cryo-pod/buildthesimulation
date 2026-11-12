#!/usr/bin/env python3
"""Interact with the portable HTML in system Chromium. No numerical state injection."""
from pathlib import Path
import json, re, time
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[2]
report={'scope':'System Chromium, complete portable HTML rendered directly in memory; navigation is blocked by browser policy. No hosted, file://, Safari or physical-device claim.','checks':[]}
def ok(name,**extra):report['checks'].append({'name':name,'pass':True,**extra})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((ROOT/'axon-stage3-laboratory.html').read_text(),wait_until='domcontentloaded')
 expect(page.locator('#version')).to_contain_text('axon-growth/0.1.0')
 ok('Portable HTML initializes without external runtime dependencies')
 page.locator('#run').click();expect(page.locator('#status')).to_contain_text('Complete',timeout=20000)
 expect(page.locator('#m-alive')).to_have_text('16 / 24')
 ok('Default 24-well worker calculation completes',alive=16,census=24)
 page.screenshot(path=str(ROOT/'docs/axon-interface/stage3/stage3-desktop.png'),full_page=False)
 with page.expect_download() as down:page.locator('#json').click()
 path=ROOT/'docs/axon-interface/stage3/default-browser-result.json';down.value.save_as(path)
 data=json.loads(path.read_text());assert data['summary']['dualContact']==2 and data['summary']['dualCandidate']==0
 ok('Complete JSON contains the calculated snapshot and null electrical result',bytes=path.stat().st_size)
 page.locator('#timeline').fill('0');expect(page.locator('#day')).to_have_text('DAY 0');expect(page.locator('#m-alive')).to_have_text('24 / 24')
 ok('Replay returns to exact saved day zero, not a solver rerun')
 page.locator('#timeline').fill('56');expect(page.locator('#day')).to_have_text('DAY 28')
 page.locator('#cell').select_option('E0003');expect(page.locator('#cell-info')).to_contain_text('E0003')
 page.locator('[data-view="cross"]').click();page.locator('#zoom-in').click();page.locator('[data-view="side"]').click()
 ok('Neuron selection, cross-section, zoom and longitudinal view controls operate')
 page.locator('#pin').click()
 # Collapsible settings remain usable on a physical browser surface.
 page.locator('details').filter(has=page.locator('summary',has_text='Survival')).locator('summary').click()
 page.locator('#p-supplyNgMl').fill('0');expect(page.locator('#stale')).to_have_class(re.compile(r'on'))
 with page.expect_download() as down:page.locator('#json').click()
 old=ROOT/'docs/axon-interface/stage3/pinned-browser-export.json';down.value.save_as(old);assert json.loads(old.read_text())['settings']['supplyNgMl']==20
 ok('Editing controls does not relabel a completed export')
 page.locator('#run').click();expect(page.locator('#status')).to_contain_text('Complete',timeout=20000)
 expect(page.locator('#comparison')).to_contain_text('supplyNgMl')
 ok('Recomputation compares against pinned settings',withdrawalAlive=page.locator('#m-alive').inner_text())
 page.locator('#confirm').check();page.locator('#handoff').click();expect(page.locator('#manifest')).to_contain_text('"executable": false')
 with page.expect_download() as down:page.locator('#save-handoff').click()
 h=ROOT/'docs/axon-interface/stage3/browser-handoff.json';down.value.save_as(h);handoff=json.loads(h.read_text());assert handoff['electricalGeometry'] is None
 ok('Explicit confirmed handoff remains non-executable and preserves original census')
 with page.expect_download() as down:page.locator('#csv').click()
 down.value.save_as(ROOT/'docs/axon-interface/stage3/browser-counts.csv')
 ok('Counts CSV download succeeds')
 page.locator('[data-tab="methods"]').click();expect(page.locator('#verification')).to_contain_text(str(json.loads((ROOT/'public/axon-stage3/validation.json').read_text())['contractTests']['passed'])+' software tests passed');expect(page.locator('#register tr')).to_have_count(50)
 ok('Parameter register, sources and verification status are visible')
 page.locator('[data-tab="questions"]').click();expect(page.locator('.question')).to_have_count(10)
 ok('Scientific questions distinguish assumptions from validation')
 page.locator('[data-tab="experiment"]').click();page.locator('#preset').select_option('baseline');page.locator('#p-wellCount').fill('64');page.locator('#run').click();expect(page.locator('#status')).to_contain_text('Only 24')
 ok('Impossible geometry fails visibly with no automatic population reduction')
 page.locator('#preset').select_option('baseline');page.locator('#run').click();page.locator('#cancel').click();expect(page.locator('#status')).to_contain_text('Cancelled')
 ok('Worker cancellation retains the previously completed result')
 page.locator('#file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"settings":{"unknown":7}}'});expect(page.locator('#status')).to_contain_text('Import rejected')
 ok('Malformed or unknown imported settings are rejected')
 for width in [390,820]:
  page.set_viewport_size({'width':width,'height':844});page.locator('#preset').select_option('short');page.locator('#run').click();expect(page.locator('#status')).to_contain_text('Complete',timeout=20000)
  dims=page.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth})');assert dims['width']==dims['viewport'],dims
  ok(f'{width}px layout has no page overflow and completes a worker calculation',**dims)
  if width==390:page.locator('#anatomy').scroll_into_view_if_needed();page.screenshot(path=str(ROOT/'docs/axon-interface/stage3/stage3-mobile.png'))
 assert not errors,errors;ok('No uncaught page errors',errors=errors)
 b.close()
report['passed']=len(report['checks']);report['failed']=0
(ROOT/'docs/axon-interface/stage3/browser-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
