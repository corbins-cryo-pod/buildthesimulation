// Original simplified dry geometry. W251 × D304 × H302 mm brochure outer envelope;
 // tank 150 × 140 × 100 mm. Shape details and basket are original approximations.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=20)=>assets.push({g,m,p,r,h,axis,n,ratio:0,t:'cyl'});
ch('base','rubber',[0,.025,0],[.224,.038,.286],.020);
for(const x of [-.091,.091])for(const z of [-.111,.111])c('base','rubber',[x,.004,z],.016,.008,'y',16);
ch('enclosure','enamel',[0,.055,0],[.251,.032,.304],.027,.965);
b('enclosure','enamel',[-.100,.124,.002],[.051,.127,.246]);b('enclosure','enamel',[.100,.124,.002],[.051,.127,.246]);
ch('enclosure','enamel',[0,.12,.129],[.235,.135,.046],.013);ch('enclosure','enamel',[0,.122,-.108],[.251,.138,.088],.019);
b('enclosure','silver',[0,.091,.044],[.165,.011,.156]);b('tank','steel',[0,.083,.044],[.151,.002,.141]);
b('tank','silver',[0,.1335,-.0272],[.152,.100,.0024]);b('tank','silver',[0,.1335,.1152],[.152,.100,.0024]);
for(const x of [-.0762,.0762])b('tank','silver',[x,.1335,.044],[.0024,.100,.14]);
for(const x of [-.091,.091])b('rim','ink',[x,.184,.044],[.028,.007,.177]);
for(const z of [-.034,.121])b('rim','ink',[0,.184,z],[.156,.007,.016]);
ch('control_tower','enamel',[0,.230,-.097],[.231,.144,.11],.018,.92);
ch('control_tower','ink',[0,.250,-.039],[.195,.082,.016],.007);
b('control_tower','slate',[-.036,.263,-.029],[.093,.032,.004]);
for(const x of [.025,.052,.074])for(const y of [.240,.261])b('control_tower','gray',[x,y,-.029],[.015,.010,.004]);
b('rear_port','ink',[.067,.080,-.148],[.036,.025,.007]); b('rear_port','rubber',[.067,.080,-.152],[.023,.014,.003]);
for(let x=-7;x<=7;x++)b('rear_port','gray',[x*.008,.119,-.151],[.003,.011,.002]);
ch('lid','slate',[0,.195,.044],[.194,.015,.176],.017,.97);
ch('lid','gray',[0,.202,.044],[.182,.004,.158],.013);
b('lid','ink',[0,.224,.045],[.071,.013,.020]);for(const x of [-.029,.029])b('lid','ink',[x,.215,.045],[.011,.018,.020]);
// Open welded wire sides.
for(const x of [-.0647,.0647])for(let j=0;j<=12;j++)b('basket','steel',[x,.135,-.011+j*.00915],[.0013,.072,.0014]);
for(const z of [-.01265,.10065])for(let j=0;j<=14;j++)b('basket','steel',[-.063+j*.009,.135,z],[.0014,.072,.0013]);
for(const y of [.10,.125,.149,.174]){
 for(const x of [-.0647,.0647])b('basket','silver',[x,y,.044],[.0018,.0017,.115]);for(const z of [-.01265,.10065])b('basket','silver',[0,y,z],[.13,.0017,.0018]);
}
for(let j=0;j<=13;j++)b('basket','steel',[-.059+j*.009,.099,.044],[.00135,.00135,.115]);
for(let j=0;j<=11;j++)b('basket','steel',[0,.098,-.011+j*.01],[.129,.00135,.00135]);
for(const x of [-.072,.072]){b('basket','silver',[x,.176,.043],[.010,.004,.071]);b('basket','silver',[x,.170,.008],[.012,.008,.005]);b('basket','silver',[x,.170,.078],[.012,.008,.005]);}
b('coupon','gold',[0,.1125,.044],[.100,.025,.070]);
export const anchors={
 lid:{at:[0,.195,.044],extent:[.194,.067,.176],action:'lid',label:'Remove or replace dry lid'},
 basket:{at:[0,.1,.044],extent:[.151,.078,.115],action:'basket',label:'Lift or lower basket'},
 coupon:{at:[0,.1,.044],extent:[.100,.025,.070],action:'fit',label:'Check the inert coupon fit'}
};
