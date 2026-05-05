const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const requiredFiles = [
  "apps/web/app/api/reports/trial-balance/route.ts",
  "apps/web/app/api/reports/ledger/[accountId]/route.ts",
  "apps/web/app/api/reports/balance-sheet/route.ts",
  "apps/web/app/api/reports/income-statement/route.ts",
  "apps/web/app/api/reports/cash-flow/route.ts",
  "apps/web/app/api/inventory/products/route.ts",
  "apps/web/app/api/inventory/stock-movements/route.ts",
  "apps/web/app/api/inventory/stock-on-hand/route.ts",
  "apps/web/app/api/payroll/employees/route.ts",
  "apps/web/app/api/payroll/payslips/route.ts",
  "apps/web/app/api/banking/accounts/route.ts",
  "apps/web/app/api/banking/reconciliations/route.ts",
  "apps/web/app/api/banking/checks/route.ts",
  "apps/web/app/api/tax/bir-exports/route.ts",
  "apps/web/app/api/automation/recurring-transactions/route.ts",
  "apps/web/app/api/automation/reminders/route.ts",
  "apps/web/app/api/automation/jobs/route.ts",
  "apps/web/app/api/automation/jobs/process/route.ts",
  "apps/web/app/api/exports/reports/route.ts",
  "apps/web/app/api/integrations/connectors/route.ts",
  "apps/web/app/api/integrations/connectors/[connectorId]/sync/route.ts",
  "apps/web/app/api/banking/statements/route.ts",
  "apps/web/app/api/banking/statements/[importId]/match/route.ts",
  "apps/web/app/api/payroll/tax-filings/route.ts",
  "apps/web/app/api/documents/route.ts",
  "apps/web/app/api/documents/ocr/route.ts",
  "docs/api-overview.md",
  "docs/smoke-tests.md",
  "docs/worker-runtime.md"
];

const requiredPhrases = [
  ["apps/web/app/api/reports/trial-balance/route.ts", "companyId"],
  ["apps/web/app/api/reports/trial-balance/route.ts", "startDate"],
  ["apps/web/app/api/reports/ledger/[accountId]/route.ts", "runningBalance"],
  ["apps/web/app/api/reports/balance-sheet/route.ts", "asOf"],
  ["apps/web/app/api/reports/income-statement/route.ts", "startDate and endDate are required"],
  ["apps/web/app/api/reports/cash-flow/route.ts", "cashAccounts"],
  ["apps/web/app/api/inventory/products/route.ts", "code and name are required"],
  ["apps/web/app/api/inventory/stock-movements/route.ts", "movementType"],
  ["apps/web/app/api/inventory/stock-on-hand/route.ts", "movement_type"],
  ["apps/web/app/api/payroll/employees/route.ts", "employeeNo"],
  ["apps/web/app/api/payroll/payslips/route.ts", "payPeriodStart"],
  ["apps/web/app/api/banking/accounts/route.ts", "ledger_account_id"],
  ["apps/web/app/api/banking/reconciliations/route.ts", "statement_balance"],
  ["apps/web/app/api/banking/checks/route.ts", "checkNo"],
  ["apps/web/app/api/tax/bir-exports/route.ts", "netTaxDue"],
  ["apps/web/app/api/automation/recurring-transactions/route.ts", "templateType"],
  ["apps/web/app/api/automation/reminders/route.ts", "reminderDate"],
  ["apps/web/app/api/automation/jobs/route.ts", "idempotencyKey"],
  ["apps/web/app/api/automation/jobs/process/route.ts", "processedCount"],
  ["apps/web/app/api/exports/reports/route.ts", "application/pdf"],
  ["apps/web/app/api/integrations/connectors/route.ts", "supportedProviders"],
  ["apps/web/app/api/integrations/connectors/[connectorId]/sync/route.ts", "connectorId"],
  ["apps/web/app/api/banking/statements/route.ts", "statementName"],
  ["apps/web/app/api/banking/statements/[importId]/match/route.ts", "bankStatementLineId"],
  ["apps/web/app/api/payroll/tax-filings/route.ts", "filingType"],
  ["apps/web/app/api/documents/route.ts", "filename"],
  ["apps/web/app/api/documents/ocr/route.ts", "documentId"],
  ["docs/api-overview.md", "Reports"],
  ["docs/smoke-tests.md", "curl -H"],
  ["docs/worker-runtime.md", "POST /api/automation/jobs/process"]
];

const failures = [];

for (const relativePath of requiredFiles) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${relativePath}`);
  }
}

for (const [relativePath, phrase] of requiredPhrases) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file for content check: ${relativePath}`);
    continue;
  }
  const contents = fs.readFileSync(filePath, "utf8");
  if (!contents.includes(phrase)) {
    failures.push(`Missing phrase "${phrase}" in ${relativePath}`);
  }
}

if (failures.length > 0) {
  console.error("Smoke checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Smoke checks passed for ${requiredFiles.length} files and ${requiredPhrases.length} content checks.`);
