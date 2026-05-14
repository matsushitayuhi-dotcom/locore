-- 0039_sample_residents_and_community.sql
--
-- 駐在員コミュニティのデモ用に、3 人のテストユーザーと、
-- 各人の記事 + コミュニティ投稿を一括投入する。
--
-- 構成:
--   - 3 人のテストユーザー（プロフィール拡張カラムも埋める）
--   - writer_profiles（在住確認済み / Founders 枠）
--   - 旅程プラン記事 ×3（body と photo_entries 両方記入済み）
--   - 駐在者情報記事 ×3（殺虫剤 / ビザ申請 / 安いモール）
--   - コミュニティ投稿 ×18（6 カテゴリ × 3 件）
--   - auth.users 同期（共通パスワード TestPass!2026 でログイン可）
--
-- 全行が is_sample=true で識別され、
--   DELETE FROM articles WHERE is_sample = true;
--   DELETE FROM community_posts WHERE is_sample = true;
--   DELETE FROM users WHERE is_sample = true;
-- で一括クリーンアップ可能。

BEGIN;

-- =========================================================================
-- 0. テストユーザー 3 人（決定 UUID で再実行に強い）
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
  -- ① 田中 みゆき @ パリ 5 年目、フリーランス写真家、子持ち
  -- ────────────────────────────────────────────────────────────
  (
    '11111111-1111-1111-1111-111111111101',
    'miyuki.sample@locore.test',
    '田中 みゆき',
    'https://i.pravatar.cc/300?img=47',
    'パリ 11 区在住 5 年目。フリーランスでカフェと食まわりを撮ってます。同じくらいの年齢の子を持つ住人さんと、平日昼間に会えたらうれしいです。',
    'resident_writer',
    'JP', '東京都',
    'FR', 'パリ',
    2021, 'family_kids', 'フリーランス写真家 / 食ライター',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"business"},
      {"code":"en","level":"conversation"}
    ]'::jsonb,
    '["カフェ巡り","写真","マルシェ・市場","子育て","美術館・ギャラリー","日本食料理"]'::jsonb,
    '["ママ友・パパ友","気軽な友達","趣味仲間（カルチャー）","日本食材の共同購入"]'::jsonb,
    true,
    true
  ),
  -- ────────────────────────────────────────────────────────────
  -- ② 佐藤 健太郎 @ パリ 8 年目、ワインバー経営、独身
  -- ────────────────────────────────────────────────────────────
  (
    '11111111-1111-1111-1111-111111111102',
    'kentaro.sample@locore.test',
    '佐藤 健太郎',
    'https://i.pravatar.cc/300?img=12',
    'パリ 9 区で小さなワインバーをやっています。土曜の朝はランニング。日本食材の共同購入を一緒にやってくれる人、絶賛募集中です。',
    'resident_writer',
    'JP', '大阪府',
    'FR', 'パリ',
    2018, 'single', '飲食 / ワインバー経営',
    '[
      {"code":"ja","level":"native"},
      {"code":"fr","level":"business"},
      {"code":"en","level":"business"},
      {"code":"it","level":"basic"}
    ]'::jsonb,
    '["ワイン","料理教室","音楽・ライブ","マラソン・ランニング","旅行"]'::jsonb,
    '["ビジネスパートナー","副業・案件","趣味仲間（スポーツ）","日本食材の共同購入"]'::jsonb,
    true,
    true
  ),
  -- ────────────────────────────────────────────────────────────
  -- ③ 山田 さくら @ パリ 2 年目、IT エンジニア、夫婦
  -- ────────────────────────────────────────────────────────────
  (
    '11111111-1111-1111-1111-111111111103',
    'sakura.sample@locore.test',
    '山田 さくら',
    'https://i.pravatar.cc/300?img=32',
    'パリ 15 区、夫の駐在で 2024 年に来ました。フルリモートで日本のスタートアップに勤めています。フランス語まだ初級なので、ゆるい言語交換できる人と仲良くなりたいです。',
    'resident_writer',
    'JP', '福岡県',
    'FR', 'パリ',
    2024, 'couple', 'ソフトウェアエンジニア（フルリモート）',
    '[
      {"code":"ja","level":"native"},
      {"code":"en","level":"business"},
      {"code":"fr","level":"basic"}
    ]'::jsonb,
    '["ハイキング","読書","スタートアップ","旅行","カフェ巡り"]'::jsonb,
    '["気軽な友達","ご近所さん","言語交換","ビジネスパートナー"]'::jsonb,
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
-- 1. writer_profiles（3 人とも在住確認済み・Founders 適用）
-- =========================================================================

INSERT INTO writer_profiles (
  user_id, tier, residency_status, residency_country, residency_years,
  residency_verified_at, commission_rate_pct,
  founding_member, founding_joined_at, founding_status,
  bio, is_sample
)
VALUES
  (
    '11111111-1111-1111-1111-111111111101',
    'S', 'current_resident', 'FR', 5,
    now() - interval '60 days', 10,
    true, now() - interval '90 days', 'approved'::founding_status,
    'パリ 11 区在住 5 年。食まわりのストーリーが得意。',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    'S', 'current_resident', 'FR', 8,
    now() - interval '100 days', 10,
    true, now() - interval '95 days', 'approved'::founding_status,
    'パリでワインバーを経営。仏ワインと日本酒の融合担当。',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    'A', 'current_resident', 'FR', 2,
    now() - interval '30 days', 15,
    false, NULL, NULL,
    '駐在 2 年目。生活の実務情報を中心に書きます。',
    true
  )
ON CONFLICT (user_id) DO UPDATE SET
  tier                 = EXCLUDED.tier,
  residency_status     = EXCLUDED.residency_status,
  residency_country    = EXCLUDED.residency_country,
  residency_years      = EXCLUDED.residency_years,
  residency_verified_at= EXCLUDED.residency_verified_at,
  commission_rate_pct  = EXCLUDED.commission_rate_pct,
  founding_member      = EXCLUDED.founding_member,
  founding_status      = EXCLUDED.founding_status,
  bio                  = EXCLUDED.bio,
  updated_at           = now();


-- =========================================================================
-- 2. 旅程プラン記事 ×3（body + photo_entries 両方記入）
-- =========================================================================

