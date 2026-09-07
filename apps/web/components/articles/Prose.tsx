import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { ArticleBlock } from '@/lib/articles/blocks';
import type { LinkCardData } from '@/lib/articles/editorial';
import { Inline } from '@/components/articles/Inline';
import { EmbedBlock } from '@/components/articles/EmbedBlock';

/**
 * 記事本文（ブロック配列）の描画。案 B（mockups/v2/article-page-editorial.html）の組み:
 *   本文 16.5px / 行間 2.0（スマホ 16px / 1.85）、見出しは太字だけ、引用は細い縦線、
 *   ポイントは罫 1 本の段、表は横罫のみ、リンクはカード、埋め込みは共通の枠。色はライム 1 か所（先輩のひとこと）。
 * `midCta` を渡すと midCtaIndex の位置に差し込む。
 */
export function Prose({
  blocks,
  linkCards,
  midCta,
  midCtaAt,
}: {
  blocks: ArticleBlock[];
  linkCards?: Map<string, LinkCardData>;
  midCta?: ReactNode;
  midCtaAt?: number;
}) {
  let h2 = 0;
  return (
    <div className="prose-editorial text-[16.5px] leading-[2] text-neutral-800 max-sm:text-[16px] max-sm:leading-[1.85]">
      {blocks.map((b, i) => {
        const node = renderBlock(b, linkCards, b.type === 'heading' && b.level === 2 ? ++h2 : 0);
        return (
          <div key={b.id} id={`b-${b.id}`} className="scroll-mt-24">
            {node}
            {midCta && midCtaAt === i + 1 ? midCta : null}
          </div>
        );
      })}
    </div>
  );
}

