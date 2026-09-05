import 'server-only';

/**
 * メール共通レイアウト（notifications-slice モック準拠）。
 *
 * envelope: 560px 単一カラム・白基調（white-base 方針。旧 templates.ts の
 * cream #FAF5EB は使わない）。ボタンはサイトと同じライム。
 * 旧テンプレ（templates.ts の本人確認系）はテラコッタ/cream のまま残っており、
 * 将来こちらのレイアウトに合わせて移行する。
 *
 * React Email は導入していないので、シンプルな HTML 文字列で組み立てる。
 */

export const APP_NAME = 'Locore';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://locore.app';

// サイトの white-base トークン（apps/web/app/globals.css 準拠）
const INK = '#18181B';
const INK2 = '#3F3F46';
const MU = '#71717A';
const MU2 = '#9CA3AF';
const BD = '#E3E3DA'; // border
const BD2 = '#CCCCC1'; // border-strong
const BG = '#F4F4F5'; // neutral-50（表組み等の地）
const LIME = '#A8E01C'; // primary-500
const LIME_DARK = '#5E8B0E'; // primary-700

export const EMAIL_COLORS = {
  ink: INK,
  ink2: INK2,
  mu: MU,
  bd: BD,
  bg: BG,
  lime: LIME,
  limeDark: LIME_DARK,
} as const;

/** 560px 単一カラムの封筒。白地・ライムのロゴマーク・定型フッター付き */
export function envelope(innerHtml: string): string {
  return `<!doctype html><html lang="ja"><body style="margin:0;padding:0;background:#FFFFFF;font-family:'Hiragino Sans','Yu Gothic',sans-serif;color:${INK};">
    <div style="max-width:560px;margin:0 auto;padding:34px 24px 40px;">
      <div style="border:1px solid ${BD2};border-radius:14px;background:#FFFFFF;padding:32px 28px;">
        <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${INK};">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${LIME};margin-right:8px;"></span>${APP_NAME}
        </div>
        <div style="height:1px;background:${BD};margin:16px 0 22px;"></div>
        ${innerHtml}
        <div style="height:1px;background:${BD};margin:28px 0 14px;"></div>
        <p style="font-size:10.5px;color:${MU2};line-height:1.8;margin:0;">
          このメールは ${APP_URL} から自動送信されています。<br>
          心当たりがない場合は破棄してください。
        </p>
      </div>
    </div>
  </body></html>`;
}

/** ライムの主ボタン（1 通に 1 個だけ。迷わせない） */
export function btn(label: string, href: string): string {
  return `<div style="margin-top:22px;text-align:center;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:${LIME};color:#0E0E0F;text-decoration:none;padding:13px 30px;border-radius:9999px;font-weight:bold;font-size:14px;">${label}</a>
  </div>`;
}

/** ボタン下のテキストリンク行（チャット等はここに降格） */
export function subLink(prefix: string, label: string, href: string): string {
  return `<p style="margin:12px 0 0;text-align:center;font-size:12px;color:${INK2};">${prefix}<a href="${escapeHtml(href)}" style="color:${LIME_DARK};font-weight:bold;text-decoration:underline;text-underline-offset:3px;">${label}</a></p>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
