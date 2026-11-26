// 5969 standard frame from Fig. 2-1 / Table 2-5 (M10-16248-EN). Accessories are original estimates.
// Coordinate frame: metre, +Y up, +Z forward. Test axis at Z=.0975 m.
export const assets=[];
export const anchors={
 left_support:{at:[-.02,.278,.0975],extent:[.044,.044,.064],action:'span',label:'Switch demo support spacing'},
 right_support:{at:[.02,.278,.0975],extent:[.044,.044,.064],action:'span',label:'Switch demo support spacing'},
 beam:{at:[0,.294,.0975],extent:[.062,.015,.021],action:'load',label:'Place or remove inert beam'},
 nose:{at:[0,.322,.0975],extent:[.047,.087,.067],action:'tare',label:'Zero central loading nose'},
 panel:{at:[.326,.68,.192],extent:[.14,.16,.046],action:'run',label:'Acquire flexure trace'}
};
const B=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'}), C=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const frame='frame',metal='steel',bk='rubber';
B(frame,'ink',[0,.1075,0],[.779,.165,.725]);B(frame,'gray',[0,.186,0],[.745,.008,.690]);
for(const x of [-.307,.307])for(const z of [-.281,.279]){C(frame,bk,[x,.0125,z],.04,.025,'y',16)}
B(frame,'ink',[.255,.28,-.228],[.241,.246,.195]);
for(const x of [-.285,.285]){
 B(frame,'gray',[x,.889,-.058],[.148,1.398,.140]);B(frame,metal,[x,.891,.0145],[.144,1.384,.009]);B(frame,bk,[x,.890,.021],[.064,1.375,.009]);
 for(let i=0;i<57;i++)B(frame,'ink',[x,.226+i*.023,.028],[.060,.004,.004]);
 for(const i of [-1,1])B(frame,'silver',[x+i*.063,.889,.022],[.008,1.376,.009]);
}
B(frame,'gray',[0,1.608,-.058],[.720,.052,.18]);B(frame,'ink',[0,1.626,-.053],[.410,.016,.129]);B(frame,metal,[0,.195,.0975],[.253,.010,.279]);
B(frame,'red',[.197,.096,.363],[.085,.033,.002]);C(frame,'lamp',[.332,.116,.350],.027,.006,'z',16);C(frame,'red',[.332,.116,.354],.018,.015,'z',18);
B('crosshead','ink',[0,.537,-.014],[.624,.120,.25]);B('crosshead','gray',[0,.542,.116],[.609,.094,.012]);B('crosshead','red',[0,.545,.123],[.16,.022,.004]);
C('crosshead',metal,[0,.446,.0975],.055,.062);C('crosshead',bk,[0,.439,.0975],.054,.019);C('crosshead','silver',[0,.412,.0975],.021,.025);
C('nose','silver',[0,.366,.0975],.018,.091);C('nose',metal,[0,.305,.0975],.010,.039,'z',22);B('nose',metal,[0,.323,.0975],[.033,.026,.029]);
B('fixture','ink',[0,.232,.0975],[.224,.063,.097]);B('fixture',metal,[0,.261,.0975],[.203,.013,.084]);
for(const [k,x] of [['left_support',-.02],['right_support',.02]]){
 B(k,metal,[x,.269,.0975],[.029,.022,.052]);C(k,'silver',[x,.285,.0975],.008,.033,'z',20);C(k,bk,[x,.274,.128],.008,.014,'z',16);
}
B('beam','gold',[0,.294,.0975],[.054,.002,.010]);B('beam','enamel',[0,.2951,.0975],[.011,.0002,.010]);
B('panel','ink',[.326,.68,.192],[.118,.169,.043]);B('panel','display',[.326,.718,.217],[.092,.053,.005]);
for(let j=0;j<3;j++)for(let i=0;i<3;i++)C('panel',j===2?'lamp':'enamel',[.297+i*.029,.681-j*.021,.219],.005,.007,'z',12);
