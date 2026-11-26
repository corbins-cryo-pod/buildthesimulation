"""Optional local Chromium smoke. Start Astro and optionally set BTS_BASE / BTS_CHROME."""
import json
import os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('BTS_BASE', 'http://127.0.0.1:3465')
with sync_playwright() as manager:
    opts = dict(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    if os.environ.get('BTS_CHROME'):
        opts['executable_path'] = os.environ['BTS_CHROME']
    browser = manager.chromium.launch(**opts)
    page = browser.new_page(viewport={'width': 1320, 'height': 970}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(base + '/simulations/equipment/15-09/', wait_until='domcontentloaded', timeout=15000).ok
    page.get_by_role('link', name='Open simulator').click()
    viewer = page.locator('#iv-view')
    expect(viewer).to_have_attribute('data-ready', 'true')
    for view in ['shell', 'display', 'overall']:
        page.locator('[data-iv-view=' + view + ']').click()
    page.locator('#iv-inspect').click()
    expect(page.locator('#iv-result')).to_contain_text('Mean 96.000')
    for mode in ['reordered', 'endpoints']:
        page.locator('#iv-cycle').click()
        expect(viewer).to_have_attribute('data-drawing', mode)
        page.locator('#iv-inspect').click()
    expect(page.locator('#iv-result')).to_contain_text('512 / 512 of 1536 pixels')
    with page.expect_download() as download:
        page.locator('#iv-json').click()
    result = json.loads(Path(download.value.path()).read_text())
    assert result['histogram'][0] == result['histogram'][255] == 512 and result['shape'] == [48, 32]
    with page.expect_download() as download:
        page.locator('#iv-png').click()
    im = Image.open(download.value.path()).convert('L')
    assert im.size == (48, 32) and [im.getpixel((x, 0)) for x in (1, 20, 45)] == [0, 128, 255]
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2')
    assert not errors, errors
    print('PASS: linked GLB, independent histograms, exact JSON and pixel PNG, 390px layout.')
    browser.close()
