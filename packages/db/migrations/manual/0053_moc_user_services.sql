-- 0053_moc_user_services.sql
--
-- MOC プレビュー用に、0051 で投入した 5 駐在員 (moc01〜moc05) に
-- それぞれ 5 件ずつサービスを追加する。合計 25 件。
--
-- カテゴリは /explore のチップに合わせる:
--   tourism / consulting / translation / attend / shipping / shooting / access / other
--
-- 写真は 0048 の Unsplash 既知 ID + 関連カテゴリで実在確認したもののみ。
-- リンク切れリスクほぼなし。
--
-- 全行 ON CONFLICT DO UPDATE で冪等。
-- 0051 と同じく user_id 経由でクリーンアップ可能。

BEGIN;

-- ==========================================================================
-- moc01 高橋 まりか (パリ Le Marais / 古着バイヤー / スタイリスト)
--   user_id = 33333333-3333-3333-3333-333333333301
-- ==========================================================================

INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0001-0001-000000000001',
  '33333333-3333-3333-3333-333333333301',
  'マレ地区 古着バイヤー同行 (半日)',
  E'パリ在住 7 年、Le Marais を拠点に日本のセレクトショップ向け買い付けをしている私と一緒に、ヴィンテージ古着店 4-5 軒を半日で回ります。\n\n- 集合: Saint-Paul 駅 10:00\n- 内容: 私の馴染みの店 4-5 軒で店主との交渉サポート + 値段感の見立て\n- 言語: 日本語 + フランス語通訳\n- 所要: 4 時間 (移動含む)\n- 料金: 1 名 €120 / 2 名 €180 (グループ割引)\n- 含まれないもの: 食事、購入する古着代金',
  'tourism',
  18000,
  '/ 半日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0001-0001-000000000002',
  '33333333-3333-3333-3333-333333333301',
  '日本向け 古着・ヴィンテージ 買付代行',
  E'BUYMA バイヤーや個人セレクター向けの遠隔買付代行。Marais / Saint-Ouen / Brocante 蚤の市から欲しいアイテムを探して購入・発送します。\n\n- 1 点あたり €15 (買付フィー)\n- 商品代金 + 配送料 + 関税は別途実費\n- 検品 + 写真報告 + EMS 発送\n- 月 5 点以上は単価交渉可\n- ブランド・年代・サイズの指定 OK\n- 探索期間: 2 週間程度',
  'shipping',
  2200,
  '/ 1 点',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0001-0001-000000000003',
  '33333333-3333-3333-3333-333333333301',
  'EC 出品用 古着物撮り (10 点〜)',
  E'パリのスタジオで古着・ヴィンテージ衣類の物撮りを承ります。EC 出品 / メルカリ / Instagram 用に最適化。\n\n- 1 セッション 10 点 €60\n- 各アイテム 4-6 カット (正面・背面・ディテール・タグ)\n- 補正 + JPG 納品 (RAW 別料金)\n- 持ち込み / 私の在庫の両方対応\n- 納期: 撮影翌日',
  'shooting',
  9000,
  '/ 10 点',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0001-0001-000000000004',
  '33333333-3333-3333-3333-333333333301',
  'Saint-Ouen 蚤の市 同行 (1 日)',
  E'パリ郊外 Saint-Ouen の蚤の市 (Marché aux Puces) を 1 日まるごと案内します。観光客には分かりづらい「業者しか入らないブース」も。\n\n- 集合: Porte de Clignancourt 駅 9:00\n- 専門マーケット 3-4 ブロック案内\n- 値段交渉サポート\n- 持ち帰り発送相談可\n- 開催: 金・土・日 のみ\n- 1 名 €180 / 2 名 €260',
  'tourism',
  27000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0001-0001-000000000005',
  '33333333-3333-3333-3333-333333333301',
  '古着バイヤー キャリア相談 (オンライン)',
  E'パリでの古着バイヤーを目指す方、または開業 3 年以内の方向け 1 時間相談。\n\n- 商材選び / 仕入先開拓\n- インボイス・関税の実務\n- セレクトショップ営業の Tips\n- 開業ビザの取得経験\n- 日本語、オンライン (Zoom)\n- 録画 OK',
  'consulting',
  8000,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy,
  price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id,
  audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active,
  position = EXCLUDED.position,
  updated_at = now();

