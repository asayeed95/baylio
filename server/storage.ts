/**
 * Storage Service
 *
 * Abstracts file storage. Uses Supabase Storage when available,
 * falls back to Manus Forge proxy for backward compatibility.
 */
import { supabaseAdmin } from "./lib/supabase";
import { ENV } from "./_core/env";

const BUCKET = "baylio-files";

/**
 * Upload a file to storage.
 * Returns the storage key and a public/signed URL.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");

  // Strategy 1: Supabase Storage
  if (supabaseAdmin) {
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

  // Strategy 2: Manus Forge proxy (legacy fallback)
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("No storage backend configured (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)");
  }

  const uploadUrl = new URL("v1/storage/upload", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  uploadUrl.searchParams.set("path", key);
  const blob = typeof data === "string"
    ? new Blob([data], { type: contentType })
    : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status}): ${message}`);
  }
  const url = (await response.json()).url;
  return { key, url };
}

/**
 * Get a download URL for a stored file.
 * Returns a signed URL (Supabase) or a proxy URL (Manus).
 */
export async function storageGet(
  relKey: string,
  expiresIn: number = 3600
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");

  // Strategy 1: Supabase Storage
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(key, expiresIn);

    if (error) throw new Error(`Storage signed URL failed: ${error.message}`);
    return { key, url: data.signedUrl };
  }

  // Strategy 2: Manus Forge proxy (legacy fallback)
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("No storage backend configured");
  }

  const downloadUrl = new URL("v1/storage/downloadUrl", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  downloadUrl.searchParams.set("path", key);
  const response = await fetch(downloadUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const url = (await response.json()).url;
  return { key, url };
}
