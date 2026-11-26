// Metric CAD visualization of legacy 3870EA. No functional vessel, actuation or latch mechanism.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const cyl=(g,m,p,r,h,n=48,ratio=0)=>assets.push({g,m,p,r,h,axis:'z',n,ratio,t:'cyl'});
const C=-.082,Y=.263;
ch('base','ink',[0,.030,-.034],[.653,.046,.796],.027,.91);
for(const x of [-.263,.263])for(const z of [-.337,.30])b('base','rubber',[x,.008,z],[.078,.016,.065]);
ch('shell','enamel',[0,.279,-.028],[.665,.492,.819],.027,.97);
ch('facade','slate',[.231,.271,.391],[.159,.445,.035],.014,.99);
ch('facade','enamel',[.231,.274,.412],[.148,.424,.012],.011);
ch('display','blue',[.238,.344,.418],[.116,.166,.011],.008);b('display','ink',[.235,.368,.424],[.069,.036,.003]);
for(const x of [.213,.238,.265])for(const y of [.287,.309,.329])b('display','silver',[x,y,.425],[.012,.012,.002]);
ch('display','ink',[.232,.179,.420],[.093,.063,.015],.009);b('display','gray',[.234,.181,.429],[.076,.004,.002]);
cyl('front_rim','steel',[C,Y,.367],.203,.021,56,.946);
cyl('rear_well','gray',[C,Y,-.3835],.192,.003,56);
assets.push({g:'lower_well',m:'silver',p:[C,Y,-.005],r:.193,h:.760,t:'lowerShell',n:32});
for(const x of [C-.137,C+.137])b('rails','steel',[x,.200,-.009],[.011,.006,.71]);
ch('closed_door','steel',[C,Y,.400],[.439,.421,.057],.042,.92);
ch('closed_door','enamel',[C,Y,.435],[.439,.413,.006],.041,.98);
b('closed_door','gray',[.129,Y,.427],[.030,.13,.018]);
b('locked_latch','ink',[-.248,Y,.438],[.034,.141,.009]);
b('locked_latch','ink',[-.250,Y+.052,.435],[.043,.034,.013]);
b('locked_latch','silver',[-.250,Y-.054,.434],[.041,.024,.014]);
for(let i=0;i<9;i++)b('rear_cosmetic','bolt',[.24,.226+(i%5)*.011,-.434+(i>4?.004:0)],[.064,.004,.004]);
const g='carrier',T=[C,.2155,.0175],W=.286,H=.025,L=.675;
b(g,'gold',[T[0],T[1]-H/2+.001,T[2]],[W,.002,L]);for(const a of [-1,1]){
 b(g,'gold',[T[0]+a*(W/2-.002),T[1],T[2]],[.004,H,L]);
 b(g,'gold',[T[0],T[1],T[2]+a*(L/2-.002)],[W,H,.004]);
}
export const anchors={
 carrier:{at:T,extent:[W,H,L],action:'check',label:'Evaluate an empty carrier bounding box'},
 closed_door:{at:[C,Y,.400],extent:[.439,.421,.075],label:'Fixed closed door depiction; no door interaction'},
 locked_latch:{at:[-.248,Y,.435],extent:[.043,.14,.014],label:'Locked display-only latch; no action or actuation'}
};
