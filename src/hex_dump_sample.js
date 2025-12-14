import { HexDump } from './hex_dump_lib.js';

const container = document.getElementById('hexDumpContainer');

function resizeHexDumpContainer() {
    container.style.height = (window.innerHeight - 110) + 'px';
}
window.addEventListener('DOMContentLoaded', resizeHexDumpContainer);
window.addEventListener('resize', resizeHexDumpContainer);


let hexDumpApi = null; // HexDumpのAPI参照用

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
