"""Optional focused desktop/mobile smoke for a locally served or deployed build."""
import json
import math
import os

from playwright.sync_api import sync_playwright, expect

ORIGIN = os.environ.get("BTS_ORIGIN", "http://127.0.0.1:4428").rstrip("/")
DEVICE = "/simulations/equipment/06-03/"
ROUTE = DEVICE + "simulator/"

def target_on_canvas(box, point):
    # Same deterministic Desk camera as the viewer; action itself runs through real raycasting.
    camera, aim = (.46, .32, .47), (.278, .112, .085)
    sub = lambda a, b: tuple(x-y for x,y in zip(a,b))
    dot = lambda a, b: sum(x*y for x,y in zip(a,b))
    cross = lambda a,b: (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
    unit = lambda a: tuple(v/math.sqrt(dot(a,a)) for v in a)
    f = unit(sub(aim,camera))
    r = unit(cross(f,(0,1,0)))
    up = cross(r,f)
    d = sub(point,camera)
    inv = 1/(dot(d,f)*math.tan(math.radians(37)/2))
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
    expect(page.locator("#lx-asset")).to_contain_text("3D asset loaded",timeout=45_000)
    expect(page.locator("#lx-result")).to_contain_text("5 diagram units")
    page.locator("#lx-views [data-view=desk]").click()
    canvas = page.locator("#lx-model")
    canvas.click(position=target_on_canvas(canvas.bounding_box(),(.276,.0845,.117)))
    expect(page.locator("#lx-result")).to_contain_text("10 diagram units")
    with page.expect_download() as event:
        page.locator("#lx-json").click()
    result=json.loads(event.value.path().read_text())
    assert result["pointId"]=="P-02" and result["sourceRevision"]==0 and result["instrumentStateModeled"] is False
    page.set_viewport_size({"width":390,"height":830})
    page.locator("#lx-point").select_option("P-03")
    expect(page.locator("#lx-result")).to_contain_text("9 diagram units")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+1")
    assert not errors, errors
    print(json.dumps({"origin":ORIGIN,"asset":"loaded","3d_desk_pick":"P-02","json":"parsed","mobile":390,"headset":"untested"}))
    browser.close()
