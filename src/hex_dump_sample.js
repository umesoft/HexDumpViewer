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
        const chunkStart1 = Math.floor(offset / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkEnd1 = Math.min(chunkStart1 + CHUNK_SIZE, fileSize);
        const chunkKey1 = `${chunkStart1}`;
        const startInChunk1 = offset - chunkStart1;
        const endOffset = offset + length;
        const chunkStart2 = Math.floor((endOffset - 1) / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkEnd2 = Math.min(chunkStart2 + CHUNK_SIZE, fileSize);
        const chunkKey2 = `${chunkStart2}`;

        // 1ブロックで収まる場合
        if (chunkStart1 === chunkStart2) {
            if (chunkCache.has(chunkKey1)) {
                const chunk = chunkCache.get(chunkKey1);
                return Promise.resolve(chunk.subarray(startInChunk1, startInChunk1 + length));
            }
            return new Promise((resolve, reject) => {
                const blob = file.slice(chunkStart1, chunkEnd1);
                const reader = new FileReader();
                reader.onload = function(e) {
                    const chunk = new Uint8Array(e.target.result);
                    chunkCache.set(chunkKey1, chunk);
                    resolve(chunk.subarray(startInChunk1, startInChunk1 + length));
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });
        }

        // 2ブロックにまたがる場合
        const promises = [];
        // 1つ目のブロック
        if (chunkCache.has(chunkKey1)) {
            promises.push(Promise.resolve(chunkCache.get(chunkKey1)));
        } else {
            promises.push(new Promise((resolve, reject) => {
                const blob = file.slice(chunkStart1, chunkEnd1);
                const reader = new FileReader();
                reader.onload = function(e) {
                    const chunk = new Uint8Array(e.target.result);
                    chunkCache.set(chunkKey1, chunk);
                    resolve(chunk);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            }));
        }
        // 2つ目のブロック
        if (chunkCache.has(chunkKey2)) {
            promises.push(Promise.resolve(chunkCache.get(chunkKey2)));
        } else {
            promises.push(new Promise((resolve, reject) => {
                const blob = file.slice(chunkStart2, chunkEnd2);
                const reader = new FileReader();
                reader.onload = function(e) {
                    const chunk = new Uint8Array(e.target.result);
                    chunkCache.set(chunkKey2, chunk);
                    resolve(chunk);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            }));
        }

        return Promise.all(promises).then(([chunk1, chunk2]) => {
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

    HexDump(container, fileSize, getDataCallback);
});
