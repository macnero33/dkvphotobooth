import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'photo-strips';
const EXPIRY_MS = 1000 * 60 * 60; // 1 hour

function getServiceClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase service role key and URL are required for cleanup. Set SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL.'
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function parseFileTimestamp(fileName: string): number | null {
  const match = fileName.match(/^strip_(\d+)\.jpg$/);
  if (!match) return null;
  return Number(match[1]);
}

export default async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabase = getServiceClient();

  // List objects and delete expired ones based on filename timestamp.
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = Date.now();
  const expiredFiles = (data ?? [])
    .map((file: any) => file.name)
    .filter((name: string) => {
      const fileTimestamp = parseFileTimestamp(name);
      return fileTimestamp !== null && now - fileTimestamp > EXPIRY_MS;
    });

  let deletedCount = 0;
  if (expiredFiles.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(expiredFiles);

    if (!deleteError) {
      deletedCount = expiredFiles.length;
    }
  }

  return new Response(
    JSON.stringify({ deleted: deletedCount, expiredFiles }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
