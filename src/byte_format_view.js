// バイトデータ加工表示用ライブラリ
// エンディアン指定で16進・10進表示

export function formatBytesByEndian(bytes, endian = 'BE') {
    // bytes: Uint8Array or Array of numbers
    // endian: 'BE' or 'LE'
    if (!Array.isArray(bytes) && !(bytes instanceof Uint8Array)) return { hex: '', dec: '' };
    let arr = Array.from(bytes);
    if (endian === 'LE') arr = arr.slice().reverse();
    // 16進
    const hex = arr.map(b => b.toString(16).padStart(2, '0')).join(' ');
    // 10進
    const dec = arr.map(b => b.toString(10)).join(' ');
    return { hex, dec };
}
