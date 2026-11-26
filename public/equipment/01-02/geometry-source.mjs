// Original educational console. Dimensions are design values in meters, not a measurement of an OEM.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const c=(g,m,p,r,h,axis='y',n=20)=>assets.push({g,m,p,r,h,axis,n,ratio:0,t:'cyl'});
b('desktop','steel',[0,.745,0],[1.65,.07,.73]);b('desktop','enamel',[0,.782,0],[1.65,.011,.73]);
for(const x of [-.72,.72]){for(const z of [-.27,.27]){b('frame','ink',[x,.372,z],[.056,.716,.058]);b('feet','rubber',[x,.014,z],[.103,.028,.103]);}b('frame','slate',[x,.22,0],[.048,.05,.58]);}
b('frame','ink',[0,.52,-.28],[1.39,.06,.047]);b('tower','enamel',[.61,.999,-.135],[.212,.435,.368]);b('tower','ink',[.61,1.005,.05],[.195,.394,.009]);
for(let i=0;i<11;i++)b('tower','gray',[.61,.876+i*.019,.055],[.148,.005,.006]);c('tower','lime',[.613,1.174,.057],.011,.009,'z',16);
for(const [x,y,w,h,group] of [[-.26,1.142,.55,.326,'main_screen'],[.305,1.105,.45,.275,'reference_screen']]){
 b(group,'ink',[x,y,-.212],[w,h,.072]);b(group,'blue',[x,y,-.174],[w-.025,h-.025,.004]);b(group,'silver',[x,y-h/2+.006,-.170],[w-.035,.004,.003]);
 b('display_stands','steel',[x,.879,-.221],[.036,.182,.046]);b('display_stands','ink',[x,.798,-.194],[.20,.021,.18]);
}
b('keyboard','gray',[-.278,.801,.174],[.38,.024,.135]);for(let j=0;j<5;j++)for(let i=0;i<13;i++)b('keyboard','ink',[-.439+i*.026,.817,.121+j*.021],[.017,.009,.015]);
b('keypad_mesh','ink',[.02,.806,.19],[.084,.035,.117]);for(let j=0;j<3;j++)for(let i=0;i<3;i++)b('keypad_mesh',i===1&&j===1?'lamp':'silver',[-.004+i*.024,.828,.157+j*.030],[.014,.01,.019]);
b('fixture','slate',[.443,.80,.192],[.235,.025,.209]);b('fixture','gray',[.443,.831,.193],[.123,.039,.09]);
b('slab','blue',[.443,.86,.192],[.04,.02,.01]);for(const x of [.421,.465])b('electrodes','gold',[x,.86,.192],[.004,.022,.014]);
b('terminal_switch','ink',[.596,.809,.200],[.075,.044,.074]);c('terminal_switch','red',[.596,.848,.200],.023,.035,'y',24);b('terminal_switch','silver',[.596,.867,.200],[.024,.003,.004]);
export const anchors={
 main_screen:{anchor:[-.26,1.142,-.212],at:[-.26,1.142,-.212],extent:[.55,.326,.074],action:'run',label:'Solve uniform slab'},
 keypad_mesh:{at:[.02,.81,.19],extent:[.084,.04,.117],action:'grid',label:'Change X mesh subdivisions'},
 terminal_switch:{at:[.596,.82,.2],extent:[.075,.10,.074],action:'reverse',label:'Swap end-face potentials'}
};
