/* bts-mas64-witness:start */
// Read-only view of the native traveler. No parameters or engine state are modified.
window.mas64ProcessWitness=()=>{
  const d=Le.draft,m=d?.m||Le.m,stage=d?.i??Le.rev;
  const value=x=>Number.isFinite(x)?x:null;
  return {
    stage,field:d?.f?.id||Le.field?.id||null,candidate:!!d,
    summary:d?.summary||'',blocked:!!d?.issues?.length,issues:d?.issues?.slice(0,4)||[],
    window:{dxUm:value(m.photo?.dx),dzUm:value(m.photo?.dz),printedUm:value(m.photo?.cd),
      exposedAreaUm2:value(m.area),etchDepthUm:value(m.windowDepth),topFilmUm:value(m.topUm)},
    front:{depthUm:value(m.front?.depth),sideLossUm:value(m.front?.sideLoss)},
    release:{qualified:((d?.i===11||Le.rev>=12)&&typeof m.mechanical==='boolean')?m.mechanical:null,
      scale:value(m.release),remainingHandleUm:value(m.handleLeft),remainingBoxUm:value(m.boxLeft)},
    bonds:Array.isArray(m.bonds)?m.bonds.map(b=>Boolean(b.ok)):null,
  };
};
/* bts-mas64-witness:end */
