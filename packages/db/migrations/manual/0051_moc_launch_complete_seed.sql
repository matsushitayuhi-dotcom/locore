-- 0051_moc_launch_complete_seed.sql
--
-- MOC (proof of concept) 公開向けの「中身が詰まったサンプルセット」
-- 5 ユーザー (パリ 3 / リヨン 1 / ボルドー 1) を作成し、
-- 10 記事 (spot_guide 4 / itinerary 3 / expat_info 2 / photo_journal 1)、
-- 20 コミュニティ投稿 (6 kind を ~3〜4 件) を投入する。
--
-- 全レコード is_sample = true。冒頭で is_sample 既存データを削除して
-- 再実行できる構造になっている。
--
-- writer_profiles / auth.users / user パスワード (TestPass!2026) も同期する。
--
-- 写真は 0048_sample_data_photo_overhaul.sql で使用済みの Unsplash photo ID を
-- そのまま流用 (リンク切れ耐性のため)。
--
-- 確認済 enum:
--   spot_category: food / sight / shopping / lodging / other
--   article_type:  spot_guide / itinerary / expat_info / photo_journal
--   article_duration: half_day / full_day / few_hours / other
--   community_post_kind: job / apartment / marketplace / group / lesson / mutual_aid
--   community_post_status: active / closed / expired
--   writer_tier: S / A / B

BEGIN;

-- =========================================================================
-- 0. 既存サンプル (is_sample=true) を全削除
--    依存順: 子テーブル → 親テーブル
-- =========================================================================

DELETE FROM reviews
  WHERE purchase_id IN (
    SELECT id FROM purchases
    WHERE article_id IN (SELECT id FROM articles WHERE is_sample = true)
  );

DELETE FROM purchases
  WHERE article_id IN (SELECT id FROM articles WHERE is_sample = true);

DELETE FROM article_likes
  WHERE article_id IN (SELECT id FROM articles WHERE is_sample = true);

DELETE FROM bookmarks
  WHERE article_id IN (SELECT id FROM articles WHERE is_sample = true);

DELETE FROM spot_favorites
  WHERE spot_id IN (SELECT id FROM spots WHERE is_sample = true);

DELETE FROM spots WHERE is_sample = true;
DELETE FROM articles WHERE is_sample = true;

DELETE FROM community_posts WHERE is_sample = true;

-- board_posts に is_sample 列がある場合のみ削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'board_posts' AND column_name = 'is_sample'
  ) THEN
    EXECUTE 'DELETE FROM board_posts WHERE is_sample = true';
  END IF;
END $$;

-- user_services は is_sample 列が無いので user_id ベースで削除
DELETE FROM user_services
  WHERE user_id IN (SELECT id FROM users WHERE is_sample = true);

DELETE FROM writer_profiles WHERE is_sample = true;

-- auth.users から先に is_sample ユーザーを削除 (CASCADE で identities も消える)
DELETE FROM auth.users
  WHERE id IN (SELECT id FROM users WHERE is_sample = true);

DELETE FROM users WHERE is_sample = true;


-- =========================================================================
-- 1. 5 ユーザー (固定 UUID, role=resident_writer, is_sample=true)
-- =========================================================================

INSERT INTO users (
  id, email, display_name, avatar_url, bio, role,
  home_country, home_region, residency_country, residency_city,
  arrival_year, family_stage, occupation,
  languages, interests, looking_for, open_to_meetups,
  is_sample
) VALUES
  -- ───────────────────────────────────────────────────────────────
  -- moc01: 高橋まりか @ パリ Le Marais 7 年目、ヴィンテージ古着バイヤー
  -- ───────────────────────────────────────────────────────────────
  (
    '33333333-3333-3333-3333-333333333301',
    'moc01.sample@locore.test',
    '高橋 まりか',
    'https://i.pravatar.cc/300?img=5',
    E'パリ Le Marais (3区) 在住 7 年目。日本のセレクトショップ向けにヴィンテージ古着の買い付け / スタイリングを生業にしています。Saint-Ouen の蚤の市は週 2 で通うルーティン。子連れで歩けるパリの「日常の場所」を発信したい。',
    'resident_writer',
    'JP', '東京都',
    'FR', 'パリ',
    2019, 'family_kids', 'ヴィンテージ古着バイヤー / スタイリスト',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"business"},
      {"code":"en","level":"business"}
    ]'::jsonb,
    '["古着","ファッション","蚤の市","カフェ","写真"]'::jsonb,
    '["子連れで行ける場所","バイイング仲間","ヴィンテージ情報交換"]'::jsonb,
    true, true
  ),
  -- ───────────────────────────────────────────────────────────────
  -- moc02: 中島けんじ @ パリ 11 区 Oberkampf 4 年目、ビストロシェフ修行中
  -- ───────────────────────────────────────────────────────────────
  (
    '33333333-3333-3333-3333-333333333302',
    'moc02.sample@locore.test',
    '中島 けんじ',
    'https://i.pravatar.cc/300?img=12',
    E'パリ 11 区 Oberkampf 在住 4 年目、ビストロ Le Servan 系列で修行中のシェフ。深夜のマルシェと月曜定休のナチュラルワイン酒場が日常の軸。福岡出身。料理人ネットワーク募集中。',
    'resident_writer',
    'JP', '福岡県',
    'FR', 'パリ',
    2022, 'single', 'ビストロ シェフ',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"conversation"},
      {"code":"en","level":"conversation"}
    ]'::jsonb,
    '["フランス料理","ナチュラルワイン","マルシェ","ジャズ","本"]'::jsonb,
    '["食材調達情報","ナチュラルワイン仲間","料理人ネットワーク"]'::jsonb,
    true, true
  ),
  -- ───────────────────────────────────────────────────────────────
  -- moc03: 山口あや @ パリ 7 区 École Militaire 12 年目、通訳 / 美術ガイド
  -- ───────────────────────────────────────────────────────────────
  (
    '33333333-3333-3333-3333-333333333303',
    'moc03.sample@locore.test',
    '山口 あや',
    'https://i.pravatar.cc/300?img=25',
    E'パリ 7 区 École Militaire 在住 12 年目。元駐妻、現在は通訳とフランス美術ガイドとして活動。夫と子ども 2 人 (公立小 + 中学)。子連れでルーブル / オルセー / ポンピドゥーを「疲れさせず」回るノウハウを共有したい。',
    'resident_writer',
    'JP', '神奈川県',
    'FR', 'パリ',
    2014, 'family_kids', '通訳 / 美術ガイド',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"native"},
      {"code":"en","level":"business"},
      {"code":"it","level":"conversation"}
    ]'::jsonb,
    '["美術館","オペラ","子育て","図書館","古書店"]'::jsonb,
    '["子供のフランス語サポート","美術観察会","共働き家庭の情報交換"]'::jsonb,
    true, true
  ),
  -- ───────────────────────────────────────────────────────────────
  -- moc04: 森田ゆうき @ リヨン Vieux Lyon 5 年目、自転車工房 / コーヒー焙煎
  -- ───────────────────────────────────────────────────────────────
  (
    '33333333-3333-3333-3333-333333333304',
    'moc04.sample@locore.test',
    '森田 ゆうき',
    'https://i.pravatar.cc/300?img=33',
    E'リヨン Vieux Lyon 在住 5 年目。Croix-Rousse の丘で小さな自転車工房 + コーヒー焙煎所を併設運営。週末はローヌ川沿いを走ってクライミング。京都から来てパリは経由せず、最初からリヨン。',
    'resident_writer',
    'JP', '京都府',
    'FR', 'リヨン',
    2021, 'single', '自転車工房オーナー / コーヒー焙煎家',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"business"},
      {"code":"en","level":"conversation"}
    ]'::jsonb,
    '["自転車","コーヒー","古道具","ローヌ川沿い","クライミング"]'::jsonb,
    '["焙煎仲間","自転車仲間","リヨン情報交換"]'::jsonb,
    true, true
  ),
  -- ───────────────────────────────────────────────────────────────
  -- moc05: 渡辺さとこ @ ボルドー Chartrons 3 年目、ワインアトリエ運営
  -- ───────────────────────────────────────────────────────────────
  (
    '33333333-3333-3333-3333-333333333305',
    'moc05.sample@locore.test',
    '渡辺 さとこ',
    'https://i.pravatar.cc/300?img=49',
    E'ボルドー Chartrons 地区在住 3 年目、夫婦。日本人観光客向けのワインテイスティングアトリエを運営しています。元は大阪のホテルソムリエ。シャトー巡りと Marché des Capucins の土曜朝が日常の軸。',
    'resident_writer',
    'JP', '大阪府',
    'FR', 'ボルドー',
    2023, 'couple', 'ワインアトリエ運営',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"business"},
      {"code":"en","level":"business"}
    ]'::jsonb,
    '["ワイン","シャトー巡り","マルシェ","サイクリング","ボルドー料理"]'::jsonb,
    '["日本人観光客リピーター","ワインメーカーとの繋がり","ソムリエ仲間"]'::jsonb,
    true, true
  );


-- =========================================================================
-- 2. writer_profiles (全員 is_sample=true)
-- =========================================================================

INSERT INTO writer_profiles (
  user_id, tier, residency_status, residency_country, residency_years,
  residency_verified_at, commission_rate_pct,
  lifetime_sales_count, lifetime_revenue_jpy,
  founding_member, founding_status,
  bio, is_sample
) VALUES
  ('33333333-3333-3333-3333-333333333301',
   'S', 'current_resident', 'FR', 7,
   now() - interval '120 days', 15,
   42, 56800,
   true, 'active',
   'マレ在住 7 年、古着バイヤー視点でパリの蚤の市・カフェ・子連れ情報を発信。',
   true),
  ('33333333-3333-3333-3333-333333333302',
   'A', 'current_resident', 'FR', 4,
   now() - interval '60 days', 20,
   18, 21200,
   false, NULL,
   '11 区在住 4 年のビストロ シェフ。ナチュラルワインと深夜のマルシェに強い。',
   true),
  ('33333333-3333-3333-3333-333333333303',
   'S', 'current_resident', 'FR', 12,
   now() - interval '180 days', 15,
   65, 92500,
   true, 'active',
   '7 区在住 12 年、通訳・美術ガイド。子連れ目線のパリ美術館攻略が定番。',
   true),
  ('33333333-3333-3333-3333-333333333304',
   'A', 'current_resident', 'FR', 5,
   now() - interval '90 days', 20,
   12, 15600,
   false, NULL,
   'リヨン在住 5 年、自転車工房とコーヒー焙煎を併設運営。',
   true),
  ('33333333-3333-3333-3333-333333333305',
   'A', 'current_resident', 'FR', 3,
   now() - interval '45 days', 20,
   9, 11800,
   false, NULL,
   'ボルドー在住 3 年、ワインアトリエ運営。シャトー巡りと地元視点のカーヴ案内。',
   true);


