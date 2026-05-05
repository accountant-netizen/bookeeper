// CommonJS shim implementing format detection and simple parsers for tests
function unquote(s) {
  return s.replace(/^\s*"|"\s*$/g, '').trim();
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase();
  let start = 0;
  if (header.includes('date') && header.includes('amount')) start = 1;
  const out = [];
  for (let i = start; i < lines.length; i++) {
    const row = lines[i];
    const parts = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(unquote);
    let date, amt, desc = '';
    for (const p of parts) {
      const trimmed = p.trim();
      if (!date && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) date = trimmed;
      else if (!date && /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) date = trimmed;
      else if (!amt) {
        const n = Number(trimmed.replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(n) && trimmed.match(/[0-9]/)) amt = n;
        else desc = desc ? desc + ' ' + trimmed : trimmed;
      } else desc = desc ? desc + ' ' + trimmed : trimmed;
    }
    if (typeof amt === 'undefined') {
      const last = parts[parts.length - 1];
      const n = Number(last.replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(n)) amt = n;
    }
    if (typeof amt === 'undefined') continue;
    out.push({ txn_date: date, description: desc || '', amount: amt });
  }
  return out;
}

function detectFormat(content) {
  const s = (content || '').trim();
  if (!s) return 'csv';
  if (/^OFXHEADER:/mi.test(s) || /<OFX[\s>]/i.test(s)) return 'ofx';
  if (/^:\d{2}:/m.test(s) && /:61:/.test(s)) return 'mt940';
  return 'csv';
}

function formatOfxDate(dt) {
  const y = dt.substring(0, 4);
  const m = dt.substring(4, 6);
  const d = dt.substring(6, 8);
  if (y && m && d) return `${y}-${m}-${d}`;
  return dt;
}

function parseOFX(content) {
  const out = [];
  const matches = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);
  if (matches && matches.length > 0) {
    for (const m of matches) {
      const dt = (m.match(/<DTPOSTED>([^<\s]+)/i) || [])[1];
      const amtRaw = (m.match(/<TRNAMT>([^<\s]+)/i) || [])[1];
      const name = (m.match(/<NAME>([^<\n]+)/i) || [])[1] || (m.match(/<MEMO>([^<\n]+)/i) || [])[1] || '';
      const date = dt ? formatOfxDate(dt) : undefined;
      const amount = amtRaw ? Number(String(amtRaw).replace(/[^0-9.-]/g, '')) : 0;
      out.push({ txn_date: date, description: (name || '').trim(), amount });
    }
    return out;
  }
  // fallback
  return [];
}

function parseMT940(content) {
  const out = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(':61:')) {
      const rest = line.substring(4).trim();
      const dateMatch = rest.match(/^(\d{6})/);
      const yyMMdd = dateMatch ? dateMatch[1] : undefined;
      let year = '20' + (yyMMdd ? yyMMdd.substring(0, 2) : '00');
      const month = yyMMdd ? yyMMdd.substring(2, 4) : '01';
      const day = yyMMdd ? yyMMdd.substring(4, 6) : '01';
      const txnDate = `${year}-${month}-${day}`;
      const amtMatch = rest.match(/([CD])([0-9,\.]+)/);
      let amount = 0;
      if (amtMatch) {
        const sign = amtMatch[1];
        const num = amtMatch[2].replace(/,/g, '.');
        amount = Number(num) * (sign === 'D' ? -1 : 1);
      }
      let desc = '';
      if (i + 1 < lines.length && lines[i + 1].startsWith(':86:')) {
        desc = lines[i + 1].substring(4).trim();
      }
      out.push({ txn_date: txnDate, description: desc, amount });
    }
  }
  return out;
}

module.exports = { parseCSV, detectFormat, parseOFX, parseMT940 };
