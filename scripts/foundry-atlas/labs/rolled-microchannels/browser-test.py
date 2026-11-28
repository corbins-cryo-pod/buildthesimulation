"""Offline desktop, touch and narrow release tests for the real single-file lab."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import csv
import io
import json
import os
import shutil
import sys

p = Path(__file__).resolve().parent
runtime = p.parents[2] / 'production-equipment-qa/runtime/chrome-bin/chrome'
chrome = os.environ.get('CHROME_BIN') or (str(runtime) if runtime.is_file() else shutil.which('chromium'))
url = sys.argv[1] if len(sys.argv)>1 else (p / 'index.html').as_uri()
output = []
with sync_playwright() as w:
    browser = w.chromium.launch(executable_path=chrome, args=['--no-sandbox', '--disable-dev-shm-usage'])
    for name, spec in [
        ('desktop',{'viewport':{'width':1380,'height':920}}),
        ('touch',{'viewport':{'width':390,'height':844},'device_scale_factor':2,'is_mobile':True,'has_touch':True}),
        ('narrow',{'viewport':{'width':320,'height':650},'is_mobile':True,'has_touch':True}),
    ]:
        ctx = browser.new_context(**spec, accept_downloads=True)
        offline = url.startswith('file:')
        if offline:
            ctx.set_offline(True)
        page = ctx.new_page()
        page.set_default_timeout(5500)
        errors, req = [], []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('request', lambda r: req.append(r.url))
        page.goto(url)
        page.locator('#advance').wait_for()
        def tap(sel):
            loc=page.locator(sel)
            return loc.click() if name=='desktop' else loc.tap()
        def text(sel): return page.locator(sel).inner_text().strip()
        def setv(sel, value): return page.locator(sel).select_option(value)
        def slider(sel, value): return page.locator(sel).fill(value)
        def dl(sel):
            with page.expect_download() as event:
                tap(sel)
            return Path(event.value.path()).read_text()
        def width():
            viewport = page.evaluate('[document.documentElement.scrollWidth,innerWidth]')
            assert viewport[0] <= viewport[1], (name, viewport)
        def dash():
            return tuple(text(i) for i in ('#metOpen','#metPatent','#metFit','#metElectrical'))
        width()
        assert '59 lumens at 150' in text('.truth')
        assert text('#progressLabel')=='00 / 14 accepted'
        setv('#step','8')
        assert page.get_by_role('heading', name='Bring cap and partitions together').is_visible()
        assert page.locator('#advance').is_disabled()
        setv('#step','0')
        for idx in range(14):
            tap('#advance')
        assert dash()==('59','59 / 59','59 / 59','8 / 8')
        assert 'Correct 8' in text('#wireTable')
        width()
        tap('[data-case=plug]')
        assert dash()==('59','58 / 59','58 / 59','8 / 8') and '0.0000' in text('#lumenTest')
        assert 'W04: mapped correctly' in text('#lumenTest')
        tap('[data-case=break]')
        assert dash()==('59','59 / 59','59 / 59','7 / 8') and 'no conductor detected' in text('#lumenTest')
        tap('[data-case=swap]')
        assert dash()==('59','59 / 59','59 / 59','6 / 8') and 'connected 8' in text('#wireTable')
        tap('[data-case=offset]')
        assert dash()==('59','59 / 59','0 / 59','8 / 8')
        assert 'other stencil' in text('#lumenTest')
        tap('[data-view=section]')
        assert page.locator('#face .hit').count()==59
        assert '7.50%' in text('#driftCaption')
        initial=page.locator('#face').inner_html()
        slider('#faceAngle','-53')
        assert initial!=page.locator('#face').inner_html() and text('#progressLabel')=='14 / 14 accepted'
        tap('#maskVisible')
        assert 'pointer-events="none"' in page.locator('#face').inner_html()
        # Coordinate-free ordinary mouse/touch on an actual SVG lumen.
        center=page.locator('#face [data-lumen="30"]')
        center.scroll_into_view_if_needed()
        (center.click() if name=='desktop' else center.tap())
        assert 'L030' in text('#faceLabel')
        setv('#focus','26')
        assert 'W04' in text('#zoomText') or '60 µm' in text('#zoomText')
        obj=dl('#obj')
        assert '^' not in obj and 'g PDMS_base' in obj and 'g PDMS_lid' in obj and 'g W08_witness' in obj
        mtl=dl('#mtl')
        assert 'newmtl wire' in mtl
        slider('#drift','0')
        assert '0.00%' in text('#driftCaption') and text('#progressLabel')=='11 / 14 accepted'
        width()
        tap('[data-view=bench]')
        partial=json.loads(dl('#json'))
        assert partial['results'] is None and not partial['finished'] and len(partial['completedHandoffs'])==11
        assert page.locator('#csv').is_disabled()
        slider('#dx','0')
        slider('#dy','0')
        tap('#test')
        assert dash()==('59','59 / 59','59 / 59','8 / 8')
        full=json.loads(dl('#json'))
        assert full['finished'] and len(full['results'])==59 and len(full['netMatrix'])==8 and full['stats']['correctElectrical']==8
        d=list(csv.DictReader(io.StringIO(dl('#csv'))))
        assert len(d)==59 and sum(bool(row['mapped-wire']) for row in d)==8 and all(row['fixture-qualified']=='1' for row in d)
        tap('[data-case=geom84]')
        assert dash()==('84','84 / 84','84 / 84','—') and page.locator('#fault').is_disabled()
        tap('[data-case=counter]')
        assert dash()==('84','84 / 84','84 / 84','8 / 8') and text('#tag')=='Teaching only'
        setv('#mode','g50')
        tap('#test')
        assert dash()==('143','143 / 143','143 / 143','—')
        setv('#mode','open50')
        tap('#test')
        assert dash()==('143','—','—','—')
        assert page.locator('#pressure').is_disabled()
        tap('[data-view=section]')
        assert 'No roof' in page.locator('#face').text_content()
        assert page.locator('#drift').is_disabled()
        width()
        tap('[data-view=evidence]')
        assert '§3.7 names the 150' in text('#evidence')
        assert page.get_by_role('link',name='Georgia Tech-hosted full article').is_visible()
        width()
        tap('#reset')
        assert text('#progressLabel')=='00 / 7 accepted'
        width()
        (p/'screens').mkdir(exist_ok=True)
        if name!='narrow':
            setv('#mode','wire150')
            page.evaluate('scrollTo(0,0)')
            page.screenshot(path=str(p/'screens'/f'{name}-front.png'))
            tap('#runTop')
            tap('[data-view=section]')
            page.locator('#section').scroll_into_view_if_needed()
            page.screenshot(path=str(p/'screens'/f'{name}-section.png'))
        assert not errors, errors
        if offline:
            assert all(r.startswith(('file:','blob:')) for r in req), req
        output.append({'form':name,'stages':'14 sequential + variant paths','scope':'seven presets, controls, polygon tapping, two downstream gates, four exports, overflow','page_errors':len(errors),'outside_requests':sum(not r.startswith(('file:','blob:')) for r in req),'offline':offline})
        ctx.close()
    browser.close()
print(json.dumps(output,indent=2))
