// ECHO CellCyte Gen 2 dormant exterior, based on supplied front and dimensioned perspective views.
// Nominal width 495.3 mm, depth 406.4 mm, height 320.04 mm. No plate carriers, cameras or internals.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const X=-.218,Z=-.013;
const fw=.4953,fd=.4064,H=.32004;
b('frame','silver',[X,.125,Z],[fw,.021,fd]);
for(const x of [X-fw/2+.009,X+fw/2-.009]){
 for(const z of [Z-fd/2+.010,Z+fd/2-.010]){
   b('frame','silver',[x,.068,z],[.018,.136,.020]);
   b('frame','rubber',[x,.003,z],[.017,.006,.018]);}
 b('frame','steel',[x,.131,Z],[.015,.024,fd-.010]);
 b('rear_arch','ink',[x,.228,Z-fd/2+.014],[.016,.163,.026]);}
ch('fixed_deck','ink',[X,.147,Z+.003],[fw-.036,.023,fd-.032],.004,.97);
b('fixed_deck','slate',[X,.161,Z+.003],[fw-.058,.006,fd-.067]);
b('fixed_deck','gray',[X,.165,Z],[fw-.080,.003,fd-.090]);
b('fixed_deck','slate',[X,.165,Z+.179],[fw-.052,.003,.009]);
b('rear_arch','ink',[X,.29402,Z-fd/2+.022],[fw-.010,.05204,.044]);
b('rear_arch','gray',[X,.296,Z-fd/2+.046],[fw-.035,.037,.004]);
b('rear_arch','steel',[X,.314,Z-fd/2+.028],[fw-.030,.004,.044]);
b('rear_arch','ink',[X,.204,Z-fd/2+.022],[fw-.021,.026,.043]);
ch('under_deck','ink',[X-.134,.063,Z-.024],[.163,.120,.241],.006);
b('under_deck','slate',[X-.128,.068,Z+.098],[.151,.092,.006]);
for(let j=0;j<5;j++)b('under_deck','rubber',[X-.167+j*.019,.079,Z+.102],[.008,.023,.003]);
b('under_deck','ink',[X+.061,.023,Z+.127],[.234,.032,.097]);
// Detached indicator desk is invented and carries the only actions.
ch('desk','slate',[.256,.034,.041],[.321,.060,.298],.019,.96);
for(const x of [.119,.391])for(const z of [-.073,.148])b('desk','rubber',[x,.004,z],[.023,.008,.019]);
b('desk','steel',[.255,.139,-.027],[.025,.178,.020]);b('desk','ink',[.255,.068,-.023],[.103,.012,.104]);
ch('drawing_display','ink',[.255,.260,-.027],[.274,.187,.028],.009);
b('drawing_display','display',[.255,.261,-.009],[.256,.167,.005]);
for(const [n,x,col] of [['complete',.175,'lime'],['cropped',.255,'lamp'],['blank',.335,'silver']]){
 b('select_'+n,'rubber',[x,.072,.145],[.060,.027,.063]);b('select_'+n,col,[x,.089,.145],[.049,.010,.052]);}
export const anchors={
 drawing_display:{at:[.255,.261,-.009],extent:[.274,.187,.035],action:'view',label:'Read current locked geometric image'},
 ...Object.fromEntries([['complete',.175],['cropped',.255],['blank',.335]].map(([n,x])=>['select_'+n,{at:[x,.089,.145],extent:[.060,.036,.063],action:'select:'+n,label:'Show '+n+' locked raster'}])),
 fixed_deck:{at:[X,.147,Z],extent:[.4593,.038,.3744],label:'Blank exterior surface, no interaction'}
};
