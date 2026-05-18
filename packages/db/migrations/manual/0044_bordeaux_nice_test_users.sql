-- 0044_bordeaux_nice_test_users.sql
--
-- マルチシティ展開の UAT 用テストデータ。
-- パリ前提でない実データを投入し、「ボルドー住人がサイトを見たときの違和感」を
-- 炙り出す目的のサンプル。
--
-- 構成:
--   - 2 人のテストユーザー（ボルドー在住 / ニース在住）
--   - writer_profiles（A はパリ住人 1 つ星確認済み、B は未確認）
--   - 記事 ×2（spot_guide / itinerary、いずれもボルドーに関する内容）
--   - コミュニティ投稿 ×1（group、ボルドーのワイン会）
--   - user_services ×1（A 出品のサンテミリオン日本語ガイド）
--   - auth.users 同期（共通パスワード TestPass!2026 でログイン可）
--
-- 全行が is_sample=true で識別され、
--   DELETE FROM articles        WHERE is_sample = true;
--   DELETE FROM community_posts WHERE is_sample = true;
--   DELETE FROM writer_profiles WHERE is_sample = true;
--   DELETE FROM user_services
--     WHERE user_id IN (
--       '22222222-2222-2222-2222-222222222201',
--       '22222222-2222-2222-2222-222222222202'
--     );
--   DELETE FROM users WHERE is_sample = true;
-- で一括クリーンアップ可能。
-- (user_services テーブルには is_sample 列がないため user_id で消す)

BEGIN;

-- =========================================================================
-- 0. テストユーザー 2 人（決定 UUID で再実行に強い）
-- =========================================================================

INSERT INTO users (
  id, email, display_name, avatar_url, bio, role,
  home_country, home_region, residency_country, residency_city,
  arrival_year, family_stage, occupation,
  languages, interests, looking_for, open_to_meetups,
  is_sample
)
VALUES
  -- ────────────────────────────────────────────────────────────
  -- ① 大谷 ひろみ @ ボルドー 6 年目、ワイン輸入業 / ソムリエ、夫婦
  -- ────────────────────────────────────────────────────────────
  (
    '22222222-2222-2222-2222-222222222201',
    'hiromi.sample@locore.test',
    '大谷 ひろみ',
    'https://i.pravatar.cc/300?img=44',
    E'ボルドー Chartrons 地区在住 6 年目。日本にフランスワインを輸入する仕事をしています。週末は自転車で河岸 Garonne を走るか、市場 (Marché des Capucins) で買い出し。日本酒もボルドーで広めたいので、輸入仲間募集中です。',
    'resident_writer',
    'JP', '神奈川県',
    'FR', 'ボルドー',
    2020, 'couple', 'ワイン輸入業 / ソムリエ',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"business"},
      {"code":"en","level":"conversation"}
    ]'::jsonb,
    '["ワイン","料理","マルシェ・市場","自転車","写真"]'::jsonb,
    '["日本酒輸入仲間","ワイン会","サイクリング仲間"]'::jsonb,
    true,
    true
  ),
  -- ────────────────────────────────────────────────────────────
  -- ② 木村 拓実 @ ニース 4 年目、リモート IT エンジニア、独身
  -- ────────────────────────────────────────────────────────────
  (
    '22222222-2222-2222-2222-222222222202',
    'takumi.sample@locore.test',
    '木村 拓実',
    'https://i.pravatar.cc/300?img=15',
    E'コートダジュール (ニース) 在住、リモートで日本のスタートアップに勤務。夏はヨットで海、冬は背後の Mercantour で山。月 1 で他都市にワーケーション行くのが趣味で、TGV 5 時間圏内なら大体踏破済み。',
    'resident_writer',
    'JP', '京都府',
    'FR', 'ニース',
    2022, 'single', 'リモート IT エンジニア',
    '[
      {"code":"ja","level":"native"},
      {"code":"en","level":"business"},
      {"code":"fr","level":"basic"},
      {"code":"it","level":"basic"}
    ]'::jsonb,
    '["テック","ヨット","登山","写真","旅行"]'::jsonb,
    '["ワーケーション仲間","テック勉強会","海好き"]'::jsonb,
    true,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  avatar_url        = EXCLUDED.avatar_url,
  bio               = EXCLUDED.bio,
  home_country      = EXCLUDED.home_country,
  home_region       = EXCLUDED.home_region,
  residency_country = EXCLUDED.residency_country,
  residency_city    = EXCLUDED.residency_city,
  arrival_year      = EXCLUDED.arrival_year,
  family_stage      = EXCLUDED.family_stage,
  occupation        = EXCLUDED.occupation,
  languages         = EXCLUDED.languages,
  interests         = EXCLUDED.interests,
  looking_for       = EXCLUDED.looking_for,
  open_to_meetups   = EXCLUDED.open_to_meetups,
  updated_at        = now();


