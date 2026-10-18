// Dimensionless half-space Green function; fitted equipotential panel currents.
export function sources(model) {
  const result=[];
  for (const [x,y,q] of model.panels) for (const sx of [-1,1]) for (const sy of [-1,1])
    result.push([x+sx*model.hx/Math.sqrt(12),y+sy*model.hy/Math.sqrt(12),q/4]);
  return result;
}
export function sample(source,x,y,z,radiusUm,currentUa,conductivity=.3) {
  if (![x,y,z,radiusUm,currentUa,conductivity].every(Number.isFinite) || radiusUm<=0 || conductivity<=0 || z/radiusUm<.2-1e-12) return null;
  x/=radiusUm;y/=radiusUm;z/=radiusUm;
  let v=0,ex=0,ey=0,ez=0;
  for(const [sx,sy,q] of source) {
    const dx=x-sx,dy=y-sy,r2=dx*dx+dy*dy+z*z,r=Math.sqrt(r2),f=q/(r2*r);
    v+=q/r;ex+=dx*f;ey+=dy*f;ez+=z*f;
  }
  const length=radiusUm*1e-6,k=currentUa*1e-6/(2*Math.PI*conductivity);
  return {potential:v*k/length*1000,field:Math.hypot(ex,ey,ez)*Math.abs(k)/(length*length)};
}
