# API Overview

This repository now includes report, inventory, and payroll endpoints that are scoped by `companyId` and accept date filters where applicable.

## Reports

- `GET /api/reports/trial-balance`
  - Query params: `companyId`, `branchId`, `startDate`, `endDate`
- `GET /api/reports/ledger/:accountId`
  - Query params: `companyId`, `branchId`, `startDate`, `endDate`
- `GET /api/reports/balance-sheet`
  - Query params: `companyId`, `branchId`, `asOf`
- `GET /api/reports/income-statement`
  - Query params: `companyId`, `branchId`, `startDate`, `endDate`
- `GET /api/reports/cash-flow`
  - Query params: `companyId`, `branchId`, `startDate`, `endDate`

## Inventory

- `GET /api/inventory/products`
- `POST /api/inventory/products`
- `GET /api/inventory/stock-movements`
- `POST /api/inventory/stock-movements`
- `GET /api/inventory/stock-on-hand`

## Payroll

- `GET /api/payroll/employees`
- `POST /api/payroll/employees`
- `GET /api/payroll/payslips`
- `POST /api/payroll/payslips`

## Banking

- `GET /api/banking/accounts`
- `POST /api/banking/accounts`
- `GET /api/banking/reconciliations`
- `POST /api/banking/reconciliations`
- `GET /api/banking/checks`
- `POST /api/banking/checks`
- `GET /api/banking/statements`
- `POST /api/banking/statements`
- `POST /api/banking/statements/:importId/match`

## Tax

- `GET /api/tax/bir-exports`
- `POST /api/tax/bir-exports`
- `GET /api/payroll/tax-filings`
- `POST /api/payroll/tax-filings`

## Automation

- `GET /api/automation/recurring-transactions`
- `POST /api/automation/recurring-transactions`
- `GET /api/automation/reminders`
- `POST /api/automation/reminders`
- `GET /api/automation/jobs`
- `POST /api/automation/jobs`
- `POST /api/automation/jobs/process`

## Exports and Integrations

- `POST /api/exports/reports`
- `GET /api/integrations/connectors`
- `POST /api/integrations/connectors`
- `POST /api/integrations/connectors/:connectorId/sync`

## Documents

- `GET /api/documents`
- `POST /api/documents`
- `POST /api/documents/ocr`

## Notes

- All endpoints reject requests where the requested `companyId` does not match the authenticated user's company.
- Payslips derive `netPay` automatically when it is not supplied.
- `stock-on-hand` computes quantities from `stock_movements` using `movement_type` of `in` and `out`.
- `POST /api/exports/reports` returns CSV by default and a minimal PDF when `format=pdf`.
- `GET /api/integrations/connectors` exposes supported connector providers and saved configs.
- `POST /api/automation/jobs/process` marks due jobs as succeeded in a simple local processor flow.
- `POST /api/banking/statements` accepts JSON statement lines and suggests matches against journal lines.


