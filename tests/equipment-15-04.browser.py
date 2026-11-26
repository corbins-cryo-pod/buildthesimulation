"""Optional focused desktop/mobile smoke for a locally served or deployed build."""
import json
import math
import os

from playwright.sync_api import sync_playwright, expect

ORIGIN = os.environ.get("BTS_ORIGIN", "http://127.0.0.1:4428").rstrip("/")
DEVICE = "/simulations/equipment/15-04/"
ROUTE = DEVICE + "simulator/"

def target_on_canvas(box, point):
    # Same deterministic Keys camera as the viewer; action itself runs through real raycasting.
    camera, aim = (.743, 1.356, .957), (.365, .827, .178)
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
    expect(page.locator("#wp-asset")).to_contain_text("3D asset loaded",timeout=45_000)
    expect(page.locator("#wp-length")).to_have_text("5 mm over 0.5 s")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
    page.locator("#wp-views [data-view=keys]").click()
    canvas = page.locator("#wp-model")
    canvas.click(position=target_on_canvas(canvas.bounding_box(),(.370,.798,.185)))
    expect(page.locator("#wp-index")).to_have_text("Index 2 / 6")
    expect(page.locator("#wp-delta")).to_contain_text("ΔY -4 mm")
    page.locator("#wp-timeline [data-index='3']").click()
    expect(page.locator("#wp-coord")).to_have_text("Missing")
    with page.expect_download() as event:
        page.locator("#wp-json").click()
    result=json.loads(event.value.path().read_text())
    assert result["index"]==3 and result["sourceRevision"]==0 and result["videoProcessed"] is False and result["deltaMm"] is None
    page.set_viewport_size({"width":390,"height":830})
    page.locator("#wp-timeline [data-index='4']").click()
    expect(page.locator("#wp-status")).to_contain_text("no adjacent pair")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
    assert not errors, errors
    print(json.dumps({"origin":ORIGIN,"asset":"loaded","3d_key_pick":"next","json":"parsed","mobile":390,"headset":"untested"}))
    browser.close()
