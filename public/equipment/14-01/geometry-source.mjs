// Editable metric reconstruction. Table 2-5 / Fig. 2-1 of Instron M10-16246-EN Rev E
// dimensions the frame; internal and 2710-112-style grip details are independently simplified.
export const assets=[];
export const anchors={
 upper_grip:{at:[0,.392,.144],extent:[.145,.12,.09],action:'upper',label:'Open/close upper grip'},
 lower_grip:{at:[0,.308,.144],extent:[.145,.12,.09],action:'lower',label:'Open/close lower grip'},
 coupon:{at:[0,.338,.144],extent:[.037,.074,.036],action:'load',label:'Load/remove inert coupon'},
 pendant:{at:[.163,.566,.208],extent:[.143,.13,.067],action:'zero',label:'Zero displacement datum'},
 host_panel:{at:[-.56,.77,.19],extent:[.31,.20,.022],action:'run',label:'Run tensile measurement'}
};
const B=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});const C=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const frame='frame',base='ink',metal='steel',silver='silver',bk='rubber';
B(frame,base,[0,.077,0],[.459,.116,.614]);B(frame,'gray',[0,.141,0],[.449,.019,.597]);B(frame,bk,[0,.079,.306],[.432,.091,.002]);B(frame,'red',[.137,.077,.309],[.073,.027,.003]);B(frame,'enamel',[-.139,.077,.309],[.088,.027,.003]);
for(const x of [-.174,.174])for(const z of [-.249,.249]){C(frame,bk,[x,.0095,z],.022,.019,'y',16)}
B(frame,'gray',[0,.755,-.098],[.145,1.238,.119]);B(frame,base,[0,.779,-.153],[.128,1.178,.019]);B(frame,'enamel',[0,1.358,-.099],[.154,.05,.131]);
for(const x of [-.061,.061])B(frame,silver,[x,.756,-.041],[.009,1.207,.009]);
for(let j=0;j<50;j++)B(frame,bk,[0,.187+j*.023,-.034],[.102,.0034,.010]);
for(let j=0;j<7;j++)B(frame,bk,[.228,.059+j*.011,-.155],[.003,.005,.092]);
B(frame,metal,[0,.154,.142],[.183,.009,.163]);
B('crosshead','enamel',[0,.545,.022],[.160,.092,.257]);B('crosshead',base,[0,.536,.161],[.144,.069,.026]);B('crosshead','red',[0,.554,.176],[.108,.016,.004]);
C('crosshead',metal,[0,.485,.144],.041,.033);C('crosshead',bk,[0,.464,.144],.035,.012);C('crosshead',silver,[0,.439,.144],.014,.042);
C(frame,metal,[0,.228,.144],.015,.145);C(frame,silver,[0,.218,.144],.042,.036);
for(const [name,y] of [['lower_grip',.292],['upper_grip',.401]]){
 B(name,metal,[0,y,.144],[.07,.052,.039]);C(name,silver,[.05,y,.144],.011,.043,'x');C(name,bk,[.073,y,.144],.021,.017,'x');B(name,bk,[0,y,.166],[.054,.038,.009]); 
}
B('lower_jaw',silver,[0,.322,.144],[.038,.021,.037]);B('upper_jaw',silver,[0,.373,.144],[.038,.021,.037]);
for(const y of [.313,.384])B('coupon','gold',[0,y,.148],[.008,.017,.001]);
B('coupon','gold',[0,.3485,.148],[.005,.058,.001]);
B('pendant',bk,[.163,.566,.208],[.12,.146,.049]);B('pendant','blue',[.163,.593,.234],[.095,.060,.005]);
for(const x of [.133,.163,.193])C('pendant',x===.163?'red':'enamel',[x,.531,.238],.009,.009,'z',14);
B('console','gray',[-.562,.574,.177],[.36,.032,.30]);B('console',base,[-.56,.77,.145],[.319,.206,.067]);B('host_panel','display',[-.56,.77,.182],[.301,.183,.012]);B('console',base,[-.56,.654,.145],[.041,.065,.044]);B('console',base,[-.56,.607,.313],[.228,.017,.085]);
