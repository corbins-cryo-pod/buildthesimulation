// K&S 4523D, right-handed bench. Meter envelope per K&S 94500-000D-000-01 rev 03/02 p. 1-6.
// Original reconstruction from KTH and Montana MMF images; small details are schematic.
export const assets=[];
export const anchors={
 workholder:{at:[0,.124,.159],extent:[.178,.063,.178],action:'seat',label:'Seat / lift virtual package'},
 lever:{at:[.191,.191,.202],extent:[.052,.075,.135],action:'apex',label:'Toggle the virtual loop-height preset'},
 keypad:{at:[.227,.099,.278],extent:[.124,.044,.126],action:'run',label:'Evaluate virtual ribbon'}
};
const B=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'}),C=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const b='body';
B(b,'enamel',[0,.039,0],[.680,.078,.700]);B(b,'gray',[0,.077,.016],[.660,.021,.674]);
for(const x of [-.280,.28])for(const z of [-.265,.265])C(b,'rubber',[x,.009,z],.029,.018,'y',16);
B(b,'enamel',[0,.139,-.208],[.582,.110,.251]);B(b,'enamel',[0,.277,-.198],[.195,.318,.155]);B(b,'silver',[0,.431,-.191],[.134,.037,.147]);
for(const x of [-.216,.216]){B(b,'enamel',[x,.139,-.064],[.184,.105,.102]);B(b,'ink',[x,.145,-.009],[.171,.092,.019]);}
B(b,'blue',[-.213,.153,.005],[.126,.053,.010]);B(b,'red',[-.279,.179,.006],[.017,.015,.006]);
for(let i=0;i<7;i++){C(b,'silver',[.156+i*.019,.161,.008],.005,.012,'z',12);C(b,'ink',[.156+i*.019,.161,.016],.004,.006,'z',12);}
for(let i=0;i<16;i++)B(b,'rubber',[.333,.042,-.252+.013*i],[.007,.010,.008]);
const optics='microscope';
B(optics,'enamel',[0,.342,-.008],[.151,.136,.196]);
for(const x of [-.035,.035]){C(optics,'ink',[x,.398,.062],.030,.101,'z',24);C(optics,'rubber',[x,.398,.117],.033,.021,'z',24);C(optics,'display',[x,.398,.130],.022,.007,'z',24);}
C(optics,'silver',[0,.266,.042],.038,.062);C(optics,'ink',[0,.231,.042],.027,.016,'y',24);C(optics,'display',[0,.222,.042],.023,.004);
B(optics,'enamel',[.078,.382,-.062],[.024,.054,.092]);C(optics,'rubber',[.091,.397,-.037],.024,.027,'x',20);
B(b,'silver',[.015,.476,-.149],[.057,.081,.051]);C(b,'ink',[.015,.513,-.132],.017,.043,'z',18);
const spool='spool';
C(spool,'enamel',[.108,.473,-.058],.027,.007,'z',24);C(spool,'gold',[.108,.473,-.053],.025,.017,'z',24);C(spool,'enamel',[.108,.473,-.041],.027,.006,'z',24);C(spool,'silver',[.108,.473,-.038],.011,.016,'z',16);
B('wedge','ink',[0,.210,-.015],[.096,.042,.118]);C('wedge','steel',[0,.203,.086],.017,.121,'z',22);C('wedge','silver',[0,.192,.147],.007,.044,'y',18);C('wedge','gold',[0,.158,.147],.0020,.01905,'y',12);
C('workholder','ink',[0,.105,.158],.077,.044,'y',32);
C('workholder','silver',[0,.129,.158],.070,.019,'y',32);C('workholder','steel',[0,.140,.158],.062,.009,'y',32);
B('package','mask',[0,.148,.158],[.067,.007,.056]);B('package','gold',[-.013,.152,.158],[.012,.001,.015]);B('package','gold',[.013,.152,.158],[.012,.001,.015]);B('package','enamel',[0,.157,.158],[.010,.009,.014]);
B('lever','silver',[.191,.174,.157],[.022,.036,.073]);C('lever','rubber',[.191,.198,.220],.021,.083,'z',20);
B('keypad','ink',[.227,.097,.278],[.117,.032,.117]);for(let j=0;j<3;j++)for(let i=0;i<4;i++)B('keypad',j===2&&i===3?'lime':'blue',[.188+i*.026,.114,.244+j*.032],[.019,.004,.021]);
C(b,'ink',[-.230,.107,.209],.061,.031,'y',24);C(b,'silver',[-.230,.126,.209],.054,.009,'y',24);C(b,'rubber',[-.230,.134,.209],.028,.013,'y',24);
