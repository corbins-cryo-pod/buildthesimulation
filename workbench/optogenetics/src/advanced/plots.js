const NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs={},text=''){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;return e;}
const fmt=x=>Math.abs(x)>=100?x.toFixed(0):Math.abs(x)>=1?x.toFixed(1):x===0?'0':x.toPrecision(2);
function tracePlot(container,title,times,series,pulses=[],domain=null,onScrub=null){
 const W=Math.max(300,container.clientWidth||500),H=154,L=55,R=15,T=32,B=25,duration=times[times.length-1]||1;
 let lo=Infinity,hi=-Infinity;for(const s of series)for(const v of s.values)if(Number.isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v);}
 if(!Number.isFinite(lo)){lo=0;hi=1;}const span=hi-lo||Math.max(1,Math.abs(lo)*.1);
 const limits=domain??[lo-span*.1,hi+span*.1],x=t=>L+t/duration*(W-L-R),y=v=>T+(limits[1]-v)/(limits[1]-limits[0])*(H-T-B);
 const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':title});
 svg.append(svgEl('text',{x:L,y:17},title));
 for(const p of pulses)svg.append(svgEl('rect',{x:x(p.startMs),y:T,width:Math.max(.1,x(p.endMs)-x(p.startMs)),height:H-T-B,fill:'var(--blue)',opacity:.07}));
 for(let i=0;i<4;i++){const t=duration*i/3;svg.append(svgEl('line',{x1:x(t),x2:x(t),y1:T,y2:H-B,stroke:'var(--rule)',opacity:.4}));svg.append(svgEl('text',{x:x(t),y:H-7,'text-anchor':'middle'},fmt(t)));}
 for(const v of [limits[0],(limits[0]+limits[1])/2,limits[1]]){svg.append(svgEl('text',{x:L-7,y:y(v)+3,'text-anchor':'end'},fmt(v)));}
 for(const s of series){let d='',connected=false;for(let i=0;i<times.length;i++){const v=s.values[i];if(!Number.isFinite(v)){connected=false;continue;}d+=(connected?'L':'M')+x(times[i]).toFixed(2)+','+y(v).toFixed(2);connected=true;}svg.append(svgEl('path',{d,fill:'none',stroke:s.color??'var(--ink)','stroke-width':1.6,...(s.dash?{'stroke-dasharray':'5 4'}:{})}));}
 svg.append(svgEl('line',{class:'adv-cursor',x1:x(0),x2:x(0),y1:T,y2:H-B,stroke:'var(--brass)','data-left':L,'data-span':W-L-R,'data-duration':duration}));
 if(!series.length)svg.append(svgEl('text',{x:(W+L)/2,y:87,'text-anchor':'middle',class:'empty-label'},'Run to calculate'));
 if(onScrub)svg.addEventListener('pointerdown',e=>{const r=svg.getBoundingClientRect(),px=(e.clientX-r.left)*W/r.width;onScrub(Math.max(0,Math.min(duration,(px-L)/(W-L-R)*duration)));});
 container.replaceChildren(svg);
}
function rasterPlot(container,result,onScrub){
 const n=result?.cells.length??1,W=Math.max(300,container.clientWidth||700),H=55+30*n,L=70,R=15,T=25,duration=result?.config.experiment.durationMs??220,x=t=>L+t/duration*(W-L-R);
 const svg=svgEl('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'Per-cell soma event raster'});svg.append(svgEl('text',{x:L,y:14},'Somatic events · solid light trial / brass dark control'));
 for(const p of result?.pulses??[])svg.append(svgEl('rect',{x:x(p.startMs),y:T,width:x(p.endMs)-x(p.startMs),height:H-T-20,fill:'var(--blue)',opacity:.09}));
 for(let i=0;i<n;i++){
  const yy=T+i*30+12;svg.append(svgEl('text',{x:5,y:yy+3},result?.cells[i].id??'cell-1'));
  for(const s of result?.cells[i].spikes??[])svg.append(svgEl('line',{x1:x(s.timeMs),x2:x(s.timeMs),y1:yy-8,y2:yy+2,stroke:'var(--ink)','stroke-width':1.5}));
  for(const s of result?.control[i]?.spikes??[])svg.append(svgEl('line',{x1:x(s.timeMs),x2:x(s.timeMs),y1:yy+4,y2:yy+10,stroke:'var(--brass)','stroke-width':1.5}));
 }
 for(let k=0;k<5;k++)svg.append(svgEl('text',{x:x(duration*k/4),y:H-3,'text-anchor':'middle'},fmt(duration*k/4)));
 if(onScrub)svg.addEventListener('pointerdown',e=>{const r=svg.getBoundingClientRect(),px=(e.clientX-r.left)*W/r.width;onScrub(Math.max(0,Math.min(duration,(px-L)/(W-L-R)*duration)));});
 container.replaceChildren(svg);
}
function setCursors(root,time){for(const line of root.querySelectorAll('.adv-cursor')){const x=Number(line.dataset.left)+time/Number(line.dataset.duration)*Number(line.dataset.span);line.setAttribute('x1',x);line.setAttribute('x2',x);}}
function heatSlice(canvas,result){
 const ctx=canvas.getContext('2d'),W=600,H=330;canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);
 if(!result){ctx.fillStyle='#777';ctx.font='15px Georgia';ctx.fillText('Enable thermal diagnostics and run.',20,45);return;}
 const {n,finalRiseC,spacingUm,minUm}=result.grid,z=Math.floor(n/2),size=280,x0=130,y0=25;
 let peak=0;for(const v of finalRiseC)peak=Math.max(peak,v);const scale=peak||1;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const t=finalRiseC[z*n*n+j*n+i]/scale;ctx.fillStyle=`rgb(${Math.round(40+200*t)},${Math.round(48+100*Math.sqrt(t))},${Math.round(56+12*t)})`;ctx.fillRect(x0+i*size/n,y0+j*size/n,Math.ceil(size/n),Math.ceil(size/n));}
 ctx.fillStyle='#8b897f';ctx.font='12px Arial';ctx.fillText('Final ΔT · center-z plane',x0,15);ctx.fillText(`${((n-1)*spacingUm).toFixed(0)} µm wide · ${spacingUm} µm voxels`,x0,H-7);ctx.fillText('0 → '+peak.toFixed(3)+' °C',x0+size+12,45);ctx.fillText('Grid peak, not',x0+size+12,68);ctx.fillText('junction temperature',x0+size+12,85);
}
export {tracePlot,rasterPlot,setCursors,heatSlice};
