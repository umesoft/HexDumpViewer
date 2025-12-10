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

    const CHUNK_SIZE = 64 * 1024; // 64KB
    const fileSize = file.size;
    const chunkCache = new Map(); // offset: Uint8Array

    function getDataCallback(offset, length) {
        const chunkStart = Math.floor(offset / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, fileSize);
        const chunkKey = `${chunkStart}`;
        if (chunkCache.has(chunkKey)) {
            const chunk = chunkCache.get(chunkKey);
            const startInChunk = offset - chunkStart;
            return Promise.resolve(chunk.subarray(startInChunk, startInChunk + length));
        }
        return new Promise((resolve, reject) => {
            const blob = file.slice(chunkStart, chunkEnd);
            const reader = new FileReader();
            reader.onload = function(e) {
                const chunk = new Uint8Array(e.target.result);
                chunkCache.set(chunkKey, chunk);
                const startInChunk = offset - chunkStart;
                resolve(chunk.subarray(startInChunk, startInChunk + length));
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    HexDump(container, fileSize, getDataCallback);
});
