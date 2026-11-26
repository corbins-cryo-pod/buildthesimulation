// Dentsply 1750 outline dimensions in meters. Cold aesthetic geometry, no functional internals.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=24)=>assets.push({g,m,p,r,h,axis,n,ratio:0,t:'cyl'});
ch('base','ink',[0,.075,-.006],[.61,.132,.474],.020,.976);
for(const x of [-.245,.245])for(const z of [-.181,.181])b('base','rubber',[x,.009,z],[.049,.018,.053]);
b('cabinet','slate',[0,.334,-.182],[.605,.393,.171]);b('cabinet','ink',[0,.501,-.01],[.605,.088,.463]);
for(const x of [-.248,.248]){b('cabinet','ink',[x,.334,.003],[.109,.360,.445]);
 b('frame','silver',[x,.311,.233],[.114,.359,.017]);b('frame','steel',[x,.346,.244],[.073,.286,.008]);}
b('frame','silver',[0,.448,.235],[.371,.044,.022]);b('frame','silver',[0,.154,.235],[.383,.041,.020]);
b('lining','enamel',[0,.171,.078],[.360,.004,.320]);b('lining','enamel',[0,.425,.078],[.360,.004,.320]);b('lining','enamel',[0,.298,-.087],[.359,.247,.010]);
for(const x of [-.187,.187]){b('lining','enamel',[x,.298,.078],[.014,.250,.320]);
 for(let j=0;j<8;j++)b('lining','silver',[x-Math.sign(x)*.007,.211+.019*j,.078],[.002,.004,.276]);}
b('front_panel','ink',[0,.083,.234],[.595,.112,.027]);
b('front_panel','steel',[.018,.090,.249],[.323,.089,.010]);b('front_panel','ink',[-.052,.115,.255],[.104,.028,.004]);
for(let j=0;j<4;j++)for(let i=0;i<3;i++)c('front_panel','gray',[.074+.020*i,.115-.017*j,.257],.006,.004,'z',14);
for(const x of [-.137,-.086,-.036,.003])c('front_panel','gray',[x,.072,.256],.008,.005,'z',14);
b('front_panel','lime',[.20,.080,.254],[.024,.027,.005]);
for(let j=0;j<10;j++)b('rear_features','bolt',[.20,.196+j*.015,-.268],[.105,.004,.004]);
const door='visual_door';
ch(door,'ink',[0,.323,.238],[.503,.334,.038],.018,.98);
b(door,'steel',[0,.316,.218],[.451,.302,.003]);b(door,'enamel',[0,.319,.213],[.356,.246,.009]);
for(let i=0;i<=21;i++)b(door,'gray',[-.227+i*.0216,.198,.259],[.006,.021,.003]);
b(door,'rubber',[0,.437,.264],[.091,.018,.007]);for(const x of [-.034,.034])b(door,'rubber',[x,.423,.260],[.022,.018,.009]);
const shell='shelf',S=[0,.228,.078];b(shell,'silver',[0,.222,.078],[.31,.012,.27]);
for(const x of [-.160,.160])b(shell,'steel',[x,.230,.078],[.010,.004,.267]);
for(const [n,x] of [['left',-.261],['right',.261]])b('display_link_'+n,'ink',[x,.506,.209],[.024,.051,.020]);
const g='dry_tray',p=[0,.228,.078],W=.25,H=.045,D=.18;
b(g,'gold',[0,.231,.078],[W,.004,D]);for(const a of [-1,1]){b(g,'gold',[a*(W/2-.002),.2505,.078],[.004,H,D]);b(g,'gold',[0,.2505,.078+a*(D/2-.002)],[W,H,.004]);}
export const anchors={
 visual_door:{at:[0,.49,.243],extent:[.503,.334,.049],action:'view',label:'Change dry door depiction'},
 shelf:{at:S,extent:[.31,.016,.27],action:'check',label:'Evaluate tray on source-scaled dry shelf'},
 dry_tray:{at:p,extent:[W,H,D],action:'check',label:'Check cold empty tray bounds'},
 front_panel:{at:[0,.09,.246],extent:[.60,.108,.027],label:'Decorative controls, no action'}
};
