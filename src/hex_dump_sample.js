
import { HexDump } from './hex_dump_lib.js';
import { formatBytesByEndian } from './byte_format_view.js';

let hexDumpApi = null; // HexDumpのAPI参照用

const container = document.getElementById('hexDumpContainer');

const byte_input = document.getElementById('byteArrayInput');
const hexOut = document.getElementById('byteHexOut');
const decOut = document.getElementById('byteDecOut');
const binCanvas = document.getElementById('byteBinCanvas');
const endianRadios = document.getElementsByName('endian');

// 折りたたみ状態の管理
const collapsibleState = {
    move: false,     // データ移動は折りたたみ状態で開始
    search: false,   // データ検索は折りたたみ状態で開始
    byte: false      // バイトデータ表示は折りたたみ状態で開始
};

function initCollapsible() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', toggleCollapsible);
    });
}

function toggleCollapsible(e) {
    const sectionName = e.currentTarget.getAttribute('data-section');
    const contentDiv = document.getElementById(sectionName + '-content');
    const toggleSpan = e.currentTarget.querySelector('.collapsible-toggle');
    
    collapsibleState[sectionName] = !collapsibleState[sectionName];
    
    if (collapsibleState[sectionName]) {
        // 展開
        contentDiv.classList.remove('collapsed');
        toggleSpan.textContent = '▼';
    } else {
        // 折りたたみ
        contentDiv.classList.add('collapsed');
        toggleSpan.textContent = '▶';
    }
}

function resizeHexDumpContainer() {
    container.style.height = (window.innerHeight - 150) + 'px';
}

// 2進数部を強調表示するための連想配列
var byteFormats = {"ID":6, "名前":20, "設定値":12};

// byteFormatCanvasの選択状態を管理
var selectedFormatIndex = -1;

function updateByteFormatDisplay(arr) {
    // エンディアン取得
    let endian = 'BE';
    for (const r of endianRadios) {
        if (r.checked) endian = r.value;
    }
    // 表示
    const { hex, dec, bin } = formatBytesByEndian(arr, endian);
    hexOut.textContent = hex;
    decOut.textContent = dec;
    // 仮想スクロール用インデックス
    let binScrollIndex = 0;
    window._lastArrForBin = arr;
    drawBinCanvas(binCanvas, arr, binScrollIndex);

    // スクロールイベント登録
    binCanvas.onwheel = (e) => {
        const maxLines = 5;
        const maxScroll = Math.max(0, arr.length - maxLines);
        if (e.deltaY > 0 && binScrollIndex < maxScroll) {
            binScrollIndex++;
            if (selectedFormatIndex >= 0) {
                const keys = Object.keys(byteFormats);
                let start = 0;
                for (let k = 0; k < selectedFormatIndex; ++k) start += byteFormats[keys[k]];
                const highlightStart = start;
                const highlightLen = byteFormats[keys[selectedFormatIndex]];
                drawBinCanvasWithHighlight(binCanvas, arr, highlightStart, highlightLen, binScrollIndex);
            } else {
                drawBinCanvas(binCanvas, arr, binScrollIndex);
            }
        } else if (e.deltaY < 0 && binScrollIndex > 0) {
            binScrollIndex--;
            if (selectedFormatIndex >= 0) {
                const keys = Object.keys(byteFormats);
                let start = 0;
                for (let k = 0; k < selectedFormatIndex; ++k) start += byteFormats[keys[k]];
                const highlightStart = start;
                const highlightLen = byteFormats[keys[selectedFormatIndex]];
                drawBinCanvasWithHighlight(binCanvas, arr, highlightStart, highlightLen, binScrollIndex);
            } else {
                drawBinCanvas(binCanvas, arr, binScrollIndex);
            }
        }
        e.preventDefault();
    };

    // スクロールバーのドラッグ操作
    let dragging = false, dragStartY = 0, dragStartIdx = 0;
    binCanvas.onmousedown = (e) => {
        // スクロールバーの位置・サイズ計算
        const maxLines = 5;
        const cellH = 28;
        const barW = 12;
        const barH = Math.max(24, (maxLines / arr.length) * (cellH * maxLines));
        const maxScroll = Math.max(0, arr.length - maxLines);
        const barY = (binScrollIndex / (arr.length - maxLines)) * ((cellH * maxLines) - barH);
        const barX = binCanvas.width - barW - 2;
        if (
            arr.length > maxLines &&
            e.offsetX > barX &&
            e.offsetX < barX + barW &&
            e.offsetY >= barY &&
            e.offsetY <= barY + barH
        ) {
            dragging = true;
            dragStartY = e.offsetY;
            dragStartIdx = binScrollIndex;
        }
    };
    binCanvas.onmousemove = (e) => {
        if (dragging) {
            const maxLines = 5;
            const cellH = 28;
            const barH = Math.max(24, (maxLines / arr.length) * (cellH * maxLines));
            const maxScroll = Math.max(0, arr.length - maxLines);
            const deltaY = e.offsetY - dragStartY;
            const scrollArea = (cellH * maxLines) - barH;
            let newIdx = dragStartIdx + Math.round((deltaY / scrollArea) * maxScroll);
            newIdx = Math.max(0, Math.min(maxScroll, newIdx));
            if (newIdx !== binScrollIndex) {
                binScrollIndex = newIdx;
                if (selectedFormatIndex >= 0) {
                    const keys = Object.keys(byteFormats);
                    let start = 0;
                    for (let k = 0; k < selectedFormatIndex; ++k) start += byteFormats[keys[k]];
                    const highlightStart = start;
                    const highlightLen = byteFormats[keys[selectedFormatIndex]];
                    drawBinCanvasWithHighlight(binCanvas, arr, highlightStart, highlightLen, binScrollIndex);
                } else {
                    drawBinCanvas(binCanvas, arr, binScrollIndex);
                }
            }
        }
    };
    binCanvas.onmouseup = () => { dragging = false; };
    binCanvas.onmouseleave = () => { dragging = false; };
}

