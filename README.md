
# Hex Dump Viewer

This viewer provides a web UI that displays a hexadecimal dump on a Canvas, with scrollbar and range selection features.

## File Structure
- src/index.html : HTML for Canvas and script
- src/hex_dump_lib.js : Hex dump display library (ES module)
- src/hex_dump_sample.js : Sample usage of the library

## Main Features
- Displays 16 bytes per line
- Shows binary data (Uint8Array) as a hex dump on Canvas
- Scrollbar for moving the display range
- Byte range selection by mouse drag (highlighted selection)
- Auto-scroll when mouse moves outside the display area during selection
- ES module structure
- Canvas size automatically adjusts to the container size
- When resizing, if the scroll position exceeds the end of the data, it is automatically adjusted so the whole data is visible

## Usage
1. Open `src/index.html` via a web server (e.g. VS Code Live Server) at http://
2. The scrollbar appears on the right of the Canvas, and the hex dump is displayed
3. You can select a byte range by dragging the mouse
4. Sample data is defined in `hex_dump_sample.js`. To display your own data, call `HexDump(canvas, Uint8Array)`

## Notes
- If you open the file directly (file://), ES module CORS restrictions will prevent it from working. Always access via a web server.
- To add features or customize, edit `hex_dump_lib.js`.

## Demo
- [Demo](https://umesoft.co.jp/samples/hex_dump_viewer/)
