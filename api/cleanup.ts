import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function: triggered by cron once per day
// Deletes photo strips older than 1 hour from Supabase Storage.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.VITE_STORAGE_BUCKET || 'photo-strips';
const EXPIRY_MS = 1000 * 60 * 60; // 1 hour

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST' && request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            'Supabase credentials missing. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SERVICE_ROLE_KEY,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // List all objects in the bucket.
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Filter files older than EXPIRY_MS based on the timestamp in the filename.
    const now = Date.now();
    const expiredFiles = (data ?? [])
      .map((file: any) => file.name)
      .filter((name: string) => {
        const match = name.match(/^strip_(\d+)\.jpg$/);
        if (!match) return false;
        const fileTimestamp = Number(match[1]);
        return now - fileTimestamp > EXPIRY_MS;
      });

    let deletedCount = 0;
    if (expiredFiles.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(expiredFiles);

      if (!deleteError) {
        deletedCount = expiredFiles.length;
      } else {
        return new Response(
          JSON.stringify({
            error: `Delete failed: ${deleteError.message}`,
            attempted: expiredFiles,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        deleted: deletedCount,
        expiredFiles,
        totalScanned: data?.length ?? 0,
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
