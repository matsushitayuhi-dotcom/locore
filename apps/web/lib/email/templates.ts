import 'server-only';

/**
 * 居住確認フローで使うメール本文テンプレ。
 *
 * React Email は導入していないので、シンプルな HTML 文字列で
 * 組み立てる。デザインは「ですます調 + 段落単位 + 安全な link」のみ。
 *
 * 共通スタイル:
 *   - 単一カラム、最大幅 560px、padding 32px、cream 背景
 *   - 見出しはセリフフォント想定 (Web font なしでも壊れない)
 *   - ボタンは bg=#B5453A (terracotta) のシンプルなインライン
 */

const APP_NAME = 'Locore';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';

function envelope(innerHtml: string): string {
  return `<!doctype html><html lang="ja"><body style="margin:0;padding:0;background:#FAF5EB;font-family:'Hiragino Sans','Yu Gothic',sans-serif;color:#1B2330;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="font-family:'Hiragino Mincho ProN','Yu Mincho',serif;font-weight:600;color:#B5453A;font-size:22px;letter-spacing:0.05em;">
        ${APP_NAME}
      </div>
      <div style="height:1px;background:#E8D9C2;margin:16px 0 24px;"></div>
      ${innerHtml}
      <div style="height:1px;background:#E8D9C2;margin:32px 0 16px;"></div>
      <p style="font-size:11px;color:#9098A1;line-height:1.7;margin:0;">
        このメールは ${APP_URL} から自動送信されています。<br>
        心当たりがない場合は破棄してください。
      </p>
    </div>
  </body></html>`;
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#B5453A;color:#FAF5EB;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;font-size:14px;">${label}</a>`;
}

// =============================================================================
// 1. 管理者向け: 新しい申請が届きました
// =============================================================================

export type SubmittedNotificationInput = {
  userDisplayName: string;
  userEmail: string;
  userId: string;
  country: string | null;
  city: string | null;
  legalNameRoman: string | null;
  legalNameNative: string | null;
  addressLine: string | null;
  postalCode: string | null;
  phoneNumber: string | null;
  documentType: string;
  fileCount: number;
  userNote?: string | null;
  adminReviewUrl: string; // /admin/verifications/[id]
};

export function tplSubmittedNotification(
  input: SubmittedNotificationInput,
): { subject: string; html: string } {
  const subject = `[Locore] 居住確認の新規申請 — ${input.userDisplayName} さん`;
  const html = envelope(`
    <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;font-family:'Hiragino Mincho ProN','Yu Mincho',serif;">
      居住確認の申請が届きました
    </h2>
    <p style="font-size:14px;line-height:1.85;margin:0 0 16px;">
      編集チームによるレビューをお願いします。
    </p>

    <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#F3E9D2;border-radius:12px;font-size:13px;">
      <tr>
        <td style="padding:10px 14px;color:#5C6470;width:130px;">申請者アカウント</td>
        <td style="padding:10px 14px;font-weight:600;">${escape(input.userDisplayName)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">アカウントメール</td>
        <td style="padding:10px 14px;border-top:1px solid #E8D9C2;">${escape(input.userEmail)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">User ID</td>
        <td style="padding:10px 14px;font-family:monospace;font-size:11px;border-top:1px solid #E8D9C2;">${escape(input.userId)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">氏名 (英語)</td>
        <td style="padding:10px 14px;font-weight:600;border-top:1px solid #E8D9C2;">${escape(input.legalNameRoman ?? '—')}</td>
      </tr>
      ${
        input.legalNameNative
          ? `<tr>
              <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">氏名 (日本語/母語)</td>
              <td style="padding:10px 14px;border-top:1px solid #E8D9C2;">${escape(input.legalNameNative)}</td>
            </tr>`
          : ''
      }
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">在住申告</td>
        <td style="padding:10px 14px;border-top:1px solid #E8D9C2;">
          ${escape(input.city ?? '')}${input.city && input.country ? ' / ' : ''}${escape(input.country ?? '—')}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">住所</td>
        <td style="padding:10px 14px;border-top:1px solid #E8D9C2;">
          ${escape(input.postalCode ?? '')}${input.postalCode ? '<br>' : ''}${escape(input.addressLine ?? '—')}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">電話番号</td>
        <td style="padding:10px 14px;font-family:monospace;border-top:1px solid #E8D9C2;">${escape(input.phoneNumber ?? '—')}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">書類タイプ</td>
        <td style="padding:10px 14px;border-top:1px solid #E8D9C2;">${escape(input.documentType)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#5C6470;border-top:1px solid #E8D9C2;">添付ファイル</td>
        <td style="padding:10px 14px;border-top:1px solid #E8D9C2;">${input.fileCount} 枚</td>
      </tr>
    </table>

    ${
      input.userNote
        ? `<p style="font-size:13px;line-height:1.85;margin:16px 0 0;color:#5C6470;">
            <strong style="color:#1B2330;">本人コメント:</strong><br>
            ${escape(input.userNote)}
          </p>`
        : ''
    }

    <div style="margin:28px 0 4px;">
      ${btn('レビュー画面を開く →', input.adminReviewUrl)}
    </div>
    <p style="font-size:11px;color:#9098A1;line-height:1.7;margin:8px 0 0;">
      書類ファイルは Supabase Storage の private バケットに格納されています。
      上のボタンから Locore 管理画面にログインしてご確認ください。
    </p>
  `);
  return { subject, html };
}

