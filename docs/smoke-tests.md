# Smoke Checks

Use these requests after setting an auth token and a valid `companyId`.

## Reports

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/reports/trial-balance?companyId=<companyId>&startDate=2026-05-01&endDate=2026-05-31"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/reports/balance-sheet?companyId=<companyId>&asOf=2026-05-31"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/reports/income-statement?companyId=<companyId>&startDate=2026-05-01&endDate=2026-05-31"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/reports/cash-flow?companyId=<companyId>&startDate=2026-05-01&endDate=2026-05-31"
```

## Inventory

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/inventory/products?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/inventory/stock-movements?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/inventory/stock-on-hand?companyId=<companyId>"
```

## Payroll

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/payroll/employees?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/payroll/payslips?companyId=<companyId>&startDate=2026-05-01&endDate=2026-05-31"
```

## Banking, Tax, Automation, Integrations

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/banking/accounts?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/banking/reconciliations?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/banking/checks?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/banking/statements?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/tax/bir-exports?companyId=<companyId>&startDate=2026-05-01&endDate=2026-05-31"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/payroll/tax-filings?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/automation/recurring-transactions?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/automation/reminders?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/automation/jobs?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" -X POST "http://localhost:3000/api/exports/reports" -H "Content-Type: application/json" -d '{"reportName":"Trial Balance","format":"csv","rows":[{"code":"1000","name":"Cash","balance":"100.00"}]}'
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/integrations/connectors?companyId=<companyId>"
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/documents?companyId=<companyId>"
```
