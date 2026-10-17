# HOMEWARD

帰宅ボタンを主役にした、二人で使う家族向けWebアプリです。
ブラック・シルバー・ゴールドのデザインで、iPhoneのホーム画面から開けます。

## 機能

- 「今から帰る」ボタンと任意のひと言
- 相手の登録端末へWeb Push通知（本文付き）
- 通知登録、自分へのテスト通知、送信サービス受付結果の表示
- 文字・写真のチャット（10秒ごとに更新）
- 月表示の共有カレンダー、予定の追加・編集・削除
- カレンダーの日付マス内に時間と予定名を表示。複数の予定は「ほか○件」表示
- 二人の部屋の作成と招待リンク
- サーバー側で参加者を確認し、データと写真へのアクセスを制限

## このソースについて

React / TypeScript / Vinext、Cloudflare Workers / D1 / R2を使用した **Sites向けのサーバー付きソース** です。
GitHubで保存・編集できますが、**GitHub Pagesだけでは動作しません**。
通知送信・共有データ・写真の保存にはサーバーが必要です。

本番ログインと閲覧権限はSitesが提供するChatGPT認証を使用します。
Cloudflareへ単独でデプロイしたりVercel等に移すには、認証・ストレージ・ビルド設定の移植が別途必要です。
外部から指定したユーザーヘッダーをそのまま信頼する構成で単独公開しないでください。

配布用ソースには本番の秘密鍵、メールアドレス、利用データ、既存Siteのproject_idを含めていません。
このZIPは既存公開サイトへの接続済みバックアップではなく、新規環境用のソースです。
既存サイトの更新には、元のSitesチェックアウトの設定を維持してください。

## GitHubへのアップロード

1. ZIPを展開します。
2. GitHubで新しいリポジトリを作成します（家族用ならPrivateを推奨）。
3. `homeward` フォルダーの **中身** をリポジトリ直下へアップロードします。
4. `.gitignore`、`.openai`などの隠しファイル・フォルダーも含めます。

Gitを使う場合は、展開した `homeward` フォルダーで次を実行します。

```sh
git init
git add .
git commit -m "Initial HOMEWARD source"
git branch -M main
git remote add origin <自分のGitHubリポジトリURL>
git push -u origin main
```

## ローカル開発

Node.js 22.13以降とnpmが必要です。

```sh
npm ci
node scripts/generate-vapid.mjs
```

`.dev.vars.example` を `.dev.vars` にコピーし、生成された鍵と自分のサイトURLを入力します。
秘密鍵はGitHubへアップロードしないでください。

初回はビルドでローカルDB設定を作り、マイグレーションを適用します。

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sturdy_demogoblin.sql
npm run dev
```

ターミナルに表示されるローカルURLを開きます。
ローカルのログイン画面では開発用ユーザーが使われます。本番ではこの模擬ログインは無効です。
DBの内容を変える場合は `db/schema.ts` を編集し、`npm run db:generate` で追加のSQLを生成してください。
既存の適用済みマイグレーションは書き換えません。

## Sitesで本番公開する場合

Sites対応のCodexでこのフォルダーを開き、新しいSiteとして登録して公開します。
必要な設定は次のとおりです。

- D1のバインディング名：`DB`
- R2のバインディング名：`BUCKET`
- ランタイム環境変数：`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT`
- `VAPID_PRIVATE_KEY`は秘密の環境変数として設定
- `VAPID_SUBJECT`は実在する運用サイトのHTTPS URL等に設定
- 閲覧可能なアカウントは家族の二人に限定

Sitesの標準ビルド連携は `vite.config.ts` と `build/` に含まれています。
公開時には `.openai/hosting.json` に新しいSiteのproject_idを設定し、Sitesのワークフローでソース保存・ビルド・マイグレーション・公開を実行します。
GitHubへpushするだけでSitesが自動更新される構成や、GitHub Actionsは含めていません。

## iPhoneで通知を使う

1. 二人とも、許可されたアカウントでサイトへログインします。
2. Safariの共有メニューから「ホーム画面に追加」を選びます。
3. ホーム画面のアイコンから開きます。
4. 「通知の設定」→「この端末の通知を有効にする」を押し、通知を許可します。
5. 「自分にテスト通知を送る」を押し、実際にiPhoneへ届くことを確認します。
6. 一人が部屋を作り、招待リンクをもう一人に共有します。もう一人は表示名を入力して参加します。
7. 帰宅ボタンを押し、相手のiPhoneに通知が届くことを二人で確認します。

iOS 16.4以降が必要です。Web Pushの登録は端末ごとに行います。
「通知サービスが受け付けた」は、端末への着信や相手の既読を意味しません。
通信・通知設定・集中モード等で通知が遅れたり見えない場合があります。
通知に表示される本文のプレビューはiPhone側の設定によります。

## 確認済みの範囲

- TypeScriptチェックと本番ビルド
- ローカルで予定の登録・編集・削除、帰宅連絡の保存
- 未ログインのAPI拒否、別Originの書き込み拒否、不正なPush送信先の拒否
- ブラウザーでの画面表示

**iPhone実機でのWeb Push着信と、二台の端末間の通知テストは未実施です。**
実際の利用開始前に、上記のテストを行ってください。

## 主なファイル

| ファイル | 内容 |
| --- | --- |
| `app/homeward.tsx` | 帰宅ボタン、チャット、カレンダー、通知登録の画面 |
| `app/globals.css` | ブラック・シルバー・ゴールドのデザイン |
| `app/api/family/route.ts` | 部屋、参加者、予定、チャット、帰宅連絡のAPI |
| `app/api/push/route.ts` | 通知登録とテスト通知API |
| `app/push.ts` | Web Pushの暗号化・送信処理 |
| `app/api/photo/route.ts` | 写真アップロード・閲覧API |
| `public/sw.js` | バックグラウンドの通知受信と通知タップの処理 |
| `public/manifest.webmanifest` | ホーム画面追加用のWebアプリ設定 |
| `db/schema.ts` | データベースの定義 |
| `drizzle/` | DBマイグレーション |

土台に含まれるライブラリー等のライセンスは、各パッケージと同梱のLICENSEファイルを確認してください。
