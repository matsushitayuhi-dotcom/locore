import 'server-only';
import {
  APP_URL,
  EMAIL_COLORS as C,
  btn,
  envelope,
  escapeHtml as esc,
  subLink,
} from './layout';
import { tzShortLabel } from '@/lib/bookings/constants';
import {
  formatDateShortInTz,
  formatSlotInTz,
  formatTimeRangeInTz,
} from '@/lib/bookings/time';

/**
 * 予約通知メール 5 テンプレ（notifications-slice モック 3/4・4/4 準拠、留学トーン）。
 *
 * 時刻の非対称ルール（アプリ内と同じ）:
 *   - 相談者宛 = 日本時間のみ
 *   - エキスパート（先輩）宛 = 本人の現地時間が主・日本時間を併記
 * ボタンは 1 通に 1 個だけ。チャット等はテキストリンクに降格。
 */

const JST = 'Asia/Tokyo';

export type BookingMailInput = {
  startAt: Date;
  endAt: Date;
  serviceTitle: string;
  priceJpy: number;
  /** エキスパート（先輩）側の表示名と現地 TZ（null なら日本時間のみ） */
  expertName: string;
  expertTimezone: string | null;
  requesterName: string;
  requestMessage?: string | null;
  meetUrl?: string | null;
};

type Mail = { subject: string; html: string };

/** '9/18（金）20:00–20:30' + 時間帯ラベル（メール表組み用） */
function slotCell(input: BookingMailInput, tz: string): string {
  const label = tzShortLabel(tz);
  return `<span style="font-weight:700;">${esc(
    `${formatDateShortInTz(input.startAt, tz)} ${formatTimeRangeInTz(input.startAt, input.endAt, tz)}`,
  )}</span><small style="font-weight:400;color:${C.mu};font-size:10.5px;margin-left:3px;">${esc(label)}</small>`;
}

function jstSubline(input: BookingMailInput): string {
  return `<span style="display:block;font-weight:400;font-size:11px;color:${C.mu};line-height:1.6;">（日本時間 ${esc(
    `${formatDateShortInTz(input.startAt, JST)} ${formatTimeRangeInTz(input.startAt, input.endAt, JST)}`,
  )}）</span>`;
}

function tableRow(k: string, vHtml: string, first = false): string {
  const bt = first ? '' : `border-top:1px solid ${C.bd};`;
  return `<tr>
    <td style="padding:10px 14px;color:${C.mu};width:96px;white-space:nowrap;vertical-align:top;font-size:12.5px;${bt}">${esc(k)}</td>
    <td style="padding:10px 14px;font-size:12.5px;${bt}">${vHtml}</td>
  </tr>`;
}

function table(rowsHtml: string): string {
  return `<table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:0;margin-top:16px;background:${C.bg};border:1px solid ${C.bd};border-radius:12px;">${rowsHtml}</table>`;
}

function heading(text: string): string {
  return `<h2 style="font-size:19px;font-weight:700;margin:0;">${esc(text)}</h2>`;
}

function bodyP(html: string): string {
  return `<p style="margin:10px 0 0;font-size:13.5px;line-height:1.95;color:${C.ink2};">${html}</p>`;
}

function note(html: string): string {
  return `<p style="margin-top:16px;font-size:11px;color:${C.mu};line-height:1.8;">${html}</p>`;
}

// =============================================================================
// 1. 先輩（エキスパート）宛: 新しい相談リクエスト
// =============================================================================

export function tplBookingRequested(input: BookingMailInput): Mail {
  const tz = input.expertTimezone ?? JST;
  const subject = `[Locore] 予約リクエストが届きました — ${input.requesterName}さん・${input.serviceTitle}`;
  const quote = input.requestMessage
    ? `<div style="margin-top:14px;border-left:3px solid ${C.lime};background:${C.bg};border-radius:0 10px 10px 0;padding:11px 15px;font-size:13px;line-height:1.9;color:${C.ink2};">
        <span style="display:block;font-size:11px;font-weight:700;color:${C.mu};margin-bottom:3px;">${esc(input.requesterName)}さんからのメッセージ</span>
        ${esc(input.requestMessage)}
      </div>`
    : '';
  const html = envelope(`
    ${heading('予約リクエストが届きました')}
    ${bodyP(`${esc(input.expertName)}さん、${esc(input.requesterName)}さんから相談のリクエストです。`)}
    ${table(
      tableRow('相談者', `<b>${esc(input.requesterName)}さん</b>`, true) +
        tableRow(
          'メニュー',
          `<b>${esc(input.serviceTitle)}</b><small style="font-weight:400;color:${C.mu};font-size:10.5px;margin-left:3px;">¥${input.priceJpy.toLocaleString('ja-JP')}・税込</small>`,
        ) +
        tableRow(
          '希望日時',
          slotCell(input, tz) + (tz !== JST ? jstSubline(input) : ''),
        ),
    )}
    ${quote}
    ${btn('リクエストを確認する →', `${APP_URL}/bookings?tab=received`)}
    ${note(
      `${esc(formatSlotInTz(input.startAt, tz))}（${esc(tzShortLabel(tz))}）の開始時刻までに返答がない場合、このリクエストは自動で期限切れになります。この時点で相談者に料金は発生していません。`,
    )}
  `);
  return { subject, html };
}

// =============================================================================
// 2. 相談者宛: 相談が確定
// =============================================================================

