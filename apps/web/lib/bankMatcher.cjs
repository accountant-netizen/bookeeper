// CommonJS shim for test environment: export matchLinesToCandidates
function evalRule(rule, line, candidate) {
  let score = 0;
  try {
    if (rule.amount_delta !== undefined) {
      const delta = Math.abs((candidate.amount || 0) - (line.amount || 0));
      if (delta <= Number(rule.amount_delta)) score += 0.6;
    }
    if (rule.description_contains) {
      const want = String(rule.description_contains).toLowerCase();
      const have = String(line.description || "").toLowerCase();
      if (have.includes(want) || String(candidate.description || "").toLowerCase().includes(want)) score += 0.3;
    }
    if (rule.regex) {
      const re = new RegExp(rule.regex, "i");
      if (re.test(line.description || "") || re.test(candidate.description || "")) score += 0.4;
    }
  } catch (e) {}
  return score;
}

function matchLinesToCandidates(lines, rules, candidates) {
  const candMapped = (candidates || []).map(c => ({ id: c.id, description: c.description, amount: Number(c.amount) }));
  const updates = [];
  for (const l of lines || []) {
    const line = { txn_date: l.txn_date, description: l.description, amount: Number(l.amount) };
    let matched = undefined;
    for (const r of rules || []) {
      const pattern = r.pattern || {};
      let bestScore = 0;
      let bestId = undefined;
      for (const c of candMapped) {
        const s = evalRule(pattern, line, c);
        if (s > bestScore) { bestScore = s; bestId = c.id; }
      }
      if (bestScore > 0.7) {
        matched = bestId;
        updates.push({ lineId: l.id, matchedId: matched, reason: `rule:${r.id}` });
        break;
      }
    }
    if (!matched) {
      let bestScore = 0;
      let bestId = undefined;
      for (const c of candMapped) {
        let score = 0;
        if (Math.abs(c.amount - line.amount) < 0.01) score += 0.6;
        const descA = String(line.description || "").toLowerCase();
        const descB = String(c.description || "").toLowerCase();
        if (descA && descB && (descA.includes(descB) || descB.includes(descA))) score += 0.4;
        if (score > bestScore) { bestScore = score; bestId = c.id; }
      }
      if (bestScore >= 0.9) updates.push({ lineId: l.id, matchedId: bestId, reason: "heuristic" });
    }
  }
  return updates;
}

module.exports = { matchLinesToCandidates };
