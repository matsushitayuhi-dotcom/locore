-- 0054_moc_casual_users_and_services.sql
--
-- MOC プレビューに「カジュアル層」5 ユーザーを追加。
-- 留学生 / ワーホリ / モデルコース作成者 / 越境ライフ等、
-- 0051 の駐妻・シェフ・通訳とは違う角度の人物像。
--
-- 各ユーザーに 5 サービスずつ計 25 件。料金帯は学生層に届くよう
-- ¥3,000〜¥25,000 を中心に。
--
-- 全行 is_sample = true / ON CONFLICT DO UPDATE で冪等。
-- 0051 と同じパスワード TestPass!2026 で auth 同期。

BEGIN;

-- =========================================================================
-- 0. 5 ユーザー (moc06〜moc10)
-- =========================================================================

INSERT INTO users (
  id, email, display_name, avatar_url, bio, role,
  home_country, home_region, residency_country, residency_city,
  arrival_year, family_stage, occupation,
  languages, interests, looking_for, open_to_meetups,
  is_sample
) VALUES
-- ─────────────────────────────────────────────
-- moc06 吉田 さくら @ パリ Sciences Po 留学 1 年目、22 歳
-- ─────────────────────────────────────────────
(
  '33333333-3333-3333-3333-333333333306',
  'moc06.sample@locore.test',
  '吉田 さくら',
  'https://i.pravatar.cc/300?img=47',
  E'Sciences Po 1 年目、パリ 6 区在住。22 歳。学生街と安カフェに詳しいので、節約しながらでも本場のパリを味わいたい旅行者向けにカジュアルな街案内をやっています。日本の友人が遊びに来るたびに 3 日間アテンドしているうちにサービス化しました。',
  'resident_writer',
  'JP', '愛知県',
  'FR', 'パリ',
  2025, 'single', '大学院生 (Sciences Po)',
  '[
    {"code":"ja","level":"native"},
    {"code":"fr","level":"business"},
    {"code":"en","level":"business"}
  ]'::jsonb,
  '["カフェ","古本","写真","学生街","公共交通"]'::jsonb,
  '["日本人留学生コミュニティ","インターン情報","格安マルシェ"]'::jsonb,
  true,
  true
),
-- ─────────────────────────────────────────────
-- moc07 田中 健太 @ マルセイユ ワーホリ、26 歳、サーフィン
-- ─────────────────────────────────────────────
(
  '33333333-3333-3333-3333-333333333307',
  'moc07.sample@locore.test',
  '田中 健太',
  'https://i.pravatar.cc/300?img=68',
  E'マルセイユ在住、ワーホリ滞在 1 年半目の 26 歳。地元はサーフィン文化が強い湘南、フランスではカランクの海と地中海の風が気に入って延長中。日本人旅行者・ワーホリ希望者向けにビーチ + ドライブ + ローカル食堂をご案内します。',
  'resident_writer',
  'JP', '神奈川県',
  'FR', 'マルセイユ',
  2024, 'single', 'ワーホリ (カフェ勤務 + ガイド)',
  '[
    {"code":"ja","level":"native"},
    {"code":"fr","level":"conversation"},
    {"code":"en","level":"conversation"}
  ]'::jsonb,
  '["サーフィン","ドライブ","地中海料理","ナイトライフ","フェス"]'::jsonb,
  '["サーフ仲間","ワーホリ仲間","南仏移住経験者"]'::jsonb,
  true,
  true
),
-- ─────────────────────────────────────────────
-- moc08 佐藤 みく @ ニース モデルコースプランナー、28 歳、滞在 2 年目
-- ─────────────────────────────────────────────
(
  '33333333-3333-3333-3333-333333333308',
  'moc08.sample@locore.test',
  '佐藤 みく',
  'https://i.pravatar.cc/300?img=20',
  E'ニース在住 2 年目、28 歳。日本の旅行会社で添乗員を 4 年やったあと独立。コートダジュール全域のモデルコース作成と現地アテンドを SNS で受注しています。インスタ映え + 現地ローカルバランス重視、撮影スポットも提案。',
  'resident_writer',
  'JP', '東京都',
  'FR', 'ニース',
  2024, 'single', '旅程プランナー (フリーランス)',
  '[
    {"code":"ja","level":"native"},
    {"code":"fr","level":"conversation"},
    {"code":"en","level":"business"}
  ]'::jsonb,
  '["旅程作成","写真","コートダジュール","モナコ","SNS"]'::jsonb,
  '["旅行業ライセンス情報","リピート顧客","現地カメラマン"]'::jsonb,
  true,
  true
),
-- ─────────────────────────────────────────────
-- moc09 山本 大輔 @ パリ ENS 博士課程 3 年目、25 歳
-- ─────────────────────────────────────────────
(
  '33333333-3333-3333-3333-333333333309',
  'moc09.sample@locore.test',
  '山本 大輔',
  'https://i.pravatar.cc/300?img=33',
  E'ENS (École Normale Supérieure) 数学博士 3 年目、25 歳。パリのアカデミック界隈・古書店・科学博物館がフィールド。日本からの理系学生・研究者向けに「研究室訪問同行」「学会前後のパリ案内」もやります。逆に休日はノルマンディーに自転車で抜けます。',
  'resident_writer',
  'JP', '京都府',
  'FR', 'パリ',
  2023, 'single', '数学博士課程 (ENS Paris)',
  '[
    {"code":"ja","level":"native"},
    {"code":"fr","level":"business"},
    {"code":"en","level":"business"}
  ]'::jsonb,
  '["数学","古書","アカデミア","自転車","ノルマンディー"]'::jsonb,
  '["日本人研究者ネットワーク","共同研究先","数学リトリート参加者"]'::jsonb,
  true,
  true
),
-- ─────────────────────────────────────────────
-- moc10 鈴木 ゆう @ リール ワーホリ→定住 4 年目、30 歳
-- ─────────────────────────────────────────────
(
  '33333333-3333-3333-3333-333333333310',
  'moc10.sample@locore.test',
  '鈴木 ゆう',
  'https://i.pravatar.cc/300?img=12',
  E'北フランス・リール在住 4 年目、30 歳。ワーホリで来てそのまま現地パートナーと結婚して定住。ベルギー国境 30 分の地の利で、リール ⇄ ブリュッセル ⇄ ブリュージュの 1 日越境ツアーを得意としています。北仏のビール文化と炭鉱遺産にも詳しい。',
  'resident_writer',
  'JP', '福岡県',
  'FR', 'リール',
  2022, 'couple', 'カフェオーナー + ガイド',
  '[
    {"code":"ja","level":"native"},
    {"code":"fr","level":"business"},
    {"code":"nl","level":"conversation"}
  ]'::jsonb,
  '["北仏","ベルギー","ビール","産業遺産","越境旅"]'::jsonb,
  '["北仏移住検討者","ベルギービール輸入仲間","ワーホリ→定住経験者"]'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  role = EXCLUDED.role,
  home_country = EXCLUDED.home_country,
  home_region = EXCLUDED.home_region,
  residency_country = EXCLUDED.residency_country,
  residency_city = EXCLUDED.residency_city,
  arrival_year = EXCLUDED.arrival_year,
  family_stage = EXCLUDED.family_stage,
  occupation = EXCLUDED.occupation,
  languages = EXCLUDED.languages,
  interests = EXCLUDED.interests,
  looking_for = EXCLUDED.looking_for,
  open_to_meetups = EXCLUDED.open_to_meetups,
  is_sample = EXCLUDED.is_sample,
  updated_at = now();