-- ─── ① みゆきさんの「パリの朝、3 時間だけの 6 区」──────────────────
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
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111101',
  (SELECT id FROM cities WHERE slug = 'paris'),
  'パリの朝、3 時間だけの 6 区 — クロワッサンから始める日曜の散歩',
  E'## 想定読者\n6 区を「観光地として」ではなく、「住人の日曜の朝として」歩いてみたい人向けです。\n\nオデオン駅から始めて、Saint-Sulpice の広場、リュクサンブール公園の北端まで、ベンチで休む時間を含めて 3 時間。\n\n持ち物は、現金少々（パン屋に最適化）、軽い水筒、上着 1 枚（朝の公園は思ったより冷えます）。',
  E'## 各ブロックの詳細\n\n### 8:30 — Pierre Hermé 本店ではなく、その斜向かいの Aux Merveilleux\nメレンゲ菓子の専門店。日曜の朝でも 9 時には行列ができますが、8:30 ならまだ並びません。Merveilleux 1 個と、温かいバゲットの切れ端をテイクアウトして公園のベンチへ。\n\n### 9:00 — Saint-Sulpice 広場の噴水で\nまだ観光客が少ない時間帯。広場の南東角のベンチに座ると、噴水越しに教会のファサードが綺麗に見えます。ここで Merveilleux を食べます。\n\n### 9:45 — Rue de Tournon を北へ\n本屋とアンティーク家具屋がぽつぽつあるストリート。日曜は半分閉まっていますが、ショーウィンドウを見ながら歩くだけで楽しいです。\n\n### 10:15 — リュクサンブール公園の北端\nテニスコート横のベンチが穴場。ジョギング中のパリジャンを眺めながら 30 分。\n\n### 11:00 — Café Le Rostand で締め\n公園の北東角、Place Edmond Rostand 沿い。エスプレッソとカフェクレームの両方を頼んで、ガラス越しに公園を見て解散。',
  'classic',
  'itinerary'::article_type,
  'https://picsum.photos/seed/locore-itin-miyuki/1280/800',
  1300,
  'published'::article_status,
  '2026-05-02T08:00:00+02:00',
  'few_hours'::article_duration,
  ARRAY['6区','日曜の朝','散歩','3時間','カフェ','公園'],
  '[
    {
      "id":"tmp-1","startTime":"08:30","endTime":"09:00",
      "freeName":"Aux Merveilleux de Fred (6e)",
      "notes":"Merveilleux 1 個 €2.80。バゲットの切れ端は €0.50 程度",
      "transportToNext":"walk","travelMinutesAfter":8
    },
    {
      "id":"tmp-2","startTime":"09:00","endTime":"09:40",
      "freeName":"Place Saint-Sulpice 南東角のベンチ",
      "notes":"噴水越しに教会ファサードが見える。日曜 9 時前は人少なめ",
      "transportToNext":"walk","travelMinutesAfter":5
    },
    {
      "id":"tmp-3","startTime":"09:45","endTime":"10:10",
      "freeName":"Rue de Tournon を北へ",
      "notes":"本屋・骨董屋のショーウィンドウ。日曜の朝は半分閉店",
      "transportToNext":"walk","travelMinutesAfter":5
    },
    {
      "id":"tmp-4","startTime":"10:15","endTime":"10:55",
      "freeName":"Jardin du Luxembourg 北東",
      "notes":"テニスコート横のベンチ。ジョギング客を眺める",
      "transportToNext":"walk","travelMinutesAfter":3
    },
    {
      "id":"tmp-5","startTime":"11:00","endTime":"11:45",
      "freeName":"Café Le Rostand",
      "notes":"エスプレッソ €2.60、カフェクレーム €5.20。窓側を狙う"
    }
  ]'::jsonb,
  '[
    {"imageUrl":"https://picsum.photos/seed/locore-itin-miyuki-1/960/1200","caption":"8:30 の Aux Merveilleux。日曜の朝、まだ並ばずに買える数少ない時間帯。","locationName":"Aux Merveilleux de Fred","position":0},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-miyuki-2/960/1200","caption":"広場の南東角のベンチ。噴水越しに教会のファサードが綺麗に見える。","locationName":"Place Saint-Sulpice","position":1},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-miyuki-3/960/1200","caption":"Rue de Tournon の半分閉まったアンティーク屋。ショーウィンドウだけで満腹。","locationName":"Rue de Tournon","position":2},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-miyuki-4/960/1200","caption":"リュクサンブール公園の北端。テニスコート横のベンチが穴場。","locationName":"Jardin du Luxembourg","position":3},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-miyuki-5/960/1200","caption":"Café Le Rostand のカフェクレーム €5.20。公園を見下ろす窓側で締め。","locationName":"Café Le Rostand","position":4}
  ]'::jsonb,
  true
);

