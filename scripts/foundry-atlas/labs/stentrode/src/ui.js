(()=>{
"use strict";
const E=StentBench,$=x=>document.getElementById(x),num=(x,d=2)=>Number(x).toFixed(d),clamp=(a,l,h)=>Math.min(h,Math.max(l,a));
let state=E.norm(),base=null,snap=E.result(state);
for(const id of ['site','inspection'])for(let i=0;i<8;i++)$(id).add(new Option('D'+(i+1),String(i)));
for(const [v,n] of Object.entries(E.faultNames))$('fault').add(new Option(n,v));
E.stations.forEach((st,i)=>{let b=document.createElement('button');b.innerHTML='<b>'+st[0]+'</b><span>'+st[1]+'</span>';
 b.setAttribute('aria-label','Station '+st[0]+': '+st[1]);b.onclick=()=>update({stage:i});$('stages').append(b)});
E.refs.forEach(ref=>{let p=document.createElement('p'),a=document.createElement('a');a.href=ref.url;a.textContent=ref.title;a.target='_blank';a.rel='noopener noreferrer';
 p.append(a,document.createTextNode(' · '+ref.locator+'. '+ref.scope));$('reflist').append(p)});
function update(ch){state=E.norm({...state,...ch});render();}
function fmt(arr,prefix){return arr.length?arr.map(i=>prefix+(i+1)).join(', '):'none'}
function line(x1,y1,x2,y2,c= '#567268',w=1.1,extra=''){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+w+'" '+extra+'/>'}
function txt(x,y,s,fill='#416053',size=11,options=''){return '<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-size="'+size+'" font-family="system-ui,sans-serif" '+options+'>'+s+'</text>'}
function svg(){
 const s=state,g=snap.geometry,p=E.published,tau=Math.PI*2,roll=s.rotation*Math.PI/180;
 let d='',screw=0;const cx=44,cy=103,rx0=57,ry0=58,span0=555,span=span0*g.length/p.length;
 const dispR=ry0*g.diameter/p.diameter;
 const pt=(row,col)=>{const x=cx+row/12*span;const theta=col*tau/8+roll;
 if(s.view==='flat')return [x,55+((col%8+8)%8)/8*94,1];
 return [x+Math.cos(theta)*dispR*.30,cy+Math.sin(theta)*dispR,Math.cos(theta)]};
 const flatY=i=>48+i/8*109;
 let lines=[]; const diskDepth=[];const sitePos=[];
 if(s.view==='volume'){
  for(let row=0;row<12;row++)for(let c=0;c<8;c++)for(let k of [-1,1]){
    if((row+c)%2)continue;let a=pt(row,c),b=pt(row+1,c+k);lines.push({z:(a[2]+b[2])/2,a,b});
  }
  lines.sort((a,b)=>a.z-b.z);
  d+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+dispR*.30+'" ry="'+dispR+'" fill="#cecfb3" fill-opacity=".22" stroke="#96a491" stroke-dasharray="2 3"/>';
  lines.forEach(l=>{const visible=l.z>=-.02;d+=line(l.a[0],l.a[1],l.b[0],l.b[1],visible?'#4d6a5e':'#adb9a5',visible?1.55:0.85,visible?'':'stroke-dasharray="3 2"')});
  d+='<ellipse cx="'+(cx+span)+'" cy="'+cy+'" rx="'+dispR*.30+'" ry="'+dispR+'" fill="none" stroke="#8b9a80" stroke-dasharray="2 3"/>';
 }else{
  d+='<rect x="'+cx+'" y="48" width="'+span+'" height="109" fill="#cfdec4" fill-opacity=".26" stroke="#84977d" stroke-dasharray="4 3"/>';
  // Duplicate the seam crossing in a flat rectangular patch; do not draw a spurious line across the cut.
  for(let row=0;row<12;row++)for(let c=0;c<=8;c++)for(let k of [-1,1]){
    if((row+c)%2)continue;let b=c+k;if(b<0||b>8)continue;d+=line(cx+span*row/12,flatY(c),cx+span*(row+1)/12,flatY(b),'#5c7568',.9);
  } d+=txt(cx,37,'Unrolled circumference • seam shown twice', '#597061',10)
 }
 const card=snap.siteLocations;
 if(s.stage>=1)card.forEach((a,i)=>{
  let v=s.view==='flat'?[cx+a.row*span/12,flatY(a.column),1]:pt(a.row,a.column);
  if(s.stage===1||s.stage===2)v=[cx+55+i*64,186,1];
  sitePos[i]=v;
 });
 if(s.stage>=4){
  const a=sitePos[s.inspect],broken=s.fault==='open'&&s.site===s.inspect;
  // Schematic fan-out, deliberately offset to keep lattice and wires distinct.
  d+=line(10,179,35,179,'#886d47',3);d+='<path d="M 34 179 Q 45 178 55 164 L '+(a[0]-12)+' '+(a[1]+15)+' L '+(a[0]-2)+' '+(a[1]+3)+'" fill="none" stroke="'+(broken?'#ab5542':'#ad6d39')+'" stroke-width="2" stroke-dasharray="'+(broken?'4 6':'none')+'"/>';
 }
 if(s.stage===1||s.stage===2)d+=txt(45,169,s.stage===1?'Unattached disc coupons (not mounted)':'Lead/disc subassemblies (not mounted)','#745839',11)
 if(s.stage===2)sitePos.forEach(v=>{d+=line(v[0]-19,v[1]+6,v[0]-3,v[1], '#8f7b57',1.5)});
 // Optical labels for selected face only. All colors also carry text/pick controls.
 sitePos.map((p,i)=>({p,i})).sort((a,b)=>a.p[2]-b.p[2]).forEach(({p:v,i})=>{
  const chosen=s.inspect===i, back=v[2]<0, fill=chosen?'#b56031':back?'#e4d9c0':'#e3c790';
  const rx=chosen?7.4:5.7,ry=s.stage<3||s.view==='flat'?rx:rx*(0.5+0.5*Math.abs(v[2]));
  d+='<g class="geoDisc" data-disc="'+i+'"><title>D'+(i+1)+(chosen?' · inspected':'')+'</title><circle cx="'+v[0]+'" cy="'+v[1]+'" r="11" fill="transparent"/><ellipse cx="'+v[0]+'" cy="'+v[1]+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" stroke="'+(chosen?'#783d1f':'#756b51')+'" stroke-width="'+(chosen?2:1.1)+'"/></g>';
  if(chosen)d+=txt(v[0]+9,v[1]-8,'D'+(i+1),'#773e21',12,'font-weight="700"');
 });
 const yaxis=215;
 d+=line(cx,yaxis,cx+span,yaxis,'#708574',.8)+line(cx,yaxis-4,cx,yaxis+4)+line(cx+span,yaxis-4,cx+span,yaxis+4)+txt(cx+span/2,yaxis+18,num(g.length,2)+' mm axial span'+(s.stage>=5&&s.diameter<3?' · surrogate':' · nominal'), '#476153',11,'text-anchor="middle"');
 if(!s.stage)d+=txt(48,186,'Supplied frame only • no contact network yet','#506a5c',12);
 $('geometry').innerHTML=d;$('geometry').querySelectorAll('[data-disc]').forEach(x=>x.onclick=()=>update({inspect:Number(x.dataset.disc)}));
 const r=42,X=114,Y=71,available=s.stage>=1,hasMask=s.stage>=3&&s.inspect===s.site,cover=hasMask?s.cover:0,h=2*r*cover/100;
 let f='<defs><clipPath id="apClip"><circle cx="'+X+'" cy="'+Y+'" r="'+r+'"/></clipPath><pattern id="maskH" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="6" height="6" fill="#eed5b5"/><line y2="6" stroke="#985d37" stroke-width="1.1"/></pattern></defs>';
 f+=line(X-66,Y,X+65,Y,'#afb5a2',.6)+line(X,Y-59,X,Y+59,'#afb5a2',.6);
 f+='<circle cx="'+X+'" cy="'+Y+'" r="'+r+'" fill="'+(available?'#c6b587':'#f2ead8')+'" stroke="#71674c" stroke-width="2" '+(!available?'stroke-dasharray="3 3"':'')+'/>';
 if(h>0)f+='<rect x="'+(X-r)+'" y="'+(Y-r)+'" width="'+h+'" height="'+(2*r)+'" clip-path="url(#apClip)" fill="url(#maskH)"/>';
 const ly=132;f+=line(X-r,ly,X+r,ly,'#5c6c5c')+line(X-r,ly-4,X-r,ly+4)+line(X+r,ly-4,X+r,ly+4)+txt(X,ly+18,'750 µm nominal diameter','#425543',11,'text-anchor="middle"');
 f+=txt(6,15,available?'D'+(s.inspect+1)+' / top face':'Source drawing only','#5d6d5c',11);
 $('face').innerHTML=f;
}
function matrix(){
 const audit=snap.continuity,inspect=state.inspect,t=$('matrix');t.tHead.innerHTML='<tr><th scope="col">Pin</th>'+Array.from({length:8},(_,i)=>'<th scope="col">D'+(i+1)+'</th>').join('')+'<th scope="col">Frame</th></tr>';
 t.tBodies[0].innerHTML=audit.rows.map((r,i)=>{
  const active=audit.testEnabled;const fmtcell=(present,ok,name)=>'<td class="'+(active&&present?(ok?'hit':'wrong'):'')+'" aria-label="C'+(i+1)+' to '+name+': '+(!active?'not audited':present?'connected':'no path')+'">'+(!active?'·':present?'●':'–')+'</td>';
  return '<tr class="'+(i===inspect?'selectedrow':'')+'"><th scope="row"><button class="pinInspect" data-pin="'+i+'" title="Inspect D'+(i+1)+' (nominally C'+(i+1)+')">C'+(i+1)+'</button></th>'+Array.from({length:8},(_,j)=>fmtcell(r.discs.includes(j),i===j,'D'+(j+1))).join('')+fmtcell(r.frame,false,'frame')+'</tr>';
 }).join('');
 t.querySelectorAll('[data-pin]').forEach(x=>x.onclick=()=>update({inspect:Number(x.dataset.pin)}));
 $('testBadge').textContent=!audit.testEnabled?'Not yet tested':audit.passCount+' / 8 correctly connected';
 $('testBadge').className='badge'+(audit.testEnabled&&audit.passCount!==8?' fail':'');
 $('diagnosticTitle').textContent='Disc D'+(inspect+1)+' · nominal C'+(inspect+1);
 const reachable=audit.rows.filter(x=>x.discs.includes(inspect)).map(x=>x.pin),r=audit.rows[inspect];
 $('diagnostic').textContent=!audit.testEnabled?'Station 07 enables the dry test. Physical contact presence does not prove continuity.':'D'+(inspect+1)+' is reached by '+fmt(reachable,'C')+'. From its nominal pin C'+(inspect+1)+', reached discs: '+fmt(r.discs,'D')+'; extra pins: '+fmt(r.otherPins,'C')+'; frame path: '+(r.frame?'yes':'no')+'. Nominal-pin result: '+r.reason+'.';
 const gate=snap.apertureGate;$('aperturegate').innerHTML='<span class="gate'+(gate===false?' fail':'')+'">'+(gate===null?'Aperture gate: not mounted.':('D'+(inspect+1)+' visible-face gate: '+(gate?'PASS':'FAIL')+' · '+num(snap.aperture.exposedFraction*100,1)+'%'))+'</span>';
}
const faultComment={none:'No electrical defect. Face coverage can still fail optical inspection without opening a single net.',open:'An open removes one wire-to-disc edge. The disc remains visible, but no fixture pin should reach it.',frame:'Insulation loss connects a wire to the conductive scaffold. The correct diagonal may still be present; audit the frame column.',bridge:'The selected wire and the next wire are tied together. Two pins can now reach the same two discs. D8 wraps to D1.',swap:'Two proximal assignments exchange positions. Each pin can still reach exactly one disc, but the identity check fails on both.'};
function render(){
 snap=E.result(state);let s=state,st=E.stations[s.stage];
 for(let i=0;i<8;i++){let b=$('stages').children[i];b.className=i===s.stage?'active':i<s.stage?'prior':'';b.setAttribute('aria-current',i===s.stage?'step':'false')}
 $('stageTag').textContent=st[2];$('stageTitle').textContent=st[0]+' / '+st[1];$('stageDetail').textContent=st[3];$('stationTool').textContent=st[4];$('stationCheck').textContent=st[5];
 $('prev').disabled=s.stage===0;$('next').disabled=s.stage===7;
 $('diam').value=s.diameter;$('diam').disabled=s.stage<5;$('dout').textContent=num(snap.geometry.diameter,2)+' mm';
 $('rot').value=s.rotation;$('rot').disabled=s.view==='flat';$('rout').textContent=s.rotation+'°';
 $('cover').value=s.cover;$('cover').disabled=s.stage<3;$('cout').textContent=s.stage>=3?s.cover+'%':'not mounted';
 $('site').value=s.site;$('inspection').value=s.inspect;$('fault').value=s.fault;$('faultHint').textContent='Target D'+(s.site+1)+'. '+faultComment[s.fault];
 $('volume').setAttribute('aria-pressed',String(s.view==='volume'));$('flat').setAttribute('aria-pressed',String(s.view==='flat'));
 $('facePresent').textContent=s.stage>=1?'D'+(s.inspect+1)+' exposed area':'Pending intake';
 $('area').textContent=s.stage>=1?num(snap.aperture.exposed,4)+' mm²':'–';
 $('faceNote').textContent=s.stage===0?'Dimensioned reference, not an attached part.':s.stage<3?'Unmounted face, no masking modeled.':s.inspect===s.site?'Hatching indicates assumed occlusion, not measured adhesive.':'No occlusion is assigned to this disc.';
 $('dia').textContent=num(snap.geometry.diameter,2)+' mm';$('len').textContent=num(snap.geometry.length,2)+' mm';$('expose').textContent=s.stage===0?'–':num(snap.aperture.exposedFraction*100,1)+'%';
 svg();matrix();
 const d=E.diff(base,snap);$('baseline').disabled=!snap.continuity.testEnabled;$('csv').disabled=!snap.continuity.testEnabled;$('obj').disabled=s.stage<5;
 if(!base)$('delta').textContent='At station 07 or later, save the current state as a baseline. Then change a fault or diameter and compare the same specimen.';
 else if(!d)$('delta').textContent='Baseline retained. Return to station 07 or 08 to compare the audited state.';
 else {const changed=d.areaDeltaByDiscMm2.map((x,i)=>Math.abs(x)>1e-10?'D'+(i+1)+' '+(x>=0?'+':'')+num(x,4)+' mm²':'').filter(Boolean);$('delta').textContent='Changed electrical rows: '+(d.mapDelta.length?d.mapDelta.map(n=>'C'+n).join(', '):'none')+'. Axial span Δ '+(d.lengthChangeMm>=0?'+':'')+num(d.lengthChangeMm,3)+' mm. Aperture differences: '+(changed.join('; ')||'none')+'.';}
}
function download(name,data,type){
 const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
$('prev').onclick=()=>update({stage:state.stage-1});$('next').onclick=()=>update({stage:state.stage+1});$('finish').onclick=()=>update({stage:7});$('reset').onclick=()=>{state=E.norm();base=null;render()};
$('volume').onclick=()=>update({view:'volume'});$('flat').onclick=()=>update({view:'flat'});
$('diam').oninput=e=>update({diameter:+e.target.value});$('rot').oninput=e=>update({rotation:+e.target.value});$('cover').oninput=e=>update({cover:+e.target.value});
$('site').onchange=e=>{let site=+e.target.value;update({site,inspect:site})};$('inspection').onchange=e=>update({inspect:+e.target.value});$('fault').onchange=e=>update({fault:e.target.value});
$('clear').onclick=()=>update({fault:'none',cover:0});$('baseline').onclick=()=>{if(!snap.continuity.testEnabled)return;base=E.result(state);render()};
$('export').onclick=()=>{const doc={schema:'bts.stentrode.traveler/1',version:'1.0',published:E.published,stations:E.stations.map(([id,title,evidence,description,tools,acceptance])=>({id,title,evidence,description,tools,acceptance})),references:E.refs,current:snap,baseline:base,difference:E.diff(base,snap)};download('stent-electrode-traveler.json',JSON.stringify(doc,null,2),'application/json')};
$('csv').onclick=()=>{const a=snap.continuity;if(!a.testEnabled)return;let z='fixture_pin,'+Array.from({length:8},(_,i)=>'to_D'+(i+1)).join(',')+',to_frame,classification\r\n'+a.rows.map(r=>['C'+(r.pin+1),...Array.from({length:8},(_,j)=>Number(r.discs.includes(j))),Number(r.frame),r.reason].join(',')).join('\r\n')+'\r\n';download('stent-electrode-dry-matrix.csv',z,'text/csv')};
$('obj').onclick=()=>{const data=E.obj(state);if(data)download('stent-electrode-inert-geometry-mm.obj',data,'text/plain')};
render();
})();