-- =========================================================================
-- 1. writer_profiles (全員 tier B、residency_years は arrival_year から逆算)
-- =========================================================================

INSERT INTO writer_profiles (
  user_id, tier, residency_status, residency_country, residency_years,
  residency_verified_at, founding_member, is_sample
) VALUES
('33333333-3333-3333-3333-333333333306', 'B', 'current_resident', 'FR', 1, now() - interval '30 days',  true, true),
('33333333-3333-3333-3333-333333333307', 'B', 'current_resident', 'FR', 2, now() - interval '45 days',  true, true),
('33333333-3333-3333-3333-333333333308', 'A', 'current_resident', 'FR', 2, now() - interval '60 days',  true, true),
('33333333-3333-3333-3333-333333333309', 'B', 'current_resident', 'FR', 3, now() - interval '90 days',  true, true),
('33333333-3333-3333-3333-333333333310', 'A', 'current_resident', 'FR', 4, now() - interval '120 days', true, true)
ON CONFLICT (user_id) DO UPDATE SET
  tier = EXCLUDED.tier,
  residency_status = EXCLUDED.residency_status,
  residency_country = EXCLUDED.residency_country,
  residency_years = EXCLUDED.residency_years,
  residency_verified_at = EXCLUDED.residency_verified_at,
  founding_member = EXCLUDED.founding_member,
  is_sample = EXCLUDED.is_sample,
  updated_at = now();

