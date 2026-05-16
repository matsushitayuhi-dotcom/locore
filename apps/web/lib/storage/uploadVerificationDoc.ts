'use server';

import 'server-only';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require-user';

/**
 * 居住確認用書類 (光熱費 / 賃貸契約 / ID 等) を Supabase Storage の
 * **private バケット** `verification-docs` にアップロードする。
 *
 * - 公開 URL は使わない (private)。閲覧は signed URL を発行
 * - JPEG / PNG / WebP / GIF / HEIC / HEIF / PDF を許可 (15MB まで)
 * - パス: `<userId>/<uuid>.<ext>` で RLS の所有者判定に対応
 *
 * 関連 migration: manual/0041_residency_verification_enhancements.sql
 */

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const MAX_BYTES = 15 * 1024 * 1024; // 15MB (賃貸契約の PDF は大きめ)

export type UploadDocResult =
  | { ok: true; path: string }
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
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}

/**
 * 1 ファイルだけアップロードして Storage パスを返す。
 * UI 側で複数ファイルを順に呼ぶ想定。
 */
export async function uploadVerificationDoc(
  formData: FormData,
): Promise<UploadDocResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'ファイルが指定されていません' };
  }
  const user = await requireUser();

  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `${file.type} は許可されていない形式です (JPEG/PNG/WebP/GIF/HEIC/PDF のみ)`,
    };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: '書類サイズは 15MB 以下にしてください' };
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
    .from('verification-docs')
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
          'Supabase Storage に "verification-docs" バケットがありません。' +
          ' manual/0041 を適用してください。',
      };
    }
    if (/violates row-level security/i.test(msg)) {
      return {
        ok: false,
        error:
          '"verification-docs" の RLS ポリシーが未設定です。' +
          ' manual/0041 を適用してください。',
      };
    }
    return { ok: false, error: `アップロードに失敗しました: ${msg}` };
  }

  return { ok: true, path };
}

/**
 * 管理者向けに署名付き URL を発行する (有効期限: デフォルト 7 日)。
 * editor チェックは呼び出し側で済ませる前提。
 */
export async function getSignedDocUrl(
  path: string,
  expiresInSec = 7 * 24 * 60 * 60,
): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from('verification-docs')
    .createSignedUrl(path, expiresInSec);
  if (error || !data?.signedUrl) {
    console.warn('[getSignedDocUrl] failed:', error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * 物理削除 (cron / 編集者操作用)。
 */
export async function deleteVerificationDocs(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.storage.from('verification-docs').remove(paths);
  if (error) {
    console.warn('[deleteVerificationDocs] failed:', error.message);
    return false;
  }
  return true;
}
