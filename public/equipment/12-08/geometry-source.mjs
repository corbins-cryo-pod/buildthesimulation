// ZEISS published approximate envelopes. Original static box surfaces; no working optics or cabinet access.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=20)=>assets.push({g,m,p,r,h,axis,n,ratio:0,t:'cyl'});
ch('table','gray',[0,.795,0],[.900,.070,.750],.019,.98);
b('table','steel',[0,.826,0],[.892,.008,.742]);
for(const x of [-.395,.395])for(const z of [-.317,.317]){
 b('table','ink',[x,.379,z],[.060,.756,.062]);b('table','rubber',[x,.013,z],[.083,.026,.087]);}
b('table','ink',[0,.707,-.315],[.736,.052,.055]);for(const x of [-.395,.395])b('table','ink',[x,.127,0],[.046,.06,.60]);
ch('closed_rack','ink',[-.05,.322,-.006],[.550,.600,.740],.013,.98);
b('closed_rack','slate',[-.05,.352,.365],[.512,.469,.014]);
for(let i=0;i<10;i++)for(const x of [-.157,.055])b('closed_rack','rubber',[x,.205+i*.028,.375],[.166,.006,.006]);
const X=-.11,Y=.83,Z=-.065;
ch('baseplate','silver',[X,.84,Z],[.594,.020,.422],.014,.98);
for(const x of [-.365,.143])for(const z of [-.241,.09])c('baseplate','rubber',[x,.854,z],.019,.013,'y',16);
ch('shell','enamel',[X,.936,Z],[.600,.156,.425],.017,.98);
b('shell','silver',[X,.937,.149],[.554,.105,.005]);
b('shell','gray',[-.374,.922,.153],[.011,.037,.008]);b('shell','gray',[.154,.922,.153],[.011,.037,.008]);
ch('recess_shadow','ink',[X,1.054,Z],[.563,.112,.404],.017,.99);
ch('hood','enamel',[X,1.157,-.095],[.596,.106,.363],.020,.94);
ch('hood','enamel',[X,1.136,.044],[.469,.086,.217],.026,1.04);
b('hood','blue',[X,1.135,.155],[.028,.026,.004]);
b('recess_shadow','rubber',[X,1.080,.060],[.406,.039,.196]);
ch('recess_shadow','gray',[X,1.023,.108],[.501,.034,.172],.014,.99);
for(const x of [-.335,.127])b('shell','enamel',[x,1.061,-.151],[.082,.130,.241]);
for(let i=0;i<5;i++)b('shell','gray',[.067,1.031+i*.011,-.277],[.078,.003,.003]);
const mx=.322;
b('display_stand','steel',[mx,.891,.057],[.019,.118,.024]);b('display_stand','ink',[mx,.835,.065],[.101,.010,.110]);
ch('viewer_screen','ink',[mx,1.021,.056],[.225,.148,.027],.008);
b('viewer_screen','display',[mx,1.022,.071],[.207,.125,.003]);
b('viewer_keys','slate',[mx,.845,.236],[.214,.020,.085]);
for(const [name,x,col] of [['viewer_prev',.275,'silver'],['viewer_next',.365,'lamp']]){
 b(name,'rubber',[x,.861,.241],[.052,.018,.047]);b(name,col,[x,.872,.241],[.044,.007,.040]);}
export const anchors={
 viewer_screen:{at:[mx,1.021,.056],extent:[.225,.148,.033],action:'view',label:'Read the inert stored plane'},
 viewer_prev:{at:[.275,.862,.241],extent:[.052,.026,.047],action:'prev',label:'Previous stored plane'},
 viewer_next:{at:[.365,.862,.241],extent:[.052,.026,.047],action:'next',label:'Next stored plane'},
 shell:{at:[X,.936,Z],extent:[.600,.380,.425],label:'Sealed documentary exterior; no interaction'}
};