// =============================================================================
// 2. ユーザー向け: 承認しました
// =============================================================================

export type ApprovedNotificationInput = {
  userDisplayName: string;
  profileUrl: string;
};

export function tplApproved(input: ApprovedNotificationInput): {
  subject: string;
  html: string;
} {
  return {
    subject: `[Locore] 居住確認が承認されました`,
    html: envelope(`
      <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;font-family:'Hiragino Mincho ProN','Yu Mincho',serif;">
        居住確認が承認されました
      </h2>
      <p style="font-size:14px;line-height:1.85;margin:0 0 16px;">
        ${escape(input.userDisplayName)} さん、お待たせいたしました。
        ご提出いただいた書類を編集チームが確認し、居住確認を完了いたしました。
      </p>
      <p style="font-size:14px;line-height:1.85;margin:0 0 16px;">
        プロフィールには「居住確認済み」バッジが付与されます。
        Founders 申請や記事執筆など、現地在住者向けの機能がすべてご利用いただけます。
      </p>

      <div style="margin:24px 0;">
        ${btn('プロフィールを確認する →', input.profileUrl)}
      </div>

      <p style="font-size:13px;color:#5C6470;line-height:1.85;margin:0;">
        ご提出いただいた書類は GDPR 配慮の観点から 30 日以内に Locore の
        サーバーから物理削除されます。確認結果のフラグだけが残ります。
      </p>
    `),
  };
}

// =============================================================================
// 3. ユーザー向け: 却下しました
// =============================================================================

export type RejectedNotificationInput = {
  userDisplayName: string;
  reason: string;
  resubmitUrl: string;
};

export function tplRejected(input: RejectedNotificationInput): {
  subject: string;
  html: string;
} {
  return {
    subject: `[Locore] 居住確認について — 再申請のお願い`,
    html: envelope(`
      <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;font-family:'Hiragino Mincho ProN','Yu Mincho',serif;">
        ご提出書類の確認が完了しませんでした
      </h2>
      <p style="font-size:14px;line-height:1.85;margin:0 0 16px;">
        ${escape(input.userDisplayName)} さん、
        いただいた書類だけでは居住状況を確定することができませんでした。
        お手数ですが、内容をご確認のうえ再度ご提出いただけますでしょうか。
      </p>

      <div style="background:#F3E9D2;border-left:4px solid #B5453A;padding:14px 18px;margin:16px 0;border-radius:4px;">
        <p style="font-size:12px;color:#5C6470;margin:0 0 6px;font-weight:600;">編集チームから</p>
        <p style="font-size:14px;line-height:1.85;margin:0;white-space:pre-line;">${escape(input.reason)}</p>
      </div>

      <p style="font-size:14px;line-height:1.85;margin:0 0 16px;">
        ご不明な点があれば <a href="mailto:support@locore.app" style="color:#B5453A;">support@locore.app</a>
        までご連絡ください。
      </p>

      <div style="margin:24px 0;">
        ${btn('再申請する →', input.resubmitUrl)}
      </div>
    `),
  };
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
