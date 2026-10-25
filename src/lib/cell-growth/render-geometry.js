/** Geometry reconstructed exclusively from solver state; no developmental animation. */
export function coneSurface(tip) {
  const radii=tip.shape?.radii||Array(12).fill(tip.radius),n=radii.length,h=tip.shape?.height??.4;
  const vertices=[[0,h,0]],triangles=[];
  for(const [factor,y] of [[.62,h*.78],[1,0],[.62,-h*.78]])for(let i=0;i<n;i++){
    const angle=i/n*Math.PI*2;vertices.push([Math.sin(angle)*radii[i]*factor,y,Math.cos(angle)*radii[i]*factor]);
  }
  const bottom=vertices.length;vertices.push([0,-h,0]);
  for(let i=0;i<n;i++){
    const j=(i+1)%n;triangles.push([0,1+i,1+j],[bottom,1+2*n+j,1+2*n+i]);
    for(let ring=0;ring<2;ring++){const a=1+ring*n+i,b=1+ring*n+j,c=a+n,d=b+n;triangles.push([a,c,b],[b,c,d]);}
  }
  return {vertices,triangles};
}

export const VIEW_MODES=Object.freeze({
  structural:{background:0x171b1a,membrane:0xc6b58e,nucleus:0x8ca9b5,actin:0x94c8ac,core:0xc8a775,opacity:.48},
  brightfield:{background:0xdddcd1,membrane:0xa8a89b,nucleus:0x888e92,actin:0x697b70,core:0x8b8378,opacity:.32},
  fluorescence:{background:0x080d16,membrane:0x69c8af,nucleus:0x638bea,actin:0xe9a16f,core:0xe0d18f,opacity:.18},
  mechanics:{background:0x171d24,membrane:0x98bbb6,nucleus:0xa0acbd,actin:0xe7b06b,core:0xb8cfcc,opacity:.7},
});
