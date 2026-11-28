// Tests the physical traveler, not the proprietary fabrication of any device.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stageForLab as stage} from '../public/simulations/foundry/cleanroom-data.js';
import {effectOf} from '../public/simulations/foundry/cleanroom-player.js';

const routes=[
  ['utah-array-fabrication',5],['utah-slant-compare',6],['neuropixels-foundry',20],
  ['masmanidis-64d-foundry',18],['neuropixels-family',5],['flex-rigid-ecog-foundry',16],
  ['ptnrgrid-foundry',19],['mesh-electronics-foundry',10],
  ['neurogrid-oect-foundry',8,'passive'],['neurogrid-oect-foundry',8,'oect'],
  ['graphene-stack-compare',12,'clear'],['graphene-stack-compare',12,'delft'],
];
const shapes=new Set(['wafer','panel','die','film','assembly','none']);
const supportedEffects=new Set('handoff pattern etch fill polish grind heat deposit coat measure assemble dice none transfer transfer-film release'.split(' '));
const rows=(slug,count,branch)=>Array.from({length:count},(_,i)=>stage(slug,i,{branch}));
test('Every physical lane carries named input/output forms and explicit operation classes',()=>{
  let n=0;
  for(const [slug,count,branch] of routes){
    const route=rows(slug,count,branch);
    for(const [i,s] of route.entries()){
      const place=slug+'/'+(branch||'default')+'/'+i;
      assert.ok(supportedEffects.has(s.effect),place);
      assert.ok(shapes.has(s.workpieceShape)&&shapes.has(s.outgoingShape),place);
      assert.ok(s.specimen&&s.afterSpecimen&&s.evidence&&s.settings.length,place);
      assert.equal(effectOf({...s,operation:'deliberately ambiguous: coat, cut, etch and measure'}),s.effect,place);
      if(s.workpieceShape!=='none')assert.ok(s.surfaceFeatures?.beforeFeature&&s.surfaceFeatures.afterFeature,place);
      if(i){
        assert.equal(s.before,route[i-1].after,place);
        assert.equal(s.workpieceShape,route[i-1].outgoingShape,place);
        assert.equal(s.specimen,route[i-1].afterSpecimen,place);
      }
      n++;
    }
  }
  assert.equal(n,139);
});
test('64D distinguishes vapor film, metal etch, positive image, nitride opening, Si and BOX cuts',()=>{
  const lab='masmanidis-64d-foundry', a=rows(lab,18);
  const local=a.map(s=>[s.effect,s.processFace,s.surfaceFeatures.afterFeature,s.surfaceFeatures.afterMaterial]);
  assert.deepEqual(local.slice(1,11),[
    ['deposit','front','insulating-film','nitride'],
    ['deposit','front','blanket-film','metal'],
    ['etch','front','metal-traces','metal'],
    ['deposit','front','insulating-film','nitride'],
    ['pattern','front','resist-image','resist'],
    ['etch','front','openings','nitride'],
    ['etch','front','front-trenches','silicon'],
    ['transfer','back','blank','silicon'],
    ['etch','back','back-trenches','silicon'],
    ['etch','back','box-clear','oxide'],
  ]);
  assert.deepEqual(a.slice(8,12).map(s=>[s.surfaceFeatures.carrierBefore,s.surfaceFeatures.carrierAfter]),
    [[false,true],[true,true],[true,true],[true,false]]);
  assert.ok(a.slice(8,12).every(s=>s.allowModelMotion===false)); // carrier unknown.
  assert.equal(a[7].allowModelMotion,undefined);                // bare wafer front-etch witness.
  assert.equal(a[10].outgoingShape,'wafer');                    // still carrier supported.
  assert.equal(a[11].outgoingShape,'die');                      // separate release + screen.
  assert.equal(a[12].outgoingShape,'assembly');                 // placement, not wire bonding.
  assert.equal(a[13].effect,'assemble');
  assert.equal(a[14].surfaceFeatures.region,'Bond wire region only');
  assert.equal(a[15].surfaceFeatures.region,'Recording faces only');
  assert.equal(a[15].surfaceFeatures.afterMaterial,'gold');
  const pcb=a.slice(12);
  assert.ok(pcb.every(s=>s.surfaceFeatures.assemblyType==='pcb'));
  assert.deepEqual(pcb.map(s=>Object.values(s.surfaceFeatures.assemblyAfter)),[
    [true,false,false,false],[true,true,false,false],[true,true,true,false],
    [true,true,true,true],[true,true,true,true],[true,true,true,true]]);
  for(let i=1;i<pcb.length;i++)assert.deepEqual(pcb[i].surfaceFeatures.assemblyBefore,pcb[i-1].surfaceFeatures.assemblyAfter);
});
test('64D release geometry is identical to the existing 2017 native reticle witness',()=>{
  const art=stage('masmanidis-64d-foundry',11).surfaceFeatures;
  const native=readFileSync(new URL('../public/simulations/masmanidis-64d-foundry/index.html',import.meta.url),'utf8');
  const outline=JSON.parse(native.match(/geometryMatch:"[^"]*",outline:(\[\[[-.\d,[\]]+?\]\]),outlinePieces:/u)[1]);
  assert.deepEqual(art.outlineUm,outline);
  const matches=[...native.matchAll(/\{channel:(\d+),x:([^,]+),z:([^,]+),openingIndex:\d+,openingPoly:(\[\[[-.\d,[\]]+?\]\])/gu)];
  assert.equal(matches.length,64);
  for(const [,id,x,z,poly]of matches){
    assert.deepEqual(art.sitesUm[Number(id)-1],[Number(x),Number(z)]);
    const p=JSON.parse(poly);
    assert.deepEqual([0,1].map(k=>Math.max(...p.map(p=>p[k]))-Math.min(...p.map(p=>p[k]))),art.siteOpeningUm);
  }
  assert.equal(art.outgoingSizeMm,(Math.max(...outline.map(p=>p[1]))-Math.min(...outline.map(p=>p[1])))/1000);
  assert.deepEqual(art.boardSizeMm,[9.3804,20.000002]);
  const bonded=[...native.matchAll(/\{channel:(\d+),x:[^,]+,z:[^,]+,openingIndex:\d+,openingPoly:\[\[[-.\d,[\]]+?\]\],bondOpeningIndex:\d+,bondCenter:(\[[-.\d,]+\])/gu)];
  assert.equal(bonded.length,64);
  for(const [,id,xy] of bonded)assert.deepEqual(art.bondPadCentersUm[Number(id)-1],JSON.parse(xy));
});
test('Utah dimensional scale is authored, and a center span is not a coupon width',()=>{
  assert.ok(rows('utah-array-fabrication',5).every(s=>s.sizeMm===4.2&&s.allowModelMotion===false));
  assert.ok(rows('utah-slant-compare',6).every(s=>s.sizeMm===undefined&&s.allowModelMotion===false));
});
test('NP1 remains wafer-supported through back etch and sort; family routing is entirely digital',()=>{
  const np=rows('neuropixels-foundry',20);
  for(const s of np.slice(0,17))assert.deepEqual([s.workpieceShape,s.outgoingShape,s.sizeMm],['wafer','wafer',200]);
  assert.deepEqual([np[17].workpieceShape,np[17].outgoingShape],['wafer','assembly']);
  assert.deepEqual(np.slice(2,6).map(s=>s.effect),['etch','fill','polish','pattern']);
  assert.deepEqual(np.slice(14,17).map(s=>[s.effect,s.processFace]),[['grind','back'],['etch','back'],['measure','front']]);
  const plate=np[17].surfaceFeatures;
  assert.equal(plate.sitesUm.length,960);
  assert.deepEqual(plate.sitesUm.slice(0,4),[[27,209],[59,209],[11,229],[43,229]]);
  assert.deepEqual(plate.siteOpeningUm,[12,12]);
  assert.equal(plate.shankThicknessUm,24);assert.equal(plate.deviceLayerUm,undefined);
  assert.ok(rows('neuropixels-family',5).every(s=>s.workpieceShape==='none'&&s.outgoingShape==='none'&&s.effect==='none'&&s.sizeMm===undefined));
});
test('Bremen retains its rigid island and honors the actual pad-landing route',()=>{
  const lab='flex-rigid-ecog-foundry';
  for(const mode of ['rigid','poly']){
    const a=rows(lab,16,mode);
    assert.equal(a[4].before,a[3].after);
    assert.equal(a[3].effect,mode==='rigid'?'etch':'none');
    assert.equal(a[3].surfaceFeatures.afterFeature,a[4].surfaceFeatures.beforeFeature);
    assert.ok(a.slice(0,14).every(s=>s.workpieceShape==='wafer'&&s.sizeMm===101.6));
    assert.equal(a[12].outgoingShape,'wafer'); // Four connectors mounted while tethered.
    assert.equal(a[13].outgoingShape,'assembly');
    assert.equal(a[14].sizeMm,undefined);
  }
});
test('PtNR starts on a square 177.8 mm panel and dealloys on a released film, not on glass',()=>{
  const a=rows('ptnrgrid-foundry',19);
  for(const s of a.slice(0,14)){
    assert.deepEqual([s.workpieceShape,s.sizeMm,s.allowModelMotion],['panel',177.8,false]);
    assert.equal(s.surfaceFeatures.thicknessMm,1.524);
  }
  assert.equal(a[13].outgoingShape,'film');assert.equal(a[14].sizeMm,undefined);
  assert.equal(a[14].surfaceFeatures.afterMaterial,'platinum');
  assert.equal(a[14].surfaceFeatures.substrate,'polymer');assert.equal(a[15].outgoingShape,'assembly');
});
test('CLEAR transfers on removable silicon, Delft grows directly on retained silica',()=>{
  const lab='graphene-stack-compare', c=rows(lab,12,'clear'), d=rows(lab,12,'delft');
  assert.deepEqual(c.slice(3,7).map(s=>[s.effect,s.surfaceFeatures.donorLayersBefore,s.surfaceFeatures.donorLayersAfter]),
    Array.from({length:4},(_,i)=>['transfer-film',i,i+1]));
  assert.equal(c[9].outgoingShape,'film');assert.equal(c[10].surfaceFeatures.substrate,'polymer');
  assert.equal(d[2].processFace,'back');assert.equal(d[3].effect,'deposit');
  assert.equal(d[3].surfaceFeatures.afterMaterial,'carbon');
  assert.equal(d[8].effect,'dice');assert.equal(d[8].outgoingShape,'die');
  assert.equal(d[9].surfaceFeatures.substrate,'glass');
  assert.equal(c[0].surfaceFeatures.substrate,'silicon');assert.equal(d[0].surfaceFeatures.substrate,'glass');
  assert.notEqual(c[0].specimen,d[0].specimen);
  assert.equal(stage(lab,0).workpieceShape,'none'); // no fused specimen for a branchless comparison.
});

test('All 64 physical traces/winding and top/bottom connector maps match the native source data',async()=>{
  const {artwork64D:a,channelMapping64D:map,source64D}=await import('../public/simulations/foundry/cleanroom-64d-artwork.js');
  const native=readFileSync(new URL('../public/simulations/masmanidis-64d-foundry/index.html',import.meta.url),'utf8');
  const input=native.split('sites:[{channel:')[1].split('],netCount:64')[0];
  const decode=s=>JSON.parse(s.replace(/(?<!\d)\.(?=\d)/g,'0.'));
  let points=0;
  assert.ok(native.includes(source64D.reticleSha256));
  assert.ok(native.includes(source64D.pcbSha256));
  for(const v of input.split('},{channel:')){
    const [id]=v.split(','), k=Number(id)-1;
    const nm=decode(v.match(/metalPoly:(\[\[.*?\]\]),holes:\[\]/u)[1]);
    const bond=decode(v.match(/bondPoly:(\[\[.*?\]\]),witnessWidth:/u)[1]);
    assert.deepEqual(nm[0],nm.at(-1));assert.deepEqual(bond[0],bond.at(-1));
    assert.deepEqual(a.metalPolysUm[k],nm.slice(0,-1));
    assert.deepEqual(a.bondOpeningPolysUm[k],bond.slice(0,-1));points+=nm.length;
    const [,pt,pb,at,ab]=v.match(/pinTop:(\d+),pinBottom:(\d+),amplifierTopZero:(\d+),amplifierBottomZero:(\d+)/u);
    for(const [face,pin,amp]of [['top',pt,at],['bottom',pb,ab]]){
      const cm=map(k+1,face);
      assert.deepEqual([cm.channel,cm.face,cm.connectorPin,cm.amplifierZero],[k+1,face,Number(pin),Number(amp)]);
      assert.deepEqual(cm.siteUm,a.sitesUm[k]);assert.deepEqual(cm.bondUm,a.bondPadCentersUm[k]);
    }
  }
  assert.equal(points,5653);assert.equal(map(0,'top'),null);assert.equal(map(65,'top'),null);
  assert.equal(map(32,'unknown'),null);assert.equal(map('32','top'),null);
});
test('Actual reticle is a physical-size 3D part, and printing is not etching',async()=>{
  const T=await import('three');
  const {make64DFieldOverlay}=await import('../public/simulations/foundry/cleanroom-64d-artwork.js');
  const v=make64DFieldOverlay(T);
  const at=(stage,progress=1,extra={})=>v.update({stage,progress,activeChannel:32,connectorFace:'bottom',...extra});
  assert.equal(at(2).patterned,false);assert.equal(v.group.visible,false); // No invented shank-sized blanket.
  assert.equal(at(3,0).patterned,false);assert.equal(at(3).polygons,64);
  assert.equal(at(4).covered,true);assert.equal(at(4).overlayOnly,false);
  assert.equal(at(5).photoimage,true);assert.equal(at(5).windowsCleared,false);
  assert.equal(at(6).photoimage,false);assert.equal(at(6).sourceOpeningPairs,64);
  assert.equal(at(6,1,{blocked:true}).windowsCleared,false);
  assert.equal(at(6,1,{showBuried:true}).overlayOnly,true);
  assert.equal(at(9,1,{processFace:'back'}).frontSide,false);assert.equal(v.group.visible,false);
  const conductors=v.group.children.find(n=>n.name.startsWith('64 separate'));
  const ext=conductors.geometry.boundingBox.getSize(new T.Vector3());
  assert.ok(ext.x>.006&&ext.x<.007);assert.ok(ext.z>.0006&&ext.z<.0008);
  assert.ok(Math.abs(ext.y-120e-9)<1e-12); // Actual Ti/Au/Ti film stack nominal thickness.
  assert.ok(v.group.children.length<=10);   // Batching: 64 independent nets, not 64 draws.
  const geometry=conductors.geometry;
  for(let i=1;i<=64;i++)at(7,.4,{activeChannel:i});
  assert.equal(conductors.geometry,geometry); // Switching CH only updates draw range.
  v.dispose();v.dispose();
});

test('Reticle respects native offsets, zero exposure, under-clear, and release failure without solving a recipe',async()=>{
  const T=await import('three');
  const {make64DFieldOverlay}=await import('../public/simulations/foundry/cleanroom-64d-artwork.js');
  const v=make64DFieldOverlay(T), opts={stage:6,progress:1,field:'F33',activeChannel:32,connectorFace:'bottom'};
  const live={stage:6,field:'F33',window:{dxUm:4,dzUm:-2,printedUm:9,exposedAreaUm2:0,etchDepthUm:.21,topFilmUm:.4}};
  const result=v.update({...opts,nativeWitness:live});
  assert.equal(result.nativeWindow.underClear,true);assert.equal(result.windowsCleared,false);
  assert.equal(result.siteExposure,false);assert.equal(result.sourceOpeningPairs,0);
  assert.equal(v.group.children.find(x=>x.name.startsWith('Recording apertures')).visible,false);
  const withArea={...live,window:{...live.window,exposedAreaUm2:36,etchDepthUm:.5}};
  const ok=v.update({...opts,nativeWitness:withArea});
  assert.equal(ok.siteExposure,true);assert.equal(ok.nativeWindow.exposedAreaUm2,36); // value from solver, not recomputed
  const image=v.group.children.find(x=>x.name.startsWith('Printed recording-site'));
  const attr=image.geometry.attributes.position;
  v.update({...opts,stage:5,nativeWitness:{...live,stage:5}});const x=attr.getX(0),z=attr.getZ(0);
  v.update({...opts,stage:5,nativeWitness:{...live,stage:5,window:{...live.window,dxUm:0,dzUm:0,printedUm:9}}});
  assert.ok(Math.abs((x-attr.getX(0))*1e6+2)<.0002);assert.ok(Math.abs((z-attr.getZ(0))*1e6+4)<.0002);
  assert.equal(v.update({...opts,nativeWitness:{...live,field:'F32'}}).nativeWindow,null); // different die
  assert.equal(v.update({...opts,nativeWitness:{...live,stage:15}}).nativeWindow,null);    // future stage
  assert.equal(v.update({...opts,nativeWitness:{stage:6,field:'F33',window:{dxUm:NaN,dzUm:500,printedUm:-1}}}).nativeWindow,null);
  const rejection=v.update({...opts,stage:11,nativeWitness:{...live,stage:11,release:{qualified:false}}});
  assert.equal(rejection.releaseQualified,false);
  assert.equal(v.update({...opts}).nativeWindow,null);
  v.dispose();
});

test('Utah D00: volumetric rear kerf/flush fill, 100 source-located posts and exact retained glass after front cutting',async()=>{
  const T=await import('three'),{makeUtahWorkpiece,utahReference:U}=await import('../public/simulations/foundry/cleanroom-utah-3d.js');
  const native=readFileSync(new URL('../public/simulations/utah-array-fabrication/index.html',import.meta.url),'utf8');
  const exact=Object.fromEntries(Object.entries(U));
  for(const [k,val] of Object.entries(exact))assert.ok(native.includes(k+':'+val),k+' is the archived default');
  // Volume ledger checks against the native saved r1, r2 and r3 packets.
  const ledger=[...native.matchAll(/volume:\{initialSiliconUm3:([\de.+-]+),rearRemovedSiliconUm3:([\de.+-]+),frontRemovedSiliconUm3:([\de.+-]+),frontRemovedGlassUm3:([\de.+-]+),taperRemovedSiliconUm3:([\de.+-]+),siliconUm3:([\de.+-]+),glassUm3:([\de.+-]+)/g)]
    .map(m=>m.slice(1).map(Number));
  assert.ok(ledger.some(m=>m[0]===31752000000&&m[1]===1431000000&&m[6]===0));
  assert.ok(ledger.some(m=>m[6]===1431000000&&m[2]===0));
  const nominal=ledger.find(m=>m[3]===357750000&&m[4]===0&&m[6]===1073250000);assert.ok(nominal);
  const u=makeUtahWorkpiece(T),rnd=new T.Matrix4();
  const set=(i,p,extra={})=>u.update({stage:i,progress:p,...extra});
  const pins=u.group.getObjectByName('100 physical posts · one instanced mesh');
  assert.equal(pins.count,100);assert.equal(new Set(pins.userData.siteIds).size,100);
  assert.deepEqual([pins.userData.siteIds[0],pins.userData.siteIds[99]],['R01C01','R10C10']);
  for(let i=0;i<100;i++){
    pins.getMatrixAt(i,rnd);const pos=new T.Vector3().setFromMatrixPosition(rnd);
    assert.ok(Math.abs(pos.x*1e6-(i%10-4.5)*400)<.001);
    assert.ok(Math.abs(pos.z*1e6-(Math.floor(i/10)-4.5)*400)<.001);
  }
  assert.equal(set(0,0).activeFeature,'blank');
  assert.equal(set(0,1,{authored:{verified:false}}).activeFeature,'blank');
  assert.equal(set(0,1).kerfCount,18);assert.equal(set(0,1).glassVolumeUm3,0);
  assert.equal(set(1,1).glassVolumeUm3,1431000000);
  const rough=set(2,1);
  assert.equal(rough.visiblePosts,100);assert.equal(rough.glassThicknessUm,300);
  assert.equal(rough.glassVolumeUm3,nominal[6]);assert.equal(rough.face,'front');
  const rr=pins.geometry.getAttribute('position');assert.ok(Math.abs(rr.getX(0)*1e6-175)<.001);
  const end=set(3,1);assert.equal(end.activeFeature,'tapered-100-posts');
  assert.ok(Math.abs(rr.getX(0)*1e6-40)<.001);assert.ok(Math.abs(rr.getX(24)*1e6-40)<.001);
  assert.ok(Math.abs(rr.getY(24)*1e6-100)<.001);assert.ok(Math.abs(rr.getX(48)*1e6-5)<.001);
  assert.ok(Math.abs(rr.getY(48)*1e6-1500)<.001);
  const done=set(4,1,{dataset:{scenario:'face-bridge'}});
  assert.equal(done.logicalLabels,100);assert.equal(done.physicalLeadEdges,0);
  const mark=u.group.getObjectByName('Back square face annotations · not metal pads');
  mark.getMatrixAt(0,rnd);assert.ok(Math.abs(new T.Vector3().setFromMatrixScale(rnd).x*1e6-420)<.001);
  // A rewind restores geometry rather than accumulating an additional array.
  assert.equal(set(0,0).visiblePosts,0);assert.equal(pins.visible,false);
  assert.ok(u.group.getObjectByName('Exact silicon cell bases · outer margin retained').visible);
  assert.equal(u.group.getObjectByName('Flush glass restricted to committed rear relief').visible,false);
  assert.ok(rows('utah-array-fabrication',5).every((s,i)=>s.surfaceFeatures.utahStage===i));
  assert.ok(rows('utah-slant-compare',6).every(s=>s.surfaceFeatures.utahStage===undefined));
  u.dispose();u.dispose();
});
