'use client';

import { useMemo, useRef } from 'react';
import type { Spot } from '@/lib/mock';
import {
  buildSpotGoogleMapsUrl,
  buildItineraryDirectionsUrl,
  pickDominantTravelMode,
} from '@/lib/maps/googleMapsUrls';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { Paywall } from '../../Paywall';
import { ArticleSpotsMap } from '../../ArticleSpotsMap';
import { SpotFavoriteButton } from '../../SpotFavoriteButton';
import { BulkSpotFavoriteButton } from '../../BulkSpotFavoriteButton';
import { ReviewFormToggle } from '../ReviewFormToggle';
import { CSS } from './itineraryCss';
import {
  fmtDate,
  HeroNetCanvas,
  PinIcon,
  CostIcon,
  ModeIcon,
  hasCoords,
  routeEmbedUrl,
  useReveal,
  authorMeta,
} from './shared';
import {
  AuthorCard,
  RelatedArticles,
  ReviewsList,
  SpotTipBox,
  type EngagementProps,
} from './engagement';

/**
 * モデルコース（article_type === 'itinerary'）の v2 レイアウト。
 *
 * Phase A の新デザイン本文（ルートマップ＋スポット概観 / 旅程タイムライン）を
 * 現行の実データ（itinerary_blocks + spots）で描画しつつ、Phase B で入れた課金
 * （Paywall）とインタラクション（いいね/保存・スポット保存・レビュー・著者・関連・
 * 地図）を新スタイルの中に織り込む。
 *
 * ゲート意味論（engagement.PaidBodyAndExtras 踏襲・収益直結）:
 *   - unlocked（購入/owner/無料記事アンロック/preview）時のみ、旅程の詳細
 *     （stop の notes / spot.description / spot.tip / 住所 / コスト）と body_paid・
 *     地図・レビューフォームを出す。
 *   - 未解放時は新スタイルの無料部分（ヒーロー＋導入＝article.body）だけを見せ、
 *     残りは <Paywall>（masked スポット）に委ねる。body_paid・有料詳細は一切出さない。
 */

const MODE_LABEL: Record<string, string> = {
  walk: '徒歩',
  metro: 'メトロ',
  bus: 'バス',
  taxi: 'タクシー',
  bike: '自転車',
  train: '電車',
  other: '移動',
};

type Stop = {
  idx: number;
  time: string;
  end?: string;
  name: string;
  cat?: string;
  photo?: string;
  bodyHtml: string;
  description?: string;
  tip?: string;
  address?: string;
  cost?: string;
  spot?: Spot;
  transfer?: { mode: string; minutes?: number | null; note?: string | null };
};

export type ItineraryArticleV2Props = EngagementProps & {
  region: { nameJa: string } | null;
  country: { nameJa: string } | null;
  heroActions?: React.ReactNode;
};

