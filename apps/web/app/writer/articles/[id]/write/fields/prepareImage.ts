/**
 * アップロード前の写真の下ごしらえ（0091 / エディタ作り直し）。
 *
 * iPhone の写真はそのままだと 1 枚 10〜12MB・4000px 級で、
 *   - 記事の表示幅は 720px しかないので 4000px は完全に無駄
 *   - HEIC のままだと Android や PC のブラウザで表示できないことがある
 *   - **Server Action の body 上限を超えると、サーバーに着く前に落ちる**
 * ので、長辺 1600px / JPEG に変換してから送る。HEIC もここで JPEG になる。
 *
 * 上限について（重要）:
 *   apps/web/next.config.mjs に experimental.serverActions.bodySizeLimit の指定が無いので、
 *   Server Action の body 上限は Next.js の既定 **1MB**（uploadImage.ts の 20MB は
 *   サーバー内の別チェックで、body 上限には効かない）。
 *   情報量の多い風景写真は長辺 1600px・品質 0.82 でも 1MB を超えるので、
 *   **MAX_UPLOAD_BYTES に収まるまで品質と長辺を段階的に落とす**。
 *   （bodySizeLimit を上げるなら next.config.mjs の担当と合意してから。上げれば ATTEMPTS を短くできる）
 *
 * 変換できなかった場合（デコードできない形式・canvas が使えない）は元のファイルをそのまま返す。
 * その場合は converted:false なので、呼び出し側（ImageField）が大きさと形式を見て
 * 「送っても失敗する」と分かる文言を出す。
 */

/** Server Action の body 上限 1MB に対する安全側の目安。FormData の被りぶんを見て 900KB */
export const MAX_UPLOAD_BYTES = 900 * 1024;

/** 記事の表示幅 720px の 2 倍。これ以上は読み手に届かない */
const MAX_EDGE = 1600;

/**
 * 上から順に試して、MAX_UPLOAD_BYTES に収まった時点で止める。
 * 1 枚目でだいたい収まるので、ふつうは 1 回しか描かない。
 */
const ATTEMPTS: readonly { edge: number; quality: number }[] = [
  { edge: MAX_EDGE, quality: 0.82 },
  { edge: MAX_EDGE, quality: 0.7 },
  { edge: MAX_EDGE, quality: 0.6 },
  { edge: 1280, quality: 0.6 },
];

export type PreparedImage = { file: File; converted: boolean };

export async function prepareImage(file: File): Promise<PreparedImage> {
  // GIF は動きが失われるので触らない
  if (file.type === 'image/gif') return { file, converted: false };
  if (typeof window === 'undefined' || typeof document === 'undefined') return { file, converted: false };

  let source: Source | null = null;
  try {
    source = await decode(file);
    if (!source) return { file, converted: false };
    const { width, height } = size(source);
    if (width === 0 || height === 0) return { file, converted: false };

    let best: Blob | null = null;
    for (const attempt of ATTEMPTS) {
      const blob = await render(source, width, height, attempt.edge, attempt.quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= MAX_UPLOAD_BYTES) break; // 収まったら終わり。これ以上は画質を落とさない
    }
    if (!best) return { file, converted: false };

    const stem = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return { file: new File([best], `${stem}.jpg`, { type: 'image/jpeg' }), converted: true };
  } catch {
    return { file, converted: false };
  } finally {
    if (source) release(source);
  }
}

/** 長辺 edge に収まるように縮めて JPEG にする */
async function render(
  source: Source,
  width: number,
  height: number,
  edge: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, edge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });
}

type Source = ImageBitmap | HTMLImageElement;

/** createImageBitmap が使えるならそれで（EXIF の向きも直す）。だめなら <img> で読む */
async function decode(file: File): Promise<Source | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation: 縦で撮った iPhone の写真が横倒しにならないように
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Safari の HEIC など、ここで落ちる組み合わせがある。<img> にフォールバックする
    }
  }
  return new Promise<Source | null>((resolve) => {
    let url = '';
    try {
      url = URL.createObjectURL(file);
    } catch {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function size(source: Source): { width: number; height: number } {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

function release(source: Source): void {
  if (!(source instanceof HTMLImageElement)) source.close();
}