-- =========================================================================
-- 2. user_services (各 5 件 = 25 件)
-- =========================================================================

-- ──────────────────────────────────────────────────────────────────────
-- moc06 吉田 さくら (パリ Sciences Po 留学生)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0006-0006-000000000001',
  '33333333-3333-3333-3333-333333333306',
  'パリ学生街 カジュアル散歩 (半日)',
  E'Sciences Po 留学生がご案内する、ガイドブックに載らないパリ学生街。\n\n- 集合: Saint-Michel 駅 14:00\n- ルート: ラテン区 → リュクサンブール公園 → サンジェルマン古本街\n- 学生御用達カフェ立ち寄り (1 杯おごります)\n- 半日 €40 (¥6,000) — 学生フレンドリー価格\n- 1〜3 名対応、女性 1 人旅も歓迎\n- 日本語',
  'tourism',
  6000,
  '/ 半日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0006-0006-000000000002',
  '33333333-3333-3333-3333-333333333306',
  'パリ 安宿・学生寮 選びアドバイス',
  E'パリ留学・短期滞在の住居選びに困った時に。私自身が 4 軒回って決めた経験から、地区別 / 価格別 / 治安別にアドバイスします。\n\n- 1 時間 ¥3,000 (Zoom)\n- 内容: Cité Universitaire / FIAP / 安アパートホテル / Airbnb の比較\n- 区別の治安マップ\n- 銀行口座開設 + Navigo 取得もカバー\n- 学生・ワーホリ・短期駐在のいずれも OK',
  'consulting',
  3000,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0006-0006-000000000003',
  '33333333-3333-3333-3333-333333333306',
  'カフェ巡り (古本街 + 学生カフェ 3 軒)',
  E'パリ 5/6 区のラテン区で、私が普段の勉強・読書に使うカフェ 3 軒を一緒に巡るカジュアルツアー。\n\n- 2 時間 €30 (¥4,500)\n- 各カフェでカフェクレーム 1 杯おごり込み\n- 古本街 (rue de l''Odéon 周辺) でも 1 軒立ち寄り\n- 雨天決行 (むしろ雨の日のラテン区が好きです)',
  'tourism',
  4500,
  '/ 2 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0006-0006-000000000004',
  '33333333-3333-3333-3333-333333333306',
  '節約パリ ショッピング案内 (Monoprix・Vide-Grenier)',
  E'お土産 / 自分用にリーズナブルにパリらしいものを買いたい人向けの案内。Monoprix の隠れた名品から週末の vide-grenier (蚤の市) まで。\n\n- 半日 €40 (¥6,000)\n- ルート: Monoprix Champs-Elysées → 11 区 vide-grenier (土日のみ) → エコ雑貨店\n- 5 区集合、メトロで移動\n- 予算別おすすめ品リスト (持ち帰れる紙メモ)',
  'tourism',
  6000,
  '/ 半日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0006-0006-000000000005',
  '33333333-3333-3333-3333-333333333306',
  'フランス留学 / 学生生活 相談',
  E'フランス留学を検討中の高校生・大学生 (または親御さん) 向けに、Sciences Po 在学生の視点で相談に乗ります。\n\n- 1 時間 ¥4,000 (Zoom or LINE 通話)\n- 内容: 大学選び / 仏語準備 / Campus France 手続き / 入学後のリアル / 学費・奨学金\n- 受験経験あり: Sciences Po, Sorbonne, Paris-Saclay\n- 親御さんとの 3 者通話も OK',
  'consulting',
  4000,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy, price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id, audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active, position = EXCLUDED.position,
  updated_at = now();

