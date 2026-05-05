/**
 * Tax filing export generator for multiple jurisdictions.
 * Supports: Philippines (BIR), USA (IRS), UK (HMRC), Australia (ATO)
 */

export interface TaxFilingData {
  companyId: string;
  filingType: string; // 'monthly' | 'quarterly' | 'annual'
  jurisdiction: string; // 'PH' | 'US' | 'UK' | 'AU'
  periodStart: Date;
  periodEnd: Date;
  employeeCount: number;
  grossPay: number;
  taxWithheld: number;
  employees: Array<{
    employeeNo: string;
    firstName: string;
    lastName: string;
    grossPay: number;
    taxWithheld: number;
    deductions: number;
  }>;
}

export interface TaxFilingResult {
  success: boolean;
  format: string;
  content: string;
  filename: string;
  mimeType: string;
}

/**
 * Philippines BIR (Bureau of Internal Revenue) Format
 * 1604-E Form for Monthly Tax Remittance
 */
function generateBIRForm(data: TaxFilingData): TaxFilingResult {
  let content = `BIR FORM 1604-E (Monthly Remittance)
Period: ${data.periodStart.toLocaleDateString()} to ${data.periodEnd.toLocaleDateString()}

EMPLOYER INFORMATION
TIN: [TO_BE_FILLED]
Company Name: [TO_BE_FILLED]
Address: [TO_BE_FILLED]

EMPLOYEE TAX SUMMARY
Employee Count: ${data.employeeCount}
Total Gross Pay: ${data.grossPay.toFixed(2)}
Total Tax Withheld: ${data.taxWithheld.toFixed(2)}
Total Deductions: ${data.employees.reduce((sum, e) => sum + e.deductions, 0).toFixed(2)}

EMPLOYEE DETAILS
`;

  data.employees.forEach((emp) => {
    content += `\nEmployee: ${emp.employeeNo} - ${emp.firstName} ${emp.lastName}
Gross Pay: ${emp.grossPay.toFixed(2)}
Tax Withheld: ${emp.taxWithheld.toFixed(2)}
Deductions: ${emp.deductions.toFixed(2)}
`;
  });

  return {
    success: true,
    format: "BIR 1604-E",
    content,
    filename: `BIR_1604E_${data.periodStart.toISOString().slice(0, 10)}.txt`,
    mimeType: "text/plain",
  };
}

/**
 * USA IRS Form 941 Quarterly Tax Return
 */
function generateIRSForm941(data: TaxFilingData): TaxFilingResult {
  let content = `IRS FORM 941 - Employer's Quarterly Federal Tax Return
Quarter: ${getQuarter(data.periodStart)}
Year: ${data.periodStart.getFullYear()}

EMPLOYER INFORMATION
EIN: [TO_BE_FILLED]
Name: [TO_BE_FILLED]
Address: [TO_BE_FILLED]

PAYROLL SUMMARY
Number of Employees: ${data.employeeCount}
Total Gross Wages: $${data.grossPay.toFixed(2)}
Total Federal Income Tax Withheld: $${data.taxWithheld.toFixed(2)}

EMPLOYEE DETAIL SUMMARY
`;

  data.employees.forEach((emp) => {
    content += `\n${emp.employeeNo} | ${emp.firstName} ${emp.lastName}
SSN: [REDACTED]
Gross Wages: $${emp.grossPay.toFixed(2)}
Federal Tax: $${emp.taxWithheld.toFixed(2)}
`;
  });

  return {
    success: true,
    format: "IRS 941",
    content,
    filename: `IRS_941_Q${getQuarter(data.periodStart)}_${data.periodStart.getFullYear()}.txt`,
    mimeType: "text/plain",
  };
}

/**
 * UK HMRC P30B Monthly Tax Payment Report
 */
