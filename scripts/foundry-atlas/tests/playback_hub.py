"""Open every Foundry lab from the built hub and exercise the published Play UI."""
import argparse
import concurrent.futures
import functools
import http.server
import os
from pathlib import Path
import re
import threading

from playwright.sync_api import sync_playwright

class Serve(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def audit(base, mode, link, title):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=os.environ.get('CHROME_BIN'),
            args=['--no-sandbox', '--no-proxy-server', '--use-gl=angle',
                  '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = browser.new_context(**(
            {**pw.devices['iPhone 13'], 'reduced_motion': 'reduce'}
            if mode == 'mobile' else {'viewport': {'width': 1440, 'height': 900}}))
        page = context.new_page()
        page.set_default_timeout(8000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '/simulations/foundry/', wait_until='domcontentloaded')
        page.get_by_role('link', name=title, exact=True).click()
        page.wait_for_url(base + link, wait_until='domcontentloaded')
        button = page.get_by_role(
            'button', name=re.compile(r'^(?:(?:▶|▷|►)\s*)?Play\b', re.I)).filter(visible=True).first
        button.wait_for()
        button.click()
        pause = page.get_by_role(
            'button', name=re.compile(r'^(?:(?:⏸|❚❚|Ⅱ)\s*)?Pause\b', re.I)).filter(visible=True).first
        pause.wait_for()
        pause.click()
        resume = page.get_by_role(
            'button', name=re.compile(r'^(?:(?:▶|▷|►)\s*)?(?:Play|Resume)\b', re.I)).filter(visible=True).first
        resume.wait_for()
        assert not errors, (link, mode, errors)
        browser.close()
        return mode, link

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('dist', type=Path)
    parser.add_argument('--only', type=str, default='')
    parser.add_argument('--workers', type=int, default=2)
    args = parser.parse_args()
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(Serve, directory=args.dist))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path=os.environ.get('CHROME_BIN'),
                args=['--no-sandbox', '--no-proxy-server'])
            p = b.new_page()
            p.goto(base + '/simulations/foundry/', wait_until='domcontentloaded')
            labs = p.get_by_role('list', name='Foundry workspaces').get_by_role('link').evaluate_all(
                "(links) => links.map(a => [a.getAttribute('href'), a.getAttribute('aria-label')])")
            b.close()
        assert len(labs) >= 17 and len({link for link, _ in labs}) == len(labs), labs
        jobs = [(mode, link, title) for link, title in labs if re.search(args.only, link)
                for mode in ('desktop', 'mobile')]
        assert jobs, args.only
        failed = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            pending = {pool.submit(audit, base, *job): job for job in jobs}
            for future in concurrent.futures.as_completed(pending):
                try:
                    print('PASS', *future.result(), flush=True)
                except Exception as error:
                    failed.append(pending[future])
                    print('FAIL', *pending[future], str(error).splitlines()[0], flush=True)
        assert not failed, failed
    finally:
        server.shutdown()

if __name__ == '__main__':
    main()
