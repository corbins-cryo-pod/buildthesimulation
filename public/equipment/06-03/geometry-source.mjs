// Original dormant LUMEN X Gen 3 exterior. Nominal 414 × 373 × 451 mm; no internal equipment.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=26,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.132,Z=-.015;
ch('base','ink',[X,.106,Z],[.414,.184,.373],.025,.932);
ch('base','slate',[X,.190,Z],[.404,.020,.357],.024,.96);
for(const x of [X-.151,X+.151])for(const z of [Z-.125,Z+.125])b('feet','rubber',[x,.013,z],[.045,.026,.048]);
ch('inactive_fascia','gray',[X+.026,.109,Z+.184],[.302,.150,.006],.014);
b('inactive_fascia','ink',[X+.027,.106,Z+.187],[.250,.129,.003]);
b('base','blue',[X,.185,Z+.187],[.375,.005,.003]);
b('inactive_fascia','ink',[X-.154,.063,Z+.187],[.027,.033,.003]);
b('inactive_fascia','slate',[X-.156,.064,Z+.189],[.015,.013,.003]);
for(let j=0;j<7;j++)b('base','rubber',[X-.127+j*.033,.072,Z-.188],[.021,.005,.004]);
const U=X+.065,HZ=Z-.036;
ch('fixed_amber','amber',[U,.324,HZ],[.224,.253,.243],.012,1.075);
ch('fixed_amber','gold',[U,.445,HZ],[.227,.011,.246],.011,1);
b('fixed_amber','amberShade',[U,.325,HZ+.123],[.205,.230,.004]);
b('fixed_amber','gold',[U-.106,.322,HZ+.125],[.006,.235,.004]);
b('fixed_amber','gold',[U+.105,.322,HZ+.125],[.005,.235,.004]);
b('fixed_amber','ink',[U,.198,HZ],[.220,.006,.245]);
ch('desk','slate',[.277,.026,.044],[.310,.049,.234],.017,.96);
for(const x of [.150,.406])for(const z of [-.036,.130])b('desk','rubber',[x,.005,z],[.022,.010,.028]);
ch('diagram_display','ink',[.276,.139,.003],[.216,.125,.031],.009,.97);
b('diagram_display','display',[.276,.139,.022],[.198,.105,.005]);
b('desk','steel',[.276,.084,.001],[.023,.056,.027]);b('desk','ink',[.276,.054,.005],[.107,.013,.083]);
for(const [n,x,col] of [['P-01',.209,'lime'],['P-02',.276,'lamp'],['P-03',.343,'silver']]){
 b('point_'+n,'rubber',[x,.065,.117],[.049,.026,.051]);b('point_'+n,col,[x,.080,.117],[.037,.009,.041]);}
export const anchors={
 diagram_display:{at:[.276,.139,.022],extent:[.216,.125,.035],action:'view',label:'Read the detached diagram point'},
 ...Object.fromEntries([['P-01',.209],['P-02',.276],['P-03',.343]].map(([n,x])=>['point_'+n,{at:[x,.077,.117],extent:[.049,.030,.051],action:'select:'+n,label:'Read abstract point '+n}])),
 fixed_amber:{at:[U,.324,HZ],extent:[.224,.253,.243],label:'Dormant fixed opaque amber enclosure'}
};
