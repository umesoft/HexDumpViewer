
import { HexDump } from './hex_dump_lib.js';
import { formatBytesByEndian } from './byte_format_view.js';

let hexDumpApi = null; // HexDumpのAPI参照用

const container = document.getElementById('hexDumpContainer');

const byte_input = document.getElementById('byteArrayInput');
const hexOut = document.getElementById('byteHexOut');
const decOut = document.getElementById('byteDecOut');
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
    const { hex, dec } = formatBytesByEndian(arr, endian);
    hexOut.textContent = hex;
    decOut.textContent = dec;
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
