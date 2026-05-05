export const postingRules = [
  "Every posted entry must have at least two journal lines.",
  "Debit total must equal credit total before posting.",
  "Posted entries are immutable and corrected by reversal."
] as const;

export const invariant = {
  balanceConstraint: "No journal entry is saved unless total_debit = total_credit."
} as const;

// Re-export types from shared-types for convenience
export type { PostJournalEntryRequest, PostJournalEntryResponse, JournalLineInput } from "@accountant/shared-types";

// Posting validation logic
export function validatePostingRequest(request: {
  lines: Array<{ debit: string; credit: string }>;
}): {
  valid: boolean;
  error?: string;
} {
  if (request.lines.length < 2) {
    return { valid: false, error: "Journal entry must have at least 2 lines" };
  }

  const totalDebit = request.lines.reduce((sum, line) => {
    return sum + parseFloat(line.debit || "0");
  }, 0);

  const totalCredit = request.lines.reduce((sum, line) => {
    return sum + parseFloat(line.credit || "0");
  }, 0);

  // Check balance with small tolerance for floating point
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    return {
      valid: false,
      error: `Entry is unbalanced: debit ${totalDebit} != credit ${totalCredit}`
    };
  }

  return { valid: true };
}
