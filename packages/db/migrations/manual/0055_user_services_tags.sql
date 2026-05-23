-- 0055_user_services_tags.sql
--
-- user_services にタグ複数指定機能を追加。
-- 既存 category は「主カテゴリ」として残し、tags は補助カテゴリ + フリーキーワード
-- (例: コンサル と 留学サポート を両方タグ付けできる)。
--
-- フィルタ UI は ?tags=consulting,study_abroad のように複数指定可。
-- 配列演算子 && (overlap) でクエリする。

BEGIN;

-- ============================================================
-- 1. tags 列を追加 (空配列デフォルト、NOT NULL)
-- ============================================================
ALTER TABLE user_services
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN インデックス (tags && '{...}' 検索を高速化)
CREATE INDEX IF NOT EXISTS user_services_tags_gin_idx
  ON user_services USING gin (tags);

-- ============================================================
-- 2. 既存 sample データのタグを bio・サービス内容に合わせて埋める
-- ============================================================

-- 旧分類 → 新タグの対応 (主カテゴリ + 類似タグ)
-- consulting + study_abroad は重なるのでまとめて扱う、ワーホリ系も近い

UPDATE user_services SET tags = ARRAY['tourism','古着','蚤の市','パリ']
  WHERE id = 'eeeeeeee-0000-0001-0001-000000000001';
UPDATE user_services SET tags = ARRAY['shipping','古着','買付代行','パリ']
  WHERE id = 'eeeeeeee-0000-0001-0001-000000000002';
UPDATE user_services SET tags = ARRAY['shooting','物撮り','古着']
  WHERE id = 'eeeeeeee-0000-0001-0001-000000000003';
UPDATE user_services SET tags = ARRAY['tourism','蚤の市','古着','Saint-Ouen','パリ']
  WHERE id = 'eeeeeeee-0000-0001-0001-000000000004';
UPDATE user_services SET tags = ARRAY['consulting','起業','古着','キャリア相談']
  WHERE id = 'eeeeeeee-0000-0001-0001-000000000005';

UPDATE user_services SET tags = ARRAY['tourism','ワイン','ナイトライフ','パリ']
  WHERE id = 'eeeeeeee-0000-0002-0002-000000000001';
UPDATE user_services SET tags = ARRAY['translation','食','レストラン','通訳','パリ']
  WHERE id = 'eeeeeeee-0000-0002-0002-000000000002';
UPDATE user_services SET tags = ARRAY['shipping','食材','チーズ','買付代行']
  WHERE id = 'eeeeeeee-0000-0002-0002-000000000003';
UPDATE user_services SET tags = ARRAY['tourism','マルシェ','食','早朝','パリ']
  WHERE id = 'eeeeeeee-0000-0002-0002-000000000004';
UPDATE user_services SET tags = ARRAY['other','料理','出張シェフ','ホームパーティ']
  WHERE id = 'eeeeeeee-0000-0002-0002-000000000005';

UPDATE user_services SET tags = ARRAY['tourism','美術','美術館','ルーブル','解説']
  WHERE id = 'eeeeeeee-0000-0003-0003-000000000001';
UPDATE user_services SET tags = ARRAY['translation','美術','オペラ','通訳']
  WHERE id = 'eeeeeeee-0000-0003-0003-000000000002';
UPDATE user_services SET tags = ARRAY['consulting','study_abroad','教育','子育て','駐妻']
  WHERE id = 'eeeeeeee-0000-0003-0003-000000000003';
UPDATE user_services SET tags = ARRAY['translation','医療','役所','通訳','駐妻']
  WHERE id = 'eeeeeeee-0000-0003-0003-000000000004';
UPDATE user_services SET tags = ARRAY['consulting','メンタル','駐妻','ピアサポート']
  WHERE id = 'eeeeeeee-0000-0003-0003-000000000005';

UPDATE user_services SET tags = ARRAY['tourism','自転車','リヨン']
  WHERE id = 'eeeeeeee-0000-0004-0004-000000000001';
UPDATE user_services SET tags = ARRAY['other','コーヒー','焙煎','ワークショップ']
  WHERE id = 'eeeeeeee-0000-0004-0004-000000000002';
UPDATE user_services SET tags = ARRAY['tourism','工房','リヨン','クラフト']
  WHERE id = 'eeeeeeee-0000-0004-0004-000000000003';
UPDATE user_services SET tags = ARRAY['shipping','コーヒー','定期便']
  WHERE id = 'eeeeeeee-0000-0004-0004-000000000004';
UPDATE user_services SET tags = ARRAY['other','自転車','駐在初任者','移住サポート']
  WHERE id = 'eeeeeeee-0000-0004-0004-000000000005';

UPDATE user_services SET tags = ARRAY['tourism','ワイン','シャトー','ボルドー']
  WHERE id = 'eeeeeeee-0000-0005-0005-000000000001';
UPDATE user_services SET tags = ARRAY['tourism','ワイン','テイスティング','ボルドー']
  WHERE id = 'eeeeeeee-0000-0005-0005-000000000002';
UPDATE user_services SET tags = ARRAY['shipping','ワイン','買付代行','ボルドー']
  WHERE id = 'eeeeeeee-0000-0005-0005-000000000003';
UPDATE user_services SET tags = ARRAY['tourism','ワイン','街歩き','ボルドー']
  WHERE id = 'eeeeeeee-0000-0005-0005-000000000004';
UPDATE user_services SET tags = ARRAY['access','ワイン','プリムール','ボルドー','期間限定']
  WHERE id = 'eeeeeeee-0000-0005-0005-000000000005';