-- =========================================================================
-- 1. writer_profiles
--    A: tier A、residency_verified_at = 60 日前
--    B: tier B、residency_verified_at = NULL（未確認）
-- =========================================================================

INSERT INTO writer_profiles (
  user_id, tier, residency_status, residency_country, residency_years,
  residency_verified_at, commission_rate_pct,
  founding_member, founding_joined_at, founding_status,
  bio, is_sample
)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    'A', 'current_resident', 'FR', 6,
    now() - interval '60 days', 15,
    false, NULL, NULL,
    'ボルドー在住 6 年、ワイン輸入とソムリエ業。地元視点のカフェ・カーヴ案内が得意。',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    'B', 'current_resident', 'FR', 4,
    NULL, 25,
    false, NULL, NULL,
    'ニース在住 4 年、リモート IT エンジニア。コートダジュール拠点に各都市をワーケーション。',
    true
  )
ON CONFLICT (user_id) DO UPDATE SET
  tier                  = EXCLUDED.tier,
  residency_status      = EXCLUDED.residency_status,
  residency_country     = EXCLUDED.residency_country,
  residency_years       = EXCLUDED.residency_years,
  residency_verified_at = EXCLUDED.residency_verified_at,
  commission_rate_pct   = EXCLUDED.commission_rate_pct,
  founding_member       = EXCLUDED.founding_member,
  founding_status       = EXCLUDED.founding_status,
  bio                   = EXCLUDED.bio,
  updated_at            = now();


-- =========================================================================
-- 2. 記事 ×2（いずれも city_id = bordeaux）
-- =========================================================================

-- ─── ① ひろみさんの spot_guide「日本人が普通に通うカフェとカーヴ 5 軒」───
INSERT INTO articles (
  id, writer_id, city_id,
  title, body, body_paid,
  body_style, article_type,
  cover_image_url, price_jpy,
  status, published_at,
  duration_type, tags,
  itinerary_blocks, photo_entries,
  is_sample
)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222201',
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'ボルドーで日本人が普通に通うカフェとカーヴ 5 軒',
  E'## 想定読者\n\nボルドーに来たばかりの駐在員・留学生・移住者で、観光ガイドに載ってる店ではなく「在住の日本人が日常的に通う店」を知りたい人向けです。\n\nボルドーは Chartrons 地区（北のワイン商街）と Saint-Pierre 地区（旧市街）の 2 つを軸に歩くと外しません。市内は車不要、トラム + 自転車で十分回れます。\n\nこの記事では、私が 6 年間住んで「結局この 5 軒に戻ってくる」店を、なぜそこを選ぶかの理由込みで書きます。',
  E'## 5 軒の詳細\n\n### 1. Café Piha（Chartrons 地区、Rue Notre-Dame）\nオーストラリア人夫妻のスペシャルティコーヒー店。Chartrons 地区のワイン商街の中、午前中の打ち合わせに使われがち。Flat white €4.20、自家製バナナブレッド €3.80。**朝 9 時前なら席が選べる**。\n\n### 2. L''Alchimiste（Saint-Pierre 地区、Rue de la Devise）\n旧市街の石畳の路地裏。フレンチプレスでスペシャルティコーヒーを出す、地元の人がノートパソコンを開いてる系の店。Wi-Fi 速い、コンセント多い。長居用。\n\n### 3. Cave La Conserverie（Saint-Michel 地区、Rue Camille Sauvageau）\n地下のカーヴ。Bordeaux 以外（Languedoc, Loire, Jura）の自然派ワインに強い。**€15 以下のテーブルワインの当たり率が高い**ことで日本人の間で有名。オーナーの Vincent が日本酒に興味あって、毎回 30 分は話し込む。\n\n### 4. Marché des Capucins（土曜午前）\n市場本体。9 時着で **Chez Jean-Mi** のオイスター 12 個 €14 + 白ワイングラス €4 を立ち飲みで。これがボルドー人の土曜の朝の正解。8 時前に行くと隣の魚屋のセリも見られる。\n\n### 5. Garonne 河岸 Quai des Chartrons（夕方）\n店ではないですが、夕方 18 時以降に河岸を自転車で流すのが私の日常。Miroir d''Eau（水鏡）で観光客に混じって少し座って帰る。これがボルドー在住の特権だと思う。\n\n## おまけ：日本酒の在庫がある店\n\n- **Maison du Saké Bordeaux**（最近できた、Chartrons 北端）: 30 種類くらい\n- **Cave La Conserverie**: 私が頼んで 5 本だけ置いてもらってる（獺祭 / 醸し人九平次）\n\nどちらも価格は東京の 1.8〜2 倍。試飲用には十分です。',
  'photo_journal',
  'spot_guide'::article_type,
  'https://picsum.photos/seed/locore-bdx-cafe/1280/800',
  980,
  'published'::article_status,
  now() - interval '14 days',
  'few_hours'::article_duration,
  ARRAY['ボルドー','カフェ','カーヴ','ワイン','住人'],
  '[]'::jsonb,
  '[
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-cafe-1/960/1200","caption":"Saint-Pierre 地区、L''Alchimiste の店先。石畳の路地が朝の光で気持ちいい。","locationName":"L''Alchimiste","position":0},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-cafe-2/960/1200","caption":"Chartrons 地区 Rue Notre-Dame。Café Piha の窓側。9 時前なら席を選べる。","locationName":"Café Piha","position":1},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-cafe-3/960/1200","caption":"Quai des Chartrons の夕暮れ。自転車でここを流すのが私の日常。","locationName":"Quai des Chartrons","position":2},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-cafe-4/960/1200","caption":"Marché des Capucins の土曜午前。Chez Jean-Mi のオイスター 12 個 + 白で €18。","locationName":"Marché des Capucins","position":3},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-cafe-5/960/1200","caption":"Cave La Conserverie の地下カーヴ。€15 以下の当たり率が異常に高い棚。","locationName":"Cave La Conserverie","position":4}
  ]'::jsonb,
  true
);

