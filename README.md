# みんなの中間駅

複数の出発駅から、鉄道の移動距離をもとに集まりやすい駅を探す静的Webアプリです。首都圏の一部路線を対象に、ブラウザ内で計算します。APIキーやアカウントは不要です。

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

## 出典・ライセンス

アプリコードは[MIT License](LICENSE)。データ・地図ライブラリ・素材には個別の条件が適用されます。[出典とライセンス](public/sources.html)と[データの来歴](data-source/provenance.json)を参照してください。
