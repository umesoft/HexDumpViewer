// byteFormatCanvasの表示・制御処理を集約
import { drawBinCanvasWithHighlight } from './bin_dump_lib.js';

export let byteFormats = {};

// 設定ファイルを読み込んでbyteFormatsを初期化
export async function loadByteFormatsFromSetting(path = './format_setting.json') {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error('設定ファイルの読み込みに失敗しました');
        const json = await res.json();
        byteFormats = json;
    } catch (e) {
        // デフォルト値
        byteFormats = { "ID": 2, "名前": 4, "設定値": 3 };
        alert('format_setting.jsonの読み込みエラー:', e);
    }
}

export function resetByteFormatSelection(selectedFormatIndexRef) {
    selectedFormatIndexRef.value = -1;
}

export function renderByteFormatCanvas(byteFormatCanvas, selectedFormatIndexRef) {
    const ctx = byteFormatCanvas.getContext('2d');
    const keys = Object.keys(byteFormats);
    const itemHeight = 28;
    const pad = 8;
    const rowH = itemHeight + pad;
    const maxLines = 3;
    let scrollIdx = byteFormatCanvas._scrollIdx || 0;
    if (keys.length <= maxLines) scrollIdx = 0;
    byteFormatCanvas._scrollIdx = scrollIdx;
    byteFormatCanvas.height = rowH * Math.min(keys.length, maxLines);
    ctx.clearRect(0, 0, byteFormatCanvas.width, byteFormatCanvas.height);
    ctx.font = '20px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#222';
    for (let i = 0; i < Math.min(keys.length, maxLines); ++i) {
        const idx = i + scrollIdx;
        // 選択中の項目なら背景色と値表示
        ctx.font = '16px monospace';
        if (selectedFormatIndexRef.value === idx) {
            ctx.fillStyle = '#cce5ff';
            ctx.fillRect(0, i * rowH, byteFormatCanvas.width, rowH);
            ctx.fillStyle = '#0056b3';
            ctx.fillText('・' + keys[idx], 12, i * rowH + rowH / 2);
            // 右隣に10進値のみ表示（該当ビット範囲の値）
            if (window._lastArrForBin) {
                let start = 0;
                for (let k = 0; k < idx; ++k) start += byteFormats[keys[k]];
                const highlightStart = start;
                const highlightLen = byteFormats[keys[idx]];
                let decVal = '-';
                if (highlightLen > 0) {
                    let val = 0n;
                    for (let j = 0; j < highlightLen; ++j) {
                        const bitIdx = highlightStart + j;
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
                ctx.fillStyle = '#333';
                ctx.textBaseline = 'middle';
                ctx.fillText(` (${decVal})`, 120, i * rowH + rowH / 2);
            }
        } else {
            ctx.fillStyle = '#222';
            ctx.fillText('・' + keys[idx], 12, i * rowH + rowH / 2);
        }
    }
    // スクロールバー描画
    if (keys.length > maxLines) {
        const barW = 12;
        const barX = byteFormatCanvas.width - barW - 2;
        const barH = Math.max(24, (maxLines / keys.length) * (rowH * maxLines));
        const maxScroll = Math.max(0, keys.length - maxLines);
        const barY = (scrollIdx / maxScroll) * ((rowH * maxLines) - barH);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#888';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.restore();
    }
}

export function setupByteFormatCanvasEvents(byteFormatCanvas, selectedFormatIndexRef, binCanvas) {
        // スクロールバーのドラッグ操作
        let dragging = false, dragStartY = 0, dragStartIdx = 0;
        byteFormatCanvas.onmousedown = function(e) {
            const keys = Object.keys(byteFormats);
            const itemHeight = 28;
            const pad = 8;
            const rowH = itemHeight + pad;
            const maxLines = 3;
            const barW = 12;
            const barH = Math.max(24, (maxLines / keys.length) * (rowH * maxLines));
            const maxScroll = Math.max(0, keys.length - maxLines);
            const barX = byteFormatCanvas.width - barW - 2;
            let scrollIdx = byteFormatCanvas._scrollIdx || 0;
            const barY = (scrollIdx / maxScroll) * ((rowH * maxLines) - barH);
            if (
                keys.length > maxLines &&
                e.offsetX > barX &&
                e.offsetX < barX + barW &&
                e.offsetY >= barY &&
                e.offsetY <= barY + barH
            ) {
                dragging = true;
                dragStartY = e.offsetY;
                dragStartIdx = scrollIdx;
            }
        };
        byteFormatCanvas.onmousemove = function(e) {
            if (dragging) {
                const keys = Object.keys(byteFormats);
                const itemHeight = 28;
                const pad = 8;
                const rowH = itemHeight + pad;
                const maxLines = 3;
                const barH = Math.max(24, (maxLines / keys.length) * (rowH * maxLines));
                const maxScroll = Math.max(0, keys.length - maxLines);
                const deltaY = e.offsetY - dragStartY;
                const scrollArea = (rowH * maxLines) - barH;
                let newIdx = dragStartIdx + Math.round((deltaY / scrollArea) * maxScroll);
                newIdx = Math.max(0, Math.min(maxScroll, newIdx));
                if (newIdx !== byteFormatCanvas._scrollIdx) {
                    byteFormatCanvas._scrollIdx = newIdx;
                    renderByteFormatCanvas(byteFormatCanvas, selectedFormatIndexRef);
                }
            }
        };
        byteFormatCanvas.onmouseup = () => { dragging = false; };
        byteFormatCanvas.onmouseleave = () => { dragging = false; };
    const keys = Object.keys(byteFormats);
    const itemHeight = 28;
    const pad = 8;
    const rowH = itemHeight + pad;
    byteFormatCanvas.onclick = function(e) {
        const maxLines = 3;
        let scrollIdx = byteFormatCanvas._scrollIdx || 0;
        const y = e.offsetY;
        const idx = Math.floor(y / rowH) + scrollIdx;
        if (idx >= 0 && idx < keys.length) {
            selectedFormatIndexRef.value = idx;
            // 再描画: 選択中は背景色
            renderByteFormatCanvas(byteFormatCanvas, selectedFormatIndexRef);
            // 選択行の背景色と値表示
            const ctx = byteFormatCanvas.getContext('2d');
            ctx.font = '20px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#cce5ff';
            ctx.fillRect(0, (idx-scrollIdx) * rowH, byteFormatCanvas.width, rowH);
            ctx.fillStyle = '#0056b3';
            ctx.fillText('・' + keys[idx], 12, (idx-scrollIdx) * rowH + rowH / 2);
            // 右隣に10進値のみ表示（該当ビット範囲の値）
            if (window._lastArrForBin) {
                let start = 0;
                for (let k = 0; k < idx; ++k) start += byteFormats[keys[k]];
                const highlightStart = start;
                const highlightLen = byteFormats[keys[idx]];
                let decVal = '-';
                if (highlightLen > 0) {
                    let val = 0n;
                    for (let i = 0; i < highlightLen; ++i) {
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
                ctx.fillText(` (${decVal})`, 120, (idx-scrollIdx) * rowH + rowH / 2);
                drawBinCanvasWithHighlight(binCanvas, window._lastArrForBin, highlightStart, highlightLen);
            }
        }
    };

    // マウスホイール対応
    byteFormatCanvas.onwheel = function(e) {
        const maxLines = 3;
        const maxScroll = Math.max(0, keys.length - maxLines);
        let scrollIdx = byteFormatCanvas._scrollIdx || 0;
        if (e.deltaY > 0) {
            scrollIdx = Math.min(scrollIdx + 1, maxScroll);
        } else if (e.deltaY < 0) {
            scrollIdx = Math.max(scrollIdx - 1, 0);
        }
        byteFormatCanvas._scrollIdx = scrollIdx;
        renderByteFormatCanvas(byteFormatCanvas, selectedFormatIndexRef);
        e.preventDefault();
    };
}