-- moc06 吉田さくら (留学生 / カジュアル)
UPDATE user_services SET tags = ARRAY['tourism','学生街','カフェ','パリ','格安']
  WHERE id = 'eeeeeeee-0000-0006-0006-000000000001';
UPDATE user_services SET tags = ARRAY['consulting','study_abroad','住居','学生','留学準備']
  WHERE id = 'eeeeeeee-0000-0006-0006-000000000002';
UPDATE user_services SET tags = ARRAY['tourism','カフェ','古書','学生街','パリ']
  WHERE id = 'eeeeeeee-0000-0006-0006-000000000003';
UPDATE user_services SET tags = ARRAY['tourism','ショッピング','格安','パリ','蚤の市']
  WHERE id = 'eeeeeeee-0000-0006-0006-000000000004';
UPDATE user_services SET tags = ARRAY['consulting','study_abroad','大学受験','親向け']
  WHERE id = 'eeeeeeee-0000-0006-0006-000000000005';

-- moc07 田中健太 (マルセイユ ワーホリ)
UPDATE user_services SET tags = ARRAY['tourism','ビーチ','カランク','マルセイユ','サーフィン']
  WHERE id = 'eeeeeeee-0000-0007-0007-000000000001';
UPDATE user_services SET tags = ARRAY['tourism','プロヴァンス','ドライブ','ラベンダー']
  WHERE id = 'eeeeeeee-0000-0007-0007-000000000002';
UPDATE user_services SET tags = ARRAY['tourism','食','マルセイユ','ナイトライフ']
  WHERE id = 'eeeeeeee-0000-0007-0007-000000000003';
UPDATE user_services SET tags = ARRAY['consulting','ワーホリ','ビザ','移住サポート']
  WHERE id = 'eeeeeeee-0000-0007-0007-000000000004';
UPDATE user_services SET tags = ARRAY['other','セーリング','地中海','体験']
  WHERE id = 'eeeeeeee-0000-0007-0007-000000000005';

-- moc08 佐藤みく (ニース モデルコース作家)
UPDATE user_services SET tags = ARRAY['consulting','旅程作成','リモート','コートダジュール','モデルコース']
  WHERE id = 'eeeeeeee-0000-0008-0008-000000000001';
UPDATE user_services SET tags = ARRAY['tourism','街歩き','撮影','ニース']
  WHERE id = 'eeeeeeee-0000-0008-0008-000000000002';
UPDATE user_services SET tags = ARRAY['tourism','エズ','モナコ','ニース','日帰り']
  WHERE id = 'eeeeeeee-0000-0008-0008-000000000003';
UPDATE user_services SET tags = ARRAY['tourism','ドライブ','カンヌ','マントン','コートダジュール']
  WHERE id = 'eeeeeeee-0000-0008-0008-000000000004';
UPDATE user_services SET tags = ARRAY['shooting','SNS','撮影','ニース','インスタ']
  WHERE id = 'eeeeeeee-0000-0008-0008-000000000005';

-- moc09 山本大輔 (パリ ENS 数学博士)
UPDATE user_services SET tags = ARRAY['tourism','大学','研究','理系','パリ']
  WHERE id = 'eeeeeeee-0000-0009-0009-000000000001';
UPDATE user_services SET tags = ARRAY['consulting','study_abroad','博士課程','理系','研究者']
  WHERE id = 'eeeeeeee-0000-0009-0009-000000000002';
UPDATE user_services SET tags = ARRAY['tourism','古書','哲学','学生街','パリ']
  WHERE id = 'eeeeeeee-0000-0009-0009-000000000003';
UPDATE user_services SET tags = ARRAY['tourism','博物館','科学','パリ','子連れ']
  WHERE id = 'eeeeeeee-0000-0009-0009-000000000004';
UPDATE user_services SET tags = ARRAY['tourism','自転車','ノルマンディー','日帰り','夏季限定']
  WHERE id = 'eeeeeeee-0000-0009-0009-000000000005';

-- moc10 鈴木ゆう (リール 越境)
UPDATE user_services SET tags = ARRAY['tourism','リール','旧市街','フランドル']
  WHERE id = 'eeeeeeee-0000-0010-0010-000000000001';
UPDATE user_services SET tags = ARRAY['tourism','ベルギー','越境','ブリュッセル','ブリュージュ']
  WHERE id = 'eeeeeeee-0000-0010-0010-000000000002';
UPDATE user_services SET tags = ARRAY['tourism','北仏','産業遺産','美術館','ユネスコ']
  WHERE id = 'eeeeeeee-0000-0010-0010-000000000003';
UPDATE user_services SET tags = ARRAY['consulting','ワーホリ','ビザ','移住サポート','study_abroad']
  WHERE id = 'eeeeeeee-0000-0010-0010-000000000004';
UPDATE user_services SET tags = ARRAY['other','ビール','ベルギー','北仏','文化体験']
  WHERE id = 'eeeeeeee-0000-0010-0010-000000000005';

-- ============================================================
-- 3. 既存の sample 以外のレコードも、最低限 category を tags に同期
--    (空配列のままだと検索ヒットしないため)
-- ============================================================
UPDATE user_services
  SET tags = ARRAY[category]
  WHERE tags = '{}'
    AND category IS NOT NULL
    AND category <> '';

COMMIT;

-- =========================================================================
-- 動作確認 SELECT
-- =========================================================================
--
-- SELECT id, title, category, tags
--   FROM user_services
--   WHERE tags && ARRAY['ワイン','study_abroad','ワーホリ']
--   ORDER BY id;
--
-- SELECT unnest(tags) AS tag, COUNT(*)
--   FROM user_services
--   GROUP BY tag
--   ORDER BY COUNT(*) DESC LIMIT 20;