-- ─── ② 拓実さんの itinerary「ニースからボルドー、週末 2 日でワイン産地」───
INSERT INTO articles (
  id, writer_id, city_id,
  title, body, body_paid,
  body_style, article_type,
  cover_image_url, price_jpy,
  status, published_at,
  duration_type, tags,
  itinerary_blocks, photo_entries,
  is_sample
)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  '22222222-2222-2222-2222-222222222202',
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'ニースからボルドー、週末 2 日で巡るワイン産地 — TGV と現地レンタル自転車で',
  E'## 想定読者\n\n南仏（ニース・マルセイユ・モンペリエ）拠点で、週末を使ってボルドー / Saint-Émilion のワイン産地を回ってみたい人向け。私はニース在住で、TGV で 5 時間かけてボルドーに行きました。\n\n航空便だと CDG 経由になって時間がかかるので、結局 TGV 直通（Nice Ville → Bordeaux Saint-Jean）が一番賢いです。土曜朝 6:45 発、ボルドー 11:50 着。日曜夜の最終で帰る、というスケジュールを実例で書きます。\n\n予算: 2 日で €350 前後（TGV €120 + 宿 €110 + 食 + シャトー 2 件）。',
  E'## 詳細プランと費用\n\n### 土曜 6:45 — Nice Ville 駅、TGV inOui 出発\n二等席を 3 ヶ月前に取れば €60〜€75。1 等 €120。Wi-Fi はあるけど期待しない方がいい。食堂車のサンドイッチ €6.50 とコーヒーで朝食代わり。Toulouse Matabiau で停車、そこからボルドーまで 2 時間。\n\n### 11:50 — Bordeaux Saint-Jean 着、トラム C で旧市街へ\n駅から旧市街までトラム C で 10 分。**Quinconces** で降りて、宿（後述）にチェックイン。私は Hôtel des Quinconces €110/泊（朝食別）。\n\n### 13:00 — Marché des Capucins でランチ\nボルドー来たら土曜午前の市場が正解。ただ私は午後着なので、隣接の **Chez Dupont** で旧市街の定番、entrecôte à la bordelaise €22 + Bordeaux Supérieur グラス €5。\n\n### 15:00 — Saint-Pierre 地区を散策\n旧市街、石畳。Place de la Bourse の **Miroir d''Eau** で写真。観光客多いけど一回は外せない。Cathédrale Saint-André、Grosse Cloche を経由して 2 時間。\n\n### 19:30 — 河岸の Brasserie で夕食\nQuai de Paludate 沿いの **Brasserie Bordelaise**。シーフードプラッター €38（オイスター + クルベット + 蟹）+ Pessac-Léognan 白ボトル €42。1 人だとちょっと贅沢、2 人なら適正。\n\n### 日曜 8:30 — レンタル自転車で Saint-Émilion へ\nボルドー駅で **Pierre Qui Roule** という業者の電動アシスト自転車を €35/日でレンタル。Saint-Émilion まで片道 40km、約 2 時間半。R3 サイクリングルート使えば車道ほぼ通らない。\n\n### 11:30 — Saint-Émilion 着、Château Soutard 訪問予約\n事前予約必須。**Château Soutard**（Grand Cru Classé）の 90 分ツアー €25。日本語パンフあり、英語ガイド OK。試飲 4 種。\n\n### 13:30 — Saint-Émilion 旧市街でランチ\n**L''Envers du Décor** で 2 皿コース €32。地元名物の lamproie à la bordelaise（ヤツメウナギ）に挑戦。Saint-Émilion グラスワインも一緒に。\n\n### 15:30 — 2 件目シャトー、Château Coutet（オーガニック）\n小規模、家族経営。ツアー €15 で 60 分、試飲 3 種。Soutard と対比で印象に残る。\n\n### 17:00 — 自転車でボルドー駅へ戻る\n下り基調なので帰りは 2 時間。汗かくので替え T シャツ必須。\n\n### 19:45 — TGV で Nice へ\n最終便、Nice 着が翌 0:50。Bordeaux Saint-Jean のホームで Magasin Général のサンドイッチ €7 を買って車内で。\n\n## 注意事項\n\n- **TGV はワインボトル 6 本まで持ち込み可**（公式には液体制限なし）。シャトー直販を 2 本買って帰るのは余裕\n- 自転車レンタルは事前予約推奨、特に 5〜9 月\n- Saint-Émilion のシャトー訪問は**必ず事前予約**、当日飛び込みはほぼ無理',
  'classic',
  'itinerary'::article_type,
  'https://picsum.photos/seed/locore-bdx-itin/1280/800',
  1500,
  'published'::article_status,
  now() - interval '7 days',
  'full_day'::article_duration,
  ARRAY['ボルドー','Saint-Émilion','ワイン産地','週末','TGV'],
  '[
    {
      "id":"tmp-b1","startTime":"06:45","endTime":"11:50",
      "freeName":"TGV inOui Nice Ville → Bordeaux Saint-Jean",
      "notes":"二等席 €60〜€75（3 ヶ月前予約）。Toulouse 経由 5 時間",
      "transportToNext":"tram","transportNote":"トラム C で Quinconces まで 10 分","travelMinutesAfter":20
    },
    {
      "id":"tmp-b2","startTime":"12:15","endTime":"12:45",
      "freeName":"Hôtel des Quinconces チェックイン",
      "notes":"€110/泊、朝食別。荷物だけ預ける形でも可",
      "transportToNext":"walk","travelMinutesAfter":15
    },
    {
      "id":"tmp-b3","startTime":"13:00","endTime":"14:30",
      "freeName":"Chez Dupont（Marché des Capucins 隣）でランチ",
      "notes":"entrecôte à la bordelaise €22 + Bordeaux Supérieur グラス €5",
      "transportToNext":"walk","travelMinutesAfter":10
    },
    {
      "id":"tmp-b4","startTime":"15:00","endTime":"18:30",
      "freeName":"Saint-Pierre 地区散策 + Miroir d''Eau",
      "notes":"Place de la Bourse → Cathédrale Saint-André → Grosse Cloche",
      "transportToNext":"walk","travelMinutesAfter":15
    },
    {
      "id":"tmp-b5","startTime":"19:30","endTime":"21:30",
      "freeName":"Brasserie Bordelaise で夕食",
      "notes":"シーフードプラッター €38 + Pessac-Léognan 白ボトル €42"
    },
    {
      "id":"tmp-b6","startTime":"08:30","endTime":"11:00",
      "freeName":"レンタル自転車で Saint-Émilion へ（R3 ルート）",
      "notes":"電動アシスト €35/日。片道 40km、2 時間半",
      "transportToNext":"bike","travelMinutesAfter":150
    },
    {
      "id":"tmp-b7","startTime":"11:30","endTime":"13:00",
      "freeName":"Château Soutard ツアー（要予約）",
      "notes":"€25、90 分、試飲 4 種。Grand Cru Classé",
      "transportToNext":"walk","travelMinutesAfter":10
    },
    {
      "id":"tmp-b8","startTime":"13:30","endTime":"15:00",
      "freeName":"L''Envers du Décor でランチ",
      "notes":"2 皿コース €32。lamproie à la bordelaise に挑戦"
    },
    {
      "id":"tmp-b9","startTime":"15:30","endTime":"16:30",
      "freeName":"Château Coutet（オーガニック、家族経営）",
      "notes":"€15、60 分。Soutard との対比が面白い",
      "transportToNext":"bike","transportNote":"R3 ルート下り基調、2 時間","travelMinutesAfter":120
    },
    {
      "id":"tmp-b10","startTime":"19:45","endTime":"00:50",
      "freeName":"TGV inOui Bordeaux → Nice（最終便）",
      "notes":"Magasin Général のサンドイッチ €7 を駅で買って車内で"
    }
  ]'::jsonb,
  '[
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-itin-1/960/1200","caption":"Nice Ville 駅、土曜 6:45 発の TGV inOui。コートダジュールの朝はまだ薄暗い。","locationName":"Nice Ville","position":0},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-itin-2/960/1200","caption":"Place de la Bourse の Miroir d''Eau。観光客多いけど一回は外せない。","locationName":"Place de la Bourse","position":1},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-itin-3/960/1200","caption":"R3 ルート、Saint-Émilion 直前のブドウ畑。電動アシストなので余裕。","locationName":"Route R3","position":2},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-itin-4/960/1200","caption":"Château Soutard の試飲セット。4 種類を 90 分かけて解説してくれる。","locationName":"Château Soutard","position":3},
    {"imageUrl":"https://picsum.photos/seed/locore-bdx-itin-5/960/1200","caption":"Saint-Émilion 旧市街、L''Envers du Décor のランチ。lamproie はクセが強いが旨い。","locationName":"L''Envers du Décor","position":4}
  ]'::jsonb,
  true
);


