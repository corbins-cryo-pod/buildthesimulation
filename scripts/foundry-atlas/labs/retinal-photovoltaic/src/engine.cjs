(function (root, create) {
  if (typeof module !== 'undefined' && module.exports) module.exports = create(require('./evidence.cjs'));
  else root.PVModel = create(root.PVEvidence);
})(typeof globalThis === 'undefined' ? this : globalThis, function (e) {
  'use strict';
  const revision = 'PV12.1';
  const constants = Object.freeze({wavelengthNm:880, electronChargeC:1.602176634e-19, planckJs:6.62607015e-34, lightSpeedMps:299792458, deviceThicknessUm:30, outerGapUm:5, nominalDarkPA:8, leakyDarkPA:240, sourceDarkMinPA:1, sourceDarkMaxPA:100, obscuredTransmission:.45, displayPowerMaxUW:80, fixtureSourceV:.1, fixtureTerminationOhm:1e9, fixtureGapOhm:1e13, fixtureBridgeOhm:5e7, demoTransferLimit:.01, demoOpticalFraction:.85});
  const cfg = Object.freeze({route:'wang', stage:0, size:140, fault:'nominal', target:1, power:50});
  const releaseIndex = e.stages.length - 1;
  const index = Object.fromEntries(e.stages.map((v, i) => [v.id, i]));
  const circle = Array.from({length:6}, (_, n) => [Math.cos(n*Math.PI/3), Math.sin(n*Math.PI/3)]);
  const requireFinite = (n, label) => {if (!Number.isFinite(n)) throw new TypeError(label+' must be a number');return n;};
  const restrict = (n,lo,hi,label) => {requireFinite(n,label);if(n<lo||n>hi)throw new RangeError(label+' outside model bounds');return n;};
  const integer = (n,lo,hi,label) => {if(!Number.isInteger(n))throw new TypeError(label+' must be an integer');return restrict(n,lo,hi,label);};
  const own = (table, k) => Object.prototype.hasOwnProperty.call(table,k);
  function normalize(input = {}) {
    const v = {...cfg,...input};
    if (v.route === 'prima') return {route:'prima'};
    if (v.route !== 'wang') throw new TypeError('Unknown route');
    if (typeof v.stage === 'string' && own(index,v.stage)) v.stage=index[v.stage];
    integer(v.stage,0,releaseIndex,'stage');
    integer(v.target,1,6,'neighbor');
    restrict(v.power,0,constants.displayPowerMaxUW,'virtual power');
    if (!own(e.sizes,v.size)) throw new RangeError('Unknown nominal research pixel width');
    if (!own(e.faults,v.fault)) throw new TypeError('Unknown synthetic fault');
    return {route:'wang',stage:v.stage,size:Number(v.size),target:v.target,power:v.power,fault:v.fault};
  }
  function quantEfficiency(rho, wavelengthNm=constants.wavelengthNm) {
    requireFinite(rho,'responsivity');requireFinite(wavelengthNm,'wavelength');
    if(rho<0||wavelengthNm<=0)throw new RangeError('invalid responsivity or wavelength');
    const c=constants;
    return rho*c.planckJs*c.lightSpeedMps/(c.electronChargeC*wavelengthNm*1e-9);
  }
  function optics(size,power,opticalObscuration=false) {
    if(!own(e.sizes,size))throw new RangeError('Unknown nominal research pixel width');
    restrict(power,0,constants.displayPowerMaxUW,'virtual power');
    const c=constants, rho=e.sizes[size].rho, transmission=opticalObscuration?c.obscuredTransmission:1;
    const specimen='Wang 2012 one-diode test structure';
    return {specimen, source:'Wang §3.2 and Fig. 9(b)', wavelength_nm:c.wavelengthNm, voltage_bias_V:0,
      sourceResponsivity_A_per_W:rho, derivedEQE:quantEfficiency(rho), incidentVirtualPower_uW:power,
      virtualTransmittedFraction:transmission, transmittedVirtualPower_uW:power*transmission,
      predictedMagnitude_uA:rho*power*transmission, unobscuredMagnitude_uA:rho*power,
      teachingThresholdFraction:c.demoOpticalFraction,
      result: power===0?'no-input':(transmission<c.demoOpticalFraction?'attenuated':'nominal'),
      domain: Number(size)===140?'The display range lies within the approximate span of the published medium one-diode plot. Line uses the reported slope, not digitized samples.':'The source reports this size’s slope. The common display range is illustrative; it does not establish that size’s measured power span.'};
  }
  function dark(leaky=false) {
    const c=constants,p=leaky?c.leakyDarkPA:c.nominalDarkPA;
    const result=p>c.sourceDarkMaxPA?'above-source-span':(p<c.sourceDarkMinPA?'below-source-span':'within-source-span');
    return {specimen:'Wang 2012 three-series-junction configuration', evidence:'Wang §3.1 reported reverse-bias dark-current span at room temperature',
      interval_pA:[c.sourceDarkMinPA,c.sourceDarkMaxPA], syntheticWitness_pA:p,result,
      caveat:'This is a single synthetic value compared to a reported range, not a fitted I–V curve or a lot acceptance limit.'};
  }
  function hexVertices(cx,cy,width) {
    const r=width/Math.sqrt(3); return circle.map((_,i)=>[cx+r*Math.cos((i+.5)*Math.PI/3),cy+r*Math.sin((i+.5)*Math.PI/3)]);
  }
  function coupon(size) {
    if(!own(e.sizes,size))throw new RangeError('Unknown nominal research pixel width');
    const width=e.sizes[size].widthUm, pitch=width+constants.outerGapUm;
    const centers=[[0,0],...circle.map(([x,y])=>[pitch*x,pitch*y])];
    return {widthUm:width,activeDiameterUm:e.sizes[size].activeUm,modelCenterDistanceUm:pitch,thicknessUm:constants.deviceThicknessUm,
      outerGapUm:constants.outerGapUm, drawingNote:'Seven-pixel teaching patch; nominal width is treated as across flats in this rendering. Not the original mask, packing or pitch convention.',
      pixels:centers.map(([x,y],i)=>({id:i?'N'+i:'C',x,y,poly:hexVertices(x,y,width)}))};
  }
  function geometry(state) {
    const s=normalize(state);
    if(s.route!=='wang')return null;
    const i=s.stage, filled=i>=index.fill, outerReopened=i>=index.reopen, last=i===releaseIndex;
    const siliconWeb=s.fault==='trench'&&i>=index.drie;
    const surfaceStringer=s.fault==='stringer'&&i>=index.electrode;
    const residualBOX=s.fault==='oxide'&&last;
    const bridge=siliconWeb||surfaceStringer;
    return {specimen:'Wang 2012 teaching section', stage:e.stages[i].id, stageNumber:i, stageLabel:e.stages[i].title, masks:e.stages.slice(0,i+1).flatMap(d=>d.masks), nominalWidthUm:s.size, activeDiameterUm:e.sizes[s.size].activeUm, deviceThicknessUm:constants.deviceThicknessUm, trenchNominalWidthUm:constants.outerGapUm,
      innerTrench:i<index.drie?'not-etched':(filled?'oxide-lined-fill':'open-to-BOX'),
      outerTrench:i<index.drie?'not-etched':(outerReopened?'selectively-reopened':(filled?'oxide-lined-fill':'open-to-BOX')),
      crossGapBOX: i>=index.drie&&(!last||residualBOX), underSiBOX:true,
      siliconHandle:!last, siliconWeb, surfaceStringer, residualBOX, bridge,
      faultEdge: (siliconWeb||surfaceStringer||residualBOX)?'C–N'+s.target:null,
      sectionReleaseResult: !last?'not-released':(bridge||residualBOX?'obstructed':'clear'),
      caveat:'Geometry is an illustrative section and seven-pixel patch, not original layout or a material simulation.'};
  }
  function edges(bridge, target) {
    const v=[];
    for(let i=1;i<=6;i++) {
      v.push({a:0,b:i,role:bridge&&i===target?'conductive-bridge':'center-gap',resistance_Ohm:bridge&&i===target?constants.fixtureBridgeOhm:constants.fixtureGapOhm});
      v.push({a:i,b:i%6+1,role:'ring-gap',resistance_Ohm:constants.fixtureGapOhm});
    }
    return v;
  }
  function linear(A,b){
    const n=b.length, m=A.map((row,i)=>[...row,b[i]]);
    for(let j=0;j<n;j++){
      let p=j;
      for(let i=j+1;i<n;i++)if(Math.abs(m[i][j])>Math.abs(m[p][j]))p=i;
      if(p!==j)[m[j],m[p]]=[m[p],m[j]];
      const d=m[j][j]; if(!Number.isFinite(d)||Math.abs(d)<1e-25)throw new RangeError('Singular fixture');
      for(let k=j;k<=n;k++)m[j][k]/=d;
      for(let i=0;i<n;i++)if(i!==j){const f=m[i][j];for(let k=j;k<=n;k++)m[i][k]-=f*m[j][k];}
    }
    return m.map(row=>row[n]);
  }
  function isolation(bridge=false,target=1) {
    integer(target,1,6,'neighbor');
    const c=constants, n=6, source=c.fixtureSourceV, gTerm=1/c.fixtureTerminationOhm;
    const graph=edges(bridge,target);
    // Scale unknown nodal equations to nS for conditioning. Solve the six unknown voltages.
    const A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?gTerm*1e9:0));
    const b=Array(n).fill(0);
    for(const {a,b:j,resistance_Ohm} of graph){
      const g=1e9/resistance_Ohm;
      A[j-1][j-1]+=g;
      if(a){A[a-1][a-1]+=g; A[a-1][j-1]-=g; A[j-1][a-1]-=g;}
      else b[j-1]+=g*source;
    }
    const voltages=[source,...linear(A,b)];
    const leakage=Array.from({length:7},(_,i)=>i?voltages[i]*gTerm:0), kcl=[0,...leakage.slice(1)];
    for(const {a,b,resistance_Ohm} of graph) {
      const flow=(voltages[a]-voltages[b])/resistance_Ohm; kcl[a]+=flow;kcl[b]-=flow;
    }
    const transfer=Math.max(...voltages.slice(1).map(x=>Math.abs(x/source)));
    return {specimen:'Synthetic dry seven-node resistive coupon', source:'Uncalibrated fixture model; no published interpixel resistance dataset supplied',
      virtualCenter_V:source, victimTermination_Ohm:c.fixtureTerminationOhm, nominalGap_Ohm:c.fixtureGapOhm,
      bridgeResidual_Ohm:bridge?c.fixtureBridgeOhm:null, targetEdge:bridge?'C–N'+target:null,
      nodes_mV:voltages.map(x=>x*1000), graph, peakTransferFraction:transfer, teachingThresholdFraction:c.demoTransferLimit,
      maxVictimKirchhoffResidual_A:Math.max(...kcl.slice(1).map(Math.abs)), sourceCurrent_A:kcl[0], terminatedCurrent_A:leakage.reduce((a,b)=>a+b,0),
      result:transfer>c.demoTransferLimit?'coupled':'isolated', caveat:'Conductance values and thresholds are author-selected. This is not a calculation of optical crosstalk, electrolyte field or PRIMA return continuity.'};
  }
  function run(input={}) {
    const s=normalize(input);
    if(s.route==='prima')return {revision,route:'prima',runState:'proprietary-locked',publicFacts:e.prima,geometry:null,optical:null,dark:null,isolation:null};
    const g=geometry(s);
    if(s.stage!==releaseIndex)return {revision,route:'wang',runState:'process-incomplete',geometry:g,optical:null,dark:null,isolation:null};
    return {revision,route:'wang',runState:'ready',input:s,geometry:g,optical:optics(s.size,s.power,s.fault==='shade'),dark:dark(s.fault==='leakage'),isolation:isolation(g.bridge,s.target)};
  }
  function report(input={}) {
    const r=run(input);
    if(r.runState!=='ready')throw new Error('No numeric report for this branch/checkpoint');
    return {...r, geometry:{...r.geometry,teachingPatch:coupon(r.input.size)},
      traveler:e.stages.map(x=>({id:x.id,figure:x.fig, masks:x.masks, equipment:x.tools, coverageGap:x.gap})),
      sources:[e.sources.wang],
      scope:'Virtual materials section and independent bench witnesses only. No clinical, biological, light-exposure or real equipment guidance. None of the modeled witnesses is a manufacturing acceptance test.'};
  }
  function csv(input={}) {
    const {geometry:g,optical:o,dark:d,isolation:t,input:s}=report(input);
    const rows=[['witness','item','value','unit','basis'],
      ['configuration','research-width',s.size,'um','reported nominal Wang pixel width'],
      ['configuration','synthetic-scenario',s.fault,'','teaching assumption'],
      ['section','release-result',g.sectionReleaseResult,'','schematic witness; not process test'],
      ['optical','reported-single-diode-slope',o.sourceResponsivity_A_per_W,'A/W','Wang 2012 section 3.2; 880 nm and zero bias'],
      ['optical','inferred-EQE',o.derivedEQE,'ratio','derived from reported slope, not measured here'],
      ['optical','virtual-power',o.incidentVirtualPower_uW,'uW','synthetic scalar test input'],
      ['optical','predicted-current-magnitude',o.predictedMagnitude_uA,'uA','source slope times virtual transmitted power; single diode'],
      ['dark','reported-lower',d.interval_pA[0],'pA','Wang 2012 section 3.1; three series junctions'],
      ['dark','reported-upper',d.interval_pA[1],'pA','Wang 2012 section 3.1; three series junctions'],
      ['dark','synthetic-witness',d.syntheticWitness_pA,'pA','synthetic dark witness; not measured'],
      ['dry-isolation','max-transfer',t.peakTransferFraction,'ratio','synthetic dry circuit; not a PRIMA calibration'],
      ...t.nodes_mV.map((x,i)=>['dry-isolation',i?'N'+i:'C',x,'mV','synthetic nodal solution'])];
    const quote=v=>'"'+String(v).replace(/"/g,'""')+'"';
    return rows.map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
  }
  return {revision,constants,cfg,releaseIndex,index,normalize,quantEfficiency,optics,dark,hexVertices,coupon,geometry,isolation,run,report,csv};
});