-- =========================================================================
-- 3. 記事 10 本
--
-- ID 規約:
--   article: a000000X-0000-0000-0000-000000000000
--   spot:    s000000X-000Y-0000-0000-000000000000 (X=記事番号, Y=位置)
-- =========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 記事 1: moc01 / パリ / spot_guide
--   「マレ地区の蚤の市曜日マップ — 古着バイヤーが回る順路」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, is_sample
) VALUES (
  'a0000001-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333301',
  (SELECT id FROM cities WHERE slug = 'paris'),
  'マレ地区の蚤の市曜日マップ — 古着バイヤーが回る順路',
  E'マレ (3区・4区) で「蚤の市」と聞くと観光客は週末の Marché des Enfants Rouges を思い浮かべるけれど、実はマレには曜日ごとに小さなブロカント・古着バザールが点々と立ちます。

私はパリ在住 7 年、日本のセレクトショップ向けにヴィンテージ古着を週 20 着前後仕入れていて、その動線が固まったのが直近 2 年。**曜日を間違えると 1 軒も入れずに 1 日を終える**ことがあるエリアです。

この記事は、月曜から日曜までの「マレ古着動線」を、開く時間・常連リスト・値札の見方付きでまとめたものです。観光ガイドではなく、バイヤーの仕事道具として書いています。',
  E'## 曜日別の動き方

### 火曜・木曜 — Carreau du Temple 周辺のブロカント
火曜と木曜の 10:00〜13:00、Carreau du Temple の北側 (Rue de Picardie) に 4〜5 店だけ古着スタンドが出ます。常連は近所のスタイリスト。**€10〜€30 のレンジで 60s〜70s のフレンチワークウェア**が出る確率高め。

### 水曜 — Rue de Bretagne の朝マルシェ + 古着 1 軒
水曜午前は Marché des Enfants Rouges 入口横に古着の常連 Marie が出ます。彼女は Saint-Ouen の Vernaison から商品を持ってきていて、**現地で買うより 30% 安い**ことが多い。彼女の名前は Locore メッセージで聞いてもらえれば教えます。

### 金曜夜 — Atelier Pop-Up (Rue Charlot)
月 2 回ほど、金曜 18:00〜22:00 に若手デザイナーが小さなポップアップを開きます。これは古着というよりリメイク。最近の私のヒット仕入れは €45 で買った 90s リーバイス × 日本の縮緬リメイクのトートでした。

### 土曜 — Place du Marché Sainte-Catherine (4区) の常設古着 3 軒
土曜午前が動き出すのは 11:00 以降。**早く着きすぎると待ち時間が長い**。ここは Vintage Désir、Free''P''Star、Episode の 3 軒を 3 時間で回す。値札は 2 重表示 (定価 × 50% タグ) のことが多くて、レジで再確認しないと €10 損する。

### 日曜 — Saint-Ouen (蚤の市) 直行が正解
マレ内では日曜の動きはない。日曜は朝 9 時の RATP B 線で Saint-Ouen に直行 → 13 時に戻る、というルートを別記事 (本誌「日曜の 6 時間で回る、Saint-Ouen 蚤の市の歩き方」) でまとめました。

## バイヤー視点のチェックリスト

- **ボタンと縫製で 60s 以前か後を見分ける**: 60s 以前は綿糸縫製、それ以降はポリエステル混
- **タグは「Made in France」「Tissé en France」を最優先**
- **試着スペースが無い店が多い**ので、自分のサイズを cm 単位で頭に入れる
- **現金 €100 札はおつりで嫌がられる**。€20 札を厚めに持つ

## 失敗談

買い付け 1 年目、火曜の Carreau du Temple に 14 時に着いて 1 軒も開いていなかった経験あり。**閉店は早い (13:00 が一般的)**、9:30 に入って 12:30 に抜ける、を 7 年やってます。',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80',
  1300,
  'published'::article_status,
  ARRAY['マレ','蚤の市','古着','バイヤー視点','3区']::text[],
  'half_day'::article_duration,
  'spot_guide'::article_type,
  'classic',
  '2026-03-15T09:00:00+02:00'::timestamptz,
  true
);

