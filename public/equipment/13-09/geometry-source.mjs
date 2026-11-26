// Original Leica EM AFS2 documentary exterior. Inferred cabinet dimensions; no interior process hardware.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=28,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.28,Z=-.018;
assets.push({g:'afs2_shell',m:'enamel',p:[X,0,Z],t:'lathe',n:56,profile:[[.078,.248],[.112,.272],[.291,.280],[.426,.273],[.530,.263],[.597,.243],[.649,.211],[.694,.170],[.718,.165]]});
for(let i=0;i<9;i++)c('afs2_shell','silver',[X,.230+i*.016,Z],.281-i*.00052,.004,'y',52,.985);
c('afs2_shell','silver',[X,.123,Z],.275,.009,'y',56,.97);
c('afs2_shell','enamel',[X,.099,Z],.268,.036,'y',56);
for(const [x,z] of [[X-.17,.145],[X+.17,.145],[X-.17,-.183],[X+.17,-.183]]){
 b('casters','steel',[x,.067,z],[.037,.056,.041]);c('casters','rubber',[x,.031,z],.028,.025,'x',22);c('casters','silver',[x+.015,.031,z],.012,.004,'x',16);}
ch('locked_platform','enamel',[X,.760,-.009],[.543,.079,.425],.052,.94);
ch('locked_platform','silver',[X,.805,-.014],[.528,.014,.412],.042);
c('locked_platform','gray',[X,.814,.030],.068,.015,'y',36,.84);
c('locked_platform','enamel',[X,.820,.030],.055,.011,'y',36);
for(const x of [X-.125,X+.125])c('locked_platform','steel',[x,.813,-.061],.016,.009,'y',18);
for(const x of [X-.240,X+.240]){b('rail','silver',[x,.474,-.178],[.019,.581,.016]);b('rail','rubber',[x,.196,-.178],[.028,.055,.027]);}
b('rail','steel',[X-.220,.560,.130],[.073,.012,.022]);b('rail','steel',[X-.190,.552,.104],[.018,.024,.061]);
b('fixed_optics','gray',[X-.079,1.072,-.133],[.034,.476,.039]);
ch('fixed_optics','ink',[X-.026,1.102,-.111],[.150,.074,.096],.016);
ch('fixed_optics','ink',[X+.014,1.136,-.046],[.131,.119,.123],.026);
c('fixed_optics','steel',[X+.015,1.068,-.020],.041,.028,'y',28);c('fixed_optics','ink',[X+.015,1.035,-.020],.043,.042,'y',34);
for(const x of [X-.025,X+.051]){
 c('fixed_optics','ink',[x,1.220,-.014],.021,.074,'ocular',26);
 c('fixed_optics','rubber',[x,1.239,.019],.023,.020,'ocular',26);
 c('fixed_optics','display',[x,1.245,.026],.014,.004,'ocular',22);}
ch('inactive_readout','gray',[X+.140,.861,-.110],[.228,.061,.127],.018);
b('inactive_readout','display',[X+.118,.894,-.105],[.122,.007,.069]);b('inactive_readout','rubber',[X+.231,.895,-.089],[.051,.008,.047]);
ch('desk','slate',[.403,.754,.055],[.600,.041,.507],.023,.97);
for(const x of [.145,.661])for(const z of [-.156,.247])b('desk','gray',[x,.367,z],[.038,.732,.037]);
b('desk','steel',[.400,.812,.033],[.027,.094,.026]);b('desk','ink',[.400,.779,.043],[.119,.012,.096]);
ch('drawing_display','ink',[.400,.973,.031],[.307,.209,.033],.013);
b('drawing_display','display',[.400,.976,.052],[.282,.176,.004]);
b('artifact','slate',[.335,.785,.202],[.092,.012,.068]);b('artifact','gold',[.335,.794,.202],[.040,.008,.028]);
for(const [g,x,z,m] of [['select_notch',.235,.215,'silver'],['select_center',.442,.215,'lamp'],['select_arrow',.510,.215,'silver']]){
 b(g,'ink',[x,.795,z],[.052,.019,.052]);b(g,m,[x,.809,z],[.044,.011,.044]);}
b('add_note','ink',[.620,.797,.215],[.090,.025,.062]);b('add_note','lime',[.620,.812,.215],[.072,.012,.049]);
export const anchors={
 drawing_display:{at:[.400,.976,.051],extent:[.307,.209,.038],label:'Separate drawing notes viewer'},
 select_notch:{at:[.235,.809,.215],extent:[.052,.025,.052],action:'feature:upper-notch',label:'Select upper notch on inert drawing'},
 select_center:{at:[.442,.809,.215],extent:[.052,.025,.052],action:'feature:center-cross',label:'Select center reference'},
 select_arrow:{at:[.510,.809,.215],extent:[.052,.025,.052],action:'feature:right-arrow',label:'Select right arrow on the drawing'},
 add_note:{at:[.620,.812,.215],extent:[.090,.030,.062],action:'add',label:'Append the drawing annotation'},
 locked_platform:{at:[X,.80,-.01],extent:[.543,.103,.425],label:'Closed documentary surface, no interaction'}
};
