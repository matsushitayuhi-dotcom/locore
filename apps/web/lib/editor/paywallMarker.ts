/**
 * Phase C: 本文中「ここから下を有料にする」区切りマーカーのユーティリティ。
 *
 * 設計方針:
 *   - 書き手は本文エディタ（TipTap）の 1 本のフローの中に、区切りを 1 箇所だけ挿入する。
 *   - 区切りより前＝無料(body)、後＝有料(body_paid)。
 *   - DB スキーマは非変更（body / body_paid の 2 カラムをそのまま使う）。
 *   - 保存時に combined HTML をマーカーで 2 分割して body / body_paid に振り分ける。
 *   - 読み込み時は body + マーカー + body_paid を結合して 1 本の HTML に戻す（round-trip）。
 *
 * マーカーの持ち方:
 *   TipTap の `setHorizontalRule()` が吐く `<hr>` に `data-paywall="true"` 属性を付けた
 *   `<hr data-paywall="true">` を「唯一の区切り」とみなす。標準の区切り線(`<hr>`)と
 *   衝突しないよう、属性付きのものだけをペイウォール境界として扱う。
 *
 * 注意:
 *   - 区切りが無ければ全文を body に入れる（＝従来どおり / 後方互換）。
 *   - 複数挿入された場合は「最初の 1 個」を境界として扱い、残りは通常の区切り線に戻す。
 */

/** 本文中に挿入されるペイウォール境界の HTML（TipTap が出力する形に合わせる）。 */
export const PAYWALL_MARKER_HTML = '<hr data-paywall="true">';

/**
 * `data-paywall` 属性付きの `<hr>` にマッチする正規表現。
 * 属性順・自己終了スラッシュ・前後空白の揺れを吸収する。
 */
const PAYWALL_HR_RE =
  /<hr\b[^>]*\bdata-paywall(?:=("|')?true\1?)?[^>]*\/?>/i;
const PAYWALL_HR_RE_GLOBAL =
  /<hr\b[^>]*\bdata-paywall(?:=("|')?true\1?)?[^>]*\/?>/gi;

/** combined HTML にペイウォール境界が含まれているか。 */
export function hasPaywallMarker(html: string | null | undefined): boolean {
  if (!html) return false;
  return PAYWALL_HR_RE.test(html);
}

/**
 * 編集中の 1 本の combined HTML を、保存用に body(無料) / bodyPaid(有料) へ分割する。
 *
 * - 境界が無いときは { free: html, paid: '' }（全文無料 body・従来どおり）。
 * - 境界が複数あるときは最初の 1 個で分割し、後続の境界マーカーは通常区切りに戻す
 *   （有料側に余計な data-paywall 属性を残さない）。
 */
export function splitBodyByPaywall(combinedHtml: string): {
  free: string;
  paid: string;
} {
  const html = combinedHtml ?? '';
  const match = PAYWALL_HR_RE.exec(html);
  if (!match) {
    return { free: html, paid: '' };
  }
  const idx = match.index;
  const free = html.slice(0, idx);
  let paid = html.slice(idx + match[0].length);
  // 有料側に残った 2 個目以降の境界は、通常の区切り線へ戻す（境界は常に 1 本）。
  paid = stripPaywallMarkers(paid);
  return { free: free.trim(), paid: paid.trim() };
}

/**
 * 保存済みの body / bodyPaid を、編集用の 1 本の combined HTML に結合する。
 *
 * - bodyPaid が空（or null）なら body のみ（境界なし＝従来記事）。
 * - bodyPaid があれば body + 境界 + bodyPaid を連結。
 * - 念のため body / bodyPaid に紛れ込んだ既存の境界マーカーは除去してから連結する。
 */
export function joinBodyWithPaywall(
  free: string | null | undefined,
  paid: string | null | undefined,
): string {
  const freeHtml = stripPaywallMarkers(free ?? '').trim();
  const paidHtml = stripPaywallMarkers(paid ?? '').trim();
  if (!paidHtml) return freeHtml;
  return `${freeHtml}${PAYWALL_MARKER_HTML}${paidHtml}`;
}

/** すべてのペイウォール境界マーカーを通常の `<hr>` に戻す（除去ではなく無害化）。 */
export function stripPaywallMarkers(html: string): string {
  if (!html) return '';
  return html.replace(PAYWALL_HR_RE_GLOBAL, '<hr>');
}
