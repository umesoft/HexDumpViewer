import { HexDump } from './hex_dump_lib.js';

const container = document.getElementById('hexDumpContainer');

function resizeHexDumpContainer() {
    container.style.height = (window.innerHeight - 110) + 'px';
}
window.addEventListener('DOMContentLoaded', resizeHexDumpContainer);
window.addEventListener('resize', resizeHexDumpContainer);

const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    function getDataCallback(offset, length) {
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
    HexDump(
        container, 
        file.size, 
        getDataCallback
    );
});
