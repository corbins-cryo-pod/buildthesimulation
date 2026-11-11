import {publishedEvidence} from '../../../lib/axon-interface-publication.mjs';
export const prerender=true;
export function GET(){
 return new Response(JSON.stringify(publishedEvidence(),null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
