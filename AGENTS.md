# 作業上の制約

- 手書きの正本は `public/`。生成する `network.json`・`coverage.json`・`basemap.json` は直接編集・コミットしない。配布には `scripts/package_site.py` を使う（`git archive` では生成データが欠ける）。
- 原典、加工内容、ライセンス・帰属表示を保持する。鉄道経路を直線で代用せず、線路の交差だけで乗換を作らない。
- UIは静的サイトで完結させ、公開APIはapp-hubの既存Workerで同じ計算を使う。不要な依存・バックエンド・ビルド工程を追加しない。
- 駅接続の変更は `data-source/corridors.json` の駅順・根拠URL・同名別駅を更新する。駅選択の統合は `data-source/station-picker.json` を更新する。
- 対象矩形は固定し、原典保持用の余白を配信範囲にしない。`geometryBoundaryExceptions` の既存2区間の上限を緩めたり、他区間へ広げたりしない。
- READMEは用途・公開先・起動方法に絞る。実装説明・作業履歴・検証履歴を追記しない。

# 検証

READMEの手順でデータを生成し、変更に関係する検証を実行する。

```sh
npm test
python3 tests/check_geometry.py
python3 tests/check_coverage.py
```

画面・操作の変更時は `npm install`・`npx playwright install chromium` 後、HTTPサーバーを起動して `npm run test:browser` を実行する。`TEST_URL` は既定 `http://127.0.0.1:4173`、既存Chromiumは `CHROMIUM_PATH` で指定する。

文書のみの変更はリンク・コマンドと現行コードの整合を確認する。配信内容に変更がなければ再デプロイしない。
