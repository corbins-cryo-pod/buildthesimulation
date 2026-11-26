// Original Discovery.V12 visual ensemble based on ZEISS photograph and selected catalog optics.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=28,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
ch('base','enamel',[0,.022,.025],[.304,.036,.260],.021,.95);
ch('base','steel',[0,.039,.024],[.300,.010,.250],.021,.95);
ch('stage','ink',[0,.050,.075],[.181,.014,.136],.013,.92);
c('stage','silver',[0,.057,.079],.041,.007,'y',40,.84);
c('stage','gray',[0,.058,.079],.035,.006,'y',40);
b('column','steel',[0,.215,-.069],[.059,.349,.048]);
b('column','blue',[-.024,.207,-.046],[.025,.332,.007]);
for(const y of [.112,.168,.222,.276])b('column','silver',[.017,y,-.042],[.006,.028,.008]);
ch('carriage','ink',[0,.233,-.018],[.116,.062,.099],.009);
ch('zoom_body','enamel',[0,.236,.045],[.103,.127,.082],.014);
ch('zoom_body','silver',[0,.175,.052],[.092,.012,.073],.010);
c('zoom_body','steel',[0,.167,.079],.038,.012,'y',48);
c('objective','ink',[0,.158,.079],.031,.031,'y',42);
c('objective','steel',[0,.178,.079],.035,.014,'y',44);
c('objective','ink',[0,.134,.079],.028,.024,'y',44);
c('objective','blue',[0,.134,.079],.0285,.003,'y',44,.94);
c('objective','ink',[0,.126,.079],.022,.006,'y',44,.77);
c('objective','display',[0,.128,.079],.016,.003,'y',36);
c('focus_collar','blue',[-.077,.226,.043],.023,.026,'x',32);
c('focus_collar','blue',[-.096,.226,.043],.016,.024,'x',32);
ch('binocular','enamel',[0,.309,.065],[.103,.053,.082],.009,.96);
b('binocular','silver',[0,.342,.016],[.064,.021,.041]);
b('binocular','blue',[-.025,.342,.011],[.027,.022,.035]);
for(const x of [-.032,.032]){
 c('oculars','steel',[x,.315,.101],.022,.024,'ocular',40);
 c('oculars','rubber',[x,.331,.118],.019,.030,'ocular',42,.61);
 c('oculars','ink',[x,.338,.130],.017,.010,'ocular',42,.64);
 c('oculars','display',[x,.337,.129],.010,.004,'ocular',36);}
ch('aux_control','silver',[.090,.221,.070],[.068,.061,.044],.005);
b('aux_control','ink',[.091,.234,.093],[.048,.014,.004]);
for(const x of [.073,.089,.105])c('zoom_control',x===.089?'blue':'ink',[x,.213,.095],.005,.004,'z',20);
for(const x of [-.124,.124])for(const z of [-.055,.101])b('feet','rubber',[x,.003,z],[.023,.006,.026]);
b('ruler','blue',[0,.062,.079],[.014,.002,.010]);
for(let i=-6;i<=6;i++)b('ruler','steel',[i*.001,.0632,.079],[.0001,.00014,.009]);
for(let j=-4;j<=4;j++)b('ruler','steel',[0,.0632,.079+j*.001],[.013,.00014,.0001]);
c('fiducial','gold',[.002,.064,.0805],.0006,.002,'y',18);
export const anchors={
 zoom_control:{at:[.089,.214,.094],extent:[.043,.014,.009],action:'cycle',label:'Cycle virtual zoom settings'},
 oculars:{at:[0,.333,.122],extent:[.103,.051,.062],action:'view',label:'Read ideal binocular image pair'},
 ruler:{at:[0,.062,.079],extent:[.014,.005,.010],action:'center',label:'Set pointer at inert ruler origin'},
 focus_collar:{at:[-.084,.226,.043],extent:[.050,.048,.047],label:'Fixed outline of the focus collar'}
};
