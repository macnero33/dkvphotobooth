import { supabase, STORAGE_BUCKET } from './supabase-client';

export interface SupabaseUploadResult {
  url: string;
  publicId: string;
}

const UPLOAD_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`Upload timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export async function uploadToSupabase(
  blob: Blob
): Promise<SupabaseUploadResult> {
  const timestamp = Date.now();
  const fileName = `strip_${timestamp}.jpg`;
  const filePath = fileName;

  const uploadPromise = (async () => {
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

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 24 * 60 * 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(
        signedUrlError?.message ||
          'Failed to create a signed URL for uploaded photo strip.'
      );
    }

    return {
      url: signedUrlData.signedUrl,
      publicId: fileName,
    };
  })();

  return withTimeout(uploadPromise, UPLOAD_TIMEOUT_MS);
}