-- ──────────────────────────────────────────────────────────────────────
-- moc07 田中 健太 (マルセイユ ワーホリ)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0007-0007-000000000001',
  '33333333-3333-3333-3333-333333333307',
  'マルセイユ・カランク ビーチ同行 (1 日)',
  E'マルセイユ郊外のカランク (calanques) を 1 日かけて巡るビーチアテンド。普段サーファーが集まる入江もご紹介。\n\n- 集合: Vieux-Port 9:00\n- ルート: Sormiou → Morgiou → En-Vau (体力次第で 2-3 ヶ所)\n- 海水浴・シュノーケル可、シャワー道具持参\n- 1 名 ¥12,000 / カップル ¥18,000\n- 日本人 1-4 名、海慣れた方向け',
  'tourism',
  12000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'marseille'),
  'traveler',
  'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0007-0007-000000000002',
  '33333333-3333-3333-3333-333333333307',
  'プロヴァンス 1 日ドライブ (ラベンダー / アヴィニョン)',
  E'私の中古車 (清掃済み、4 人乗り) でプロヴァンスの内陸を 1 日ドライブ。\n\n- 6-7 月: ラベンダー畑シーズン (Valensole)\n- 通年: アヴィニョン / ゴルド村 / セナンク修道院\n- 集合: マルセイユ Saint-Charles 駅 8:30\n- 4 名乗り ¥35,000 (全員分、ガソリン代込み)\n- ランチは現地ピクニック or 村食堂\n- 日本人 4 名上限',
  'tourism',
  35000,
  '/ 1 日 (車 1 台)',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'marseille'),
  'traveler',
  'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0007-0007-000000000003',
  '33333333-3333-3333-3333-333333333307',
  'マルセイユ 路地食堂巡り (夜)',
  E'観光地化していないノアイユ・パニエ地区で、地元労働者が集まる食堂 3 軒を巡る夜ツアー。\n\n- 集合: 19:30 ノアイユ駅\n- ブイヤベース / クスクス / マグレブ料理\n- 各店 1 皿シェア (食事代込み ¥8,000)\n- アルコール別途\n- 1-4 名、女性 1 人参加歓迎 (私が同席するので安心)',
  'tourism',
  8000,
  '/ 1 名',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'marseille'),
  'traveler',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0007-0007-000000000004',
  '33333333-3333-3333-3333-333333333307',
  'フランス ワーホリビザ 取得・延長 相談',
  E'フランス ワーホリ申請から現地延長 / 学生ビザ転換まで、私自身の体験から相談に乗ります。\n\n- 1 時間 ¥4,000 (Zoom)\n- 内容: VFS 予約 / 必要書類 / 銀行残高証明 / フランス到着後の OFII / 滞在許可\n- ワーホリ→学生ビザ→就労ビザの 3 段階パターンも対応\n- LINE フォローアップ 2 週間無料',
  'consulting',
  4000,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'marseille'),
  'both',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0007-0007-000000000005',
  '33333333-3333-3333-3333-333333333307',
  '地中海 サンセット セーリング (友人船)',
  E'友人のヨット (10 m) で地中海を 3 時間クルージング。サンセット時間帯がおすすめ。\n\n- 集合: Vieux-Port 17:30 (夏季)、15:00 (冬季)\n- 4 名まで、1 人 ¥10,000\n- ドリンク + 軽食付き\n- 操船は友人 (キャプテン資格保有)、私は通訳兼アテンダント\n- 天候により延期あり、強風日は中止',
  'other',
  10000,
  '/ 1 名 3 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'marseille'),
  'traveler',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy, price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id, audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active, position = EXCLUDED.position,
  updated_at = now();

