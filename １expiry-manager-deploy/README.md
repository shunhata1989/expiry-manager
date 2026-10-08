# 賞味期限マネージャー デプロイ手順 (Vercel)

## フォルダ構成
- index.html   : 画面(静的ファイル)
- api/read.js  : Claude APIへの中継(Vercel Serverless Function)
- vercel.json  : 関数の最大実行時間を60秒に設定(画像解析に10〜60秒かかることがあるため)

## 手順
1. https://vercel.com に無料登録し、このフォルダを新規プロジェクトとしてデプロイ
   (Framework Preset は "Other" のまま、ビルド設定は空でOK。CLIなら フォルダ内で `npx vercel` )
2. Project → Settings → Environment Variables に追加(Production):
   - ANTHROPIC_API_KEY : https://console.anthropic.com で発行したAPIキー
   - APP_PASSWORD      : スタッフ用の合言葉(必ず設定。未設定だと誰でもAPI料金を使えてしまいます)
   - MODEL(任意)      : 省略時は claude-sonnet-5-5
3. 環境変数を追加したら Redeploy(再デプロイ)
4. 発行されたURLをスマホで開き、画面上部の「AI接続テスト」→写真の読み取りを試す
   初回は合言葉を聞かれます(端末に記憶されます)

## トラブル時
- 「パスワードが違います」: APP_PASSWORD と入力値を確認
- 「ANTHROPIC_API_KEY が未設定です」: 環境変数追加後に再デプロイしたか確認
- 「Claude API 401/404」: APIキー、またはMODELの値を確認
- 登録データは各端末のブラウザ内保存です(スタッフ間では共有されません)
