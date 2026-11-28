(() => {
  'use strict';
  const E=window.PVEvidence,M=window.PVModel,$=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
  let route='wang',mode='traveler',view='section',specimen={...M.cfg};
  const ink={bg:'#101d21',grid:'#2b4145',line:'#59736d',silicon:'#557b87',siliconTop:'#416e75',poly:'#d5a46c',oxide:'#a7cfda',handle:'#344750',n:'#88d6dd',p:'#eb9d83',arc:'#8dafc4',metal:'#eacd9d',nitride:'#7ea1bd',ir:'#ffd59a',text:'#d4e5df',muted:'#a6c0b9',gold:'#f4bf84',mint:'#8ce5c7',red:'#ffab9d'};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const f=(v,n=2)=>Number(v).toFixed(n);
  const pct=(v,n=1)=>`${f(v*100,n)}%`;
  const mV=v=>`${f(v, v < .1 ? 4 : 2)} mV`;
  const ann=s=>{$('status').textContent=s;};
  const link=(id,label)=>`<a href="https://buildthesimulation.com/simulations/equipment/${id}/" target="_blank" rel="noopener">${esc(id)} · ${esc(label||E.tools[id][0])}</a>`;
  const inlineSource=(id,label)=>`<a href="${esc(E.sources[id].url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  const rect=(x,y,w,h,color,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" ${extra}/>`;
  const line=(x,y,u,v,stroke=ink.line,w=1,extra='')=>`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
  const text=(x,y,s,size=16,color=ink.text,anchor='start',extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-family="ui-monospace,monospace" font-size="${size}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;
  const path=(d,fill='none',stroke=ink.line,w=1,extra='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
  const polygon=(pts,color,stroke=ink.line,w=1)=>`<polygon points="${pts.map(p=>p.map(x=>f(x,2)).join(',')).join(' ')}" fill="${color}" stroke="${stroke}" stroke-width="${w}"/>`;
  const dot=(x,y,r,color,stroke='none',w=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="${stroke}" stroke-width="${w}"/>`;
  const svg=(w,h,name,inside)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name)}"><title>${esc(name)}</title>${inside}</svg>`;
  const back=(id,w,h)=>`<defs><pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 20V0H20" fill="none" stroke="${ink.grid}" stroke-width=".55"/></pattern></defs>${rect(0,0,w,h,ink.bg)}${rect(0,0,w,h,`url(#${id})`)}`;
  const callout=(d,c=ink.gold)=>path(d,'none',c,1.1,'stroke-dasharray="3 3"');
  function section(g){
    const i=g.stageNumber, j=M.index, w=640,h=365, inGap=[172,193],outGap=[372,397], ranges=[[49,172],[193,372],[397,585]];
    const b=[];
    b.push(back('cross-grid',w,h), `<desc>Source Wang 2012, Fig. 1 and section 2.1, DOI 10.1088/1741-2560/9/4/046014. Original vector, schematic only. No product layer drawing or fabrication mask.</desc>`,
      text(26,32,'PV–12 / SECTION',15,ink.gold),text(614,32,'VERTICAL SCALE EXAGGERATED',13,ink.muted,'end'));
    if(g.siliconHandle){
      b.push(rect(49,234,536,65,'url(#handle-tone)','stroke="#637879"'),line(50,242,584,242,'#4e6267'),text(316,268,'SILICON HANDLE',16,ink.text,'middle'));
    }else{
      b.push(path('M49 236v54h536v-54','none','#748b83',1,'stroke-dasharray="6 7" opacity=".5"'),text(317,269,'HANDLE REMOVED',16,ink.muted,'middle'));
    }
    if(i<j.drie||g.crossGapBOX)b.push(rect(49,224,536,10,ink.oxide));
    else for(const [a,c] of [[49,372],[397,585]])b.push(rect(a,224,c-a,10,ink.oxide));
    b.push(`<defs><linearGradient id="handle-tone" x2="0" y2="1"><stop offset="0" stop-color="#394e56"/><stop offset="1" stop-color="#263b44"/></linearGradient><linearGradient id="si-tone" x2="0" y2="1"><stop offset="0" stop-color="#72949c"/><stop offset="1" stop-color="#41616e"/></linearGradient><pattern id="poly-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#a97d4d"/><path d="M-1 6 6 -1 M3 8 8 3" stroke="#d5a46c" stroke-width="1.2"/></pattern></defs>`);
    if(i<j.drie)b.push(rect(49,139,536,85,'url(#si-tone)','stroke="#829fa5"'));
    else for(const [a,c] of ranges)b.push(rect(a,139,c-a,85,'url(#si-tone)','stroke="#829fa5"'));
    if(i>=j.drie){
      for(const [k,[a,c]] of [inGap,outGap].entries()) {
        if(i>=j.fill){
          if(k===0||i<j.reopen)b.push(rect(a+2,139,c-a-4,85,'url(#poly-hatch)','stroke="#d5a46c"'));
          b.push(line(a+1,141,a+1,222,ink.oxide,2.8),line(c-1,141,c-1,222,ink.oxide,2.8));
        }
      }
    }
    if(i>=j.window&&i<j.anneal)for(const [a,c] of ranges)b.push(rect(a,128,c-a,i===j.window?11:10,ink.oxide));
    if(i===j.fill)b.push(rect(49,115,536,13,'url(#poly-hatch)','stroke="#d5a46c"'));
    if(i>=j['n-plus'])for(const x of [106,258,473])b.push(rect(x,139,27,13,ink.n,'rx="3"'));
    if(i>=j['p-plus'])for(const x of [142,320,525])b.push(rect(x,139,23,13,ink.p,'rx="3"'));
    if(i>=j.anneal){
      for (const [a,c] of ranges) b.push(rect(a,132,c-a,7,ink.arc));
      if(i>=j.route){
        // A p+ terminal of the left junction joins the next junction's n+ terminal across the INTERNAL partition.
        b.push(path('M153 140v-12h114v12','none',ink.metal,5));
        for(const x of [112,334,485,537])b.push(path(`M${x} 140v-12h9`,'none',ink.metal,5));
      }
      if(i>=j.nitride){
        for(const [a,c] of ranges)b.push(rect(a,117,c-a,7,ink.nitride));
        for(const x of [105,258,469])b.push(rect(x,116,16,9,ink.bg));
      }
      if(i>=j.electrode){
        for(const [a,c] of [[71,110],[249,286],[482,515],[544,568]])b.push(rect(a,104,c-a,11,ink.ir,'rx="2"'));
        for(const x of [111,266,485])b.push(rect(x-4,109,8,19,ink.ir,'rx="1"'));
      }
    }
    if(g.siliconWeb)b.push(rect(370,208,29,16,ink.red,'stroke="#fad7c9" stroke-width="1"'));
    if(g.surfaceStringer)b.push(path('M361 108q24 14 47 0','none',ink.red,5));
    if(g.residualBOX)b.push(rect(371,225,27,8,'#dcc596','stroke="#f4bf84" stroke-width="1.2"'));
    if(i>=j.window){
      b.push(callout('M181 131V72H69'),callout('M385 131V72H574'),text(68,66,'IN-PIXEL',14,ink.gold),text(572,66,'BETWEEN PIXELS',14,ink.gold,'end'));
      const inner=(i<j.drie?'window':(i<j.fill?'open to BOX':'oxide-lined fill'));
      const outer=(i<j.drie?'window':(i<j.fill?'open to BOX':(i<j.reopen?'filled for processing':'open gap')));
      b.push(text(68,89,inner,14,ink.text),text(572,89,outer,14,ink.text,'end'));
    }else b.push(text(316,83,'SILICON-ON-INSULATOR',19,ink.text,'middle'));
    b.push(text(285,195,'DEVICE Si',17,ink.text,'middle'),text(285,214,'30 µm',14,ink.text,'middle'),
      line(606,139,606,224,ink.gold,1.6),line(599,139,613,139,ink.gold),line(599,224,613,224,ink.gold));
    b.push(rect(50,318,14,9,ink.oxide),text(69,326,'Buried oxide (BOX)',14,ink.muted),text(586,326,i>=j.drie?'Etched trench: nominal 5 µm wide':'Receive-stage schematic',14,ink.muted,'end'));
    if(g.faultEdge)b.push(text(48,350,`Synthetic ${g.residualBOX?'BOX remnant':g.surfaceStringer?'metal stringer':'silicon web'} · ${g.faultEdge}`,14,ink.red));
    else b.push(text(49,350,'Wang 2012 · '+E.stages[i].fig,14,ink.gold));
    return svg(w,h,`${g.stageLabel}. ${g.innerTrench}; outer ${g.outerTrench}. ${g.siliconHandle?'Handle present':'Handle removed'}.${g.faultEdge?' Synthetic defect at '+g.faultEdge+'.':''}`,b.join(''));
  }
  function oblique(g,s){
    const w=640,h=365,i=g.stageNumber,j=M.index, geo=M.coupon(s.size), sc=146/(geo.widthUm+geo.outerGapUm);
    const project=(x,y,z=0)=>[322+sc*(x-y*.26),184+sc*(x*.09+y*.56)+z];
    const pts=(p,oversize=1,z=0)=>p.poly.map(([x,y])=>project(p.x+(x-p.x)*oversize,p.y+(y-p.y)*oversize,z));
    const c=[back('patch-grid',w,h),text(26,32,'PV–12 / SEVEN-PIXEL CUTAWAY',15,ink.gold),text(615,32,'SCHEMATIC',13,ink.muted,'end')];
    const thickness=geo.thicknessUm*sc*.44, open=i===j.drie||i>=j.reopen,zBase=g.siliconHandle?17+Math.max(thickness,10):thickness+3;
    if(g.siliconHandle)c.push(polygon([[91,208],[466,208],[556,274],[161,287]],'#233e45','#486468',2),text(345,304,'carrier / handle shown schematically',14,ink.muted,'middle'));
    const rotated=geo.pixels.slice().sort((a,b)=>project(a.x,a.y)[1]-project(b.x,b.y)[1]);
    for(const p of rotated){
      const sizeScale=open?1:geo.modelCenterDistanceUm/geo.widthUm;
      const top=pts(p,sizeScale),bottom=pts(p,sizeScale,Math.min(zBase,thickness+8));
      for(let k=0;k<6;k++){const m=(k+1)%6;c.push(polygon([top[k],top[m],bottom[m],bottom[k]],p.id==='C'?'#304e53':'#25444a','#4c6566',1));}
      c.push(polygon(top,p.id==='C'?'#43676c':'#304e57',p.id==='C'?'#d2a97f':'#759790',p.id==='C'?1.7:1.2));
      const [cx,cy]=project(p.x,p.y), outlined=pts(p,.83), receptor=pts(p,.72), r=geo.activeDiameterUm*sc/2;
      if(i>=j.window){
        for(let spoke=0;spoke<3;spoke++){
          const a=spoke*Math.PI*2/3+Math.PI/2;
          const u=project(p.x+geo.widthUm*.16*Math.cos(a),p.y+geo.widthUm*.16*Math.sin(a));
          const v=project(p.x+geo.widthUm*.41*Math.cos(a),p.y+geo.widthUm*.41*Math.sin(a));
          c.push(line(...u,...v,i>=j.fill&&p.id==='C'?ink.poly:'#91a6a4',p.id==='C'?2:1.2,i===j.window?'stroke-dasharray="3 3"':''));
        }
      }
      if(i>=j['n-plus']&&p.id==='C')c.push(dot(cx-23,cy-15,3,ink.n),dot(cx+23,cy-12,3,ink.n),dot(cx+7,cy+18,3,ink.n));
      if(i>=j['p-plus']&&p.id==='C')c.push(dot(cx-28,cy-9,3,ink.p),dot(cx+27,cy-7,3,ink.p),dot(cx+12,cy+14,3,ink.p));
      if(i>=j.route&&p.id==='C')c.push(path(`M${cx-23} ${cy-15}l-10 22 22 12m34-31 12 11-29 17`,'none',ink.metal,2));
      if(i>=j.electrode){
        c.push(polygon(outlined,'none',p.id==='C'?ink.ir:'#a59177',p.id==='C'?2.5:1.3));
        if(p.id==='C')c.push(polygon(receptor,'none','#836f59',.7));
        c.push(`<ellipse cx="${cx}" cy="${cy}" rx="${f(r)}" ry="${f(r*.60)}" fill="${p.id==='C'?ink.ir:'#ad987e'}" stroke="${ink.bg}" stroke-width=".9"/>`);
      }
    }
    if(g.faultEdge){
      const q=geo.pixels[s.target], a=project(0,0),b=project(q.x,q.y),u=(v,k)=>a[k]+(b[k]-a[k])*v;
      c.push(line(u(.40,0),u(.40,1),u(.61,0),u(.61,1),g.residualBOX?ink.gold:ink.red,5,'stroke-linecap="round"'));
      c.push(text(615,306,`Synthetic span · ${g.faultEdge}`,14,ink.red,'end'));
    }
    const scaleLen=50*sc;
    c.push(line(26,320,26+scaleLen,320,ink.mint,1.8),line(26,315,26,325,ink.mint),line(26+scaleLen,315,26+scaleLen,325,ink.mint),text(26,346,'50 µm in plane',14,ink.mint),text(616,346,`${s.size} µm nominal · ${geo.activeDiameterUm} µm center pad`,14,ink.gold,'end'));
    return svg(w,h,`Schematic oblique seven-pixel patch at ${g.stageLabel}, ${s.size} micron research width${g.faultEdge?', defect '+g.faultEdge:''}`,c.join(''));
  }
  function diode(x,y,label){
    return rect(x-9,y-9,18,17,'#133034','rx="2" stroke="#f4bf84" stroke-width="1.6"')+text(x+19,y+4,label,14,ink.text);
  }
  function wangCircuit(){
    const c=[line(18,24,321,24,'#748b83',1.5),dot(28,24,4,ink.gold),dot(309,24,4,ink.mint)];
    for(const [n,x] of [104,169,234].entries()){
      c.push(rect(x-13,13,26,22,'#0f1e21'));
      c.push(polygon([[x+8,15],[x+8,33],[x-8,24]],'none',ink.gold,1.6),line(x-9,14,x-9,34,ink.gold,2),text(x,50,'D'+(n+1),12,ink.text,'middle'));
    }
    c.push(text(22,50,'Active',11,ink.gold),text(319,50,'Return',11,ink.mint,'end'));
    return svg(338,55,'Wang research pixel: three series photodiodes between the central cathode and one local anode return. Symbolic circuit, not a product mask.',c.join(''));
  }
  function primaArt(){
    const c=[back('prima-grid',640,365),text(23,32,'01 / PUBLIC ARRAY TOPOLOGY',14,ink.gold),text(409,32,'02 / ONE PIXEL',14,ink.gold),line(391,49,391,331,ink.line,1,'stroke-dasharray="4 5"')];
    const p=[[0,0],...Array.from({length:6},(_,i)=>[84*Math.cos(i*Math.PI/3),84*Math.sin(i*Math.PI/3)])].map(([x,y])=>[193+x,158+y]);
    for(const [cx,cy] of p){
      c.push(polygon(M.hexVertices(cx,cy,84),'#263d46','#54746f',1.7),polygon(M.hexVertices(cx,cy,73),'none',ink.mint,3),dot(cx,cy,9,ink.gold),dot(cx,cy,4,'#5d4b3a'));
    }
    for(let i=1;i<=6;i++)for(const j of [0,i%6+1]){const [u,v]=p[i],[x,y]=p[j],a=(u+x)/2,b=(v+y)/2;c.push(line(a-(u-x)*.09,b-(v-y)*.09,a+(u-x)*.09,b+(v-y)*.09,ink.mint,2.5));}
    c.push(text(26,295,'378 sites on the reported die',14,ink.text),text(26,317,'Return mesh (mint) · active nodes (gold)',13,ink.muted));
    c.push(dot(475,84,6,ink.gold),text(487,89,'ACTIVE',14,ink.gold),line(475,91,475,126,ink.line,1.8),diode(475,135,'D1'),line(475,143,475,178,ink.line,1.8),diode(475,187,'D2'),line(475,195,475,261,ink.line,1.8),dot(475,263,6,ink.mint),text(488,268,'RETURN MESH',14,ink.mint));
    c.push(path('M475 105H570v31l-9 7 18 8-18 8 18 8-18 8 9 7v60h-95','none',ink.gold,1.8),text(564,211,'Rsh',15,ink.gold,'end'),text(409,303,'Reported poly-Si shunt',13,ink.text),text(409,323,'Symbolic circuit; no values',13,ink.muted));
    return svg(640,365,'First-generation PRIMA public topology: two series photodiodes, a polysilicon shunt, and a connected hexagonal return mesh. Seven symbolic pixels shown.',c.join(''));
  }
  function optChart(o){
    const w=360,h=192,x0=45,y0=149, X=v=>x0+274*v/80,Y=v=>y0-118*v/36;
    const c=[rect(0,0,w,h,ink.bg),text(20,19,'|I|  µA',13,ink.muted)];
    for(let i=0;i<=4;i++){const val=20*i,x=X(val);c.push(line(x,29,x,y0,ink.grid),text(x,y0+17,val,12,ink.muted,'middle'));}
    for(const val of [0,10,20,30])c.push(line(x0,Y(val),319,Y(val),ink.grid),text(38,Y(val)+4,val,12,ink.muted,'end'));
    c.push(line(x0,29,x0,y0,ink.line,1.1),line(x0,y0,319,y0,ink.line,1.1),text(320,184,'VIRTUAL POWER  µW',12,ink.muted,'end'));
    c.push(line(x0,Y(0),X(80),Y(80*o.sourceResponsivity_A_per_W),ink.mint,2.5));
    if(o.virtualTransmittedFraction<1)c.push(line(x0,Y(0),X(80),Y(80*o.sourceResponsivity_A_per_W*o.virtualTransmittedFraction),ink.red,2.5,'stroke-dasharray="5 3"'));
    const x=X(o.incidentVirtualPower_uW),y=Y(o.predictedMagnitude_uA);
    c.push(line(x,y0,x,y,ink.gold,1.2,'stroke-dasharray="3 3"'),dot(x,y,5,ink.gold,'#181e20',1.6));
    return svg(w,h,`Slope-based one-diode line: reported ${o.sourceResponsivity_A_per_W} amps per watt. At virtual input ${o.incidentVirtualPower_uW} microwatts, predicted magnitude ${f(o.predictedMagnitude_uA)} microamps.`,c.join(''));
  }
  function darkChart(d){
    const x=p=>38+288*(Math.log10(p)+1)/4;
    const c=[rect(0,0,360,192,ink.bg),text(19,19,'REVERSE DARK MAGNITUDE',13,ink.muted),rect(x(1),62,x(100)-x(1),48,'#24423d','rx="5" stroke="#6aae99"'),line(38,94,326,94,ink.line,1.2),text((x(1)+x(100))/2,53,'Published range',13,ink.mint,'middle')];
    for(const value of [.1,1,10,100,1000])c.push(line(x(value),102,x(value),114,ink.line,1.2),text(x(value),129,value,12,ink.muted,'middle'));
    const hot=d.result!=='within-source-span', px=x(d.syntheticWitness_pA);
    c.push(line(px,71,px,104,hot?ink.red:ink.gold,1.4),dot(px,94,6,hot?ink.red:ink.gold,ink.bg,1.4),
      text(180,157,`${d.syntheticWitness_pA} pA  synthetic point`,13,hot?ink.red:ink.gold,'middle'),text(326,179,'LOG SCALE / pA',12,ink.muted,'end'));
    return svg(360,192,`Published reverse dark-current interval 1 to 100 picoamps, compared with ${d.syntheticWitness_pA} picoamp synthetic point.`,c.join(''));
  }
  function isoChart(t){
    const c=[rect(0,0,360,192,ink.bg),text(15,18,'C = FIXTURE SOURCE',12,ink.muted),text(345,18,'N = TERMINATED',12,ink.muted,'end')];
    const p=[[176,101],...Array.from({length:6},(_,i)=>[176+83*Math.cos(i*Math.PI/3),101+64*Math.sin(i*Math.PI/3)])];
    for(const {a,b,role} of t.graph)c.push(line(...p[a],...p[b],role==='conductive-bridge'?ink.red:'#55726f',role==='conductive-bridge'?3:1.1,role==='conductive-bridge'?'':'stroke-dasharray="3 3"'));
    p.forEach(([x,y],i)=>{const hot=i&&t.nodes_mV[i]/t.nodes_mV[0]>t.teachingThresholdFraction;c.push(dot(x,y,i?16:20,hot?'#522f2e':i?'#21403e':'#473b2b',hot?ink.red:i?ink.mint:ink.gold,1.5),text(x,y+4,i?'N'+i:'C',i?12:14,hot?ink.red:i?ink.mint:ink.gold,'middle'));});
    const max=Math.max(...t.nodes_mV.slice(1));
    c.push(text(16,187,`Peak neighbor: ${mV(max)}`,12, t.result==='coupled'?ink.red:ink.mint));
    return svg(360,192,`Dry interpixel isolation network. Highest neighbor voltage ${mV(max)} with ${t.nodes_mV[0]} millivolts at the center.`,c.join(''));
  }
  const dl=rows=>rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const badge=(l,r,kind='')=>`<div class="badge ${kind}"><b>${esc(l)}</b><span>${esc(r)}</span></div>`;
  function renderTraveler(r){
    const g=r.geometry,s=E.stages[specimen.stage],i=specimen.stage;
    all('[data-stage]').forEach(b=>{const n=Number(b.dataset.stage); b.classList.toggle('done',n<i); if(n===i)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    $('drawing-title').textContent=view==='section'?'Device cross-section':'Oblique test patch';
    $('drawing').innerHTML=view==='section'?section(g):oblique(g,specimen);
    $('wang-net').hidden=i<M.index.route;
    $('wang-net-svg').innerHTML=i<M.index.route?'':wangCircuit();
    $('drawing-caption').textContent=view==='section'?`${s.stack}. Section passes through one in-pixel partition and one outside boundary. Film heights and trench widths are enlarged for legibility.`:`${s.result}. Seven-pixel schematic; nominal cell width is interpreted across flats for the drawing. Not a mask or packing model.`;
    $('progress').textContent=`${i+1} / ${E.stages.length}`;
    $('prev').disabled=i===0; $('next').disabled=i===M.releaseIndex;
    $('current-source').innerHTML=inlineSource('wang','WANG 2012 / '+s.fig);
    $('current-title').textContent=s.title;
    $('current-description').textContent=s.fact;
    $('current-check').textContent=s.inspect;
    $('current-masks').textContent=s.masks.length?`${g.masks.length}/8 masks by this point · `+s.masks.map(n=>`M${n} ${E.masks[n-1]}`).join(' · '):`${g.masks.length}/8 masks by this point · No new mask`;
    $('current-tools').innerHTML=(s.tools.length?`<ul>${s.tools.map(id=>`<li>${link(id)}<span>${esc(E.tools[id][1])}</span></li>`).join('')}</ul>`:'<p>No matching operation runs on the virtual register at this checkpoint.</p>')+`<p class="gap">${esc(s.gap)}</p>`;
    $('load-witness').textContent=i===M.releaseIndex?'Open the released bench →':'Load released witness →';
  }
  function renderBench(r){
    const ready=r.runState==='ready';
    $('need-release').hidden=ready; $('bench-controls').hidden=!ready; $('bench-run').hidden=!ready;
    if(!ready){for(const key of ['bench-summary','optics-plot','dark-plot','isolation-plot','optics-readout','dark-readout','isolation-readout','neighbor-readout'])$(key).replaceChildren(); return;}
    $('fault').value=specimen.fault; $('target').value=String(specimen.target); $('target').disabled=!['trench','stringer','oxide'].includes(specimen.fault);
    $('power').value=String(specimen.power); $('power-read').textContent=specimen.power+' µW'; $('fault-detail').textContent=E.faults[specimen.fault].detail;
    const {geometry:g,optical:o,dark:d,isolation:t}=r, geom=g.sectionReleaseResult==='clear', darkOk=d.result==='within-source-span';
    $('bench-summary').innerHTML=badge('Release geometry',geom?'Open outer gap':'Obstructed gap',geom?'':'warn')+badge('Light conversion',o.result==='no-input'?'No virtual input':o.result==='nominal'?'Matches slope model':'Virtual optical loss',o.result==='no-input'?'neutral':o.result==='nominal'?'':'warn')+badge('Reverse dark',darkOk?'Within published range':'Above published range',darkOk?'':'warn')+badge('Dry isolation',t.result==='isolated'?'Below fixture limit':'Conductive transfer',t.result==='isolated'?'':'warn');
    $('optics-plot').innerHTML=optChart(o);
    $('optics-readout').innerHTML=dl([['Reported responsivity',f(o.sourceResponsivity_A_per_W)+' A/W'],['EQE inferred at 880 nm',pct(o.derivedEQE)],['Predicted |photocurrent|',f(o.predictedMagnitude_uA)+' µA'],['Unobscured model',f(o.unobscuredMagnitude_uA)+' µA'],['Virtual transmission',pct(o.virtualTransmittedFraction,0)]]);
    $('optics-domain').textContent=o.domain;
    $('dark-plot').innerHTML=darkChart(d);
    $('dark-readout').innerHTML=dl([['Reported §3.1 span',d.interval_pA.join('–')+' pA'],['Synthetic point',d.syntheticWitness_pA+' pA']]);
    $('isolation-plot').innerHTML=isoChart(t);
    $('isolation-readout').innerHTML=dl([['Peak neighbor fraction',pct(t.peakTransferFraction,t.peakTransferFraction<.0002?3:2)],['Fixture-only limit',pct(t.teachingThresholdFraction,0)],['Conductive boundary',t.targetEdge||'None']]);
    $('neighbor-readout').innerHTML=`<div class="neighbors">${t.nodes_mV.slice(1).map((v,k)=>`<span${v/t.nodes_mV[0]>t.teachingThresholdFraction?' class="hot"':''}>N${k+1} ${mV(v)}</span>`).join('')}</div>`;
  }
  function render(){
    all('[data-route]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.route===route)));
    $('wang').hidden=route!=='wang'; $('prima').hidden=route!=='prima';
    if(route==='prima'){
      // The architecture branch never receives or renders numerical witness data.
      renderBench(M.run({route:'prima'})); $('drawing').replaceChildren(); $('wang-net-svg').replaceChildren();
      $('prima-drawing').innerHTML=primaArt(); return;
    }
    all('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    all('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    $('size').value=String(specimen.size);
    $('traveler').hidden=mode!=='traveler'; $('bench').hidden=mode!=='bench';
    const gains=M.run(specimen);
    if(mode==='bench')renderBench(gains);
    else renderTraveler(gains);
  }
  function change(attrs, msg){specimen={...M.normalize({...specimen,...attrs})};render();if(msg)ann(msg);}
  function selectStage(n){if(n<0||n>M.releaseIndex)return;change({stage:n},`${E.stages[n].title}. Checkpoint ${n+1} of ${E.stages.length}.`);}
  function loadBench(){mode='bench';change({stage:M.releaseIndex},'Released virtual witness loaded.'); $('bench-controls').scrollIntoView({block:'start',behavior:'auto'});}
  function download(name,payload,mime){const u=URL.createObjectURL(new Blob([payload],{type:mime})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);ann('Downloaded '+name);}
  function fileRun(){return route==='wang'&&mode==='bench'&&M.run(specimen).runState==='ready';}
  $('download-json').addEventListener('click',()=>{if(fileRun())download('PV12-witness.json',JSON.stringify(M.report(specimen),null,2)+'\n','application/json');});
  $('download-csv').addEventListener('click',()=>{if(fileRun())download('PV12-checks.csv',M.csv(specimen),'text/csv');});
  $('download-svg').addEventListener('click',()=>{if(fileRun())download('PV12-section.svg',section(M.run(specimen).geometry),'image/svg+xml');});
  $('steps').innerHTML=E.stages.map((s,i)=>`<button type="button" aria-label="${esc(`Checkpoint ${i+1}: ${s.title}`)}" data-stage="${i}"><span class="step-key">${esc(s.key)}</span><span class="step-desc">${esc(s.short)}</span></button>`).join('');
  $('fault').innerHTML=Object.entries(E.faults).map(([k,v])=>`<option value="${esc(k)}">${esc(v.name)}</option>`).join('');
  $('sources-list').innerHTML=Object.values(E.sources).map(s=>`<article class="source"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a><p>${esc(s.detail)}</p><span class="doi">${esc(s.doi)}</span></article>`).join('');
  $('formulas-detail').innerHTML=`<p><b>Reported single-diode slopes at 880 nm, zero bias:</b> 70 µm: 0.36 A/W; 140 µm: 0.40 A/W; 280 µm: 0.33 A/W. ${inlineSource('wang','Wang §3.2 and Fig. 9b')}.</p><p><b>Power-to-current model:</b> <code>|I| = R × P × T</code>, with transmitted fraction <code>T = 1</code> or synthetic <code>0.45</code>. Inferred quantum efficiency is <code>R h c / (q λ)</code>. These equations do not imply a series-array current, a spectral fit or a beam-exposure setup.</p><p><b>Dark sample:</b> reported 1–100 pA for three series-connected photodiodes at stated room temperature, from ${inlineSource('wang','Wang §3.1')}. Our 8 and 240 pA points are arbitrary, independent of optical response and the seven-node fixture; no reverse I–V waveform or threshold is inferred.</p><p><b>Dry fixture assumptions:</b> a virtual 100 mV source at C; 1 GΩ termination at each neighbor; 10 TΩ per nominal link; a single 50 MΩ substituted link for conductive web or stringer. The solver enforces Kirchhoff’s current law. A 1% transfer limit is a classroom screen, not a device spec. An intact BOX remnant is treated as insulating.</p><p><b>Register links:</b> ${link('09-02')}; ${link('11-05')}; ${link('15-14')}. They illustrate roles and do not certify a measurement floor, detector at the specimen, or optical bench.</p>`;
  all('[data-route]').forEach(b=>b.addEventListener('click',()=>{route=b.dataset.route;render();ann(route==='prima'?'First-generation PRIMA architecture. Numeric witnesses locked.':'Wang–Palanker 2012 research route.');}));
  all('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();ann(b.textContent);}));
  all('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();ann($('drawing-title').textContent);}));
  all('[data-stage]').forEach(b=>b.addEventListener('click',()=>selectStage(Number(b.dataset.stage))));
  $('prev').addEventListener('click',()=>selectStage(specimen.stage-1)); $('next').addEventListener('click',()=>selectStage(specimen.stage+1));
  $('load-witness').addEventListener('click',loadBench); $('bench-load').addEventListener('click',loadBench);
  $('size').addEventListener('change',e=>change({size:Number(e.target.value)},e.target.value+' micron research pixel.'));
  $('fault').addEventListener('change',e=>change({fault:e.target.value},'Synthetic case: '+E.faults[e.target.value].name));
  $('target').addEventListener('change',e=>change({target:Number(e.target.value)},'Boundary C to N'+e.target.value));
  $('power').addEventListener('input',e=>change({power:Number(e.target.value)}));
  render();
})();
