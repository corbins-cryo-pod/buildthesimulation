"""Optional local Chromium smoke; start Astro and optionally set BTS_BASE/BTS_CHROME."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('BTS_BASE', 'http://127.0.0.1:3464')
with sync_playwright() as manager:
    opts = dict(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    if os.environ.get('BTS_CHROME'):
        opts['executable_path'] = os.environ['BTS_CHROME']
    browser = manager.chromium.launch(**opts)
    page = browser.new_page(viewport={'width': 1320, 'height': 970}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(base + '/simulations/equipment/15-03/', wait_until='domcontentloaded', timeout=15000).ok
    page.get_by_role('link', name='Open simulator').click()
    viewer = page.locator('#cw-view')
    expect(viewer).to_have_attribute('data-ready', 'true')
    for view in ['shell', 'display', 'overall']:
        page.locator('[data-cw-view=' + view + ']').click()
    page.locator('#cw-inspect').click()
    expect(page.locator('#cw-result')).to_contain_text('384 mm²')
    for mode in ['diamond', 'collinear']:
        page.locator('#cw-cycle').click()
        expect(viewer).to_have_attribute('data-drawing', mode)
        page.locator('#cw-inspect').click()
    expect(page.locator('#cw-result')).to_contain_text('area 0 mm²')
    with page.expect_download() as download:
        page.locator('#cw-json').click()
    result = json.loads(Path(download.value.path()).read_text())
    assert result['markId'] == 'INK-LINE-C' and result['areaMm2'] == 0 and result['centroidMm'] is None
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
    assert not errors, errors
    print('PASS: linked stationary model, detached three fixed cards, area edge case, JSON and 390px layout.')
    browser.close()