export function tplBookingConfirmed(input: BookingMailInput): Mail {
  const subject = `[Locore] 相談が確定しました — ${input.expertName}さん・${formatSlotInTz(input.startAt, JST)}`;
  const cta = input.meetUrl
    ? btn('参加リンクを開く', input.meetUrl)
    : btn('マイ相談を開く →', `${APP_URL}/bookings`);
  const linkNote = input.meetUrl
    ? '当日は時間になったら上のボタンからご参加ください。前日にもリマインドメールをお送りします。'
    : '参加リンクは準備でき次第、マイ相談ページとチャットに表示されます（メールでもお知らせします）。前日にもリマインドメールをお送りします。';
  const html = envelope(`
    ${heading('相談が確定しました')}
    ${bodyP(`${esc(input.requesterName)}さん、${esc(input.expertName)}さんがリクエストを承諾しました。以下の日時にオンラインでお会いします。`)}
    ${table(
      tableRow('日時', slotCell(input, JST), true) +
        tableRow('先輩', `<b>${esc(input.expertName)}さん</b>`) +
        tableRow(
          'メニュー',
          `<b>${esc(input.serviceTitle)}</b><small style="font-weight:400;color:${C.mu};font-size:10.5px;margin-left:3px;">¥${input.priceJpy.toLocaleString('ja-JP')}・税込</small>`,
        ),
    )}
    ${cta}
    ${subLink('事前に伝えたいことがあれば ', 'チャットを開く', `${APP_URL}/chat`)}
    ${note(linkNote)}
  `);
  return { subject, html };
}

// =============================================================================
// 3. 相談者宛: リクエスト辞退
// =============================================================================

export function tplBookingDeclined(input: BookingMailInput): Mail {
  const subject = `[Locore] リクエストは今回見送りとなりました — ${input.expertName}さん`;
  const html = envelope(`
    ${heading('リクエストは今回見送りとなりました')}
    ${bodyP(
      `${esc(input.requesterName)}さん、${esc(input.expertName)}さんの都合により、以下のリクエストは今回お受けできませんでした。料金は発生していません。`,
    )}
    ${table(
      tableRow('メニュー', `<b>${esc(input.serviceTitle)}</b>`, true) +
        tableRow('希望日時', slotCell(input, JST)),
    )}
    ${bodyP(
      '別の枠や、同じテーマに強い別の先輩へのリクエストもご検討ください。出願スケジュールが迫っている場合は、チャットで日程を直接相談するのも近道です。',
    )}
    ${btn('別の枠・別の先輩を探す →', `${APP_URL}/experts`)}
  `);
  return { subject, html };
}

// =============================================================================
// 4. 先輩（エキスパート）宛: リクエスト取り下げ / キャンセル
// =============================================================================

export function tplBookingCancelled(input: BookingMailInput): Mail {
  const tz = input.expertTimezone ?? JST;
  const subject = `[Locore] リクエストが取り下げられました — ${input.requesterName}さん`;
  const html = envelope(`
    ${heading('リクエストが取り下げられました')}
    ${bodyP(
      `${esc(input.expertName)}さん、${esc(input.requesterName)}さんが以下のリクエストを取り下げました。この枠は空き枠に戻ります。`,
    )}
    ${table(
      tableRow('相談者', `<b>${esc(input.requesterName)}さん</b>`, true) +
        tableRow('メニュー', `<b>${esc(input.serviceTitle)}</b>`) +
        tableRow(
          '日時',
          slotCell(input, tz) + (tz !== JST ? jstSubline(input) : ''),
        ),
    )}
    ${btn('受けたリクエストを見る →', `${APP_URL}/bookings?tab=received`)}
  `);
  return { subject, html };
}

// =============================================================================
// 5. 両者宛: 前日リマインダー
// =============================================================================

export function tplBookingReminder(
  input: BookingMailInput,
  recipient: 'expert' | 'requester',
): Mail {
  const isExpert = recipient === 'expert';
  const tz = isExpert ? (input.expertTimezone ?? JST) : JST;
  const counterpart = isExpert
    ? `${input.requesterName}さん`
    : `${input.expertName}さん`;
  const selfName = isExpert ? input.expertName : input.requesterName;
  const subject = `[Locore] 明日 ${formatTimeRangeInTz(input.startAt, input.endAt, tz).split('–')[0]}（${tzShortLabel(tz)}）から相談があります — ${counterpart}`;
  const bigtime = `<div style="margin-top:16px;background:${C.bg};border:1px solid ${C.bd};border-radius:12px;padding:16px 18px;text-align:center;">
    <div style="font-size:13px;font-weight:700;">明日 ${esc(formatDateShortInTz(input.startAt, tz))}</div>
    <div style="font-size:24px;font-weight:700;margin-top:2px;">${esc(formatTimeRangeInTz(input.startAt, input.endAt, tz))}<small style="font-size:11px;color:${C.mu};font-weight:400;margin-left:5px;">${esc(tzShortLabel(tz))}</small></div>
    ${
      tz !== JST
        ? `<div style="margin-top:3px;font-size:11.5px;color:${C.mu};">（日本時間 ${esc(formatTimeRangeInTz(input.startAt, input.endAt, JST))}）</div>`
        : ''
    }
  </div>`;
  const cta = input.meetUrl
    ? btn('相談室を開く', input.meetUrl)
    : btn('マイ相談を開く →', `${APP_URL}/bookings${isExpert ? '?tab=received' : ''}`);
  const html = envelope(`
    ${heading('明日、相談の予定があります')}
    ${bodyP(`${esc(selfName)}さん、${esc(counterpart)}との<b style="color:${C.ink}">${esc(input.serviceTitle)}</b>のリマインドです。`)}
    ${bigtime}
    ${cta}
    ${subLink('相談内容をおさらいする: ', 'マイ相談を開く', `${APP_URL}/bookings${isExpert ? '?tab=received' : ''}`)}
    ${note(`都合が悪くなった場合は、できるだけ早くチャットで${esc(counterpart)}にご連絡ください。`)}
  `);
  return { subject, html };
}
