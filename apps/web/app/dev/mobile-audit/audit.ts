/**
 * スマホ幅でのレイアウト崩れを機械的に見つける。
 *
 * 日本語は英語と違って単語の切れ目が無く、どこでも改行できる。つまり flex の子の
 * min-content は「1 文字分」になる。幅が足りないと flex はそこまで縮めてしまうので、
 * 「ボ / ス / ト / ン」のように 1 文字ずつ縦に積まれた状態が出来上がる。
 * これは PC 幅では絶対に再現しないので、目視だけだと必ず取りこぼす。
 *
 * 同じ原因で起きる 3 つの症状を数える:
 *   1. overflow  … ページ全体が横スクロールする
 *   2. はみ出し   … 画面幅より右にはみ出した要素（横スクロール領域の中は除く）
 *   3. 縦積み     … 上記の「1 文字ずつ」状態
 * おまけで 4. 小さいタップ領域（44px 未満のボタン・リンク）も数える。
 */

export type Finding = {
  kind: 'はみ出し' | '縦積み' | 'タップ領域';
  tag: string;
  text: string;
  detail: string;
  className: string;
};

export type RouteResult = {
  path: string;
  status: 'ok' | 'ng' | 'redirected' | 'error';
  redirectedTo?: string;
  message?: string;
  overflow: number;
  findings: Finding[];
};

const TAP_MIN = 44; // Apple の Human Interface Guidelines の最小タップ領域

/** その要素が横スクロール領域や画面外の引き出しの中にあるか（はみ出しの誤検知を防ぐ） */
function insideScroller(el: Element): boolean {
  for (let p: Element | null = el; p && p.nodeType === 1; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (/auto|scroll|hidden/.test(cs.overflowX)) return true;
    if (cs.position === 'fixed') return true;
    if (cs.transform && cs.transform !== 'none') return true;
  }
  return false;
}

const label = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
const cls = (el: Element) => (el.className || '').toString().slice(0, 90);

/** 読み込み済みの iframe を検査する */
export function inspect(doc: Document, width: number): { overflow: number; findings: Finding[] } {
  const overflow = Math.max(0, doc.documentElement.scrollWidth - width);
  const findings: Finding[] = [];

  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    const b = el.getBoundingClientRect();
    if (b.width < 6 || b.height < 6) continue;

    // 1. はみ出し
    if (b.right > width + 1 && !insideScroller(el)) {
      findings.push({
        kind: 'はみ出し',
        tag: el.tagName.toLowerCase(),
        text: label(el),
        detail: `右端 ${Math.round(b.right)}px（画面 ${width}px）幅 ${Math.round(b.width)}px`,
        className: cls(el),
      });
    }

    const leaf = el.children.length === 0;
    const text = (el.textContent || '').trim();

    // 2. 縦積み（テキストだけを持つ要素で、幅が数文字ぶんしか無いのに何行にもなっている）
    if (leaf && text.length >= 4) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize) || 16;
      const lh = parseFloat(cs.lineHeight) || fs * 1.5;
      const lines = Math.round(b.height / lh);
      if (lines >= 3 && b.width < fs * 3.2) {
        findings.push({
          kind: '縦積み',
          tag: el.tagName.toLowerCase(),
          text: text.slice(0, 24),
          detail: `幅 ${Math.round(b.width)}px に ${lines} 行（文字サイズ ${Math.round(fs)}px）`,
          className: cls(el),
        });
      }
    }

    // 3. タップ領域（参考）
    if (/^(a|button)$/.test(el.tagName.toLowerCase()) && text.length > 0) {
      if (b.height < TAP_MIN - 8 && b.width < TAP_MIN - 8) {
        findings.push({
          kind: 'タップ領域',
          tag: el.tagName.toLowerCase(),
          text: text.slice(0, 24),
          detail: `${Math.round(b.width)}×${Math.round(b.height)}px（目安 ${TAP_MIN}px）`,
          className: cls(el),
        });
      }
    }
  }
  return { overflow, findings };
}

/** 1 ルートを隠し iframe で開いて検査する */
export async function auditRoute(path: string, width: number, timeoutMs = 25000): Promise<RouteResult> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `width:${width}px;height:900px;border:0;position:fixed;left:-99999px;top:0`;
  frame.src = path;
  document.body.appendChild(frame);
  try {
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      setTimeout(resolve, timeoutMs);
    });
    await new Promise((r) => setTimeout(r, 700)); // 画像やフォントの反映を待つ
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow) {
      return { path, status: 'error', message: '読み込めませんでした', overflow: 0, findings: [] };
    }
    const landed = frame.contentWindow.location.pathname;
    if (landed !== path) {
      return { path, status: 'redirected', redirectedTo: landed, overflow: 0, findings: [] };
    }
    const { overflow, findings } = inspect(doc, width);
    const real = findings.filter((f) => f.kind !== 'タップ領域');
    return { path, status: overflow > 0 || real.length > 0 ? 'ng' : 'ok', overflow, findings };
  } catch (err) {
    return { path, status: 'error', message: err instanceof Error ? err.message : String(err), overflow: 0, findings: [] };
  } finally {
    frame.remove();
  }
}
