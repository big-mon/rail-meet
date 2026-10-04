# みんなの中間駅

複数の出発駅から、鉄道の移動距離で集まりやすい駅を探すWebアプリ。首都圏の一部路線を対象にブラウザ内で計算し、アカウントは不要です。距離は線路形状の概算で、営業キロや所要時間ではありません。

[Webアプリを開く](https://app.damonge.com/rail-meet/)

## ローカルで使う

Python 3でデータを生成し、HTTPサーバーを起動します。

```sh
python3 scripts/build_data.py
python3 scripts/build_basemap.py
python3 -m http.server 4173 --directory public
```

[localhost:4173](http://localhost:4173)を開いてください。

[API仕様](public/developers.html) / [OpenAPI](public/openapi.json)（静的なローカルサーバーではAPIは実行できません）。

コードは[MIT License](LICENSE)。データ・ライブラリ・素材は[出典とライセンス](public/sources.html)、取得元・加工記録は[データの来歴](data-source/provenance.json)を参照してください。