// 2進数表示をcanvasに描画
function drawBinCanvas(canvas, arr) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxLines = 5;
    const cellW = 22, cellH = 28;
    const offsetW = 48;
    canvas.height = cellH * maxLines; // 常に5行分の高さに固定
    ctx.font = '16px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    // 仮想スクロール
    let scrollIdx = arguments[2] || 0;
    let lines = arr.slice(scrollIdx, scrollIdx + maxLines);
    for (let i = 0; i < lines.length; ++i) {
        const b = lines[i];
        const y = i * cellH + cellH/2 + 4;
        // オフセット
        ctx.fillStyle = '#888';
        ctx.textAlign = 'right';
        ctx.fillText((scrollIdx + i).toString(16).padStart(2, '0').toUpperCase() + ':', offsetW-8, y);
        // 各ビット
        ctx.textAlign = 'center';
        const bits = b.toString(2).padStart(8, '0');
        for (let j = 0; j < 8; ++j) {
            const x = offsetW + j * cellW + cellW/2;
            ctx.strokeStyle = '#888';
            ctx.strokeRect(offsetW + j * cellW, i * cellH + 2, cellW, cellH);
            ctx.fillStyle = '#222';
            ctx.fillText(bits[j], x, y);
        }
    }
    // スクロールバー描画
    if (arr.length > maxLines) {
        const barW = 12;
        const barX = canvas.width - barW - 2;
        const barH = Math.max(24, (maxLines / arr.length) * (cellH * maxLines));
        const maxScroll = Math.max(0, arr.length - maxLines);
        const barY = (scrollIdx / (arr.length - maxLines)) * ((cellH * maxLines) - barH);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#888';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.restore();
    }
}

// 2進数表示の強調描画用
function drawBinCanvasWithHighlight(canvas, arr, highlightStartBit, highlightLenBit, scrollIdx) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxLines = 5;
    const cellW = 22, cellH = 28;
    const offsetW = 48;
    canvas.height = cellH * maxLines;
    ctx.font = '16px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    scrollIdx = scrollIdx || 0;
    let lines = arr.slice(scrollIdx, scrollIdx + maxLines);
    for (let i = 0; i < lines.length; ++i) {
        const b = lines[i];
        const y = i * cellH + cellH/2 + 4;
        ctx.fillStyle = '#888';
        ctx.textAlign = 'right';
        ctx.fillText((scrollIdx + i).toString(16).padStart(2, '0').toUpperCase() + ':', offsetW-8, y);
        ctx.textAlign = 'center';
        const bits = b.toString(2).padStart(8, '0');
        for (let j = 0; j < 8; ++j) {
            const x = offsetW + j * cellW + cellW/2;
            ctx.strokeStyle = '#888';
            ctx.strokeRect(offsetW + j * cellW, i * cellH + 2, cellW, cellH);
            const bitIdx = (i + scrollIdx) * 8 + j;
            if (highlightLenBit > 0 && bitIdx >= highlightStartBit && bitIdx < highlightStartBit + highlightLenBit) {
                // 強調表示する
                ctx.font = 'bold 16px monospace';
                ctx.fillStyle = '#222';
            } else {
                ctx.fillStyle = '#888';
            }
            ctx.fillText(bits[j], x, y);
        }
    }
    // スクロールバー描画（drawBinCanvasと同じ処理）
    if (arr.length > maxLines) {
        const barW = 12;
        const barX = canvas.width - barW - 2;
        const barH = Math.max(24, (maxLines / arr.length) * (cellH * maxLines));
        const maxScroll = Math.max(0, arr.length - maxLines);
        const barY = (scrollIdx / (arr.length - maxLines)) * ((cellH * maxLines) - barH);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#888';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.restore();
    }
}