-- =========================================================================
-- 3. コミュニティ投稿 ×1（group / ボルドー）
-- =========================================================================

INSERT INTO community_posts (
  id, kind, author_id, title, body,
  city_id, location_text,
  price_amount, price_currency, price_unit,
  photos, metadata, status, contact_method,
  expires_at, is_sample
)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'group', '22222222-2222-2222-2222-222222222201',
  'ボルドー在住日本人ワイン会、毎月第二土曜 (4-8 人規模)',
  E'ボルドー在住の日本人で集まる、ゆるいワイン会を毎月第二土曜にやっています。現在のメンバーは 6 人、駐在員 / 留学生 / 移住者ミックスです。\n\n- 頻度: 毎月第二土曜、19:30〜23:00 頃\n- 場所: Chartrons 地区の私の自宅（広めのリビング、最大 8 人）\n- 持ち寄り: 各自 1 本（€10〜€20 目安、テーマあり / なしは月による）\n- 料理: 持ち寄り（チーズ・サラミ・パン・簡単な煮込みなど）\n- 言語: 日本語メイン、フランス人パートナー同伴 OK\n- 費用: 完全に無料、ワインと料理は持ち寄りでバランス取れてます\n\n**初回見学 OK**（ワインなしで来てもらって大丈夫）。次回は 6/14 (土)、テーマは「Saint-Émilion 縛り」です。気になる方は Locore メッセージで連絡ください。',
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'ボルドー Chartrons 地区',
  NULL, NULL, NULL,
  '[]'::jsonb,
  '{"category":"hobby","meeting_frequency":"monthly","skill_level":"any","group_size":8,"age_range":"30代〜50代"}'::jsonb,
  'active'::community_post_status,
  'locore_message',
  now() + interval '90 days',
  true
)
ON CONFLICT (id) DO UPDATE SET
  title         = EXCLUDED.title,
  body          = EXCLUDED.body,
  city_id       = EXCLUDED.city_id,
  location_text = EXCLUDED.location_text,
  metadata      = EXCLUDED.metadata,
  status        = EXCLUDED.status,
  expires_at    = EXCLUDED.expires_at,
  updated_at    = now();


