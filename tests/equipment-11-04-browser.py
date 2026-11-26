"""Optional local Playwright smoke. Start Astro, optionally set BTS_BASE and BTS_CHROME."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('BTS_BASE', 'http://127.0.0.1:3462')
with sync_playwright() as manager:
    options = dict(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    if os.environ.get('BTS_CHROME'):
        options['executable_path'] = os.environ['BTS_CHROME']
    browser = manager.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1320, 'height': 970}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(base + '/simulations/equipment/11-04/', wait_until='domcontentloaded', timeout=15000).ok
    page.get_by_role('link', name='Open simulator').click()
    viewer = page.locator('#dc-view')
    expect(viewer).to_have_attribute('data-ready', 'true')
    for view in ['console', 'cube', 'display', 'overall']:
        page.locator('[data-dc-view=' + view + ']').click()
    page.locator('#dc-inspect').click()
    expect(page.locator('#dc-result')).to_contain_text('(18, 9) mm')
    page.locator('#dc-cycle').click()
    expect(viewer).to_have_attribute('data-drawing', 'ccw')
    page.locator('#dc-inspect').click()
    expect(page.locator('#dc-result')).to_contain_text('(-9, 18) mm')
    with page.expect_download() as download:
        page.locator('#dc-json').click()
    result = json.loads(Path(download.value.path()).read_text())
    assert result['vectorMm'] == [-9, 18] and result['units'] == 'mm'
    assert abs(result['pairLengthMm'] - 20.12461179749811) < 1e-9
    page.locator('#dc-case').select_option('cw')
    page.locator('#dc-inspect').click()
    expect(page.locator('#dc-result')).to_contain_text('(9, -18) mm')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
    assert not errors, errors
    print('PASS: linked model, detached rotations and plot, JSON, 390px layout.')
    browser.close()
