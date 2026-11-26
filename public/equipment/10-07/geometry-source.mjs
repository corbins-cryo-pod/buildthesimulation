// Original Sutter MP-285/T family asset. Major component envelopes use catalog dimensions.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=28,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
ch('controller','ink',[-.165,.054,-.020],[.406,.096,.273],.007,.99);
b('controller','gray',[-.165,.055,.118],[.401,.079,.006]);
b('controller','display',[-.218,.062,.122],[.198,.047,.004]);
for(let j=0;j<4;j++)for(let k=0;k<4;k++)b('controller',k===3?'slate':'ink',[-.080+k*.020,.077-j*.014,.123],[.014,.009,.004]);
for(const x of [-.35,.012])b('controller','silver',[x,.050,.122],[.009,.068,.004]);
b('controller','steel',[-.22,.055,-.159],[.035,.023,.006]);
for(const q of [-.291,-.154,-.088])c('controller','gray',[q,.048,-.161],.011,.003,'z',20);
for(const x of [-.34,.01])for(const z of [-.13,.09])b('controller','rubber',[x,.005,z],[.024,.010,.029]);
const X=.120,Z=-.041;
b('stand','slate',[X,.0015,Z],[.126,.003,.167]);
b('stage_base','ink',[X,.012,Z],[.11,.020,.150]);
for(const x of [-.045,.045])b('stage_base','silver',[X+x,.027,Z],[.016,.008,.136]);
for(const x of [-.042,.042])for(const z of [-.059,.059])c('stage_base','bolt',[X+x,.025,Z+z],.004,.004,'y',14);
b('slide_x','ink',[X,.034,Z],[.102,.012,.112]);b('slide_x','steel',[X,.042,Z+.036],[.100,.009,.015]);
b('slide_xy','ink',[X-.002,.057,Z-.006],[.080,.024,.103]);
b('slide_xy','gray',[X-.029,.087,Z-.009],[.037,.072,.090]);
b('slide_xy','ink',[X-.042,.107,Z-.009],[.015,.091,.081]);
b('slide_xy','steel',[X-.036,.119,Z+.036],[.041,.042,.009]);c('slide_xy','silver',[X-.036,.119,Z+.045],.019,.016,'z',32);
c('slide_xy','bolt',[X-.036,.119,Z+.054],.008,.004,'z',22);
b('slide_z','ink',[X-.019,.129,Z-.003],[.041,.055,.054]);b('slide_z','silver',[X-.019,.149,Z+.023],[.038,.027,.007]);
for(const y of [.101,.136])b('slide_z','steel',[X+.011,y,Z],[.013,.006,.063]);
b('slide_z','rubber',[X+.025,.139,Z+.028],[.042,.030,.043]);
b('slide_z','steel',[.170,.126,.018],[.080,.012,.021]);b('slide_z','gold',[.210,.126,.018],[.005,.009,.016]);
b('sample_base','slate',[.226,.053,.028],[.066,.104,.062]);
b('sample_base','gray',[.219,.108,.016],[.033,.012,.033]);b('inert_cube','blue',[.219,.115,.016],[.022,.020,.022]);
ch('joystick','gray',[.024,.019,.160],[.114,.028,.101],.011,.96);
c('joystick','ink',[.015,.034,.166],.022,.010,'y',32);c('joy_xy','steel',[.015,.065,.166],.0063,.056,'y',24);c('joy_xy','rubber',[.015,.095,.166],.019,.014,'y',32);
for(const [g,x,z,col] of [['joy_x',.049,.176,'red'],['joy_y',.049,.149,'lime'],['joy_z',-.012,.129,'lamp']]){
 c(g,'rubber',[x,.031,z],.009,.006,'y',20);c(g,col,[x,.035,z],.0066,.005,'y',20);}
export const anchors={
 slide_x:{at:[X,.035,Z],extent:[.102,.021,.112],label:'Local X mover'},
 slide_xy:{at:[X,.078,Z],extent:[.102,.124,.127],label:'Local XY carriage'},
 slide_z:{at:[X,.126,Z],extent:[.188,.073,.109],label:'XYZ carriage with inert pointer'},
 controller:{at:[-.165,.055,.118],extent:[.406,.096,.273],label:'Original tabletop controller replica'},
 joy_xy:{at:[.015,.066,.166],extent:[.038,.070,.038],action:'move',label:'Apply requested virtual pose'},
 joy_x:{at:[.049,.035,.176],extent:[.018,.008,.018],action:'nudge:X',label:'Nudge local X by +1 mm'},
 joy_y:{at:[.049,.035,.149],extent:[.018,.008,.018],action:'nudge:Y',label:'Nudge local Y by +1 mm'},
 joy_z:{at:[-.012,.035,.129],extent:[.018,.008,.018],action:'nudge:Z',label:'Nudge local Z by +1 mm'}
};