// HEXダンプ選択→バイト配列入力欄反映
function setByteArrayInputFromSelection() {
    if (!hexDumpApi) return;
    hexDumpApi.getSelectedBytes().then(arr => {
        if (!arr || arr.length === 0) return;
        // 16進2桁スペース区切り
        const str = arr.map(b => b.toString(16).padStart(2, '0')).join(' ');
        byte_input.value = str;
        // byteFormatCanvasの選択状態を管理
        selectedFormatIndex = -1;
        // キー名選択解除時にbyteFormatCanvasも再描画
        const byteFormatCanvas = document.getElementById('byteFormatCanvas');
        if (byteFormatCanvas) {
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
        // 表示（2進数強調も解除）
        updateByteFormatDisplay(arr);
    });
}

window.addEventListener('DOMContentLoaded', () => {

    // 折りたたみ機能の初期化
    initCollapsible();

    // HEXダンプコンテナサイズ調整
    resizeHexDumpContainer();

    // バイトデータ加工表示UIの制御
    const btn = document.getElementById('byteFormatBtn');

    btn.addEventListener('click', () => {
        // 入力値をバイト配列に変換（スペース区切り）
        const arr = (byte_input.value || '').split(' ').map(s => s.trim()).filter(s => s !== '').map(s => parseInt(s, 16));
        if (arr.some(isNaN)) {
            hexOut.textContent = '-';
            decOut.textContent = '-';
            binOut.textContent = '-';
            return;
        }
        // 表示
        updateByteFormatDisplay(arr);
    });

    // HEXダンプcanvasクリック・選択時に反映
    container.addEventListener('mouseup', setByteArrayInputFromSelection);
    container.addEventListener('keyup', setByteArrayInputFromSelection);
});

window.addEventListener('resize', resizeHexDumpContainer);

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // byteFormatCanvasにbyteFormatsのキー名を箇条書きで表示
    const byteFormatCanvas = document.getElementById('byteFormatCanvas');
    const ctx = byteFormatCanvas.getContext('2d');
    ctx.clearRect(0, 0, byteFormatCanvas.width, byteFormatCanvas.height);
    ctx.font = '20px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#222';
    ctx.textAlign = 'left';
    const keys = Object.keys(byteFormats);
    const itemHeight = 28;
    // 文字サイズに合わせて背景とテキストを中央寄せで描画
    const pad = 8; // 上下余白
    const rowH = itemHeight + pad;
    byteFormatCanvas.height = rowH * keys.length;
    keys.forEach((key, i) => {
        ctx.font = '20px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#222';
        ctx.fillText('・' + key, 12, i * rowH + rowH / 2);
    });

    // byteFormatCanvasの選択状態を管理
    selectedFormatIndex = -1;

    /*
    // 2進数表示の強調描画用
    function drawBinCanvasWithHighlight(canvas, arr, highlightStartBit, highlightLenBit, scrollIdx) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const maxLines = 5;
        const cellW = 22, cellH = 28;
        const offsetW = 48;
        canvas.height = cellH * maxLines;
        ctx.font = '16px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        scrollIdx = scrollIdx || 0;
        let lines = arr.slice(scrollIdx, scrollIdx + maxLines);
        for (let i = 0; i < lines.length; ++i) {
            const b = lines[i];
            const y = i * cellH + cellH/2 + 4;
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.fillText((scrollIdx + i).toString(16).padStart(2, '0').toUpperCase() + ':', offsetW-8, y);
            ctx.textAlign = 'center';
            const bits = b.toString(2).padStart(8, '0');
            for (let j = 0; j < 8; ++j) {
                const x = offsetW + j * cellW + cellW/2;
                ctx.strokeStyle = '#888';
                ctx.strokeRect(offsetW + j * cellW, i * cellH + 2, cellW, cellH);
                const bitIdx = (i + scrollIdx) * 8 + j;
                if (highlightLenBit > 0 && bitIdx >= highlightStartBit && bitIdx < highlightStartBit + highlightLenBit) {
                    // 強調表示する
                    ctx.font = 'bold 16px monospace';
                    ctx.fillStyle = '#222';
                } else {
                    ctx.fillStyle = '#888';
                }
                ctx.fillText(bits[j], x, y);
            }
        }
        // スクロールバー描画（drawBinCanvasと同じ処理）
        if (arr.length > maxLines) {
            const barW = 12;
            const barX = canvas.width - barW - 2;
            const barH = Math.max(24, (maxLines / arr.length) * (cellH * maxLines));
            const maxScroll = Math.max(0, arr.length - maxLines);
            const barY = (scrollIdx / (arr.length - maxLines)) * ((cellH * maxLines) - barH);
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#888';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.restore();
        }
    }
    */

    // 選択イベント追加
    byteFormatCanvas.onclick = function(e) {
        const y = e.offsetY;
        const pad = 8;
        const rowH = itemHeight + pad;
        const idx = Math.floor(y / rowH);
        if (idx >= 0 && idx < keys.length) {
            selectedFormatIndex = idx;
            // 再描画: 選択中は背景色
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

    // HexDump呼び出し時にAPI参照を取得
    hexDumpApi = HexDump(
        container,
        file.size,
        (offset, length) => {
            return new Promise((resolve, reject) => {
                const blob = file.slice(offset, offset + length);
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve(new Uint8Array(e.target.result));
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });
        }
    );
});

// アドレス移動ボタン処理
document.getElementById('addressGoBtn').addEventListener('click', () => {
    if (!hexDumpApi) return;
    const input = document.getElementById('addressInput').value.trim();
    if (!input) return;
    // 0x有無に関わらず常に16進数として解釈
    let addr = parseInt(input.replace(/^0x/i, ''), 16);
    if (isNaN(addr) || addr < 0) {
        alert('アドレスは16進で入力してください');
        return;
    }
    hexDumpApi.moveCursorTo(addr);
});

// 検索機能
document.getElementById('searchBtn').addEventListener('click', async () => {
    if (!hexDumpApi) {
        alert('ファイルを読み込んでください');
        return;
    }
    
    const searchInput = document.getElementById('searchInput').value.trim();
    if (!searchInput) {
        alert('検索データを入力してください');
        return;
    }
    
    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    let pattern = [];
    
    try {
        if (searchType === 'hex') {
            // 16進数の場合（スペース区切り）
            const hexValues = searchInput.split(/\s+/).filter(s => s !== '');
            pattern = hexValues.map(s => {
                const val = parseInt(s, 16);
                if (isNaN(val) || val < 0 || val > 255) {
                    throw new Error('無効な16進数値: ' + s);
                }
                return val;
            });
        } else {
            // ASCIIの場合
            pattern = Array.from(searchInput).map(c => c.charCodeAt(0));
        }
        
        if (pattern.length === 0) {
            alert('検索パターンが空です');
            return;
        }
        
        // 検索実行
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = '<div class="search-results-header" style="padding:8px;">検索中...</div>';
        resultsDiv.style.display = 'block';
        
        const results = await hexDumpApi.searchData(new Uint8Array(pattern));
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="search-results-header">見つかりませんでした</div>';
        } else {
            let headerHtml = '<div class="search-results-header">';
            headerHtml += `検索結果: ${results.length}件${results.length >= 1000 ? ' (最大1000件まで表示)' : ''}</div>`;

            let listHtml = '<div class="search-results-list">';
            // 最大100件表示、それ以上はスクロール
            const displayCount = Math.min(results.length, 100);
            for (let i = 0; i < displayCount; i++) {
                const offset = results[i];
                const offsetHex = offset.toString(16).toUpperCase().padStart(8, '0');
                listHtml += `<div class="search-result-item" data-offset="${offset}" data-length="${pattern.length}">${offsetHex}</div>`;
            }
            listHtml += '</div>';
            
            resultsDiv.innerHTML = headerHtml + listHtml;
            
            // クリックイベントを設定
            resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const offset = parseInt(item.getAttribute('data-offset'));
                    const length = parseInt(item.getAttribute('data-length'));
                    hexDumpApi.moveCursorTo(offset, length);
                    
                    // 選択状態を表示
                    resultsDiv.querySelectorAll('.search-result-item').forEach(el => {
                        el.classList.remove('selected');
                    });
                    item.classList.add('selected');
                });
            });
        }
    } catch (e) {
        alert('検索エラー: ' + e.message);
    }
});

// 検索結果クリアボタン
document.getElementById('searchClearBtn').addEventListener('click', () => {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
});

// Enterキーで検索実行
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});
