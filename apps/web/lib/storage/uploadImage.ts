'use server';

import 'server-only';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require-user';

/**
 * Supabase Storage に画像をアップロードして公開 URL を返す Server Action。
 *
 * - バケット: `article-images`（Public、JPEG/PNG/WebP/GIF）
 * - パス: `<userId>/<uuid>.<ext>`
 * - 返却: `{ url, path }`
 *
 * バケットが未作成だと `404 Bucket not found` が返るので、UI 側で
 * 「Supabase でバケットを作成してください」と誘導する。
 */

const BUCKET = 'article-images';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

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

export async function uploadImage(formData: FormData): Promise<UploadImageResult> {
  const user = await requireUser();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return { ok: false, error: 'ファイルが指定されていません' };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `${file.type} は許可されていない形式です（JPEG / PNG / WebP / GIF のみ）`,
    };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: '画像サイズは 8MB 以下にしてください' };
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
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    // バケット未作成のケースをユーザーに分かるメッセージで返す
    const msg = uploadError.message ?? '';
    if (/Bucket not found|bucket.*not.*exist/i.test(msg)) {
      return {
        ok: false,
        error:
          `Supabase Storage に "${BUCKET}" バケットがありません。` +
          ' ダッシュボードで Public バケットを作成してください。',
      };
    }
    return { ok: false, error: `アップロードに失敗しました: ${msg}` };
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { ok: true, url: publicUrl.publicUrl, path };
}
