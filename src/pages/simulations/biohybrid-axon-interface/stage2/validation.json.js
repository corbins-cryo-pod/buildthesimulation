import {publishedStage2} from '../../../../lib/axon-interface-stage2-publication.mjs';
export const prerender=true;
export function GET(){return new Response(JSON.stringify(publishedStage2()),{headers:{'Content-Type':'application/json'}});}
