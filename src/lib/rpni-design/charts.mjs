const finite=x=>Number.isFinite(x);
const fmt=(x,d=2)=>finite(x)?Number(x).toLocaleString(undefined,{maximumFractionDigits:d}):'—';
const COLORS={brass:'#a47b34',teal:'#2a8d83',red:'#aa5c4a',muted:'#8b8170'};
function surface(canvas){
 if(!canvas)return null;const box=canvas.getBoundingClientRect();if(box.width<10)return null;
 const dpr=Math.min(2,window.devicePixelRatio||1),w=box.width,h=box.height;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const style=getComputedStyle(canvas.closest('.rp-lab')),dark=document.documentElement.dataset.theme==='dark';
 return {ctx,w,h,text:style.getPropertyValue('--text').trim()||'#24231f',muted:style.getPropertyValue('--muted').trim()||'#786e60',line:dark?'#d8c5a12b':'#5e51352b',colors:dark?{brass:'#d8b77b',teal:'#69c6bb',red:'#d28572',muted:'#a99f8f'}:COLORS};
}
function axes(s,{xmin=0,xmax=1,ymin=0,ymax=1,xlabel='',ylabel='',percent=false}={}){
 const {ctx,w,h,text,muted,line}=s;const l=55,r=16,t=25,b=38,pw=w-l-r,ph=h-t-b;
 if(!(xmax>xmin))xmax=xmin+1;if(!(ymax>ymin))ymax=ymin+1;
 const X=x=>l+(x-xmin)/(xmax-xmin)*pw,Y=y=>t+ph-(y-ymin)/(ymax-ymin)*ph;
 ctx.font='10px Arial, sans-serif';ctx.lineWidth=1;ctx.textBaseline='middle';ctx.fillStyle=muted;
 for(let i=0;i<=4;i++){const y=ymin+(ymax-ymin)*i/4,py=Y(y);ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(l,py);ctx.lineTo(w-r,py);ctx.stroke();ctx.textAlign='right';ctx.fillText(percent?`${fmt(y*100,0)}%`:(y!==0&&Math.abs(ymax-ymin)<.01?y.toExponential(1):fmt(y,Math.abs(ymax-ymin)<1?3:1)),l-8,py);}
 for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4;ctx.textAlign='center';ctx.fillText(fmt(x,xmax-xmin<5?2:0),X(x),h-b+14);}
 ctx.fillStyle=text;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(ylabel,l,4);ctx.textAlign='right';ctx.fillText(xlabel,w-r,h-11);
 return {...s,X,Y,l,r,t,b,pw,ph,xmin,xmax,ymin,ymax};
}
function curve(a,points,color,dashed=false,width=1.6){const {ctx,X,Y,l,t,pw,ph}=a;ctx.save();ctx.beginPath();ctx.rect(l,t,pw,ph);ctx.clip();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[5,4]:[]);ctx.beginPath();let start=true;for(const p of points){if(!finite(p[0])||!finite(p[1])){start=true;continue;}if(start){ctx.moveTo(X(p[0]),Y(p[1]));start=false;}else ctx.lineTo(X(p[0]),Y(p[1]));}ctx.stroke();ctx.restore();}
function cursor(a,x,color){if(!finite(x)||x<a.xmin||x>a.xmax)return;const {ctx,X,t,ph}=a;ctx.save();ctx.strokeStyle=color;ctx.setLineDash([3,4]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(x),t);ctx.lineTo(X(x),t+ph);ctx.stroke();ctx.restore();}
function empty(canvas,message){const s=surface(canvas);if(!s)return;const {ctx,w,h,muted}=s;ctx.fillStyle=muted;ctx.font='12px Georgia,serif';ctx.textAlign='center';ctx.fillText(message,w/2,h/2);}
export function drawRecording(canvas,result,channelIndex=0,timeMs=0){
 if(!result)return empty(canvas,'Build a design to calculate the recording.');const s=surface(canvas);if(!s)return;
 const r=result.recording,ch=r.channels[channelIndex]||r.channels[0],times=r.timesMs;
 if(!ch||!times?.length)return empty(canvas,'No recording samples.');
 let peak=0;for(const key of['signalUv','targetUv','otherUv'])for(const v of ch[key]||[])peak=Math.max(peak,Math.abs(v));
 peak=Math.max(peak*1.08,1e-3);const a=axes(s,{xmax:times.at(-1)||result.config.traceDurationMs,ymin:-peak,ymax:peak,xlabel:'Time / ms',ylabel:`${ch.id} · potential / µV`});
 curve(a,times.map((t,i)=>[t,ch.signalUv[i]]),s.colors.brass,false,1.1);
 curve(a,times.map((t,i)=>[t,ch.otherUv[i]]),s.colors.red,false,1.2);
 curve(a,times.map((t,i)=>[t,ch.targetUv[i]]),s.colors.teal,false,1.5);cursor(a,timeMs,s.muted);
}
export function drawGrowth(canvas,result,day,reference){
 if(!result)return;const s=surface(canvas);if(!s)return;
 const maxDay=Math.max(result.config.durationDays,reference?.config.durationDays||0),a=axes(s,{xmax:maxDay,ymax:1,xlabel:'Days after graft construction',ylabel:'Arrival fraction / mean source gain',percent:true});
 if(reference){const n=reference.motorUnits.length;curve(a,reference.samples.map(p=>[p.day,p.arrivedUnits/n]),s.colors.brass,true);curve(a,reference.samples.map(p=>[p.day,p.matureSourceFraction]),s.colors.teal,true);}
 const n=result.motorUnits.length;curve(a,result.samples.map(p=>[p.day,p.arrivedUnits/n]),s.colors.brass);curve(a,result.samples.map(p=>[p.day,p.matureSourceFraction]),s.colors.teal);cursor(a,day,s.muted);
}
export function drawOxygen(canvas,result,reference){
 if(!result)return;const s=surface(canvas);if(!s)return;const h=result.config.graftThicknessMm;
 const profile=result.oxygen.profile||result.oxygen.samples||[];const a=axes(s,{xmin:-h/2,xmax:h/2,ymax:1,xlabel:'Depth from graft midplane / mm',ylabel:'Concentration / face concentration',percent:true});
 if(reference){const p=reference.oxygen.profile||reference.oxygen.samples||[];curve(a,p.map(v=>[v.zMm,v.ratio??v.concentrationRatio]),s.colors.muted,true);}
 curve(a,profile.map(v=>[v.zMm,v.ratio??v.concentrationRatio]),s.colors.teal,false,2);cursor(a,0,s.muted);
}
export function drawSweep(canvas,sweep,channelIndex=0,metric='otherRmsUv'){
 if(!sweep?.points?.length)return empty(canvas,'Run a controlled study to compare five designs.');const s=surface(canvas);if(!s)return;
 const points=sweep.points,ys=points.map(p=>metric==='oxygenCenterRatio'?p.summary?.oxygenCenterRatio:p.summary?.channels?.[channelIndex]?.[metric]);
 const xs=points.map(p=>p.value),lo=Math.min(...xs),hi=Math.max(...xs),valid=ys.filter(finite);if(!valid.length)return empty(canvas,'This ratio is undefined for the selected source configuration.');
 const fraction=metric==='targetFraction'||metric==='oxygenCenterRatio',db=metric==='targetOtherDb',ymin=db?Math.min(...valid)-1:0,ymax=fraction?1:db?Math.max(...valid)+1:Math.max(...valid,1e-6)*1.1;
 const labels={cleanRmsUv:'Expected clean RMS / µV',otherRmsUv:'Expected other-pool RMS / µV',targetOtherDb:'Target / other power / dB',targetFraction:'Expected target power fraction',oxygenCenterRatio:'Hypothetical slab center / face'};
 const a=axes(s,{xmin:lo,xmax:hi,ymin,ymax,xlabel:sweep.unit||'Parameter value',ylabel:labels[metric]||metric,percent:fraction});
 curve(a,points.map((p,i)=>[p.value,ys[i]]),s.colors.brass,false,2);
 for(let i=0;i<points.length;i++){if(!finite(ys[i]))continue;s.ctx.fillStyle=s.colors.brass;s.ctx.beginPath();s.ctx.arc(a.X(xs[i]),a.Y(ys[i]),3.5,0,Math.PI*2);s.ctx.fill();}
}
export function drawAllCharts(canvases,state){
 drawRecording(canvases.trace,state.result,state.channelIndex,state.timeMs);
 drawGrowth(canvases.growth,state.result,state.day,state.reference);
 drawOxygen(canvases.oxygen,state.result,state.reference);
 drawSweep(canvases.sweep,state.sweep,state.channelIndex,state.sweepMetric);
}
