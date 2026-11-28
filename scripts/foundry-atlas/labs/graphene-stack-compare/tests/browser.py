#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, re, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
URL=(ROOT/'release/index.html').as_uri()
def expect(page,selector,text):
    value=page.locator(selector).inner_text()
    assert text in value,(selector,text,value)
def download(page,sel):
    with page.expect_download() as d:page.locator(sel).click()
    return d.value.suggested_filename,Path(d.value.path()).read_text()
def run():
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    for tag,launch in [('desktop',dict(viewport={'width':1440,'height':1080},device_scale_factor=1)),('iphone13',dict(p.devices['iPhone 13'])),('360',dict(viewport={'width':360,'height':760},is_mobile=True,has_touch=True,device_scale_factor=1))]:
      ctx=browser.new_context(**launch,accept_downloads=True)
      page=ctx.new_page()
      req=[];errs=[]
      page.on('pageerror',lambda e:errs.append(str(e)))
      page.on('request',lambda r:req.append(r.url) if re.match(r'^https?:',r.url) else None)
      page.goto(URL,wait_until='load')
      def fit():
          return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      assert fit()
      assert page.locator('.specimen svg').count()==2
      expect(page,'#clear-status','0 / 4');expect(page,'#delft-status','Carbon not grown')
      expect(page,'#delft-evidence','separate, centimeter-scale graphene sheet transferred to glass')
      expect(page,'#clear-evidence','470 and 570 nm')
      page.locator('#clear-next').click()
      assert page.locator('#clear-process').input_value()=='1'
      assert page.locator('#delft-process').input_value()=='0'
      page.locator('#delft-process').select_option('3')
      expect(page,'#delft-external','Qualified high-temperature catalytic graphene CVD')
      expect(page,'#delft-status','no device transfer')
      page.locator('#clear-process').select_option('6');expect(page,'#clear-status','4 / 4')
      expect(page,'#clear-values','Not yet routed')
      if tag=='desktop':
          page.screenshot(path=ROOT/'screens/desktop-process.png')
      page.locator('#run-all').click()
      page.wait_for_function("document.querySelector('#delft-process').value==='11'&&document.querySelector('#clear-process').value==='11'")
      expect(page,'#clear-verdict','VIRTUAL BENCH PASS');expect(page,'#delft-verdict','VIRTUAL BENCH PASS')
      expect(page,'#clear-values','Released parylene film');expect(page,'#delft-values','Retained fused silica')
      page.locator('[data-view=section]').click() if tag=='desktop' else page.locator('[data-view=section]').tap()
      assert page.locator('#clear-figure svg').count()==1
      expect(page,'#clear-figure','transferred sheets');expect(page,'#delft-figure','Grown multilayer graphene')
      assert fit()
      page.locator('#samples').screenshot(path=ROOT/'screens'/f'{tag}-cutaway.png')
      name,svg=download(page,'[data-artwork=clear]')
      assert name=='cl-04-section.svg' and 'source CAD' not in svg and '10.1038/ncomms6258' in svg
      root=ET.fromstring(svg); assert root.tag.endswith('svg')
      page.locator('[data-case=tear]').click();expect(page,'#clear-verdict','READS WITH DEFECT');expect(page,'#clear-values','3 / 4')
      expect(page,'#delft-verdict','VIRTUAL BENCH PASS')
      page.locator('[data-case=stagger]').click();expect(page,'#clear-verdict','DRY OPEN');expect(page,'#clear-values','0 / 4')
      page.locator('#clear-transferPath').select_option('ideal');expect(page,'#clear-verdict','READS WITH DEFECT');expect(page,'#clear-values','1,472')
      page.locator('[data-case=mores]').click();expect(page,'#delft-verdict','WINDOW HOLD')
      expect(page,'#delft-values','60% of target');expect(page,'#delft-figure','RESIDUAL Mo')
      page.locator('#delft-figure').screenshot(path=ROOT/'screens'/f'{tag}-aperture.png')
      name,raw=download(page,'#download');data=json.loads(raw)
      assert name=='graphene-coupon-comparison.json'
      a,b=data['samples'];assert [a['id'],b['id']]==['CL-04','DL-ML']
      assert a['state']['pass'] and a['state']['film']['fullSheets']==0 and a['modeledResult']['status']=='READS WITH DEFECT'
      assert a['measuredWitness']['transmittance']==.90 and a['measuredWitness']['wavelengthScope']=='470 and 570 nm'
      assert b['measuredWitness']['transmittance']==.475 and 'cent' not in b['measuredWitness']['sampleRelationship'] # cm-scale travel witness
      assert 'transferred' in b['measuredWitness']['sampleRelationship']
      assert b['state']['clearFraction']==.60 and b['state']['pass'] is False
      page.locator('[data-case=track]').click();expect(page,'#delft-verdict','READS WITH DEFECT');expect(page,'#delft-values','Carbon open · Mo')
      page.locator('#delft-inner').select_option('both-break');expect(page,'#delft-verdict','DRY OPEN')
      page.locator('#delft-diameter').select_option('50')
      page.locator('#delft-windowShift').evaluate("(el)=>{el.value='1';el.dispatchEvent(new Event('input'))}")
      expect(page,'#delft-windowShift-value','25 µm')
      expect(page,'#delft-values','39.1% of target')
      page.locator('#reset').click();assert page.locator('#clear-process').input_value()=='0';assert page.locator('#delft-process').input_value()=='0'
      assert fit();assert not errs,errs;assert not req,req
      print(tag,'· independent stages, 2 modes, 4 fault branches, exports, source scope; no requests, errors or overflow')
      ctx.close()
    browser.close()
if __name__=='__main__':run()
