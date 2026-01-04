
import { HexDump } from './hex_dump_lib.js';
import { formatBytesByEndian } from './byte_format_view.js';
import { drawBinCanvas, drawBinCanvasWithHighlight, updateByteFormatDisplay } from './bin_dump_lib.js';
import { byteFormats, renderByteFormatCanvas, setupByteFormatCanvasEvents, loadByteFormatsFromSetting, resetByteFormatSelection } from './byte_format_canvas.js';

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

// byteFormatCanvasの選択状態を管理
var selectedFormatIndex = -1;

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
        // 2進数表示部のスクロール位置をリセット
        if (binCanvas && typeof binCanvas._binScrollIndex !== 'undefined') {
            binCanvas._binScrollIndex = 0;
        }
        // キー名選択解除時にbyteFormatCanvasも再描画
        const byteFormatCanvas = document.getElementById('byteFormatCanvas');
        if (byteFormatCanvas) {
            renderByteFormatCanvas(byteFormatCanvas, { value: selectedFormatIndex });
        }
        // 2進数表示部を表示更新（2進数強調も解除）
        updateByteFormatDisplay(arr, {
            hexOut,
            decOut,
            binCanvas,
            endianRadios,
            byteFormats,
            selectedFormatIndexRef: { value: selectedFormatIndex }
        }, formatBytesByEndian);
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
        // 2進数表示部のスクロール位置をリセット
        if (binCanvas && typeof binCanvas._binScrollIndex !== 'undefined') {
            binCanvas._binScrollIndex = 0;
        }
        // 2進数表示部を表示更新
        updateByteFormatDisplay(arr, {
            hexOut,
            decOut,
            binCanvas,
            endianRadios,
            byteFormats,
            selectedFormatIndexRef: { value: selectedFormatIndex }
        }, formatBytesByEndian);
    });
    // byteFormatCanvasの初期描画とイベント登録
    const byteFormatCanvas = document.getElementById('byteFormatCanvas');
    // 設定ファイルを読み込んでbyteFormatsを初期化
    loadByteFormatsFromSetting().then(() => {
        if (byteFormatCanvas) {
            renderByteFormatCanvas(byteFormatCanvas, { value: selectedFormatIndex });
            setupByteFormatCanvasEvents(byteFormatCanvas, { value: selectedFormatIndex }, binCanvas);
        }
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

    // byteFormatCanvasの初期描画とイベント登録
    const byteFormatCanvas = document.getElementById('byteFormatCanvas');
    if (byteFormatCanvas) {
        renderByteFormatCanvas(byteFormatCanvas, { value: selectedFormatIndex });
        setupByteFormatCanvasEvents(byteFormatCanvas, { value: selectedFormatIndex }, binCanvas);
    }
    selectedFormatIndex = -1;

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