-- ──────────────────────────────────────────────────────────────────────
-- moc08 佐藤 みく (ニース モデルコースプランナー)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0008-0008-000000000001',
  '33333333-3333-3333-3333-333333333308',
  '南仏 1 週間モデルコース作成 (リモート)',
  E'コートダジュール全域 (ニース / モナコ / カンヌ / マントン / エズ / サン=ポール) の 1 週間旅程を、ご要望に合わせてカスタム作成します。\n\n- 完全リモート (Zoom 30 分ヒアリング + PDF 納品)\n- 1 件 ¥18,000 (1-4 名分、ホテル候補 + 食事 + 移動手段含む)\n- カップル / ファミリー / 1 人旅 / SNS 用旅 などタイプ別\n- 修正 2 回まで無料\n- 過去 60 件以上作成実績、平均 ★4.9',
  'consulting',
  18000,
  '/ 1 旅程',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'nice'),
  'traveler',
  'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0008-0008-000000000002',
  '33333333-3333-3333-3333-333333333308',
  'ニース 街歩き + 写真撮影 (3 時間)',
  E'ニース旧市街 + プロムナード・デ・ザングレを 3 時間で散歩しつつ、ポイントごとに私が写真を撮影 (持ち込みカメラ or スマホ可)。\n\n- 集合: マセナ広場 10:00\n- ルート: 旧市街 → 花市場 → 城跡 → プロムナード\n- 撮影 20-30 カット、JPG 加工納品 (撮影翌日)\n- 1 名 ¥9,000 / カップル ¥14,000\n- 雨天決行 (雨のニースもエモい)',
  'tourism',
  9000,
  '/ 3 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'nice'),
  'traveler',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0008-0008-000000000003',
  '33333333-3333-3333-3333-333333333308',
  'エズ村 + モナコ 日帰り (公共交通)',
  E'ニースから公共バス + 鉄道でエズ村 → モナコを 1 日かけて巡るアテンド。\n\n- 集合: ニース駅 9:00\n- 鷲の巣村エズで 2 時間 (アンティーク散策 + 海眺望)\n- モナコ・モンテカルロでカジノ前 + 王宮区\n- 1 名 ¥12,000 (公共交通代込み)\n- 帰着 18:30 頃\n- 食事はモナコの庶民派ピザ屋を予約',
  'tourism',
  12000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'nice'),
  'traveler',
  'https://images.unsplash.com/photo-1502921413853-19a6f88aa49e?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0008-0008-000000000004',
  '33333333-3333-3333-3333-333333333308',
  'コートダジュール ドライブ (カンヌ / マントン)',
  E'友人のレンタル車を借りて、コートダジュール西側 (カンヌ・サン=ポール) または東側 (マントン・国境越え) を 1 日ドライブ。\n\n- 4 名乗り ¥30,000 (車 + ガソリン + 高速代込み)\n- 集合 9:00 ニース駅、帰着 18:00\n- 西ルート: カンヌ → サン=ポール=ド=ヴァンス → グラース\n- 東ルート: マントン → ヴェンティミーリア (イタリア国境)\n- 食事はピクニック or 村食堂',
  'tourism',
  30000,
  '/ 1 日 (車 1 台)',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'nice'),
  'traveler',
  'https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0008-0008-000000000005',
  '33333333-3333-3333-3333-333333333308',
  'SNS 映え 写真スポット 案内 (2 時間)',
  E'Instagram / TikTok 用のロケ案内。事前にイメージを聞き取ってコースを組みます。\n\n- 2 時間 ¥7,000 (1 名)\n- ニース市内 5-8 スポット (秘密の小道含む)\n- 撮影は自分撮り or 私がスマホ操作\n- 衣装替えスポット (公衆トイレ / カフェ) も把握\n- 朝早めの集合がおすすめ (人少なく光綺麗)',
  'shooting',
  7000,
  '/ 2 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'nice'),
  'traveler',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy, price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id, audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active, position = EXCLUDED.position,
  updated_at = now();

