import 'server-only';
import { Resend } from 'resend';

/**
 * Resend を薄くラップしたメール送信。
 *
 * 環境変数:
 *   - RESEND_API_KEY        Resend ダッシュボードで発行 (必須)
 *   - LOCORE_FROM_EMAIL     送信元 (デフォルト: "Locore <noreply@locore.app>")
 *                           ※ Resend で domain verification が必要
 *   - LOCORE_SUPPORT_EMAIL  運営の受信先 (デフォルト: "support@locore.app")
 *
 * 使い方:
 *   await sendEmail({ to: 'foo@bar', subject: '...', html: '<p>...</p>' });
 *
 * 設計方針:
 *   - 失敗しても呼び出し側の DB 書込は止めない (本番運用での "メール送れず DB
 *     にも残らない" 事故を防ぐため、try/catch して結果オブジェクトを返す)
 *   - ローカル開発で RESEND_API_KEY 未設定なら console.log で素通り (no-op)
 */

const FROM_DEFAULT = 'Locore <noreply@locore.app>';
export const SUPPORT_EMAIL =
  process.env.LOCORE_SUPPORT_EMAIL ?? 'support@locore.app';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  /** プレーンテキスト fallback。未指定なら html から雑に抽出 */
  text?: string;
  /** 返信先 (任意) */
  replyTo?: string;
  /** 送信元上書き (任意) */
  from?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null; skipped?: false }
  | { ok: true; id: null; skipped: true; reason: string }
  | { ok: false; error: string };

/**
 * html から ASCII テキスト抽出 (タグ除去・連続空白圧縮)。
 * Resend は text フィールドを送ると spam スコアが下がるので入れておきたい。
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // 開発環境では落とさず、ログだけ出して飛ばす
    console.log(
      `[email] RESEND_API_KEY 未設定のため送信スキップ:\n  to=${
        Array.isArray(input.to) ? input.to.join(',') : input.to
      }\n  subject=${input.subject}`,
    );
    return { ok: true, id: null, skipped: true, reason: 'RESEND_API_KEY not set' };
  }

  const from = input.from ?? process.env.LOCORE_FROM_EMAIL ?? FROM_DEFAULT;
  const text = input.text ?? htmlToText(input.html);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text,
      replyTo: input.replyTo,
    });
    if (error) {
      console.error('[email] Resend error:', error);
      return { ok: false, error: error.message ?? 'Resend rejected the request' };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] send threw:', msg);
    return { ok: false, error: msg };
  }
}