INSERT INTO spots (id, article_id, name, address, location, category, price_estimate, tags, position, google_photo_urls, is_sample) VALUES
  ('a1111111-0001-0000-0000-000000000000', 'a0000001-0000-0000-0000-000000000000',
   'Carreau du Temple', '4 Rue Eugène Spuller, 75003 Paris',
   'SRID=4326;POINT(2.3633 48.8634)'::geography, 'shopping'::spot_category,
   '€10〜€30', ARRAY['ブロカント','火木']::text[], 0,
   ARRAY['https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a1111111-0002-0000-0000-000000000000', 'a0000001-0000-0000-0000-000000000000',
   'Marché des Enfants Rouges', '39 Rue de Bretagne, 75003 Paris',
   'SRID=4326;POINT(2.3625 48.8631)'::geography, 'food'::spot_category,
   '€8〜€20', ARRAY['マルシェ','水曜']::text[], 1,
   ARRAY['https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a1111111-0003-0000-0000-000000000000', 'a0000001-0000-0000-0000-000000000000',
   'Vintage Désir', '32 Rue des Rosiers, 75004 Paris',
   'SRID=4326;POINT(2.3610 48.8569)'::geography, 'shopping'::spot_category,
   '€15〜€80', ARRAY['古着','土曜']::text[], 2,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a1111111-0004-0000-0000-000000000000', 'a0000001-0000-0000-0000-000000000000',
   'Free''P''Star', '8 Rue Sainte-Croix de la Bretonnerie, 75004 Paris',
   'SRID=4326;POINT(2.3551 48.8580)'::geography, 'shopping'::spot_category,
   '€10〜€50', ARRAY['古着','量り売り']::text[], 3,
   ARRAY['https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a1111111-0005-0000-0000-000000000000', 'a0000001-0000-0000-0000-000000000000',
   'Atelier Pop-Up Charlot', '22 Rue Charlot, 75003 Paris',
   'SRID=4326;POINT(2.3622 48.8612)'::geography, 'shopping'::spot_category,
   '€30〜€120', ARRAY['ポップアップ','金曜夜']::text[], 4,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 2: moc01 / パリ / itinerary
--   「日曜の 6 時間で回る、Saint-Ouen 蚤の市の歩き方」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, itinerary_blocks, is_sample
) VALUES (
  'a0000002-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333301',
  (SELECT id FROM cities WHERE slug = 'paris'),
  '日曜の 6 時間で回る、Saint-Ouen 蚤の市の歩き方',
  E'Marché aux Puces de Saint-Ouen (パリ最大の蚤の市、北端 Porte de Clignancourt 駅から徒歩 5 分) は、土・日・月曜のみ営業。観光客が多いのは日曜の昼下がりで、その時間に「いい商品はもう常連が買い終わっている」のがバイヤーの常識です。

私は週 2 で通う中で、**日曜は 9:30 着 → 15:30 帰宅で 6 時間**を 4 つのマルシェ (Vernaison / Dauphine / Paul Bert / Biron) に振り分けるルートを固定しています。

この記事ではそのルートを、休憩・ランチ込みでブロック化しました。価格交渉のタイミングと、現金 vs カードの使い分けも書いています。',
  E'## ルートの組み立て方

Saint-Ouen は 7 つの専門マルシェの集合体だけど、初心者が回り切るのは無理。**特化が必要**で、私は古着 × ヴィンテージ家具に絞っています。

### 9:30 — メトロ 4 号線 Porte de Clignancourt 着
入口の高速道路橋下に偽ブランドの露天が並んでて景色がきついけど、5 分歩けば抜けます。**最初の 10 分で財布をパンツの前ポケットに移す**こと。

### 10:00 — Marché Vernaison (古着 + 小物)
最古のマルシェ。狭い路地が迷路状で、店主は朝開けたばかりで気分がいい。**この時間が値札交渉のゴールデンタイム**。私は 60s ワンピースを €45 → €32 に下げた前例あり。

### 11:30 — Marché Dauphine (本 + コイン + 古着)
2 階建てのモール型。冷暖房完備で天候に左右されない。1 階奥の古着屋 "Studio Etoile" は日本人のリピーター多し。

### 12:30 — ランチ：Le Marché Paul Bert 内の Ma Cocotte
シェフ Philippe Starck デザインの観光的レストランだけど、**サンデーランチの formula €28 が早くて旨い**。1 人なら隣の Chez Louisette (シャンソンライブ付き) でも可。

### 14:00 — Marché Paul Bert (家具 + アンティーク)
最も「映え」る区画。インテリア雑誌の取材常連。家具は買わなくても見るだけで勉強になる。私は照明器具のディテールを写真撮るためにここに必ず来ます。

### 15:00 — Marché Biron (ハイエンド・宝飾)
高価格帯。冷やかし NG の空気はあるけど、ガラス越しに見るだけで価値あり。

### 15:30 — 帰路
Porte de Clignancourt から 4 号線で南下、Châtelet 経由で帰宅。土産は紙袋 1 個分が限度 (メトロでは大荷物厳禁)。

## 価格交渉の言い方 (3 パターン)

1. **"Vous faites un prix ?"** — 一番無難。€80 → €70 くらいの 10〜15% 下げを引き出す
2. **"Je le prends si c''est €60"** — €80 を €60 と言ってみる。半数は応じる
3. **無言で札を見せる** — 上級者向け。€50 札だけ財布から出すと「OK」と言われる確率 30%

## 注意

- **月曜は店主が休んでいて閉店多い**、日曜が最も賑わう
- **2 月・8 月のバカンス期間は半分閉店**
- **大型家具を買ったら宅配サービス**を入口の Maison du Transport で頼める (€80〜)',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80',
  1500,
  'published'::article_status,
  ARRAY['Saint-Ouen','蚤の市','日曜','古着','バイヤー視点']::text[],
  'half_day'::article_duration,
  'itinerary'::article_type,
  'classic',
  '2026-03-22T08:00:00+02:00'::timestamptz,
  $$[
    {"id":"blk-2-1","startTime":"09:30","endTime":"09:55","spotId":"a2222222-0001-0000-0000-000000000000","notes":"メトロ 4 号線 Porte de Clignancourt 駅着。入口橋下の露天は無視して通過","transportToNext":"walk","transportNote":"高架下を北へ 5 分","travelMinutesAfter":5},
    {"id":"blk-2-2","startTime":"10:00","endTime":"11:25","spotId":"a2222222-0002-0000-0000-000000000000","notes":"Vernaison は朝が交渉のゴールデンタイム。10〜15% 引きが普通","transportToNext":"walk","transportNote":"Rue des Rosiers 経由で 5 分","travelMinutesAfter":5},
    {"id":"blk-2-3","startTime":"11:30","endTime":"12:25","spotId":"a2222222-0003-0000-0000-000000000000","notes":"Dauphine 1 階奥の Studio Etoile を覗く。冷暖房あり","transportToNext":"walk","transportNote":"Paul Bert 北端へ 8 分","travelMinutesAfter":8},
    {"id":"blk-2-4","startTime":"12:30","endTime":"13:55","spotId":"a2222222-0004-0000-0000-000000000000","notes":"Ma Cocotte の日曜 formula €28。Starck デザインの内装","transportToNext":"walk","transportNote":"Paul Bert 内を移動","travelMinutesAfter":3},
    {"id":"blk-2-5","startTime":"14:00","endTime":"14:55","spotId":"a2222222-0005-0000-0000-000000000000","notes":"Paul Bert アンティーク家具区画。買わなくても見るだけで勉強","transportToNext":"walk","transportNote":"Biron へ 5 分","travelMinutesAfter":5},
    {"id":"blk-2-6","startTime":"15:00","endTime":"15:25","spotId":"a2222222-0006-0000-0000-000000000000","notes":"Biron はハイエンド。冷やかし不可の空気だけど見学だけで価値あり"}
  ]$$::jsonb,
  true
);

INSERT INTO spots (id, article_id, name, address, location, category, price_estimate, tags, position, google_photo_urls, is_sample) VALUES
  ('a2222222-0001-0000-0000-000000000000', 'a0000002-0000-0000-0000-000000000000',
   'Porte de Clignancourt 駅', 'Avenue de la Porte de Clignancourt, 75018 Paris',
   'SRID=4326;POINT(2.3447 48.8978)'::geography, 'other'::spot_category,
   NULL, ARRAY['メトロ','起点']::text[], 0,
   ARRAY['https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a2222222-0002-0000-0000-000000000000', 'a0000002-0000-0000-0000-000000000000',
   'Marché Vernaison', '99 Rue des Rosiers, 93400 Saint-Ouen',
   'SRID=4326;POINT(2.3389 48.9011)'::geography, 'shopping'::spot_category,
   '€20〜€150', ARRAY['古着','小物']::text[], 1,
   ARRAY['https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a2222222-0003-0000-0000-000000000000', 'a0000002-0000-0000-0000-000000000000',
   'Marché Dauphine', '140 Rue des Rosiers, 93400 Saint-Ouen',
   'SRID=4326;POINT(2.3402 48.9024)'::geography, 'shopping'::spot_category,
   '€15〜€300', ARRAY['本','コイン','古着']::text[], 2,
   ARRAY['https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a2222222-0004-0000-0000-000000000000', 'a0000002-0000-0000-0000-000000000000',
   'Ma Cocotte', '106 Rue des Rosiers, 93400 Saint-Ouen',
   'SRID=4326;POINT(2.3416 48.9028)'::geography, 'food'::spot_category,
   '€28〜€45', ARRAY['ランチ','Starck']::text[], 3,
   ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a2222222-0005-0000-0000-000000000000', 'a0000002-0000-0000-0000-000000000000',
   'Marché Paul Bert', '96 Rue des Rosiers, 93400 Saint-Ouen',
   'SRID=4326;POINT(2.3425 48.9033)'::geography, 'shopping'::spot_category,
   '€80〜€2000', ARRAY['家具','アンティーク']::text[], 4,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a2222222-0006-0000-0000-000000000000', 'a0000002-0000-0000-0000-000000000000',
   'Marché Biron', '85 Rue des Rosiers, 93400 Saint-Ouen',
   'SRID=4326;POINT(2.3438 48.9039)'::geography, 'shopping'::spot_category,
   '€300〜€5000', ARRAY['宝飾','ハイエンド']::text[], 5,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 3: moc02 / パリ / spot_guide
--   「11 区のナチュラルワイン酒場 5 軒、月曜から日曜どこ行くか」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, is_sample
) VALUES (
  'a0000003-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333302',
  (SELECT id FROM cities WHERE slug = 'paris'),
  '11 区のナチュラルワイン酒場 5 軒、月曜から日曜どこ行くか',
  E'パリ 11 区 (Oberkampf〜Bastille) は、ここ 10 年で「ナチュラルワインの聖地」化しました。問題は、**月曜はほぼ全店休み、日曜夜も多くが閉まる**こと。シェフ修行 4 年目の私が、曜日 × 店主の機嫌 × ワインリストの面白さで使い分けている 5 軒を紹介します。

「グラス 1 杯 €6 で、店主が日本酒に興味津々で 30 分話し込んでくれる」みたいな店だけです。',
  E'## 5 軒詳細

### Le Servan 系列 Septime La Cave (火・水・木 18-22)
私が所属する系列。グラス €8〜€12、ボトル €35〜€90。Loire の Sébastien Riffault と Jura の Stéphane Tissot 中心。Septime 本店で食事した後の 2 軒目に使われがち。**21:30 以降なら空く**。

### Le Bon Saint Pourçain (火-土 18-23)
シェフ Vivien Pelletier の店。グラス €6 が基本ライン。**金曜夜だけ €5 のグラスフェアあり**。料理も €18〜€28 で出すので 2 軒目どころか 1 軒目に使ってもいい。

### La Buvette (水-日 17-24)
女性店主 Camille Fourmont が一人でカウンターで回す 12 席だけの店。Sancerre と Beaujolais の珍しい瓶が多い。**月曜火曜が休み**なので注意。本人が日本に通っていて、私が行くと必ず「今度の京都はどこ行く?」と聞かれる。

### Aux Deux Amis (火-土 19-26)
深夜まで開いている。シェフ修行帰りの 23:00 以降によく駆け込む。Tapas 形式の小皿が €6〜€12。Jura のサヴァニャン (酸化熟成) が常時 4〜5 種類。

### Le Verre Volé (毎日 12-23)
**唯一日曜営業**。だから月曜休みのレストラン業界従事者がここに集まる。€15 で店主おまかせのアペロセットが頼める。3 軒目の締め用。

## 月曜から日曜の動き方

- **月曜**: La Buvette / Aux Deux Amis / Septime La Cave すべて休み。**Le Verre Volé のみ営業**
- **火曜**: 全店営業。私の本命は La Buvette
- **水・木**: ローテーション自由
- **金曜**: Le Bon Saint Pourçain のグラスフェア (€5) 狙い
- **土曜**: 全店混む。19:00 入店厳守
- **日曜**: 多くが休み。Le Verre Volé か La Buvette のみ

## 失敗談

修行 1 年目、月曜に Aux Deux Amis に行って入口で 5 分立ち尽くした。**Google Maps の営業時間は信用できない**、店の Instagram の固定投稿を読むのが確実です。',
  'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80',
  1200,
  'published'::article_status,
  ARRAY['11区','ナチュラルワイン','ビストロ','夜','曜日別']::text[],
  'few_hours'::article_duration,
  'spot_guide'::article_type,
  'classic',
  '2026-04-02T20:00:00+02:00'::timestamptz,
  true
);

INSERT INTO spots (id, article_id, name, address, location, category, price_estimate, tags, position, google_photo_urls, is_sample) VALUES
  ('a3333333-0001-0000-0000-000000000000', 'a0000003-0000-0000-0000-000000000000',
   'Septime La Cave', '3 Rue Basfroi, 75011 Paris',
   'SRID=4326;POINT(2.3781 48.8541)'::geography, 'food'::spot_category,
   '€8〜€90', ARRAY['ナチュラルワイン','火-木']::text[], 0,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a3333333-0002-0000-0000-000000000000', 'a0000003-0000-0000-0000-000000000000',
   'Le Bon Saint Pourçain', '10 bis Rue Servandoni, 75011 Paris',
   'SRID=4326;POINT(2.3798 48.8557)'::geography, 'food'::spot_category,
   '€5〜€28', ARRAY['ナチュラルワイン','料理あり']::text[], 1,
   ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a3333333-0003-0000-0000-000000000000', 'a0000003-0000-0000-0000-000000000000',
   'La Buvette', '67 Rue Saint-Maur, 75011 Paris',
   'SRID=4326;POINT(2.3801 48.8634)'::geography, 'food'::spot_category,
   '€6〜€18', ARRAY['ナチュラルワイン','12席']::text[], 2,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a3333333-0004-0000-0000-000000000000', 'a0000003-0000-0000-0000-000000000000',
   'Aux Deux Amis', '45 Rue Oberkampf, 75011 Paris',
   'SRID=4326;POINT(2.3712 48.8651)'::geography, 'food'::spot_category,
   '€6〜€20', ARRAY['深夜','タパス']::text[], 3,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a3333333-0005-0000-0000-000000000000', 'a0000003-0000-0000-0000-000000000000',
   'Le Verre Volé', '67 Rue de Lancry, 75010 Paris',
   'SRID=4326;POINT(2.3651 48.8721)'::geography, 'food'::spot_category,
   '€7〜€30', ARRAY['ナチュラルワイン','日曜営業']::text[], 4,
   ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80']::text[],
   true);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 4: moc02 / パリ / photo_journal
--   「シェフ修行 7 ヶ月、深夜のマルシェで見た顔」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, photo_entries, is_sample
) VALUES (
  'a0000004-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333302',
  (SELECT id FROM cities WHERE slug = 'paris'),
  'シェフ修行 7 ヶ月、深夜のマルシェで見た顔',
  E'パリ郊外の中央卸売市場 Rungis に、シェフ修行 7 ヶ月目の私は週 1 で通っています。深夜 2 時起き、3 時着、5 時にコーヒーを飲んで仕入れ完了。

この記事は、その 7 ヶ月で撮った写真の中から「顔」が写っているものだけを 6 枚選んだフォトジャーナルです。本文はキャプションだけ、解説は最小限。',
  E'## 撮影のルール

- 必ず本人に許可を取ってから撮る (フランス語で「Je peux ?」と聞く)
- スマホ撮影、編集なし
- キャプションはその場の会話の引用',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80',
  900,
  'published'::article_status,
  ARRAY['Rungis','深夜','マルシェ','フォトジャーナル','シェフ修行']::text[],
  'other'::article_duration,
  'photo_journal'::article_type,
  'photo_journal',
  '2026-04-12T22:00:00+02:00'::timestamptz,
  $$[
    {"imageUrl":"https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80","caption":"朝 4 時の Rungis 中央市場で、シェフ Aurélien が玉ねぎを 30 kg 注文する。週末分の在庫。","locationName":"Marché de Rungis","spotId":null,"lat":48.7595,"lng":2.3540,"position":0},
    {"imageUrl":"https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&auto=format&fit=crop&q=80","caption":"魚屋の Jean-Pierre。「火曜の朝はマグロが Atlantique からまだ来ない」と教えてくれた。","locationName":"Pavillon Marée","spotId":null,"lat":48.7600,"lng":2.3545,"position":1},
    {"imageUrl":"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80","caption":"5 時のコーヒースタンドで集まる修行人たち。「お前まだ起きてるのか?」が朝の挨拶。","locationName":"Café du Rungis","spotId":null,"lat":48.7589,"lng":2.3548,"position":2},
    {"imageUrl":"https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1600&auto=format&fit=crop&q=80","caption":"野菜区画の Sophie。「これは今週で最後の Cerfeuil tubéreux」と耳元で言われ慌てて 5 kg 買った。","locationName":"Pavillon F1","spotId":null,"lat":48.7591,"lng":2.3535,"position":3},
    {"imageUrl":"https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&auto=format&fit=crop&q=80","caption":"花卉部門の早朝。シェフ用じゃないけど、店の皿装飾用にエディブルフラワーを頼みに来た。","locationName":"Pavillon des Fleurs","spotId":null,"lat":48.7602,"lng":2.3551,"position":4},
    {"imageUrl":"https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=1600&auto=format&fit=crop&q=80","caption":"6 時の帰り際、Boulanger Marc がトラックに積み込み中。「俺はもう寝るから、お前は厨房で頑張れ」。","locationName":"Pavillon BVP","spotId":null,"lat":48.7596,"lng":2.3539,"position":5}
  ]$$::jsonb,
  true
);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 5: moc03 / パリ / itinerary
--   「子連れでルーブル — 90 分で見て疲れず帰る順路」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, itinerary_blocks, is_sample
) VALUES (
  'a0000005-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333303',
  (SELECT id FROM cities WHERE slug = 'paris'),
  '子連れでルーブル — 90 分で見て疲れず帰る順路',
  E'子連れ (5〜10 歳) でルーブルを「3 時間以上」見ようとすると、必ず最後の 30 分は子供の機嫌が崩れて記憶が悪い思い出になります。

私は通訳・美術ガイドとして年 40 組ほど駐在員家族をルーブルに案内しますが、**90 分で 4 つだけ見て出る**のがリピート率の一番高いプラン。この順路を時間付きで書きます。',
  E'## 90 分プラン詳細

入場は事前予約必須 (paris.fr で 30 日前から)。**Porte des Lions 入口** (西側、ピラミッド広場の混雑を避けられる) を使うのがコツ。

### 10:00 — Porte des Lions 入口
ピラミッド入口は 30 分待ちが普通。Lions 入口は 5 分。手荷物検査済ませて、コートは大階段下のクロークへ。**ベビーカーは入口で預ける**ことを推奨 (各部屋でぶつかる)。

### 10:15 — モナリザ (Denon 翼 1 階 711 室)
入場直後すぐ向かう。10:30 を過ぎると人が増えて子供の目線に絵が入らない。**子供を肩車する大人 1 名は必須**。3〜5 分で次へ。

### 10:30 — サモトラケのニケ (Denon 翼 大階段)
モナリザの次にここ。階段の踊り場に立つ大理石の女神像。子供は「翼があるけど顔がない」のがツボに入る。10 分。

### 10:55 — ヴィーナス・ミロ (Sully 翼 1 階)
階段を降りて Sully 翼へ。ここで子供の集中力が切れ始めるので、**事前にプリントしたミッションカード** (絵の前で「右手は何持ってる?」を一緒に探す) を使う。

### 11:25 — エジプト古代美術 (Sully 翼)
最後は子供が必ず喜ぶエジプト区画。ミイラと猫の像。15 分滞在で出口へ。

### 11:40 — ピラミッド広場で写真 → カフェ Angelina (Rivoli) で休憩
退場後、ピラミッド広場で 5 分写真撮影。**Rue de Rivoli 沿いの Angelina** で chocolat chaud €9 + Mont-Blanc €10 で締める。子供は満足、大人は疲労感少なめ。

## ミッションカード (PDF 別途配布)

子供を「探す側」にする 4 つのカードを別途用意しています:
1. モナリザの背景の橋を探せ
2. ニケの羽根の枚数を数えろ
3. ヴィーナスの欠けてる腕の位置を予想しろ
4. ミイラの色がついてる方の足の指を数えろ

このカードがあるとないとで、子供の集中時間が **平均 18 分→52 分** に伸びます (10 家族実測)。

## 持ち物

- 水筒 (館内自販機が高い)
- 子供用の小さなノートと色鉛筆
- レインジャケット (退場後の Tuileries 散歩用)
- 大人 1 人にスリングバッグ 1 個まで (ロッカーは満杯多し)',
  'https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80',
  1700,
  'published'::article_status,
  ARRAY['ルーブル','子連れ','駐妻','美術館','時短']::text[],
  'few_hours'::article_duration,
  'itinerary'::article_type,
  'classic',
  '2026-03-28T10:00:00+02:00'::timestamptz,
  $$[
    {"id":"blk-5-1","startTime":"10:00","endTime":"10:15","spotId":"a5555555-0001-0000-0000-000000000000","notes":"Porte des Lions 入口 (西側) を使う。ピラミッド入口より 25 分早い","transportToNext":"walk","transportNote":"Denon 翼 1 階へ階段","travelMinutesAfter":5},
    {"id":"blk-5-2","startTime":"10:15","endTime":"10:25","spotId":"a5555555-0002-0000-0000-000000000000","notes":"モナリザは入場直後の 10 分で見る。肩車必須","transportToNext":"walk","transportNote":"Denon 翼大階段へ","travelMinutesAfter":5},
    {"id":"blk-5-3","startTime":"10:30","endTime":"10:50","spotId":"a5555555-0003-0000-0000-000000000000","notes":"サモトラケのニケ。翼の枚数を子供と数える","transportToNext":"walk","transportNote":"Sully 翼へ","travelMinutesAfter":5},
    {"id":"blk-5-4","startTime":"10:55","endTime":"11:25","spotId":"a5555555-0004-0000-0000-000000000000","notes":"ヴィーナス・ミロ + エジプト区画。ミッションカード活用","transportToNext":"walk","transportNote":"退場ゲート → ピラミッド広場 → Rivoli","travelMinutesAfter":15},
    {"id":"blk-5-5","startTime":"11:40","endTime":"12:30","spotId":"a5555555-0005-0000-0000-000000000000","notes":"Angelina で chocolat chaud + Mont-Blanc。子供のご褒美タイム"}
  ]$$::jsonb,
  true
);

INSERT INTO spots (id, article_id, name, address, location, category, price_estimate, tags, position, google_photo_urls, is_sample) VALUES
  ('a5555555-0001-0000-0000-000000000000', 'a0000005-0000-0000-0000-000000000000',
   'Musée du Louvre - Porte des Lions', 'Quai François Mitterrand, 75001 Paris',
   'SRID=4326;POINT(2.3322 48.8590)'::geography, 'sight'::spot_category,
   '€22 (大人)', ARRAY['ルーブル','入口']::text[], 0,
   ARRAY['https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a5555555-0002-0000-0000-000000000000', 'a0000005-0000-0000-0000-000000000000',
   'モナリザ (Salle 711)', 'Denon 翼 1 階, Musée du Louvre',
   'SRID=4326;POINT(2.3340 48.8606)'::geography, 'sight'::spot_category,
   NULL, ARRAY['絵画','必見']::text[], 1,
   ARRAY['https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a5555555-0003-0000-0000-000000000000', 'a0000005-0000-0000-0000-000000000000',
   'サモトラケのニケ', 'Denon 翼大階段, Musée du Louvre',
   'SRID=4326;POINT(2.3344 48.8604)'::geography, 'sight'::spot_category,
   NULL, ARRAY['彫刻','大理石']::text[], 2,
   ARRAY['https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a5555555-0004-0000-0000-000000000000', 'a0000005-0000-0000-0000-000000000000',
   'ヴィーナス・ミロ + エジプト古代美術', 'Sully 翼, Musée du Louvre',
   'SRID=4326;POINT(2.3349 48.8602)'::geography, 'sight'::spot_category,
   NULL, ARRAY['彫刻','エジプト']::text[], 3,
   ARRAY['https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a5555555-0005-0000-0000-000000000000', 'a0000005-0000-0000-0000-000000000000',
   'Angelina Rivoli', '226 Rue de Rivoli, 75001 Paris',
   'SRID=4326;POINT(2.3289 48.8654)'::geography, 'food'::spot_category,
   '€9〜€20', ARRAY['カフェ','Mont-Blanc']::text[], 4,
   ARRAY['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&auto=format&fit=crop&q=80']::text[],
   true);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 6: moc03 / パリ / expat_info (スポットなし、本文重視)
--   「フランスの公立小学校に入れて 2 年、後悔したことと良かったこと」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, is_sample
) VALUES (
  'a0000006-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333303',
  (SELECT id FROM cities WHERE slug = 'paris'),
  'フランスの公立小学校に入れて 2 年、後悔したことと良かったこと',
  E'2024 年 9 月、当時 6 歳の上の子をパリ 7 区の École Élémentaire (公立小学校) に入れました。当時の選択肢は「日本人学校」「リセエコール (私立)」「公立」の 3 つで、駐在ではなく永住予定だったので公立を選びました。

2 年経った今、率直に「後悔したこと」と「良かったこと」を整理します。これから同じ判断をする家族の参考になれば。',
  E'## 後悔したこと

### 1. フランス語サポート (FLE) の枠が足りなかった
フランス語が一切わからない状態で 9 月に入学。学校に **FLE (Français Langue Étrangère) クラス**はあったけど、週 3 時間しかなく、最初の 3 ヶ月は教室で完全に置いていかれた。

→ **対策**: 入学前の 8 月から週 4 回 1 時間の家庭教師を入れるべきだった (1 時間 €25 × 4 × 4 週 = €400)。これ抜きで挑むと最初の半年が無駄になる。

### 2. 親同士のネットワーク (les copains des parents)
フランスの公立小は **親同士の付き合いが薄め**。日本のような連絡帳もなく、PTA は形骸化。送り迎えで偶然話す程度。

→ **対策**: 子供がクラスメイトを呼ぶプレイデート (「goûter」) を月 1 で開く。フランス人家庭はだいたい喜ぶ。

### 3. 給食 (cantine) のレベル差
学校によって給食の質が大きく違う。うちは可もなく不可もなくだったけど、隣の学校 (5 区) はオーガニック比率 60% で美味しいと評判だった。**事前に学校 ranking サイトでチェックすべき**。

### 4. 体育がほぼない
体育の時間は週 1.5 時間。日本の小学校の感覚で「運動会」「持久走大会」を期待すると拍子抜けする。**外部スポーツクラブ加入が必須**。

## 良かったこと

### 1. 文化・歴史教育の濃さ
2 年生 (CE1) の段階で「ローマ帝国の地中海支配」を 1 学期かけて学ぶ。子供がローマ史に詳しくなって、夏のイタリア旅行で「ここ、教科書で見た!」が連発。

### 2. 子供のフランス語が 2 年で「学校で普通」レベルに
最初の 6 ヶ月は地獄だったけど、1 年経つと CE1 の授業についていけるレベルに。今は家でも 30% フランス語、70% 日本語で会話。**この言語環境は他では作れない**。

### 3. 給食が「食育」
カトラリーの使い方、複数皿のサーブ順、チーズの食べ方を学校で覚えた。日本に一時帰国したら、ナイフ・フォークの扱いで親戚に褒められた。

### 4. 学費が無料 (cantine だけ €5/日)
リセエコールだと年 €12,000、日本人学校だと年 €9,000 はかかる。**月 €100 (cantine + 課外活動) で済む**のは大きい。

### 5. 多様性
クラスにはアルジェリア、コートジボワール、ベトナム、ポーランド、ブラジルのバックグラウンドの子がいた。「自分が外国人」という感覚が薄まる。

## 入学手続き (2024 年 7 月時点)

- 7 区の場合、Mairie du 7e arrondissement に予約必要 (約 2 週間待ち)
- 必要書類: 住民票 (justificatif de domicile)、出生証明、健康診断書、ワクチン記録
- フランス語訳が必要な書類は **traducteur assermenté** に依頼 (€30/枚)
- ワクチン記録が日本式の場合、現地小児科で 1 度確認してもらう

## まとめ

公立小は「**正解の選択肢ではないが、後悔する選択肢ではない**」というのが 2 年経った所感です。日本人学校が安心で、リセエコールがエリートコースなら、公立は「フランス社会に溶け込むため」のラフな入り口。',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&auto=format&fit=crop&q=80',
  1800,
  'published'::article_status,
  ARRAY['教育','駐妻','公立','手続き','子育て']::text[],
  'other'::article_duration,
  'expat_info'::article_type,
  'classic',
  '2026-04-20T14:00:00+02:00'::timestamptz,
  true
);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 7: moc04 / リヨン / spot_guide
--   「リヨン Croix-Rousse 丘の上、職人通りの 4 軒」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, is_sample
) VALUES (
  'a0000007-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333304',
  (SELECT id FROM cities WHERE slug = 'lyon'),
  'リヨン Croix-Rousse 丘の上、職人通りの 4 軒',
  E'リヨンの Croix-Rousse 地区は、19 世紀のシルク織機 (canuts) の街区が今も残るエリア。今は職人・作家・小さな工房が集まる「リヨンの Marais」みたいな場所です。

ただし観光地化していなくて、**坂が急** (Métro C で 1 駅分上がる) なので観光客は来ない。私はここで自転車工房 + コーヒー焙煎を 5 年やっています。同業 / 同志的な工房を 4 軒紹介します。',
  E'## 4 軒の詳細

### 1. Atelier Vincent — フランス手縫い革靴
店主 Vincent は元 Berluti の職人。50 歳で独立してここに工房を構えた。フルオーダー革靴 €1,200〜 (8 ヶ月待ち)。**靴を見るだけなら火・木の 14-17 時**にアポなしで OK。私はベルトを €180 で作ってもらいました。

### 2. Soierie Sainte-Catherine — シルクスカーフ手染め
リヨンの伝統技法を残す小さな工房。スカーフ 1 枚 €120〜€280。ここは **染色実演を毎週土曜 11:00** にやっていて、見学無料。匂いと色が空気に残ってる工房の感覚は他で味わえない。

### 3. Café Mokxa — リヨン最先端のスペシャルティ焙煎
私の焙煎の師匠が共同経営。Brazil Daterra と Ethiopia Yirgacheffe を週替わりで出す。**フィルター €4.50、エスプレッソ €3**。9-11 時の朝はバリスタの Antoine と私が「次回のロースト profile」を 30 分話し込むのが日常。

### 4. Ma Bicyclette — 小さな自転車工房
私の店ではなく、別の同業の店。Croix-Rousse 北端、Rue Hénon に。クラシックなランドナー (旅自転車) を 1 台ずつ手組みする店主 Yves が一人で回す。お互いに「足りない工具を貸し借りする」関係。

## ルート

メトロ C 線 Hénon 駅で降りる → 北の Place de la Croix-Rousse から南へ歩く → Vincent → Mokxa → Soierie → 帰りに Ma Bicyclette → 同じ駅で帰る。所要 3 時間半。坂は下り基調。

## 注意

- **日曜は全店休み**。土曜午後がベスト
- **8 月は半数閉店** (フランスのバカンス)
- **店主と話したいなら最初の挨拶を仏語**で。"Bonjour, je suis japonais·e, je travaille à Vieux Lyon" だけで距離が縮まる

## おまけ: 私の店

Rue Pasteur 12 で自転車修理 + コーヒー焙煎の小さな店をやっています。事前予約不要、月-金 10-18 時。気軽に寄ってください。',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&auto=format&fit=crop&q=80',
  1100,
  'published'::article_status,
  ARRAY['リヨン','クロワルース','工房','コーヒー','職人']::text[],
  'half_day'::article_duration,
  'spot_guide'::article_type,
  'classic',
  '2026-04-08T11:00:00+02:00'::timestamptz,
  true
);

INSERT INTO spots (id, article_id, name, address, location, category, price_estimate, tags, position, google_photo_urls, is_sample) VALUES
  ('a7777777-0001-0000-0000-000000000000', 'a0000007-0000-0000-0000-000000000000',
   'Atelier Vincent', '8 Rue d''Austerlitz, 69004 Lyon',
   'SRID=4326;POINT(4.8325 45.7766)'::geography, 'shopping'::spot_category,
   '€180〜€1200', ARRAY['革靴','職人']::text[], 0,
   ARRAY['https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a7777777-0002-0000-0000-000000000000', 'a0000007-0000-0000-0000-000000000000',
   'Soierie Sainte-Catherine', '21 Rue Imbert-Colomès, 69001 Lyon',
   'SRID=4326;POINT(4.8344 45.7728)'::geography, 'shopping'::spot_category,
   '€120〜€280', ARRAY['シルク','染色実演']::text[], 1,
   ARRAY['https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a7777777-0003-0000-0000-000000000000', 'a0000007-0000-0000-0000-000000000000',
   'Café Mokxa', '3 Rue de l''Abbé Rozier, 69001 Lyon',
   'SRID=4326;POINT(4.8311 45.7682)'::geography, 'food'::spot_category,
   '€3〜€8', ARRAY['コーヒー','焙煎']::text[], 2,
   ARRAY['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a7777777-0004-0000-0000-000000000000', 'a0000007-0000-0000-0000-000000000000',
   'Ma Bicyclette', '102 Rue Hénon, 69004 Lyon',
   'SRID=4326;POINT(4.8278 45.7791)'::geography, 'shopping'::spot_category,
   '€800〜€2500', ARRAY['自転車','手組み']::text[], 3,
   ARRAY['https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=1600&auto=format&fit=crop&q=80']::text[],
   true);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 8: moc04 / リヨン / itinerary
--   「自転車でローヌ川 → ソーヌ川を渡る半日コース」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, itinerary_blocks, is_sample
) VALUES (
  'a0000008-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333304',
  (SELECT id FROM cities WHERE slug = 'lyon'),
  '自転車でローヌ川 → ソーヌ川を渡る半日コース',
  E'リヨンは「二つの川 (ローヌとソーヌ) が市内で合流する」街。両岸に整備されたサイクリングロード (Voies Vertes) が走り、**車道に出ずに市内を 20km 走れる**のが他の都市にない強み。

私は自転車工房をやっている関係で、年間 200 日以上自転車に乗ります。この記事では、観光客が来ても 4 時間で走り切れる「両川コース」を、レンタル場所と休憩スポット込みで紹介します。',
  E'## 半日コース詳細 (4 時間、距離 22km、休憩込み)

### 9:00 — 自転車レンタル (Vélo''v または工房)
**Vélo''v** (リヨンの公共レンタル、1 日券 €5) を Place Bellecour で借りる。手早い。
私の工房で借りるなら €20/日でクロモリのフィットしたサイズの自転車が借りられる。事前予約推奨。

### 9:15 — Bellecour → ローヌ右岸を北上
Bellecour 広場の北東角からローヌ川右岸サイクリングロードへ。Pont de la Guillotière を渡らず北へ。Pont Wilson まで 2km、10 分。

### 9:45 — Parc de la Tête d''Or (リヨン最大の公園)
公園内のサイクリングロードを 30 分一周。鹿のいる柵 + 植物園 + 湖。**朝のジョギング族とぶつかる**ので、外周コース推奨。

### 10:45 — Confluence 地区 (新しい都市開発エリア) へ南下
ローヌ右岸を南へ。リヨン Confluence 美術館 (現代建築の代表作) で 15 分写真休憩。建物に入らず外観だけでも価値あり。

### 11:30 — 川の合流点 (Confluence pointe)
ローヌとソーヌが合流する尖端。観光地化していないけど、ベンチに座って 10 分眺める時間が一番贅沢。

### 11:45 — ソーヌ左岸を北上、Vieux Lyon へ
合流点から橋を渡ってソーヌ左岸 (西側) へ。**Pont Maréchal Juin** を渡ると Vieux Lyon (旧市街、ユネスコ世界遺産) に入る。

### 12:15 — Vieux Lyon でランチ (Bouchon)
リヨンの伝統食堂 "Bouchon" を 1 軒。**Café des Fédérations** が観光客向けだけど旨い。エビス・ド・リヨン (豚肉のテリーヌ) + サラダ・リヨネーズ + Tarte aux Pralines で €28。

### 13:30 — Fourvière 丘 (オプション: 自転車で登れる体力ある人だけ)
ソーヌ西岸の急坂を自転車で 15 分かけて登る。Basilique Notre-Dame de Fourvière のテラスからリヨン全景。**自信ない人はケーブルカーで自転車ごと運べる** (€3)。

### 13:45 — Bellecour に帰還、自転車返却
ソーヌ左岸を北上 → Place Bellecour で返却。

## 装備チェックリスト

- **ヘルメット**: Vélo''v は付属しない、持参か購入 (€25)
- **携帯フォルダ**: 川岸は標識が少ない、Google Maps で常時ナビ
- **水筒 + サングラス**: 川岸日陰少なし
- **替え T シャツ**: ランチ後の坂で汗かく

## 注意

- **冬 (11-3 月) は風が強い**、夏 (6-8 月) の朝早めが快適
- **日曜午後は家族連れで混雑**
- **電動自転車レンタル** (Pony Bikes、私の工房も) は €25/日、坂が苦手な人にはこっちが正解',
  'https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=1600&auto=format&fit=crop&q=80',
  1400,
  'published'::article_status,
  ARRAY['リヨン','自転車','ローヌ川','ソーヌ川','Vieux Lyon']::text[],
  'half_day'::article_duration,
  'itinerary'::article_type,
  'classic',
  '2026-04-25T09:00:00+02:00'::timestamptz,
  $$[
    {"id":"blk-8-1","startTime":"09:00","endTime":"09:15","spotId":"a8888888-0001-0000-0000-000000000000","notes":"Vélo'v 1 日券 €5 で Bellecour で借りる","transportToNext":"bike","transportNote":"ローヌ右岸を北へ 2km","travelMinutesAfter":15},
    {"id":"blk-8-2","startTime":"09:45","endTime":"10:35","spotId":"a8888888-0002-0000-0000-000000000000","notes":"Parc de la Tête d'Or 外周を 30 分一周","transportToNext":"bike","transportNote":"ローヌ右岸を南下 4km","travelMinutesAfter":25},
    {"id":"blk-8-3","startTime":"11:00","endTime":"11:25","spotId":"a8888888-0003-0000-0000-000000000000","notes":"Musée des Confluences の外観で写真休憩","transportToNext":"bike","transportNote":"合流点まで 1km","travelMinutesAfter":5},
    {"id":"blk-8-4","startTime":"11:30","endTime":"11:45","spotId":"a8888888-0004-0000-0000-000000000000","notes":"川の合流尖端で 10 分眺める。観光地化していない","transportToNext":"bike","transportNote":"ソーヌ左岸を北上、Vieux Lyon まで 3km","travelMinutesAfter":20},
    {"id":"blk-8-5","startTime":"12:15","endTime":"13:25","spotId":"a8888888-0005-0000-0000-000000000000","notes":"Bouchon でリヨン伝統食。Tarte aux Pralines で締める","transportToNext":"bike","transportNote":"ソーヌ左岸南下 → Bellecour へ","travelMinutesAfter":15}
  ]$$::jsonb,
  true
);

INSERT INTO spots (id, article_id, name, address, location, category, price_estimate, tags, position, google_photo_urls, is_sample) VALUES
  ('a8888888-0001-0000-0000-000000000000', 'a0000008-0000-0000-0000-000000000000',
   'Vélo''v Bellecour', 'Place Bellecour, 69002 Lyon',
   'SRID=4326;POINT(4.8328 45.7578)'::geography, 'other'::spot_category,
   '€5/日', ARRAY['自転車','レンタル']::text[], 0,
   ARRAY['https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a8888888-0002-0000-0000-000000000000', 'a0000008-0000-0000-0000-000000000000',
   'Parc de la Tête d''Or', 'Place Général Leclerc, 69006 Lyon',
   'SRID=4326;POINT(4.8501 45.7752)'::geography, 'sight'::spot_category,
   '無料', ARRAY['公園','サイクリング']::text[], 1,
   ARRAY['https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a8888888-0003-0000-0000-000000000000', 'a0000008-0000-0000-0000-000000000000',
   'Musée des Confluences', '86 Quai Perrache, 69002 Lyon',
   'SRID=4326;POINT(4.8189 45.7338)'::geography, 'sight'::spot_category,
   '外観無料', ARRAY['現代建築','Confluence']::text[], 2,
   ARRAY['https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a8888888-0004-0000-0000-000000000000', 'a0000008-0000-0000-0000-000000000000',
   'Confluence Pointe (川の合流点)', 'Pointe Sud, 69002 Lyon',
   'SRID=4326;POINT(4.8201 45.7308)'::geography, 'sight'::spot_category,
   '無料', ARRAY['ローヌ','ソーヌ','尖端']::text[], 3,
   ARRAY['https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a8888888-0005-0000-0000-000000000000', 'a0000008-0000-0000-0000-000000000000',
   'Café des Fédérations (Bouchon)', '8 Rue du Major Martin, 69001 Lyon',
   'SRID=4326;POINT(4.8312 45.7676)'::geography, 'food'::spot_category,
   '€28', ARRAY['Bouchon','伝統食']::text[], 4,
   ARRAY['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80']::text[],
   true);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 9: moc05 / ボルドー / spot_guide
--   「Chartrons のワイン商通り、観光客が知らない 4 ヴィンテージショップ」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, is_sample
) VALUES (
  'a0000009-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333305',
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'Chartrons のワイン商通り、観光客が知らない 4 ヴィンテージショップ',
  E'ボルドー Chartrons 地区は、18-19 世紀のワイン商の倉庫街。今は観光客向けのカーヴ (Cave) や Cité du Vin (ワイン博物館) があるけど、私が在住 3 年で「地元のソムリエが買いに行く店」は別。

このリストは、観光客が来ない 4 軒のヴィンテージワインショップを、価格帯・特化エリア・店主との交渉のしかた込みで書いたものです。**€30〜€100 の Bordeaux ヴィンテージ** (1995〜2010) を狙う人向け。',
  E'## 4 軒詳細

### 1. Cave Pierre — 創業 1972 年、家族経営
Rue Notre-Dame 38。創業者の息子 Marc が店主。在庫の 70% が **1990〜2005 年の Médoc**。常連の地元医師が「自宅セラーが満杯になったから売りに来た」というルートで入ってくる。€45〜€120 のレンジが手厚い。

**交渉**: 5 本買うと 10% off が公式ルール。それ以上は店主の機嫌次第。私は 6 本買って「今度東京から友人が来て」と言ったら €30 off にしてくれた。

### 2. Vintage Bordeaux Hub — 1995-2005 年特化
Rue de la Verrerie 12。若手 (35 歳前後) のソムリエ Lucas が独立して 2022 年に開店。**1995-2005 年の Bordeaux 限定**で、Sauternes も含む。€60〜€200 が中心。

**注目**: 毎月第 1 木曜の 19:00-22:00 に試飲会 €25 (4 種 + おつまみ)。日本人観光客 OK だけど、英語ガイドは無いので簡単な仏語が必要。

### 3. Maison du Saké Bordeaux (おまけ: 日本酒) — Chartrons 北端
Rue Bouquière 5。日本酒専門。価格は東京の 1.8〜2 倍だけど、**獺祭・醸し人九平次・新政**が手に入る。地元のフランス人ソムリエが「Bordeaux と日本酒のペアリング」を研究しに来る場所でもある。€18〜€80。

### 4. Caves Augé Bordeaux — Sauternes 専門
Cours du Médoc 7。Sauternes (甘口) と Barsac のヴィンテージ専門。**1989・1990・2001** の伝説の年が常時在庫 (€200〜€500)。観光客は来ないので、ゆっくり 20 分立ち話ができる。

## 価格帯マップ

- **€30〜€50**: Cave Pierre の Cru Bourgeois、Vintage Bordeaux Hub の Petit Château
- **€60〜€100**: Cave Pierre の Médoc Cru Classé 5級、Sauternes の通常年
- **€120〜€250**: Vintage Bordeaux Hub の Saint-Émilion Grand Cru Classé
- **€300〜€500**: Caves Augé の伝説の年 Sauternes

## ルート

トラム B 線 Chartrons 駅で降りる → Rue Notre-Dame を北へ → Cave Pierre (15 分) → Rue de la Verrerie へ折れて Vintage Bordeaux Hub (20 分) → Rue Bouquière で Maison du Saké (10 分) → Cours du Médoc で Caves Augé (15 分) → 同じ駅で帰る。所要 2 時間。

## 失敗談

最初の 1 年、私は Cité du Vin 周辺のワインショップ (観光客向け) で €120 の Médoc を買って、後から Cave Pierre で同じ銘柄が **€78** で売られているのを発見してショックを受けました。Chartrons は北側の通りに分け入るのが正解。',
  'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80',
  1500,
  'published'::article_status,
  ARRAY['ボルドー','シャルトロン','ワイン','ヴィンテージ','カーヴ']::text[],
  'few_hours'::article_duration,
  'spot_guide'::article_type,
  'classic',
  '2026-05-03T15:00:00+02:00'::timestamptz,
  true
);

INSERT INTO spots (id, article_id, name, address, location, category, price_estimate, tags, position, google_photo_urls, is_sample) VALUES
  ('a9999999-0001-0000-0000-000000000000', 'a0000009-0000-0000-0000-000000000000',
   'Cave Pierre', '38 Rue Notre-Dame, 33000 Bordeaux',
   'SRID=4326;POINT(-0.5712 44.8466)'::geography, 'shopping'::spot_category,
   '€45〜€120', ARRAY['ヴィンテージ','Médoc']::text[], 0,
   ARRAY['https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a9999999-0002-0000-0000-000000000000', 'a0000009-0000-0000-0000-000000000000',
   'Vintage Bordeaux Hub', '12 Rue de la Verrerie, 33000 Bordeaux',
   'SRID=4326;POINT(-0.5702 44.8478)'::geography, 'shopping'::spot_category,
   '€60〜€200', ARRAY['1995-2005','試飲会']::text[], 1,
   ARRAY['https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a9999999-0003-0000-0000-000000000000', 'a0000009-0000-0000-0000-000000000000',
   'Maison du Saké Bordeaux', '5 Rue Bouquière, 33000 Bordeaux',
   'SRID=4326;POINT(-0.5689 44.8489)'::geography, 'shopping'::spot_category,
   '€18〜€80', ARRAY['日本酒','獺祭']::text[], 2,
   ARRAY['https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80']::text[],
   true),
  ('a9999999-0004-0000-0000-000000000000', 'a0000009-0000-0000-0000-000000000000',
   'Caves Augé Bordeaux', '7 Cours du Médoc, 33300 Bordeaux',
   'SRID=4326;POINT(-0.5681 44.8501)'::geography, 'shopping'::spot_category,
   '€200〜€500', ARRAY['Sauternes','伝説の年']::text[], 3,
   ARRAY['https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80']::text[],
   true);


-- ─────────────────────────────────────────────────────────────────────────
-- 記事 10: moc05 / ボルドー / expat_info (スポットなし)
--   「ボルドー子なし夫婦の暮らし方 — 物価・医療・週末アクティビティ」
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id, title, body, body_paid,
  cover_image_url, price_jpy, status, tags,
  duration_type, article_type, body_style,
  published_at, is_sample
) VALUES (
  'a0000010-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333305',
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'ボルドー子なし夫婦の暮らし方 — 物価・医療・週末アクティビティ',
  E'夫婦 2 人でボルドーに移住して 3 年目。「パリほど忙しくなく、ニースほど暑くなく、ワインがある」というのが選んだ理由でした。

子なし共働きの 30 代後半夫婦が、ボルドーで実際にいくらで暮らせるか、医療はどうするか、週末は何をしているか、を具体的な数字でまとめます。これから移住を検討する人の参考に。',
  E'## 1. 月の支出 (2 人世帯、2026 年 5 月時点)

- **家賃**: Chartrons 地区 2 LDK 60㎡、€1,150/月 (charges 込み)
- **電気・ガス・水**: €130/月 (冬は €180 まで上がる)
- **インターネット (Free Box)**: €30/月
- **スマホ x 2 (Free Mobile)**: €30/月
- **食費**: €580/月 (2 人、外食週 1)
- **交通 (トラム/バス)**: €60/月 (2 人)
- **ワイン代** (専業): €200/月

合計: **約 €2,180/月** (約 35 万円)

パリの同条件 (3 区 2 LDK 50㎡) と比べると、家賃だけで **月 €800 安い**。ただし給与水準もパリより 15-20% 低いので、リモートワークの恩恵が大きい層向け。

## 2. 医療 (Sécu + Mutuelle)

- **保険番号 (Numéro de Sécu)** 取得まで: 私の場合 9 ヶ月かかった。CPAM 33 (ボルドー支部) の手続きが遅い
- **かかりつけ医 (Médecin traitant) 探し**: 5 軒に電話して 3 軒が新規 NG、2 軒目で運よく受け入れ
- **歯医者**: Chartrons の「Dr. Lefèvre」が日本人歓迎、英語 OK
- **緊急時**: CHU de Bordeaux (公立大学病院) が車 15 分。**夜間救急は 4-6 時間待ち**を覚悟

私は **Mutuelle** (補完保険) を「Harmonie Mutuelle」で €72/月。歯科・眼鏡・処方箋外薬の自己負担 30% がカバーされる。これ無しは無理。

## 3. 週末アクティビティ (春・夏・秋・冬)

### 春 (3-5 月): シャトー巡り
レンタカー €40/日で Médoc・Saint-Émilion・Sauternes を回る。**Château Lynch-Bages の試飲ツアー** €25 が定番。

### 夏 (6-8 月): 大西洋ビーチ
Bordeaux からアルカション (Arcachon) まで TER 電車で 50 分。Pyla 砂丘 (ヨーロッパ最大の砂丘) と牡蠣食堂が同時に楽しめる。**8 月は予約必須**。

### 秋 (9-11 月): 収穫祭 (Vendanges)
9 月の収穫祭イベントが Médoc・Saint-Émilion・Pessac-Léognan で毎週末。**Marathon du Médoc** (ワイン飲みながら走るマラソン、9 月) が観光のピーク。

### 冬 (12-2 月): Pyrénées スキー
南へ車で 3 時間で Pyrénées のスキー場 (Bareges、Saint-Lary)。リフト券 €38/日、パリから来るより遥かに安い。

## 4. 日本食材調達

- **Maison du Saké Bordeaux** (記事 9 で詳述): 日本酒・調味料
- **Asia Market** (Rue Sainte-Catherine 北端): 醤油・米・乾物
- **Carrefour 大型店** (Bordeaux-Lac): 醤油・寿司用海苔は普通に置いてる
- **海外通販 (Umami Paris)**: 高価だが本格的な調味料 (本みりん・本枯節)

## 5. 良かったこと / 悪かったこと

**良かった**:
- パリより落ち着いた生活
- ワインへのアクセス
- 大西洋・Pyrénées・スペイン国境まで車で 2-3 時間

**悪かった**:
- 日本人コミュニティが小さい (€50〜100 人と推測)
- 国際線が CDG 経由必須 (羽田直行はない)
- **夏 8 月の暑さ** (38°C 超え) と冬の雨

## まとめ

子なし夫婦・リモートワーク・ワイン好き、という条件がはまると **ボルドーは最高**。逆に、子育てや日本人ネットワーク重視なら、無理してパリのほうがいい。',
  'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=1600&auto=format&fit=crop&q=80',
  1600,
  'published'::article_status,
  ARRAY['ボルドー','移住','物価','医療','駐在']::text[],
  'other'::article_duration,
  'expat_info'::article_type,
  'classic',
  '2026-05-10T10:00:00+02:00'::timestamptz,
  true
);


-- =========================================================================
-- 4. コミュニティ投稿 20 件
--    apartment 4 / marketplace 4 / job 3 / group 4 / lesson 3 / mutual_aid 2
-- =========================================================================

INSERT INTO community_posts (
  id, kind, author_id, title, body,
  city_id, location_text,
  price_amount, price_currency, price_unit,
  photos, metadata, status, contact_method, contact_email,
  expires_at, created_at, is_sample
) VALUES

  -- ───────── apartment ×4 ─────────
  (
    'c0000001-0000-0000-0000-000000000001',
    'apartment'::community_post_kind,
    '33333333-3333-3333-3333-333333333301',
    'Marais 1LDK サブレット、6 月だけ (家具付き、2 人まで)',
    E'パリ Le Marais (3区) の自宅サブレットです。6/1〜6/30 の 1 ヶ月限定。私が日本に一時帰国するため。

- 場所: Rue Charlot 近く、メトロ 8 号線 Filles du Calvaire 駅徒歩 3 分
- 広さ: 1LDK 38㎡、4 階エレベーターあり
- 設備: 家具付き、Wi-Fi、洗濯機、ドラム式乾燥機、エスプレッソマシン
- ベッド: ダブル 1 (大人 2 人 OK)
- 家賃: €1,650 (1 ヶ月、光熱費・Wi-Fi 込み)
- 保証金: €500 (退去時返却)
- ペット: NG、喫煙: NG
- 写真: 室内写真 12 枚、ご希望の方には別途お送りします

夏のパリ滞在を検討中の方、ご連絡ください。Locore メッセージ優先。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 3区 Le Marais',
    1650, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"listing_type":"sublet","rent_monthly":1650,"size_sqm":38,"bedrooms":1,"furnished":true,"utilities_included":true,"arrondissement":"3e","nearest_station":"Filles du Calvaire","available_from":"2026-06-01","available_until":"2026-06-30","pets_ok":false,"smoking_ok":false,"audience":"both"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '40 days',
    '2026-04-28T10:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000001-0000-0000-0000-000000000002',
    'apartment'::community_post_kind,
    '33333333-3333-3333-3333-333333333302',
    '11 区共同アパルトマンの個室空き、9 月入居 (シェア)',
    E'パリ 11区 Oberkampf のフラットシェアの個室が 1 部屋空きます。同居人は私 (シェフ修行中、男性 28 歳) と現在のフラットメイト (女性、写真家、29 歳)。

- 個室: 12㎡、家具付き (ベッド、デスク、クローゼット)
- 共有: キッチン、リビング、シャワー × 2、トイレ × 2
- 場所: Rue Oberkampf 近く、メトロ 9 号線 Saint-Ambroise 徒歩 4 分
- 家賃: €680/月 (光熱費 + Wi-Fi 込み)
- 保証金: 1 ヶ月 (€680)
- 入居: 2026/9/1〜長期 (最低 6 ヶ月)
- 言語: 仏語 conversation 以上、英語 OK
- 募集: 男女不問、25-35 歳、料理好き歓迎

フラットメイト面談あり (ビデオ通話 OK)。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 11区 Oberkampf',
    680, 'EUR', 'monthly',
    '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"listing_type":"shared","rent_monthly":680,"size_sqm":12,"bedrooms":1,"furnished":true,"utilities_included":true,"arrondissement":"11e","nearest_station":"Saint-Ambroise","available_from":"2026-09-01","pets_ok":false,"smoking_ok":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '60 days',
    '2026-04-15T18:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000001-0000-0000-0000-000000000003',
    'apartment'::community_post_kind,
    '33333333-3333-3333-3333-333333333304',
    'リヨン 1 区 30㎡、家具付き、長期賃貸',
    E'リヨン 1 区 Croix-Rousse 麓 の 1LDK 30㎡。私が今住んでいる物件ですが、別物件に移るため後継を探しています。オーナー直接契約に変更可能。

- 場所: Rue Bouteille、メトロ A 線 Hôtel de Ville 徒歩 6 分
- 広さ: 30㎡、3 階階段 (エレベーターなし)
- 家具: 全付き (退去時に買取 €1,200 で全部譲渡可)
- 家賃: €780/月 (光熱費別、charges €40/月)
- 保証金: 1 ヶ月
- 入居: 2026/8/1 以降、最低 1 年
- 特徴: 南向き、ベランダあり、洗濯機・乾燥機、エスプレッソマシン残置

オーナーは日本人歓迎の高齢のフランス人 (息子が日本駐在歴あり)。',
    (SELECT id FROM cities WHERE slug = 'lyon'),
    'リヨン 1区',
    780, 'EUR', 'monthly',
    '["https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"listing_type":"long_term","rent_monthly":780,"charges_monthly":40,"size_sqm":30,"bedrooms":1,"furnished":true,"utilities_included":false,"arrondissement":"1er","nearest_station":"Hôtel de Ville","available_from":"2026-08-01","pets_ok":true,"smoking_ok":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'email_direct', 'moc04.contact.sample@locore.test',
    now() + interval '50 days',
    '2026-04-22T09:30:00+02:00'::timestamptz, true
  ),
  (
    'c0000001-0000-0000-0000-000000000004',
    'apartment'::community_post_kind,
    '33333333-3333-3333-3333-333333333305',
    'ボルドー Chartrons フラットメイト募集、7 月入居',
    E'ボルドー Chartrons の 2 LDK を、夫婦と一緒に 7 月から半年シェアしてくれる方を探しています。1 部屋空きで、リビング・キッチン・浴室共有。

- 個室: 14㎡、家具付き
- 場所: Rue Notre-Dame 近く、トラム B 線 Chartrons 徒歩 2 分
- 共有: 大型キッチン (オーブン、食洗機)、リビング、テラス
- 家賃: €520/月 (光熱費・Wi-Fi 込み)
- 保証金: 1 ヶ月
- 入居: 2026/7/1〜2026/12/31 (最低 6 ヶ月)
- 私たち: 30 代後半夫婦、共働き、夜は静か
- 求める方: 静か、料理好き、英仏どちらか conversation 以上

ご興味あればまずビデオ通話で。',
    (SELECT id FROM cities WHERE slug = 'bordeaux'),
    'ボルドー Chartrons',
    520, 'EUR', 'monthly',
    '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"listing_type":"shared","rent_monthly":520,"size_sqm":14,"bedrooms":1,"furnished":true,"utilities_included":true,"nearest_station":"Chartrons","available_from":"2026-07-01","available_until":"2026-12-31","pets_ok":false,"smoking_ok":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '50 days',
    '2026-05-05T11:00:00+02:00'::timestamptz, true
  ),

  -- ───────── marketplace ×4 ─────────
  (
    'c0000002-0000-0000-0000-000000000001',
    'marketplace'::community_post_kind,
    '33333333-3333-3333-3333-333333333301',
    '無印 折りたたみ自転車 売ります (帰任予定なし、買い替え)',
    E'パリで 3 年使った無印良品の 16 インチ折りたたみ自転車を売ります。日本から輸送したもの、使用に問題なし。

- メーカー: 無印良品 (日本仕様)
- ホイール: 16 インチ
- 状態: 良好 (タイヤは去年交換済み、ブレーキ問題なし)
- 価格: €150 (元値 ¥30,000 相当)
- 受け渡し: パリ 3区 Le Marais 近郊、直接手渡し
- 支払い: 現金または PayPal
- 写真: 別途送ります

折りたたんで RER に持ち込んでよくバンリュー (郊外) に出かけてました。引き取り手見つかり次第クローズします。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 3区',
    150, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"vehicle","condition":"good","side":"sell","pickup_required":true,"delivery_available":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '25 days',
    '2026-05-08T14:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000002-0000-0000-0000-000000000002',
    'marketplace'::community_post_kind,
    '33333333-3333-3333-3333-333333333303',
    'Kindle Paperwhite 3 台譲渡 (子供の卒業に伴い)',
    E'子供が日本人学校 → 公立に移って 2 年経ち、日本語の Kindle を 3 台とも使わなくなったので譲渡します。

- 機種: Kindle Paperwhite (第 10 世代、防水)
- 容量: 8GB
- 状態: 良好 (画面に細かい傷あり、機能は完全)
- 価格: 1 台 €40、3 台まとめ €100
- 受け渡し: パリ 7区 École Militaire 近郊、直接手渡し
- 充電器: USB-C 1 本付属 (3 台共用)

子供の日本語学習用に買ったので、青空文庫・小学校 4 年向け児童書アカウント (引き継ぎ希望なら) 込みで譲ります。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 7区',
    100, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"electronics","condition":"good","side":"sell","pickup_required":true,"delivery_available":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'email_direct', 'moc03.contact.sample@locore.test',
    now() + interval '25 days',
    '2026-05-12T13:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000002-0000-0000-0000-000000000003',
    'marketplace'::community_post_kind,
    '33333333-3333-3333-3333-333333333304',
    'マンガ全集「鬼滅の刃」全 23 巻 売却 (リヨン)',
    E'日本から輸送した「鬼滅の刃」全 23 巻 (日本語版) を売ります。子供向け / 大人 OK。

- 状態: 良好 (1-5 巻は読み込み多し、6-23 巻は美品)
- 価格: 全巻セット €120 (1 冊あたり €5.2、日本で買うと ¥10,000 相当)
- 受け渡し: リヨン 4区 Croix-Rousse、私の工房 (Rue Pasteur) で
- 単巻売却は不可、セット限定

引っ越しに伴う整理。日本語学習中のフランス人にもおすすめ。',
    (SELECT id FROM cities WHERE slug = 'lyon'),
    'リヨン 4区 Croix-Rousse',
    120, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"books_media","condition":"good","side":"sell","pickup_required":true,"delivery_available":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '20 days',
    '2026-05-04T19:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000002-0000-0000-0000-000000000004',
    'marketplace'::community_post_kind,
    '33333333-3333-3333-3333-333333333305',
    'ワインセラー 100 本収納 (LIEBHERR、引退に伴い)',
    E'前任のオーナーから引き継いだ業務用ワインセラーを売ります。アトリエ拡張で 200 本タイプに買い替えるため。

- メーカー: LIEBHERR WTes 5972
- 収納: 100 本
- 温度ゾーン: 2 段階 (5-10°C / 10-20°C)
- 状態: 良好 (フィルター 2024 年交換済み)
- 元値: €2,200 (2020 年購入)
- 売却価格: €800
- 受け渡し: ボルドー Chartrons の私のアトリエで、運搬は購入者負担 (ピアノ運送業者を紹介可)
- 動作確認: 引き渡し時に通電状態で

ワイン好きの個人 / レストラン / カーヴ向け。',
    (SELECT id FROM cities WHERE slug = 'bordeaux'),
    'ボルドー Chartrons',
    800, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"appliance","condition":"good","side":"sell","pickup_required":true,"delivery_available":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '28 days',
    '2026-05-15T10:00:00+02:00'::timestamptz, true
  ),

  -- ───────── job ×3 ─────────
  (
    'c0000003-0000-0000-0000-000000000001',
    'job'::community_post_kind,
    '33333333-3333-3333-3333-333333333303',
    '日本人観光客向け通訳ガイド、1 日単発 (5 月-9 月)',
    E'5 月-9 月の繁忙期に向けて、日本人観光客向けの通訳ガイドを単発で募集します。私が運営する小さな通訳事務所 (パリ 7区) の業務委託契約です。

- 業務: 美術館・市内観光・買い物のフルアテンド (8 時間)
- 報酬: 1 日 €180 (日給) + 交通費実費 + 食事 1 回
- 必要言語: 日本語ネイティブ、フランス語 conversation 以上、英語可
- 必要経験: パリ 1 年以上滞在、美術館ガイド経験あれば歓迎
- 単発頻度: 月 4-8 回、希望日程ベース
- 集合場所: 観光客の宿泊ホテルまで
- 服装: スマートカジュアル

留学生・主婦 (夫)・駐妻歓迎。CV を Locore メッセージで送ってください。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ (主に 1-7 区)',
    180, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"employment_type":"casual","category":"translation","salary_period":"hourly","language_requirements":["ja","fr"],"remote_ok":false,"experience_required":true,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'email_direct', 'moc03.jobs.sample@locore.test',
    now() + interval '55 days',
    '2026-04-30T08:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000003-0000-0000-0000-000000000002',
    'job'::community_post_kind,
    '33333333-3333-3333-3333-333333333304',
    'リヨン日本食レストラン、キッチンヘルプ募集 (週末のみ可)',
    E'友人が経営するリヨン 2 区の日本食レストラン「Izakaya Yamato」がキッチンヘルプを募集しています。料理経験不問、まじめな方歓迎。

- 業務: 仕込み、洗い場、簡単な調理補助 (天ぷら、焼鳥下処理)
- 勤務: 火-土の 17:00-23:00、週 3-5 日
- 給与: €12.5/時 + 食事まかない + チップ折半
- 雇用形態: CDI または CDD 6 ヶ月から選択可
- 学生 OK (週末のみ 16 時間勤務でも可)
- 在留資格: ワーキングホリデー OK、学生ビザ OK (週 20 時間以内)

私の友人 (オーナー) は日本語ネイティブ。最初の 1 週間は OJT。',
    (SELECT id FROM cities WHERE slug = 'lyon'),
    'リヨン 2区',
    NULL, NULL, NULL,
    '["https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"employment_type":"part_time","category":"restaurant_hotel","salary_period":"hourly","hours_per_week":20,"language_requirements":["ja"],"remote_ok":false,"experience_required":false,"audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '50 days',
    '2026-04-18T19:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000003-0000-0000-0000-000000000003',
    'job'::community_post_kind,
    '33333333-3333-3333-3333-333333333305',
    'ボルドー シャトー試飲会、案内係 (週末、5-10 月)',
    E'私が共同運営しているボルドー Chartrons のワインアトリエで、週末の日本人観光客試飲会の案内係を募集します。

- 業務: 受付、案内、簡単な日本語通訳 (フランス語ソムリエがメイン)、片付け
- 勤務: 土・日のみ、10:00-17:00 (7 時間)
- 給与: €15/時 + 試飲ワイン 1 杯
- 必要: 日本語ネイティブ、フランス語 basic 以上 (挨拶程度)、ワイン好き
- 期間: 2026/5 月-10 月、月 2-4 日 (希望ベース)
- 場所: Rue Notre-Dame、トラム B 線 Chartrons 徒歩 3 分

学生・主婦・移住検討者歓迎。ワインに詳しくなりたい方どうぞ。',
    (SELECT id FROM cities WHERE slug = 'bordeaux'),
    'ボルドー Chartrons',
    15, 'EUR', 'hourly',
    '["https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"employment_type":"casual","category":"restaurant_hotel","salary_period":"hourly","hours_per_week":14,"language_requirements":["ja","fr"],"remote_ok":false,"experience_required":false,"audience":"both"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '55 days',
    '2026-04-25T15:00:00+02:00'::timestamptz, true
  ),

  -- ───────── group ×4 ─────────
  (
    'c0000004-0000-0000-0000-000000000001',
    'group'::community_post_kind,
    '33333333-3333-3333-3333-333333333303',
    '在仏邦人 こども日本語補習会 (4 月開始、土曜午前)',
    E'パリ在住の駐在員・永住者の子ども向け、日本語補習会を 4 月から始めました。現在 8 家族、子ども 11 人。

- 対象: 6-12 歳 (小学生)、日本語家庭での会話レベルがある子
- 頻度: 毎週土曜 9:30-11:30 (2 時間)
- 場所: パリ 7区 École Militaire 近く、会員制スペース
- 月謝: €60/月 (子 1 人)、兄弟は 2 人目以降 €40
- 内容: 漢字練習、音読、簡単な作文、文化授業 (年中行事)
- 講師: 私 + 元日本人学校教師 1 名
- 5 月の空き: 2 家族募集中

体験会 (無料) を 5/24 (土) 10:00 から実施。Locore メッセージで申し込んでください。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 7区 École Militaire',
    60, 'EUR', 'monthly',
    '["https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"parenting","meeting_frequency":"weekly","skill_level":"any","group_size":12,"age_range":"6-12歳","audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '85 days',
    '2026-04-05T09:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000004-0000-0000-0000-000000000002',
    'group'::community_post_kind,
    '33333333-3333-3333-3333-333333333302',
    '6 月の朝活ランニング Bois de Vincennes (毎週水曜 6:30)',
    E'シェフ修行の私が「夜遅い仕事の体力作り」として朝ランニングサークルを 6 月から始めます。仕事終わりに飲みすぎる料理人仲間との「強制リセット」目的でもあり。

- 場所: パリ 12区 Bois de Vincennes 入口、Château de Vincennes 駅集合
- 頻度: 毎週水曜 6:30-7:30 (1 時間)、悪天候時はキャンセル
- ペース: キロ 5:30-6:30 (初心者 OK、5km 完走できる人)
- 参加費: 無料
- 集合後: コーヒー組と帰宅組に分かれる (コーヒーは Café Vincennes、€3 自費)
- 言語: 日本語メイン、フランス人パートナー同伴 OK
- 6 月の参加者: 現在 4 人、最大 8 人まで募集

シェフ・パン職人・カフェ業界の朝が早い人、駐妻の早起き派、歓迎。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 12区 Bois de Vincennes',
    NULL, NULL, NULL,
    '["https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"sport","meeting_frequency":"weekly","skill_level":"beginner","group_size":8,"age_range":"20代〜40代","audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '70 days',
    '2026-05-13T07:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000004-0000-0000-0000-000000000003',
    'group'::community_post_kind,
    '33333333-3333-3333-3333-333333333304',
    'リヨン 自転車整備ワークショップ (毎月第 3 土曜)',
    E'私の工房で毎月第 3 土曜の午後、自転車整備のワークショップを開いています。「自分の自転車を自分で直せるようになる」が目的。

- 場所: リヨン 4区 Rue Pasteur 12、私の工房
- 頻度: 毎月第 3 土曜 14:00-17:00 (3 時間)
- 参加費: €25/回 (工具・部品代込み)、自転車は自分のを持参
- 内容 (月替わり):
  - 5 月: ブレーキ調整 + パッド交換
  - 6 月: チェーン清掃 + 注油
  - 7 月: パンク修理 + チューブ交換
  - 8 月: バカンスにつき休み
  - 9 月: ディレイラー調整
- 言語: 日本語 OK、仏語 conversation 推奨 (混在グループのため)
- 定員: 6 人

予約制、Locore メッセージで前週木曜まで。コーヒー (私の焙煎) サービス付き。',
    (SELECT id FROM cities WHERE slug = 'lyon'),
    'リヨン 4区 Croix-Rousse',
    25, 'EUR', 'per_session',
    '["https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"hobby","meeting_frequency":"monthly","skill_level":"beginner","group_size":6,"age_range":"全年代","audience":"both"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '90 days',
    '2026-04-12T11:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000004-0000-0000-0000-000000000004',
    'group'::community_post_kind,
    '33333333-3333-3333-3333-333333333305',
    'ボルドー シャトー試飲ツアー 5 月 (1 日、4 人限定)',
    E'私の運営するワインアトリエで企画する、シャトー試飲ツアー。5 月の週末に 4 人限定の小規模で。

- 日程: 5/31 (土)、9:00-17:00
- 内容: ボルドー Chartrons から車で Médoc → Saint-Julien のシャトー 2 件訪問 + Pauillac でランチ
- シャトー: Château Lynch-Bages (Grand Cru Classé) + Château Saint-Pierre
- 試飲: 各シャトーで 4-5 種、計 9 種
- ランチ: Pauillac の地元レストラン、Sauternes ペアリング付き €45 (別払い、各自精算)
- 料金: €280/人 (車送迎・シャトー入場・通訳すべて込み)
- 集合: ボルドー Quinconces 9:00、解散 17:00 同所
- 定員: 4 人限定 (車 1 台分)
- 5 月の残: 2 席

日本人観光客 / 移住検討者向け。リピーターは €30 off。',
    (SELECT id FROM cities WHERE slug = 'bordeaux'),
    'ボルドー → Médoc',
    280, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"category":"hobby","meeting_frequency":"one_off","skill_level":"any","group_size":4,"age_range":"30代〜60代","audience":"traveler"}'::jsonb,
    'active'::community_post_status,
    'email_direct', 'moc05.tour.sample@locore.test',
    now() + interval '15 days',
    '2026-05-06T10:00:00+02:00'::timestamptz, true
  ),

  -- ───────── lesson ×3 ─────────
  (
    'c0000005-0000-0000-0000-000000000001',
    'lesson'::community_post_kind,
    '33333333-3333-3333-3333-333333333303',
    'フランス語会話 月 2 回 1on1 (中級向け、駐妻・駐夫向け)',
    E'通訳業の合間に、フランス語会話の 1on1 レッスンを募集しています。完全に対面 (パリ 7区) のみ、オンライン不可。

- 対象: 中級 (B1-B2 目安)、簡単な会話はできるが「お役所手続き / 学校面談 / 医者と話す」で詰まる人
- 頻度: 月 2 回、1 回 90 分
- 料金: €70/回 (€140/月)、カフェ代別
- 場所: パリ 7区 École Militaire 周辺のカフェ
- 内容: 受講者の「今月の困りごと」をネタにロールプレイ
- 言語: フランス語 + 日本語フォロー
- 講師経歴: 通訳業 8 年、駐妻時代の苦労を経験済

5 月の空き: 2 名募集中。体験 (45 分 €35) も可。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 7区',
    70, 'EUR', 'per_session',
    '["https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"side":"teach","format":"in_person","level":"intermediate","trial_available":true,"max_students":1,"category":"language","audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'email_direct', 'moc03.lesson.sample@locore.test',
    now() + interval '110 days',
    '2026-04-08T11:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000005-0000-0000-0000-000000000002',
    'lesson'::community_post_kind,
    '33333333-3333-3333-3333-333333333301',
    '子連れママのフランス家庭料理教室 (月 1 回、3 区)',
    E'マレ在住の私 (高橋まりか) が、月 1 回自宅で開く家庭料理教室。子どもを連れて来てもらって OK、隣の部屋で遊ばせながら大人 4 人で料理する形式。

- 内容: フランス家庭料理 (ブッフ・ブルギニョン / ラタトゥイユ / クラフティ など)
- 頻度: 月 1 回、第 2 日曜 10:00-13:00
- 料金: €55/回 (材料・試食ランチ込み)
- 場所: パリ 3区 私の自宅 (子供スペース完備)
- 子連れ: 0-8 歳 OK (本人と一緒に作るのも歓迎)
- 定員: 大人 4 人 (5 月は満席、6 月以降 2 席空き)
- 持ち物: エプロン

子育てで料理する時間が削れている駐妻仲間向け。月 1 だけ「自分のための時間」を作るコンセプト。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ 3区 Le Marais',
    55, 'EUR', 'per_session',
    '["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"side":"teach","format":"in_person","level":"beginner","trial_available":false,"max_students":4,"category":"cooking","audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '115 days',
    '2026-04-20T16:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000005-0000-0000-0000-000000000003',
    'lesson'::community_post_kind,
    '33333333-3333-3333-3333-333333333305',
    'ワインテイスティング初級講座 (4 回コース)',
    E'ボルドー Chartrons のワインアトリエで開催する、初級者向けテイスティング講座。観光客 / 移住検討者向け。

- 内容: 全 4 回コース (各 2 時間)
  - 1 回目: テイスティングの基本動作、色・香り・味の表現
  - 2 回目: Bordeaux 左岸 (Médoc) 主要 4 アペラシオン
  - 3 回目: Bordeaux 右岸 (Saint-Émilion・Pomerol)
  - 4 回目: Sauternes と食事ペアリング
- 頻度: 週 1 回、土曜 14:00-16:00 の 4 週間
- 料金: €240/コース (4 回、計 16 種試飲込み)
- 単発受講: 不可
- 場所: ボルドー Chartrons の私のアトリエ
- 定員: 6 人 / クラス
- 次回開講: 2026/6/7 (土)〜6/28 (土)
- 言語: 日本語

ワインを「真面目に分かる」ようになりたい方向け。',
    (SELECT id FROM cities WHERE slug = 'bordeaux'),
    'ボルドー Chartrons',
    240, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"side":"teach","format":"in_person","level":"beginner","trial_available":false,"max_students":6,"category":"other","audience":"both"}'::jsonb,
    'active'::community_post_status,
    'email_direct', 'moc05.lesson.sample@locore.test',
    now() + interval '120 days',
    '2026-05-01T12:00:00+02:00'::timestamptz, true
  ),

  -- ───────── mutual_aid ×2 ─────────
  (
    'c0000006-0000-0000-0000-000000000001',
    'mutual_aid'::community_post_kind,
    '33333333-3333-3333-3333-333333333302',
    '成田 5 月 28 日 ⇄ パリ便、荷物受け渡し希望 (3 kg 程度)',
    E'5/28 (木) の成田発 13:30 → パリ CDG 着 18:00 (Air France 273 便) で帰国予定の方を探しています。荷物 3 kg 程度を運んでもらえないでしょうか。

- 荷物内容: 母から預かるお茶・お菓子・書類 (税関申告不要レベル)
- 重量: 3 kg、書類サイズの紙袋 1 個
- 渡し方: 成田の出発ロビー (T1) で 12:00 集合
- 受け取り: CDG T2E 到着ロビーで私が待機
- 御礼: €40 + 帰国時の手土産 (お菓子)
- 私: パリ 11 区在住、シェフ修行 4 年目の男性

もしくは私が CDG → 成田で何か運ぶことで貸し借りにしてもよいです。Locore メッセージで気軽に連絡ください。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '成田 ⇄ CDG',
    40, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"request_type":"need","urgency":"this_week","compensation":"small_thanks","category":"transport","audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '10 days',
    '2026-05-18T20:00:00+02:00'::timestamptz, true
  ),
  (
    'c0000006-0000-0000-0000-000000000002',
    'mutual_aid'::community_post_kind,
    '33333333-3333-3333-3333-333333333304',
    'リヨン 医療予約 (Doctolib) の代行手伝い (御礼 €15 程度)',
    E'リヨン在住で、医療予約システム Doctolib の使い方が分からない方を、私が代行で手伝います。地元の友人が「ようやく日本人 spécialiste 医を見つけて予約できた」と感謝してくれたのがきっかけで、もう少し広く募集することに。

- 内容: Doctolib アカウント開設、希望分野 (一般医・歯科・婦人科・小児科) の医師検索、予約まで代行
- 所要時間: 30-60 分 (1 件あたり)
- 御礼: €15 + コーヒー 1 杯 (私の店で焙煎したもの)
- 場所: リヨン 4 区の私の工房、または希望者の自宅 (リヨン市内のみ)
- 言語: 仏語 conversation 以下の方歓迎
- 注意: 私は医療通訳の資格は持っていないので、診察当日の通訳は別途専門家にお願いしてください

最初の 5 件は無料 (€15 御礼不要) です。フランス語の壁で医療アクセスを諦めないでほしいです。',
    (SELECT id FROM cities WHERE slug = 'lyon'),
    'リヨン市内',
    15, 'EUR', 'fixed',
    '["https://images.unsplash.com/photo-1542884748-2b87b36c6b90?w=1600&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&auto=format&fit=crop&q=80"]'::jsonb,
    '{"request_type":"offer","urgency":"flexible","compensation":"small_thanks","category":"admin_help","audience":"resident"}'::jsonb,
    'active'::community_post_status,
    'locore_message', NULL,
    now() + interval '14 days',
    '2026-05-09T11:30:00+02:00'::timestamptz, true
  );


-- =========================================================================
-- 5. auth.users 同期 (共通パスワード TestPass!2026)
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
      '33333333-3333-3333-3333-333333333301',
      '33333333-3333-3333-3333-333333333302',
      '33333333-3333-3333-3333-333333333303',
      '33333333-3333-3333-3333-333333333304',
      '33333333-3333-3333-3333-333333333305'
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
-- 動作確認用 SELECT (必要に応じて手動実行)
-- =========================================================================
--
-- SELECT id, display_name, residency_city, role
--   FROM users WHERE is_sample = true ORDER BY id;
--
-- SELECT a.id, a.title, a.article_type, c.slug AS city
--   FROM articles a JOIN cities c ON c.id = a.city_id
--   WHERE a.is_sample = true ORDER BY a.published_at DESC;
--
-- SELECT article_id, COUNT(*) AS spot_count
--   FROM spots WHERE is_sample = true GROUP BY article_id;
--
-- SELECT kind, COUNT(*) FROM community_posts
--   WHERE is_sample = true GROUP BY kind ORDER BY kind;