-- ─── ② 健太郎さんの「ワイン好きと歩く 1 日 — 11 区から 3 区まで」───
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
  'aaaaaaaa-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111102',
  (SELECT id FROM cities WHERE slug = 'paris'),
  'ワイン好きと歩く 1 日 — 11 区のカーヴから 3 区のビストロまで',
  E'## 想定読者\nパリで「ワインバーをハシゴしてみたいけど、どこから入ればいいか分からない」人向け。観光ワインバーは避けて、地元客が普通に飲みに来ている店だけを選びました。\n\n4 軒回って、1 軒あたりグラス 2 杯 + 軽いつまみで €25 前後。歩き疲れない順路にしてあります。',
  E'## 各カーヴ・ビストロの詳細\n\n### 11:30 — Café du Coin（11 区、Rue de Charonne）\n看板はカフェですが、奥の小さなカーヴで実は南仏の自然派ワインを 80 種くらい置いています。ランチプリフィックスが €18 で、白 1 杯ついてきます。\n\n### 14:00 — Septime La Cave（11 区、Rue Basfroi）\nミシュラン 1 つ星の Septime のカジュアル版。立ち飲みカウンターで、Cyril 渾身のヴァン・ナチュールが €6/glass から。チーズは Comté を 1 切れだけ頼んでください。\n\n### 16:00 — Le Mary Celeste（3 区、Rue Commines）\nマレの北、サン・マルタン運河寄り。カクテルバーですが、シャンパーニュの品揃えが意外と良い。テラスで 1 杯休憩。\n\n### 18:30 — La Buvette（11 区に戻る、Rue Saint-Maur）\n女性オーナーが自然派しか置かない超小さな店。10 席。19 時を過ぎると入れないので、必ず予約か早めに。',
  'classic',
  'itinerary'::article_type,
  'https://picsum.photos/seed/locore-itin-kentaro/1280/800',
  1500,
  'published'::article_status,
  '2026-04-28T18:00:00+02:00',
  'full_day'::article_duration,
  ARRAY['ワイン','11区','3区','自然派','カーヴ','大人の散歩'],
  '[
    {
      "id":"tmp-w1","startTime":"11:30","endTime":"13:30",
      "freeName":"Café du Coin",
      "notes":"ランチプリフィックス €18（白 1 杯付き）。奥のカーヴから 1 本選んで持ち込み可",
      "transportToNext":"walk","travelMinutesAfter":12
    },
    {
      "id":"tmp-w2","startTime":"14:00","endTime":"15:30",
      "freeName":"Septime La Cave",
      "notes":"立ち飲み。ヴァン・ナチュール €6〜。Comté 1 切れだけ頼む",
      "transportToNext":"metro","transportNote":"M8 Ledru-Rollin → République 乗換 → Filles du Calvaire","travelMinutesAfter":18
    },
    {
      "id":"tmp-w3","startTime":"16:00","endTime":"17:30",
      "freeName":"Le Mary Celeste",
      "notes":"テラスでシャンパーニュ 1 杯休憩。€14 前後",
      "transportToNext":"walk","travelMinutesAfter":20
    },
    {
      "id":"tmp-w4","startTime":"18:30","endTime":"21:30",
      "freeName":"La Buvette",
      "notes":"10 席のみ。要予約。Camille さんに「カウンター 1 人」で OK"
    }
  ]'::jsonb,
  '[
    {"imageUrl":"https://picsum.photos/seed/locore-itin-kentaro-1/960/1200","caption":"Café du Coin のランチプリフィックス。サラドリヨネーズ + 白グラス。","locationName":"Café du Coin","position":0},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-kentaro-2/960/1200","caption":"Septime La Cave の立ち飲みカウンター。グラスのラインアップが毎日変わる。","locationName":"Septime La Cave","position":1},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-kentaro-3/960/1200","caption":"3 区マレの北、Le Mary Celeste のテラス。日が長い 5 月は 21 時まで明るい。","locationName":"Le Mary Celeste","position":2},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-kentaro-4/960/1200","caption":"La Buvette、19 時には満席。10 席の自然派ワインバー。","locationName":"La Buvette","position":3}
  ]'::jsonb,
  true
);

-- ─── ③ さくらさんの「初パリ、半日で 1 区から 4 区まで」（インスタ型主軸）───
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
  'aaaaaaaa-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111103',
  (SELECT id FROM cities WHERE slug = 'paris'),
  '初パリの半日 — 1 区から 4 区へ、観光地を 4 つだけ「正しく」',
  E'## 想定読者\nパリに着いた翌日、時差ボケ気味で「ルーヴルとマレと…どう繋げばいいの？」となっている人向け。\n\n半日で 4 つだけ、ただし「正しい時間帯」で回ると、全然違う体験になります。歩く距離は約 3 km、平らです。',
  E'## なぜこの順番か\n\n**1. ルーヴル（9:00）** — 9 時開館。最初の 30 分は本当に人がいません。とくに地下のメトロ入口は午後の半分以下。\n\n**2. パレ・ロワイヤルの中庭（10:30）** — 観光客がほぼ来ない、地元のパリジャンの抜け道。Buren の縞模様の柱で写真を撮る人くらい。\n\n**3. Rue Montorgueil（12:00）** — 歩行者天国の市場通り。ランチをここで。Compagnie Generale de Biscuiterie の塩バターサブレを必ず買ってください。\n\n**4. マレ地区 Rue des Rosiers（14:00）** — ファラフェル「L\'As du Fallafel」の行列は午後 2 時が一番短い。€11。\n\n午後 3 時半に解散して、ホテルで仮眠してください。これが時差ボケに勝つ唯一の方法です。',
  'photo_journal',
  'itinerary'::article_type,
  'https://picsum.photos/seed/locore-itin-sakura/1280/800',
  1200,
  'published'::article_status,
  '2026-05-10T15:00:00+02:00',
  'half_day'::article_duration,
  ARRAY['初パリ','半日','時差ボケ','1区','4区','ファラフェル'],
  '[
    {
      "id":"tmp-s1","startTime":"09:00","endTime":"10:15",
      "freeName":"ルーヴル美術館",
      "notes":"9 時開館。地下メトロ入口から入ると並ばない。サモトラケのニケまで一直線",
      "transportToNext":"walk","travelMinutesAfter":8
    },
    {
      "id":"tmp-s2","startTime":"10:30","endTime":"11:30",
      "freeName":"Palais Royal の中庭",
      "notes":"Buren の縞柱で写真。北の回廊は古い香水屋が静か",
      "transportToNext":"walk","travelMinutesAfter":12
    },
    {
      "id":"tmp-s3","startTime":"12:00","endTime":"13:30",
      "freeName":"Rue Montorgueil",
      "notes":"L\'Escargot Montorgueil か Compagnie Generale でランチ。塩バターサブレを必ず買う",
      "transportToNext":"walk","transportNote":"Rue Etienne Marcel 東へ","travelMinutesAfter":15
    },
    {
      "id":"tmp-s4","startTime":"14:00","endTime":"15:30",
      "freeName":"L\'As du Fallafel (Rue des Rosiers)",
      "notes":"€11 のファラフェル。午後 2 時が行列の谷"
    }
  ]'::jsonb,
  '[
    {"imageUrl":"https://picsum.photos/seed/locore-itin-sakura-1/960/1200","caption":"9 時前のルーヴル前広場。これが一番空いている時間。","locationName":"ルーヴル美術館","position":0},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-sakura-2/960/1200","caption":"サモトラケのニケへ最短ルートで。観光客が増える前に。","locationName":"Musée du Louvre 地下","position":1},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-sakura-3/960/1200","caption":"Palais Royal、Buren の縞模様の柱。地元のパリジャンも普通に通る抜け道。","locationName":"Palais Royal","position":2},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-sakura-4/960/1200","caption":"Rue Montorgueil の市場通り。塩バターサブレ €4.50 を片手にぶらぶら。","locationName":"Rue Montorgueil","position":3},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-sakura-5/960/1200","caption":"L\'As du Fallafel €11。並んだ甲斐ある。15 分で食べ終わる。","locationName":"Rue des Rosiers","position":4},
    {"imageUrl":"https://picsum.photos/seed/locore-itin-sakura-6/960/1200","caption":"マレの石畳。午後の柔らかい光がパリらしい。これで時差ボケの 1 日は終了。","locationName":"Le Marais","position":5}
  ]'::jsonb,
  true
);


