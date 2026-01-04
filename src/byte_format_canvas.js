// byteFormatCanvasの表示・制御処理を集約
import { drawBinCanvasWithHighlight } from './bin_dump_lib.js';

export const byteFormats = { "ID": 2, "名前": 2, "設定値": 2 };

export function resetByteFormatSelection(selectedFormatIndexRef) {
    selectedFormatIndexRef.value = -1;
}

export function renderByteFormatCanvas(byteFormatCanvas, selectedFormatIndexRef) {
    const ctx = byteFormatCanvas.getContext('2d');
    const keys = Object.keys(byteFormats);
    const itemHeight = 28;
    const pad = 8;
    const rowH = itemHeight + pad;
    byteFormatCanvas.height = rowH * keys.length;
    ctx.clearRect(0, 0, byteFormatCanvas.width, byteFormatCanvas.height);
    ctx.font = '20px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#222';
    keys.forEach((key, i) => {
        ctx.fillText('・' + key, 12, i * rowH + rowH / 2);
    });
}

export function setupByteFormatCanvasEvents(byteFormatCanvas, selectedFormatIndexRef, binCanvas) {
    const keys = Object.keys(byteFormats);
    const itemHeight = 28;
    const pad = 8;
    const rowH = itemHeight + pad;
    byteFormatCanvas.onclick = function(e) {
        const y = e.offsetY;
        const idx = Math.floor(y / rowH);
        if (idx >= 0 && idx < keys.length) {
            selectedFormatIndexRef.value = idx;
            // 再描画: 選択中は背景色
            const ctx = byteFormatCanvas.getContext('2d');
            ctx.clearRect(0, 0, byteFormatCanvas.width, byteFormatCanvas.height);
            keys.forEach((key, i) => {
                ctx.font = '20px sans-serif';
                ctx.textBaseline = 'middle';
                if (i === idx) {
                    ctx.fillStyle = '#cce5ff';
                    ctx.fillRect(0, i * rowH, byteFormatCanvas.width, rowH);
                    ctx.fillStyle = '#0056b3';
                } else {
                    ctx.fillStyle = '#222';
                }
                ctx.fillText('・' + key, 12, i * rowH + rowH / 2);
            });
            // 右隣に10進値のみ表示（該当ビット範囲の値）
            if (window._lastArrForBin) {
                let start = 0;
                for (let k = 0; k < idx; ++k) start += byteFormats[keys[k]];
                const highlightStart = start;
                const highlightLen = byteFormats[keys[idx]];
                // 該当ビット範囲の値を10進で表示
                let decVal = '-';
                if (highlightLen > 0) {
                    let val = 0n;
                    for (let i = 0; i < highlightLen; ++i) {
                        // 対象ビットがバイト配列内にあるか確認
                        const bitIdx = highlightStart + i;
                        const byteIdx = Math.floor(bitIdx / 8);
                        const bitInByte = 7 - (bitIdx % 8);
                        const arr = window._lastArrForBin;
                        if (arr && arr.length > byteIdx) {
                            const bit = (arr[byteIdx] >> bitInByte) & 1;
                            val = (val << 1n) | BigInt(bit);
                        } else {
                            val = (val << 1n);
                        }
                    }
                    decVal = val.toString(10);
                }
                ctx.font = '16px monospace';
                ctx.fillStyle = '#333';
                ctx.textBaseline = 'middle';
                ctx.fillText(` (${decVal})`, 120, idx * rowH + rowH / 2);
                // 2進数canvasを強調描画
                drawBinCanvasWithHighlight(binCanvas, window._lastArrForBin, highlightStart, highlightLen);
            }
        }
    };
}
