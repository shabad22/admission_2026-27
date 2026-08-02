/**
 * Netlify Function: Attendance API
 * Provides /api/attendance endpoint with persistent storage via Netlify Blobs.
 * Deploy to Netlify: works on static hosts without a separate server.
 */
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'attendance';
const KEY = 'records';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function deepMerge(base, incoming) {
  Object.keys(incoming || {}).forEach(k => {
    const v = incoming[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!base[k] || typeof base[k] !== 'object' || Array.isArray(base[k])) base[k] = {};
      deepMerge(base[k], v);
    } else {
      base[k] = v;
    }
  });
  return base;
}

export default async (req, context) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method === 'GET') {
    const data = await store.get(KEY, { type: 'json' }) || {};
    return new Response(JSON.stringify({ records: data }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  if (req.method === 'POST') {
    try {
      const { records } = await req.json();
      const current = await store.get(KEY, { type: 'json' }) || {};
      const merged = deepMerge(current, records || {});
      await store.set(KEY, JSON.stringify(merged));
      return new Response(JSON.stringify({ ok: true, records: merged }), {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'invalid json' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
};

export const config = { path: '/api/attendance' };