-- =========================================================================
-- 3. 駐在者情報記事 ×3
-- =========================================================================

-- ─── ① 殺虫剤ここで買えた（みゆきさん）─────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id,
  title, body, body_paid,
  body_style, article_type,
  cover_image_url, price_jpy,
  status, published_at,
  duration_type, tags, is_sample
)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111101',
  (SELECT id FROM cities WHERE slug = 'paris'),
  '日本の蚊取り線香、殺虫剤、ゴキブリ用ホイホイ — パリでここで買えました 5 軒',
  E'## なぜ書こうと思ったか\n\nパリで初めての夏、子供が蚊にやられて朝起きたら腕が点々と赤くなっていました。フランスの市販品（spray Anti-moustique）は効くんですが、子供に毎日吹くのは心配で、日本の蚊取り線香を探し回ったのが 4 年前。\n\nこの記事では、当時自分が「あ、ここで売ってた」とメモした 5 軒の店を、最新の販売状況込みでまとめます。',
  E'## 1. K-Mart（オペラ店 / 8 区 Rue Sainte-Anne）\n蚊取り線香（KINCHO 渦巻型 10 巻入り）€8.90。在庫はゴールデンウィーク〜お盆の時期に切れがち。お盆過ぎは €6 台に下がります。**ベープマット**も置いてますが本体ごと買う必要があり €25 前後。\n\n## 2. Workshop Issé（2 区 Rue de Richelieu）\n日本の調味料がメインの店ですが、レジ横の小さな棚に蚊取り線香があります。€10 と少し高めですが、夏でも在庫を絶やしません。電話で取り置き可。\n\n## 3. Jusco（マレ店 / 4 区 Rue de Turenne）\n**ゴキブリ用ホイホイ（10 個入）** €11.50。これは他で見たことありません。Jusco でしか見ない。在庫変動激しいので電話確認推奨。\n\n## 4. Amazon.fr\n意外と「Kincho mosquito coil」で検索すると並行輸入が出てきます。€12 + 送料 €3。Prime 配送なら 2 日。本数が読めない場合の保険として。\n\n## 5. Tang Frères（13 区 Avenue d\'Ivry）\n中華系スーパー。日本ブランドはないですが、**ベトナム製の渦巻**が €4 で買えます。これは煙の量が日本の倍ですが、ベランダ用には十分。\n\n## 補足：駆除業者を呼ぶ判断\nゴキブリが居間で 2 回以上見えたら、もうホイホイでは間に合いません。13 区のミシェルさん（仏語 OK、駐在員界隈で名前が出る人）に直接連絡してください。€80 で 3 ヶ月保証。',
  'classic',
  'expat_info'::article_type,
  'https://picsum.photos/seed/locore-expat-bug/1280/800',
  800,
  'published'::article_status,
  '2026-04-22T10:00:00+02:00',
  'few_hours'::article_duration,
  ARRAY['殺虫剤','蚊取り線香','ゴキブリ','駐在生活','子育て','日用品'],
  true
);

-- ─── ② ビザ申請大変だった（さくらさん）─────────────────────────────
INSERT INTO articles (
  id, writer_id, city_id,
  title, body, body_paid,
  body_style, article_type,
  cover_image_url, price_jpy,
  status, published_at,
  duration_type, tags, is_sample
)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111103',
  (SELECT id FROM cities WHERE slug = 'paris'),
  '配偶者ビザ申請、本当にしんどかった全記録 — VLS-TS から滞在許可カードまでの 7 ヶ月',
  E'## なぜ書こうと思ったか\n\n2024 年に夫の駐在帯同で来た時、配偶者ビザ（VLS-TS visiteur）を取って、OFII 登録して、preferecture で滞在許可カードに切り替えるまで、合計 7 ヶ月かかりました。\n\nWeb の情報は古いか部分的かで、本当に「次は何の書類が必要か」が分からず泣きそうになった瞬間が何度もありました。同じ立場の方のために、自分の実体験ベースで時系列で整理します。',
  E'## タイムライン全体図\n\n| 月 | やったこと | かかった時間 |\n|---|---|---|\n| 来仏 2 ヶ月前 | 日本でビザ申請（東京 仏領事館） | 書類準備 3 週 + 領事館 2 週 |\n| 来仏 1 ヶ月後 | OFII 登録（オンライン） | 30 分 |\n| 来仏 3 ヶ月後 | OFII の健康診断呼び出し | 半日 |\n| 来仏 5 ヶ月後 | préfecture オンライン申請（ANEF） | 書類準備 1 週 + 申請 1 日 |\n| 来仏 7 ヶ月後 | 滞在許可カード受領 | 受取りに半日 |\n\n## 1. 日本でのビザ申請（東京 仏領事館）\n\n**最大の落とし穴: 戸籍謄本のアポスティーユ + 仏訳**\n- 戸籍謄本を法務局でアポスティーユ取得（無料、即日）\n- それを「**フランス当局公認の翻訳者**」に仏訳依頼（ここ重要、町の翻訳屋ではダメ）\n- 私は東京の Suzuki さんに €180 で 5 営業日で出してもらった。リストは仏領事館の Web に載っている\n\n**結婚証明書**は戸籍謄本で代用可。ただしアポスティーユ仏訳が必須。\n\n**夫の在職証明 + 給与明細 3 ヶ月分**: これは仏訳不要、英訳で OK でした（領事館によるかも）。\n\n## 2. OFII オンライン登録（来仏後 30 日以内）\n\nこれをやり忘れるとビザが無効になります。空港から家に着いたその週末にやってください。Web のフォームは仏語のみ。\n\nうちは夫の方が先に英語サポートに問い合わせて、書類のスキャンを 6 枚送って完了。30 分。\n\n## 3. OFII 健康診断（来仏 3 ヶ月目）\n\nレターが郵便で来ます（電子メールではない）。指定された Centre médical へ。\n- 胸部レントゲン（妊娠中・妊娠可能性のある人は要相談）\n- 視力検査\n- 簡単な問診（仏語 / 英語）\n- 半日仕事です。午前指定が多い\n\n## 4. ANEF（préfecture オンライン）\n\nここが一番しんどかった。**マイページにアップロードする書類が 12 種類**あって、JPG/PDF サイズ制限が厳しい（1 ファイル 5MB まで）。\n\n書類の中で**つまずいたもの**:\n- **住所証明（justificatif de domicile）**: 3 ヶ月以内の請求書（EDF、賃貸契約、保険など）。賃貸契約は古すぎるので NG だった\n- **税金関連**: avis d\'imposition があれば一番強い。なければ家賃明細 + 振込明細\n- **写真**: ePhoto Service の専用フォーマット（普通の証明写真は NG。Codeペテリゴ駅とかにある専用ブースで撮る、€6）\n\n## 5. 滞在許可カード受領\n\nメールで「受け取りに来てください」と通知。préfecture の指定窓口で、パスポートと印紙（timbres fiscaux、€225）を持参。私は AmazonNot仏 で印紙電子版を買って、その QR コード提示で OK でした。\n\n## まとめ：これだけ覚えてください\n\n1. **OFII 登録は来仏 30 日以内、忘れたら詰む**\n2. **戸籍謄本の仏訳は仏当局公認の翻訳者に頼む（東京 / 大阪に数名）**\n3. **ANEF の住所証明は 3 ヶ月以内のものを準備**\n4. **証明写真は ePhoto 専用ブースで撮る**\n5. **印紙 €225 は事前にネットで買っておく**',
  'classic',
  'expat_info'::article_type,
  'https://picsum.photos/seed/locore-expat-visa/1280/800',
  900,
  'published'::article_status,
  '2026-05-05T11:00:00+02:00',
  'other'::article_duration,
  ARRAY['ビザ','配偶者ビザ','VLS-TS','OFII','滞在許可カード','行政手続き','駐在'],
  true
);

