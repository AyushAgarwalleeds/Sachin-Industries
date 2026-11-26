const signature = new TextEncoder().encode('AutoCAD Binary DXF\r\n\x1a\0');
const utf8 = new TextDecoder('utf-8');
const between = (n, lo, hi) => n >= lo && n <= hi;

// Decode Autodesk's binary group stream into code/value pairs for the same
// entity importer we use for text DXF. All binary numbers are little-endian.
export function dxfText(buffer) {
  const bytes = new Uint8Array(buffer);
  if (!signature.every((b, i) => bytes[i] === b)) return utf8.decode(bytes);
  const view = new DataView(buffer);
  let offset = signature.length;
  const legacy = bytes[offset + 1] !== 0;
  const tags = [];
  let characters = 0;
  const header = new TextDecoder('windows-1252').decode(bytes.subarray(offset, offset + 65536));
  const version = /AC10(\d\d)/.exec(header);
  const codepage = /ANSI_(\d+)/.exec(header)?.[1];
  let strings = utf8;
  if (version && Number(version[1]) < 21) {
    const encoding = {'932':'shift_jis','936':'gbk','949':'euc-kr','950':'big5'}[codepage] || 'windows-' + (codepage || '1252');
    try { strings = new TextDecoder(encoding); } catch { throw new Error('Re-save this DXF as UTF-8 to read its text encoding.'); }
  }
  function take(size) {
    if (offset + size > bytes.length) throw new Error('Truncated binary DXF at byte ' + offset);
    offset += size;
    return offset - size;
  }
  while (offset < bytes.length) {
    let code = legacy ? view.getUint8(take(1)) : view.getUint16(take(2), true);
    if (legacy && code === 255) code = view.getUint16(take(2), true);
    let value;
    if (between(code, 10, 59) || between(code, 110, 149) || between(code, 210, 239) || between(code,460,469) || between(code,1010,1059)) {
      value = view.getFloat64(take(8), true);
    } else if (between(code,60,79) || between(code,170,179) || between(code,270,289) || between(code,370,389) || between(code,400,409) || between(code,1060,1070)) {
      value = view.getInt16(take(2), true);
    } else if (between(code,90,99) || between(code,420,429) || between(code,440,459) || code === 1071) {
      value = view.getInt32(take(4), true);
    } else if (between(code,160,169)) {
      value = view.getBigInt64(take(8), true);
    } else if (between(code,290,299)) {
      value = view.getUint8(take(1));
    } else if (between(code,310,319) || code === 1004) {
      const size = view.getUint8(take(1));
      const start = take(size);
      value = Array.from(bytes.subarray(start,offset), b => b.toString(16).padStart(2,'0')).join('');
    } else {
      const end = bytes.indexOf(0,offset);
      if (end < 0) throw new Error('Incomplete text in binary DXF.');
      value = strings.decode(bytes.subarray(offset,end)).replace(/[\r\n]/g,' ');
      offset = end + 1;
    }
    const pair = code + '\n' + value + '\n';
    characters += pair.length;
    if (characters > 20*1024*1024 || tags.length >= 1000000) throw new Error('Decoded DXF exceeds the import limit.');
    tags.push(pair);
    if (code === 0 && value === 'EOF') return tags.join('');
  }
  throw new Error('The binary DXF has no end-of-file marker.');
}