-- ==========================================================================
-- moc02 中島 けんじ (パリ 11区 Oberkampf / ビストロ シェフ修行中)
--   user_id = 33333333-3333-3333-3333-333333333302
-- ==========================================================================

INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0002-0002-000000000001',
  '33333333-3333-3333-3333-333333333302',
  '11区 ナチュラルワイン酒場巡り (3 軒)',
  E'パリ 11 区 Oberkampf 周辺のナチュラルワイン酒場 3 軒を巡る食 + 飲みのプライベートツアー。\n\n- 集合: 19:00 Oberkampf 駅\n- 3 軒目まで案内、各店でグラス 1 杯 + 軽食\n- 料金 €90 (グラス代込み)\n- 私が修行中のシェフコネクションで予約困難店も入れる\n- 日本人 1-3 名 (4 名以上応相談)',
  'tourism',
  13500,
  '/ 1 名',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0002-0002-000000000002',
  '33333333-3333-3333-3333-333333333302',
  'ビストロ食事中の同席通訳',
  E'ビストロやガストロノミー店での食事に同席し、シェフ・サーバーとの細かい注文 / 食材説明 / アレルギー対応をすべて日本語で通訳します。\n\n- 1 回 2 時間 €70\n- 食事代は別途 (お客様負担、私は食べない)\n- ワインリストの解説含む\n- 予約困難店の同席は 1 週間前までに相談\n- 1 名〜 4 名のグループ',
  'translation',
  10500,
  '/ 2 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0002-0002-000000000003',
  '33333333-3333-3333-3333-333333333302',
  'パリ食材買付・発送代行 (チーズ・調味料)',
  E'パリの専門店からチーズ / 調味料 / 乾物 / 缶詰を買付して日本に発送します。\n\n- 1 点 €18 (フィー) + 商品代金 + 国際便\n- チーズは要冷蔵便対応 (空輸推奨)\n- 関税書類は私の方で整える\n- 検品 + 写真 + 発送追跡まで\n- 注文〜到着: 1-2 週間',
  'shipping',
  2700,
  '/ 1 点',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'both',
  'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0002-0002-000000000004',
  '33333333-3333-3333-3333-333333333302',
  '早朝マルシェ仕入れ同行',
  E'パリ Rungis 中央市場や近所のマルシェ d''Aligre を早朝に巡る、シェフ視点の仕入れ体験。\n\n- 集合: 朝 6:00 (Rungis は 5:00)\n- 旬の食材 + 仕入れ目線の選び方\n- 終了後カフェで朝食 (別料金)\n- 3 時間 €80\n- 寒い時期は厚着推奨',
  'tourism',
  12000,
  '/ 3 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0002-0002-000000000005',
  '33333333-3333-3333-3333-333333333302',
  'フランス家庭料理 出張シェフ (4 名コース)',
  E'お住まいまで伺い、4 名コースを調理してお出しします。駐在員のお祝い / ホームパーティーに。\n\n- 4 名 €280 (前菜 / メイン / デザート)\n- 食材買付込み、私が準備して伺います\n- 所要 3 時間 (準備 + 提供 + 片付け)\n- パリ市内 + 近郊、4 名以上は応相談\n- ワインペアリング +€50/人',
  'other',
  42000,
  '/ 4 名',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'resident',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy,
  price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id,
  audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active,
  position = EXCLUDED.position,
  updated_at = now();

-- ==========================================================================
-- moc03 山口 あや (パリ 7区 / 通訳 / フランス美術ガイド)
--   user_id = 33333333-3333-3333-3333-333333333303
-- ==========================================================================

INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0003-0003-000000000001',
  '33333333-3333-3333-3333-333333333303',
  'ルーブル美術館 プライベート解説 (90 分)',
  E'90 分でルーブルの「これだけは見ておきたい」を厳選して案内します。フランス美術専攻の修士号 + ガイド経験 12 年。\n\n- 集合: ピラミッド前 (チケットご購入済み前提)\n- ルート: モナリザ / 民衆を導く自由の女神 / ミロのヴィーナス + 私のおすすめ 5 点\n- 子連れ対応 (子供向け解説プラン有)\n- 1-4 名 €110\n- 言語: 日本語',
  'tourism',
  16500,
  '/ 90 分',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1571115332105-fb3b21c43dd0?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0003-0003-000000000002',
  '33333333-3333-3333-3333-333333333303',
  '美術館 / オペラ 同行通訳 (半日)',
  E'美術館 / コンサート / オペラ鑑賞に同行して、日本語で解説 + 通訳します。\n\n- 半日 €90 (4 時間まで)\n- 1 日 €160\n- 観覧チケットは別途お客様負担\n- ルーブル以外: オルセー、ポンピドゥー、オランジュリー、ロダン、Garnier 等\n- 1-3 名',
  'translation',
  13500,
  '/ 半日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'traveler',
  'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0003-0003-000000000003',
  '33333333-3333-3333-3333-333333333303',
  'フランス公立小学校 入学相談 (駐妻向け)',
  E'パリ + 近郊の公立小学校入学・転入手続きを 12 年の経験で支援。我が家は子供 2 人をフランス公立に通わせています。\n\n- 1 時間 ¥6,000 (オンライン)\n- 学校選び / 区役所手続き / 編入面談の通訳\n- CE1 / CM1 などフランス学年制の説明\n- 駐妻ネットワークもご紹介可\n- 帰国子女対応も',
  'consulting',
  6000,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'resident',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0003-0003-000000000004',
  '33333333-3333-3333-3333-333333333303',
  '病院 / 役所 同行通訳',
  E'パリの病院 (公立 / 私立) / OFII / 区役所 / 学校面談に同行して通訳します。\n\n- 2 時間 €70 (移動時間込み)\n- 産婦人科 / 小児科 / 救急の経験あり\n- 緊急の場合は当日対応可 (空き次第)\n- 事前に書類確認させてください\n- 駐在妻 + 単身駐在の方が多いです',
  'translation',
  10500,
  '/ 2 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'resident',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0003-0003-000000000005',
  '33333333-3333-3333-3333-333333333303',
  'パリ駐妻 ピアサポート (オンライン)',
  E'パリ駐在 12 年、駐妻 → 通訳業 として独立した経験から、駐妻の「孤独 / アイデンティティ / キャリア」の話し相手になります。\n\n- 1 時間 ¥4,000 (Zoom / Google Meet)\n- 医療的カウンセリングではない、ピア (同じ立場の) サポート\n- 内容: 駐妻うつ / キャリアブランク / 子供の学校適応 / 帰任不安 等\n- 守秘義務厳守\n- 月 1 継続割引あり (¥3,000)',
  'consulting',
  4000,
  '/ 1 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'paris'),
  'resident',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy,
  price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id,
  audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active,
  position = EXCLUDED.position,
  updated_at = now();

-- ==========================================================================
-- moc04 森田 ゆうき (リヨン Vieux Lyon / 自転車工房 / コーヒー焙煎家)
--   user_id = 33333333-3333-3333-3333-333333333304
-- ==========================================================================

INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0004-0004-000000000001',
  '33333333-3333-3333-3333-333333333304',
  'リヨン 自転車ハーフデイツアー (ローヌ→ソーヌ)',
  E'リヨン市内をローヌ川 → ソーヌ川と渡る自転車半日ツアー。私の工房のレンタル自転車込み。\n\n- 集合: Vieux Lyon 10:00\n- ルート: ローヌ川沿い → Confluence → ソーヌ川沿い → Croix-Rousse 丘\n- 所要 4 時間、休憩あり\n- カフェ立ち寄り (別料金)\n- レンタル自転車 + ヘルメット込み €95\n- 平日 / 週末両方',
  'tourism',
  14500,
  '/ 半日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lyon'),
  'traveler',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0004-0004-000000000002',
  '33333333-3333-3333-3333-333333333304',
  'コーヒー焙煎ワークショップ (個人開催)',
  E'リヨンの私の工房で、生豆からの焙煎を 2 時間体験します。\n\n- 集合: Croix-Rousse 工房 14:00\n- 内容: 生豆セレクト / 焙煎プロファイル説明 / 実機操作 / カッピング\n- お持ち帰り: 焙煎したて 100g\n- 1 名 €65 / ペア €110\n- 日本語、英語混じり OK',
  'other',
  9800,
  '/ 2 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lyon'),
  'both',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0004-0004-000000000003',
  '33333333-3333-3333-3333-333333333304',
  'リヨン Croix-Rousse 工房通り案内',
  E'リヨンの旧 silk weavers の街 Croix-Rousse 丘で、現役職人の工房 3-4 軒を案内します。\n\n- 集合: Croix-Rousse 駅 14:00\n- 革 / 陶 / ガラス / 古道具の小さなアトリエ\n- 2 時間 €60\n- アトリエ訪問はオーナーと事前に約束済み\n- 購入も可 (相場 €30〜)',
  'tourism',
  9000,
  '/ 2 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lyon'),
  'traveler',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0004-0004-000000000004',
  '33333333-3333-3333-3333-333333333304',
  '日本向け スペシャルティ豆 月次発送',
  E'毎月、私が焙煎した 200g のスペシャルティコーヒー豆を日本にお届けします。\n\n- 月 ¥3,500 (送料込み)\n- 産地は毎月変わる (エチオピア / コロンビア / ケニア 等)\n- 焙煎後 1 週間以内に発送\n- 中煎り中心、深煎り希望は事前指定\n- 解約はいつでも',
  'shipping',
  3500,
  '/ 月 (200g)',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lyon'),
  'both',
  'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0004-0004-000000000005',
  '33333333-3333-3333-3333-333333333304',
  '自転車選び相談 + 組み立て (現地引取)',
  E'リヨン引越時の自転車選び・購入代行 + 組み立て + 試乗チェック。\n\n- 1 台 €120 (相談 + 購入同行 + 組立)\n- 中古 / 新車どちらも対応\n- 私の工房で 1 週間メンテナンス保証\n- パンク修理キット + ロック込み\n- 駐在初任者 / 留学生によく利用されます',
  'other',
  18000,
  '/ 1 台',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'lyon'),
  'resident',
  'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy,
  price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id,
  audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active,
  position = EXCLUDED.position,
  updated_at = now();

-- ==========================================================================
-- moc05 渡辺 さとこ (ボルドー Chartrons / ワインアトリエ運営)
--   user_id = 33333333-3333-3333-3333-333333333305
-- ==========================================================================

