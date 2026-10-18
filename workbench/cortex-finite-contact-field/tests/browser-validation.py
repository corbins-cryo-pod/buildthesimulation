#!/usr/bin/env python3
"""Actual headless Chromium verification, served on loopback only. No remote service."""
import functools
import http.server
import json
import os
from pathlib import Path
import platform
import shutil
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base_url = f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('chromium-browser')
        options = {'headless': True, 'args': ['--no-sandbox', '--enable-precise-memory-info']}
        if executable:
            options['executable_path'] = executable
        browser = p.chromium.launch(**options)
        page = browser.new_page()
        page.set_default_timeout(60000)
        page.goto(base_url + 'tests/browser.html')
        main = page.evaluate('''async baseURL => {
          const {runBrowserSuite}=await import('./browser-suite.js');
          return await runBrowserSuite(baseURL);
        }''', base_url)
        worker = page.evaluate('''baseURL => new Promise((resolve,reject)=>{
          const worker=new Worker(new URL('./browser-worker.js',location.href),{type:'module'});
          const timer=setTimeout(()=>{worker.terminate();reject(new Error('Worker validation timed out after 60s'));},60000);
          worker.onmessage=event=>{clearTimeout(timer);worker.terminate();event.data.error?reject(new Error(event.data.error)):resolve(event.data.result);};
          worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(new Error(event.message));};
          worker.postMessage({baseURL});
        })''', base_url)
        # Smoke-test the user-facing runnable example, including module Worker startup.
        page.goto(base_url + 'examples/browser.html')
        page.wait_for_function("document.querySelector('#status').dataset.ready === 'true'")
        before=page.locator('#result').text_content()
        page.locator('#current').fill('-3')
        page.locator('#current').dispatch_event('input')
        page.wait_for_function("document.querySelector('#result').textContent.includes('-3.00 µA')")
        example={'loaded':True,'waveformControlUpdated':before!=page.locator('#result').text_content(),'workerUsed':True}
        report={'schemaVersion':'finite-contact-browser-validation/1.0','chromiumVersion':browser.version,'executable':executable or 'Playwright bundled chromium','host':{'platform':platform.platform(),'processor':platform.processor(),'logicalCpus':os.cpu_count()},'mainThread':main,'webWorker':worker,'example':example,'passed':main['passed'] and worker['passed'] and example['waveformControlUpdated']}
        (ROOT/'validation'/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps({'chromiumVersion':report['chromiumVersion'],'passed':report['passed'],'mainThread':main['performance'],'webWorker':worker['performance']},indent=2))
        browser.close()
        if not report['passed']:
            raise SystemExit(1)
finally:
    server.shutdown()
    server.server_close()
