#!/usr/bin/env python3
"""Offline desktop, desktop narrow and iPhone Chromium touch-emulation tests."""
from pathlib import Path
import json,csv,re,os,io
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'release/index.html').as_uri()

def ensure(page, sel, text):
    actual=page.locator(sel).inner_text(timeout=4000)
    assert text in actual,(sel,text,actual)

def wide(page):
    return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')

def downloaded(page, sel):
    with page.expect_download() as d:
        page.locator(sel).click()
    return d.value.suggested_filename, Path(d.value.path()).read_text()

def test():
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],headless=True)
        for name,kwargs in [
            ('desktop',dict(viewport={'width':1410,'height':1000},device_scale_factor=1)),
            ('touch',dict(p.devices['iPhone 13'])),
            ('narrow',dict(viewport={'width':360,'height':720},is_mobile=True,has_touch=True,device_scale_factor=1))
        ]:
            ctx=b.new_context(**kwargs,accept_downloads=True)
            pg=ctx.new_page()
            errors=[]; out=[]; checks=[]
            pg.on('pageerror',lambda e:errors.append(str(e)))
            pg.on('request',lambda r:out.append(r.url) if re.match(r'^https?:',r.url) else None)
            pg.goto(HTML,wait_until='load')
            pg.wait_for_timeout(350)
            ensure(pg,'#step-counter','01 / 10'); assert wide(pg)
            assert pg.evaluate("!!document.querySelector('#specimen').getContext('2d')")
            # Initial painting should be nonblank and no remote script dependencies.
            outpix=pg.evaluate("""() => {
              const c=document.querySelector('#specimen'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
              return [...new Set(Array.from({length:24},(_,i)=>Array.from(a.slice(i*1000,i*1000+4)).join(',')))].length
            }"""); assert outpix>1, ('canvas palette',outpix)
            if name=='desktop':
                pg.screenshot(path=ROOT/'screens/desktop-incoming.png')
            pg.locator('[data-stage="6"]').click()
            assert pg.locator('#camera').input_value()=='explode'; ensure(pg,'#stage-name','Top SU-8')
            pg.locator('[data-mask="gold"]').click()
            fn,sv=downloaded(pg,'#download-artwork')
            assert fn=='mesh-m2-gold.svg' and 'data-mask="2"' in sv and 'data-mask="3"' not in sv and 'viewBox=' in sv
            pg.locator('[data-mask="upper"]').click()
            fn,sv=downloaded(pg,'#download-artwork')
            assert fn=='mesh-m4-upper.svg' and 'fill-rule="evenodd"' in sv and 'id="upper-island-16"' in sv
            checks.append('independent mask export')
            pg.locator('#camera').select_option('plan')
            pg.locator('[data-region=mesh]').click()
            pg.wait_for_timeout(150)
            c=pg.locator('#specimen').bounding_box()
            if name=='desktop':
                pg.mouse.move(c['x']+c['width']*.45,c['y']+c['height']*.45)
                pg.mouse.down();pg.mouse.move(c['x']+c['width']*.66,c['y']+c['height']*.40,steps=4);pg.mouse.up()
            else:
                pg.touchscreen.tap(c['x']+c['width']*.52,c['y']+c['height']*.56)
            pg.locator('#reset-view').click()
            pg.locator('#run').click()
            pg.wait_for_function("document.getElementById('step-counter').textContent==='10 / 10'")
            ensure(pg,'#grade','BENCH PASS')
            ensure(pg,'#metrics','32 / 32');assert wide(pg)
            pg.locator('[data-pin="16"]').click()
            ensure(pg,'#plot-label','1.3 MΩ / -80°')
            assert pg.locator('#bode path[fill="#326c99"]').count()==2
            fn,js=downloaded(pg,'#download-report');r=json.loads(js);assert r['accepted'] and r['counts']['mapped']==32 and r['rows'][15]['sites']==[16]
            fn,cs=downloaded(pg,'#download-map');rows=list(csv.DictReader(io.StringIO(cs)));assert len(rows)==32 and rows[15]['reachable_sites']=='E16'
            fn,cs=downloaded(pg,'#download-eis');eis=list(csv.DictReader(io.StringIO(cs)));assert len(eis)==38 and 'published' in eis[-1]['site']
            fn,cs=downloaded(pg,'#download-wave');wave=list(csv.DictReader(io.StringIO(cs)));assert len(wave)==192
            pg.locator('.wave-details summary').click();assert pg.locator('#waveform svg').count()==1
            checks.append('baseline graphs and all four data exports')
            if name=='desktop':
                pg.locator('#results').scroll_into_view_if_needed()
                pg.screenshot(path=ROOT/'screens/desktop-bench.png')
                pg.locator('[data-region=io]').click()
                pg.wait_for_timeout(100)
                pg.locator('#specimen').screenshot(path=ROOT/'screens/desktop-zif.png')
            pg.locator('[data-preset="shift"]').click()
            ensure(pg,'#grade','MAP FAIL')
            ensure(pg,'#metrics','0 / 32')
            ensure(pg,'#read-card','E17')
            fn,js=downloaded(pg,'#download-report');r=json.loads(js);assert r['rows'][15]['sites']==[17] and r['counts']['unique']==31 and r['counts']['mapped']==0
            checks.append('one-pitch alias and edge open')
            pg.locator('[data-preset="open"]').click()
            ensure(pg,'#grade','OPEN PATH'); ensure(pg,'#metrics','31 / 32')
            pg.locator('[data-pin="17"]').click();ensure(pg,'#plot-label','P17 reads E17');assert pg.locator('[data-pin="16"]').get_attribute('data-code')=='open'
            pg.locator('[data-pin="16"]').click();assert pg.locator('#download-eis').is_disabled()
            pg.locator('[data-preset="bridge"]').click()
            ensure(pg,'#grade','SHARED NET'); ensure(pg,'#read-card','E16, E17'); assert pg.locator('[data-pin="17"]').get_attribute('data-code')=='shared'
            checks.append('targeted open and shared branch')
            pg.locator('[data-preset="occluded"]').click()
            ensure(pg,'#grade','WET FAIL'); ensure(pg,'#read-card','0 µm²'); assert pg.locator('#download-wave').is_disabled()
            pg.locator('[data-preset="rail"]').click()
            ensure(pg,'#grade','HOLD: STRUCTURE'); ensure(pg,'#plot-label','P16 reads E16')
            checks.append('open access vs dry and structural witness')
            pg.locator('#clear-faults').click()
            pg.locator('#population').select_option('half')
            ensure(pg,'#grade','BENCH PASS');ensure(pg,'#diagnosis','16 positions are intentionally empty')
            assert pg.locator('[data-pin="1"]').get_attribute('data-code')=='empty'
            fn,js=downloaded(pg,'#download-report');r=json.loads(js);assert r['counts']['active']==16 and r['counts']['empty']==16 and r['accepted']
            pg.locator('#settings summary').click()
            pg.locator('#reverse').check()
            ensure(pg,'#grade','MAP FAIL')
            pg.locator('#reverse').uncheck()
            pg.locator('#latch').uncheck()
            ensure(pg,'#grade','LATCH OPEN')
            pg.locator('#latch').check()
            ensure(pg,'#grade','BENCH PASS')
            checks.append('separate half population, available latch and labels')
            pg.locator('#ptShift').evaluate("(el)=>{el.value=-32;el.dispatchEvent(new Event('input'))}")
            ensure(pg,'#grade','OPEN PATH')
            pg.locator('#clear-faults').click()
            pg.locator('#population').select_option('full')
            pg.locator('[data-region=section]').click()
            pg.locator('#camera').select_option('explode')
            pg.locator('#specimen').focus();pg.keyboard.press('ArrowRight')
            pg.wait_for_timeout(280); assert wide(pg)
            pg.locator('#specimen').screenshot(path=ROOT/'screens'/f'{name}-layers.png')
            assert not errors,(name,errors); assert not out,(name,out)
            print(name,':',len(checks), 'checks, no network, no page errors, no layout overflow')
            ctx.close()
        b.close()

if __name__=='__main__':test()
