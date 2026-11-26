import publicData from './equipment-revisions.generated.json';
export {revisionKinds} from './equipment-revisions-scope.mjs';
export const revisionBase='/simulations/equipment/revised/';
export const revisionRows=publicData.records;
export const revisionById=Object.fromEntries(revisionRows.map(row=>[row.id,row]));
export const readyRevisions=revisionRows.filter(row=>row.status==='ready').length;
export const revisedDevicePath=id=>'/simulations/equipment/'+encodeURIComponent(id)+'/revised/';
export const previewHref=row=>row?.status==='ready'&&row.entry?'/equipment-revised/'+encodeURIComponent(row.id)+'/'+row.entry.split('/').map(encodeURIComponent).join('/'):null;
