
import { HexDump } from './hex_dump_lib.js';
import { formatBytesByEndian } from './byte_format_view.js';

let hexDumpApi = null; // HexDumpのAPI参照用

const container = document.getElementById('hexDumpContainer');

const byte_input = document.getElementById('byteArrayInput');
const hexOut = document.getElementById('byteHexOut');
const decOut = document.getElementById('byteDecOut');
const binCanvas = document.getElementById('byteBinCanvas');
const endianRadios = document.getElementsByName('endian');

function resizeHexDumpContainer() {
    container.style.height = (window.innerHeight - 150) + 'px';
}

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
    drawBinCanvas(binCanvas, arr);
}

// 2進数表示をcanvasに描画
function drawBinCanvas(canvas, arr) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const maxLines = 10;
        const cellW = 22, cellH = 28;
        const offsetW = 48;
        ctx.font = '16px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        // 表示する行数を決定
        let lines = arr;
        // canvasの高さを全行分に自動調整
        let wrap = document.getElementById('byteBinCanvasWrap');
        if (wrap) {
            wrap.style.maxHeight = (cellH * maxLines) + 'px';
            canvas.height = cellH * lines.length;
        } else {
            canvas.height = cellH * Math.min(lines.length, maxLines);
        }
    for (let i = 0; i < lines.length; ++i) {
        const b = lines[i];
        const y = i * cellH + cellH/2 + 4;
        // オフセット
        ctx.fillStyle = '#888';
        ctx.textAlign = 'right';
        ctx.fillText((i).toString(16).padStart(2, '0').toUpperCase() + ':', offsetW-8, y);
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
    // 残り行数表示
    if (arr.length > maxLines) {
        ctx.fillStyle = '#c00';
        ctx.textAlign = 'left';
        ctx.fillText('... (' + (arr.length - maxLines) + ' more)', offsetW, maxLines * cellH + 16);
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
        // 表示
        updateByteFormatDisplay(arr);
    });
}

window.addEventListener('DOMContentLoaded', () => {

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