-- ─── ③ めっちゃ安いショッピングモール（健太郎さん）────────────────────
INSERT INTO articles (
  id, writer_id, city_id,
  title, body, body_paid,
  body_style, article_type,
  cover_image_url, price_jpy,
  status, published_at,
  duration_type, tags, is_sample
)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111102',
  (SELECT id FROM cities WHERE slug = 'paris'),
  'パリ周辺の「めっちゃ安い」モール 3 軒 — 引越し直後の家具揃えはここで',
  E'## なぜ書こうと思ったか\n\nパリで暮らし始めて 8 年、後輩から「家具どこで揃えればいいですか？」と聞かれるたびに同じ 3 軒を紹介してきました。IKEA より安くて、品質も普通に使える。RER + バスで行けば日帰り可能なモール 3 軒を、引越し直後のリアルな視点でまとめます。',
  E'## 1. La Vallée Village（モール… ではなくアウトレット、Val d\'Europe）\n\n本当はモールというより**ブランド アウトレット**ですが、ここから始めるべき理由が 2 つあります:\n\n- **Le Creuset の鋳物鍋が 40% off**: パリの百貨店で €350 のものが €210。一生モノなので投資価値あり\n- **Samsonite の中型スーツケース €99**: 帰国便用にもう 1 つ買い足したい人に\n\nRER A で Marne-la-Vallée Chessy（ディズニーランド駅）、そこから無料シャトル。\n\n## 2. Westfield Forum des Halles（1 区、市内）\n\nモールというか地下街ですが、**ここの Conforama** が引越し直後のお助け店です:\n- マットレス（クィーン）€199、ベッドフレームと合わせて €350\n- 食器セット（4 人用 16 点）€39\n- カーテンレール 4m €18\n\n土曜日の午後はめちゃくちゃ混むので、平日 10 時開店すぐが狙い目。\n\n## 3. Aushopping Vélizy 2（パリ南西、78 県 Vélizy-Villacoublay）\n\n**パリで一番大きいモール**の一つ。フランス版コストコ的存在で、家電・家具・食料品が同じ屋根の下。RER C → Bus 295 で 1 時間弱、車があれば 30 分。\n\n- **IKEA Vélizy** も近くにあり、同じ日にハシゴ可能\n- **Carrefour Hyper** で日本でいうコストコ的な大型パック（米 10kg €12 とか）\n- **Boulanger** で電化製品（炊飯器 €60 から、洗濯機 €299 から）\n\n土曜は地獄、日曜は閉店多いので、**平日午後** が一番落ち着いて買えます。\n\n## 番外：HEMA（オランダ系雑貨）\n\nモールではなく単体店ですが、IKEA に行く時間がない人へ。生活雑貨が全部 €10 以下。Châtelet 店なら 1 区にあるので、引越し当日でも寄れます。\n\n## まとめ\n\n| 用途 | 行く店 |\n|---|---|\n| 鍋・スーツケース投資 | La Vallée Village |\n| マットレス・家具一式 | Westfield Forum des Halles (Conforama) |\n| 家電・大型食料品 | Vélizy 2 |\n| 引越し当日の雑貨 | HEMA |\n\nどれも RER と地下鉄で行けます。引越し車をレンタルする必要は基本ないです。',
  'classic',
  'expat_info'::article_type,
  'https://picsum.photos/seed/locore-expat-mall/1280/800',
  700,
  'published'::article_status,
  '2026-04-15T09:00:00+02:00',
  'other'::article_duration,
  ARRAY['ショッピング','モール','引越し','家具','家電','節約','駐在生活'],
  true
);


-- =========================================================================
-- 4. コミュニティ投稿 ×18（6 カテゴリ × 3 件）
-- =========================================================================

