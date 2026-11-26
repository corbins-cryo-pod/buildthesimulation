// Original illustrative desk and desktop monitor in meters. No physical Noldus product is represented.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const cy=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const top=.755,monitorY=1.117,monitorX=-.099,monitorZ=-.098;
ch('desk','wood',[0,.732,0],[1.25,.046,.684],.021,.985);
ch('desk','wood_edge',[0,.708,0],[1.226,.009,.657],.017);
for(const x of [-.538,.538]){
  for(const z of [-.268,.268]){
    b('desk_frame','denim',[x,.361,z],[.047,.680,.048]);
    ch('desk_frame','rubber',[x,.014,z],[.056,.028,.061],.008,.98);
  }
  b('desk_frame','denim',[x,.662,0],[.046,.049,.568]);b('desk_frame','ink',[x,.141,0],[.035,.039,.548]);
}
b('desk_frame','denim',[0,.664,-.268],[1.065,.060,.056]);
b('desk_frame','trimpale',[0,.686,.299],[1.112,.026,.041]);
b('desk_frame','ink',[-.532,.659,.250],[.037,.057,.028]);
ch('monitor_stand','ink',[monitorX,.773,monitorZ-.021],[.241,.025,.182],.018,.98);
ch('monitor_stand','gray',[monitorX,.888,monitorZ-.054],[.034,.207,.038],.004,.99);
cy('monitor_stand','steel',[monitorX,.959,monitorZ-.038],.033,.025,'z',24);
ch('display','ink',[monitorX,monitorY,monitorZ],[.560,.327,.039],.012,.98);
ch('display','denim',[monitorX,monitorY,monitorZ-.023],[.474,.252,.023],.018,.97);
b('display','display',[monitorX,monitorY+.008,monitorZ+.0205],[.531,.289,.0035]);
b('display','trimpale',[monitorX,monitorY-.148,monitorZ+.021],[.086,.005,.003]);
b('display','lime',[monitorX+.234,monitorY-.148,monitorZ+.021],[.013,.004,.003]);
for(let i=0;i<8;i++)b('display','ink',[monitorX-.093+i*.024,monitorY+.096,monitorZ-.036],[.014,.003,.003]);
ch('keypad','ink',[-.126,top+.012,.164],[.404,.024,.126],.015,.98);
for(let row=0;row<4;row++)for(let i=0;i<13;i++)ch('keypad',i>10?'gray':'rubber',[-.302+i*.029,top+.026,.126+row*.024],[.025,.005,.019],.002);
b('keypad','trimpale',[-.184,top+.027,.220],[.143,.004,.011]);
ch('control_base','denim',[.369,top+.010,.188],[.329,.020,.141],.011,.98);
for(const [id,x,c] of [['previous',.267,'silver'],['next',.370,'teal'],['reset',.471,'dullgold']]){
 ch('key_'+id,'ink',[x,top+.025,.185],[.082,.020,.088],.007,.98);
 ch('key_'+id,c,[x,top+.038,.185],[.070,.010,.074],.006,.98);
}
export const anchors={
 display:{at:[monitorX,monitorY+.008,monitorZ+.023],extent:[.560,.327,.055],action:'view',label:'Read current illustration index'},
 ...Object.fromEntries([['previous',.267],['next',.370],['reset',.471]].map(([id,x])=>['key_'+id,{at:[x,top+.038,.185],extent:[.082,.027,.088],action:id,label:id==='previous'?'Previous fixed waypoint':id==='next'?'Next fixed waypoint':'Restore baseline index 1'}])),
 desk:{at:[0,top,0],extent:[1.25,.046,.684],label:'Illustrative desk with authored proportions; no physical product'}
};
