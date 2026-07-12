import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'photo-strips';
const RETENTION_MINUTES = 20;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase cleanup credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function isExpiredFile(fileName: string, maxAgeMs: number) {
  const match = /^strip_(\d+)\.(?:jpg|jpeg|png)$/i.exec(fileName);
  if (!match) return false;

  const timestamp = Number(match[1]);
  if (Number.isNaN(timestamp)) return false;

  return Date.now() - timestamp > maxAgeMs;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const retentionMs = RETENTION_MINUTES * 60 * 1000;
  const expiredPaths: string[] = [];

  try {
    let offset = 0;
    const limit = 1000;

    while (true) {
      const { data: files, error: listError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('', { limit, offset });

      if (listError) {
        throw listError;
      }

      if (!files || files.length === 0) {
        break;
      }

      for (const file of files) {
        if (isExpiredFile(file.name, retentionMs)) {
          expiredPaths.push(file.name);
        }
      }

      if (files.length < limit) {
        break;
      }

      offset += limit;
    }

    let deletedCount = 0;
    if (expiredPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(expiredPaths);

      if (removeError) {
        throw removeError;
      }

      deletedCount = expiredPaths.length;
    }

    res.status(200).json({
      deletedCount,
      expiredFiles: expiredPaths,
      retentionMinutes: RETENTION_MINUTES,
    });
  } catch (error: any) {
    console.error('Supabase cleanup failed:', error);
    res.status(500).json({
      error: error?.message || 'Cleanup failed',
    });
  }
}
