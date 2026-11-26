"""Optional Chromium smoke on a running local Astro. Set BTS_BASE/BTS_CHROME if needed."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('BTS_BASE', 'http://127.0.0.1:3460')
with sync_playwright() as manager:
    opts = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
    if os.environ.get('BTS_CHROME'):
        opts['executable_path'] = os.environ['BTS_CHROME']
    browser = manager.chromium.launch(**opts)
    context = browser.new_context(viewport={'width': 1320, 'height': 970}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(base + '/simulations/equipment/07-06/', wait_until='domcontentloaded', timeout=15000).ok
    page.get_by_role('link', name='Open simulator').click()
    viewer = page.locator('#ep-view')
    expect(viewer).to_have_attribute('data-ready', 'true', timeout=15000)
    for view in ['shell', 'display', 'overall']:
        page.locator('[data-ep-view=' + view + ']').click()
    page.locator('#ep-inspect').click()
    expect(page.locator('#ep-result')).to_contain_text('Net moment: 0.00 N·m')
    page.locator('#ep-cycle').click()
    expect(viewer).to_have_attribute('data-drawing', 'nonzero')
    page.locator('#ep-inspect').click()
    expect(page.locator('#ep-result')).to_contain_text('Net moment: 0.30 N·m')
    with page.expect_download() as download:
        page.locator('#ep-json').click()
    report = json.loads(Path(download.value.path()).read_text())
    assert report['classification'] == 'counterclockwise-net' and report['units']['moment'] == 'N·m'
    assert abs(report['netMomentNm'] - .30) < 1e-10 and report['positionsM'] == [-.40, .30]
    if os.environ.get('BTS_SHOT'):
        viewer.screenshot(path=os.environ['BTS_SHOT'])
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
    page.locator('#ep-reset').click()
    expect(viewer).to_have_attribute('data-drawing', 'zero')
    assert not errors, errors
    print('PASS: linked route, GLB/3D cameras, two detached static outputs and texture state, JSON, 390px layout.')
    browser.close()
