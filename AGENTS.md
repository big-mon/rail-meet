# 作業上の制約

- 手書きの正本は `public/`。`network.json` と `basemap.json` は直接編集・コミットせず、原典または生成スクリプトを変更して再生成する。
- 原典、加工内容、ライセンス・帰属表示を保持する。鉄道経路を直線で代用したり、線路の交差だけで乗換を作ったりしない。
- 静的サイトとして完結させる。依頼に必要のない依存・バックエンド・ビルド工程を追加しない。
- 配布には `scripts/package_site.py` を使う。生成JSONはGitに含まれないため、`git archive`だけでは配信できない。

# 検証

READMEの手順でデータを生成したうえで、変更に関係する検証を実行する。

```sh
npm test
python3 tests/check_geometry.py
```

画面・操作を変更した場合は、HTTPサーバーを起動して両画面（`/`、`/showtime/`）のブラウザテストも実行する。

```sh
npm install
npx playwright install chromium
npm run test:browser
```

テスト先は `TEST_URL`（既定 `http://127.0.0.1:4173`）、既存Chromiumは `CHROMIUM_PATH` で指定できる。

文書だけの変更ではリンク先・コマンドと現行コードの整合を確認する。配信内容に変更がなければ再デプロイしない。
