// Original documentary exterior geometry, in meters. +Z is front. No physical operating components.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const Y=.79,X=-.262,Z=-.017;
ch('base_shell','enamel',[X,Y+.008,Z],[.203,.016,.210],.005,.975);
b('base_shell','silver',[X,Y+.115,Z-.081],[.184,.198,.037]);
ch('base_shell','ice',[X,Y+.208,Z-.078],[.184,.042,.044],.003);
b('base_shell','silver',[X,Y+.110,Z-.052],[.178,.187,.021]);
b('base_shell','enamel',[X,Y+.106,Z-.038],[.172,.168,.007]);
// Opaque, original cover occludes all access and operating geometry. Thin edges are estimated.
ch('opaque_cover','ice',[X,Y+.116,Z-.032],[.169,.183,.007],.003);
b('opaque_cover','pale',[X,Y+.119,Z-.027],[.160,.172,.003]);
b('opaque_cover','steel',[X,Y+.031,Z-.0244],[.155,.005,.002]);
for(const x of [X-.084,X+.084])b('base_shell','ice',[x,Y+.014,Z],[.003,.002,.189]);
// Separate nominal rectangular housing. The brochure does not establish its appearance.
const SX=-.022,SZ=-.069;
ch('nominal_housing','silver',[SX,Y+.057,SZ],[.241,.114,.241],.004,.985);
b('nominal_housing','enamel',[SX,Y+.093,SZ+.1195],[.222,.029,.002]);
b('nominal_housing','pale',[SX,Y+.011,SZ-.118],[.216,.014,.003]);
// Shared display stand and a physically and logically detached geometry desk.
ch('instrument_table','slate',[-.146,Y-.018,-.009],[.557,.036,.452],.014,.99);
for(const x of [-.387,.106])for(const z of [-.196,.173])b('instrument_table','gray',[x,(Y-.036)/2,z],[.039,Y-.036,.041]);
b('instrument_table','ink',[-.142,.185,-.196],[.501,.035,.040]);
const DX=.461;
ch('exhibit_desk','slate',[DX,Y-.020,.070],[.490,.040,.431],.015,.98);
for(const x of [.253,.672])for(const z of [-.104,.245])b('exhibit_desk','gray',[x,(Y-.04)/2,z],[.036,Y-.04,.038]);
b('exhibit_desk','ink',[DX,.188,-.104],[.434,.034,.039]);
b('exhibit_desk','steel',[DX,Y+.078,.029],[.026,.148,.028]);
ch('display','ink',[DX,Y+.215,.022],[.356,.223,.021],.010);
b('display','display',[DX,Y+.216,.034],[.329,.203,.004]);
for(const [k,x,c] of [['rectangle',DX-.106,'silver'],['notched',DX,'lime'],['flat',DX+.106,'lamp']]){
 ch('select_'+k,'ink',[x,Y+.011,.197],[.081,.022,.067],.005);
 ch('select_'+k,c,[x,Y+.029,.197],[.071,.015,.056],.005);
}
export const anchors={
 base_shell:{at:[X,Y,Z],extent:[.203,.229,.210],label:'Synthecon RCCS-4D nominal base shell; no action'},
 opaque_cover:{at:[X,Y+.117,Z-.029],extent:[.169,.185,.014],label:'Original fixed opaque cover; no action'},
 nominal_housing:{at:[SX,Y,SZ],extent:[.241,.114,.241],label:'Nominal separate housing; no action'},
 display:{at:[DX,Y+.215,.038],extent:[.356,.223,.027],action:'view',label:'Read the already selected immutable outline'},
 ...Object.fromEntries([['rectangle',DX-.106],['notched',DX],['flat',DX+.106]].map(([k,x])=>['select_'+k,{at:[x,Y+.029,.197],extent:[.081,.036,.067],action:'select:'+k,label:'Read '+k+' detached drawing'}]))
};
