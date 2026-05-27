import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const hasSupabaseStorageEnv = Boolean(supabaseUrl && serviceRoleKey);

export function getSupabase() {
  if (!hasSupabaseStorageEnv) {
    throw new Error(
      "Variables Supabase manquantes: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

export async function getSignedAssetUrl(
  bucket: string,
  objectPath: string
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL);

  if (error) {
    console.error(`Signed URL error ${bucket}/${objectPath}:`, error);
    return null;
  }

  return data.signedUrl;
}

export async function uploadBase64(
  bucket: string,
  objectPath: string,
  base64: string,
  mimeType: string
): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const buffer = Buffer.from(base64, "base64");
    const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      console.error(`Upload error ${bucket}/${objectPath}:`, error);
      return null;
    }

    return getSignedAssetUrl(bucket, objectPath);
  } catch (error) {
    console.error(`Upload error ${bucket}/${objectPath}:`, error);
    return null;
  }
}

export async function uploadFromUrl(
  bucket: string,
  objectPath: string,
  url: string,
  mimeType: string
): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      console.error(`Upload error ${bucket}/${objectPath}:`, error);
      return null;
    }

    return getSignedAssetUrl(bucket, objectPath);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function uploadDataUrl(
  bucket: string,
  objectPath: string,
  dataUrl: string,
  fallbackMime = "application/octet-stream"
): Promise<string | null> {
  if (dataUrl.startsWith("data:")) {
    const [meta, data] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || fallbackMime;
    return uploadBase64(bucket, objectPath, data, mime);
  }

  if (dataUrl.startsWith("http")) {
    return uploadFromUrl(bucket, objectPath, dataUrl, fallbackMime);
  }

  return null;
}