-- ──────────────────────────────────────────────────────────────────────
-- moc09 山本 大輔 (パリ ENS 数学博士)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0009-0009-000000000001',
  '33333333-3333-3333-3333-333333333309',
  'パリ 理系大学 / 研究所 ツアー (半日)',
  E'ENS, Paris-Saclay, Polytechnique, Collège de France 等のパリ近郊理系機関を、現役博士課程学生がご案内。\n\n- 半日 ¥10,000\n- 1-2 機関を選んで訪問 (キャンパス見学 + 食堂体験)\n- 私の研究室訪問込み (アポ取り可)\n- 学会・大学院入試の前後におすすめ\n- 日本人 1-2 名、研究者・学生・進学検討者向け',
  'tourism',
  10000,
  '/ 半日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0009-0009-000000000002',
  '33333333-3333-3333-3333-333333333309',
  'フランス 博士課程進学 相談 (理系)',
  E'フランスの理系博士進学 (Cofund / 政府奨学金 / Bourse) について、自身の経験 (ENS, CNRS) から相談に乗ります。\n\n- 1 時間 ¥5,000 (Zoom)\n- 内容: 出願 / 推薦書 / 奨学金 / 生活費 / 研究室選び / 仏語水準\n- 数学 / 物理 / 情報科学 が得意領域、他分野も基本対応\n- 追加 15 分 ¥1,000',
  'consulting',
  5000,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0009-0009-000000000003',
  '33333333-3333-3333-3333-333333333309',
  'パリ 古書店 + 哲学書店 巡り (3 時間)',
  E'5 区・6 区の古書店、哲学書専門店、数学書店を巡る知的散歩。\n\n- 集合: Saint-Michel 14:00\n- ルート: Maison Gibert → Gibert Joseph → Compagnie → Vrin (哲学)\n- 私の好きな本を 5 冊紹介\n- 3 時間 ¥6,500\n- 1-3 名、本好き / 哲学好き / 数学好き',
  'tourism',
  6500,
  '/ 3 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0009-0009-000000000004',
  '33333333-3333-3333-3333-333333333309',
  '科学博物館 (Palais de la Découverte 等) 解説',
  E'パリの科学系博物館 (Palais de la Découverte / Musée des Arts et Métiers / Curie 博物館) を、研究者目線で解説しながら案内。\n\n- 2-3 時間 ¥7,500\n- 1 館を選択、入場料別途\n- 数学 / 物理 / 工学技術史をカバー\n- 子連れ歓迎 (子供向けに噛み砕いて解説可)\n- 学生 ¥6,000 (要証明)',
  'tourism',
  7500,
  '/ 2-3 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1571115332105-fb3b21c43dd0?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0009-0009-000000000005',
  '33333333-3333-3333-3333-333333333309',
  'ノルマンディー 自転車 Day Trip',
  E'夏季限定、パリから電車 + 自転車でノルマンディー海岸 (Trouville / Honfleur) を 1 日。\n\n- 集合: Saint-Lazare 7:30\n- 電車 2 時間 → レンタル自転車 25 km\n- 海岸ピクニック (パン・チーズ持参)\n- 1 名 ¥14,000 (電車代 + 自転車レンタル込み)\n- 体力次第で 2 ヶ所、ゆるめなら 1 ヶ所\n- 6-9 月限定',
  'tourism',
  14000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy, price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id, audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active, position = EXCLUDED.position,
  updated_at = now();

