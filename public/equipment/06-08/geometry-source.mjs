// Original unconnected Fluigent Flow EZ documentary shape.
// Published hardware L × W × H 91.9 × 71.8 × 131 mm. No physical connection geometry/functions.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const rd=(g,m,p,d,r)=>assets.push({g,m,p,d,r,t:'roundXY'});
const c=(g,m,p,r,h,axis='y',n=28,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.058,Z=-.012;
rd('body','caseblue',[X,.0655,Z-.0045],[.0718,.131,.0829],.007);
rd('body','blue',[X,.0655,Z+.034],[.0714,.129,.013],.007);
for(const x of [X-.0285,X+.0285])rd('side_trim','caseblue',[x,.0655,Z+.0399],[.0092,.129,.0015],.0039);
rd('upper_inset','silver',[X,.124,Z+.041],[.052,.012,.0022],.0024);
rd('inactive_inset','caseblue',[X,.088,Z+.041],[.051,.061,.0027],.0035);
rd('inactive_inset','display',[X,.087,Z+.0427],[.038,.029,.0015],.0018);
rd('inactive_inset','slate',[X,.107,Z+.0421],[.046,.005,.0011],.0018);
rd('lower_inset','silver',[X,.030,Z+.041],[.051,.052,.0025],.004);
c('fixed_front_cap','silver',[X,.034,Z+.0444],.020,.0031,'z',48);
c('fixed_front_cap','enamel',[X,.034,Z+.0454],.0185,.0011,'z',48);
for(const x of [X-.0335,X+.0335])b('side_trim','caseblue',[x,.064,Z-.006],[.0027,.100,.056]);
for(const x of [X-.024,X+.024])for(const z of [Z-.032,Z+.026])b('feet','rubber',[x,.0015,z],[.012,.003,.010]);
// The desk intentionally sits apart from the instrument and only reads drawings.
ch('desk','slate',[.109,.014,.026],[.182,.027,.142],.013,.97);
for(const x of [.037,.181])for(const z of [-.021,.075])b('desk','rubber',[x,.002,z],[.018,.004,.015]);
b('desk','steel',[.107,.050,.007],[.017,.050,.018]);b('desk','ink',[.108,.031,.006],[.064,.008,.058]);
rd('drawing_display','ink',[.108,.088,.015],[.136,.081,.016],.007);
rd('drawing_display','display',[.108,.088,.024],[.124,.069,.003],.0024);
for(const [n,x,m] of [['roomy',.062,'lime'],['narrow',.108,'lamp'],['tangent',.155,'silver']]){
 b('select_'+n,'rubber',[x,.035,.073],[.032,.016,.032]);b('select_'+n,m,[x,.044,.073],[.026,.006,.026]);}
export const anchors={
 drawing_display:{at:[.108,.088,.024],extent:[.136,.081,.020],action:'view',label:'Read the detached comparison frame'},
 ...Object.fromEntries([['roomy',.062],['narrow',.108],['tangent',.155]].map(([n,x])=>['select_'+n,{at:[x,.044,.073],extent:[.032,.018,.032],action:'select:'+n,label:'Select '+n+' immutable drawing'}])),
 fixed_front_cap:{at:[X,.034,Z+.044],extent:[.04,.04,.004],label:'Static documentary cap'},
 inactive_inset:{at:[X,.088,Z+.041],extent:[.051,.061,.003],label:'Blank unconnected exterior face'}
};
