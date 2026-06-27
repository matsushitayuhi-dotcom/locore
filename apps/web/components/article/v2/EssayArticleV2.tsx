'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import type { Article, Writer } from '@/lib/mock';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { CSS } from './essayCss';
import { fmtDate, HeroNetCanvas, useReveal, authorMeta } from './shared';

/**
 * ブログ・場所なし（essay）の v2 レイアウト。
 *
 * Phase B では「ブランドヒーロー＋本文(無料 body)＋写真(photo_entries)＋動画スロット」を
 * v2 デザインで描き、その下に engagement 層（Paywall で body_paid をゲート、レビュー、
 * 著者、関連）を children として差し込む。地図・スポットは持たない。
 */
export function EssayArticleV2({
  article,
  writer,
  videosSlot,
  children,
  heroActions,
}: {
  article: Article;
  writer: Writer | null;
  /** article_videos を 16:9 で描く要素（engagement.EssayVideos）。本文末に流す。 */
  videosSlot?: ReactNode;
  children?: ReactNode;
  heroActions?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.es-rev');

  const bodyHtml = useMemo(
    () => (article.body?.trim() ? renderArticleBodyHtml(article.body) : ''),
    [article.body],
  );

  const photoEntries = (article.photoEntries ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="es" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="es-hero">
        <div className="es-hbg" style={{ backgroundImage: `url('${article.coverImageUrl}')` }} />
        <HeroNetCanvas className="es-hnet" />
        <div className="es-hshade" />
        <div className="es-hinner">
          <span className="es-hkick">
            ESSAY{article.area ? ` · ${article.area}` : ''}
          </span>
          <h1>{article.title}</h1>
          {writer ? (
            <div className="es-hauthor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="nm">{writer.name}</div>
                <div className="meta">{authorMeta(writer)}</div>
              </div>
            </div>
          ) : null}
          {heroActions ? <div className="es-heroact">{heroActions}</div> : null}
        </div>
        <div className="es-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 本文（無料 body）＋写真＋動画 ===== */}
      <article className="es-article">
        <div className="es-read">
          <span className="es-kicker es-rev">— Essay</span>
        </div>

        {bodyHtml ? (
          <div
            className="es-body es-rev"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null}

        {/* photo_entries（あれば写真として流す）*/}
        {photoEntries.map((p, i) => (
          <figure key={`pe-${i}`} className="es-figure es-rev">
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.caption ?? ''} loading="lazy" />
            </div>
            {p.caption || p.locationName ? (
              <figcaption className="es-figcap">
                {p.caption}
                {p.locationName ? ` · ${p.locationName}` : ''}
              </figcaption>
            ) : null}
          </figure>
        ))}

        {/* article_videos（16:9 中央）*/}
        {videosSlot}
      </article>

      {/* ===== engagement 本体（有料 body ゲート / レビュー / 著者 / 関連）===== */}
      <section className="es-body-extras">
        <div className="es-read">{children}</div>
      </section>

      {/* ===== 日付フッター ===== */}
      <section className="es-dates">
        <div className="es-wide">
          <div className="es-dateline es-rev">
            <span>
              公開 <b>{fmtDate(article.publishedAt)}</b>
            </span>
            <i />
            <span>
              最終更新 <b>{fmtDate(article.publishedAt)}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