function generateHMRCP30B(data: TaxFilingData): TaxFilingResult {
  let content = `HMRC P30B - Monthly Tax Payment Report
Period: ${data.periodStart.toLocaleDateString("en-GB")} to ${data.periodEnd.toLocaleDateString("en-GB")}

EMPLOYER DETAILS
PAYE Reference: [TO_BE_FILLED]
Company Name: [TO_BE_FILLED]

PAYMENT SUMMARY
Total Employees: ${data.employeeCount}
Total Gross Pay: £${data.grossPay.toFixed(2)}
Total Income Tax: £${data.taxWithheld.toFixed(2)}
Total Employee NI: [TO_BE_CALCULATED]
Total Employer NI: [TO_BE_CALCULATED]

EMPLOYEE INFORMATION
`;

  data.employees.forEach((emp) => {
    content += `\n${emp.employeeNo} | ${emp.firstName} ${emp.lastName}
Gross Pay: £${emp.grossPay.toFixed(2)}
Income Tax: £${emp.taxWithheld.toFixed(2)}
`;
  });

  return {
    success: true,
    format: "HMRC P30B",
    content,
    filename: `HMRC_P30B_${data.periodStart.toISOString().slice(0, 10)}.txt`,
    mimeType: "text/plain",
  };
}

/**
 * Australia ATO (Australian Taxation Office) ETP Notification
 */
function generateATOETP(data: TaxFilingData): TaxFilingResult {
  let content = `ATO - Employment Tax Payment Report
Period: ${data.periodStart.toLocaleDateString("en-AU")} to ${data.periodEnd.toLocaleDateString("en-AU")}

EMPLOYER DETAILS
ABN: [TO_BE_FILLED]
Company Name: [TO_BE_FILLED]

SUMMARY
Total Employees: ${data.employeeCount}
Total Gross Income: A$${data.grossPay.toFixed(2)}
Total Tax Withheld: A$${data.taxWithheld.toFixed(2)}
Total Superannuation: [TO_BE_CALCULATED]

EMPLOYEE PAYROLL DATA
`;

  data.employees.forEach((emp) => {
    content += `\n${emp.employeeNo} | ${emp.firstName} ${emp.lastName}
Gross Income: A$${emp.grossPay.toFixed(2)}
Tax Withheld: A$${emp.taxWithheld.toFixed(2)}
`;
  });

  return {
    success: true,
    format: "ATO ETP",
    content,
    filename: `ATO_ETP_${data.periodStart.toISOString().slice(0, 10)}.txt`,
    mimeType: "text/plain",
  };
}

/**
 * Generate tax filing in appropriate format based on jurisdiction
 */
export async function generateTaxFiling(data: TaxFilingData): Promise<TaxFilingResult> {
  try {
    const jurisdiction = data.jurisdiction.toUpperCase();

    switch (jurisdiction) {
      case "PH":
        return generateBIRForm(data);
      case "US":
        return generateIRSForm941(data);
      case "UK":
        return generateHMRCP30B(data);
      case "AU":
        return generateATOETP(data);
      default:
        throw new Error(`Unsupported jurisdiction: ${jurisdiction}`);
    }
  } catch (error: any) {
    return {
      success: false,
      format: data.jurisdiction,
      content: "",
      filename: "",
      mimeType: "",
    };
  }
}

/**
 * Helper: Get quarter from date
 */
function getQuarter(date: Date): number {
  return Math.ceil((date.getMonth() + 1) / 3);
}

/**
 * Validate filing data before generation
 */
export function validateFilingData(data: TaxFilingData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.jurisdiction) errors.push("Jurisdiction is required");
  if (data.periodStart >= data.periodEnd) errors.push("Period start must be before period end");
  if (data.employeeCount < 0) errors.push("Employee count cannot be negative");
  if (data.grossPay < 0) errors.push("Gross pay cannot be negative");
  if (data.taxWithheld < 0) errors.push("Tax withheld cannot be negative");
  if (data.employees.length === 0) errors.push("At least one employee is required");

  return {
    valid: errors.length === 0,
    errors,
  };
}
