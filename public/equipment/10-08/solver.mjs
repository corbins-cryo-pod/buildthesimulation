const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(x=>Number.isFinite(x)&&Math.abs(x)<=200);
export function lineFit(points){
 if(!Array.isArray(points)||points.length<2||points.length>100||!points.every(finitePoint))throw Error('A reference line requires 2–100 finite XY points in mm.');
 const n=points.length,avg=[0,1].map(i=>points.reduce((s,p)=>s+p[i],0)/n);
 let a=0,b=0,c=0;for(const [X,Y] of points){const x=X-avg[0],y=Y-avg[1];a+=x*x;b+=x*y;c+=y*y}
 if(a+c<1e-10||Math.hypot(a-c,2*b)<=1e-8*(a+c))throw Error('The trace does not constrain a line orientation.');
 const θ=.5*Math.atan2(2*b,a-c),direction=[Math.cos(θ),Math.sin(θ)];
 const resid=points.map(([x,y])=>-(x-avg[0])*direction[1]+(y-avg[1])*direction[0]);
 return {centroidMm:avg,direction,rmsOrthogonalMm:Math.sqrt(resid.reduce((z,x)=>z+x*x,0)/n)};
}
export function inspect(profile,fixtureRevision,revision=1,parentRevision=null){
 if(!profile||typeof profile.id!=='string')throw Error('Choose an authored fictitious reference.');
 const base=lineFit(profile.base),facet=lineFit(profile.facet),u=base.direction,v=facet.direction;
 const dot=Math.abs(u[0]*v[0]+u[1]*v[1]),cross=Math.abs(u[0]*v[1]-u[1]*v[0]),interiorDeg=Math.atan2(cross,dot)*180/Math.PI;
 return {schema:'bts.facet-annotation.report.v1',deviceId:'10-08',origin:'pre-authored-synthetic-macro-reference',fixtureId:profile.id,fixtureRevision,revision,parentRevision,units:{points:'mm',interiorDeg:'degrees'},frame:'2D XY in artificial block plane; angle between undirected fitted lines in [0, 90]',interiorDeg,sourceTracks:{base:profile.base,facet:profile.facet},fittedLines:{base,facet},scope:'Passive inspection only, not a fabricated tip, beveling model, or resistance estimate.'};
}
export const initial=()=>({selected:0,overlay:true,revision:0,result:null});
export function action(s,{type,payload},doc){
 if(!doc||doc.schema!=='bts.facet-annotation.fixture.v1'||!Array.isArray(doc.fixtures)||doc.fixtures.length!==2)throw Error('Missing authored reference fixture.');
 switch(type){
  case 'choose':{if(!Number.isInteger(payload)||!doc.fixtures[payload])throw Error('Choose one of the two authored references.');return {...s,selected:payload,result:null};}
  case 'cycle':return {...s,selected:1-s.selected,result:null};
  case 'overlay':return {...s,overlay:!s.overlay};
  case 'inspect':return {...s,revision:s.revision+1,result:inspect(doc.fixtures[s.selected],doc.fixtureRevision,s.revision+1,s.revision||null)};
  case 'reset':return initial();
  default:throw Error('Only passive inspection and annotation are available.');
 }
}
