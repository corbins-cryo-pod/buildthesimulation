import type { APIRoute } from 'astro';
import report from '../../../../data/cell-growth-connectivity-validation.json';
export const GET: APIRoute = () => new Response(JSON.stringify(report, null, 2) + '\n', {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
