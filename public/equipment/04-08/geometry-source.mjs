// Documentary DISCO DAG810 outline. Published nominal W600×D1700×H1780 mm.
// Closed dark windows and inactive blank bezel; no machine parts, state or use.
export const assets=[];
const b=(g,m,p,d,a=0)=>assets.push({g,m,p,d,t:'box',a});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=26,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.27;
ch('machine_base','ink',[X,.042,0],[.596,.074,1.688],.015,.98);
for(const x of [X-.225,X+.225])for(const z of [-.690,.690])b('machine_base','rubber',[x,.017,z],[.065,.034,.071]);
ch('machine_body','steel',[X,.445,0],[.600,.742,1.700],.025,.978);
b('machine_body','silver',[X,.452,.847],[.548,.577,.006]);
b('machine_body','gray',[X,.233,.852],[.513,.027,.004]);
for(const x of [X-.298,X+.298])b('machine_body','slate',[x,.462,-.27],[.004,.573,.878]);
for(const x of [X-.299,X+.299])for(let j=0;j<8;j++)b('machine_body','gray',[x,.565+j*.014,-.588],[.005,.004,.246]);
ch('rear_cabinet','steel',[X,1.226,-.428],[.595,1.108,.835],.024,.99);
ch('inactive_fascia','ink',[X,1.543,-.015],[.593,.445,.032],.011);
b('inactive_fascia','gray',[X-.020,1.584,.003],[.312,.202,.017]);b('inactive_fascia','display',[X-.020,1.584,.014],[.271,.161,.006]);
b('inactive_fascia','steel',[X+.190,1.575,.005],[.069,.165,.009]);b('inactive_fascia','gray',[X+.190,1.569,.011],[.042,.136,.006]);
b('inactive_fascia','ink',[X,1.317,.005],[.526,.016,.013]);
ch('fixed_guard','enamel',[X,.918,.432],[.574,.164,.776],.026,.95);
b('fixed_guard','silver',[X,1.004,.415],[.568,.035,.734],.075);
for(const z of [.234,.590]){
 b('fixed_guard','slate',[X,1.030-(z-.234)*.075,z],[.425,.010,.122],.075);
 b('fixed_guard','ink',[X,1.035-(z-.234)*.075,z],[.375,.009,.092],.075);
 b('fixed_guard','display',[X,1.040-(z-.234)*.075,z],[.352,.002,.075],.075);}
b('fixed_guard','gray',[X,.970,.733],[.168,.020,.025],.075);
ch('desk','slate',[.46,.792,.206],[.64,.045,.52],.024,.98);
for(const x of [.184,.736])for(const z of [0,.418])b('desk','ink',[x,.388,z],[.040,.775,.046]);
b('desk','steel',[.46,.227,.000],[.53,.039,.041]);
ch('drawing_screen','ink',[.46,1.023,.100],[.355,.222,.032],.009);
b('drawing_screen','display',[.46,1.025,.118],[.326,.190,.004]);
b('desk','steel',[.46,.877,.101],[.024,.096,.030]);
b('desk','ink',[.46,.820,.109],[.154,.013,.122]);
for(const [n,x] of [['left',.331],['center',.460],['right',.589]]){
 b('key_'+n,'rubber',[x,.826,.357],[.078,.021,.066]);b('key_'+n,n==='center'?'lamp':'silver',[x,.839,.358],[.066,.012,.051]);}
export const anchors={
 drawing_screen:{at:[.46,1.025,.118],extent:[.355,.222,.045],action:'view',label:'Read the current detached drawing station'},
 ...Object.fromEntries([['left',.331],['center',.460],['right',.589]].map(([name,x])=>['key_'+name,{at:[x,.837,.358],extent:[.078,.032,.066],action:'select:'+name,label:'Read '+name+' drawing witness'}])),
 inactive_fascia:{at:[X,1.54,.005],extent:[.593,.445,.05],label:'Closed machine with inactive blank fascia'}
};
