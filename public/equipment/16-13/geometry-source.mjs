// Original metric connector geometry, intentionally not manufacturing CAD.
import {cablePoints} from './solver.mjs';
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const c=(g,m,p,r,h,n=24,ratio=0)=>assets.push({g,m,p,r,h,axis:'z',n,ratio,t:'cyl'});
const xOut=-.066,xIn=.066,y=.067;
b('panel','steel',[0,.049,-.036],[.223,.094,.096]);b('panel','ink',[0,.051,.014],[.217,.08,.01]);b('panel','enamel',[0,.057,.020],[.204,.066,.003]);
b('tray','blue',[0,.005,.066],[.244,.010,.227]);for(const x of [-.108,.108])for(const z of [-.052,.161])b('feet','rubber',[x,.003,z],[.017,.006,.014]);
for(const x of [-.095,.095])for(const a of [.033,.079])c('panel','bolt',[x,a,.022],.0023,.002,12);
function bncJack(g,x,y){c(g,'steel',[x,y,.023],.009,.004,16);c(g,'steel',[x,y,.0293],.0055,.010,28,.68);c(g,'enamel',[x,y,.0315],.0036,.005,24,.25);c(g,'gold',[x,y,.032],.0009,.004,12,.5);for(const d of [-1,1])b(g,'silver',[x+d*.0062,y,.031],[.003,.0021,.0024]);}
function bncPlug(g,x,y,z,reverse){
const p=q=>z+q*reverse;
c(g,'silver',[x,y,p(.002)],.00745,.014,28,.72);c(g,'steel',[x,y,p(.011)],.006,.010,28,.37);c(g,'enamel',[x,y,p(.004)],.00355,.005,24);c(g,'gold',[x,y,p(-.001)],.00075,.004,12);c(g,'steel',[x,y,p(.018)],.0042,.006,24);c(g,'rubber',[x,y,p(.023)],.0039,.012,20);for(let k=0;k<4;k++)c(g,'ink',[x,y,p(.020+k*.0018)],.00425,.0007,20);
}
bncJack('source_jack',xOut,y);bncJack('sink_bnc',xIn,y);bncPlug('source_plug',xOut,y,.030,1);bncPlug('receive_plug_bnc',xIn,y,.048,1);
assets.push({g:'bnc_lead',m:'blue',pts:cablePoints(30,false),r:.002,n:10,t:'tube'});
function smaPlug(g,x,y,z){c(g,'gold',[x,y,z],.004619,.0084,6,.58);c(g,'silver',[x,y,z+.005],.00325,.0053,20);c(g,'enamel',[x,y,z-.0029],.0024,.002,24);c(g,'gold',[x,y,z-.004],.00046,.0028,14);c(g,'ink',[x,y,z+.011],.002,.009,24);}
const sl=-.027;
c('sink_sma','gold',[sl,y,.0253],.0044,.007,6);c('sink_sma','gold',[sl,y,.032],.00317,.009,24,.7);
for(let k=0;k<5;k++)c('sink_sma','gold',[sl,y,.0287+k*.00145],.0034,.0006,24,.85);
c('sink_sma','enamel',[sl,y,.031],.00215,.004,20,.20);smaPlug('display_sma',sl,.031,.086);
function usbShell(g,x,y,z){for(const s of [-1,1]){b(g,'steel',[x+s*.0058,y,z],[.0004,.0045,.010]);b(g,'steel',[x,y+s*.00205,z],[.0116,.0004,.010]);}b(g,'ink',[x,y-.0011,z],[.0107,.0017,.009]);for(let k=0;k<4;k++)b(g,'gold',[x-.003+k*.002,y-.0001,z],[.00055,.00015,.004]);}
usbShell('sink_usb',.012,y,.025);usbShell('display_usb',.012,.031,.082);b('display_usb','rubber',[.012,.031,.094],[.017,.008,.015]);b('display_usb','ink',[.012,.031,.105],[.007,.005,.008]);
const fx=.041;
b('sink_ffc','slate',[fx,y,.023],[.006,.0034,.005]);b('sink_ffc','ink',[fx,y+.0014,.026],[.0052,.00065,.0015]);b('display_ffc','enamel',[fx,.031,.091],[.0035,.00042,.029]);
for(let k=0;k<6;k++)b('display_ffc','gold',[fx-.00125+k*.0005,.0313,.08],[.00025,.00015,.004]);
b('display_ffc','blue',[fx,.031,.103],[.0035,.00055,.005]);
for(const [x,g] of [[sl,'sma'],[.012,'usb'],[fx,'ffc']]){b('holders','steel',[x,.014,.088],[.019,.008,.025]);b('holders','ink',[x,.023,.091],[.013,.010,.017]);}
c('pulse_button','lamp',[xOut,.035,.024],.0065,.005,20);c('pulse_button','ink',[xOut,.035,.021],.008,.003,20);
export const anchors={
 receive_plug_bnc:{at:[xIn,y,.048],extent:[.016,.016,.048],action:'toggle',label:'Mate or unmate BNC lead',portId:'PANEL-BNC-IN-01'},
 sink_bnc:{at:[xIn,y,.028],extent:[.018,.018,.017],action:'sink:BNC',label:'Select BNC jack',portId:'PANEL-BNC-IN-01'},
 sink_sma:{at:[sl,y,.028],extent:[.010,.010,.016],action:'sink:SMA',label:'Select SMA witness',portId:'PANEL-SMA-WITNESS'},
 sink_usb:{at:[.012,y,.025],extent:[.014,.006,.012],action:'sink:USB',label:'Select USB-A witness',portId:'PANEL-USB-A-WITNESS'},
 sink_ffc:{at:[fx,y,.024],extent:[.007,.005,.008],action:'sink:FFC',label:'Select FFC witness',portId:'PANEL-FFC-WITNESS'},
 display_sma:{at:[sl,.031,.086],extent:[.010,.010,.025],action:'plug:SMA',label:'Select SMA candidate'},
 display_usb:{at:[.012,.031,.082],extent:[.018,.009,.028],action:'plug:USB',label:'Select USB-A candidate'},
 display_ffc:{at:[fx,.031,.091],extent:[.004,.002,.030],action:'plug:FFC',label:'Select FFC candidate'},
 pulse_button:{at:[xOut,.035,.022],extent:[.016,.016,.011],action:'pulse',label:'Route an ideal pulse'}
};
