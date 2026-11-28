/*
 * Original 3D teaching stations for the BuildTheSimulation cleanroom.
 * Not vendor models or operating procedures. All coordinates are local metres,
 * +Y up, +Z toward the operator. The caller owns the workpiece and the camera.
 */
export const TEACHING_MACHINE_VERSION='1.0.0';
const xx=Math.PI/2, tt=Math.PI*2;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=x=>Math.max(0,Math.min(1,finite(x)?x:0));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
function smoothBand(x,l,r){return ease((x-l)/(r-l));}
function doorAmount(p){return Math.max(smoothBand(p,.07,.22)*(1-smoothBand(p,.32,.53)),smoothBand(p,.78,.95));}
function runAmount(p){return smoothBand(p,.57,.625)*(1-smoothBand(p,.76,.81));}
const spin=(p,turns)=>tt*turns*smoothBand(p,.57,.81);
const satin=(T,color,opts={})=>new T.MeshStandardMaterial({color,roughness:.42,metalness:.38,...opts});
const indicator=(T,color,opacity=1)=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25,roughness:.62,metalness:.08,transparent:opacity!==1,opacity,depthWrite:opacity===1});
const basic=(T,color,opacity=.4)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide});
function materials(T){
 return {
  body:satin(T,0x9caeaa,{roughness:.61,metalness:.22}), trim:satin(T,0x536865,{roughness:.48,metalness:.47}),
  seam:satin(T,0x263734,{roughness:.64,metalness:.12}), steel:satin(T,0xbcccca,{roughness:.31,metalness:.68}),
  rail:satin(T,0x809895,{roughness:.28,metalness:.64}), ceramic:satin(T,0xd4d2b9,{roughness:.71,metalness:.04}),
  black:satin(T,0x1b2727,{roughness:.76,metalness:.08}), graphite:satin(T,0x384745,{roughness:.58,metalness:.35}),
  glass:satin(T,0x80bdb7,{roughness:.16,metalness:.14,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide}),
  amberGlass:satin(T,0xdeb35e,{roughness:.2,metalness:.1,transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide}),
  copper:satin(T,0xc18454,{roughness:.36,metalness:.64}), brass:satin(T,0xd2a366,{roughness:.4,metalness:.56}),
  green:satin(T,0x44796c,{roughness:.42,metalness:.35}), white:satin(T,0xd6dfd4,{roughness:.65,metalness:.15}),
  accent:indicator(T,0x8fe5c8), warm:indicator(T,0xf2bd72), signal:indicator(T,0xeb8276), violet:indicator(T,0x98b3ef),
 };
}
function put(group,o,xyz){if(xyz)o.position.fromArray(xyz);group.add(o);return o;}
function piece(T,g,n,geo,m,xyz){
 const ob=new T.Mesh(geo,m);ob.name=n;return put(g,ob,xyz);
}
function helper(T,root,mat){
 const box=(g,n,size,xyz,m=mat.body)=>piece(T,g,n,new T.BoxGeometry(...size),m,xyz);
 function plate(g,n,[w,h,d],xyz,m=mat.body,r=.017){
  // Shift a bevel from local positive depth back to the requested centre.
  const s=new T.Shape(),a=w/2-r,b=h/2-r,r0=Math.min(r*.55,a*.42,b*.42);
  s.moveTo(-a+r0,-b);s.lineTo(a-r0,-b);s.quadraticCurveTo(a,-b,a,-b+r0);
  s.lineTo(a,b-r0);s.quadraticCurveTo(a,b,a-r0,b);s.lineTo(-a+r0,b);
  s.quadraticCurveTo(-a,b,-a,b-r0);s.lineTo(-a,-b+r0);s.quadraticCurveTo(-a,-b,-a+r0,-b);
  const v=Math.min(r*.6,d*.2),geo=new T.ExtrudeGeometry(s,{depth:d-2*v,bevelEnabled:true,bevelThickness:v,bevelSize:v,bevelSegments:2,curveSegments:4,steps:1});
  geo.translate(0,0,-(d-2*v)/2);
  return piece(T,g,n,geo,m,xyz);
 }
 const tube=(g,n,r,h,xyz,m=mat.rail,r2=r,s=40)=>piece(T,g,n,new T.CylinderGeometry(r,r2,h,s),m,xyz);
 function ring(g,n,r,t,xyz,m=mat.steel,{arc=tt,front=0,upright=false}={}){
  const o=piece(T,g,n,new T.TorusGeometry(r,t,7,Math.round(42*arc/tt),arc),m,xyz);
  o.rotation.set(upright?0:xx,0,front);
  return o;
 }
 function pipe(g,n,pts,r,m=mat.copper){
  const v=pts.map(q=>new T.Vector3(...q)),p=new T.CatmullRomCurve3(v,false,'centripetal');
  return piece(T,g,n,new T.TubeGeometry(p,Math.max(12,v.length*5),r,7,false),m);
 }
 function group(n,xyz,parent=root){const g=new T.Group();g.name=n;return put(parent,g,xyz);}
 function row(g,n,count,dims,start,d,m=mat.seam){
  const o=new T.InstancedMesh(new T.BoxGeometry(...dims),m,count);o.name=n;
  const matrix=new T.Matrix4();
  for(let i=0;i<count;i++)o.setMatrixAt(i,matrix.makeTranslation(...start.map((v,k)=>v+i*d[k])));
  o.instanceMatrix.needsUpdate=true;g.add(o);return o;
 }
 function bolts(g,n,count,r,y,z=0,m=mat.steel){
  const o=new T.InstancedMesh(new T.CylinderGeometry(.008,.008,.008,10),m,count);o.name=n;const matrix=new T.Matrix4();
  for(let i=0;i<count;i++){const a=i*tt/count;o.setMatrixAt(i,matrix.makeTranslation(r*Math.cos(a),y,z+r*Math.sin(a)));}
  g.add(o);return o;
 }
 return {box,plate,tube,ring,pipe,group,row,bolts};
}
function desk(h,mat,g,w=1.14,d=.77,y=.79){
 const {box,plate,row}=h;
 plate(g,'base-shadow-plinth',[w-.13,.092,d-.08],[0,.055,.002],mat.graphite);
 plate(g,'lower-machine-cabinet',[w,y-.14,d],[0,(y-.14)/2+.083,0],mat.body,.027);
 box(g,'top-work-surface',[w+.03,.042,d+.045],[0,y,0],mat.steel);
 for(const x of [-w*.245,w*.245]){
  plate(g,'front-access-panel',[w*.43,Math.min(.43,y*.61),.023],[x,y*.44,d*.5+.013],mat.trim,.011);
  box(g,'panel-pull',[.155,.014,.039],[x,y*.6,d*.5+.046],mat.steel);
 }
 row(g,'toe-vent-row',10,[.019,.036,.007],[-w*.25,.154,d*.5+.018],[w*.055,0,0]);
 for(const x of [-w*.4,w*.4])for(const z of [-d*.37,d*.37])box(g,'vibration-foot',[.076,.027,.066],[x,.013,z],mat.black);
}
function bench(h,mat,g,w=1.21,d=.77,y=.75){
 const {box,plate}=h;
 for(const x of [-w*.43,w*.43])for(const z of [-d*.37,d*.37]){
  box(g,'bench-frame-upright',[.052,y,.055],[x,y*.5,z],mat.trim);
  box(g,'bench-foot',[.086,.03,.076],[x,.018,z],mat.black);
 }
 for(const z of [-d*.37,d*.37]){
  box(g,'bench-frame-crossmember',[w*.88,.05,.055],[0,.13,z],mat.trim);
 }
 plate(g,'bench-top',[w,.05,d],[0,y,0],mat.steel,.013);
 box(g,'lower-service-shelf',[w*.86,.027,d*.64],[0,.17,-.018],mat.graphite);
}
function panel(h,mat,g,xyz,angle=-.09){
 const {box,plate,tube,group,row}=h;
 const n=group('instrument-control-console',xyz,g);n.rotation.x=angle;
 plate(n,'console-molded-face',[.31,.212,.057],[0,0,0],mat.trim,.013);
 plate(n,'control-screen-frame',[.228,.108,.012],[0,.034,.032],mat.seam,.007);
 box(n,'screen-face',[.202,.081,.005],[0,.034,.040],mat.black);
 box(n,'screen-heading-rule',[.139,.008,.003],[-.021,.053,.044],mat.accent);
 const bands=row(n,'status-bars',5,[.018,.020,.003],[-.073,.014,.043],[.032,0,0],mat.green);
 let led=tube(n,'activity-light',.012,.004,[.119,-.059,.035],mat.accent,.012,20);led.rotation.x=xx;
 for(const x of [-.115,-.077,-.039]){let btn=tube(n,'keypad-key',.012,.006,[x,-.065,.038],mat.ceramic,.012,14);btn.rotation.x=xx;}
 const knob=tube(n,'selector-dial',.022,.016,[.064,-.055,.041],mat.steel,.022,25);knob.rotation.x=xx;
 box(n,'selector-datum-mark',[.003,.013,.003],[.064,-.047,.05],mat.seam);
 return {bands,led};
}
function matingStage(h,mat,g,{x=0,y=.905,z=.01,width=.45,depth=.33}={}){
 const {box,plate,row}=h;
 const stage=h.group('carriage-and-specimen-support',[x,y,z],g);
 plate(stage,'travelling-table',[width,.05,depth],[0,0,0],mat.rail,.012);
 box(stage,'workholding-insert',[width-.074,.012,depth-.06],[0,.026,0],mat.graphite);
 row(stage,'left-stage-index',11,[.006,.002,.016],[-width*.398,.032,-depth*.36],[0,0,depth*.071],mat.steel);
 row(stage,'rear-stage-index',11,[.011,.002,.006],[-width*.335,.032,-depth*.39],[width*.067,0,0],mat.steel);
 return stage;
}
function roundChuck(h,mat,g,[x,y,z],name='centred-chuck',radius=.113){
 const {tube,ring}=h;
 const q=h.group(name,[x,y,z],g);
 tube(q,'spindle-base',radius*.57,.042,[0,0,0],mat.steel);
 tube(q,'support-disc',radius,.023,[0,.029,0],mat.graphite);
 ring(q,'support-ring',radius*.86,.004,[0,.041,0],mat.steel);
 ring(q,'centering-ring',radius*.39,.002,[0,.0415,0],mat.rail);
 return q;
}
function emitter(T,h,mat,g,n,x,y0,y1,z,r1,r2,color){
 const v=basic(T,color,0);
 let o=h.tube(g,n,r1,y1-y0,[x,(y0+y1)/2,z],v,r2,32);o.visible=false;
 return {o,mat:v};
}
function accentAnimations(mat,d){
 mat.accent.emissiveIntensity=.13+.82*d;
 mat.warm.emissiveIntensity=.12+.78*d;
 mat.violet.emissiveIntensity=.13+.8*d;
}
function rotary(h,mat,g){
 const {box,plate,tube,ring,pipe,bolts}=h;
 desk(h,mat,g,1.08,.76,.74);
 const y=.785,z=.045,r=.269;
 tube(g,'spinner-bowl-base',r+.018,.035,[0,y-.019,z],mat.trim);
 tube(g,'spinner-bowl-floored-interior',r-.008,.017,[0,y,z],mat.graphite);
 ring(g,'spinner-upper-rim',r,.018,[0,y+.064,z],mat.steel);
 ring(g,'spinner-interior-recess',r*.89,.010,[0,y+.016,z],mat.rail);
 bolts(g,'spinner-bowl-flange-fasteners',14,r+.012,y+.060,z);
 const rotor=roundChuck(h,mat,g,[0,y+.043,z],'spinner-rotor',.114);
 for(const a of [-2,-.5,1.2,2.8]){const r=.074,m=box(rotor,'rotor-index-key',[.013,.003,.026],[r*Math.cos(a),.042,r*Math.sin(a)+.001],mat.brass);m.rotation.y=-a;}
 const lid=h.group('spinner-hinged-clear-lid',[0,y+.074,z-r-.016],g);
 tube(lid,'spinner-clear-lid',r-.018,.012,[0,.005,r+.016],mat.glass);
 ring(lid,'spinner-lid-ring',r-.009,.011,[0,.009,r+.016],mat.steel);
 box(lid,'spinner-lid-grip',[.11,.022,.04],[0,.029,r*1.85],mat.black);
 for(const x of [-.105,.105])box(g,'rear-lid-hinge',[.072,.042,.05],[x,y+.049,z-r-.019],mat.rail);
 const arm=h.group('swing-away-dispense-head',[-.37,y+.07,z-.19],g);
 tube(arm,'dispense-arm-post',.035,.24,[0,.12,0],mat.trim);
 pipe(arm,'dispense-arm-curved-pipe',[[0,.217,0],[.14,.254,0],[.29,.248,.06],[.37,.19,.14]],.012,mat.rail);
 tube(arm,'dispense-nozzle',.014,.047,[.37,.168,.14],mat.brass,.008);
 const c=panel(h,mat,g,[.4,.67,.408],-.25);
 const check=ring(g,'rotor-indicator-ring',.126,.0035,[0,y+.104,z],mat.warm);check.visible=false;
 return {title:'Rotary film station',seat:[0,y+.087,z],approach:[0,y+.21,.62],drive(p,d){lid.rotation.x=-1.17*doorAmount(p);arm.rotation.y=.7*(1-smoothBand(p,.45,.58));rotor.rotation.y=spin(p,3);check.visible=d>.12;c.led.material.emissiveIntensity=.2+.9*d;}};
}
function exposure(T,h,mat,g){
 const {box,plate,tube,ring,pipe,row}=h;
 desk(h,mat,g,1.16,.76,.78);
 box(g,'exposure-back-bulkhead',[1.12,.67,.064],[0,1.114,-.35],mat.trim);
 for(const x of [-.49,.49])plate(g,'exposure-frame-upright',[.12,.66,.69],[x,1.117,-.037],mat.body,.016);
 plate(g,'optical-gantry-bridge',[.94,.14,.375],[0,1.43,-.135],mat.steel,.013);
 for(const x of [-.27,.27]){
  box(g,'stage-linear-guide',[.029,.04,.55],[x,.836,.03],mat.rail);
  row(g,'encoder-index-row',13,[.013,.007,.01],[x,.86,-.23],[0,0,.041],mat.brass);
 }
 const stage=matingStage(h,mat,g,{y:.888,z:.038,width:.49,depth:.375});
 const frame=h.group('optical-assembly',null,g);
 tube(frame,'lower-exposure-head',.096,.091,[0,1.314,.01],mat.graphite,.073);
 ring(frame,'lens-mount-ring',.063,.008,[0,1.267,.01],mat.rail);
 tube(frame,'schematic-field-lens',.054,.008,[0,1.257,.01],mat.glass,.054);
 const mask=h.group('drawn-mask-frame',[0,1.067,.012],g);
 for(const x of [-.165,.165])box(mask,'mask-side-bar',[.023,.016,.275],[x,0,0],mat.brass);
 for(const z of [-.13,.13])box(mask,'mask-end-bar',[.33,.016,.021],[0,0,z],mat.brass);
 box(mask,'mask-window',[.317,.002,.257],[0,-.001,0],mat.amberGlass);
 const field=emitter(T,h,mat,g,'optical-field-not-to-scale',0,.927,1.253,.011,.046,.102,0xb3d6fa);
 const shutter=h.group('side-opening-light-shield',[-.433,1.13,.263],g);
 box(shutter,'translucent-shield',[.76,.367,.016],[.4,0,0],mat.amberGlass);
 box(shutter,'shield-lower-edge',[.76,.026,.028],[.4,-.195,0],mat.brass);
 box(shutter,'shield-handle',[.1,.023,.038],[.65,-.133,.022],mat.graphite);
 panel(h,mat,g,[.36,.982,.408],-.12);
 pipe(g,'exposure-head-cable',[[.08,1.37,-.09],[.2,1.49,-.16],[.39,1.43,-.2],[.43,1.14,-.28]],.012,mat.black);
 return {title:'Open optical patterning station',seat:[0,.923,.04],approach:[0,1.055,.62],drive(p,d){shutter.rotation.y=-1.38*doorAmount(p);stage.position.z=.038+.105*doorAmount(p)*(1-smoothBand(p,.25,.32));field.o.visible=d>.07;field.mat.opacity=.24*d;mask.position.y=1.067-.035*d;}};
}
function chamber(T,h,mat,g,effect){
 const {box,plate,tube,ring,pipe,bolts}=h;
 const removal=effect==='etch',y=.78,d=.81,r=.24;
 desk(h,mat,g,1.11,d,y);
 const body=h.group(removal?'open-plasma-teaching-chamber':'open-film-teaching-chamber',[-.13,0,0],g);
 const side=(n,radius,lo,hi,m)=>{const o=piece(T,body,n,new T.CylinderGeometry(radius,radius,hi-lo,48,1,true,xx,Math.PI),m,[0,(hi+lo)/2,.015]);return o;};
 tube(body,'chamber-base-flange',r+.066,.07,[0,.832,.015],mat.steel);
 tube(body,'chamber-floor',r+.012,.035,[0,.872,.015],mat.graphite);
 side('open-back-chamber-wall',r,.871,1.242,removal?mat.glass:mat.trim);
 ring(body,'side-wall-seal',r,.012,[0,.899,.015],mat.rail,{arc:Math.PI,front:Math.PI});
 ring(body,'upper-circular-flange',r+.012,.018,[0,1.254,.015],mat.steel);
 bolts(body,'upper-flange-fasteners',12,r+.021,1.268,.015);
 tube(body,'upper-source-flange',r-.013,.038,[0,1.282,.015],mat.trim);
 tube(body,'upper-process-head',removal?.076:.148,.076,[0,1.218,.015],removal?mat.ceramic:mat.brass);
 if(removal){
  const n=64,pts=Array.from({length:n+1},(_,i)=>{const u=i/n,t=3.7*tt*u;return [.122*Math.cos(t),1.28+.21*u,.015+.122*Math.sin(t)];});
  pipe(body,'schematic-source-coil',pts,.010,mat.copper);
  tube(body,'schematic-source-feedthrough',.09,.056,[0,1.493,.015],mat.graphite);
 }else{
  const n=8;
  for(let i=0;i<n;i++){let a=tt*i/n;tube(body,'source-face-subdivision',.018,.01,[.093*Math.cos(a),1.176,.015+.093*Math.sin(a)],mat.warm,.018,20);}
 }
 const rotor=roundChuck(h,mat,body,[0,.909,.015],'chamber-specimen-stage',.11);
 const exhaust=tube(g,'under-bench-chamber-connection',.045,.29,[.28,.945,-.224],mat.rail);exhaust.rotation.z=-xx;
 pipe(g,'rear-service-return',[[.17,1.21,-.155],[.39,1.21,-.245],[.43,1,-.22],[.43,.77,-.19]],.033,mat.rail);
 const door=h.group('split-view-chamber-door',[-r-.022,.858,.19],body);
 box(door,'gate-edge-teaching-section',[.026,.34,.022],[.024,.18,0],mat.steel);
 box(door,'partial-window',[.295,.321,.012],[.175,.182,0],mat.glass);
 box(door,'gate-edge-handle',[.028,.081,.042],[.318,.18,.018],mat.brass);
 const f=emitter(T,h,mat,body,removal?'abstract-removal-zone':'abstract-film-zone',0,.956,removal?1.230:1.175,.015,.058,.11,removal?0x96c0f0:0xffca7d);
 panel(h,mat,g,[.38,1.125,.305],-.13);
 const marker=ring(body,'source-state-indicator',removal?.082:.158,.003,[0,1.173,.015],removal?mat.violet:mat.warm);
 return {title:removal?'Open removal chamber':'Open film chamber',seat:[-.13,.953,.015],approach:[-.13,1.026,.625],drive(p,a){door.rotation.y=-1.38*doorAmount(p);f.o.visible=a>.03;f.mat.opacity=.25*a;marker.visible=a>.1;rotor.rotation.y=spin(p,removal?1:2);}};
}
function wetStation(T,h,mat,g,effect){
 const {box,plate,tube,ring,pipe}=h;
 const dye=basic(T,effect==='clean'?0x5ebeb1:0x7eabc4,.22),Cx=-.13,Cz=.021,wy=.817,y=.91;
 desk(h,mat,g,1.27,.8,.72);
 box(g,'wet-bench-back-wall',[1.16,.47,.044],[0,1.031,-.37],mat.body);
 box(g,'view-through-shallow-sash',[.68,.45,.015],[-.175,1.28,.337],mat.glass);
 for(const x of [-.53,.19])box(g,'sash-side-frame',[.034,.565,.035],[x,1.243,.337],mat.rail);
 plate(g,'wet-station-header',[.85,.092,.119],[-.16,1.489,.318],mat.steel,.008);
 box(g,'open-basin-floor',[.52,.03,.38],[Cx,.768,Cz],mat.graphite);
 for(const x of [Cx-.266,Cx+.266])box(g,'basin-side-lip',[.024,.126,.42],[x,.831,Cz],mat.steel);
 for(const z of [Cz-.20,Cz+.20])box(g,'basin-end-lip',[.556,.105,.022],[Cx,.817,z],mat.steel);
 const pool=box(g,'symbolic-liquid-surface',[.497,.005,.372],[Cx,wy,Cz],dye);
 for(let i=0;i<4;i++)box(g,'inert-carrier-rail',[.37,.013,.021],[Cx,.872,Cz+(.047*(i-1.5))],mat.rail);
 for(const x of [Cx-.16,Cx+.16])box(g,'inert-carrier-corner-stop',[.028,.044,.032],[x,.879,Cz-.155],mat.brass);
 const f=h.group('short-rinse-head-group',[.203,1.27,-.25],g);
 tube(f,'rinse-support-post',.018,.35,[0,-.18,0],mat.steel);
 pipe(f,'rinse-head-bend',[[0,0,0],[-.078,.037,.04],[-.229,.037,.25],[-.23,-.003,.25]],.013,mat.steel);
 tube(f,'rinse-head-tip',.021,.049,[-.23,-.01,.25],mat.rail);
 panel(h,mat,g,[.447,1.022,.316],-.11);
 const wave=ring(g,'abstract-liquid-activity-ring',.12,.003,[Cx,wy+.008,Cz],mat.accent);wave.visible=false;
 return {title:effect==='clean'?'Open rinse and handling bench':'Open wet-removal bench',seat:[Cx,.883,Cz],approach:[Cx,1.007,.61],drive(p,a){wave.visible=a>.07;wave.scale.setScalar(.9+.17*Math.sin(38*p));dye.opacity=.18+.24*a;pool.position.y=wy+(a>.01?.001*Math.sin(22*p):0);}};
}
function singulation(T,h,mat,g,variant){
 const {box,plate,tube,ring,pipe,row}=h;
 desk(h,mat,g,1.28,.82,.76);
 const gantry=h.group('linear-bridge-gantry',[0,0,0],g);
 for(const x of [-.49,.49]){
  box(g,'lower-linear-track',[.057,.041,.57],[x,.807,.004],mat.rail);
  row(g,'gantry-scale-fiducials',12,[.021,.004,.010],[x,.829,-.27],[0,0,.048],mat.steel);
  box(gantry,'upper-gantry-side',[.091,.38,.119],[x,1.057,-.039],mat.trim);
 }
 plate(gantry,'cross-gantry',[1.03,.105,.159],[0,1.238,-.039],mat.steel,.014);
 box(gantry,'carriage-drive',[.24,.09,.077],[.054,1.174,.044],mat.graphite);
 const stage=matingStage(h,mat,g,{y:.878,z:.013,width:.61,depth:.429});
 for(let i=0;i<7;i++)box(stage,'hold-down-stage-groove',[.011,.002,.296],[(i-3)*.065,.033,.001],mat.black);
 const head=h.group('adjustable-protected-head',[0,1.075,.055],gantry);
 plate(head,'protected-head-motor',[.172,.149,.175],[0,.01,0],mat.trim,.013);
 let wheel=null,ray=null;
 const wheelPivot=variant==='wheel'?h.group('wheel-axle-centre',[0,-.075,.045],head):null;
 if(variant==='optical'){
  tube(head,'schematic-optical-tip',.033,.084,[0,-.09,.032],mat.rail,.026);
  ray=emitter(T,h,mat,g,'indicative-optical-path',0,.913,1.008,.08,.003,.009,0xff9a87);
 }else if(variant==='flat'){
  tube(head,'demonstration-vertical-spindle',.039,.07,[0,-.076,.016],mat.steel);
  wheel=tube(head,'flat-finishing-disc',.141,.025,[0,-.121,.016],mat.glass,.141,48);
  ring(head,'finishing-disc-edge',.138,.004,[0,-.128,.016],mat.ceramic);
 }else{
  wheel=tube(wheelPivot,'guarded-sectioned-wheel',.082,.009,[0,0,0],mat.rail,.082,48);wheel.geometry.rotateZ(xx);
  for(const a of [.28,2.38,4.48])box(wheelPivot,'wheel-visible-index',[.003,.010,.018],[-.005,.063*Math.cos(a),.063*Math.sin(a)],mat.ceramic).rotation.x=a;
  ring(head,'front-wheel-outline',.084,.003,[-.006,-.075,.045],mat.steel,{upright:true}).rotation.y=xx;
  const guard=piece(T,head,'sectioned-safety-guard',new T.CylinderGeometry(.098,.098,.048,32,1,true,Math.PI*.5,Math.PI*1.27),mat.glass,[0,-.079,.045]);guard.rotation.z=xx;
 }
 box(g,'right-transparent-guard',[.018,.434,.505],[.566,1.073,.015],mat.glass);
 panel(h,mat,g,[.405,.742,.431],-.16);
 return {title:variant==='optical'?'Open precision optical singulation deck':variant==='flat'?'Open surface-finishing deck':'Open sectioned singulation deck',seat:[0,.913,.013],approach:[0,1.041,.64],drive(p,d){gantry.position.z=.12*(1-smoothBand(p,.41,.57));head.position.x=.10*Math.sin((p-.57)*tt*2)*d;if(wheelPivot)wheelPivot.rotation.x=spin(p,4);else if(wheel)wheel.rotation.y=spin(p,3);if(ray){ray.o.visible=d>.08;ray.o.position.x=head.position.x;ray.o.position.z=.08+gantry.position.z;ray.mat.opacity=.54*d;}}};
}
function jointing(h,mat,g){
 const {box,plate,tube,ring,pipe}=h;
 bench(h,mat,g,1.21,.72,.725);
 const y=.772;
 matingStage(h,mat,g,{y,z:.06,width:.44,depth:.32});
 for(const x of [-.16,.16])for(const z of [-.031,.151])box(g,'assembly-clamp-corner',[.037,.022,.039],[x,y+.04,z],mat.brass);
 tube(g,'placement-post',.044,.39,[.312,.943,-.177],mat.rail);
 const boom=h.group('swing-bench-placement-arm',[.312,1.135,-.177],g);
 tube(boom,'arm-joint',.072,.083,[0,0,0],mat.graphite);
 plate(boom,'tooling-bridge',[.335,.059,.107],[-.134,0,.108],mat.steel,.011);
 const gripper=h.group('lowerable-pickup-head',[-.293,-.08,.235],boom);
 tube(gripper,'pickup-barrel',.052,.118,[0,0,0],mat.trim,.043);
 tube(gripper,'pickup-end',.02,.069,[0,-.092,0],mat.steel,.013);
 for(const x of [-.03,.03])box(gripper,'jaw-guide',[.014,.048,.026],[x,-.091,0],mat.brass);
 pipe(g,'instrument-return-cable',[[.318,1.125,-.194],[.39,1.159,-.24],[.49,1.053,-.25],[.48,.756,-.25]],.012,mat.black);
 panel(h,mat,g,[-.412,.922,-.106],-.17);
 return {title:'Dry placement and assembly fixture',seat:[0,.807,.06],approach:[0,.946,.555],drive(p,d){boom.rotation.y=.97*(1-smoothBand(p,.31,.52))+.7*smoothBand(p,.81,1);gripper.position.y=-.08-.092*d;}};
}
function inspection(h,mat,g,electric){
 const {box,plate,tube,ring,pipe,row}=h;
 bench(h,mat,g,1.24,.78,.748);
 matingStage(h,mat,g,{y:.796,z:.037,width:.478,depth:.313});
 const monitor=panel(h,mat,g,[.453,1.147,-.18],-.08);
 box(g,'monitor-upright',[.04,.30,.042],[.449,.924,-.201],mat.rail);
 if(electric){
  const probes=[];
  for(const x of [-.285,.285]){
   const dir=Math.sign(x),rig=h.group('independent-probe-positioner',[x,.78,-.01],g);
   plate(rig,'probe-magnetic-base',[.143,.047,.16],[0,.024,0],mat.graphite,.007);
   tube(rig,'micropositioner-post',.025,.232,[0,.139,-.041],mat.rail);
   const arm=h.group('inspection-probe-carriage',[0,.243,-.041],rig);
   box(arm,'micropositioner-bar',[.182,.031,.049],[-dir*.064,0,.01],mat.trim);
   const tip=pipe(arm,'dry-probe-needle',[[-dir*.14,0,.01],[-dir*.176,-.042,.037],[-dir*.193,-.099,.061]],.006,mat.brass);
   pipe(rig,'probe-return-lead',[[0,.19,-.05],[dir*.085,.19,-.126],[dir*.097,.089,-.245],[dir*.150,.084,-.241]],.009,dir<0?mat.copper:mat.green);
   probes.push(arm);
  }
  return {title:'Dry electrical inspection fixture',seat:[0,.831,.037],approach:[0,.974,.574],drive(p,d){probes.forEach(arm=>arm.position.y=.243-.074*d);monitor.led.material.emissiveIntensity=.2+d;}};
 }
 const head=h.group('optical-inspection-stand',[-.077,0,-.026],g);
 tube(head,'microscope-support-column',.054,.414,[0,1.006,-.218],mat.rail);
 plate(head,'focus-drive-housing',[.187,.152,.185],[0,1.192,-.14],mat.trim,.014);
 box(head,'microscope-bridge',[.12,.067,.23],[0,1.206,-.047],mat.steel);
 const lens=h.group('focus-objective',[.077,1.143,.055],head);
 tube(lens,'objective',.059,.109,[0,0,0],mat.graphite,.042);
 tube(lens,'lower-objective-collar',.047,.017,[0,-.06,0],mat.brass);
 ring(lens,'objective-lens',.025,.009,[0,-.073,0],mat.glass);
 const l=ring(g,'inspection-illumination-ring',.057,.003,[0,.838,.037],mat.accent);l.visible=false;
 const knob=tube(head,'focus-knob',.051,.022,[.112,1.171,-.114],mat.black,.051,24);knob.rotation.z=xx;
 return {title:'Optical inspection fixture',seat:[0,.831,.037],approach:[0,.943,.582],drive(p,d){lens.position.y=1.143-.111*d;l.visible=d>.04;monitor.led.material.emissiveIntensity=.2+d;}};
}
function thermal(T,h,mat,g,hot){
 const {box,plate,tube,ring,row}=h;
 const dye=basic(T,0xf8ac72,0);
 if(hot){
  bench(h,mat,g,1.16,.76,.725);
  plate(g,'ceramic-hotplate-body',[.58,.13,.508],[0,.815,-.015],mat.trim,.014);
  box(g,'display-only-ceramic-centre',[.49,.021,.428],[0,.886,-.015],mat.ceramic);
  const e=ring(g,'hotplate-teaching-heat-indicator',.16,.005,[0,.899,-.015],mat.warm);e.visible=false;
  panel(h,mat,g,[.37,.804,.318],-.13);
  return {title:'Dry thermal plate demonstrator',seat:[0,.898,-.015],approach:[0,1.05,.593],drive(p,d){e.visible=d>.06;}};
 }
 desk(h,mat,g,1.29,.77,.758);
 const z=-.045,y=1.05;
 for(const x of [-.329,.329])box(g,'oven-insulating-wall',[.058,.51,.564],[x,y,z],mat.ceramic);
 box(g,'oven-rear-insulation',[.66,.52,.051],[0,y,z-.266],mat.ceramic);
 plate(g,'thermal-enclosure-header',[.76,.10,.58],[0,1.354,z],mat.body,.019);
 box(g,'chamber-ceramic-floor',[.62,.036,.51],[0,.801,z],mat.ceramic);
 const shelf=matingStage(h,mat,g,{y:.91,z:-.041,width:.49,depth:.395});
 row(g,'shelf-guide-rails',4,[.035,.025,.48],[-.236,.868,-.068],[.157,0,0],mat.rail);
 const door=h.group('sectioned-thermal-swing-shield',[-.368,1.054,.246],g);
 for(const xc of [.017,.702]) box(door,'shield-vertical-rim',[.025,.486,.024],[xc,0,0],mat.steel);
 for(const yc of [-.228,.228])box(door,'shield-horizontal-rim',[.703,.028,.034],[.359,yc,0],mat.steel);
 box(door,'clear-inspection-substitute',[.658,.422,.009],[.36,0,0],mat.amberGlass);
 box(door,'thermal-latch-handle',[.036,.099,.064],[.686,-.01,.037],mat.graphite);
 const rad=box(g,'symbolic-backwall-thermal-state',[.477,.313,.004],[0,1.085,-.285],dye);rad.visible=false;
 panel(h,mat,g,[.508,1.106,.313],-.11);
 return {title:'Open thermal enclosure',seat:[0,.944,-.041],approach:[0,1.022,.655],drive(p,d){door.rotation.y=-1.53*doorAmount(p);rad.visible=d>.03;dye.opacity=.31*d;shelf.position.z=-.041+.075*doorAmount(p)*(1-smoothBand(p,.25,.32));}};
}
function receive(h,mat,g,recordOnly){
 const {box,plate,row}=h;
 bench(h,mat,g,.98,.683,.725);
 if(recordOnly){
  const c=h.group('open-document-receiving-lip',[0,.769,.019],g);
  plate(c,'empty-receipt-holder',[.47,.038,.325],[0,0,0],mat.graphite,.011);
  for(const x of [-.213,.213])box(c,'documentation-holder-lip',[.022,.045,.33],[x,.021,0],mat.trim);
  row(c,'empty-fixture-edge-markers',4,[.042,.004,.009],[-.101,.022,-.109],[.067,0,0],mat.brass);
 }else{
  const tray=h.group('receiving-tray',[0,.776,.052],g);
  plate(tray,'receive-fixture-platform',[.54,.047,.393],[0,0,0],mat.rail,.012);
  box(tray,'non-process-workpiece-seat',[.442,.014,.279],[0,.027,0],mat.graphite);
  for(const x of [-.234,.234])box(tray,'receiving-tray-side-rail',[.023,.042,.38],[x,.033,0],mat.steel);
  for(const z of [-.176,.177])box(tray,'receiving-tray-edge-stop',[.49,.027,.018],[0,.027,z],mat.steel);
  row(tray,'receiving-edge-warning-inlay',5,[.042,.002,.01],[-.160,.041,-.174],[.079,0,0],mat.brass);
 }
 return {title:recordOnly?'Document receiving fixture':'Inert receiving fixture',seat:[0,.811,.052],approach:[0,.958,.589],drive(){}};
}
const known=new Set(['coat','pattern','deposit','etch','dice','assemble','measure','clean','heat','polish','release','transfer-film','fill','plate','dry','grind']);
export function makeTeachingMachine(THREE,effect,opts={}){
 if(!THREE?.Group||!THREE?.MeshStandardMaterial)throw new TypeError('A compatible Three module is required.');
 opts=opts??{};
 const group=new THREE.Group(),mat=materials(THREE),h=helper(THREE,group,mat);
 const op=(String(opts.operation??'')+' '+String(opts.variant??'')+' '+String(opts.title??'')).toLowerCase();
 let item=null,key=effect;
 const authoredTransform=['release','dice','assemble','transfer-film','fill'].includes(key);
 if(opts.blocked||opts.nonphysical||opts.unknown||opts.kind==='handoff'&&!authoredTransform||!known.has(key))key='handoff';
 switch(key){
  case 'coat':item=rotary(h,mat,group);break;
  case 'pattern':item=exposure(THREE,h,mat,group);break;
  case 'deposit':item=/electroplat|dealloy|\bplating\b|immersion/.test(op)?wetStation(THREE,h,mat,group,'coat'):chamber(THREE,h,mat,group,'deposit');break;
  case 'etch':item=/(\bwet\b|liquid|lift.?off|solvent|dissolv|immersion|dealloy|removal of silver)/.test(op)?wetStation(THREE,h,mat,group,'etch'):chamber(THREE,h,mat,group,'etch');break;
  case 'fill':item=chamber(THREE,h,mat,group,'deposit');break;
  case 'plate':item=wetStation(THREE,h,mat,group,'coat');break;
  case 'release':item=/(\bwet\b|liquid|solvent|dissolv|immersion|water)/.test(op)?wetStation(THREE,h,mat,group,'etch'):jointing(h,mat,group);break;
  case 'transfer-film':item=jointing(h,mat,group);break;
  case 'polish':case 'grind':item=singulation(THREE,h,mat,group,'flat');break;
  case 'dry':item=thermal(THREE,h,mat,group,false);break;
  case 'dice':item=singulation(THREE,h,mat,group,/(laser|optical)/.test(op)?'optical':/(polish|lap |grind|thin)/.test(op)?'flat':'wheel');break;
  case 'assemble':item=jointing(h,mat,group);break;
  case 'measure':item=inspection(h,mat,group,/(impedance|volt|current|\beis\b|electrical|continuity|acquisition|resistance|short|open circuit)/.test(op));break;
  case 'clean':item=wetStation(THREE,h,mat,group,'clean');break;
  case 'heat':item=thermal(THREE,h,mat,group,/(hot.?plate|prebake|soft.?bake)/.test(op));break;
  default:item=receive(h,mat,group,!!opts.nonphysical);break;
 }
 const kind=key==='handoff'?'receiving-fixture':'teaching-machine';
 group.name='bts-'+kind+'-'+key;
 group.userData={kind,effect:key,title:item.title,units:'m',front:'+Z',provenance:'Original teaching geometry; not Equipment Register geometry or a verified process configuration.'};
 group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const animate=(progress,{reducedMotion=false}={})=>{
  let p=clamp(progress);
  if(reducedMotion)p=p<=.16?0:p<=.32?.28:p<=.57?.52:p<=.81?.68:1;
  const d=kind==='receiving-fixture'?0:runAmount(p);
  accentAnimations(mat,d);
  item.drive(p,d);
  return p;
 };
 animate(0);
 let disposed=false;
 function dispose(){
  if(disposed)return;disposed=true;
  const geos=new Set(),mats=new Set(Object.values(mat).filter(x=>x?.isMaterial));
  group.traverse(n=>{
   if(n.geometry)geos.add(n.geometry);
   if(n.material)for(const m of [].concat(n.material))mats.add(m);
   if(n.isInstancedMesh)n.dispose();
  });
  geos.forEach(g=>g.dispose());mats.forEach(m=>m?.dispose());group.clear();
 }
 return {group,kind,title:item.title,approach:new THREE.Vector3(...item.approach),seat:new THREE.Vector3(...item.seat),animate,dispose};
}
