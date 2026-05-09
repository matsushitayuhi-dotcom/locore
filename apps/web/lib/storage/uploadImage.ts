'use server';

import 'server-only';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require-user';

/**
 * Supabase Storage に画像をアップロードして公開 URL を返す Server Action。
 *
 * - バケット: `article-images`（記事用） / `profile-avatars`（プロフィール用）
 * - パス: `<userId>/<uuid>.<ext>`
 * - 返却: `{ url, path }`
 */

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES_ARTICLE = 8 * 1024 * 1024; // 8MB
const MAX_BYTES_AVATAR = 4 * 1024 * 1024; // 4MB（アバターは小さく）

export type UploadImageResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

function extFromType(type: string): string {
  switch (type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

async function uploadToBucket(
  bucket: 'article-images' | 'profile-avatars',
  file: File,
  maxBytes: number,
): Promise<UploadImageResult> {
  const user = await requireUser();

  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `${file.type} は許可されていない形式です（JPEG / PNG / WebP / GIF のみ）`,
    };
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return { ok: false, error: `画像サイズは ${mb}MB 以下にしてください` };
  }

  const supabase = createSupabaseServerClient();
  const ext = extFromType(file.type);
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${user.id}/${id}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    const msg = uploadError.message ?? '';
    if (/Bucket not found|bucket.*not.*exist/i.test(msg)) {
      return {
        ok: false,
        error:
          `Supabase Storage に "${bucket}" バケットがありません。` +
          ' ダッシュボードで Public バケットを作成してください。',
      };
    }
    if (/violates row-level security/i.test(msg)) {
      return {
        ok: false,
        error:
          `バケット "${bucket}" の RLS ポリシーが未設定です。` +
          ' migrations/manual/0013_storage_policies.sql または 0014_*.sql を適用してください。',
      };
    }
    return { ok: false, error: `アップロードに失敗しました: ${msg}` };
  }

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: publicUrl.publicUrl, path };
}

/** 記事用画像（カバー、本文中）のアップロード */
export async function uploadImage(formData: FormData): Promise<UploadImageResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'ファイルが指定されていません' };
  }
  return uploadToBucket('article-images', file, MAX_BYTES_ARTICLE);
}

/** プロフィールアバター画像のアップロード */
export async function uploadAvatar(formData: FormData): Promise<UploadImageResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'ファイルが指定されていません' };
  }
  return uploadToBucket('profile-avatars', file, MAX_BYTES_AVATAR);
}