INSERT INTO user_services (
  id, user_id, title, description, category,
  price_jpy, price_unit, contact_method, external_url,
  city_id, audience, cover_image_url,
  is_active, position
) VALUES
(
  'eeeeeeee-0000-0005-0005-000000000001',
  '33333333-3333-3333-3333-333333333305',
  'ボルドー シャトー巡り 1 日アテンド',
  E'ボルドー在住 3 年、ワインアトリエ運営者が 1 日かけてシャトー 3 軒を回ります。日本語完全ガイド。\n\n- 集合: ボルドー Saint-Jean 駅 9:00\n- ルート: メドック or サンテミリオン (季節で選択)、家族経営 2 軒 + Grand Cru Classé 1 軒\n- 試飲 10-12 種類\n- ランチ込み (ワインペアリング +€40)\n- 4 名乗りメルセデス送迎\n- 1 名 €240 / 2 名 €380 (グループ割引)',
  'tourism',
  36000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'traveler',
  'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1600&auto=format&fit=crop&q=80',
  true,
  0
),
(
  'eeeeeeee-0000-0005-0005-000000000002',
  '33333333-3333-3333-3333-333333333305',
  '日本人観光客向け ワインテイスティング (90 分)',
  E'私のアトリエで、ボルドーワインの基本テイスティング 90 分。初心者大歓迎。\n\n- 場所: Chartrons 地区 アトリエ\n- 内容: 5 種類の試飲 + ボルドー左岸 / 右岸の違い解説 / グラス選び\n- 日本語 100%\n- 1 名 €55 / カップル €95\n- 平日 14:00 / 土曜 16:00 開催\n- 軽食 (チーズ + パン) 付き',
  'tourism',
  8300,
  '/ 1 名',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'traveler',
  'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=1600&auto=format&fit=crop&q=80',
  true,
  1
),
(
  'eeeeeeee-0000-0005-0005-000000000003',
  '33333333-3333-3333-3333-333333333305',
  'ボルドーワイン買付・日本発送代行',
  E'シャトー直のワインを買付して日本に発送します。\n\n- 1 本フィー €20 (本体代金 + 配送料 + 関税は別)\n- グランクリュ / 家族経営どちらも対応\n- 専用ワイン便 (温度管理) 推奨\n- 12 本セット以上が経済的\n- 検品 + 写真 + 発送追跡\n- 注文〜到着 3-4 週間',
  'shipping',
  3000,
  '/ 1 本',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'both',
  'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=1600&auto=format&fit=crop&q=80',
  true,
  2
),
(
  'eeeeeeee-0000-0005-0005-000000000004',
  '33333333-3333-3333-3333-333333333305',
  'Chartrons ワイン商通り 案内',
  E'18 世紀から続くボルドーのワイン商通り Chartrons を 2 時間で案内。\n\n- 集合: Place du Marché des Chartrons 15:00\n- 老舗ネゴシアン 3 軒 + 隠れた個人セラー 1 軒\n- 試飲 4-5 種類\n- 1 名 €70 / 2 名 €120\n- 旅行者向け、家族 / カップル歓迎\n- 観光客が見逃す路地ありき',
  'tourism',
  10500,
  '/ 2 時間',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'traveler',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1600&auto=format&fit=crop&q=80',
  true,
  3
),
(
  'eeeeeeee-0000-0005-0005-000000000005',
  '33333333-3333-3333-3333-333333333305',
  'プリムール試飲会 同行 (4 月限定)',
  E'毎年 4 月、新ヴィンテージの先物試飲会 Primeurs に同行。プロ向けのため通常一般非公開、私の業界コネで入れます。\n\n- 4 月の特定 1 週間のみ開催\n- 1 日 €350 (現地ホテル代込み)\n- 朝 9:00 シャトー集合 → 4-5 軒で試飲 → ディナー\n- ワイン投資 / 自家用買付の両方対応\n- 定員 4 名まで、要 1 月予約\n- 試飲のみ、購入は別契約',
  'access',
  52000,
  '/ 1 日',
  'chat',
  NULL,
  (SELECT id FROM cities WHERE slug = 'bordeaux'),
  'traveler',
  'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1600&auto=format&fit=crop&q=80',
  true,
  4
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_jpy = EXCLUDED.price_jpy,
  price_unit = EXCLUDED.price_unit,
  city_id = EXCLUDED.city_id,
  audience = EXCLUDED.audience,
  cover_image_url = EXCLUDED.cover_image_url,
  is_active = EXCLUDED.is_active,
  position = EXCLUDED.position,
  updated_at = now();

COMMIT;

-- =========================================================================
-- 動作確認 SELECT
-- =========================================================================
--
-- SELECT u.display_name, us.title, us.category, us.price_jpy
--   FROM user_services us
--   JOIN users u ON u.id = us.user_id
--   WHERE us.id::text LIKE 'eeeeeeee%'
--   ORDER BY u.display_name, us.position;
--
-- SELECT u.display_name, COUNT(*) AS service_count
--   FROM user_services us JOIN users u ON u.id = us.user_id
--   WHERE us.id::text LIKE 'eeeeeeee%' GROUP BY u.display_name;
