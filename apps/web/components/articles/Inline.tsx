import type { ReactNode } from 'react';

/**
 * 本文中の最小限の装飾: **太字** と [文字](URL)。HTML は解釈しない（React がエスケープする）。
 * 改行はそのまま <br>。
 */
export function Inline({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g;

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = text.split('\n');
  lines.forEach((line, li) => {
    let last = 0;
    let m: RegExpExecArray | null;
    const re = new RegExp(TOKEN.source, 'g');
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) out.push(line.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('**')) {
        out.push(<b key={`${li}-${m.index}`}>{tok.slice(2, -2)}</b>);
      } else {
        const label = tok.slice(1, tok.indexOf(']('));
        const href = m[2]!;
        const external = !href.startsWith('/') && !/locore\.app/.test(href);
        out.push(
          <a
            key={`${li}-${m.index}`}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="underline decoration-neutral-300 underline-offset-4 hover:decoration-foreground"
          >
            {label}
          </a>,
        );
      }
      last = m.index + tok.length;
    }
    if (last < line.length) out.push(line.slice(last));
    if (li < lines.length - 1) out.push(<br key={`br-${li}`} />);
  });
  return out;
}
