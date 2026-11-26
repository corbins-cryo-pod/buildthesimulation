// PELCO easiGlow 91000 standalone exterior at published nominal W305×D292×H230 mm.
// The tinted fixed bell is a documentary silhouette only. No source, holder, outlet plumbing, or internals.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=28,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.106,Z=-.003;
ch('cabinet','ink',[X,.018,Z],[.296,.020,.281],.006,.98);
ch('cabinet','enamel',[X,.058,Z],[.305,.069,.292],.009,.97);
b('cabinet','silver',[X,.028,.143],[.293,.010,.003]);
for(const x of [X-.112,X+.112])for(const z of [-.104,.104])c('feet','rubber',[x,.004,z],.012,.008,'y',16);
const bx=X-.059,bz=-.047;
c('fixed_bell','gray',[bx,.094,bz],.067,.013,'y',48);
c('fixed_bell','silver',[bx,.105,bz],.061,.010,'y',48,.81);
c('fixed_bell','red',[bx,.114,bz],.059,.004,'y',48,.93);
c('glass_bell','glass',[bx,.164,bz],.060,.100,'y',64,.95);
c('fixed_bell','enamel',[bx,.218,bz],.0605,.023,'y',64);
c('fixed_bell','silver',[bx,.229,bz],.053,.002,'y',56);
ch('inactive_panel','rubber',[X+.074,.095,.085],[.090,.014,.081],.006);
b('inactive_panel','glass',[X+.074,.103,.084],[.077,.003,.060]);
b('inactive_panel','display',[X+.074,.101,.082],[.068,.0013,.050]);
for(const x of [X+.044,X+.059,X+.074,X+.089,X+.104])b('inactive_panel','slate',[x,.101,.114],[.011,.003,.008]);
b('inactive_panel','blue',[X-.091,.095,.113],[.075,.002,.021]);
b('inactive_panel','gray',[X-.100,.095,.081],[.022,.002,.017]);
for(const x of [-.016,.011,.034])b('cabinet','gray',[X+x,.035,-.151],[.016,.019,.003]);
ch('desk','slate',[.213,.021,.042],[.297,.040,.214],.012,.96);
for(const x of [.094,.333])for(const z of [-.044,.128])b('desk','rubber',[x,.003,z],[.023,.006,.024]);
for(const [key,x,col] of [['A',.135,'blue'],['B',.212,'slate']]){
 b('card_'+key,'enamel',[x,.048,.06],[.042,.004,.028]);
 b('card_'+key,col,[x,.0505,.06],[.037,.001,.023]);}
b('card_A','silver',[.133,.0512,.067],[.018,.0010,.002]);b('card_A','silver',[.128,.0512,.064],[.002,.0010,.008]);
b('card_B','silver',[.212,.0512,.060],[.024,.0010,.002]);b('card_B','silver',[.212,.0512,.060],[.002,.0010,.016]);
b('review_key','rubber',[.308,.048,.061],[.054,.019,.045]);b('review_key','lamp',[.308,.061,.061],[.044,.010,.037]);
export const anchors={
 card_A:{at:[.135,.05,.06],extent:[.042,.007,.028],action:'card:A',label:'Select independent original card A'},
 card_B:{at:[.212,.05,.06],extent:[.042,.007,.028],action:'card:B',label:'Select independent original card B'},
 review_key:{at:[.308,.06,.061],extent:[.054,.027,.045],action:'add',label:'Append the current documentary tag'},
 inactive_panel:{at:[X+.074,.103,.084],extent:[.09,.013,.081],label:'No device interaction'},
 fixed_bell:{at:[bx,.164,bz],extent:[.134,.132,.134],label:'Fixed exterior bell silhouette'}
};
