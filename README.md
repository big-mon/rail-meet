# みんなの中間駅

複数の出発駅から、鉄道の移動距離をもとに集まりやすい駅を探す静的Webアプリです。首都圏の一部路線を対象に、ブラウザ内で計算します。APIキーやアカウントは不要です。

[Webアプリを開く](https://app.damonge.com/rail-meet/)

距離は線路形状に基づく概算で、営業キロや所要時間ではありません。

## ローカルで使う

Python 3でデータを生成し、HTTPサーバーを起動します。

```sh
python3 scripts/build_data.py
python3 scripts/build_basemap.py
python3 -m http.server 4173 --directory public
```

[localhost:4173](http://localhost:4173)を開いてください。

配布用アーカイブを作る場合：

```sh
python3 scripts/package_site.py /tmp/rail-meet-site.tar.gz
```

## API

[仕様](public/developers.html) / [OpenAPI](public/openapi.json)。駅検索GET・計算POST、UIと同じ計算処理を使います。静的なローカルサーバーはAPIを実行しません。app-hubの既存Workerが配信します。データ更新はapp-hub側の固定SHA更新PRで取り込みます。

厳密な全拠点レート制限や費用上限は未設定です。既存Workerの利用枠を共有します。アカウント設定は変更していません。

## 出典・ライセンス

アプリコードは[MIT License](LICENSE)。データ・地図ライブラリ・素材には個別の条件が適用されます。[出典とライセンス](public/sources.html)と[データの来歴](data-source/provenance.json)を参照してください。

## 対象データの更新

旧76駅の外接矩形内を563駅グループ・702区間へ補完。487駅グループ・622区間を追加しています。駅順・同名別駅・明示した別名・参照URLの正本は `data-source/corridors.json`。形状はN02-24の原典抜粋から生成し、生成された `network.json` / `coverage.json` はコミットしません。原典保持用の余白と配信経路の地理的範囲は別です。範囲外へ出る区間、孤立した断片、新幹線、一方向運行は除外します。

既存IDは維持しますが、経路・順位は更新されます。千葉・横浜の上位候補は葛西臨海公園、東陽町、錦糸町。旧候補を指定した共有URLは、その候補が上位3件から外れると再検索を案内します。APIは同じデータと探索を使い、16条件キャッシュと既存のレート制限を維持。データ安全上限は600駅・1,000区間・20,000形状頂点です。
