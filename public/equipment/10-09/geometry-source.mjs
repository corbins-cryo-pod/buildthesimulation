// Intan M4200 rack silhouette, 19-in/1U installation, depth inferred.
// Cosmetic ports, compact passive witness cables (not full-length), no pin or command model.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const c=(g,m,p,r,h,axis='z',n=24,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const xs=[-.176,-.116,-.056,.004],ports=['A','B','C','D'],front=.097;
ch('rack','ink',[0,.026,-.001],[.432,.0434,.190],.004,.992);
b('face','silver',[0,.026,front],[.428,.0417,.006]);
b('rear','steel',[0,.026,-.098],[.415,.039,.004]);
for(const side of [-1,1]){
 b('rack','steel',[side*.224,.026,front],[.035,.0433,.004]);b('rack','ink',[side*.207,.026,.098],[.013,.042,.009]);
 for(const y of [.015,.036])c('rack','rubber',[side*.232,y,front+.002],.0026,.004,'z',16);for(const z of [-.075,.073])b('feet','rubber',[side*.178,.002,z],[.024,.004,.028]);
}
ports.forEach((k,i)=>{const x=xs[i],g='port_'+k; b(g,'enamel',[x,.030,front+.004],[.021,.017,.005]);b(g,'slate',[x,.029,front+.007],[.015,.012,.0014]);b(g,'ink',[x,.029,front+.008],[.011,.008,.001]);
 for(const ax of [-1,1])b(g,'gold',[x+ax*.0044,.029,front+.0088],[.001,.006,.0012]);
 b(g,'slate',[x,.015,front+.004],[.012,.0023,.0016]);});
for(const x of [.075,.097,.119,.143]){
 b('face','slate',[x,.025,front+.004],[.021,.028,.002]);
 c('face','silver',[x,.024,front+.009],.0061,.013,'z',24,.62);c('face','ink',[x,.024,front+.014],.0027,.001,'z',16);}
for(const y of [.018,.026,.034])c('face','gray',[.170,y,front+.006],.0017,.002);
b('face','rubber',[.188,.028,front+.005],[.017,.022,.006]);b('face','steel',[.187,.015,front+.008],[.009,.003,.002]);
for(const x of [-.177,-.153,.061,.082,.105,.129])c('rear','silver',[x,.027,-.104],.0065,.012,'z',20,.68);
b('rear','ink',[-.086,.028,-.102],[.044,.013,.008]);b('rear','blue',[-.041,.026,-.103],[.017,.012,.009]);
b('rear','ink',[.163,.027,-.104],[.045,.025,.01]);b('rear','rubber',[.189,.026,-.105],[.014,.018,.009]);
const boards=[[-.164,.204,15],[-.062,.222,13],[.059,.195,15]];
boards.forEach(([x,z,w],i)=>{const width=w/1000,g='head_'+ports[i];
 b(g,'red',[x,.006,z],[width,.002,.024]);b(g,'ink',[x,.008,z],[width*.51,.003,.0083]);
 for(const q of [-1,1])b(g,'gold',[x+q*width*.30,.0088,z+.003],[width*.15,.001,.007]);
 for(const q of [-1,1])b(g,'enamel',[x,.008,z+q*.0103],[width*.84,.003,.0045]);
 const a=xs[i],lead='red_lead_'+ports[i];
 b(lead,'red',[a,.029,.115],[.011,.011,.019]);
 const pts=Array.from({length:31},(_,j)=>{const t=j/30;return [(1-t)*a+t*x+.028*Math.sin(Math.PI*2*t),.009+(.029-.009)*(1-t)**3,.125+(z-.137)*(t)];});
 assets.push({g:lead,m:'red',pts,r:.0021,n:8,t:'tube'});
});
export const anchors={
 ...Object.fromEntries(ports.map((k,i)=>['port_'+k,{at:[xs[i],.029,front+.004],extent:[.021,.027,.013],action:'select:'+k+'-01',label:'Read stored channel '+k+'-01 or report no data',portId:'RHS-'+k}])),
 ...Object.fromEntries(boards.map(([x,z,w],i)=>['head_'+ports[i],{at:[x,.007,z],extent:[w/1000,.006,.024],action:'select:'+ports[i]+'-01',label:'Read synthetic trace for headstage '+ports[i]}]))
};
