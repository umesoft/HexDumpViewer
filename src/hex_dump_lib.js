// HEX Dump表示ライブラリ

function HexDump(container, fileSize, getDataCallback) {

    // LRUキャッシュ（最大10個）
    const chunkCache = new Map();
    function setChunkCache(key, value) {
        if (chunkCache.has(key)) {
            chunkCache.delete(key); // 既存は一度消して後ろに追加
        }
        chunkCache.set(key, value);
        // 最大10個を超えたら最も古いものを削除
        if (chunkCache.size > 10) {
            const oldestKey = chunkCache.keys().next().value;
            chunkCache.delete(oldestKey);
        }
    }

    function getData(offset, length) {
        const CHUNK_SIZE = 64 * 1024; // 64KB
        const chunkStart1 = Math.floor(offset / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkEnd1 = Math.min(chunkStart1 + CHUNK_SIZE, fileSize);
        const chunkKey1 = `${chunkStart1}`;
        const startInChunk1 = offset - chunkStart1;
        const endOffset = offset + length;
        const chunkStart2 = Math.floor((endOffset - 1) / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkEnd2 = Math.min(chunkStart2 + CHUNK_SIZE, fileSize);
        const chunkKey2 = `${chunkStart2}`;

        const promises = [];

        if (chunkStart1 === chunkStart2) {
            // 1ブロックで収まる場合
            if (chunkCache.has(chunkKey1)) {
                promises.push(Promise.resolve(chunkCache.get(chunkKey1)));
            } else {
                promises.push(getDataCallback(chunkStart1, chunkEnd1 - chunkStart1));
            }
            return Promise.all(promises).then(([chunk1]) => {
                setChunkCache(chunkKey1, chunk1);
                return chunk1.subarray(startInChunk1, startInChunk1 + length);
            });
        } else {
            // 2ブロックにまたがる場合
            // 1つ目のブロック
            if (chunkCache.has(chunkKey1)) {
                promises.push(Promise.resolve(chunkCache.get(chunkKey1)));
            } else {
                promises.push(getDataCallback(chunkStart1, chunkEnd1 - chunkStart1));
            }
            // 2つ目のブロック
            if (chunkCache.has(chunkKey2)) {
                promises.push(Promise.resolve(chunkCache.get(chunkKey2)));
            } else {
                promises.push(getDataCallback(chunkStart2, chunkEnd2 - chunkStart2));
            }
            return Promise.all(promises).then(([chunk1, chunk2]) => {
                setChunkCache(chunkKey1, chunk1);
                setChunkCache(chunkKey2, chunk2);
                // 1つ目のブロックから必要分
                const part1 = chunk1.subarray(startInChunk1);
                // 2つ目のブロックから必要分
                const part2Len = length - part1.length;
                const part2 = chunk2.subarray(0, part2Len);
                // 連結
                const result = new Uint8Array(part1.length + part2.length);
                result.set(part1, 0);
                result.set(part2, part1.length);
                return result;
            });
        }
    }

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
    container.style.width = '750px';
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

    function getScrollInfo(canvas) {
        const bytesPerLine = 16;
        const lineHeight = 24;
        const startY = 40;
        let visibleLines = Math.floor((canvas.height - startY) / lineHeight);
        if (visibleLines < 1) visibleLines = 1;
        const totalLines = Math.ceil(fileSize / bytesPerLine);
        const maxLine = Math.max(0, totalLines - visibleLines);
        const endY = startY + visibleLines * lineHeight;
        return {bytesPerLine, lineHeight, startY, visibleLines, totalLines, maxLine, endY};
    }
    
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
        const info = getScrollInfo(canvas);
        if (scrollLine > info.maxLine) {
            scrollLine = info.maxLine;
        }
        redraw();
    }

    async function drawHexDump(canvas, startLine, selStart, selEnd) {
        const info = getScrollInfo(canvas);
        if (info.visibleLines < 1) info.visibleLines = 1;
        const bytesPerLine = 16;
        const startOffset = startLine * bytesPerLine;
        const readLength = info.visibleLines * bytesPerLine;
        const binaryData = await getData(startOffset, readLength);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px monospace';
        ctx.textBaseline = 'top';
        const startX = 20;
        const marginX1 = 4;
        const marginX2 = 1;
        const marginY1 = 4;
        const marginY2 = 0;
        const hexSample = Array(bytesPerLine).fill('ff').join(' ') + ' ';
        const hexWidth = ctx.measureText(hexSample).width;
        const addrWidth = ctx.measureText('0000000000000000').width;
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
        for (let line = 0; line < info.visibleLines; line++) {
            const dataLine = startLine + line;
            const lineOffset = (dataLine - startLine) * bytesPerLine;
            if (startOffset + lineOffset >= fileSize) break;
            let hexStr = '';
            let asciiStr = '';
            for (let i = 0; i < bytesPerLine; i++) {
                const idx = lineOffset + i;
                const fileIdx = startOffset + lineOffset + i;
                if (selStart !== null && selEnd !== null && fileIdx >= Math.min(selStart, selEnd) && fileIdx <= Math.max(selStart, selEnd)) {
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
                if (fileIdx < fileSize && idx < binaryData.length) {
                    const byte = binaryData[idx];
                    hexStr += byte.toString(16).padStart(2, '0') + ' ';
                    asciiStr += (byte >= 0x20 && byte <= 0x7e) ? String.fromCharCode(byte) : '.';
                } else {
                    hexStr += '   ';
                    asciiStr += ' ';
                }
            }
            const addrStr = (BigInt(dataLine) * BigInt(bytesPerLine)).toString(16).padStart(16, '0');
            ctx.fillStyle = '#0066cc';
            ctx.fillText(addrStr, startX, info.startY + line * info.lineHeight);
            ctx.fillStyle = '#333';
            ctx.fillText(hexStr, hexOffset, info.startY + line * info.lineHeight);
            ctx.fillStyle = '#888';
            ctx.fillText(asciiStr, asciiOffset, info.startY + line * info.lineHeight);
        }
    }

    function drawScrollBar() {
        const info = getScrollInfo(canvas);
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
        drawHexDump(canvas, scrollLine, selectStart, selectEnd);
        drawScrollBar();
    }

    // canvas上でマウスドラッグによる範囲選択
    canvas.addEventListener('mousedown', function(e) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const info = getScrollInfo(canvas);
        const line = Math.floor((y - info.startY) / info.lineHeight);
        const col = Math.floor((x - (20 + ctx.measureText('0000000000000000').width + 16)) / ctx.measureText('ff ').width);
        const idx = (scrollLine + line) * info.bytesPerLine + col;
        if (line >= 0 && col >= 0 && idx < fileSize) {
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
            const info = getScrollInfo(canvas);
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
            const info = getScrollInfo(canvas);
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
        const info = getScrollInfo(canvas);
        let line = Math.floor((y - info.startY) / info.lineHeight);
        let col = Math.floor((x - (20 + ctx.measureText('0000000000000000').width + 16)) / ctx.measureText('ff ').width);
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
                if(fileSize <= idx) {
                    selectEnd = fileSize - 1;
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
            } else if(fileSize <= idx) {
                selectEnd = fileSize - 1;
            } else {
                selectEnd = idx;
            }
            redraw();
        }
    });

    function autoScrollSelect(deltaLine) {
        const info = getScrollInfo(canvas);
        if (0 < deltaLine) {
            if (scrollLine < info.maxLine) {
                scrollLine++;
                selectEnd = selectEnd + info.bytesPerLine;
                if (fileSize <= selectEnd) {
                    selectEnd = fileSize - 1;
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


    // タッチ操作によるスクロール
    let touchStartY = null;
    let touchScrollLine = null;
    canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            touchStartY = e.touches[0].clientY;
            touchScrollLine = scrollLine;
        }
    });
    canvas.addEventListener('touchmove', function(e) {
        if (touchStartY !== null && e.touches.length === 1) {
            const info = getScrollInfo(canvas);
            const deltaY = e.touches[0].clientY - touchStartY;
            const lines = Math.round(-deltaY / info.lineHeight);
            let newScrollLine = touchScrollLine + lines;
            newScrollLine = Math.max(0, Math.min(info.maxLine, newScrollLine));
            if (newScrollLine !== scrollLine) {
                scrollLine = newScrollLine;
                redraw();
            }
            e.preventDefault();
        }
    });
    canvas.addEventListener('touchend', function(e) {
        touchStartY = null;
        touchScrollLine = null;
    });

    canvas.addEventListener('wheel', onWheel);
    scrollBar.addEventListener('wheel', onWheel);

    function onWheel(e) {
        const info = getScrollInfo(canvas);
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

    // キーボード操作
    window.addEventListener('keydown', function(e) {
        // 入力欄にフォーカスがある場合は無効化
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            return;
        }
        if (selectStart === null) return;
        const info = getScrollInfo(canvas);
        let cursor = selectEnd ?? selectStart;
        let moved = false;
        switch (e.key) {
            case 'ArrowUp':
                cursor -= info.bytesPerLine;
                moved = true;
                break;
            case 'ArrowDown':
                cursor += info.bytesPerLine;
                moved = true;
                break;
            case 'ArrowLeft':
                cursor -= 1;
                moved = true;
                break;
            case 'ArrowRight':
                cursor += 1;
                moved = true;
                break;
            case 'PageUp':
                cursor -= info.bytesPerLine * info.visibleLines;
                moved = true;
                break;
            case 'PageDown':
                cursor += info.bytesPerLine * info.visibleLines;
                moved = true;
                break;
            default:
                return;
        }
        if (!moved) return;
        cursor = Math.max(0, Math.min(fileSize - 1, cursor));
        if (e.shiftKey) {
            // Shift押下時は範囲選択
            if (selectEnd === null) selectEnd = selectStart;
            selectEnd = cursor;
        } else {
            // 通常は単一選択
            selectStart = cursor;
            selectEnd = cursor;
        }
        // スクロール位置調整
        const line = Math.floor(cursor / info.bytesPerLine);
        if (line < scrollLine) {
            scrollLine = line;
        } else if (line >= scrollLine + info.visibleLines) {
            scrollLine = line - info.visibleLines + 1;
        }
        redraw();
        e.preventDefault();
    });

    // 外部からカーソル移動を受け付けるAPI
    function moveCursorTo(addr) {
        addr = Math.max(0, Math.min(fileSize - 1, addr|0));
        selectStart = addr;
        selectEnd = addr;
        // スクロール位置調整（指定アドレスが一番上になるように）
        const info = getScrollInfo(canvas);
        const line = Math.floor(addr / info.bytesPerLine);
        scrollLine = line;
        // 範囲外防止
        if (scrollLine > info.maxLine) scrollLine = info.maxLine;
        if (scrollLine < 0) scrollLine = 0;
        redraw();
    }

    // 選択範囲のバイト配列を取得するAPI
    async function getSelectedBytes() {
        if (selectStart === null || selectEnd === null) return [];
        const start = Math.min(selectStart, selectEnd);
        const end = Math.max(selectStart, selectEnd);
        if (end < start) return [];
        const data = await getData(start, end - start + 1);
        return Array.from(data);
    }

    // データ検索API
    async function searchData(pattern) {
        if (!pattern || pattern.length === 0) return [];
        const results = [];
        const SEARCH_CHUNK_SIZE = 64 * 1024; // 64KB単位で検索
        let offset = 0;
    
        while (offset < fileSize && results.length < 1000) { // 最大1000件まで
            const chunkSize = Math.min(SEARCH_CHUNK_SIZE, fileSize - offset);
            const overlapSize = pattern.length - 1; // パターンがまたがる可能性を考慮
            const readSize = chunkSize + (offset + chunkSize < fileSize ? overlapSize : 0);
        
            const data = await getData(offset, readSize);
        
            // Boyer-Moore-Horspoolアルゴリズム簡易版で検索
            for (let i = 0; i <= data.length - pattern.length; i++) {
                let match = true;
                for (let j = 0; j < pattern.length; j++) {
                    if (data[i + j] !== pattern[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    // 発見時点のバイト列も保持して返す（デバッグ用途）
                    results.push(offset + i);
                    if (results.length >= 1000) break;
                }
            }
        
            offset += chunkSize;
        }
    
        return results;
    }

    resizeCanvas();
    // API返却
    return { moveCursorTo, getSelectedBytes, searchData };
}

export { HexDump };