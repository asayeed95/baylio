/**
 * Storage Service — Supabase Storage
 */
import { supabaseAdmin } from "./lib/supabase";

const BUCKET = "baylio_files";

/**
 * Upload a file to Supabase Storage.
 * Returns the storage key and a public URL.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!supabaseAdmin) {
    throw new Error("Storage not configured (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
  }

  const key = relKey.replace(/^\/+/, "");
  const fileData = typeof data === "string" ? new TextEncoder().encode(data) : data;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(key, fileData, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(key);

  return { key, url: urlData.publicUrl };
}

/**
 * Get a signed download URL for a stored file.
 */
export async function storageGet(
  relKey: string,
  expiresIn: number = 3600
): Promise<{ key: string; url: string }> {
  if (!supabaseAdmin) {
    throw new Error("Storage not configured (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
  }

  const key = relKey.replace(/^\/+/, "");

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(key, expiresIn);

  if (error) throw new Error(`Storage signed URL failed: ${error.message}`);
  return { key, url: data.signedUrl };
}
