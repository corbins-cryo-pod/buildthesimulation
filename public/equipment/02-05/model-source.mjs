// Editable meter-scale model source. All chassis dimensions are photo-derived estimates; 76.2 mm holder tables and 10 mm sample are explicit scale anchors.
export function buildParts(){
 const p=[],group=(name,parent,position=[0,0,0])=>p.push({name,parent,position}),add=(name,parent,type,position,scale,material,rotation)=>p.push({name,parent,type,position,scale,material,rotation}),box=(n,g,pos,s,m)=>add(n,g,'box',pos,s,m),cyl=(n,g,pos,s,m,q)=>add(n,g,'cylinder',pos,s,m,q),qx=a=>[Math.sin(a/2),0,0,Math.cos(a/2)],qz=a=>[0,0,Math.sin(a/2),Math.cos(a/2)];
 const root='instrument',white='ivory',steel='steel',dark='charcoal',gray='gray',orange='orange',black='black';
 const pipe=(n,g,a,b,r,m=steel)=>{const v=b.map((x,i)=>x-a[i]),l=Math.hypot(...v),d=v.map(x=>x/l),q=d[1]<-.999999?[1,0,0,0]:[d[2],0,-d[0],1+d[1]],qn=Math.hypot(...q);cyl(n,g,a.map((x,i)=>(x+b[i])/2),[r*2,l,r*2],m,q.map(x=>x/qn));};
 group(root,null);
 box('plinth',root,[0,.38,0],[1.68,.66,1.20],white);
 box('lower-skirt',root,[0,.12,0],[1.69,.22,1.21],gray);
 box('base-footing',root,[0,.035,0],[1.61,.07,1.12],dark);
 box('deck',root,[0,.76,0],[1.76,.11,1.28],white);
 box('deck-gasket',root,[0,.699,0],[1.72,.018,1.24],black);
 // Brand-colored fascia stripe, no proprietary decal.
 pipe('stripe-left',root,[-.84,.49,.606],[-.57,.49,.606],.006,orange);
 pipe('stripe-diagonal',root,[-.57,.49,.606],[-.29,.22,.606],.006,orange);
 pipe('stripe-front',root,[-.29,.22,.606],[.84,.22,.606],.006,orange);
 pipe('stripe-right',root,[.845,.22,.60],[.845,.22,-.60],.006,orange);
 for(let i=0;i<4;i++)cyl('plinth-fastener-'+i,root,[-.65+i*.42,.60,.609],[.018,.012,.018],dark,qx(Math.PI/2));
 group('chamber',root,[-.31,.81,.12]);
 box('chamber-floor','chamber',[0,.045,0],[.77,.09,.68],steel);
 box('chamber-back','chamber',[0,.25,-.31],[.76,.42,.06],white);
 box('chamber-left','chamber',[-.35,.25,0],[.06,.42,.65],white);
 box('chamber-right','chamber',[.35,.25,0],[.06,.42,.65],white);
 group('chamber-cover','chamber');
 box('chamber-front','chamber-cover',[0,.25,.32],[.77,.42,.06],white);
 box('chamber-top','chamber-cover',[0,.49,0],[.80,.07,.71],white);
 cyl('front-flange','chamber-cover',[-.02,.27,.367],[.27,.035,.27],steel,qx(Math.PI/2));
 cyl('flange-inner','chamber-cover',[-.02,.27,.389],[.226,.012,.226],gray,qx(Math.PI/2));
 for(let i=0;i<8;i++){let a=i*Math.PI/4;cyl('flange-bolt-'+i,'chamber-cover',[-.02+.112*Math.cos(a),.27+.112*Math.sin(a),.4],[.012,.018,.012],dark,qx(Math.PI/2));}
 group('xy-stage','chamber',[0,.14,0]);
 box('stage-base','chamber',[0,.105,0],[.60,.065,.52],dark);
 box('x-rail-a','chamber',[0,.15,-.20],[.58,.025,.035],steel);
 box('x-rail-b','chamber',[0,.15,.20],[.58,.025,.035],steel);
 box('stage-carriage','xy-stage',[0,.04,0],[.43,.08,.40],steel);
 for(let i=0;i<2;i++)box('interferometer-'+i,'chamber',[-.26+i*.52,.23,-.21],[.09,.11,.10],dark);
 group('column',root,[-.31,1.30,-.04]);
 cyl('objective-lower','column',[0,-.09,0],[.14,.18,.14],steel);
 cyl('objective-flange','column',[0,.045,0],[.27,.055,.27],steel);
 cyl('lower-tube','column',[0,.18,0],[.14,.22,.14],steel);
 cyl('deflection-yoke','column',[0,.32,0],[.29,.15,.29],dark);
 cyl('intermediate-flange','column',[0,.42,0],[.25,.045,.25],steel);
 cyl('upper-tube','column',[0,.58,0],[.16,.29,.16],steel);
 cyl('lens-coil','column',[0,.69,0],[.25,.11,.25],gray);
 cyl('gun-cylinder','column',[0,.89,0],[.19,.30,.19],steel);
 cyl('gun-cap','column',[0,1.045,0],[.22,.04,.22],dark);
 box('upper-electronics','column',[.18,.92,-.03],[.22,.19,.26],dark);
 box('deflection-electronics','column',[-.12,.42,.09],[.20,.13,.20],dark);
 for(let i=0;i<4;i++){box('coil-module-'+i,'column',[(i%2?1:-1)*.115,.54+Math.floor(i/2)*.12,.13],[.12,.08,.15],gray);}
 for(let i=0;i<4;i++){const x=-.12+i*.075;pipe('gun-cable-'+i,'column',[x,1.06,0],[x-.04,1.15,-.15],.009,i===1?'green':black);pipe('gun-cable-down-'+i,'column',[x-.04,1.15,-.15],[x-.12,.61,-.23],.009,black);}
 box('loadlock-support',root,[.35,1.13,.01],[.27,.66,.40],white);
 group('loadlock',root,[.36,1.54,.20]);
 box('lock-back','loadlock',[0,0,-.15],[.38,.55,.045],white);
 box('lock-left','loadlock',[-.18,0,0],[.04,.55,.33],white);
 box('lock-right','loadlock',[.18,0,0],[.04,.55,.33],white);
 box('lock-ceiling','loadlock',[0,.275,0],[.40,.04,.34],white);
 box('lock-floor','loadlock',[0,-.275,0],[.40,.04,.34],steel);
 for(let i=0;i<10;i++)box('cassette-slot-'+(i+1),'loadlock',[0,.225-i*.05,0],[.326,.009,.29],steel);
 group('lock-door','loadlock',[-.20,0,.175]);
 box('lock-door-panel','lock-door',[.20,0,.025],[.40,.56,.06],white);
 box('door-gasket','lock-door',[.20,0,-.011],[.36,.50,.018],dark);
 for(let i=0;i<2;i++){cyl('door-cover-'+i,'lock-door',[.21,.09-i*.18,.063],[.10,.018,.10],gray,qx(Math.PI/2));cyl('hinge-'+i,'loadlock',[-.20,.17-i*.34,.18],[.055,.12,.055],steel);}
 pipe('handle-top','lock-door',[.36,.12,.06],[.36,.12,.115],.012,dark);pipe('handle','lock-door',[.36,.12,.115],[.36,-.12,.115],.012,dark);pipe('handle-bottom','lock-door',[.36,-.12,.115],[.36,-.12,.06],.012,dark);
 box('transfer-housing',root,[.55,1.02,.34],[.38,.37,.49],white);
 box('transfer-housing-lid',root,[.55,1.23,.34],[.41,.09,.52],white);
 cyl('pump-port',root,[.34,.97,.245],[.16,.045,.16],steel,qx(Math.PI/2));
 pipe('vacuum-tube-a',root,[.34,.97,.28],[.23,.91,.38],.024);
 pipe('vacuum-tube-b',root,[.23,.91,.38],[.18,1.35,.35],.024);
 pipe('vacuum-tube-c',root,[.18,1.35,.35],[.18,1.68,.15],.021);
 for(let i=0;i<4;i++){pipe('service-line-'+i,root,[-.55+i*.07,1.33,.18],[-.74+i*.05,1.55,-.13],.011,i===0?'green':steel);pipe('service-line-back-'+i,root,[-.74+i*.05,1.55,-.13],[-.63+i*.05,1.91,-.35],.011,black);}
 group('vacuum-cabinet',root,[.84,0,-.83]);
 box('cabinet-body','vacuum-cabinet',[0,1.02,0],[.85,2.04,.58],white);
 box('cabinet-foot','vacuum-cabinet',[0,.035,0],[.86,.07,.59],gray);
 for(let i=0;i<2;i++){
  box('cabinet-door-'+i,'vacuum-cabinet',[-.21+i*.42,1.04,.30],[.407,1.93,.025],white);
  box('vent-panel-'+i,'vacuum-cabinet',[-.21+i*.42,1.83,.32],[.25,.23,.025],gray);
  for(let j=0;j<9;j++)box('vent-'+i+'-'+j,'vacuum-cabinet',[-.21+i*.42,1.74+j*.022,.34],[.22,.009,.018],dark);
  box('cabinet-handle-'+i,'vacuum-cabinet',[-.04+i*.16,1.03,.34],[.025,.18,.04],dark);
 }
 group('vacuum-touchscreen',root,[.78,1.60,-.43]);
 box('console-bracket','vacuum-touchscreen',[0,-.10,-.10],[.11,.30,.18],steel);
 box('display-bezel','vacuum-touchscreen',[0,0,0],[.37,.31,.09],white);
 box('display-glass','vacuum-touchscreen',[0,0,.05],[.30,.23,.012],black);
 for(let i=0;i<3;i++)for(let j=0;j<4;j++)box('display-indicator-'+i+'-'+j,'vacuum-touchscreen',[-.105+j*.07,-.065+i*.065,.059],[.04,.028,.004],(i+j)%3===0?'orange':'green');
 cyl('emergency-stop','vacuum-touchscreen',[.02,-.23,.02],[.055,.04,.055],'red',qx(Math.PI/2));
 group('status-lamp',root,[.49,2.11,-.55]);cyl('lamp-pole','status-lamp',[0,.12,0],[.026,.24,.026],steel);
 for(let i=0;i<3;i++)cyl('lamp-'+i,'status-lamp',[0,.26+i*.055,0],[.045,.052,.045],['green','orange','red'][i]);
 // 4 x 3 inch holder: table diameters known, frame spacing and clamp form inferred.
 group('sample-holder',root,[.36,1.665,.20]);
 box('holder-frame','sample-holder',[0,0,0],[.195,.013,.205],steel);
 for(let i=0;i<4;i++){
  const x=(i%2-.5)*.088,z=(Math.floor(i/2)-.5)*.088;
  cyl('table-'+(i+1),'sample-holder',[x,.009,z],[.0762,.012,.0762],gray);
  for(let k=0;k<3;k++){const a=k*2*Math.PI/3+.4;box('table-clip-'+i+'-'+k,'sample-holder',[x+.035*Math.cos(a),.022,z+.035*Math.sin(a)],[.013,.009,.009],steel);}
 }
 box('reference-chip','sample-holder',[-.081,.014,-.093],[.012,.005,.010],black);
 box('sample-chip','sample-holder',[-.044,.017,-.044],[.010,.001,.010],'wafer');
 box('resist-layer','sample-holder',[-.044,.0176,-.044],[.010,.0002,.010],'resist');
 group('beam-indicator',root,[-.31,1.18,-.04]);
 cyl('beam-path','beam-indicator',[0,-.08,0],[.004,.16,.004],'beam');
 return p;
}
export const materials={"ivory":[0.84,0.85,0.82],"steel":[0.54,0.58,0.61],"gray":[0.3,0.34,0.36],"charcoal":[0.13,0.15,0.16],"black":[0.025,0.035,0.04],"orange":[0.95,0.3,0.035],"green":[0.1,0.65,0.24],"red":[0.75,0.04,0.04],"wafer":[0.18,0.24,0.3],"resist":[0.48,0.32,0.69],"beam":[0.15,0.8,1]};
export function generateGltf(parts,materials){
 const g={asset:{version:'2.0',generator:'BuildTheSimulation 02-05 parametric reconstruction'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],buffers:[],bufferViews:[],accessors:[]},bytes=[];
 const mKeys=Object.keys(materials);g.materials=mKeys.map(n=>({name:n,pbrMetallicRoughness:{baseColorFactor:[...materials[n],1],metallicFactor:n==='steel'?.65:n==='gray'?.25:0,roughnessFactor:n==='steel'?.31:.63},...(n==='beam'?{emissiveFactor:[.1,.7,1]}:{})}));
 function buf(arr,type,kind,count,min,max){
 while(bytes.length%4)bytes.push(0);
 const offset=bytes.length;let a=type===5126?new Float32Array(arr):new Uint16Array(arr);bytes.push(...new Uint8Array(a.buffer));
 const bv=g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:a.byteLength,target:kind==='SCALAR'?34963:34962})-1;
 return g.accessors.push({bufferView:bv,componentType:type,count,type:kind,...(min?{min,max}:{})})-1;
 }
 const pos=[],nor=[],idx=[];
 function face(v,n){const i=pos.length/3;v.forEach(x=>{pos.push(...x);nor.push(...n)});idx.push(i,i+1,i+2,i,i+2,i+3);}
 const h=.5;
 face([[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]],[0,0,1]);face([[h,-h,-h],[-h,-h,-h],[-h,h,-h],[h,h,-h]],[0,0,-1]);face([[h,-h,h],[h,-h,-h],[h,h,-h],[h,h,h]],[1,0,0]);face([[-h,-h,-h],[-h,-h,h],[-h,h,h],[-h,h,-h]],[-1,0,0]);face([[-h,h,h],[h,h,h],[h,h,-h],[-h,h,-h]],[0,1,0]);face([[-h,-h,-h],[h,-h,-h],[h,-h,h],[-h,-h,h]],[0,-1,0]);
 const acc=(p,n,i)=>({attributes:{POSITION:buf(p,5126,'VEC3',p.length/3,[-.5,-.5,-.5],[.5,.5,.5]),NORMAL:buf(n,5126,'VEC3',n.length/3)},indices:buf(i,5123,'SCALAR',i.length)});
 const box=acc(pos,nor,idx);pos.length=nor.length=idx.length=0;
 const N=32;
 for(let j=0;j<N;j++){const a=j*2*Math.PI/N,b=(j+1)*2*Math.PI/N,A=[Math.cos(a),0,Math.sin(a)],B=[Math.cos(b),0,Math.sin(b)],i=pos.length/3;pos.push(A[0]/2,-h,A[2]/2,A[0]/2,h,A[2]/2,B[0]/2,h,B[2]/2,B[0]/2,-h,B[2]/2);nor.push(...A,...A,...B,...B);idx.push(i,i+1,i+2,i,i+2,i+3);for(const y of [-h,h]){const k=pos.length/3;pos.push(0,y,0,A[0]/2,y,A[2]/2,B[0]/2,y,B[2]/2);for(let q=0;q<3;q++)nor.push(0,Math.sign(y),0);idx.push(...(y>0?[k,k+2,k+1]:[k,k+1,k+2]));}}
 const cylinder=acc(pos,nor,idx),meshIds=new Map();
 for(const p of parts){const n={name:p.name,translation:p.position};if(p.type){const key=p.type+'-'+p.material;if(!meshIds.has(key))meshIds.set(key,g.meshes.push({name:key,primitives:[{...(p.type==='box'?box:cylinder),material:mKeys.indexOf(p.material)}]})-1);n.mesh=meshIds.get(key);n.scale=p.scale;if(p.rotation)n.rotation=p.rotation;}g.nodes.push(n);}
 const index=new Map(parts.map((p,i)=>[p.name,i]));parts.forEach((p,i)=>{if(p.parent){const n=g.nodes[index.get(p.parent)];(n.children??=[]).push(i);}});
 const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let s='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1]??0,c=bytes[i+2]??0;const n=(a<<16)|(b<<8)|c;s+=abc[(n>>18)&63]+abc[(n>>12)&63]+(i+1<bytes.length?abc[(n>>6)&63]:'=')+(i+2<bytes.length?abc[n&63]:'=');}
 g.buffers=[{byteLength:bytes.length,uri:'data:application/octet-stream;base64,'+s}];return g;
}
export const model=()=>generateGltf(buildParts(),materials);
