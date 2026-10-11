import type { APIRoute } from 'astro';
import { buildDiscoveryIndex } from '../lib/discovery-index.js';

export const GET: APIRoute = async () => new Response(JSON.stringify(await buildDiscoveryIndex()), {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  },
});
