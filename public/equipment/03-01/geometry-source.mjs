// Original reference geometry, not vendor CAD. Wayne State configuration's silhouette
// plus the Technion family reference's six 4-inch positions. Unverified cabinet envelope.
export const assets=[],cx=.34,cz=-.07;
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
b('bench','ink',[.315,.437,-.025],[1.01,.866,.72]);
b('bench','gray',[.315,.046,-.025],[1.020,.082,.734]);
b('bench','silver',[.300,.376,.340],[.94,.644,.017]);b('bench','enamel',[.065,.371,.355],[.43,.631,.010]);b('bench','slate',[.527,.376,.355],[.46,.636,.009]);
for(const x of [-.046,.432])b('bench','rubber',[x,.545,.364],[.032,.137,.015]);
b('bench','red',[.315,.852,.344],[1.021,.034,.02]);
ch('bench','ink',[.315,.886,-.025],[1.031,.043,.734],.010);
b('intake_rack','rubber',[-.443,.834,-.077],[.49,1.668,.598]);
for(const x of [-.676,-.208])b('intake_rack','gray',[x,.813,.227],[.012,1.621,.023]);
for(let i=0;i<9;i++){const y=.238+i*.142;b('static_panels','ink',[-.443,y,.235],[.430,.120,.009]);
 for(const x of [-.628,-.256])c('static_panels','bolt',[x,y,.242],.006,.003,'z',12);
 if(i%2===0)for(let j=0;j<5;j++)b('static_panels','steel',[-.565+j*.043,y,.243],[.025,.029,.006]);
 else{b('static_panels','slate',[-.535,y,.241],[.104,.047,.005]);for(let j=0;j<3;j++)c('static_panels','rubber',[-.428+j*.045,y,.246],.015,.012,'z',18);}
}
c('chamber_base','gray',[cx,.918,cz],.244,.029,'y',52);
c('chamber_base','steel',[cx,.936,cz],.228,.024,'y',56,.864);
c('chamber_base','ink',[cx,.940,cz],.192,.014,'y',52);
c('carrier','steel',[cx,.963,cz],.184,.016,'y',48);
export const pockets=Array.from({length:6},(_,i)=>[cx+.118*Math.sin(i*Math.PI/3),.973,cz+.118*Math.cos(i*Math.PI/3)]);
pockets.forEach((p,i)=>{const g='recess_'+(i+1);c(g,'silver',p,.052,.005,'y',28,.92);c(g,i===0?'blue':'slate',[p[0],.974,p[2]],.0475,.003,'y',26);});
const shell='display_cover';c(shell,'steel',[cx,1.003,cz],.239,.103,'y',56,.90);
c(shell,'silver',[cx,.964,cz],.248,.019,'y',56,.89);
c(shell,'steel',[cx,1.050,cz],.227,.035,'y',56,.80);
c(shell,'silver',[cx,1.074,cz],.191,.032,'y',48);
c(shell,'steel',[cx,1.103,cz],.127,.042,'y',42);
c(shell,'rubber',[cx,1.143,cz],.082,.040,'y',36);
for(const d of [-1,1]){b(shell,'steel',[cx+d*.251,.987,cz],[.038,.017,.111]);b(shell,'steel',[cx+d*.249,.983,cz-.046],[.031,.028,.022]);b(shell,'steel',[cx+d*.249,.983,cz+.046],[.031,.028,.022]);}
c('witness','gold',[pockets[0][0],.979,pockets[0][2]],.050,.005,'y',40);
b('optical_card','silver',[.697,.914,.236],[.135,.010,.115]);b('optical_card','blue',[.697,.926,.236],[.117,.014,.096]);b('optical_card','lamp',[.694,.934,.236],[.012,.005,.090]);
export const anchors={
 display_cover:{at:[cx,.958,cz],extent:[.54,.21,.50],action:'cover',label:'Lift or replace visual display cover'},
 witness:{at:[pockets[0][0],.979,pockets[0][2]],extent:[.104,.008,.104],action:'seat',label:'Remove the seated inert disc'},
 optical_card:{at:[.697,.926,.236],extent:[.135,.029,.115],action:'read',label:'Read off-instrument optical worksheet'},
 ...Object.fromEntries(pockets.map((p,i)=>['recess_'+(i+1),{at:p,extent:[.104,.007,.104],action:'pocket:'+(i+1),label:'Select passive carrier pocket P'+(i+1)}]))
};
