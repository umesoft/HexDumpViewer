/**
 * バイト配列のフォーマット表示・2進数canvas描画をまとめて行う
 * @param {number[]} arr
 * @param {object} options - 必須: hexOut, decOut, binCanvas, endianRadios, byteFormats, selectedFormatIndexRef
 * @param {function} formatBytesByEndian
 */
export function updateByteFormatDisplay(arr, options, formatBytesByEndian) {
	const { hexOut, decOut, binCanvas, endianRadios, byteFormats, selectedFormatIndexRef } = options;
	// エンディアン取得
	let endian = 'BE';
	for (const r of endianRadios) {
		if (r.checked) endian = r.value;
	}
	// 表示
	const { hex, dec } = formatBytesByEndian(arr, endian);
	hexOut.textContent = hex;
	decOut.textContent = dec;
	// 仮想スクロール用インデックスをクロージャで保持
	if (!binCanvas._binScrollIndex) binCanvas._binScrollIndex = 0;
	let binScrollIndex = binCanvas._binScrollIndex;
	window._lastArrForBin = arr;
	drawBinCanvas(binCanvas, arr, binScrollIndex);

	// スクロールイベント登録
	binCanvas.onwheel = (e) => {
		const maxLines = 5;
		const maxScroll = Math.max(0, arr.length - maxLines);
		// スクロール方向でインデックスを更新
		if (e.deltaY > 0) {
			binScrollIndex = Math.min(binScrollIndex + 1, maxScroll);
		} else if (e.deltaY < 0) {
			binScrollIndex = Math.max(binScrollIndex - 1, 0);
		}
		binCanvas._binScrollIndex = binScrollIndex;
		// 再描画
		if (selectedFormatIndexRef.value >= 0) {
			const keys = Object.keys(byteFormats);
			let start = 0;
			for (let k = 0; k < selectedFormatIndexRef.value; ++k) start += byteFormats[keys[k]];
			const highlightStart = start;
			const highlightLen = byteFormats[keys[selectedFormatIndexRef.value]];
			drawBinCanvasWithHighlight(binCanvas, arr, highlightStart, highlightLen, binScrollIndex);
		} else {
			drawBinCanvas(binCanvas, arr, binScrollIndex);
		}
		e.preventDefault();
	};

	// スクロールバーのドラッグ操作
	let dragging = false, dragStartY = 0, dragStartIdx = 0;
	binCanvas.onmousedown = (e) => {
		const maxLines = 5;
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
			const maxLines = 5;
			const cellH = 28;
			const barH = Math.max(24, (maxLines / arr.length) * (cellH * maxLines));
			const maxScroll = Math.max(0, arr.length - maxLines);
			const deltaY = e.offsetY - dragStartY;
			const scrollArea = (cellH * maxLines) - barH;
			let newIdx = dragStartIdx + Math.round((deltaY / scrollArea) * maxScroll);
			newIdx = Math.max(0, Math.min(maxScroll, newIdx));
			if (newIdx !== binScrollIndex) {
				binScrollIndex = newIdx;
				if (selectedFormatIndexRef.value >= 0) {
					const keys = Object.keys(byteFormats);
					let start = 0;
					for (let k = 0; k < selectedFormatIndexRef.value; ++k) start += byteFormats[keys[k]];
					const highlightStart = start;
					const highlightLen = byteFormats[keys[selectedFormatIndexRef.value]];
					drawBinCanvasWithHighlight(binCanvas, arr, highlightStart, highlightLen, binScrollIndex);
				} else {
					drawBinCanvas(binCanvas, arr, binScrollIndex);
				}
			}
		}
	};
	binCanvas.onmouseup = () => { dragging = false; };
	binCanvas.onmouseleave = () => { dragging = false; };
}
// BIN Dump表示ライブラリ

/**
 * バイト配列を2進数でcanvasに描画
 * @param {HTMLCanvasElement} canvas 
 * @param {Uint8Array|number[]} arr 
 * @param {number} [scrollIdx=0]
 */
export function drawBinCanvas(canvas, arr, scrollIdx = 0) {
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const maxLines = 5;
	const cellW = 22, cellH = 28;
	const offsetW = 48;
	canvas.height = cellH * maxLines; // 常に5行分の高さに固定
	ctx.font = '16px monospace';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	// 仮想スクロール
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

/**
 * 2進数表示の強調描画用
 * @param {HTMLCanvasElement} canvas 
 * @param {Uint8Array|number[]} arr 
 * @param {number} highlightStartBit 
 * @param {number} highlightLenBit 
 * @param {number} [scrollIdx=0]
 */
export function drawBinCanvasWithHighlight(canvas, arr, highlightStartBit, highlightLenBit, scrollIdx = 0) {
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const maxLines = 5;
	const cellW = 22, cellH = 28;
	const offsetW = 48;
	canvas.height = cellH * maxLines;
	ctx.font = '16px monospace';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	let lines = arr.slice(scrollIdx, scrollIdx + maxLines);
	for (let i = 0; i < lines.length; ++i) {
		const b = lines[i];
		const y = i * cellH + cellH/2 + 4;
		ctx.fillStyle = '#888';
		ctx.textAlign = 'right';
		ctx.fillText((scrollIdx + i).toString(16).padStart(2, '0').toUpperCase() + ':', offsetW-8, y);
		ctx.textAlign = 'center';
		const bits = b.toString(2).padStart(8, '0');
		for (let j = 0; j < 8; ++j) {
			const x = offsetW + j * cellW + cellW/2;
			ctx.strokeStyle = '#888';
			ctx.strokeRect(offsetW + j * cellW, i * cellH + 2, cellW, cellH);
			const bitIdx = (i + scrollIdx) * 8 + j;
			if (highlightLenBit > 0 && bitIdx >= highlightStartBit && bitIdx < highlightStartBit + highlightLenBit) {
				ctx.font = 'bold 16px monospace';
				ctx.fillStyle = '#222';
			} else {
				ctx.fillStyle = '#888';
			}
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