function renderBlock(b: ArticleBlock, linkCards: Map<string, LinkCardData> | undefined, h2Index: number): ReactNode {
  switch (b.type) {
    case 'paragraph':
      return (
        <p className="mb-[1.4em]">
          <Inline text={b.text} />
        </p>
      );
    case 'heading':
      return b.level === 2 ? (
        <h2 className="mb-[0.9em] mt-[3em] flex items-baseline gap-3.5 text-[24px] font-bold leading-[1.45] tracking-[-0.015em] text-foreground max-sm:mt-[2.4em] max-sm:text-[20px]">
          {b.numbered ? <span className="flex-none text-[15px] font-bold tabular-nums tracking-[0.04em] text-neutral-400">{String(h2Index).padStart(2, '0')}</span> : null}
          <span>{b.text}</span>
        </h2>
      ) : (
        <h3 className="mb-[0.6em] mt-[2.2em] text-[17.5px] font-bold text-foreground max-sm:text-[17px]">{b.text}</h3>
      );
    case 'list':
      return b.style === 'number' ? (
        <ol className="mb-[1.4em] list-decimal pl-[1.4em] marker:text-neutral-400">
          {b.items.map((it, i) => (
            <li key={i} className="my-[0.35em] pl-1">
              <Inline text={it} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mb-[1.4em] list-disc pl-[1.2em] marker:text-neutral-400">
          {b.items.map((it, i) => (
            <li key={i} className="my-[0.35em]">
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <blockquote className="my-[2.2em] border-l border-foreground pl-[22px] text-[18.5px] leading-[1.8] text-foreground max-sm:my-[1.8em] max-sm:pl-4 max-sm:text-[17px]">
          <Inline text={b.text} />
          {b.cite ? <cite className="mt-2.5 block text-[12.5px] not-italic text-neutral-500">— {b.cite}</cite> : null}
        </blockquote>
      );
    case 'aside':
      if (b.kind === 'memo') {
        return (
          <div className="my-[1.8em] border-l-[3px] border-primary-500 pl-[18px] text-[15px] leading-[1.85] text-neutral-700">
            {b.label ? <b className="mb-1 block text-[12.5px] text-foreground">{b.label}</b> : null}
            <Inline text={b.text} />
          </div>
        );
      }
      return (
        <div className="my-[2em] border-y border-border py-[18px] text-[15px] leading-[1.85] text-neutral-700 max-sm:text-[14.5px]">
          {b.label ? <b className="mb-1.5 block text-[11.5px] tracking-[0.18em] text-foreground">{b.label}</b> : null}
          <Inline text={b.text} />
        </div>
      );
    case 'table': {
      const head: string[] | null = b.header === false ? null : (b.rows[0] ?? null);
      const rest: string[][] = b.header === false ? b.rows : b.rows.slice(1);
      const cols = Math.max(...b.rows.map((r) => r.length), 1);
      const wide = cols >= 5;
      const table = (
        <table className={'my-[1.6em] mb-[2em] w-full border-collapse text-[14.5px] max-sm:text-[13.5px] ' + (wide ? 'min-w-[720px]' : '')}>
          {head ? (
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th key={i} className="border-b border-foreground pb-2.5 pr-3 text-left text-[12px] font-semibold tracking-[0.06em] text-neutral-500">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rest.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} className={'border-b border-border py-3 pr-3 align-top leading-[1.7] ' + (/^[¥$€£]?[\d,.]+/.test(c.trim()) ? 'whitespace-nowrap tabular-nums' : '')}>
                    <Inline text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      return wide ? <div className="my-[1.6em] overflow-x-auto">{table}</div> : table;
    }
    case 'image':
      return (
        <figure className="my-[2.4em]">
          <div className="overflow-hidden rounded-xl bg-neutral-100 aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt={b.alt ?? ''} loading="lazy" className="h-full w-full object-cover" />
          </div>
          {b.caption ? <figcaption className="mt-2 text-[12px] text-neutral-400">{b.caption}</figcaption> : null}
        </figure>
      );
    case 'images':
      return (
        <figure className="my-[2.4em]">
          <div className={'grid gap-2 ' + (b.urls.length === 1 ? '' : b.urls.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {b.urls.map((u, i) => (
              <div key={i} className={'overflow-hidden rounded-xl bg-neutral-100 ' + (b.urls.length === 1 ? 'aspect-[4/3]' : 'aspect-square')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          {b.caption ? <figcaption className="mt-2 text-[12px] text-neutral-400">{b.caption}</figcaption> : null}
        </figure>
      );
    case 'takeaways':
      return (
        <div className="my-[1.6em] mb-[2.2em] border-l-[3px] border-primary-500 py-1 pl-[18px]">
          {b.label !== '' ? <b className="mb-2 block text-[11.5px] tracking-[0.18em] text-foreground">{b.label ?? 'サマリー'}</b> : null}
          <ul className="list-disc pl-[1.2em] text-[15px] leading-[1.9] text-neutral-800 marker:text-primary-700">
            {b.items.map((it, i) => (
              <li key={i}>
                <Inline text={it} />
              </li>
            ))}
          </ul>
        </div>
      );
    case 'checklist':
      return (
        <ul className="my-[1.6em] mb-[2em] list-none p-0">
          {b.items.map((it, i) => (
            <li key={i} className="flex items-start gap-3 py-2 text-[15.5px] leading-[1.7]">
              <span className={'mt-[5px] h-[18px] w-[18px] flex-none rounded-[5px] border-[1.5px] border-foreground ' + (it.done ? 'bg-foreground shadow-[inset_0_0_0_3px_#fff]' : '')} aria-hidden />
              <span>
                <Inline text={it.text} />
              </span>
            </li>
          ))}
        </ul>
      );
    case 'faq':
      return (
        <div className="my-[1.6em] mb-[2em]">
          {b.items.map((it, i) => (
            <details key={i} open={i === 0} className="group border-t border-border last:border-b">
              <summary className="flex cursor-pointer list-none items-baseline gap-3 py-4 text-[16px] font-bold [&::-webkit-details-marker]:hidden">
                <span className="flex-none text-[12px] tracking-[0.1em] text-neutral-400">Q</span>
                {it.q}
              </summary>
              <p className="mb-[18px] ml-[26px] text-[15px] leading-[1.85] text-neutral-700">
                <Inline text={it.a} />
              </p>
            </details>
          ))}
        </div>
      );
    case 'terms':
      return (
        <dl className="my-[1.6em] mb-[2em] grid grid-cols-[140px_1fr] gap-x-5 gap-y-2.5 text-[15px] leading-[1.8] max-sm:grid-cols-1 max-sm:gap-y-0.5">
          {b.items.map((it, i) => (
            <div key={i} className="contents">
              <dt className="font-bold text-foreground">{it.term}</dt>
              <dd className="m-0 text-neutral-700 max-sm:mb-2.5">
                <Inline text={it.def} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case 'timeline':
      return (
        <ul className="relative my-[1.6em] mb-[2em] list-none p-0 before:absolute before:bottom-2 before:left-[6px] before:top-2 before:w-[2px] before:bg-primary-500">
          {b.items.map((it, i) => (
            <li key={i} className="relative pb-[18px] pl-[30px] text-[15px] leading-[1.7] before:absolute before:left-[2px] before:top-2 before:h-[10px] before:w-[10px] before:rounded-full before:border-2 before:border-primary-500 before:bg-white">
              <b className="mb-0.5 block text-[12.5px] tracking-[0.06em] text-neutral-500">{it.date}</b>
              <Inline text={it.text} />
            </li>
          ))}
        </ul>
      );
    case 'proscons':
      return (
        <div className="my-[1.6em] mb-[2em] grid grid-cols-2 gap-6 text-[14.5px] leading-[1.8] max-sm:grid-cols-1 max-sm:gap-4">
          {[
            [b.prosLabel ?? 'メリット', b.pros],
            [b.consLabel ?? 'デメリット', b.cons],
          ].map(([label, items]) => (
            <div key={label as string}>
              <b className="mb-2 block border-b border-foreground pb-2 text-[11.5px] tracking-[0.18em] text-neutral-500">{label as string}</b>
              <ul className="list-disc pl-[1.1em] text-neutral-700 marker:text-neutral-400">
                {(items as string[]).map((it, i) => (
                  <li key={i}>
                    <Inline text={it} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case 'stats':
      return (
        <div className={'my-[1.6em] mb-[2em] grid gap-6 max-sm:gap-3.5 ' + (b.items.length === 2 ? 'grid-cols-2' : b.items.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
          {b.items.map((it, i) => (
            <div key={i} className="border-t border-foreground pt-3">
              <b className="block text-[30px] leading-none tracking-[-0.02em] tabular-nums max-sm:text-[22px]">{it.value}</b>
              <small className="mt-1.5 block text-[12.5px] leading-[1.6] text-neutral-500">{it.label}</small>
            </div>
          ))}
        </div>
      );
    case 'footnotes':
      return (
        <ol className="my-[2em] list-decimal border-t border-border pl-5 pt-3 text-[12.5px] leading-[1.8] text-neutral-500">
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      );
    case 'divider':
      return <hr className="my-[3em] w-16 border-0 border-t border-foreground" />;
    case 'link_card':
      return <LinkCard block={b} data={linkCards?.get(b.id)} />;
    case 'embed':
      return <EmbedBlock block={b} />;
    default:
      return null;
  }
}

function LinkCard({ block, data }: { block: Extract<ArticleBlock, { type: 'link_card' }>; data?: LinkCardData }) {
  if (data?.kind === 'article') {
    return (
      <Link href={`/articles/${data.id}`} className="my-[1.8em] grid grid-cols-[1fr_168px] overflow-hidden rounded-xl border border-border bg-card no-underline transition hover:border-foreground max-sm:grid-cols-[1fr_112px]">
        <div className="min-w-0 px-4 py-3.5">
          <div className="text-[10.5px] tracking-[0.16em] text-neutral-500">LOCORE の記事</div>
          <span className="mt-1 block text-[15px] font-bold leading-[1.5] tracking-[-0.01em] text-foreground max-sm:text-[14px]">{data.title}</span>
          {data.subtitle ? <div className="mt-1 line-clamp-2 text-[12.5px] leading-[1.6] text-neutral-500">{data.subtitle}</div> : null}
          <div className="mt-2 text-[11.5px] text-neutral-400">
            {[data.writerName, data.topic, `${data.minutes} 分`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="bg-neutral-100">
          {data.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </Link>
    );
  }
  if (data?.kind === 'expert') {
    return (
      <Link href={`/experts/${data.id}`} className="my-[1.8em] grid grid-cols-[96px_1fr] overflow-hidden rounded-xl border border-border bg-card no-underline transition hover:border-foreground max-sm:grid-cols-[72px_1fr]">
        <div className="grid place-items-center bg-neutral-900 text-[22px] font-bold text-primary-500">
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatarUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            data.name.charAt(0)
          )}
        </div>
        <div className="min-w-0 px-4 py-3.5">
          <div className="text-[10.5px] tracking-[0.16em] text-neutral-500">エキスパート</div>
          <span className="mt-1 block text-[15px] font-bold leading-[1.5] text-foreground">
            {data.name}{' '}
            <span className="text-[13px] font-normal text-neutral-500">
              {[data.schoolLabel, data.enrollmentLabel, data.verified ? '在籍確認済み' : null].filter(Boolean).join(' · ')}
            </span>
          </span>
          <div className="mt-1 line-clamp-2 text-[12.5px] leading-[1.6] text-neutral-500">
            {data.specialties.join(' · ')}
            {data.minPriceJpy != null ? `${data.specialties.length ? '。' : ''}30 分 ¥${data.minPriceJpy.toLocaleString('ja-JP')}〜` : ''}
          </div>
          <span className="mt-2 inline-block border-b-2 border-primary-500 text-[12.5px] font-bold text-foreground">この人に相談する →</span>
        </div>
      </Link>
    );
  }
  const host = data?.kind === 'external' ? data.host : (() => { try { return new URL(block.url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  const p = data?.kind === 'external' ? data.preview : block.preview ?? null;
  return (
    <a href={block.url} target="_blank" rel="noopener noreferrer" className="my-[1.8em] grid grid-cols-[1fr_168px] overflow-hidden rounded-xl border border-border bg-card no-underline transition hover:border-foreground max-sm:grid-cols-[1fr_112px]">
      <div className="min-w-0 px-4 py-3.5">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-neutral-500">{host || '外部サイト'}</div>
        <span className="mt-1 block text-[15px] font-bold leading-[1.5] tracking-[-0.01em] text-foreground max-sm:text-[14px]">{p?.title ?? block.url}</span>
        {p?.description ? <div className="mt-1 line-clamp-2 text-[12.5px] leading-[1.6] text-neutral-500">{p.description}</div> : null}
        <div className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-neutral-400">
          {p?.siteName ?? host} <ArrowUpRight className="h-3 w-3" aria-hidden />
        </div>
      </div>
      <div className="grid place-items-center bg-neutral-100 text-[22px] font-bold text-neutral-300">
        {p?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          (host.charAt(0) || '↗').toUpperCase()
        )}
      </div>
    </a>
  );
}
