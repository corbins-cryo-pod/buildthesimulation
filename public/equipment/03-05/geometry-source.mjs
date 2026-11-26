// Original illustrative metric exterior from CIC nanoGUNE photo; dimensions are inferred.
// The freestanding dry gauge is not a Savannah accessory.
export const assets=[], gauge=[.421,.752,.134];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=32,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
ch('cabinet','steel',[-.18,.436,0],[.467,.798,.483],.017,.97);
ch('cabinet_top','silver',[-.18,.840,0],[.485,.045,.493],.019,.97);
b('cabinet_face','rubber',[-.18,.426,.244],[.435,.733,.006]);b('cabinet_face','steel',[-.18,.429,.250],[.414,.709,.009]);
c('fixed_handle','ink',[-.025,.469,.259],.025,.016,'z',20);c('fixed_handle','gray',[-.025,.469,.268],.008,.003,'z',16);
for(const x of [-.37,.01])for(const z of [-.17,.17])b('feet','ink',[x,.02,z],[.038,.036,.052]);
c('chamber_witness','silver',[-.18,.884,-.021],.110,.038,'y',48);
c('chamber_witness','steel',[-.18,.932,-.021],.103,.055,'y',48);
c('chamber_witness','silver',[-.18,.966,-.021],.109,.022,'y',48);
c('chamber_witness','steel',[-.18,.98,-.021],.078,.011,'y',48);
b('chamber_witness','rubber',[-.177,.995,-.024],[.051,.017,.019]);
const y0=.866,r=.179;
for(const y of [.891,.926,.961,.996,1.018])c('fixed_guard','silver',[-.18,y,-.021],r,.0039,'y',60,.981);
for(let i=0;i<12;i++){const a=i*Math.PI/6; c('fixed_guard','steel',[-.18+(r-.002)*Math.cos(a),.944,-.021+(r-.002)*Math.sin(a)],.0033,.155,'y',12);}
b('warning_marker','lamp',[-.377,.866,.197],[.036,.003,.031]);
b('warning_marker','ink',[-.377,.868,.197],[.012,.003,.013]);
ch('witness_bench','gray',[.421,.724,.05],[.295,.037,.336],.018,.94);
for(const x of [.311,.531])for(const z of [-.08,.18]){b('witness_bench','blue',[x,.353,z],[.036,.707,.041]);b('witness_bench','ink',[x,.010,z],[.057,.02,.055]);}
b('witness_bench','blue',[.421,.29,-.080],[.238,.034,.037]);
c('dry_gauge','ink',[gauge[0],gauge[1],gauge[2]],.078,.013,'y',48);
c('dry_gauge','silver',[gauge[0],gauge[1]+.011,gauge[2]],.070,.013,'y',52,.8);
c('dry_gauge','slate',[gauge[0],gauge[1]+.006,gauge[2]],.056,.004,'y',48);
for(const a of [-1,1]){b('dry_gauge','lamp',[gauge[0]+a*.071,gauge[1]+.01,gauge[2]],[.006,.003,.010]);b('dry_gauge','lamp',[gauge[0],gauge[1]+.01,gauge[2]+a*.071],[.010,.003,.006]);}
c('dummy','gold',[gauge[0]+.003,gauge[1]+.022,gauge[2]+.004],.05,.005,'y',48);
b('inspect_button','rubber',[.508,.752,.031],[.064,.023,.061]);c('inspect_button','lamp',[.508,.770,.031],.018,.015,'y',20);
export const anchors={
 dry_gauge:{at:[...gauge],extent:[.156,.025,.156],action:'place',label:'Position or remove a dry external dummy'},
 dummy:{at:[gauge[0]+.003,gauge[1]+.022,gauge[2]+.004],extent:[.100,.005,.100],action:'check',label:'Evaluate planar circular clearance'},
 inspect_button:{at:[.508,.761,.031],extent:[.064,.032,.061],action:'check',label:'Read the dry gauge only'},
 fixed_handle:{at:[-.025,.469,.259],extent:[.050,.050,.021],label:'Decorative fixed door handle'}
};
