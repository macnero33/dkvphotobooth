// Vercel Serverless Function: deletes photo strips older than 1 hour.
// Uses native fetch() to call Supabase REST API directly (no SDK needed).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE;
const STORAGE_BUCKET =
  process.env.STORAGE_BUCKET || process.env.VITE_STORAGE_BUCKET || 'photo-strips';
const EXPIRY_MS = 1000 * 60 * 60; // 1 hour

async function listFiles() {
  const url = `${SUPABASE_URL}/storage/v1/object/list/${STORAGE_BUCKET}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      prefix: '',
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    }),
  });
  if (!res.ok) {
    throw new Error(`List failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function deleteFiles(fileNames) {
  const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ prefixes: fileNames }),
  });
  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export default async function handler(request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SERVICE_ROLE_KEY,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const files = await listFiles();
    const now = Date.now();
    const expired = (files || [])
      .map((f) => f.name)
      .filter((name) => {
        const match = name.match(/^strip_(\d+)\.jpg$/);
        if (!match) return false;
        return now - Number(match[1]) > EXPIRY_MS;
      });

    let deleted = 0;
    if (expired.length > 0) {
      await deleteFiles(expired);
      deleted = expired.length;
    }

    return new Response(
      JSON.stringify({
        deleted,
        expiredFiles: expired,
        totalScanned: (files || []).length,
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
