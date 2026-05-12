# Supabase 認証メール・遷移設定

サインアップメールが Supabase 標準（`noreply@mail.supabase.io`）から来てしまう問題と、
メール内リンククリック後の 404 を解消するための設定メモ。

## 症状

- メールの差出人が `noreply@mail.supabase.io` で、件名・本文も英語の Supabase デフォルト。
  ユーザーが「何これ詐欺？」となる。
- 確認リンクをクリックすると `https://locore.app/?...` のようなトップ系 URL に飛ばされ、
  パスが `/confirm` や `/verify` のときに 404 になる。

## 直し方（Supabase Dashboard で操作）

### 1. Site URL を本番ドメインに揃える

`Project Settings → Authentication → URL Configuration`

- **Site URL**: `https://locore.app`
- **Redirect URLs** に以下を全部追加（preview とローカルも含む）:
  - `https://locore.app/auth/callback`
  - `https://locore.app/**`（任意 — Vercel preview URL を許可するなら必要）
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`

Site URL が古い `http://localhost:3000` のままだと、確認リンクが localhost に飛んで
本番ユーザーが 404 を踏みます。

### 2. メール送信を独自ドメイン SMTP に切り替え（最重要）

デフォルトの `mail.supabase.io` を使っている限り信頼性は上がりません。
`Project Settings → Authentication → SMTP Settings` で外部 SMTP を設定。

おすすめ:

| プロバイダ      | 無料枠         | 設定の手軽さ |
| --------------- | -------------- | ------------ |
| **Resend**      | 3,000通/月     | ★★★★★（推奨）|
| Postmark        | 100通/月       | ★★★★         |
| Mailgun         | 100通/日       | ★★★          |
| SendGrid        | 100通/日       | ★★★          |

Resend の場合の手順:

1. `resend.com` で `locore.app` ドメインを Verify（DNS の SPF / DKIM / DMARC レコード追加）
2. API キーを発行
3. Supabase Dashboard SMTP Settings に以下を入力:
   - Sender email: `no-reply@locore.app`
   - Sender name: `Locore`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: 発行した API キー
4. テスト送信ボタンで確認

DNS 設定は反映に 1〜24 時間。完了するとメールの差出人が `Locore <no-reply@locore.app>` になり、
SPF / DKIM / DMARC が通って迷惑メールにも入りにくくなります。

### 3. メールテンプレートを日本語に書き換え

`Authentication → Email Templates → Confirm signup`

- **Subject**: `[Locore] メールアドレス確認のお願い`
- **Message body (HTML)**:

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #18181B;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Locore へようこそ</h1>
  <p style="font-size: 14px; line-height: 1.8; color: #3f3f46;">
    ご登録ありがとうございます。下のボタンからメールアドレスの確認を完了してください。
  </p>
  <p style="margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; background: #D4634A; color: #ffffff; text-decoration: none;
              padding: 12px 24px; border-radius: 9999px; font-weight: 700; font-size: 14px;">
      メールアドレスを確認する
    </a>
  </p>
  <p style="font-size: 12px; color: #71717A; line-height: 1.7;">
    リンクが押せない場合は、こちらの URL をブラウザに貼り付けてください:<br />
    <span style="word-break: break-all;">{{ .ConfirmationURL }}</span>
  </p>
  <hr style="border: none; border-top: 1px solid #E7E5E0; margin: 32px 0;" />
  <p style="font-size: 11px; color: #a5a09a; line-height: 1.6;">
    このメールに心当たりがない場合は、お手数ですが破棄してください。<br />
    Locore — 在外邦人がつくる、もう一段深い旅<br />
    <a href="https://locore.app" style="color: #D4634A; text-decoration: none;">locore.app</a>
  </p>
</div>
```

同じ要領で:

- **Magic Link**（Subject: `[Locore] ログイン用リンク`）
- **Change Email Address**（Subject: `[Locore] メールアドレス変更の確認`）
- **Reset Password**（Subject: `[Locore] パスワードリセット`）
- **Invite User**（Founders 招待などで使うなら）

も日本語化しておく。テンプレート末尾のフッターから「Powered by Supabase」を消すのも忘れずに。

### 4. ConfirmationURL の遷移先を確認する

Supabase はテンプレート内の `{{ .ConfirmationURL }}` を
`https://<project>.supabase.co/auth/v1/verify?token=...&redirect_to=<SiteURL>` に展開します。
`redirect_to` が指定されていない、または `Site URL` が空のときに 404 が起きやすい。

`apps/web/app/auth/signup/actions.ts` で `emailRedirectTo` を渡しているので、
`Site URL` が正しければ:

1. ユーザーがメールリンクをクリック
2. Supabase が `/auth/v1/verify` で検証 → `Site URL + /auth/callback?code=...` にリダイレクト
3. `apps/web/app/auth/callback/route.ts` がコードをセッションに交換
4. `redirect_to` パラメータが指していたパス（無ければ `/`）に遷移

の順で動く。404 が出る場合はだいたい:

- Site URL に古い `localhost` が残っている
- Redirect URLs に `https://locore.app/auth/callback` が登録されていない
- メールテンプレートを以前カスタムで `{{ .SiteURL }}/confirm?...` のように
  存在しないパスに書き換えてしまっている

の 3 つのどれか。本番の Site URL を一度確認してから、テンプレートの URL 部分は
**必ず `{{ .ConfirmationURL }}` を使う**（変数展開に任せる）こと。

### 5. 動作確認

1. シークレットウィンドウで `https://locore.app/auth/signup` から新規登録
2. 受信箱で `no-reply@locore.app` から日本語メールが届いていることを確認
3. 「メールアドレスを確認する」ボタンを押下
4. `/auth/callback?code=...` を経由して `/`（or `redirect_to`）に着地し、ログイン状態になる

失敗した場合は Supabase Dashboard の `Logs → Auth Logs` を見て、
どこで弾かれたかを確認。

## 関連コード

- サインアップ: `apps/web/app/auth/signup/actions.ts`
- コールバック: `apps/web/app/auth/callback/route.ts`
- 確認待ち画面: `apps/web/app/auth/verify/page.tsx`
- ミドルウェア: `apps/web/lib/supabase/middleware.ts`

`emailRedirectTo` には `NEXT_PUBLIC_SITE_URL` 環境変数を使っているので、
Vercel 本番環境にも `NEXT_PUBLIC_SITE_URL=https://locore.app` を設定すること。
