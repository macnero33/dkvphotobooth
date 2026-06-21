// Cleanup expired photo strips using native fetch (no Supabase SDK).
// Safe to call from client because it doesn't use any sensitive credentials.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;
const STORAGE_BUCKET =
  process.env.STORAGE_BUCKET || process.env.VITE_STORAGE_BUCKET || 'photo-strips';
const EXPIRY_MS = 1000 * 60 * 60; // 1 hour

async function supabaseListFiles() {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/${STORAGE_BUCKET}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: '',
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      }),
    }
  );
  if (!res.ok) throw new Error('List failed: ' + res.status);
  return res.json();
}

async function supabaseDeleteFiles(fileNames) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: fileNames }),
    }
  );
  if (!res.ok) throw new Error('Delete failed: ' + res.status);
}

export default async function handler(request) {
  // Allow CORS so this can be called from the browser client too.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing env vars' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const files = await supabaseListFiles();
    const now = Date.now();
    const expired = (files || [])
      .map((f) => f.name)
      .filter((name) => {
        const m = name.match(/^strip_(\d+)\.jpg$/);
        if (!m) return false;
        return now - Number(m[1]) > EXPIRY_MS;
      });

    let deleted = 0;
    if (expired.length > 0) {
      await supabaseDeleteFiles(expired);
      deleted = expired.length;
    }

    return new Response(
      JSON.stringify({
        deleted,
        expired,
        totalScanned: (files || []).length,
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
}
