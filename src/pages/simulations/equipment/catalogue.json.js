import {equipment, zones, sources} from '../../../data/equipment';
export function GET() {
  return new Response(JSON.stringify({schemaVersion: 1, referenceEdition: '2026-11-25', zones, sources, equipment}, null, 2), {
    headers: {'Content-Type':'application/json; charset=utf-8'}
  });
}
