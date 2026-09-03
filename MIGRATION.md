# Mac への開発環境移行ガイド

Windows (Surface Book 3) から Mac へ locore の開発環境を移行するための手順書。
2026-09-03 作成。

## 前提：何がどこにあるか

| もの | 置き場所 | Mac への持って行き方 |
|---|---|---|
| コード・ドキュメント・モック | GitHub (`matsushitayuhi-dotcom/locore`) | `git clone` するだけ |
| 秘密情報（APIキー等の env ファイル） | Git には**入れていない**（意図的） | 手動コピー（下記） |
| 画像原本 `photos/`（約80MB） | Git には**入れていない**（意図的） | 手動コピー（下記） |

秘密情報と写真は、旧PCのデスクトップの `locore-migration-files` フォルダにまとめてある。
AirDrop / USBメモリ / iCloud・Dropbox 等で Mac に運ぶ（**GitHubにはアップロードしないこと**）。

## Mac 側の手順

### 1. 開発ツールのインストール

```bash
# Homebrew（Macの定番パッケージ管理ツール）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# git と Node バージョン管理ツール
brew install git fnm

# Node 20（このリポジトリは .nvmrc で 20.18.0 を指定）
fnm install 20.18.0
fnm default 20.18.0

# pnpm（このリポジトリのパッケージマネージャ。corepack で package.json 指定版が入る）
corepack enable pnpm
```

### 2. リポジトリの取得

```bash
cd ~/Desktop   # 好きな場所でOK
git clone https://github.com/matsushitayuhi-dotcom/locore.git
cd locore
```

GitHub の認証を求められたら `brew install gh && gh auth login` が簡単。

### 3. Git 外ファイルの配置

`locore-migration-files` フォルダの中身を、**同じ相対パス**に置く：

- `apps/web/.env.local` → クローンした `locore/apps/web/.env.local`
- `packages/db/.env` → `locore/packages/db/.env`
- `photos/` → `locore/photos/`

### 4. 依存インストールと起動確認

```bash
pnpm install
pnpm --filter @locore/web dev   # http://localhost:3000 で確認
```

### 5. 動作したら

- 旧PCの `locore-migration-files` は削除してよい（秘密情報なので放置しない）
- Vercel / Supabase のダッシュボードには Mac のブラウザからログインし直すだけ（移行作業不要）

## 補足

- pptx（Founders50 資料等）や `tmp/` のスクリプトは Git 管理内なので clone に含まれる
- デザインモックは `mockups/` ディレクトリに取り込み済み（旧 `Desktop/locore-mockups`）
