
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
    // 仮想スクロール用インデックス
    let binScrollIndex = 0;
    drawBinCanvas(binCanvas, arr, binScrollIndex);

    // スクロールイベント登録
    binCanvas.onwheel = (e) => {
        const maxLines = 10;
        const maxScroll = Math.max(0, arr.length - maxLines);
        if (e.deltaY > 0 && binScrollIndex < maxScroll) {
            binScrollIndex++;
            drawBinCanvas(binCanvas, arr, binScrollIndex);
        } else if (e.deltaY < 0 && binScrollIndex > 0) {
            binScrollIndex--;
            drawBinCanvas(binCanvas, arr, binScrollIndex);
        }
        e.preventDefault();
    };

    // スクロールバーのドラッグ操作
    let dragging = false, dragStartY = 0, dragStartIdx = 0;
    binCanvas.onmousedown = (e) => {
        // スクロールバーの位置・サイズ計算
        const maxLines = 10;
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
            const maxLines = 10;
            const cellH = 28;
            const barH = Math.max(24, (maxLines / arr.length) * (cellH * maxLines));
            const maxScroll = Math.max(0, arr.length - maxLines);
            const deltaY = e.offsetY - dragStartY;
            const scrollArea = (cellH * maxLines) - barH;
            let newIdx = dragStartIdx + Math.round((deltaY / scrollArea) * maxScroll);
            newIdx = Math.max(0, Math.min(maxScroll, newIdx));
            if (newIdx !== binScrollIndex) {
                binScrollIndex = newIdx;
                drawBinCanvas(binCanvas, arr, binScrollIndex);
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
    const maxLines = 10;
    const cellW = 22, cellH = 28;
    const offsetW = 48;
    canvas.height = cellH * maxLines; // 常に10行分の高さに固定
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
