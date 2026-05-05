#!/usr/bin/env node

/**
 * Test suite for tax filing generator
 */

const assert = require("assert");

// Import the tax filing generator functions from CommonJS shim
const {
  generateTaxFiling,
  validateFilingData,
} = require("../apps/web/lib/taxFilingGenerator.cjs");

// Sample test data
const testData = {
  companyId: "test-company-123",
  filingType: "monthly",
  jurisdiction: "PH",
  periodStart: new Date("2024-01-01"),
  periodEnd: new Date("2024-01-31"),
  employeeCount: 3,
  grossPay: 100000,
  taxWithheld: 15000,
  employees: [
    {
      employeeNo: "E001",
      firstName: "John",
      lastName: "Doe",
      grossPay: 35000,
      taxWithheld: 5250,
      deductions: 2000,
    },
    {
      employeeNo: "E002",
      firstName: "Jane",
      lastName: "Smith",
      grossPay: 35000,
      taxWithheld: 5250,
      deductions: 2000,
    },
    {
      employeeNo: "E003",
      firstName: "Bob",
      lastName: "Johnson",
      grossPay: 30000,
      taxWithheld: 4500,
      deductions: 1500,
    },
  ],
};

async function runTests() {
  console.log("Testing tax filing generator...\n");

  // Test 1: Validation passes for valid data
  console.log("Test 1: Validate valid filing data");
  const validation = validateFilingData(testData);
  assert.strictEqual(validation.valid, true, "Valid data should pass validation");
  assert.strictEqual(validation.errors.length, 0, "Should have no errors");
  console.log("✓ Passed\n");

  // Test 2: Validation fails for missing jurisdiction
  console.log("Test 2: Validate missing jurisdiction");
  const invalidData1 = { ...testData, jurisdiction: "" };
  const val1 = validateFilingData(invalidData1);
  assert.strictEqual(val1.valid, false, "Missing jurisdiction should fail");
  assert(val1.errors.some((e) => e.includes("Jurisdiction")), "Should have jurisdiction error");
  console.log("✓ Passed\n");

  // Test 3: Validation fails for invalid period
  console.log("Test 3: Validate invalid period");
  const invalidData2 = { ...testData, periodStart: new Date("2024-02-01"), periodEnd: new Date("2024-01-01") };
  const val2 = validateFilingData(invalidData2);
  assert.strictEqual(val2.valid, false, "Invalid period should fail");
  console.log("✓ Passed\n");

  // Test 4: Generate Philippines BIR filing
  console.log("Test 4: Generate Philippines (BIR) filing");
  const phResult = await generateTaxFiling({ ...testData, jurisdiction: "PH" });
  assert.strictEqual(phResult.success, true, "BIR filing should generate successfully");
  assert(phResult.format.includes("BIR"), "Format should include BIR");
  assert(phResult.content.includes("EMPLOYEE DETAILS"), "Content should have employee details");
  assert(phResult.filename.includes("BIR"), "Filename should include BIR");
  console.log(`✓ Passed (Generated: ${phResult.filename})\n`);

  // Test 5: Generate USA IRS filing
  console.log("Test 5: Generate USA (IRS Form 941) filing");
  const usResult = await generateTaxFiling({ ...testData, jurisdiction: "US" });
  assert.strictEqual(usResult.success, true, "IRS filing should generate successfully");
  assert(usResult.format.includes("IRS"), "Format should include IRS");
  assert(usResult.content.includes("941"), "Content should mention Form 941");
  assert(usResult.filename.includes("941"), "Filename should include 941");
  console.log(`✓ Passed (Generated: ${usResult.filename})\n`);

  // Test 6: Generate UK HMRC filing
  console.log("Test 6: Generate UK (HMRC P30B) filing");
  const ukResult = await generateTaxFiling({ ...testData, jurisdiction: "UK" });
  assert.strictEqual(ukResult.success, true, "HMRC filing should generate successfully");
  assert(ukResult.format.includes("HMRC"), "Format should include HMRC");
  assert(ukResult.content.includes("P30B"), "Content should mention P30B");
  console.log(`✓ Passed (Generated: ${ukResult.filename})\n`);

  // Test 7: Generate Australia ATO filing
  console.log("Test 7: Generate Australia (ATO) filing");
  const auResult = await generateTaxFiling({ ...testData, jurisdiction: "AU" });
  assert.strictEqual(auResult.success, true, "ATO filing should generate successfully");
  assert(auResult.format.includes("ATO"), "Format should include ATO");
  assert(auResult.content.includes("A$"), "Content should use AUD currency");
  console.log(`✓ Passed (Generated: ${auResult.filename})\n`);

  // Test 8: Unsupported jurisdiction
  console.log("Test 8: Handle unsupported jurisdiction");
  const unsupported = await generateTaxFiling({ ...testData, jurisdiction: "INVALID" });
  assert.strictEqual(unsupported.success, false, "Unsupported jurisdiction should fail gracefully");
  console.log("✓ Passed\n");

  console.log("All tests passed! ✓");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
