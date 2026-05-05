import type { StatementLine } from "./bankParser";
import { createServerClient } from "./supabase";

type MatchRule = {
  id: string;
  pattern: any;
  priority: number;
};

// Evaluate a single rule against a line and a candidate transaction
function evalRule(rule: any, line: StatementLine, candidate: any) {
  // rule can have keys: description_contains, regex, amount_delta
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
  } catch (e) {
    // ignore rule eval errors
  }
  return score;
}

// Run rules + candidate matching for an import. Returns array of matched updates.
// Pure function: match lines to candidates using rules and heuristics.
export function matchLinesToCandidates(
  lines: Array<{ id: string; txn_date?: string; description?: string; amount: number }>,
  rules: Array<{ id: string; pattern: any; priority?: number }>,
  candidates: Array<{ id: string; description?: string; amount: number }>
) {
  const candMapped = (candidates || []).map((c: any) => ({ id: c.id, description: c.description, amount: Number(c.amount) }));
  const updates: Array<{ lineId: string; matchedId?: string; reason?: string }> = [];

  for (const l of lines || []) {
    const line = { txn_date: l.txn_date, description: l.description, amount: Number(l.amount) } as StatementLine;

    let matched: string | undefined = undefined;
    for (const r of rules || []) {
      const pattern = r.pattern || {};
      let bestScore = 0;
      let bestId: string | undefined;
      for (const c of candMapped) {
        const s = evalRule(pattern, line, c);
        if (s > bestScore) {
          bestScore = s;
          bestId = c.id;
        }
      }
      if (bestScore > 0.7) {
        matched = bestId;
        updates.push({ lineId: l.id, matchedId: matched, reason: `rule:${r.id}` });
        break;
      }
    }

    if (!matched) {
      let bestScore = 0;
      let bestId: string | undefined;
      for (const c of candMapped) {
        let score = 0;
        if (Math.abs(c.amount - line.amount) < 0.01) score += 0.6;
        const descA = String(line.description || "").toLowerCase();
        const descB = String(c.description || "").toLowerCase();
        if (descA && descB && (descA.includes(descB) || descB.includes(descA))) score += 0.4;
        if (score > bestScore) {
          bestScore = score;
          bestId = c.id;
        }
      }
      if (bestScore >= 0.9) {
        updates.push({ lineId: l.id, matchedId: bestId, reason: "heuristic" });
      }
    }
  }

  return updates;
}

export async function runMatchForImport(importId: string, companyId: string, userId: string) {
  const supabase = createServerClient();

  // Load lines
  const { data: lines } = await supabase.from("bank_statement_lines").select("id, txn_date, description, amount").eq("import_id", importId).order("created_at", { ascending: true });

  // Load rules for company
  const { data: rules } = await supabase.from("bank_statement_match_rules").select("id, pattern, priority").eq("company_id", companyId).order("priority", { ascending: true });

  // Load candidate transactions (recent posted journal_lines with amounts)
  const { data: candidates } = await supabase.from("journal_lines").select("id, journal_entry_id, description, debit, credit").eq("company_id", companyId).limit(500);

  const candMapped = (candidates || []).map((c: any) => ({ id: c.id, description: c.description, amount: Number(c.debit || 0) - Number(c.credit || 0) }));

  const inputs = (lines || []).map((l: any) => ({ id: l.id, txn_date: l.txn_date, description: l.description, amount: Number(l.amount) }));

  const updates = matchLinesToCandidates(inputs, rules || [], candMapped);

  // Apply updates (update matched_transaction_id in bank_statement_lines)
  for (const u of updates) {
    await supabase.from("bank_statement_lines").update({ matched_transaction_id: u.matchedId }).eq("id", u.lineId);
  }

  return { matched: updates.length, details: updates };
}

export default { runMatchForImport };
