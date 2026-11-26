"""Optional focused desktop/mobile smoke for a locally served or deployed build."""
import json
import math
import os

from playwright.sync_api import sync_playwright, expect

ORIGIN = os.environ.get("BTS_ORIGIN", "http://127.0.0.1:4428").rstrip("/")
DEVICE = "/simulations/equipment/11-06/"
ROUTE = DEVICE + "simulator/"

def target_on_canvas(box, point):
    # Same deterministic Top camera as the viewer; action itself runs through real raycasting.
    camera, aim = (0, 2.54, .029), (0, .782, 0)
    sub = lambda a, b: tuple(x-y for x,y in zip(a,b))
    dot = lambda a, b: sum(x*y for x,y in zip(a,b))
    cross = lambda a,b: (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
    unit = lambda a: tuple(v/math.sqrt(dot(a,a)) for v in a)
    f = unit(sub(aim,camera))
    r = unit(cross(f,(0,1,0)))
    up = cross(r,f)
    d = sub(point,camera)
    inv = 1/(dot(d,f)*math.tan(math.radians(35)/2))
    nx,ny = dot(d,r)*inv*box["height"]/box["width"],dot(d,up)*inv
    return {"x":box["width"]*(1+nx)/2,"y":box["height"]*(1-ny)/2}

with sync_playwright() as p:
    proxy = {"server":os.environ["BTS_BROWSER_PROXY"]} if os.getenv("BTS_BROWSER_PROXY") else None
    browser = p.chromium.launch(executable_path=os.getenv("BTS_CHROME") or None,
        proxy=proxy, headless=True, args=["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"])
    page = browser.new_page(viewport={"width":1390,"height":900},accept_downloads=True)
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(ORIGIN+DEVICE,wait_until="domcontentloaded")
    page.locator(f'a[href="{ROUTE}"]').click()
    expect(page).to_have_url(ORIGIN+ROUTE)
    expect(page.locator("#desk-asset")).to_contain_text("3D asset loaded",timeout=45_000)
    expect(page.locator("#desk-distance")).to_have_text("100 mm")
    page.locator("#desk-views [data-view=top]").click()
    canvas = page.locator("#desk-model")
    canvas.click(position=target_on_canvas(canvas.bounding_box(),(.1625,.782,-.0125)))
    expect(page.locator("#desk-distance")).to_have_text("300 mm")
    page.locator('#desk-presets [data-preset=collision]').click()
    expect(page.locator("#desk-overlap")).to_have_text("105000 mm³")
    with page.expect_download() as event:
        page.locator("#desk-json").click()
    result=json.loads(event.value.path().read_text())
    assert result["collision"] is True and result["schema"]=="bts.breadboard-placement.v1" and result["revision"]==3
    page.set_viewport_size({"width":390,"height":830})
    page.locator('#desk-presets [data-preset=edge]').click()
    expect(page.locator("#desk-overhang")).to_contain_text("B right 22.5 mm")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
    assert not errors, errors
    print(json.dumps({"origin":ORIGIN,"asset":"loaded","3d_grid_pick":"B → (24,14)","json":"parsed","mobile":390,"headset":"untested"}))
    browser.close()
