export function makeModel(){
 const g={asset:{version:"2.0",generator:"BuildTheSimulation MLA150 metric reconstruction"},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],buffers:[],bufferViews:[],accessors:[]};
 const bytes=[];function enc(a){const tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let s="";for(let i=0;i<a.length;i+=3){const v=(a[i]<<16)|((a[i+1]||0)<<8)|(a[i+2]||0);s+=tab[(v>>18)&63]+tab[(v>>12)&63]+(i+1<a.length?tab[(v>>6)&63]:"=")+(i+2<a.length?tab[v&63]:"=")}return s}
 function acc(a,kind){while(bytes.length%4)bytes.push(0);const off=bytes.length,arr=kind==="SCALAR"?new Uint16Array(a):new Float32Array(a);for(const x of new Uint8Array(arr.buffer))bytes.push(x);const vi=g.bufferViews.push({buffer:0,byteOffset:off,byteLength:arr.byteLength,target:kind==="SCALAR"?34963:34962})-1;const c={bufferView:vi,componentType:kind==="SCALAR"?5123:5126,count:a.length/(kind==="SCALAR"?1:3),type:kind};if(kind==="VEC3"){c.min=[0,1,2].map(j=>Math.min(...a.filter((_,i)=>i%3===j)));c.max=[0,1,2].map(j=>Math.max(...a.filter((_,i)=>i%3===j)))}return g.accessors.push(c)-1}
 const pos=[],nor=[],ix=[];function face(a,b,c,d,n){const k=pos.length/3;pos.push(...a,...b,...c,...d);for(let i=0;i<4;i++)nor.push(...n);ix.push(k,k+1,k+2,k,k+2,k+3)}
 const l=-.5,r=.5;face([l,l,r],[r,l,r],[r,r,r],[l,r,r],[0,0,1]);face([r,l,l],[l,l,l],[l,r,l],[r,r,l],[0,0,-1]);face([r,l,r],[r,l,l],[r,r,l],[r,r,r],[1,0,0]);face([l,l,l],[l,l,r],[l,r,r],[l,r,l],[-1,0,0]);face([l,r,r],[r,r,r],[r,r,l],[l,r,l],[0,1,0]);face([l,l,l],[r,l,l],[r,l,r],[l,l,r],[0,-1,0]);
 const box={attributes:{POSITION:acc(pos,"VEC3"),NORMAL:acc(nor,"VEC3")},indices:acc(ix,"SCALAR")};
 const p=[],n=[],i=[];function tri(a,b,c,na,nb,nc){const k=p.length/3;p.push(...a,...b,...c);n.push(...na,...nb,...nc);i.push(k,k+1,k+2)}
 for(let j=0;j<48;j++){const a=2*Math.PI*j/48,b=2*Math.PI*(j+1)/48,A=[Math.cos(a),0,Math.sin(a)],B=[Math.cos(b),0,Math.sin(b)],v=(u,y)=>[u[0]/2,y,u[2]/2];tri(v(A,-.5),v(A,.5),v(B,.5),A,A,B);tri(v(A,-.5),v(B,.5),v(B,-.5),A,B,B);tri([0,.5,0],v(B,.5),v(A,.5),[0,1,0],[0,1,0],[0,1,0]);tri([0,-.5,0],v(A,-.5),v(B,-.5),[0,-1,0],[0,-1,0],[0,-1,0])}
 const cyl={attributes:{POSITION:acc(p,"VEC3"),NORMAL:acc(n,"VEC3")},indices:acc(i,"SCALAR")};
 const materials={silver:[.64,.66,.68,1,.62,.36],trim:[.83,.84,.83,1,.35,.27],red:[.64,.045,.065,1,.12,.42],black:[.055,.063,.07,1,.2,.54],graphite:[.19,.2,.21,1,.35,.5],amber:[.52,.29,.06,.32,.1,.18],gold:[.78,.55,.16,1,.38,.38],steel:[.46,.49,.52,1,.8,.32],screen:[.11,.20,.25,1,.05,.28],green:[.16,.65,.35,1,.1,.32],yellow:[.92,.67,.06,1,.1,.4],resist:[.44,.22,.54,1,.32,.3],white:[.91,.92,.90,1,.05,.55]};
 const m={};for(const [name,c] of Object.entries(materials)){m[name]=g.materials.push({name,pbrMetallicRoughness:{baseColorFactor:c.slice(0,4),metallicFactor:c[4],roughnessFactor:c[5]},...(c[3]<1?{alphaMode:"BLEND",doubleSided:true}:{})})-1}
 const mm={};function node(name,pos,scale,mat,shape="box",parent=null,rotation){const v={name,translation:pos};if(scale){v.scale=scale;const key=shape+mat;if(mm[key]===undefined)mm[key]=g.meshes.push({primitives:[{...(shape==="cyl"?cyl:box),material:m[mat]}]})-1;v.mesh=mm[key]}if(rotation)v.rotation=rotation;const idx=g.nodes.push(v)-1;if(parent===null)g.scenes[0].nodes.push(idx);else(g.nodes[parent].children??=[]).push(idx);return idx}
 const group=(name,pos,parent=null)=>node(name,pos,null,null,"box",parent);
 const b=(name,pos,size,mat,par)=>node(name,pos,size,mat,"box",par);
 const c=(name,pos,size,mat,par,rotation)=>node(name,pos,size,mat,"cyl",par,rotation);
 const frontRot=[Math.SQRT1_2,0,0,Math.SQRT1_2],sideRot=[0,0,Math.SQRT1_2,Math.SQRT1_2];
 const root=group("MLA150",[0,0,0]),housing=group("housing",[0,0,0],root);
 b("left_side",[-.63,1.005,0],[.04,1.89,1.3],"silver",housing);b("right_side",[.63,1.005,0],[.04,1.89,1.3],"silver",housing);
 b("roof",[0,1.93,0],[1.22,.04,1.30],"trim",housing);b("rear_panel",[0,1.005,-.63],[1.22,1.89,.04],"silver",housing);
 b("upper_fascia",[0,1.75,.628],[1.22,.34,.044],"silver",housing);b("lower_fascia",[0,.43,.628],[1.22,.74,.044],"silver",housing);b("lower_sill",[0,.81,.628],[1.22,.035,.044],"trim",housing);b("upper_sill",[0,1.56,.628],[1.22,.035,.044],"trim",housing);
 for(const x of [-.60,.60]){b("front_corner_"+x,[x,1.005,.628],[.035,1.89,.044],"trim",housing)}
 b("left_red_strip",[-.54,1.185,.627],[.14,.714,.046],"red",housing);b("right_control_strip",[.54,1.185,.627],[.14,.714,.046],"red",housing);
 for(const x of [-.47,.47])b("window_guide_"+x,[x,1.185,.628],[.025,.71,.044],"trim",housing);
 const window=group("loading_window",[0,0,0],root);b("amber_glazing",[0,1.185,.614],[.93,.714,.017],"amber",window);for(const x of [-.462,.462])b("window_edge_"+x,[x,1.185,.63],[.015,.714,.028],"trim",window);
 c("emergency_ring",[.54,1.23,.653],[.087,.006,.087],"yellow",root,frontRot);c("emergency_button",[.54,1.23,.67],[.055,.03,.055],"red",root,frontRot);c("light_button",[.54,.99,.66],[.027,.018,.027],"green",root,frontRot);c("window_button",[.54,.93,.66],[.027,.018,.027],"white",root,frontRot);
 b("temperature_panel",[.647,1.77,.42],[.006,.08,.14],"black",root);b("temperature_display",[.651,1.783,.435],[.005,.025,.075],"screen",root);c("temperature_reset",[.654,1.752,.37],[.018,.008,.018],"white",root,sideRot);
 for(const x of [-.56,.56])for(const z of [-.54,.54]){c("leveling_foot_"+x+"_"+z,[x,.025,z],[.08,.05,.08],"black",root);c("foot_stem_"+x+"_"+z,[x,.052,z],[.025,.038,.025],"steel",root)}
 // Back utility categories, locations are schematic.
 for(let j=0;j<7;j++)b("rear_vent_"+j,[0,.25+j*.023,-.651],[.45,.009,.003],"black",root);b("rear_service_plate",[.36,.25,-.651],[.23,.23,.003],"graphite",root);for(let j=0;j<3;j++)c("utility_port_"+j,[.3+j*.065,.25,-.663],[.028,.026,.028],"steel",root,frontRot);
 const chamber=group("working_area",[0,0,0],root);
 b("interior_back",[0,1.18,-.52],[1.12,.70,.028],"graphite",chamber);b("interior_floor",[0,.81,0],[1.12,.055,1.13],"black",chamber);
 b("main_unit_plate",[0,.94,-.035],[1.03,.12,.90],"graphite",chamber);
 for(const x of [-.40,.40]){c("isolation_"+x,[x,.835,-.10],[.15,.10,.15],"steel",chamber);b("optics_support_"+x,[x,1.21,-.26],[.15,.43,.23],"graphite",chamber)}
 b("exposure_optics",[0,1.43,-.12],[.96,.20,.64],"black",chamber);
 c("write_head",[-.10,1.283,.075],[.083,.105,.083],"steel",chamber);c("objective",[-.10,1.224,.075],[.047,.03,.047],"black",chamber);
 for(const x of [-.32,.23]){c("interferometer_"+x,[x,1.27,-.13],[.064,.09,.064],"steel",chamber);b("stage_rail_"+x,[x,1.012,.04],[.055,.026,.63],"steel",chamber)}
 b("operator_panel",[.38,1.04,.34],[.18,.057,.17],"graphite",chamber);b("vacuum_display",[.35,1.071,.30],[.056,.006,.026],"screen",chamber);c("vacuum_push",[.35,1.075,.37],[.035,.012,.035],"white",chamber);c("laser_on",[.42,1.075,.30],[.021,.008,.021],"yellow",chamber);c("emission_led",[.45,1.075,.30],[.021,.008,.021],"black",chamber);
 const stage=group("stage",[-.10,0,.075],chamber);b("cross_stage",[0,1.053,0],[.47,.072,.40],"steel",stage);b("chuck_support",[0,1.105,0],[.32,.032,.32],"black",stage);b("vacuum_chuck",[0,1.128,0],[.24,.025,.24],"steel",stage);
 c("central_vacuum_opening",[0,1.141,0],[.004,.001,.004],"black",stage);
 for(const sign of [-1,1]){
 b("radial_alignment_slot_x_"+sign,[sign*.065,1.141,0],[.075,.001,.009],"black",stage);
 b("radial_alignment_slot_z_"+sign,[0,1.141,sign*.065],[.009,.001,.075],"black",stage);
 }
 const aid=group("small_coupon_adjustment_aid",[0,0,0],stage);
 for(const sign of [-1,1]){
 b("aid_side_"+sign,[sign*.013,1.145,0],[.012,.008,.038],"red",aid);
 b("aid_end_"+sign,[0,1.145,sign*.013],[.014,.008,.012],"red",aid);
 }
 b("aid_handle",[-.037,1.146,0],[.041,.009,.038],"red",aid);
 c("aid_knob",[-.045,1.157,0],[.012,.014,.012],"steel",aid);
 for(const x of [-.14,.14])b("pneumatic_clamp_"+x,[x,1.13,.08],[.055,.035,.07],"steel",stage);
 const coupon=group("coupon",[0,1.141,0],stage);b("coupon_surface",[0,.00025,0],[.010,.0005,.010],"resist",coupon);
 const rack=group("electronics_workstation",[1.08,0,0],root);b("rack",[0,.47,0],[.60,.86,.67],"graphite",rack);b("rack_front",[0,.47,.337],[.55,.8,.014],"black",rack);for(let j=0;j<15;j++)b("rack_vent_"+j,[0,.18+j*.034,.346],[.45,.008,.003],"steel",rack);
 b("desktop",[0,.93,.035],[.76,.045,.75],"trim",rack);b("keyboard",[0,.96,.22],[.39,.018,.145],"black",rack);b("mouse",[.27,.961,.23],[.067,.024,.09],"black",rack);b("monitor_column",[0,1.29,-.15],[.065,.65,.06],"black",rack);
 for(const y of [1.17,1.50]){b("monitor_"+y,[0,y,-.10],[.60,.32,.055],"black",rack);b("display_"+y,[0,y,-.068],[.56,.28,.008],"screen",rack)}
 for(const x of [-.24,.24])for(const z of [-.26,.26])c("rack_caster_"+x+"_"+z,[x,.035,z],[.07,.07,.07],"black",rack);
 const chiller=group("external_chiller",[-1.01,0,-.27],root);b("chiller_shell",[0,.37,0],[.48,.66,.54],"silver",chiller);b("chiller_display",[.11,.62,.274],[.15,.045,.008],"screen",chiller);for(let j=0;j<13;j++)b("chiller_grille_"+j,[0,.13+j*.029,.274],[.38,.012,.008],"black",chiller);
 g.buffers=[{byteLength:bytes.length,uri:"data:application/octet-stream;base64,"+enc(bytes)}];return g;
}