INSERT INTO community_posts (
  kind, author_id, title, body,
  city_id, location_text,
  price_amount, price_currency, price_unit,
  photos, metadata, status, is_sample
)
VALUES
  -- ════════════ JOB ════════════
  (
    'job', '11111111-1111-1111-1111-111111111101',
    'フリーランス写真家のアシスタント 1 名（週 2 日）',
    E'パリ 11 区拠点のフリーランス写真家（みゆき）です。レストラン取材の現場で、機材運びとライティング補助をしてくれる方を 1 名募集します。\n\n- 業務: 撮影アシスタント、機材セットアップ、SD カード管理\n- 時間: 週 2 日（火・木）、1 日 6 時間\n- 報酬: €15/h（昼食込み）\n- 期間: 3 ヶ月（更新あり）\n- 仏語: 撮影現場でシェフと挨拶程度ができれば OK\n\n学生 OK、駐在帯同の方歓迎です。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '11区 Rue de Charonne 周辺',
    15, 'EUR', 'hourly',
    '[]'::jsonb,
    '{"employment_type":"part_time","category":"creative","salary_period":"hourly","language_requirements":["ja","fr"],"remote_ok":false,"hours_per_week":12,"experience_required":false}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'job', '11111111-1111-1111-1111-111111111102',
    '9 区ワインバー ホールスタッフ募集（夜のみ）',
    E'9 区 Rue des Martyrs 沿いの小さなワインバー（佐藤）です。週末夜のホール 1 名を募集します。\n\n- 業務: ホール、グラス洗い、簡単なつまみのサーブ\n- 時間: 木〜土の 18:00-23:00\n- 報酬: €13.5/h + チップ折半\n- 仏語: 注文を受けられる程度（学んでる途中で OK）\n- ワイン未経験 OK、テイスティング込みで研修します\n\n日本人スタッフ多めの店です。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '9区 Rue des Martyrs',
    13, 'EUR', 'hourly',
    '[]'::jsonb,
    '{"employment_type":"part_time","category":"restaurant_hotel","salary_period":"hourly","language_requirements":["ja","fr"],"remote_ok":false,"hours_per_week":15,"experience_required":false}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'job', '11111111-1111-1111-1111-111111111103',
    '【リモート可】日本のスタートアップで React エンジニア（フルタイム）',
    E'私が所属している日本のスタートアップ（SaaS、シリーズ B）で、フランス在住の方を対象に React エンジニアを募集中です。\n\n- 業務: フロントエンド（Next.js + TypeScript）\n- 時間: フルタイム、JST 10:00-19:00 の半分以上にオーバーラップ希望\n- 給与: 年 €60,000〜€85,000（経験次第）\n- 形態: 業務委託 or AE 雇用（フランス側）どちらも可\n- 仏語不要、日本語ネイティブ歓迎\n\n興味があれば私経由でリファラル可能です。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'リモート（パリ在住者推奨）',
    70000, 'EUR', 'annual',
    '[]'::jsonb,
    '{"employment_type":"full_time","category":"it","salary_period":"annual","language_requirements":["ja","en"],"remote_ok":true,"hours_per_week":40,"experience_required":true}'::jsonb,
    'active'::community_post_status, true
  ),

  -- ════════════ APARTMENT ════════════
  (
    'apartment', '11111111-1111-1111-1111-111111111101',
    '【6/15〜8/31 限定】11 区 1LDK 家具付き短期サブレ',
    E'夏の間、日本に一時帰国するので、自宅をサブレに出します。\n\n- 場所: Rue de Charonne、11 区、Bastille まで徒歩 8 分\n- 広さ: 38m²、寝室 1 + LDK\n- 家具家電: 全部付き（食器・洗濯機・Wi-Fi・冷蔵庫含む）\n- 期間: 6/15〜8/31（2 ヶ月半）\n- 家賃: €1,400/月、光熱費込み\n- 敷金: €1,400\n- 喫煙不可、ペット応相談（猫 1 匹くらい）\n\n短期賃貸の正規契約（contrat de sous-location）を結びます。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '11区 Rue de Charonne',
    1400, 'EUR', 'monthly',
    '["https://picsum.photos/seed/locore-apt-1a/800/600","https://picsum.photos/seed/locore-apt-1b/800/600","https://picsum.photos/seed/locore-apt-1c/800/600"]'::jsonb,
    '{"listing_type":"short_term","rent_monthly":1400,"deposit":1400,"bedrooms":1,"size_sqm":38,"furnished":true,"utilities_included":true,"available_from":"2026-06-15","available_until":"2026-08-31","arrondissement":"11e","nearest_station":"Charonne (M9)","pets_ok":false,"smoking_ok":false}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'apartment', '11111111-1111-1111-1111-111111111102',
    '9 区 シェアアパート 1 部屋空き（個室 + 共用 LDK）',
    E'9 区の 3LDK で、個室 1 つが空きます。日本人 / 仏 / 英 のミックス、現在 30 代 3 人住み。\n\n- 個室: 12m²、ベッド・デスク・収納あり\n- 共用: LDK、キッチン、シャワー 2、トイレ 1\n- 場所: Pigalle/Saint-Georges、9 区\n- 家賃: €750/月、光熱費・Wi-Fi 込み\n- 敷金: €750\n- 入居: 6/1 から、最低 6 ヶ月\n- 喫煙不可\n\n面接（カフェで 30 分）あります。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '9区 Saint-Georges',
    750, 'EUR', 'monthly',
    '["https://picsum.photos/seed/locore-apt-2a/800/600","https://picsum.photos/seed/locore-apt-2b/800/600"]'::jsonb,
    '{"listing_type":"shared","rent_monthly":750,"deposit":750,"bedrooms":1,"size_sqm":12,"furnished":true,"utilities_included":true,"available_from":"2026-06-01","arrondissement":"9e","nearest_station":"Saint-Georges (M12)","pets_ok":false,"smoking_ok":false}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'apartment', '11111111-1111-1111-1111-111111111103',
    '【帰任のため】15 区 家具付き 1LDK、9 月入居',
    E'2026 年 8 月末で日本に帰任します。9 月から入居できる方に、家具家電そのまま譲ります（賃貸契約は引き継ぎではなく、新規契約してもらう形）。\n\n- 場所: 15 区 Rue du Théâtre、La Motte-Picquet-Grenelle まで徒歩 5 分\n- 広さ: 42m²、寝室 1 + LDK\n- 家具家電: ベッド・ソファ・冷蔵庫・洗濯機・電子レンジ・炊飯器・テレビ、全部譲渡 €600 で\n- 家賃（オーナー直）: €1,650/月 + 光熱費\n- オーナー: 日本人駐在員に貸し慣れているフランス人、英語 OK\n- 入居: 9/1〜\n\n内覧は 7 月から可能です。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '15区 La Motte-Picquet',
    1650, 'EUR', 'monthly',
    '["https://picsum.photos/seed/locore-apt-3a/800/600","https://picsum.photos/seed/locore-apt-3b/800/600","https://picsum.photos/seed/locore-apt-3c/800/600"]'::jsonb,
    '{"listing_type":"long_term","rent_monthly":1650,"deposit":3300,"bedrooms":1,"size_sqm":42,"furnished":true,"utilities_included":false,"available_from":"2026-09-01","arrondissement":"15e","nearest_station":"La Motte-Picquet-Grenelle (M6/M8/M10)","pets_ok":false,"smoking_ok":false}'::jsonb,
    'active'::community_post_status, true
  ),

  -- ════════════ MARKETPLACE ════════════
  (
    'marketplace', '11111111-1111-1111-1111-111111111101',
    '【売ります】Cybex Mios ベビーカー（2 年使用、状態良好）',
    E'娘が大きくなって乗らなくなったので売ります。\n\n- 商品: Cybex Mios（2024 モデル）\n- 状態: 2 年使用、フレーム傷少々、シートは洗濯済み\n- 付属: レインカバー、ドリンクホルダー、純正バッグ\n- 元値: €900\n- 売値: **€280**\n- 受け渡し: 11 区自宅 or Bastille 駅まで持参可\n\n試乗（？）OK。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '11区 Bastille',
    280, 'EUR', 'fixed',
    '["https://picsum.photos/seed/locore-mp-1a/800/800","https://picsum.photos/seed/locore-mp-1b/800/800"]'::jsonb,
    '{"side":"sell","condition":"good","category":"baby_kids","pickup_required":false,"delivery_available":false}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'marketplace', '11111111-1111-1111-1111-111111111102',
    '【売ります】ワインセラー 20 本収納（Cavavin 製、ほぼ新品）',
    E'店舗用に買ったけど、思ったより使わなかったので。家庭用としても十分なサイズです。\n\n- 商品: Cavavin V025WP（20 本、ペルチェ方式）\n- 状態: 半年使用、外装・内部とも傷なし\n- 元値: €399\n- 売値: **€220**\n- 受け渡し: 9 区店舗、または Pigalle 駅まで持参可\n- サイズ: 高さ 84cm × 幅 34cm × 奥行 50cm、重さ 22kg\n\n運ぶときは 2 人推奨。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '9区 Pigalle',
    220, 'EUR', 'fixed',
    '["https://picsum.photos/seed/locore-mp-2a/800/800","https://picsum.photos/seed/locore-mp-2b/800/800"]'::jsonb,
    '{"side":"sell","condition":"like_new","category":"appliance","pickup_required":true,"delivery_available":false}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'marketplace', '11111111-1111-1111-1111-111111111103',
    '【売ります】日本電圧 IH 炊飯器（未開封、帰国時に持ってきすぎた）',
    E'日本から持ってきた炊飯器が 2 台になってしまったので、未開封の 1 台を譲ります。\n\n- 商品: TIGER JPC-A102（5.5 合、日本仕様 100V）\n- 状態: **未開封、新品**\n- 元値: 約 30,000 円（≒€185）\n- 売値: **€130**\n- 注意: **100V 専用なので、フランスで使うには 100V 対応の変圧器（800W 以上）が必要**\n- 受け渡し: 15 区自宅 or 直接配送可（パリ市内）\n\n帰国予定者には特にオススメです。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '15区',
    130, 'EUR', 'fixed',
    '["https://picsum.photos/seed/locore-mp-3a/800/800"]'::jsonb,
    '{"side":"sell","condition":"new","category":"appliance","pickup_required":false,"delivery_available":true}'::jsonb,
    'active'::community_post_status, true
  ),

  -- ════════════ GROUP ════════════
  (
    'group', '11111111-1111-1111-1111-111111111101',
    'パリ日本人ママ会（0-6 歳の子持ち、平日昼間）',
    E'パリで子育て中のママさんで、平日昼間にゆるく集まれるグループを作っています。現在 8 人、隔週で公園 or カフェに集合してます。\n\n- 対象: 0〜6 歳のお子さんがいるママ\n- 頻度: 隔週水曜 10:30〜12:30\n- 場所: その月の幹事が決定（公園 or カフェ）\n- 言語: 日本語\n- 子供同伴歓迎（むしろ前提）\n\n新規メンバー随時募集。Locore メッセージから連絡ください。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ市内（持ち回り）',
    NULL, NULL, NULL,
    '[]'::jsonb,
    '{"category":"parenting","meeting_frequency":"biweekly","skill_level":"any","group_size":12,"age_range":"20代後半〜40代"}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'group', '11111111-1111-1111-1111-111111111102',
    'パリ日本人ランニングクラブ（土曜朝、10km 走）',
    E'毎週土曜朝にセーヌ沿いを走るゆるい会です。日本人 + フランス人 + その他、現在 12 人。\n\n- 距離: 約 10km、ペース 5:30〜6:00/km\n- 集合: 土曜 8:00、Pont de Bir-Hakeim\n- ルート: トロカデロ → エッフェル塔 → アンヴァリッド経由で往復\n- 装備: 自分の水だけ持参\n- 終了後: 近くのカフェでコーヒー（自由参加）\n\n初心者歓迎、ただし 10km 完走できることが前提です。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ Bir-Hakeim 集合',
    NULL, NULL, NULL,
    '[]'::jsonb,
    '{"category":"sport","meeting_frequency":"weekly","skill_level":"intermediate","group_size":15,"age_range":"20-50代"}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'group', '11111111-1111-1111-1111-111111111103',
    '在仏スタートアップ勉強会（月 1、平日夜）',
    E'パリ在住の日本人スタートアップ・テック系（エンジニア / PM / デザイナー / 投資家）で集まる勉強会です。\n\n- 頻度: 月 1 回、第 3 木曜 19:00〜21:30\n- 場所: 11 区のコワーキング会議室（無料）\n- 内容: 持ち回りで 1 人 LT（15 分）+ 自由ディスカッション\n- 飲食: 各自持ち込み or 終了後に近くの店へ\n\n副業案件のマッチングや、リファラルの場としても機能してます。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '11区 コワーキング',
    NULL, NULL, NULL,
    '[]'::jsonb,
    '{"category":"study","meeting_frequency":"monthly","skill_level":"any","group_size":20,"age_range":"25-45"}'::jsonb,
    'active'::community_post_status, true
  ),

  -- ════════════ LESSON ════════════
  (
    'lesson', '11111111-1111-1111-1111-111111111101',
    '子供向け日本語クラス（小学生 / 5 人まで）',
    E'娘の同年代のお子さん向けに、自宅で日本語クラスを開いてます。月 2 回、土曜午後。\n\n- 対象: 6〜10 歳、日本語をある程度話せる子\n- 内容: 絵本 + 簡単な漢字 + 工作\n- 頻度: 月 2 回、土曜 14:00〜15:30\n- 場所: 11 区自宅（リビング）\n- 料金: €25/回（教材費込み）\n- 定員: 5 人まで（残り 2 席）\n\nお試し 1 回 €15。気軽にどうぞ。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '11区',
    25, 'EUR', 'per_session',
    '[]'::jsonb,
    '{"side":"teach","category":"language","format":"in_person","level":"beginner","trial_available":true,"max_students":5}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'lesson', '11111111-1111-1111-1111-111111111102',
    'フランスワイン入門（自宅 / 月 1 回 / 6 名まで）',
    E'お店のオフを使って、月 1 回ワインテイスティング会をやります。フランスワインの地方ごとの違いを学べます。\n\n- 内容: 4 種類のワイン + チーズ + 解説\n- 頻度: 月 1 回、日曜 18:00〜20:30\n- 場所: 9 区店舗\n- 料金: €45/回\n- 定員: 6 名\n- 仏語不要、日本語で解説\n- お試し回（初回）€35\n\n次回は 5/26（日）、テーマは「ロワール地方の白」です。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '9区 店舗',
    45, 'EUR', 'per_session',
    '["https://picsum.photos/seed/locore-lesson-2/800/600"]'::jsonb,
    '{"side":"teach","category":"other","format":"in_person","level":"beginner","trial_available":true,"max_students":6}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'lesson', '11111111-1111-1111-1111-111111111103',
    '【習いたい】フランス語家庭教師募集（B1 目標、週 1）',
    E'フランス語を本気で B1 まで上げたいので、家庭教師を探しています。\n\n- 現状: A2 程度、文法は分かるが会話に詰まる\n- 目標: 半年で B1（DELF 受験予定）\n- 頻度: 週 1 回、平日夜 or 週末\n- 場所: 15 区自宅 or オンライン（Zoom）\n- 予算: €30〜€40/h\n- 希望: 文法に強い人、宿題出してくれる人\n\nネイティブ仏人、または B2/C1 の日本人どちらも歓迎です。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '15区 / オンライン',
    35, 'EUR', 'hourly',
    '[]'::jsonb,
    '{"side":"learn","category":"language","format":"both","level":"intermediate","trial_available":false}'::jsonb,
    'active'::community_post_status, true
  ),

  -- ════════════ MUTUAL_AID ════════════
  (
    'mutual_aid', '11111111-1111-1111-1111-111111111101',
    '【お手伝いします】平日昼の子供の一時預かり（11 区）',
    E'娘が学校に行ってる平日昼間、空いてる時間に他のお子さんを一時預かりできます。\n\n- 対象: 1〜5 歳（オムツ替えできるか確認させてください）\n- 場所: 11 区自宅 or 近くの公園\n- 時間: 平日 10:00〜15:00 の範囲で、1〜3 時間程度\n- お礼: 無償 or お菓子 1 個（負担ない範囲で）\n- 頻度: 不定期、1 回限りも OK\n\n緊急の通院・打ち合わせなど、気軽に声かけてください。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    '11区',
    NULL, NULL, NULL,
    '[]'::jsonb,
    '{"request_type":"offer","urgency":"flexible","compensation":"small_thanks","category":"childcare"}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'mutual_aid', '11111111-1111-1111-1111-111111111102',
    '【お手伝いします】CDG / Orly 空港送迎（車あり）',
    E'店の定休日（火曜・水曜）に空港送迎します。8 人乗りバン持ってます。\n\n- 対応: CDG、Orly、Beauvais\n- 曜日: 火曜・水曜\n- 人数: 大人 4 名 + 大荷物 4 個まで\n- お礼: ガソリン代として €25（CDG）/ €30（Orly）目安\n- 緊急: 前日連絡まで対応\n\n帰国送り、出張送りどちらも OK です。気軽にどうぞ。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'パリ市内 ↔ 空港',
    25, 'EUR', 'fixed',
    '[]'::jsonb,
    '{"request_type":"offer","urgency":"flexible","compensation":"negotiable","category":"transport"}'::jsonb,
    'active'::community_post_status, true
  ),
  (
    'mutual_aid', '11111111-1111-1111-1111-111111111103',
    '【助けてください】フランス語の役所書類、翻訳お願いできる方',
    E'préfecture から届いた書類が読めず、内容が分からなくて困ってます。\n\n- 書類: 滞在許可関連、A4 で 2 枚程度\n- 期限: 5/25 までに何か返信が必要っぽい\n- 場所: メール / Zoom で内容を一緒に見てもらえれば\n- お礼: €20 + コーヒー奢ります、または日本食材で何か\n\n仏語ネイティブまたは B2+ の方、夜 21 時以降に 30 分ほどでお願いできるとうれしいです。',
    (SELECT id FROM cities WHERE slug = 'paris'),
    'オンライン',
    20, 'EUR', 'fixed',
    '[]'::jsonb,
    '{"request_type":"need","urgency":"this_week","compensation":"negotiable","category":"translation"}'::jsonb,
    'active'::community_post_status, true
  );


-- =========================================================================
-- 5. auth.users への同期（共通パスワード TestPass!2026 でログイン可）
--    既存の 0023 と同じロジックを、今回追加した 3 ユーザーにだけ適用
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
      '11111111-1111-1111-1111-111111111101',
      '11111111-1111-1111-1111-111111111102',
      '11111111-1111-1111-1111-111111111103'
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
