// Original Thorlabs SDPM7590 + B7590A outline. Metric; no manufacturer mesh redistributed.
export const assets=[];
export const surface=.782;
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const cy=(g,m,p,r,h,axis='y',n=24,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const W=1.1115,D=.9615,wy=.05;
for(const z of [-1,1]){
 ch('frame','charcoal',[0,.751,z*(D/2-wy/2)],[W,.054,wy],.006,.99);
 b('frame','trimgrey',[0,.755,z*(D/2-.004)],[W-.024,.011,.002]);
 for(const x of [-.515,.515])for(let i=0;i<2;i++)cy('frame','bolt',[x,.781,z*(D/2-.023)+i*.012],.004,.002,'y',12);
}
for(const x of [-1,1]){
 ch('frame','charcoal',[x*(W/2-wy/2),.751,0],[wy,.054,D-2*wy+.004],.005,.98);
 b('frame','framedark',[x*(W/2-.017),.699,0],[.032,.043,.807]);
}
b('frame','framedark',[0,.711,-.390],[.942,.049,.044]);
for(const x of [-.473,.473])for(const z of [-.405,.405]){
 cy('legs','charcoal',[x,.402,z],.062,.606,'y',28);
 cy('legs','trimgrey',[x,.698,z],.064,.075,'y',26);
 cy('legs','framedark',[x,.109,z],.057,.103);
 cy('legs','charcoal',[x,.126,z],.065,.024);
 ch('legs','framedark',[x,.699,z],[.165,.041,.144],.014);
 const out=x+Math.sign(x)*.026;
 cy('casters','rubber',[out,.038,z],.038,.029,'x',26);
 cy('casters','trimgrey',[out,.038,z],.022,.034,'x',26);
 b('casters','charcoal',[out,.077,z],[.026,.060,.063]);
 cy('casters','steel',[x-Math.sign(x)*.033,.052,z+.029],.011,.073);
 cy('casters','rubber',[x-Math.sign(x)*.033,.010,z+.029],.025,.020);
 b('casters','ink',[out,.081,z+.029],[.038,.009,.038]);
}
for(const x of [-.434,.434])for(const z of [-.352,.352]){
 ch('supports','framedark',[x,.702,z],[.093,.030,.077],.008);
 cy('supports','rubber',[x,.723,z],.032,.012,'y',20);
}
// A non-functional faceplate, no cabling, hydraulics or control surfaces are interactive.
ch('inactive_panel','framedark',[.348,.718,.472],[.117,.030,.015],.004);
b('inactive_panel','ink',[.334,.718,.480],[.052,.017,.001]);
cy('inactive_panel','red',[.385,.718,.483],.009,.008,'z',20);
// Body and real octagonal top perforations; they are visual recesses, not thread geometry.
b('breadboard','boarddark',[0,surface-.0317,0],[.900,.0566,.750]);
b('breadboard','steel',[0,surface-.059,0],[.900,.002,.750]);
for(let j=0;j<30;j++)for(let i=0;i<36;i++)assets.push({g:'breadboard',m:'steel',t:'tile',p:[(-437.5+25*i)/1000,surface,(-362.5+25*j)/1000],pitch:.025,r:.003});
// Original nonfunctional inspection blocks. Props are centered on their hole anchors.
const ax=-.1375,bx=-.0375,z=-.0125;
ch('mount_A','dullgold',[ax,surface+.009,z],[.080,.018,.060],.006);
cy('mount_A','dullgold',[ax,surface+.0265,z],.011,.017);
cy('mount_A','gold',[ax,surface+.032,z],.005,.005,'y',14);
for(const x of [-.028,.028])cy('mount_A','framedark',[ax+x,surface+.0188,z],.0036,.0014,'y',12);
ch('mount_B','teal',[bx,surface+.008,z],[.070,.016,.050],.006);
ch('mount_B','teallite',[bx,surface+.022,z],[.043,.016,.027],.004);
for(const x of [-.024,.024])cy('mount_B','framedark',[bx+x,surface+.0168,z],.0035,.0014,'y',12);
export const anchors={
 breadboard:{at:[0,surface,0],extent:[.900,.060,.750],action:'grid',label:'Snap selected dry mount to nearest breadboard hole'},
 mount_A:{at:[ax,surface,z],extent:[.080,.035,.060],action:'select:A',label:'Select dry mount A, brass'},
 mount_B:{at:[bx,surface,z],extent:[.070,.030,.050],action:'select:B',label:'Select dry mount B, teal'},
 frame:{at:[0,.751,0],extent:[W,.076,D],label:'Fixed documentary SDPM7590 frame'}
};