-- ──────────────────────────────────────────────────────────────────────
-- moc10 鈴木 ゆう (リール ワーホリ→定住)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0010-0010-000000000001',
  '33333333-3333-3333-3333-333333333310',
  'リール市内 + 旧市街 半日案内',
  E'北フランス・リールの旧市街 (Vieux Lille) と新市街を半日で歩いて巡ります。\n\n- 集合: Lille Flandres 駅 10:00\n- ルート: グランプラス → 旧証券取引所 → ファブリック地区 → ベルギー街\n- フランドル料理ランチ (carbonade flamande おすすめ)\n- 半日 ¥7,000\n- 1-3 名、まずパリから足を伸ばしたい人向け',
  'tourism',
  7000,
  '/ 半日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lille'),
  'traveler',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0010-0010-000000000002',
  '33333333-3333-3333-3333-333333333310',
  'ベルギー越境 1 日 (ブリュッセル + ブリュージュ)',
  E'リールから電車 30 分のベルギー側を 1 日まるごと。\n\n- 集合: Lille Europe 駅 8:00\n- 朝: ブリュッセル (グランプラス / マーグリット美術館)\n- 午後: ブリュージュ (運河 / マルクト広場)\n- ベルギービール 2 杯 + フリッツ込み (¥1,500 相当)\n- 1 名 ¥16,000 (電車代込み)\n- 帰着 21:00 頃',
  'tourism',
  16000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lille'),
  'traveler',
  'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0010-0010-000000000003',
  '33333333-3333-3333-3333-333333333310',
  '北仏 炭鉱遺産 + ルーヴル・ランス ツアー',
  E'ユネスコ世界遺産「北仏炭鉱遺跡」と Louvre-Lens 美術館 (パリのルーヴル分館) を 1 日で。\n\n- 集合: Lille Flandres 9:00\n- 鉄道 + バスで Lewarde 炭鉱博物館 → Lens 美術館\n- 1 名 ¥13,000\n- 産業史 / 移民史 / 現代美術に興味ある人向け\n- 月曜は美術館休、開催日は事前に確認',
  'tourism',
  13000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lille'),
  'traveler',
  'https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0010-0010-000000000004',
  '33333333-3333-3333-3333-333333333310',
  'ワーホリ→学生→就労ビザ 移行ロードマップ相談',
  E'ワーホリで来てそのままフランスで定住したい人向けに、私自身の体験から段階的なビザ移行を相談します。\n\n- 1 時間 ¥4,500 (Zoom)\n- ワーホリ→学生ビザ→就労ビザ or 配偶者ビザの 4 パターン\n- 北仏 / 越境通勤の特殊事情も対応\n- フランス採用市場の北部・カフェ業界の事情に詳しい',
  'consulting',
  4500,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lille'),
  'both',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0010-0010-000000000005',
  '33333333-3333-3333-3333-333333333310',
  '北仏・ベルギー ビール文化 体験 (夜)',
  E'リール旧市街 + ベルギービール専門バル 3 軒を巡る夜ツアー。私のカフェも 1 軒目に含む。\n\n- 集合: Vieux Lille 19:00\n- 3 軒で各グラス 1 杯 (¥5,000 相当の飲み代込み)\n- 北仏 IPA / ベルギー トラピスト / ランビック\n- 1 名 ¥9,500\n- 1-4 名、女性 1 人歓迎',
  'other',
  9500,
  '/ 1 名 3 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lille'),
  'both',
  'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy, price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id, audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active, position = EXCLUDED.position,
  updated_at = now();

-- =========================================================================
-- 3. auth.users 同期 (パスワード TestPass!2026)
--    0044 / 0051 と同じロジック
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
      '33333333-3333-3333-3333-333333333306',
      '33333333-3333-3333-3333-333333333307',
      '33333333-3333-3333-3333-333333333308',
      '33333333-3333-3333-3333-333333333309',
      '33333333-3333-3333-3333-333333333310'
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
-- 動作確認 SELECT
-- =========================================================================
--
-- SELECT id, display_name, residency_city, occupation
--   FROM users
--   WHERE id::text >= '33333333-3333-3333-3333-333333333306'
--     AND id::text <= '33333333-3333-3333-3333-333333333310';
--
-- SELECT u.display_name, COUNT(*) AS service_count
--   FROM user_services us JOIN users u ON u.id = us.user_id
--   WHERE us.id::text LIKE 'eeeeeeee-0000-001%'
--   GROUP BY u.display_name;
