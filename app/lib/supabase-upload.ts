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

  // Cleanup expired files in the background.
  void fetch('/api/cleanup', { method: 'POST' }).catch(() => {
    // Ignore cleanup failures for the user flow.
  });

  return {
    url: publicUrlData.data.publicUrl,
    publicId: fileName,
  };
}
