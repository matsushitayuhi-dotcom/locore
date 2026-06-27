'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import type { Article, Writer, Spot } from '@/lib/mock';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { CSS } from './itineraryCss';
import { fmtDate, HeroNetCanvas, useReveal, authorMeta } from './shared';

/**
 * モデルコース（article_type === 'itinerary'）の v2 レイアウト。
 *
 * Phase B では「ブランドヒーロー＋導入(無料 body)」を v2 デザインで描き、その下に
 * engagement 層（ItineraryTimeline / Paywall / 地図 / レビュー / 著者 / 関連）を
 * children として差し込む。タイムライン・課金・スポット操作は既存コンポーネントを
 * 再利用するため、機能は一切落とさない。
 */
export function ItineraryArticleV2({
  article,
  writer,
  spots,
  region,
  country,
  heroActions,
  children,
}: {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  region: { nameJa: string } | null;
  country: { nameJa: string } | null;
  heroActions?: ReactNode;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.tj-rev');

  const areaLabel = region?.nameJa ?? article.area ?? '';
  const countryLabel = country?.nameJa ?? '';
  const stopCount = article.itineraryBlocks?.length ?? spots.length;
  const introHtml = useMemo(
    () => (article.body?.trim() ? renderArticleBodyHtml(article.body) : ''),
    [article.body],
  );

  return (
    <div className="tj" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="tj-hero">
        <div className="tj-hbg" style={{ backgroundImage: `url('${article.coverImageUrl}')` }} />
        <HeroNetCanvas className="tj-hnet" />
        <div className="tj-hshade" />
        <div className="tj-hinner">
          <span className="tj-hkick">
            ITINERARY{countryLabel ? ` · ${countryLabel}` : ''}
            {areaLabel ? ` · ${areaLabel}` : ''}
          </span>
          <h1>{article.title}</h1>
          {writer ? (
            <div className="tj-hauthor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="nm">{writer.name}</div>
                <div className="meta">{authorMeta(writer)}</div>
              </div>
            </div>
          ) : null}
          <div className="tj-hmeta">
            <span className="tj-pill">
              スポット <b>{stopCount}</b>
            </span>
            <span className="tj-pill">
              所要 <b>{article.durationType}</b>
            </span>
            {areaLabel ? (
              <span className="tj-pill">
                エリア <b>{areaLabel}</b>
              </span>
            ) : null}
          </div>
          {heroActions ? <div className="tj-heroact">{heroActions}</div> : null}
        </div>
        <div className="tj-scroll">
          記事を読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 導入（無料 body）===== */}
      {introHtml ? (
        <section className="tj-lead tj-rev">
          <div className="tj-wrap">
            <span className="tj-kicker dk">— Editor&apos;s note</span>
            <div
              className="tj-leadbody"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          </div>
        </section>
      ) : null}

      {/* ===== engagement 本体（タイムライン / 課金 / 地図 / レビュー / 著者 / 関連）===== */}
      <section className="tj-body">
        <div className="tj-bodywrap">{children}</div>
      </section>

      {/* ===== 日付フッター ===== */}
      <section className="tj-dates">
        <div className="tj-wide">
          <div className="tj-dateline tj-rev">
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