export function ItineraryArticleV2(props: ItineraryArticleV2Props) {
  const {
    article,
    writer,
    spots,
    reviews,
    related,
    region,
    country,
    unlocked,
    purchasedOrOwner,
    isOwner,
    viewerLoggedIn,
    folders,
    bookmarkedSpotIds,
    myReview,
    previewMode,
    authorServices,
    heroActions,
  } = props;

  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.tj-rev');

  const spotById = useMemo(() => {
    const m = new Map<string, Spot>();
    for (const s of spots) m.set(s.id, s);
    return m;
  }, [spots]);

  const stops: Stop[] = useMemo(() => {
    const blocks = article.itineraryBlocks ?? [];
    return blocks.map((b, i) => {
      const spot = b.spotId ? spotById.get(b.spotId) : undefined;
      const name = spot?.name || b.freeName || `スポット ${i + 1}`;
      const photo = spot?.photoUrls?.[0];
      const cost = spot?.priceEstimate || undefined;
      const hasTransfer =
        b.transportToNext ||
        (b.travelMinutesAfter != null && b.travelMinutesAfter > 0) ||
        b.transportNote;
      return {
        idx: i,
        time: b.startTime,
        end: b.endTime ?? undefined,
        name,
        cat: spot?.category || undefined,
        photo,
        bodyHtml: b.notes ? renderArticleBodyHtml(b.notes) : '',
        description: spot?.description?.trim() || undefined,
        tip: spot?.tip?.trim() || undefined,
        address: spot?.address || undefined,
        cost,
        spot,
        transfer: hasTransfer
          ? {
              mode: b.transportToNext ?? 'other',
              minutes: b.travelMinutesAfter,
              note: b.transportNote,
            }
          : undefined,
      };
    });
  }, [article.itineraryBlocks, spotById]);

  // 地図用の座標つきスポット（順序を保持）
  const coordStops = useMemo(
    () =>
      stops
        .map((s) => s.spot)
        .filter((s): s is Spot => !!s && hasCoords(s.lat, s.lng)),
    [stops],
  );

  const routeSrc = useMemo(
    () => routeEmbedUrl(coordStops.map((s) => ({ lat: s.lat, lng: s.lng }))),
    [coordStops],
  );

  const directionsUrl = useMemo(() => {
    const mode = pickDominantTravelMode(
      (article.itineraryBlocks ?? []).map((b) => b.transportToNext),
    );
    return buildItineraryDirectionsUrl(
      coordStops.map((s) => ({
        placeId: s.googlePlaceId ?? null,
        lat: s.lat,
        lng: s.lng,
      })),
      mode,
    );
  }, [coordStops, article.itineraryBlocks]);

  const areaLabel = region?.nameJa ?? article.area ?? '';
  const countryLabel = country?.nameJa ?? '';
  const stopCount = stops.length || spots.length;
  const introHtml = useMemo(
    () => (article.body?.trim() ? renderArticleBodyHtml(article.body) : ''),
    [article.body],
  );
  const paidHtml = useMemo(
    () =>
      article.bodyPaid?.trim() ? renderArticleBodyHtml(article.bodyPaid) : '',
    [article.bodyPaid],
  );
  const showMap = coordStops.length >= 1;

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
            {article.tags.slice(0, 2).map((t) => (
              <span key={t} className="tj-pill">
                <b>#{t}</b>
              </span>
            ))}
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

      {!unlocked ? (
        /* ===== 未解放: Paywall（ここから先は一切の有料詳細を出さない）===== */
        <section className="tj-body">
          <div className="tj-bodywrap">
            <Paywall
              article={article}
              bodyAfter={paidHtml ? article.bodyPaid! : ''}
              spots={spots}
              folders={folders}
              bookmarkedSpotIds={bookmarkedSpotIds}
              viewerLoggedIn={viewerLoggedIn}
              alreadyPurchased={purchasedOrOwner}
            />
          </div>
        </section>
      ) : (
        <>
          {/* ===== 集約マップ＋スポット概観（解放時のみ）===== */}
          {showMap ? (
            <section className="tj-mapsec">
              <div className="tj-wide">
                <div className="tj-maphead tj-rev">
                  <span className="tj-kicker dk">— Route map &amp; spots</span>
                  <h2>1日のルートと、立ち寄り先</h2>
                  <p>
                    各スポットの場所から自動生成したルート。先に全体像をつかんでから、
                    下の旅程を時間順に読んでいきましょう。全{stops.length}スポット。
                  </p>
                </div>
                <div className="tj-mapgrid">
                  <div className="tj-mapframe tj-rev">
                    <span className="tj-mapbadge">Google マップ連携</span>
                    <iframe
                      title="旅程ルートマップ"
                      src={routeSrc}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="tj-maplist tj-rev">
                    <div className="lab">立ち寄り順</div>
                    {stops.map((s) => (
                      <div key={s.idx} className="tj-mlrow">
                        <span className="num">{s.idx + 1}</span>
                        <span className="nm">{s.name}</span>
                        <span className="tm">{s.time}</span>
                        {s.spot && hasCoords(s.spot.lat, s.spot.lng) ? (
                          <a
                            className="pin"
                            href={buildSpotGoogleMapsUrl({
                              placeId: s.spot.googlePlaceId ?? null,
                              lat: s.spot.lat,
                              lng: s.spot.lng,
                              fallbackQuery: `${s.name} ${areaLabel}`,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${s.name} を地図で見る`}
                            title="地図で見る"
                          >
                            <PinIcon />
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="tj-maphead tj-rev" style={{ marginTop: 18 }}>
                  <div className="tj-heroact" style={{ marginTop: 0 }}>
                    <BulkSpotFavoriteButton
                      spotIds={spots.map((s) => s.id)}
                      folders={folders}
                      viewerLoggedIn={viewerLoggedIn}
                      bookmarkedSpotIds={bookmarkedSpotIds}
                    />
                    {directionsUrl ? (
                      <a
                        className="tj-maplink"
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <PinIcon />
                        Google マップでルートを開く
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* ===== 旅程タイムライン（解放時のみ）===== */}
          <section className="tj-tl">
            <div className="tj-wrap">
              <div className="tj-tlhead tj-rev">
                <span className="tj-kicker dk">— The itinerary</span>
                <h2>1日のながれ</h2>
                <p>全{stops.length}スポット</p>
              </div>

              <div className="tj-line">
                {stops.map((s) => (
                  <div key={s.idx}>
                    <div className="tj-stop tj-rev">
                      <div className="tj-node">
                        <span className="n">{String(s.idx + 1).padStart(2, '0')}</span>
                        {s.time ? <span className="t">{s.time}</span> : null}
                      </div>
                      <div className="tj-card">
                        {s.photo ? (
                          <div className="tj-cphoto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={s.photo} alt="" loading="lazy" />
                            {s.cat ? <span className="tj-ctag">{s.cat}</span> : null}
                            {s.time ? (
                              <span className="tj-ctime">
                                <span className="dot" />
                                {s.time}
                                {s.end ? ` – ${s.end}` : ''}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="tj-cbody">
                          <div className="tj-chead">
                            <h3>{s.name}</h3>
                            {s.spot && hasCoords(s.spot.lat, s.spot.lng) ? (
                              <a
                                className="tj-maplink"
                                href={buildSpotGoogleMapsUrl({
                                  placeId: s.spot.googlePlaceId ?? null,
                                  lat: s.spot.lat,
                                  lng: s.spot.lng,
                                  fallbackQuery: `${s.name} ${areaLabel}`,
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <PinIcon />
                                地図で見る
                              </a>
                            ) : null}
                          </div>
                          {s.address ? (
                            <div className="tj-cplace">
                              <PinIcon />
                              {s.address}
                            </div>
                          ) : null}
                          {/* block notes（旅程の本文） */}
                          {s.bodyHtml ? (
                            <div
                              className="tj-ctxt"
                              dangerouslySetInnerHTML={{ __html: s.bodyHtml }}
                            />
                          ) : null}
                          {/* spot.description（場所そのものの紹介・Phase C-2） */}
                          {s.description ? (
                            <div className="tj-ctxt">
                              <p style={{ whiteSpace: 'pre-line' }}>
                                {s.description}
                              </p>
                            </div>
                          ) : null}
                          {/* spot.tip（ライム破線「コツ」・Phase C-2） */}
                          {s.tip ? (
                            <div className="tj-cextras" style={{ display: 'block' }}>
                              <SpotTipBox tip={s.tip} />
                            </div>
                          ) : null}
                          <div className="tj-cextras">
                            {s.cost ? (
                              <span className="tj-cost">
                                <CostIcon />
                                {s.cost}
                              </span>
                            ) : null}
                            {s.spot ? (
                              <SpotFavoriteButton
                                spotId={s.spot.id}
                                spotName={s.spot.name}
                                bookmarked={bookmarkedSpotIds?.has(s.spot.id) ?? false}
                                folders={folders}
                                viewerLoggedIn={viewerLoggedIn}
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    {s.transfer ? (
                      <div className="tj-conn tj-rev">
                        <span className="pill">
                          <span className="lbl">Next</span>
                          <ModeIcon mode={s.transfer.mode} />
                          {MODE_LABEL[s.transfer.mode] ?? '移動'}
                          {s.transfer.minutes ? ` ${s.transfer.minutes}分` : ''}
                          {s.transfer.note ? ` · ${s.transfer.note}` : ''}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== 有料パート本文（body_paid・解放時のみ）===== */}
          {paidHtml ? (
            <section className="tj-lead" style={{ paddingTop: 8 }}>
              <div className="tj-wrap">
                <div
                  aria-hidden
                  style={{
                    textAlign: 'center',
                    letterSpacing: '.6em',
                    color: 'var(--bd2)',
                    margin: '8px 0 28px',
                  }}
                >
                  ◆ ◆ ◆
                </div>
                {previewMode ? (
                  <div style={{ textAlign: 'center', marginBottom: 18 }}>
                    <span className="tj-kicker dk">有料パート（プレビュー解除中）</span>
                  </div>
                ) : null}
                <div
                  className="tj-ctxt"
                  style={{ fontSize: 16 }}
                  dangerouslySetInnerHTML={{ __html: paidHtml }}
                />
              </div>
            </section>
          ) : null}

          {/* ===== スポット地図（解放時のみ）===== */}
          <section className="tj-mapsec" style={{ paddingTop: 8 }}>
            <div className="tj-wide">
              <div id="article-spots-map" className="scroll-mt-20 tj-rev">
                <ArticleSpotsMap
                  spots={spots}
                  articleType={article.articleType}
                  itineraryBlocks={article.itineraryBlocks ?? null}
                  photoEntries={article.photoEntries ?? null}
                  unlocked={unlocked}
                  fallbackPhotoUrl={article.coverImageUrl ?? null}
                />
              </div>
            </div>
          </section>

          {/* ===== レビュー投稿（購入読者のみ。preview / owner では出さない）===== */}
          {!previewMode && !isOwner ? (
            <section className="tj-body" style={{ padding: '8px 0 0' }}>
              <div className="tj-bodywrap">
                <ReviewFormToggle articleId={article.id} initial={myReview} />
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* ===== 著者カード ＋ サービス ＝ engagement の AuthorCard ===== */}
      <section className="tj-authsec">
        <div className="tj-wide">
          <AuthorCard writer={writer} authorServices={authorServices} />
        </div>
      </section>

      {/* ===== レビュー一覧 ===== */}
      <section className="tj-body" style={{ padding: '0 0 8px' }}>
        <div className="tj-bodywrap">
          <ReviewsList reviews={reviews} />
        </div>
      </section>

      {/* ===== 関連記事 ===== */}
      <RelatedArticles related={related} />

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
