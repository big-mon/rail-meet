# 作業上の制約

- 手書きの正本は `public/`。`network.json`・`coverage.json`・`basemap.json` は直接編集・コミットせず、原典または生成スクリプトを変更して再生成する。
- 原典、加工内容、ライセンス・帰属表示を保持する。鉄道経路を直線で代用したり、線路の交差だけで乗換を作ったりしない。
- UIは静的サイトとして完結させる。任意の公開APIはapp-hubの既存WorkerでUIと同じ計算を使う。依頼に必要のない依存・バックエンド・ビルド工程を追加しない。
- 配布には `scripts/package_site.py` を使う。生成JSONはGitに含まれないため、`git archive`だけでは配信できない。

# 検証

READMEの手順でデータを生成したうえで、変更に関係する検証を実行する。

```sh
npm test
python3 tests/check_geometry.py
python3 tests/check_coverage.py
```

画面・操作を変更した場合は、HTTPサーバーを起動して通常画面のブラウザテストも実行する。

```sh
npm install
npx playwright install chromium
npm run test:browser
```

テスト先は `TEST_URL`（既定 `http://127.0.0.1:4173`）、既存Chromiumは `CHROMIUM_PATH` で指定できる。

文書だけの変更ではリンク先・コマンドと現行コードの整合を確認する。配信内容に変更がなければ再デプロイしない。

駅接続の追加は `data-source/corridors.json` の駅順・根拠URL・同名別駅を更新する。対象矩形は従来76駅の外接範囲で固定し、原典保持用の余白を配信範囲にしない。対象駅同士の原典形状が微小に逸脱する2区間だけは `geometryBoundaryExceptions` の5m/60m上限を適用し、他区間へ広げない。
