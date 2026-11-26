// Illustrative metric GeminiSEM 560 / Gemini 3 exterior; dimensions not measured or vendor certified.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=28,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.41,Z=-.052;
ch('floor_cabinet','enamel',[X,.385,Z],[.887,.735,.761],.023,.96);
b('floor_cabinet','silver',[X,.736,Z],[.911,.023,.781]);ch('floor_cabinet','enamel',[X,.759,Z],[.911,.038,.781],.019);
b('floor_cabinet','steel',[X,.401,.333],[.853,.641,.010]);for(const x of [X-.214,X+.214])b('floor_cabinet','enamel',[x,.403,.339],[.415,.620,.007]);
for(const x of [X-.095,X+.095])b('floor_cabinet','gray',[x,.568,.345],[.035,.073,.006]);
for(let i=0;i<8;i++)b('floor_cabinet','silver',[X+.20,.218+i*.019,.345],[.221,.005,.004]);
for(const x of [X-.38,X+.38])for(const z of [-.35,.246])b('floor_cabinet','rubber',[x,.013,z],[.078,.026,.087]);
ch('lower_body','enamel',[X,.899,Z],[.539,.246,.425],.029,.96);
c('lower_body','steel',[X,1.032,Z],.205,.048,'y',44);
c('lower_body','enamel',[X,1.088,Z],.170,.089,'y',44);
ch('fixed_chamber','enamel',[X,.929,.185],[.365,.273,.194],.025,.97);
b('fixed_chamber','gray',[X-.148,.931,.286],[.019,.197,.008]);b('fixed_chamber','slate',[X,.941,.287],[.222,.137,.008]);
b('fixed_chamber','enamel',[X,.941,.291],[.197,.116,.007]);b('fixed_chamber','blue',[X+.054,.942,.296],[.060,.058,.005]);
b('fixed_chamber','silver',[X-.062,.861,.300],[.096,.015,.011]);
c('column','steel',[X,1.166,Z],.130,.061,'y',44);
ch('column','enamel',[X,1.342,Z],[.247,.310,.270],.026,.97);
c('column','enamel',[X,1.630,Z],.135,.332,'y',48);
c('column','silver',[X,1.793,Z],.132,.009,'y',48);
b('column','blue',[X-.059,1.701,.087],[.040,.047,.006]);b('column','slate',[X-.055,1.605,.086],[.069,.014,.004]);
c('cosmetic_side','silver',[X-.263,1.119,Z-.019],.074,.092,'x',36);
c('cosmetic_side','blue',[X-.303,1.119,Z-.019],.065,.036,'x',32);
c('cosmetic_side','steel',[X+.251,1.142,Z-.040],.069,.081,'x',36);
c('cosmetic_side','blue',[X+.281,1.142,Z-.040],.060,.038,'x',32);
ch('cosmetic_side','enamel',[X+.232,.951,.094],[.108,.151,.096],.012);
ch('worktable','gray',[.55,.735,.012],[.881,.048,.601],.017,.96);
b('worktable','enamel',[.55,.761,.012],[.88,.011,.599]);
for(const x of [.159,.942])for(const z of [-.229,.242])b('worktable','steel',[x,.368,z],[.036,.736,.036]);
for(const [x,w,k] of [[.34,.317,'viewer_screen'],[.695,.319,'secondary_screen']]){
 b(k,'ink',[x,1.006,-.075],[w,.202,.042]);b(k,'display',[x,1.010,-.052],[w-.019,.177,.004]);
 b('monitor_stands','steel',[x,.846,-.078],[.024,.146,.028]);b('monitor_stands','ink',[x,.773,-.074],[.116,.013,.115]);}
b('keyboard','ink',[.395,.775,.166],[.297,.016,.093]);
for(let y=0;y<4;y++)for(let x=0;x<11;x++)b('keyboard','gray',[.273+x*.024,.785,.134+y*.018],[.016,.005,.011]);
b('compare_button','rubber',[.702,.785,.193],[.085,.024,.069]);b('compare_button','lamp',[.702,.802,.193],[.068,.012,.052]);
export const anchors={
 viewer_screen:{at:[.34,1.010,-.052],extent:[.317,.202,.042],action:'view',label:'Read the selected locked grating'},
 compare_button:{at:[.702,.797,.193],extent:[.085,.035,.069],action:'toggle',label:'Switch the locked stock reference'},
 fixed_chamber:{at:[X,.929,.185],extent:[.365,.273,.213],label:'Fixed closed exterior; no action'}
};
