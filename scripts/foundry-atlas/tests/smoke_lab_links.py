"""Verify hub -> bundled lab navigation in a served static build."""
import argparse, functools, http.server, os, re, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

class Serve(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
parser=argparse.ArgumentParser()
parser.add_argument('dist',type=Path)
parser.add_argument('--lab',nargs=2,required=True,action='append',metavar=('SLUG','HUB_TITLE'))
args=parser.parse_args()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Serve,directory=args.dist))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROME_BIN'),args=['--no-sandbox','--disable-gpu','--no-proxy-server'])
        for label, setup in [('desktop',dict(viewport={'width':1440,'height':900})),('touch',p.devices['iPhone 13'])]:
            for slug, name in args.lab:
                page=browser.new_page(**setup)
                errors=[]; foreign=[]
                page.on('pageerror',lambda err: errors.append(str(err)))
                page.on('request',lambda req: foreign.append(req.url) if ('/'+slug+'/' in page.url and not req.url.startswith((base,'data:','blob:'))) else None)
                page.set_default_timeout(8000)
                assert page.goto(base+'/simulations/foundry/',wait_until='domcontentloaded').status==200
                page.get_by_role('link',name='Open '+name+' lab',exact=True).click()
                page.wait_for_url(base+f'/simulations/{slug}/',wait_until='load')
                assert page.title(),slug
                assert page.locator('button, input, select, summary').count()>2,slug
                assert page.evaluate('document.documentElement.scrollWidth-innerWidth')<=1,(slug,label)
                assert not errors,(slug,label,errors)
                assert not foreign,(slug,label,foreign)
                print('PASS',slug,label,page.title())
                page.close()
        browser.close()
finally:
    server.shutdown()
