-- 0023_test_users_confirmed_and_articles_paid.sql
--
-- テスト用 DB の整備:
--   1) すべての public.users に対応する auth.users 行を用意し、メール認証済み状態にする
--      （既に auth.users 行がある場合は email_confirmed_at と password を上書き）
--   2) すべての記事にダミーの body_paid を設定して、スポット情報を購入後解放型（Paywall）に切り替え
--
-- 適用後、すべてのテストユーザーは以下の共通パスワードでログインできるようになります:
--     TestPass!2026
--
-- 注意: 本番には絶対に流さないこと（既存ユーザーのパスワードを上書きしてしまうため）。

BEGIN;

-- =====================================================
-- 1. auth.users / auth.identities の整備
-- =====================================================

DO $$
DECLARE
  u             RECORD;
  default_pw    TEXT := 'TestPass!2026';
  pw_hash       TEXT;
BEGIN
  FOR u IN
    SELECT id, email
    FROM   public.users
    WHERE  email IS NOT NULL AND length(trim(email)) > 0
  LOOP
    pw_hash := extensions.crypt(default_pw, extensions.gen_salt('bf'));

    -- auth.users: 無ければ新規作成、あれば確認済みにしてパスワード差し替え
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      u.id,
      'authenticated',
      'authenticated',
      u.email,
      pw_hash,
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      '{}'::jsonb,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
       SET email_confirmed_at = now(),
           encrypted_password = EXCLUDED.encrypted_password,
           updated_at         = now();

    -- auth.identities: email プロバイダの行を用意（無ければ INSERT）
    IF NOT EXISTS (
      SELECT 1
      FROM   auth.identities i
      WHERE  i.user_id  = u.id
      AND    i.provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        u.id::text,
        u.id,
        jsonb_build_object(
          'sub',            u.id::text,
          'email',          u.email,
          'email_verified', true
        ),
        'email',
        now(),
        now(),
        now()
      );
    END IF;
  END LOOP;
END
$$;


-- =====================================================
-- 2. 全記事を Paywall 対象にする（スポット情報を有料化）
-- =====================================================
--
-- 記事ページの実装では `body_paid` が NULL もしくは空文字なら
-- 「全文無料記事」として扱われ、スポット情報がそのまま見えます。
-- 適当な非空文字を入れることで Paywall フローが発火し、未購入時は
-- スポット名が ?????? 表示になります。

UPDATE articles
SET    body_paid = E'## スポット詳細（購入後に解放）\n\n本記事に含まれるスポットの正確な情報（住所・営業時間・おすすめの注文・行く時間帯のコツなど）は、ご購入後に解放されます。\n\n現地のクリエイターだけが知るリアルな情報を、ぜひ手に入れてください。'
WHERE  body_paid IS NULL
   OR  length(trim(body_paid)) = 0;


COMMIT;

-- =====================================================
-- 動作確認クエリ（任意で実行）
-- =====================================================
-- SELECT email, email_confirmed_at IS NOT NULL AS confirmed
-- FROM auth.users ORDER BY created_at DESC;
--
-- SELECT id, title, length(coalesce(body_paid, '')) AS paid_len
-- FROM articles ORDER BY created_at DESC;