-- =========================================================================
-- 4. user_services ×1（A 出品のサンテミリオン日本語ガイド）
--    NOTE: user_services テーブルには is_sample 列がないため付けない。
--          contact_method は 'chat' / 'external_url' の 2 値のみ。
--          (community_posts の 'locore_message' とは別系統)
-- =========================================================================

INSERT INTO user_services (
  id, user_id, title, description,
  category, price_jpy, price_unit,
  contact_method, external_url,
  is_active, position
)
VALUES (
  'dddddddd-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222201',
  'ボルドー・サンテミリオン 1 日プライベートワインツアー (日本語ガイド)',
  E'ボルドー在住 6 年、フランスソムリエ資格 (Sommelier-Conseil) 保有の私が、サンテミリオン地区を 1 日まるごと日本語でご案内します。\n\n- 内容: 朝 9 時 ボルドー市内ホテル迎え → サンテミリオン 3 シャトー訪問 (Grand Cru Classé × 1、家族経営オーガニック × 2) → 旧市街レストランでランチ → 17 時頃ホテル帰着\n- 試飲: 計 10〜12 種類、解説込み\n- ランチ: Saint-Émilion 旧市街の馴染みの店、コース代込み (ワインペアリング込みは別料金 +€40/人)\n- 車: 4 人乗りメルセデス送迎 (ドライバーは別途手配済み、ノンアル)\n- 言語: 日本語ネイティブ、フランス語シャトー側通訳含む\n- 定員: 最大 4 名、家族 / 友人グループ単位での貸切\n- 料金: €170/人 (4 名時) 〜 €260/人 (2 名時)、ランチ + 試飲 + 車 + ガイド込み\n- 含まれないもの: ワインボトル購入代金、ボルドー市内ホテル代\n\nハネムーン・記念日・出張前後の駐在員ご家族のご利用が多いです。お子様連れも対応可 (要相談)。',
  'tourism',
  25000,
  'per_day',
  'chat',
  NULL,
  true,
  0
)
ON CONFLICT (id) DO UPDATE SET
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  category       = EXCLUDED.category,
  price_jpy      = EXCLUDED.price_jpy,
  price_unit     = EXCLUDED.price_unit,
  contact_method = EXCLUDED.contact_method,
  is_active      = EXCLUDED.is_active,
  position       = EXCLUDED.position,
  updated_at     = now();


