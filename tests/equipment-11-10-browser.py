"""Optional independent Chromium smoke on a running Astro; BTS_BASE and BTS_CHROME override defaults."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('BTS_BASE', 'http://127.0.0.1:3463')
with sync_playwright() as manager:
    opts = dict(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    if os.environ.get('BTS_CHROME'):
        opts['executable_path'] = os.environ['BTS_CHROME']
    browser = manager.chromium.launch(**opts)
    page = browser.new_page(viewport={'width': 1320, 'height': 970}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(base + '/simulations/equipment/11-10/', wait_until='domcontentloaded', timeout=15000).ok
    page.get_by_role('link', name='Open simulator').click()
    viewer = page.locator('#mt-view')
    expect(viewer).to_have_attribute('data-ready', 'true')
    for view in ['shell', 'display', 'overall']:
        page.locator('[data-mt-view=' + view + ']').click()
    page.locator('#mt-inspect').click()
    expect(page.locator('#mt-result')).to_contain_text('99.0099 µA')
    page.locator('#mt-cycle').click()
    expect(viewer).to_have_attribute('data-drawing', 'gap')
    page.locator('#mt-inspect').click()
    expect(page.locator('#mt-result')).to_contain_text('0.0000 µA')
    with page.expect_download() as download:
        page.locator('#mt-json').click()
    result = json.loads(Path(download.value.path()).read_text())
    assert result['gapDropV'] == 1 and result['currentMicroamp'] == 0 and result['equivalentOhm'] is None
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
    assert not errors, errors
    print('PASS: linked shell, detached card, Ohm-law and open draw state, JSON and 390px layout.')
    browser.close()
