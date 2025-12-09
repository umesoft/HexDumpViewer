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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        HexDump(container, uint8Array);
    };
    reader.readAsArrayBuffer(file);
});