-- =========================================================================
-- 5. auth.users への同期（共通パスワード TestPass!2026 でログイン可）
--    0039 と同じロジックを、今回追加した 2 ユーザーにだけ適用
-- =========================================================================

DO $$
DECLARE
  u             RECORD;
  default_pw    TEXT := 'TestPass!2026';
  pw_hash       TEXT;
BEGIN
  FOR u IN
    SELECT id, email FROM public.users
    WHERE id IN (
      '22222222-2222-2222-2222-222222222201',
      '22222222-2222-2222-2222-222222222202'
    )
  LOOP
    pw_hash := extensions.crypt(default_pw, extensions.gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      u.id, 'authenticated', 'authenticated', u.email, pw_hash,
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      '{}'::jsonb, now(), now()
    )
    ON CONFLICT (id) DO UPDATE
      SET email_confirmed_at = now(),
          encrypted_password = EXCLUDED.encrypted_password,
          updated_at = now();

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities i
      WHERE i.user_id = u.id AND i.provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        u.id::text, u.id,
        jsonb_build_object(
          'sub', u.id::text,
          'email', u.email,
          'email_verified', true
        ),
        'email', now(), now(), now()
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;


-- =========================================================================
-- 動作確認用 SELECT（必要に応じて手動実行）
-- =========================================================================
--
-- SELECT id, display_name, residency_city
--   FROM users
--   WHERE id IN (
--     '22222222-2222-2222-2222-222222222201',
--     '22222222-2222-2222-2222-222222222202'
--   );
--
-- SELECT id, title, article_type, writer_id
--   FROM articles
--   WHERE is_sample = true
--     AND city_id = (SELECT id FROM cities WHERE slug = 'bordeaux');
--
-- SELECT id, title, kind, status
--   FROM community_posts
--   WHERE is_sample = true
--     AND city_id = (SELECT id FROM cities WHERE slug = 'bordeaux');
--
-- SELECT id, title, price_jpy, price_unit, is_active
--   FROM user_services
--   WHERE user_id = '22222222-2222-2222-2222-222222222201';
--
-- SELECT user_id, tier, residency_country, residency_verified_at
--   FROM writer_profiles
--   WHERE user_id IN (
--     '22222222-2222-2222-2222-222222222201',
--     '22222222-2222-2222-2222-222222222202'
--   );
