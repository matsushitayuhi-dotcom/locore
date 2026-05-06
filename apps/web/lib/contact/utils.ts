import 'server-only';

/**
 * お問い合わせ・通報用のユーティリティ。
 *
 * - 受付番号: reports.id（UUID）の先頭 8 文字を大文字化したもの。
 *   ユーザーが目視で扱いやすい長さにする。
 * - SLA: 72 時間（PRD §10.2）。`/admin/reports` で残り時間を緑/黄/赤で表示。
 */

/** お問い合わせ用に target_type='other' で使うダミー UUID（NIL UUID）。 */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export const SLA_HOURS = 72;
export const SLA_MS = SLA_HOURS * 60 * 60 * 1000;

/** UUID から受付番号（先頭 8 文字を大文字化、`LC-` プレフィックス付き）を作る。 */
export function toReceiptCode(reportId: string): string {
  return `LC-${reportId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export type SlaTone = 'green' | 'yellow' | 'red' | 'overdue';

export type SlaInfo = {
  /** 期限まで／超過からの残り（負なら超過）。ミリ秒。 */
  remainingMs: number;
  /** 表示用の文字列（例: `あと 12 時間 30 分` / `12 時間超過`）。 */
  label: string;
  tone: SlaTone;
};

/**
 * `created_at + 72h - now` を計算し、UI 表示に使える情報を返す。
 *
 * 緑: 24h 以上残り / 黄: 24h 未満 / 赤: 6h 未満 / overdue: 期限超過
 */
export function computeSla(createdAt: Date, now: Date = new Date()): SlaInfo {
  const deadline = createdAt.getTime() + SLA_MS;
  const remainingMs = deadline - now.getTime();

  if (remainingMs < 0) {
    const overdue = -remainingMs;
    return {
      remainingMs,
      tone: 'overdue',
      label: `${formatDuration(overdue)} 超過`,
    };
  }

  let tone: SlaTone = 'green';
  if (remainingMs < 6 * 60 * 60 * 1000) tone = 'red';
  else if (remainingMs < 24 * 60 * 60 * 1000) tone = 'yellow';

  return {
    remainingMs,
    tone,
    label: `あと ${formatDuration(remainingMs)}`,
  };
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `${hours} 時間 ${minutes} 分`;
  return `${minutes} 分`;
}

/** Tailwind 用のクラス（admin 画面で使う）。 */
export function slaToneClass(tone: SlaTone): string {
  switch (tone) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'yellow':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'red':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-300';
  }
}
