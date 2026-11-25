/** Editable parametric glTF; dimensions in mm. Reference dimensions and assumptions are documented on simulator page. */
export function makeModel(){
  const nodes=[],meshes=[],materials=[],accessors=[],bufferViews=[],bytes=[],geometry={},cache={};
  const mat=(name,color,metal=0,rough=.6,alpha=1)=>{materials.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,alpha],metallicFactor:metal,roughnessFactor:rough},...(alpha<1?{alphaMode:"BLEND",doubleSided:true}:{})});return materials.length-1};
  const M={pp:mat("natural polypropylene",[.84,.83,.75]),inner:mat("bowl polymer",[.73,.74,.68]),dark:mat("black seal",[.035,.035,.035]),steel:mat("stainless hardware",[.55,.57,.59],.8,.26),clear:mat("translucent ECTFE",[.89,.94,.94],0,.12,.25),lcd:mat("blue LCD",[.03,.09,.35],.2,.25),keys:mat("light keypad",[.88,.88,.84]),blue:mat("blue keys",[.05,.15,.32]),red:mat("stop / latch warning",[.65,.05,.08]),green:mat("start / vacuum",[.08,.48,.2]),orange:mat("resist / warning",[.84,.37,.07]),wafer:mat("silicon wafer",[.26,.31,.4],.65,.21),rubber:mat("feet and hoses",[.06,.075,.08]),label:mat("white label stock",[.95,.95,.89])};
  function primitive(type){if(geometry[type])return geometry[type];const p=[],n=[];const tri=(a,b,c)=>{const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),w=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...w);if(l<1e-10)return;p.push(...a,...b,...c);for(let i=0;i<3;i++)n.push(...w.map(x=>x/l))};const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d)};
    if(type==="box"){const a=[-.5,-.5,-.5],b=[.5,-.5,-.5],c=[.5,.5,-.5],d=[-.5,.5,-.5],e=[-.5,-.5,.5],f=[.5,-.5,.5],g=[.5,.5,.5],h=[-.5,.5,.5];quad(b,a,d,c);quad(e,f,g,h);quad(a,e,h,d);quad(f,b,c,g);quad(d,h,g,c);quad(a,b,f,e)}
    else {const inner=type==="ring"?.9:type==="wide-ring"?.68:type==="window"?(19/233):0;const N=96;for(let i=0;i<N;i++){const t=i*2*Math.PI/N,s=(i+1)*2*Math.PI/N;const V=(q,y,r)=>[.5*r*Math.cos(q),y,.5*r*Math.sin(q)];const a=V(t,-.5,1),b=V(s,-.5,1),c=V(s,.5,1),d=V(t,.5,1);quad(a,d,c,b);if(inner){const e=V(t,-.5,inner),f=V(s,-.5,inner),g=V(s,.5,inner),h=V(t,.5,inner);quad(e,f,g,h);quad(d,h,g,c);quad(a,b,f,e)}else{tri(d,[0,.5,0],c);tri(a,b,[0,-.5,0])}}}
    const acc=(array,minmax)=>{const off=bytes.length;const b=new Uint8Array(new Float32Array(array).buffer);for(const x of b)bytes.push(x);const view=bufferViews.push({buffer:0,byteOffset:off,byteLength:b.length,target:34962})-1;const d={bufferView:view,componentType:5126,count:array.length/3,type:"VEC3"};if(minmax){d.min=[0,1,2].map(i=>Math.min(...array.filter((_,k)=>k%3===i)));d.max=[0,1,2].map(i=>Math.max(...array.filter((_,k)=>k%3===i)))}return accessors.push(d)-1};
    return geometry[type]={POSITION:acc(p,true),NORMAL:acc(n,false)};
  }
  function mesh(type,material){const k=type+material;if(cache[k]===undefined)cache[k]=meshes.push({name:k,primitives:[{attributes:primitive(type),material}]})-1;return cache[k]}
  function node(name,parent,translation=[0,0,0],shape=null,size=[1,1,1],material=M.pp,rotation=null){const o={name,translation};if(shape){o.mesh=mesh(shape,material);o.scale=size}if(rotation)o.rotation=rotation;const i=nodes.push(o)-1;if(parent!==null)(nodes[parent].children??=[]).push(i);return i}
  const q=(axis,angle)=>{const s=Math.sin(angle/2);return [axis===0?s:0,axis===1?s:0,axis===2?s:0,Math.cos(angle/2)]};
  const root=node("laurell_23NPPB_mm",null);nodes[root].scale=[.001,.001,.001];
  const body=node("enclosure",root);
  node("polypropylene_base",body,[0,94,0],"cylinder",[254,176,254]);
  node("bottom_trim",body,[0,6,0],"cylinder",[250,12,250],M.inner);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;node("foot_"+i,body,[93*Math.cos(a),-2,93*Math.sin(a)],"cylinder",[28,8,28],M.rubber)}
  node("bowl_floor",body,[0,186,0],"cylinder",[247,12,247],M.inner);
  node("bowl_wall",body,[0,232,0],"ring",[254,92,254],M.pp);
  node("upper_flange",body,[0,274,0],"ring",[254,12,254],M.pp);
  node("bowl_seal",body,[0,281,0],"ring",[246,2,246],M.orange);
  node("latch_mount",body,[0,231,132],"box",[46,73,16]);
  node("latch_handle",body,[0,241,147],"box",[34,47,18]);
  node("front_warning_plate",body,[0,210,157],"box",[24,21,1],M.orange);
  node("model_label",body,[-65,260,114],"box",[44,12,2],M.label,q(1,-.4));
  for(const x of [-32,32])node("hinge_bracket_"+x,body,[x,270,-130],"box",[28,38,22],M.pp);
  node("hinge_pin",body,[0,282,-127],"cylinder",[12,95,12],M.steel,q(2,Math.PI/2));
  const lid=node("lid_pivot",root,[0,282,-127]);
  node("lid_ring",lid,[0,6,127],"ring",[254,13,254],M.pp);
  node("clear_lid_19mm_opening",lid,[0,7,127],"window",[233,5,233],M.clear);
  node("dispense_opening_rim",lid,[0,10,127],"ring",[21.1,3,21.1],M.pp);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;node("lid_fastener_"+i,lid,[121*Math.cos(a),13,127+121*Math.sin(a)],"cylinder",[5,2,5],M.dark)}
  node("lid_latch_tab",lid,[0,1,258],"box",[35,9,13],M.pp);
  const rotor=node("rotor",root,[0,199,0]);
  node("motor_spindle",rotor,[0,14,0],"cylinder",[21,28,21],M.steel);
  node("chuck_base",rotor,[0,30,0],"cylinder",[56,12,56],M.pp);
  node("vacuum_chuck_44_45mm",rotor,[0,40,0],"cylinder",[44.45,8,44.45],M.pp);
  node("vacuum_oring_assumed",rotor,[0,44.5,0],"ring",[42,2,42],M.dark);
  node("vacuum_port",rotor,[0,44.7,0],"cylinder",[3,1,3],M.dark);
  const wafer=node("wafer",rotor,[0,46,0]);
  node("silicon_150mm",wafer,[0,0,0],"cylinder",[150,.725,150],M.wafer);
  node("wafer_orientation_mark",wafer,[0,.42,72],"box",[5,.5,3],M.label);
  node("resist_film_visual",wafer,[0,.5,0],"cylinder",[149.4,.28,149.4],M.orange);
  const panel=node("controller",root,[182,104,55],null,[1,1,1],M.pp,q(0,-.30));
  node("controller_housing",panel,[0,0,0],"box",[134.62,203.2,36],M.pp);
  node("controller_face",panel,[0,0,18.5],"box",[124,192,2],M.steel);
  node("lcd_bezel",panel,[0,55,20],"box",[101,61,3],M.dark);
  node("lcd_screen",panel,[0,55,22],"box",[90,50,2],M.lcd);
  for(let i=0;i<4;i++)node("mode_key_"+i,panel,[-45,10-i*24,22],"box",[25,17,3],M.blue);
  node("vacuum_key",panel,[-8,10,23],"cylinder",[19,3,19],M.green,q(0,Math.PI/2));
  for(let i=0;i<2;i++)node("function_key_"+(i+1),panel,[20+i*25,10,22],"box",[19,17,3],M.keys);
  for(const [name,x,y] of [["up",10,-18],["left",-10,-41],["down",10,-41],["right",30,-41],["page_up",49,-18],["page_down",49,-41]])node("arrow_"+name,panel,[x,y,22],"box",[16,17,3],M.keys);
  for(const [name,x,color] of [["start",-40,M.green],["stop",-12,M.red],["pause",16,M.keys],["forward",44,M.keys]])node("key_"+name,panel,[x,-78,22],"box",[22,17,3],color);
  node("controller_cable_port",panel,[40,-72,-22],"cylinder",[12,10,12],M.rubber,q(0,Math.PI/2));
  const rear=node("rear_utilities_inferred",root);
  node("rear_drain_port_38mm",rear,[0,192,-139],"cylinder",[38,32,38],M.pp,q(0,Math.PI/2));
  node("drain_waste_cup",rear,[0,156,-177],"cylinder",[65,73,65],M.clear);
  node("waste_cup_mount",rear,[0,117,-177],"cylinder",[70,10,70],M.pp);
  for(const [name,x,d] of [["vacuum",53,10],["purge",75,6],["power",-60,12]])node(name+"_connector",rear,[x,60,-128],"cylinder",[d,20,d],name==="power"?M.rubber:M.steel,q(0,Math.PI/2));
  node("utility_plate",rear,[15,60,-123],"box",[165,34,8],M.inner);
  const pipette=node("manual_dispense_pipette",root,[107,243,-72],null,[1,1,1],M.pp,q(2,-.4));
  node("pipette_body",pipette,[0,55,0],"cylinder",[16,88,16],M.pp);
  node("pipette_plunger",pipette,[0,107,0],"cylinder",[10,20,10],M.blue);
  node("pipette_tip",pipette,[0,-7,0],"cylinder",[4,35,4],M.clear);
  const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let b64="";for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1]??0,c=bytes[i+2]??0,v=(a<<16)|(b<<8)|c;b64+=abc[(v>>18)&63]+abc[(v>>12)&63]+(i+1<bytes.length?abc[(v>>6)&63]:"=")+(i+2<bytes.length?abc[v&63]:"=")}
  return {asset:{version:"2.0",generator:"BTS 02-07 parametric reconstruction",extras:{units:"metres (root converts source mm)",notManufacturerCAD:true}},scene:0,scenes:[{nodes:[root]}],nodes,meshes,materials,accessors,bufferViews,buffers:[{byteLength:bytes.length,uri:"data:application/octet-stream;base64,"+b64}]};
}
