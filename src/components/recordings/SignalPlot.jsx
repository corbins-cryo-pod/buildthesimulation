import { useEffect, useRef } from 'preact/hooks';
import { envelope, statistics, timeLabel, formatNumber } from '../../lib/recordings/signal.js';

export default function SignalPlot({ segment, channelIndex, bounds, mode, cursor, onCursor }) {
  const ref = useRef(null);
  const [a,b] = bounds, rate = segment.sampleRateHz, duration = (b-a)/rate;
  const selected = segment.channels[channelIndex];
  const height = mode === 'stacked' ? 390 : 290;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const draw = () => {
      const width = el.getBoundingClientRect().width;
      if (width < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = width*dpr; el.height=height*dpr;
      const ctx=el.getContext('2d'); if(!ctx)return; ctx.scale(dpr,dpr);
      const left=70, right=width-16, top=35, bottom=height-38, w=right-left, h=bottom-top;
      ctx.fillStyle='#1c2022';ctx.fillRect(0,0,width,height);
      ctx.font='11px Arial, sans-serif';ctx.fillStyle='#ded8c8';
      ctx.fillText(mode==='stacked' ? 'CHANNEL OVERVIEW · each row scaled independently' : `${selected.label} · ${selected.unit||segment.unit} · source amplitude`,12,19);
      ctx.save();ctx.beginPath();ctx.rect(left,top,w,h);ctx.clip();
      for(const ev of segment.events||[]) {
        const x=left+(ev.timeSeconds*rate-a)/(b-a)*w;
        const end=left+((ev.timeSeconds+(ev.durationSeconds||0))*rate-a)/(b-a)*w;
        ctx.fillStyle='rgba(191,169,128,.10)';ctx.fillRect(x,top,Math.max(1,end-x),h);
        ctx.strokeStyle='#85785e';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.setLineDash([]);
      }
      ctx.restore();
      for(let i=0;i<=4;i++){
        const x=left+i*w/4;ctx.strokeStyle='#353a3b';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();
        ctx.fillStyle='#bdbdaf';ctx.textAlign=i===4?'right':i===0?'left':'center';ctx.fillText(timeLabel((a+(b-a)*i/4)/rate,duration),x,bottom+22);
      }
      const channels=mode==='stacked'?segment.channels.slice(Math.max(0,channelIndex-3),Math.max(0,channelIndex-3)+8):[selected];
      channels.forEach((ch,row)=>{
        const s=statistics(ch.samples,a,b); if(!s.count)return;
        const rowH=h/channels.length;
        let low=segment.signalKind === 'spike-counts' ? 0 : s.min, high=s.max;
        const pad=Math.max((high-low)*.08,Math.max(Math.abs(high),1)*1e-6);if(segment.signalKind !== 'spike-counts')low-=pad;high+=pad;
        const y = v => top+row*rowH+rowH*(1-(v-low)/(high-low));
        ctx.fillStyle=ch===selected?'#e5c78d':'#bdbdaf';ctx.textAlign='right';
        if(mode==='stacked'){ctx.fillText(ch.label.length>9?String(ch.id):ch.label,left-8,top+row*rowH+rowH/2+4);}
        else {for(let i=0;i<=4;i++){const value=high-(high-low)*i/4, yy=top+h*i/4;ctx.fillText(formatNumber(value),left-8,yy+4);ctx.strokeStyle='#353a3b';ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();}}
        ctx.save();ctx.beginPath();ctx.rect(left,top+row*rowH,w,rowH);ctx.clip();
        ctx.strokeStyle=ch===selected?'#e5c78d':'#84b6ad';ctx.lineWidth=1.2;ctx.beginPath();
        if(segment.signalKind === 'spike-counts'){
          for(const e of envelope(ch.samples,a,b,w)){if(e.max===null)continue;const x=left+(e.start-a)/(b-a)*w;ctx.moveTo(x,y(0));ctx.lineTo(x,y(e.max));}
        }else if(b-a<=w*2){
          let gap=true;for(let i=a;i<b;i++){const v=ch.samples[i];if(v==null){gap=true;continue;}const x=left+(i-a)/(b-a)*w;if(gap)ctx.moveTo(x,y(v));else ctx.lineTo(x,y(v));gap=false;}
        }else{
          for(const e of envelope(ch.samples,a,b,w)){if(e.min===null)continue;const x=left+(e.start-a)/(b-a)*w;ctx.moveTo(x,y(e.min));ctx.lineTo(x,y(e.max));}
        }
        ctx.stroke();ctx.restore();
      });
      if(cursor>=a&&cursor<b){const x=left+(cursor-a)/(b-a)*w;ctx.strokeStyle='#f5f1e6';ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.setLineDash([]);}
    };
    draw();const ro=new ResizeObserver(draw);ro.observe(el);return()=>ro.disconnect();
  },[segment,channelIndex,a,b,mode,cursor,height]);
  return <canvas ref={ref} style={{height:`${height}px`}} class="rd-plot" role="img" aria-label={`${mode==='stacked'?'Channel overview':'Signal for '+selected.label}, ${timeLabel(a/rate,duration)} to ${timeLabel(b/rate,duration)}. Numeric values are available below; use the sample cursor slider.`} onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();const f=(e.clientX-r.left-70)/(r.width-86);if(f>=0&&f<=1)onCursor(Math.min(b-1,a+Math.round(f*(b-a))));}} />;
}
