# Hex Dump Viewer

Canvas上に16進ダンプを描画し、スクロールバー・範囲選択機能を持つWeb UIを提供します。

## ファイル構成
- src/index.html : CanvasとスクリプトのHTML
- src/hex_dump_lib.js : HEXダンプ表示ライブラリ（ESモジュール）
- src/hex_dump_sample.js : ライブラリ利用サンプル

## 主な機能
- 1行あたり16バイト表示
- バイナリデータ（Uint8Array）をCanvas上にHEXダンプ表示
- スクロールバーによる表示範囲の移動
- マウスドラッグによるバイト範囲選択（選択範囲はハイライト表示）
- 選択中に表示範囲外へマウスを移動すると自動スクロール
- ESモジュール構成
- containerサイズに合わせてcanvasサイズが自動調整されます
- リサイズ時、スクロール位置がデータ終端を超えていた場合は自動的に調整され全体が表示されます

## 使い方
1. VS CodeのLive Server等で `src/index.html` を http:// で開いてください。
2. Canvasの右側にスクロールバーが表示され、HEXダンプが描画されます。
3. マウスドラッグでバイト範囲を選択できます。
4. サンプルデータは `hex_dump_sample.js` で定義されています。独自データを表示したい場合は `HexDump(canvas, Uint8Array)` を呼び出してください。

## 備考
- ローカルファイル（file://）で直接開くとESモジュールのCORS制限で動作しません。必ずWebサーバー経由でアクセスしてください。
- 機能追加・カスタマイズは `hex_dump_lib.js` を編集してください。
