"""Optional Playwright smoke. Start Astro separately. Set BTS_BASE and BTS_CHROME for a compatible local Chromium."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('BTS_BASE', 'http://127.0.0.1:3459')
with sync_playwright() as manager:
    opts = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']}
    if os.environ.get('BTS_CHROME'):
        opts['executable_path'] = os.environ['BTS_CHROME']
    browser = manager.chromium.launch(**opts)
    context = browser.new_context(viewport={'width': 1320, 'height': 970}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(base + '/simulations/equipment/06-04/', wait_until='domcontentloaded', timeout=15000).ok
    page.get_by_role('link', name='Open simulator').click()
    expect(page.locator('#f4-view')).to_have_attribute('data-ready', 'true', timeout=14000)
    expect(page.locator('#f4-view')).to_have_attribute('data-block-offset-mm', '0')
    for view in ['rear', 'display', 'overall']:
        page.locator('[data-f4-view=' + view + ']').click()
    page.locator('#f4-inspect').click()
    expect(page.locator('#f4-result')).to_contain_text('INSIDE')
    page.locator('#f4-cycle').click()
    expect(page.locator('#f4-view')).to_have_attribute('data-block-offset-mm', '11')
    page.locator('#f4-inspect').click()
    expect(page.locator('#f4-result')).to_contain_text('TOUCHING · minimum 0 mm')
    page.locator('#f4-cycle').click()
    expect(page.locator('#f4-view')).to_have_attribute('data-block-offset-mm', '14')
    page.locator('#f4-inspect').click()
    expect(page.locator('#f4-result')).to_contain_text('OUTSIDE · minimum -3 mm')
    with page.expect_download() as download:
        page.locator('#f4-json').click()
    report = json.loads(Path(download.value.path()).read_text())
    assert report['units'] == 'mm' and report['status'] == 'outside' and report['minimumMm'] == -3
    assert report['centerMm'] == [14, 0, 0] and report['faces'][0] == {'axis': 'X', 'minusMm': 25, 'plusMm': -3}
    if os.environ.get('BTS_SHOT'):
        page.locator('#f4-view').screenshot(path=os.environ['BTS_SHOT'])
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
    page.locator('#f4-reset').click()
    expect(page.locator('#f4-view')).to_have_attribute('data-block-offset-mm', '0')
    assert not errors, errors
    print('PASS: register link, WebGL/GLB, rear/display/overall views, shared poses +0/+11/+14 mm, inside/tangent/outside, JSON, 390 px mobile, no page errors.')
    browser.close()
