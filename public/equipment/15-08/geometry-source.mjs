// Original documentary model of the photographed gray/orange lower cart, not the complete workstation.
// The published imaging-station dimensions are used as a disclosed lower-cart scale proxy, not a measured enclosure.
export const assets=[];
const b=(g,m,p,d)=>assets.push({g,m,p,d,t:'box'});
const ch=(g,m,p,d,bevel,ba=1)=>assets.push({g,m,p,d,bevel,ba,t:'chamfer'});
const cy=(g,m,p,r,h,axis='y',n=20,ratio=0)=>assets.push({g,m,p,r,h,axis,n,ratio,t:'cyl'});
const X=-.505,Z=-.036;
ch('lower_cart','matte',[X,.139,Z],[.810,.104,.974],.043,.91);
ch('lower_cart','blackened',[X,.193,Z],[.736,.046,.827],.037,1.0);
ch('lower_cart','carcoal',[X,.372,Z-.009],[.719,.391,.788],.028,.96);
ch('lower_cart','slatepaint',[X,.576,Z-.020],[.714,.089,.761],.029,.955);
ch('lower_cart','slatepaint',[X,.631,Z-.022],[.688,.040,.743],.039,.975);
b('lower_cart','matte',[X,.208,Z+.389],[.598,.028,.009]);
ch('side_skin','matte',[X-.357,.383,Z-.018],[.012,.340,.674],.005);
b('side_skin','ember',[X-.3635,.522,Z-.039],[.006,.030,.633]);
b('side_skin','orange',[X-.3665,.526,Z-.039],[.002,.018,.622]);
b('side_skin','graphite',[X+.359,.389,Z-.021],[.011,.290,.689]);
b('side_skin','matte',[X+.366,.287,Z-.070],[.008,.100,.507]);
ch('opaque_front','graphite',[X,.392,Z+.383],[.664,.369,.019],.009);
b('opaque_front','blackened',[X+.242,.393,Z+.394],[.006,.319,.004]);
ch('opaque_front','ember',[X+.142,.397,Z+.400],[.164,.220,.022],.010,.98);
b('opaque_front','orange',[X+.139,.493,Z+.412],[.138,.018,.003]);
b('opaque_front','orange',[X+.139,.298,Z+.412],[.135,.017,.003]);
ch('opaque_front','slatepaint',[X+.193,.397,Z+.414],[.140,.143,.018],.008);
b('opaque_front','matte',[X-.171,.484,Z+.395],[.197,.024,.005]);
b('opaque_front','trimpale',[X-.171,.485,Z+.398],[.049,.006,.002]);
b('rear_blank','carcoal',[X,.382,Z-.401],[.639,.296,.011]);
b('rear_blank','matte',[X,.476,Z-.407],[.576,.030,.003]);
for(const x of [-.341,.341])for(const z of [-.425,.425]){
 cy('casters','rubber',[X+x,.043,Z+z],.043,.031,'x',28);
 cy('casters','steel',[X+x,.043,Z+z],.026,.034,'x',28);
 cy('casters','matte',[X+x,.043,Z+z],.012,.038,'x',20);
 ch('casters','blackened',[X+x,.098,Z+z],[.051,.064,.060],.008);
 b('casters','graphite',[X+x,.071,Z+z+.031],[.040,.013,.020]);
}
const D=.620,Y=.795;
ch('diagram_desk','denim',[D,Y-.019,.042],[.760,.038,.519],.019,.985);
for(const x of [.278,.962])for(const z of [-.175,.249]){
  b('diagram_desk','gray',[x,(Y-.038)/2,z],[.043,Y-.038,.043]);
  b('diagram_desk','rubber',[x,.011,z],[.051,.022,.051]);
}
b('diagram_desk','ink',[D,.154,-.176],[.692,.036,.042]);
ch('display','ink',[D,1.102,.005],[.422,.266,.028],.013,.98);
b('display','display',[D,1.105,.020],[.397,.236,.003]);
b('display','steel',[D,.913,-.012],[.034,.172,.030]);
ch('display','ink',[D,Y+.011,.014],[.205,.023,.152],.011,.98);
for(const [k,x,col] of [['growth',.481,'teal'],['mixed',.620,'silver'],['zero',.759,'dullgold']]){
 ch('select_'+k,'ink',[x,Y+.012,.239],[.097,.024,.084],.009);
 ch('select_'+k,col,[x,Y+.032,.239],[.086,.016,.071],.008);
}
export const anchors={
 lower_cart:{at:[X,0,Z],extent:[.810,.651,.974],label:'Closed gray/orange lower-cart model, nominal scale proxy only; no action'},
 opaque_front:{at:[X,.391,Z+.398],extent:[.664,.369,.038],label:'Intentionally sealed front; static styling only'},
 display:{at:[D,1.105,.022],extent:[.422,.266,.044],action:'view',label:'Read the separate authored width comparison'},
 ...Object.fromEntries([['growth',.481],['mixed',.620],['zero',.759]].map(([k,x])=>['select_'+k,{at:[x,Y+.032,.239],extent:[.097,.040,.084],action:'select:'+k,label:'Select detached '+k+' drawing'}]))
};
