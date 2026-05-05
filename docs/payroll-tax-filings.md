# Payroll Statutory Tax Filing Exports

Comprehensive tax filing generation system for multiple jurisdictions. Aggregates payslip data and generates jurisdiction-specific tax filing formats.

## Architecture

### Components

1. **taxFilingGenerator.ts** - Multi-jurisdiction filing format generator
   - Supports 4 jurisdictions: Philippines (BIR), USA (IRS), UK (HMRC), Australia (ATO)
   - Validates filing data before generation
   - Extensible for additional jurisdictions
   - Returns filing content ready for download

2. **Database Schema** (`payroll_tax_filings` table)
   - `id` (UUID) - Primary key
   - `company_id` (UUID) - Company scope
   - `filing_type` - 'monthly' | 'quarterly' | 'annual'
   - `period_start`, `period_end` - Date range for filing
   - `employee_count` - Number of employees
   - `gross_pay`, `tax_withheld` - Aggregated payroll amounts
   - `payload` (JSONB) - Format-specific filing content
   - `status` - 'draft' | 'filed' | 'amended'
   - `created_by`, `created_at` - Audit trail

3. **API Endpoints**
   - `GET /api/payroll/tax-filings` - List all filings
   - `POST /api/payroll/tax-filings` - Create filing from payslips
   - `POST /api/payroll/tax-filings` (with filingId) - Update filing status
   - `GET /api/payroll/tax-filings/[id]/export?jurisdiction=XX` - Export filing in format

4. **UI Page** (`app/(pillars)/payroll/tax-filings/page.tsx`)
   - Generate new filing with date range and jurisdiction selection
   - List all filings in table
   - View filing details and summary
   - Export filing as text file
   - Mark filing as filed

## Supported Formats

### Philippines (BIR 1604-E)
- Monthly remittance form for Bureau of Internal Revenue
- Includes employee tax summary and detailed employee list
- Currency: PHP
- Format: BIR_1604E_YYYY-MM-DD.txt

### USA (IRS Form 941)
- Quarterly employer federal tax return
- Includes employee detail summary
- Automatically calculates quarter from date
- Currency: USD ($)
- Format: IRS_941_Q[1-4]_YYYY.txt

### UK (HMRC P30B)
- Monthly tax payment report
- Includes income tax and National Insurance sections
- Uses UK date format
- Currency: GBP (£)
- Format: HMRC_P30B_YYYY-MM-DD.txt

### Australia (ATO)
- Employment tax payment report
- Includes superannuation notification section
- Uses AU date format
- Currency: AUD (A$)
- Format: ATO_ETP_YYYY-MM-DD.txt

## Data Aggregation

Filing generation automatically:
1. Fetches all payslips for the specified date range
2. Groups payslips by employee
3. Sums: gross_pay, tax_withheld, deductions per employee
4. Validates data before generation
5. Stores filing record in database

## Usage

### Via API

Generate filing:
```bash
POST /api/payroll/tax-filings
{
  "companyId": "company-uuid",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "filingType": "monthly",
  "status": "draft"
}
```

Export filing:
```bash
GET /api/payroll/tax-filings/{filingId}/export?jurisdiction=PH
```

Update status:
```bash
POST /api/payroll/tax-filings
{
  "filingId": "filing-uuid",
  "status": "filed"
}
```

### Via UI

1. Navigate to Payroll → Tax Filings
2. Select period start/end dates
3. Choose jurisdiction (PH, US, UK, AU)
4. Select filing type (monthly, quarterly, annual)
5. Click "Generate Filing"
6. Review generated filing in list
7. Click "Export Filing" to download
8. Click "Mark as Filed" to update status

## Validation

All filings are validated before generation:
- Jurisdiction must be specified
- Period start must be before period end
- Employee count must be >= 0
- Gross pay and tax withheld must be >= 0
- At least one employee required

Invalid filings return error list.

## Testing

```bash
node scripts/test-tax-filings.js
```

Tests cover:
- Validation logic (valid data, missing jurisdiction, invalid dates)
- Generation for all 4 jurisdictions
- Unsupported jurisdiction handling
- All tests passing ✓

## Future Enhancements

### Additional Jurisdictions
- Singapore (IRAS)
- Malaysia (IRB)
- India (NEFT/RTGS)
- Canada (CRA)
- New Zealand (IRD)

### Advanced Features
- Tax calculations (SS contributions, Medicare, SARS-COV tax)
- Deduction breakdown (health insurance, retirement)
- Employer-side tax calculations
- Amendment and resubmission workflows
- Digital signature support
- Direct filing integrations (e-gov)

### Data Enrichment
- Employee tax classification (W-4, tax exemptions)
- Jurisdictional tax rates by period
- Compliance checklist for each jurisdiction
- Withholding requirement calculator

### Audit & Compliance
- Filing status tracking and history
- Amendment reason tracking
- Audit log of all changes
- Reconciliation with tax authority submissions
