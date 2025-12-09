// HEX Dump表示ライブラリ

function HexDump(container, data) {

    let scrollLine = 0;
    let dragging = false;
    let dragOffsetY = 0;
    let selectStart = null;
    let selectEnd = null;
    let isSelecting = false;
    let autoScrollTimer = null;

    // containerの内容をクリア
    container.innerHTML = '';

    // container自体にflexレイアウトを設定
    container.style.width = '650px';
    container.style.display = 'flex';
    container.style.alignItems = 'flex-start';

    // canvasを追加
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // スクロールバーを右隣に追加
    let scrollBar = document.createElement('div');
    scrollBar.style.width = '24px';
    scrollBar.style.background = '#eee';
    scrollBar.style.position = 'relative';
    scrollBar.style.marginLeft = '4px';
    scrollBar.style.borderRadius = '12px';
    scrollBar.id = 'scrollBar';
    container.appendChild(scrollBar);

    // ウィンドウリサイズ時にcanvasサイズも調整
    window.addEventListener('DOMContentLoaded', resizeCanvas);
    window.addEventListener('resize', resizeCanvas);

    function resizeCanvas() {
        // containerのpaddingやborderを考慮する場合は調整
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width - 28; // スクロールバー分引く
        canvas.height = rect.height;
        scrollBar.style.height = canvas.height + 'px';
        // スクロール位置がデータ終端を超えていたら調整
        const info = getScrollInfo(data, canvas);
        if (scrollLine > info.maxLine) {
            scrollLine = info.maxLine;
        }
        redraw();
    }

    function getScrollInfo(data, canvas) {
        const bytesPerLine = 16;
        const lineHeight = 24;
        const startY = 40;
        let visibleLines = Math.floor((canvas.height - startY) / lineHeight);
        if (visibleLines < 1) visibleLines = 1;
        const totalLines = Math.ceil(data.length / bytesPerLine);
        const maxLine = Math.max(0, totalLines - visibleLines);
        const endY = startY + visibleLines * lineHeight;
        return {bytesPerLine, lineHeight, startY, visibleLines, totalLines, maxLine, endY};
    }

    function drawHexDump(canvas, binaryData, startLine = 0, selStart, selEnd) {
        const info = getScrollInfo(data, canvas);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px monospace';
        ctx.textBaseline = 'top';
        const bytesPerLine = 16;
        const startX = 20;
        const marginX1 = 4;
        const marginX2 = 1;
        const marginY1 = 4;
        const marginY2 = 0;
        const hexSample = Array(bytesPerLine).fill('ff').join(' ') + ' ';
        const hexWidth = ctx.measureText(hexSample).width;
        const addrWidth = ctx.measureText('0000').width;
        const hexOffset = startX + addrWidth + 16;
        const asciiOffset = hexOffset + hexWidth + 20;
        let offsetStr = '';
        for (let i = 0; i < bytesPerLine; i++) {
            offsetStr += '+' + i.toString(16).toUpperCase().padStart(1, '0') + ' ';
        }
        ctx.fillStyle = '#009900';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(offsetStr, hexOffset, info.startY - info.lineHeight);
        ctx.font = '16px monospace';

        if (info.visibleLines < 1) info.visibleLines = 1;
        for (let line = 0; line < info.visibleLines; line++) {
            const dataLine = startLine + line;
            if (dataLine * bytesPerLine >= binaryData.length) break;
            let hexStr = '';
            let asciiStr = '';
            for (let i = 0; i < bytesPerLine; i++) {
                const idx = dataLine * bytesPerLine + i;
                // 選択範囲ハイライト
                if (selStart !== null && selEnd !== null && idx >= Math.min(selStart, selEnd) && idx <= Math.max(selStart, selEnd)) {
                    ctx.fillStyle = '#cceeff';
                    ctx.fillRect(
                        hexOffset + ctx.measureText(Array(i).fill('ff').join(' ') + (i ? ' ' : '')).width - marginX1,
                        info.startY + line * info.lineHeight - marginY1,
                        ctx.measureText('ff ').width + marginX2,
                        info.lineHeight + marginY2);
                    ctx.fillRect(
                        asciiOffset + ctx.measureText(asciiStr).width,
                        info.startY + line * info.lineHeight - marginY1,
                        ctx.measureText('.').width,
                        info.lineHeight + marginY2);
                }
                if (idx < binaryData.length) {
                    const byte = binaryData[idx];
                    hexStr += byte.toString(16).padStart(2, '0') + ' ';
                    asciiStr += (byte >= 0x20 && byte <= 0x7e) ? String.fromCharCode(byte) : '.';
                } else {
                    hexStr += '   ';
                    asciiStr += ' ';
                }
            }
            const addrStr = (dataLine * bytesPerLine).toString(16).padStart(4, '0');
            ctx.fillStyle = '#0066cc';
            ctx.fillText(addrStr, startX, info.startY + line * info.lineHeight);
            ctx.fillStyle = '#333';
            ctx.fillText(hexStr, hexOffset, info.startY + line * info.lineHeight);
            ctx.fillStyle = '#888';
            ctx.fillText(asciiStr, asciiOffset, info.startY + line * info.lineHeight);
        }
    }

    function drawScrollBar() {
        const info = getScrollInfo(data, canvas);
        if (info.maxLine === 0) {
            let thumb = scrollBar.querySelector('.thumb');
            if (thumb) {
                scrollBar.removeChild(thumb);
            }
        } else {
            const barHeight = scrollBar.clientHeight;
            const thumbHeight = Math.max(24, barHeight * info.visibleLines / info.totalLines);
            const top = (barHeight - thumbHeight) * scrollLine / info.maxLine;
            let thumb = scrollBar.querySelector('.thumb');
            if (!thumb) {
                thumb = document.createElement('div');
                thumb.className = 'thumb';
                thumb.style.position = 'absolute';
                thumb.style.left = '2px';
                thumb.style.width = '20px';
                scrollBar.appendChild(thumb);
            }
            thumb.style.height = thumbHeight + 'px';
            thumb.style.top = top + 'px';
            thumb.style.background = '#bbb';
            thumb.style.borderRadius = '10px';
            thumb.style.cursor = 'pointer';
        }
    }

    function redraw() {
        drawHexDump(canvas, data, scrollLine, selectStart, selectEnd);
        drawScrollBar();
    }

    // canvas上でマウスドラッグによる範囲選択
    canvas.addEventListener('mousedown', function(e) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const info = getScrollInfo(data, canvas);
        const line = Math.floor((y - info.startY) / info.lineHeight);
        const col = Math.floor((x - (20 + ctx.measureText('0000').width + 16)) / ctx.measureText('ff ').width);
        const idx = (scrollLine + line) * info.bytesPerLine + col;
        if (line >= 0 && col >= 0 && idx < data.length) {
            selectStart = idx;
            selectEnd = idx;
            isSelecting = true;
            redraw();
        }
    });
    scrollBar.addEventListener('mousedown', function(e) {
        const thumb = scrollBar.querySelector('.thumb');
        const rect = thumb.getBoundingClientRect();
        dragging = true;
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            dragOffsetY = e.clientY - rect.top;
            e.preventDefault();
        } else {
            const info = getScrollInfo(data, canvas);
            const barRect = scrollBar.getBoundingClientRect();
            const y = e.clientY - barRect.top;
            const barHeight = scrollBar.clientHeight;
            const thumbHeight = Math.max(24, barHeight * info.visibleLines / info.totalLines);
            const maxLine = info.maxLine;
            let newLine = Math.round((y - thumbHeight/2) * maxLine / (barHeight - thumbHeight));
            newLine = Math.max(0, Math.min(maxLine, newLine));
            scrollLine = newLine;
            redraw();
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (dragging) {
            const info = getScrollInfo(data, canvas);
            const barRect = scrollBar.getBoundingClientRect();
            const barHeight = scrollBar.clientHeight;
            const thumbHeight = Math.max(24, barHeight * info.visibleLines / info.totalLines);
            const maxLine = info.maxLine;
            let y = e.clientY - barRect.top - dragOffsetY;
            y = Math.max(0, Math.min(barHeight - thumbHeight, y));
            let newLine = Math.round(y * maxLine / (barHeight - thumbHeight));
            newLine = Math.max(0, Math.min(maxLine, newLine));
            scrollLine = newLine;
            redraw();
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        if (!isSelecting) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const info = getScrollInfo(data, canvas);
        let line = Math.floor((y - info.startY) / info.lineHeight);
        let col = Math.floor((x - (20 + ctx.measureText('0000').width + 16)) / ctx.measureText('ff ').width);
        // 範囲外ならタイマー開始
        if (y < info.startY) {
            if (!autoScrollTimer) {
                // --- 選択範囲更新 ---
                const idx = (scrollLine - 1) * info.bytesPerLine;
                if (idx < 0) {
                    selectEnd = 0;
                } else {
                    selectEnd = idx;
                }
                redraw();

                // タイマ開始
                autoScrollTimer = setInterval(() => {
                    autoScrollSelect(-1);
                }, 50); // 50msごと
            }
        } else if (info.endY < y) {
            if (!autoScrollTimer) {
                // --- 選択範囲更新 ---
                const idx = (scrollLine + line) * info.bytesPerLine - 1;
                if(data.length <= idx) {
                    selectEnd = data.length - 1;
                } else {
                    selectEnd = idx;
                }
                redraw();

                // タイマ開始
                autoScrollTimer = setInterval(() => {
                    autoScrollSelect(1);
                }, 50); // 50msごと
            }
        } else {
            // タイマ停止
            if (autoScrollTimer) {
                clearInterval(autoScrollTimer);
                autoScrollTimer = null;
            }

            // --- 選択範囲更新 ---
            const idx = (scrollLine + line) * info.bytesPerLine + col;
            if (idx < 0) {
                selectEnd = 0;
            } else if(data.length <= idx) {
                selectEnd = data.length - 1;
            } else {
                selectEnd = idx;
            }
            redraw();
        }
    });

    function autoScrollSelect(deltaLine) {
        const info = getScrollInfo(data, canvas);
        if (0 < deltaLine) {
            if (scrollLine < info.maxLine) {
                scrollLine++;
                selectEnd = selectEnd + info.bytesPerLine;
                if (data.length <= selectEnd) {
                    selectEnd = data.length - 1;
                }
                redraw();
            }
        } else if (deltaLine < 0) {
            if (0 < scrollLine) {
                scrollLine--;
                selectEnd = selectEnd - info.bytesPerLine;
                if (selectEnd < 0) {
                    selectEnd = 0;
                }
                redraw();
            }
        }
    }

    canvas.addEventListener('wheel', onWheel);
    scrollBar.addEventListener('wheel', onWheel);

    function onWheel(e) {
        const info = getScrollInfo(data, canvas);
        if (e.deltaY > 0 && scrollLine < info.maxLine) {
            scrollLine++;
            redraw();
        } else if (e.deltaY < 0 && scrollLine > 0) {
            scrollLine--;
            redraw();
        }
        e.preventDefault();
    }

    canvas.addEventListener('mouseup', onStopScroll);
    document.addEventListener('mouseup', onStopScroll);

    function onStopScroll(e) {
        dragging = false;
        isSelecting = false;
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
            autoScrollTimer = null;
        }
    }

    resizeCanvas();
}

export { HexDump };