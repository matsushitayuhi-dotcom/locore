-- 0086_qualifications.sql
--
-- 資格・試験スコアの登録（留学特化）。
--   - qualifications: マスタ（語学試験 / 出願テスト / 職業資格 / その他）
--   - user_qualifications: ユーザーの登録 + 合格証明（verification-docs バケット）+ 審査ステータス
-- 公開プロフィールには approved のものだけを「確認済み」で表示する。
--
-- すべて additive。既存データ・既存テーブルを破壊しない。手動適用前提。
-- 番号は 0086（0085 は在籍確認）。status は既存 enum residency_verification_status を再利用。
--
-- 適用手順（Supabase）:
--   1. Supabase Dashboard → SQL Editor を開く。
--   2. このファイルの内容を貼り付けて Run。
--   （ローカルでは `psql "$DATABASE_URL" -f packages/db/migrations/manual/0086_qualifications.sql` でも可）

CREATE TABLE IF NOT EXISTS qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ja text NOT NULL,
  name_en text,
  -- language_test | admission_test | professional | other
  category text NOT NULL,
  has_score boolean NOT NULL DEFAULT false,
  score_hint text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE qualifications IS
  '資格・試験のマスタ（0086）。code を安定キーに UI が参照。category = language_test | admission_test | professional | other。';
CREATE INDEX IF NOT EXISTS qualifications_category_idx ON qualifications (category, sort_order);

CREATE TABLE IF NOT EXISTS user_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qualification_id uuid NOT NULL REFERENCES qualifications(id) ON DELETE RESTRICT,
  custom_name text,
  score text,
  acquired_year integer,
  proof_paths jsonb NOT NULL DEFAULT '[]',
  user_note text,
  status residency_verification_status NOT NULL DEFAULT 'pending',
  reviewer_note text,
  rejected_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  files_deleted_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE user_qualifications IS
  'ユーザーが登録した資格と合格証明（0086）。proof_paths は verification-docs バケット。editor が /admin/qualifications で審査し approved のものだけ公開表示。';
CREATE INDEX IF NOT EXISTS user_qualifications_user_idx ON user_qualifications (user_id);
CREATE INDEX IF NOT EXISTS user_qualifications_status_idx ON user_qualifications (status);
-- 同じ資格は 1 人 1 件（custom_name が違えば別扱い。NULL 同士は一意制約では区別されるため COALESCE で丸める）
CREATE UNIQUE INDEX IF NOT EXISTS user_qualifications_user_qual_uidx
  ON user_qualifications (user_id, qualification_id, COALESCE(custom_name, ''));

-- ---- マスタ初期データ（冪等） ---------------------------------------------
INSERT INTO qualifications (code, name_ja, name_en, category, has_score, score_hint, sort_order) VALUES
  -- 語学試験
  ('toefl_ibt',  'TOEFL iBT',                     'TOEFL iBT',                    'language_test', true,  '例: 105',     10),
  ('ielts',      'IELTS Academic',                'IELTS Academic',               'language_test', true,  '例: 7.5',     20),
  ('toeic',      'TOEIC L&R',                     'TOEIC Listening & Reading',    'language_test', true,  '例: 900',     30),
  ('duolingo',   'Duolingo English Test',         'Duolingo English Test',        'language_test', true,  '例: 130',     40),
  ('cambridge',  'ケンブリッジ英検',               'Cambridge English Qualifications','language_test', true, '例: C1 Advanced', 50),
  ('eiken',      '実用英語技能検定（英検）',        'EIKEN',                        'language_test', true,  '例: 1級',     60),
  ('delf_dalf',  'DELF / DALF（フランス語）',       'DELF / DALF',                  'language_test', true,  '例: DALF C1', 70),
  ('testdaf',    'TestDaF / Goethe（ドイツ語）',    'TestDaF / Goethe-Zertifikat',  'language_test', true,  '例: TDN 4 / C1', 80),
  ('hsk',        'HSK（中国語）',                  'HSK',                          'language_test', true,  '例: 6級',     90),
  ('topik',      'TOPIK（韓国語）',                'TOPIK',                        'language_test', true,  '例: 6級',    100),
  -- 出願用テスト
  ('gmat',       'GMAT',                          'GMAT',                         'admission_test', true, '例: 720',    10),
  ('gre',        'GRE',                           'GRE',                          'admission_test', true, '例: V160 / Q168', 20),
  ('sat',        'SAT',                           'SAT',                          'admission_test', true, '例: 1500',   30),
  ('act',        'ACT',                           'ACT',                          'admission_test', true, '例: 33',     40),
  ('lsat',       'LSAT',                          'LSAT',                         'admission_test', true, '例: 170',    50),
  ('mcat',       'MCAT',                          'MCAT',                         'admission_test', true, '例: 515',    60),
  -- 職業資格
  ('cpa_jp',     '公認会計士（日本）',              'CPA (Japan)',                  'professional', false, NULL, 10),
  ('uscpa',      '米国公認会計士（USCPA）',         'US CPA',                       'professional', false, NULL, 20),
  ('cfa',        'CFA',                           'Chartered Financial Analyst',  'professional', false, NULL, 30),
  ('tax_jp',     '税理士',                         'Certified Tax Accountant (Japan)', 'professional', false, NULL, 40),
  ('lawyer_jp',  '弁護士（日本）',                  'Attorney at Law (Japan)',      'professional', false, NULL, 50),
  ('us_bar',     '米国弁護士（Bar）',               'US Bar Admission',             'professional', false, NULL, 60),
  ('md_jp',      '医師（日本）',                    'Medical Doctor (Japan)',       'professional', false, NULL, 70),
  ('pharmacist_jp','薬剤師（日本）',                'Pharmacist (Japan)',           'professional', false, NULL, 80),
  ('nurse_jp',   '看護師（日本）',                  'Registered Nurse (Japan)',     'professional', false, NULL, 90),
  ('teacher_jp', '教員免許（日本）',                'Teaching License (Japan)',     'professional', false, NULL, 100),
  ('architect_jp','一級建築士',                    'First-Class Architect (Japan)', 'professional', false, NULL, 110),
  ('pmp',        'PMP',                           'Project Management Professional','professional', false, NULL, 120),
  ('aws_cert',   'AWS 認定',                       'AWS Certification',            'professional', true,  '例: Solutions Architect – Professional', 130),
  -- その他（自由記述）
  ('other',      'その他の資格・試験',              'Other',                        'other', true, '例: スコアや級があれば', 10)
ON CONFLICT (code) DO UPDATE SET
  name_ja = EXCLUDED.name_ja,
  name_en = EXCLUDED.name_en,
  category = EXCLUDED.category,
  has_score = EXCLUDED.has_score,
  score_hint = EXCLUDED.score_hint,
  sort_order = EXCLUDED.sort_order;
