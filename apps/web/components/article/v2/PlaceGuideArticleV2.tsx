'use client';

import { useMemo, useRef } from 'react';
import type { Article, Writer, Spot } from '@/lib/mock';
import { buildSpotGoogleMapsUrl } from '@/lib/maps/googleMapsUrls';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { CSS } from './placeGuideCss';
import {
  fmtDate,
  HeroNetCanvas,
  PinIcon,
  CostIcon,
  hasCoords,
  pinsEmbedUrl,
  useReveal,
  authorMeta,
} from './shared';

/**
 * ブログ・場所あり（place-guide）の新レンダラ。PlaceGuideMock 相当。
 *
 * データマッピング:
 *   - Hero → 導入(body HTML) → 場所紹介（spots を順不同カードで: name/category/
 *     photos/location/cost、説明は spot 情報＋address） → ピン集約マップ(pinsEmbedUrl)
 *     → 「この記事で紹介したスポット」縦並びリスト（各 spot に Google Map リンク）
 *     → 著者 → 関連 → 日付。
 *   - spots は loader が position 昇順で渡す。座標欠落スポットは地図リンク/ピンを出さない。
 *   - 各 spot の本文ソースが無いため、説明は address / openingHours / tags を要約に使う。
 */

export function PlaceGuideArticleV2({
  article,
  writer,
  spots,
  related,
  region,
  country,
}: {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  related: Article[];
  region: { nameJa: string } | null;
  country: { nameJa: string } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.pg-rev');

  const areaLabel = region?.nameJa ?? article.area ?? '';
  const countryLabel = country?.nameJa ?? '';
  const introHtml = article.body?.trim()
    ? renderArticleBodyHtml(article.body)
    : '';

  const mapPts = useMemo(
    () =>
      spots
        .filter((s) => hasCoords(s.lat, s.lng))
        .map((s) => ({ lat: s.lat, lng: s.lng })),
    [spots],
  );
  const hasMap = mapPts.length > 0;

  // spot の短い説明（本文ソースが無いので構造化フィールドから組む）
  const spotDesc = (s: Spot): string => {
    const bits: string[] = [];
    if (s.address) bits.push(s.address);
    if (s.openingHours) bits.push(s.openingHours);
    if (s.tags?.length) bits.push(s.tags.map((t) => `#${t}`).join(' '));
    return bits.join(' / ');
  };

  return (
    <div className="pg" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="pg-hero">
        <div className="pg-hbg" style={{ backgroundImage: `url('${article.coverImageUrl}')` }} />
        <HeroNetCanvas className="pg-hnet" />
        <div className="pg-hshade" />
        <div className="pg-hinner">
          <span className="pg-hkick">
            PLACE GUIDE{countryLabel ? ` · ${countryLabel}` : ''}
            {areaLabel ? ` · ${areaLabel}` : ''}
          </span>
          <h1>{article.title}</h1>
          {writer ? (
            <div className="pg-hauthor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="nm">{writer.name}</div>
                <div className="meta">{authorMeta(writer)}</div>
              </div>
            </div>
          ) : null}
          <div className="pg-hmeta">
            <span className="pg-pill">
              紹介 <b>{spots.length}か所</b>
            </span>
            {areaLabel ? (
              <span className="pg-pill">
                エリア <b>{areaLabel}</b>
              </span>
            ) : null}
            <span className="pg-pill">
              順番 <b>なし（順不同）</b>
            </span>
          </div>
        </div>
        <div className="pg-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 導入(body HTML) ===== */}
      {introHtml ? (
        <section className="pg-intro pg-rev">
          <div className="pg-wrap">
            <span className="pg-kicker">— Intro</span>
            <div
              className="pg-intro-body"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          </div>
        </section>
      ) : null}

      {/* ===== 場所紹介（順不同）===== */}
      <section className="pg-places">
        <div className="pg-wide">
          <div className="pg-placeshead pg-rev">
            <span className="pg-kicker">— The places</span>
            <h2>場所を、ひとつずつ</h2>
            <p>各場所は独立。気になったところから。全{spots.length}か所。</p>
          </div>
          <div className="pg-prich">
            {spots.map((s, i) => {
              const photo = s.photoUrls?.[0];
              const mapHref =
                hasCoords(s.lat, s.lng) || s.googlePlaceId
                  ? buildSpotGoogleMapsUrl({
                      placeId: s.googlePlaceId ?? null,
                      lat: s.lat,
                      lng: s.lng,
                      fallbackQuery: `${s.name} ${areaLabel}`,
                    })
                  : null;
              return (
                <article
                  key={s.id}
                  className={`pg-prow pg-rev${photo ? '' : ' nophoto'}`}
                >
                  {photo ? (
                    <div className="pg-pphoto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt="" loading="lazy" />
                      {s.category ? <span className="pg-pcat">{s.category}</span> : null}
                    </div>
                  ) : null}
                  <div className="pg-pbody">
                    <div className="pg-pname">
                      <span className="pg-pidx">{String(i + 1).padStart(2, '0')}</span>
                      <h3>{s.name}</h3>
                    </div>
                    {s.address ? (
                      <div className="pg-pplace">
                        <PinIcon />
                        {s.address}
                      </div>
                    ) : null}
                    {spotDesc(s) ? <p className="pg-ptxt">{spotDesc(s)}</p> : null}
                    <div className="pg-pextras">
                      {s.priceEstimate ? (
                        <span className="pg-cost">
                          <CostIcon />
                          {s.priceEstimate}
                        </span>
                      ) : null}
                      {mapHref ? (
                        <a
                          className="pg-maplink"
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <PinIcon />
                          地図で見る
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== ピン集約マップ ===== */}
      {hasMap ? (
        <section className="pg-mapsec">
          <div className="glow" />
          <div className="pg-wide">
            <div className="pg-maphead pg-rev">
              <span className="pg-kicker">— Map</span>
              <h2>全{mapPts.length}か所のピン</h2>
              <p>
                各場所の位置から自動生成。順路ではなく、ピンとして散らした集約マップです。
              </p>
            </div>
            <div className="pg-mapframe pg-rev">
              <span className="pg-mapbadge">Google マップ連携</span>
              <iframe
                title="場所紹介マップ"
                src={pinsEmbedUrl(mapPts)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== 縦並び場所リスト ===== */}
      <section className="pg-listsec">
        <div className="pg-wrap">
          <div className="pg-listhead pg-rev">
            <span className="pg-kicker">— Index</span>
            <h2>この記事で紹介したスポット</h2>
          </div>
          <div className="pg-list">
            {spots.map((s) => {
              const photo = s.photoUrls?.[0];
              const mapHref =
                hasCoords(s.lat, s.lng) || s.googlePlaceId
                  ? buildSpotGoogleMapsUrl({
                      placeId: s.googlePlaceId ?? null,
                      lat: s.lat,
                      lng: s.lng,
                      fallbackQuery: `${s.name} ${areaLabel}`,
                    })
                  : null;
              return (
                <div key={s.id} className="pg-lrow pg-rev">
                  {photo ? (
                    <div className="pg-lthumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt="" loading="lazy" />
                    </div>
                  ) : null}
                  <div className="pg-lbody">
                    {s.category ? <div className="pg-lcat">{s.category}</div> : null}
                    <h3>{s.name}</h3>
                    {s.address ? <div className="pg-lplace">{s.address}</div> : null}
                  </div>
                  {mapHref ? (
                    <a
                      className="pg-lgo"
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <PinIcon />
                      地図
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 著者カード ===== */}
      {writer ? (
        <section className="pg-authsec">
          <div className="pg-wide">
            <div className="pg-authcard pg-rev">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="k">この記事を書いた人</div>
                <h3>{writer.name}</h3>
                <div className="role">{authorMeta(writer)}</div>
                {writer.bio ? <p className="bio">{writer.bio}</p> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== 関連 ===== */}
      {related.length > 0 ? (
        <section className="pg-related">
          <div className="pg-wide">
            <div className="head pg-rev">
              <span className="pg-kicker">— You might also like</span>
              <h2 style={{ marginTop: 10 }}>ほかの記事</h2>
            </div>
            <div className="pg-rgrid">
              {related.map((r) => (
                <a key={r.id} className="pg-rcard pg-rev" href={`/mockup/real/${r.id}`}>
                  <div className="pg-rcov">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.coverImageUrl} alt="" loading="lazy" />
                  </div>
                  <div className="pg-rb">
                    <div className="c">{r.area}</div>
                    <h3>{r.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== 日付フッター ===== */}
      <section className="pg-dates">
        <div className="pg-wide">
          <div className="pg-dateline pg-rev">
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
