"""Playwright QA for local, hosted Cloudflare preview or production; --refs exports original model views."""
import os,sys,json,pathlib,io,math
from playwright.sync_api import sync_playwright
from PIL import Image
base=os.getenv('BTS_ORIGIN','http://127.0.0.1:4391').rstrip('/');out=pathlib.Path(__file__).resolve().parents[3]/'public/equipment/09-01'
with sync_playwright() as p:
 proxy={'server':os.environ['BTS_BROWSER_PROXY']} if os.getenv('BTS_BROWSER_PROXY') else None
 b=p.chromium.launch(proxy=proxy,executable_path=os.getenv('BTS_CHROME') or None,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'],headless=True)
 pg=b.new_page(viewport={'width':1390,'height':950},device_scale_factor=1)
 errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(base+'/simulations/equipment/09-01/',wait_until='domcontentloaded')
 pg.locator('a[href="/simulations/equipment/09-01/simulator/"]').click()
 pg.locator('#rx-asset').filter(has_text='3D asset loaded').wait_for(timeout=90000)
 g=pg.locator('#rx-canvas');g.scroll_into_view_if_needed()
 def click_model(view,x,y,d):
  pg.locator('[data-view='+view+']').click();g.scroll_into_view_if_needed();q=g.bounding_box();s=q['height']/(2*math.tan(math.radians(17.5)))/d
  pg.mouse.click(q['x']+q['width']/2+x*s,q['y']+q['height']/2-y*s)
 click_model('front',.026,.085-.095,.427)
 assert pg.locator('#cable').inner_text()=='Seat DB25','3D front plug should disconnect'
 pg.locator('#run').click();assert 'Seat the DB25' in pg.locator('#rx-status').inner_text()
 click_model('front',.026,.070-.095,.446)
 assert pg.locator('#cable').inner_text()=='Unplug DB25','3D rearward face of front connector should reconnect'
 click_model('rear',.024,.034-.095,.393)
 pg.locator('#run').click();assert 'Turn on instrument power.' in pg.locator('#rx-status').inner_text()
 pg.locator('#power').click();pg.locator('[data-lead=RE]').click();pg.locator('#run').click();assert 'Open RE' in pg.locator('#rx-status').inner_text();pg.locator('[data-lead=RE]').click()
 pg.locator('[name=fLo]').fill('159.154943091895');pg.locator('[name=fHi]').fill('159.154943091895');pg.locator('#run').click()
 assert '707.107 Ω, -45°' in pg.locator('#rx-result').inner_text()
 def download(k):
  with pg.expect_download() as pending:pg.locator('#'+k).click()
  return pending.value.path().read_text()
 eis=json.loads(download('json'));assert eis['contacts']['RE']=='RC-LO' and abs(eis['points'][0]['magnitudeOhm']-707.106781186548)<1e-8
 pg.locator('#presetEis').click();pg.locator('#run').click();assert 'Rp 1000 Ω, C 1 µF' in pg.locator('#rx-result').inner_text()
 pg.locator('[name=currentRangeA]').fill('.001');pg.locator('#run').click();assert 'All 81 readings overloaded' in pg.locator('#rx-result').inner_text()
 pg.locator('#presetCv').click();pg.locator('#run').click();assert 'Current -0.22 to 0.22 µA' in pg.locator('#rx-result').inner_text()
 assert len(download('csv').splitlines())==82
 wave=json.loads(download('wave'));assert wave['schema']=='bts.analog-waveform.v1' and abs(wave['dtS']-.1)<1e-12 and wave['channels'][0]['samples'][0]==-.2
 for view in ['bench','front','rear','side','work']:
  pg.locator('[data-view='+view+']').click();pg.wait_for_timeout(250)
  if '--refs' in sys.argv and view!='bench':
   im=Image.open(io.BytesIO(g.screenshot()));im.thumbnail((720,440));im.save(out/(view+'.webp'),quality=86)
 pg.set_viewport_size({'width':390,'height':844});pg.locator('#presetCv').click();pg.locator('#run').click();assert 'Current -0.22 to 0.22 µA' in pg.locator('#rx-result').inner_text()
 assert pg.locator('.rx-grid').evaluate('(n)=>n.getBoundingClientRect().width<=window.innerWidth')
 assert not errs,errs
 print(json.dumps({'origin':base,'model':'GLB loaded; 3D DB25 plug disconnect/reconnect, rear power rocker and view controls operated','EIS':'707.107 Ω at −45°; nominal fit recovered Rp 1000 Ω and C 1 µF','CV':'±0.22 µA for 2.2 µF and 0.1 V/s','failure':'open reference, unplugged DB25, off and all-overloaded EIS checked','downloads':['EIS JSON','CV CSV','CV waveform JSON'],'mobile':'390 px verified','physicalXR':'unverified','errors':errs},indent=2));b.close()
