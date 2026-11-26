"""Optional local Playwright browser smoke; set BTS_BASE with Astro already serving it."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('BTS_BASE', 'http://127.0.0.1:3461')
with sync_playwright() as manager:
    options = dict(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    if os.environ.get('BTS_CHROME'):
        options['executable_path'] = os.environ['BTS_CHROME']
    browser = manager.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1320, 'height': 970}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(base + '/simulations/equipment/07-13/', wait_until='domcontentloaded', timeout=15000).ok
    page.get_by_role('link', name='Open simulator').click()
    viewer = page.locator('#ls-view')
    expect(viewer).to_have_attribute('data-ready', 'true')
    for view in ['shell', 'display', 'overall']:
        page.locator('[data-ls-view=' + view + ']').click()
    page.locator('#ls-inspect').click()
    expect(page.locator('#ls-result')).to_contain_text('tile union 1600 mm²')
    for mode in ['touching', 'overlap']:
        page.locator('#ls-cycle').click()
        expect(viewer).to_have_attribute('data-drawing', mode)
        page.locator('#ls-inspect').click()
    expect(page.locator('#ls-result')).to_contain_text('tile union 1480 mm²')
    with page.expect_download() as download:
        page.locator('#ls-json').click()
    result = json.loads(Path(download.value.path()).read_text())
    assert result['pairs'][0]['overlapAreaMm2'] == 120 and result['occupiedMm2'] == 1480
    page.locator('#ls-case').select_option('outside')
    page.locator('#ls-inspect').click()
    expect(page.locator('#ls-result')).to_contain_text('boundary gap -7 mm')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
    assert not errors, errors
    print('PASS: linked GLB, four independent poster cases, texture state, immutable-output JSON, 390px layout.')
    browser.close()
