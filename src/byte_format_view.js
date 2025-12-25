// バイトデータ加工表示用ライブラリ
// エンディアン指定で16進・10進表示

export function formatBytesByEndian(bytes, endian = 'BE') {
    // bytes: Uint8Array or Array of numbers
    // endian: 'BE' or 'LE'
    if (!Array.isArray(bytes) && !(bytes instanceof Uint8Array)) return { hex: '', dec: '', bin: '' };
    let arr = Array.from(bytes);
    if (endian === 'LE') arr = arr.slice().reverse();
    let hex = '-';
    let dec = '-';
    let bin = '-';
    if (arr.length > 0 && arr.length <= 8) {
        // 16進
        hex = arr.map(b => b.toString(16).padStart(2, '0')).join(' ');
        // 10進（BigIntでバイト連結）
        let val = 0n;
        for (let i = 0; i < arr.length; ++i) {
            val = (val << 8n) | BigInt(arr[i]);
        }
        dec = val.toString(10);
        // 2進（1バイトごとに1行）
        bin = arr.map(b => b.toString(2).padStart(8, '0')).join('\n');
    }
    return { hex, dec, bin };
}
