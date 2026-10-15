export const implantedKinds = new Set(['planar-probe', 'cylindrical-lead', 'nerve-cuff', 'flat-cuff', 'exposed-wire']);

export function getImplantContacts(model) {
  const site = (positionMm, normal, contactAreaMm2, extra = {}) => ({ id: `site-${sites.length}`, positionMm, normal, contactAreaMm2, channel: null, ...extra });
  const sites = [];
  if (model.kind === 'planar-probe') {
    for (const p of model.contactLayout) sites.push(site([p.x, -model.thickness / 2, p.z], [0, -1, 0], p.areaUnknown ? null : p.shape === 'circle' ? Math.PI * (p.size / 2) ** 2 : p.size ** 2, { positionMeaning: 'planar contact center; named probe local coordinates', shankIndex: p.shankIndex ?? null }));
  } else if (model.kind === 'cylindrical-lead') {
    for (const [level, c] of model.contacts.entries()) {
      for (let segment = 0; segment < c.segments; segment++) {
        const span = c.segments === 1 ? Math.PI * 2 : Math.PI * 2 / c.segments - (c.gapAngle ?? 0);
        const angle = (c.rotation ?? 0) + segment * Math.PI * 2 / c.segments;
        const r = model.diameter / 2;
        sites.push(site(c.segments === 1 ? [0, 0, c.z] : [r * Math.cos(angle), r * Math.sin(angle), c.z], c.segments === 1 ? null : [Math.cos(angle), Math.sin(angle), 0], c.areaUnknown ? null : r * span * c.length, { level, segment, angularSpanRad: span, axialLengthMm: c.length, positionMeaning: c.segments === 1 ? 'ring center on lead axis; surface has radial normals, no single normal' : 'arc midpoint on outer lead face; rotation is nominal' }));
      }
    }
  } else if (model.kind === 'nerve-cuff') {
    for (const c of model.contacts) {
      const r = model.innerDiameter / 2;
      sites.push(site([r * Math.cos(c.angle), r * Math.sin(c.angle), c.z], [-Math.cos(c.angle), -Math.sin(c.angle), 0], c.areaUnknown ? null : r * c.angularSpan * c.length, { angularSpanRad: c.angularSpan, axialLengthMm: c.length, positionMeaning: 'inward contact arc midpoint in nominal open cylindrical cuff pose' }));
    }
  } else if (model.kind === 'flat-cuff') {
    for (const c of model.contacts) sites.push(site([c.x, c.y, c.z], c.normal, c.areaUnknown ? null : Math.PI * (c.diameter / 2) ** 2, { positionMeaning: 'disk center on inner flat cuff wall; unloaded rectangular lumen' }));
  } else if (model.kind === 'exposed-wire') {
    sites.push(site([0, 0, (model.exposedStart ?? model.length - model.exposedLength) + model.exposedLength / 2], null, model.areaUnknown ? null : Math.PI * model.coreDiameter * model.exposedLength, { positionMeaning: 'exposed cylindrical wire midpoint; radial normals, no single normal', areaMeaning: 'lateral cylinder area only; end face and microscopic roughness excluded' }));
  } else return null;
  return sites;
}

