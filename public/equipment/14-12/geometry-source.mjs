// Original ESPEC SH-262 solid-door model, metre. Nominal exterior 440 × 690 × 786 mm;
// cavity 300 × 300 × 250 mm from ESPEC; face controls, plate and service layout approximate.
export const assets=[];
export const anchors={
 chamber_door:{at:[.207,.31,.355],extent:[.44,.548,.076],action:'door',label:'Open/close chamber door'},
 thermal_phantom:{at:[0,.309,.279],extent:[.071,.025,.054],action:'load',label:'Place/remove inert package'},
 controller:{at:[0,.628,.382],extent:[.165,.101,.025],action:'run',label:'Run ideal step profile'}
};
const B=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'}),C=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const b='cabinet';
B(b,'gray',[0,.347,-.145],[.440,.664,.496]);B(b,'steel',[0,.670,-.022],[.440,.04,.714]);B(b,'ink',[0,.083,-.019],[.437,.052,.738]);
for(const x of [-.16,.16])for(const z of [-.299,.296])C(b,'rubber',[x,.018,z],.021,.036,'y',16);
for(const x of [-.185,.185]){B(b,'slate',[x,.338,.230],[.070,.548,.242]);B(b,'silver',[Math.sign(x)*.153,.33,.230],[.006,.299,.250]);}
B(b,'slate',[0,.105,.228],[.440,.110,.252]);B(b,'slate',[0,.561,.229],[.440,.158,.250]);
B(b,'steel',[0,.177,.230],[.300,.006,.250]);B(b,'steel',[0,.483,.230],[.300,.006,.250]);B(b,'silver',[0,.331,.104],[.300,.300,.008]);
B(b,'slate',[0,.625,.361],[.440,.112,.020]);B(b,'ink',[0,.631,.372],[.274,.095,.020]);
for(const x of [-.153,.153])B(b,'rubber',[x,.331,.348],[.014,.321,.014]);
for(const y of [.169,.491])B(b,'rubber',[0,y,.348],[.318,.014,.014]);
for(const x of [-.136,.136])for(const y of [.247,.302,.362,.425])B(b,'silver',[x,y,.245],[.017,.006,.217]);
for(const y of [.302,.362]){
 for(let k=0;k<20;k++)C('shelves','silver',[-.136+.014*k,y,.241],.0018,.214,'z',8);
 for(const z of [.137,.345])B('shelves','silver',[0,y,z],[.293,.003,.004]);
}
for(let i=0;i<17;i++)for(const z of [-.263,-.171,-.07])B(b,'rubber',[.218,.198+i*.022,z],[.004,.006,.061]);
for(let i=0;i<17;i++)for(const x of [-.090,.075])B(b,'rubber',[x,.197+i*.022,-.392],[.13,.007,.002]);
B(b,'rubber',[-.079,.108,-.385],[.041,.024,.012]);B(b,'steel',[.112,.111,-.386],[.057,.023,.012]);
B('chamber_door','slate',[0,.318,.363],[.435,.533,.055]);B('chamber_door','ink',[0,.318,.335],[.418,.512,.010]);
B('chamber_door','silver',[0,.330,.328],[.305,.300,.008]);B('chamber_door','rubber',[-.199,.358,.389],[.023,.134,.013]);
for(const y of [.156,.534])B(b,'steel',[.211,y,.365],[.016,.042,.023]);
B('controller','display',[-.022,.632,.384],[.151,.078,.012]);C('controller','lime',[.086,.612,.389],.008,.007,'z',14);C('controller','lamp',[.086,.649,.389],.007,.007,'z',14);
B('thermal_phantom','steel',[0,.309,.279],[.060,.012,.042]);B('thermal_phantom','enamel',[0,.3154,.279],[.038,.001,.030]);B('thermal_phantom','gold',[.012,.3164,.290],[.007,.002,.007]);
