'use client';

import { useEffect, useState } from 'react';

/** 右レールの目次（PC）。H2 を追従し、現在地を太字に */
export function Toc({ items }: { items: Array<{ id: string; text: string; level: 2 | 3 }> }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  useEffect(() => {
    if (items.length === 0) return;
    const els = items.map((i) => document.getElementById(`b-${i.id}`)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace(/^b-/, ''));
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  const h2 = items.filter((i) => i.level === 2);
  if (h2.length < 2) return null;
  return (
    <nav aria-label="目次" className="text-[12.5px] leading-[1.6] text-neutral-500">
      <b className="mb-3 block text-[11px] font-semibold tracking-[0.18em] text-neutral-400">目次</b>
      {h2.map((i) => (
        <a key={i.id} href={`#b-${i.id}`} className={'block py-1.5 transition ' + (active === i.id ? 'font-bold text-foreground' : 'hover:text-foreground')}>
          {i.text}
        </a>
      ))}
    </nav>
  );
}
