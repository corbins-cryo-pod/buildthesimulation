import {createBipolarMorphology} from '../../src/lib/axon-interface/bipolar.mjs';
function randomStream(seed,name){let h=seed>>>0;for(let i=0;i<name.length;i++){h^=name.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return ()=>{h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/** Same explicit named anatomy stream/pitch/clearance as the Stage1 default. */
export function stage1FieldFixture(count=4,{seed=2048,fascicleRadiusUm=250}={}){
 const morphology=createBipolarMorphology({somaSegments:5}),random=randomStream(seed,'anatomy'),pitch=35,wall=2.5,radius=fascicleRadiusUm-10-wall-10,dy=pitch*Math.sqrt(3)/2,n=Math.ceil(radius/dy),candidates=[];
 for(let row=-n;row<=n;row++)for(let col=-n*2;col<=n*2;col++){
  const x=(col+(Math.abs(row)%2)*.5)*pitch+(random()-.5)*.04*pitch,y=row*dy+(random()-.5)*.04*pitch;
  if(Math.hypot(x,y)<radius)candidates.push({x,y,order:random()});
 }
 if(candidates.length<count)throw new Error('Verification cohort does not fit declared fascicle; no cell removed.');candidates.sort((a,b)=>a.order-b.order);
 const cells=candidates.slice(0,count).map((p,index)=>({id:`E${String(index+1).padStart(4,'0')}`,index,xUm:p.x,yUm:p.y,zUm:0,somaDiameterUm:20}));
 const wells=cells.map((c,index)=>({id:`W${index+1}`,index,cellId:c.id,cellIndex:index,center:[c.xUm,c.yUm,0],innerRadiusUm:13,halfLengthUm:70,wallThicknessUm:wall,apertureRadiusUm:3.5,contactHalfWidthUm:3,contactHalfHeightUm:3,contactSeparationUm:30}));
 const channels=wells.slice(0,Math.min(2,count)).map((w,index)=>({id:`C${index+1}`,index,wellId:w.id,sourceContactId:`${w.id}:source`,returnContactId:`${w.id}:return`}));
 return {morphology,cells,wells,channels,constructPresent:true,seed,settings:{fascicleRadiusUm,perineuriumThicknessUm:.06*fascicleRadiusUm,epineuriumRadiusUm:Math.max(400,fascicleRadiusUm*1.25)}};
}
