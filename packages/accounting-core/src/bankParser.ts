// Lightweight bank statement parsing utilities
// Provide simple CSV parsing and heuristic matching helpers.

export type StatementLine = {
  txn_date?: string;
  description: string;
  amount: number;
  currency?: string;
};

function unquote(s: string) {
  return s.replace(/^\s*"|"\s*$/g, '').trim();
}

export function parseCSV(content: string): StatementLine[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // detect header
  const header = lines[0]?.toLowerCase() ?? '';
  let start = 0;
  if (header.includes('date') && header.includes('amount')) start = 1;

  const out: StatementLine[] = [];
  for (let i = start; i < lines.length; i++) {
    const row = lines[i];
    // naive CSV split (works for common simple exports)
    const parts = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(unquote);
    // heuristics: find date, amount, description
    let date: string | undefined;
    let amt: number | undefined;
    let desc = '';

    for (const p of parts) {
      const trimmed = p.trim();
      if (!date && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) date = trimmed;
      else if (!date && /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) date = trimmed; 
      else if (!amt) {
        const n = Number(trimmed.replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(n) && trimmed.match(/[0-9]/)) amt = n;
        else desc = desc ? desc + ' ' + trimmed : trimmed;
      } else {
        desc = desc ? desc + ' ' + trimmed : trimmed;
      }
    }

    if (typeof amt === 'undefined') {
      // try last column as amount
      const last = parts[parts.length - 1];
      const n = Number(last.replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(n)) amt = n;
    }

    if (typeof amt === 'undefined') continue; // skip unparseable rows

    out.push({ txn_date: date, description: desc || '', amount: amt });
  }

  return out;
}

export function detectFormat(content: string): 'csv' | 'ofx' | 'mt940' {
  const s = (content || '').trim();
  if (!s) return 'csv';
  if (/^OFXHEADER:/mi.test(s) || /<OFX[\s>]/i.test(s)) return 'ofx';
  // MT940 usually contains tags like :20: :25: :61: :86:
  if (/^:\d{2}:/m.test(s) && /:61:/.test(s)) return 'mt940';
  return 'csv';
}

export function parseOFX(content: string): StatementLine[] {
  const out: StatementLine[] = [];
  // Try to extract <STMTTRN> blocks
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

  // Fallback: try line-based scan for tags
  const lines = content.split(/\r?\n/);
  let cur: any = {};
  for (const line of lines) {
    if (!line) continue;
    const l = line.trim();
    const tagMatch = l.match(/^<([A-Z]+)>(.*)$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toUpperCase();
      const val = tagMatch[2].trim();
      if (tag === 'STMTTRN') { cur = {}; }
      if (tag === 'DTPOSTED') cur.dt = val;
      if (tag === 'TRNAMT') cur.amt = val;
      if (tag === 'NAME' || tag === 'MEMO') cur.desc = (cur.desc ? cur.desc + ' ' : '') + val;
      if (tag === '/STMTTRN' || tag === 'STMTTRN') {
        if (cur.amt) {
          out.push({ txn_date: cur.dt ? formatOfxDate(cur.dt) : undefined, description: cur.desc || '', amount: Number(String(cur.amt).replace(/[^0-9.-]/g, '')) });
        }
      }
    }
  }
  return out;
}

function formatOfxDate(dt: string) {
  // OFX dates often like YYYYMMDDHHMMSS or YYYYMMDD
  const y = dt.substring(0, 4);
  const m = dt.substring(4, 6);
  const d = dt.substring(6, 8);
  if (y && m && d) return `${y}-${m}-${d}`;
  return dt;
}

export function parseMT940(content: string): StatementLine[] {
  const out: StatementLine[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.startsWith(':61:')) {
      const rest = line.substring(4).trim();
      // date is first 6 digits
      const dateMatch = rest.match(/^(\d{6})/);
      const yyMMdd = dateMatch ? dateMatch[1] : undefined;
      let year = '20' + (yyMMdd ? yyMMdd.substring(0, 2) : '00');
      const month = yyMMdd ? yyMMdd.substring(2, 4) : '01';
      const day = yyMMdd ? yyMMdd.substring(4, 6) : '01';
      const txnDate = `${year}-${month}-${day}`;

      // amount: look for C or D followed by number
      const amtMatch = rest.match(/([CD])([0-9,\.]+)/);
      let amount = 0;
      if (amtMatch) {
        const sign = amtMatch[1];
        const num = amtMatch[2].replace(/,/g, '.');
        amount = Number(num) * (sign === 'D' ? -1 : 1);
      }

      // description often in :86: next line(s)
      let desc = '';
      if (i + 1 < lines.length && lines[i + 1].startsWith(':86:')) {
        desc = lines[i + 1].substring(4).trim();
      }

      out.push({ txn_date: txnDate, description: desc, amount });
    }
  }
  return out;
}

// Simple candidate matcher: returns short list of candidate strings from description
export function matchCandidates(line: StatementLine, candidates: Array<{id: string; description: string; amount: number}>, threshold = 0.75) {
  const text = (line.description || '').toLowerCase();
  const matches: Array<{id: string; score: number}> = [];
  for (const c of candidates) {
    let score = 0;
    if (Math.abs(c.amount - line.amount) < 0.01) score += 0.6;
    const desc = (c.description || '').toLowerCase();
    if (desc && text && desc.includes(text) || text.includes(desc)) score += 0.4;
    if (score > 0) matches.push({ id: c.id, score });
  }
  matches.sort((a,b) => b.score - a.score);
  return matches.filter(m => m.score >= threshold);
}

export default { parseCSV, matchCandidates };