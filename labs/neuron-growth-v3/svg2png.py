import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--disable-gpu','--no-sandbox']); pg = b.new_page(viewport={'width':900,'height':900})
    for f in sys.argv[1:]:
        svg=open(f).read()
        pg.set_content('<html><body style="margin:0;background:#000">'+svg+'</body></html>'); pg.screenshot(path=f.replace('.svg','.png'), timeout=60000)
    b.close()
