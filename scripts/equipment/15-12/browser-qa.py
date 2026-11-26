"""Run from repository root. RZ6_CHROME and RZ6_BASE are optional."""
import csv
import io
import json
import os
import shlex
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

base = os.getenv("RZ6_BASE", "http://127.0.0.1:44942")
url = base + "/simulations/equipment/15-12/simulator/"
server = None
try:
    if base.startswith("http://127.0.0.1") and not os.getenv("RZ6_NO_SERVER"):
        server = subprocess.Popen(
            ["node", "node_modules/astro/astro.js", "dev", "--host", "127.0.0.1", "--port", "44942"],
            env={**os.environ, "ASTRO_TELEMETRY_DISABLED": "1"},
            stdout=open("/tmp/rz6-astro.log", "w"), stderr=subprocess.STDOUT,
        )
        for _ in range(55):
            try:
                with urllib.request.urlopen(url, timeout=2) as reply:
                    assert reply.status == 200
                break
            except OSError:
                time.sleep(.4)
    with sync_playwright() as playwright:
        options = dict(headless=True, args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", *shlex.split(os.getenv("RZ6_CHROME_ARGS", ""))])
        if os.getenv("RZ6_CHROME"):
            options["executable_path"] = os.environ["RZ6_CHROME"]
        if "127.0.0.1" not in base and os.getenv("HTTPS_PROXY"):
            options["proxy"] = {"server": os.environ["HTTPS_PROXY"]}
        with playwright.chromium.launch(**options) as browser:
            page = browser.new_page(viewport={"width": 1300, "height": 900}, ignore_https_errors=True, accept_downloads=True)
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url, wait_until="domcontentloaded", timeout=16000)
            page.wait_for_selector("#rz-model[data-ready=true]", timeout=14000)
            page.locator("[data-view=medusa]").click()
            page.locator("#analyze").click()
            assert "L3 · sample 76 · 2.20 ms" in page.locator("#status").inner_text()
            page.locator("#threshold").select_option("7")
            page.locator("#analyze").click()
            assert "L4 · sample 76 · 2.20 ms" in page.locator("#status").inner_text()
            with page.expect_download() as download:
                page.locator("#json").click()
            report = json.loads(Path(download.value.path()).read_text())
            assert report["source"]["revision"] == "1" and report["result"]["first"]["id"] == "L4", report
            with page.expect_download() as download:
                page.locator("#csv").click()
            rows = list(csv.DictReader(io.StringIO(Path(download.value.path()).read_text())))
            assert len(rows) == 512 and "time_ms" in rows[0] and "source_mV" in rows[0], rows[:1]
            page.locator("#reset").click()
            page.locator("#threshold").select_option("9")
            page.locator("#analyze").click()
            assert "No record qualifies" in page.locator("#status").inner_text()
            page.set_viewport_size({"width": 390, "height": 844})
            page.wait_for_timeout(150)
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+2")
            assert not errors, errors
            print("PASS GLB, Medusa view, offline peak report, exact JSON and CSV, no-detection boundary and mobile")
finally:
    if server:
        server.terminate()
        server.wait()
