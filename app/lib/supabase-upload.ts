import { supabase, STORAGE_BUCKET } from './supabase-client';

export interface SupabaseUploadResult {
  url: string;
  publicId: string;
}

export async function uploadToSupabase(
  blob: Blob
): Promise<SupabaseUploadResult> {
  const timestamp = Date.now();
  const fileName = `strip_${timestamp}.jpg`;
  const filePath = fileName;

  const { data, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError || !data) {
    throw new Error(
      uploadError?.message || 'Failed to upload photo strip to Supabase Storage.'
    );
  }

  const publicUrlData = await supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!publicUrlData?.data?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded photo strip.');
  }

  // Note: cleanup of expired photo strips (>1 hour old) is now handled
  // automatically by a Vercel cron job that hits /api/cleanup every 15 min.

  return {
    url: publicUrlData.data.publicUrl,
    publicId: fileName,
  };
}
