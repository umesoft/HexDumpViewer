// byteFormatCanvasの表示・制御処理を集約
import { drawBinCanvasWithHighlight } from './bin_dump_lib.js';

export const byteFormats = { "ID": 6, "名前": 20, "設定値": 12 };

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
            // 2進数canvasを強調描画
            let start = 0;
            for (let k = 0; k < idx; ++k) start += byteFormats[keys[k]];
            const highlightStart = start;
            const highlightLen = byteFormats[keys[idx]];
            if (window._lastArrForBin) {
                drawBinCanvasWithHighlight(binCanvas, window._lastArrForBin, highlightStart, highlightLen);
            }
        }
    };
}
