#!/usr/bin/env node
/**
 * End-to-End Test Guide for Connector Management System
 * 
 * This script demonstrates testing the complete connector management workflow
 * Run with: node scripts/test-connector-e2e.js
 * 
 * Requirements:
 * - Supabase instance running
 * - Next.js dev server running (npm run dev)
 * - Valid JWT token in environment or hardcoded below
 */

const baseURL = process.env.APP_URL || "http://localhost:3000";
const token = process.env.AUTH_TOKEN || "your-jwt-token-here";

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
};

async function test(name, fn) {
  try {
    console.log(`\n✓ Testing: ${name}`);
    await fn();
    console.log(`  ✓ Passed`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  console.log("Connector Management E2E Tests");
  console.log("==============================\n");

  let connectorId;
  let createdConnectors = [];

  // Test 1: Create a connector
  await test("Create connector (Stripe)", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: "stripe",
        name: "Test Stripe Account",
        settings: {
          apiKey: "sk_test_12345",
          webhookSecret: "whsec_test",
        },
      }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const j = await res.json();
    if (!j.item || !j.item.id) throw new Error("No connector ID returned");
    connectorId = j.item.id;
    createdConnectors.push(connectorId);
    console.log(`    Created connector ID: ${connectorId.substring(0, 8)}...`);
  });

  // Test 2: Get single connector
  await test("Get single connector", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/${connectorId}`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (j.item.provider !== "stripe") throw new Error("Wrong provider");
    if (j.item.name !== "Test Stripe Account") throw new Error("Wrong name");
  });

  // Test 3: List connectors with pagination
  await test("List connectors (default pagination)", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors?page=1&pageSize=10`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (!Array.isArray(j.items)) throw new Error("Items not array");
    if (!j.pagination) throw new Error("Missing pagination");
    if (j.pagination.total === 0) throw new Error("No connectors found");
  });

  // Test 4: Filter by provider
  await test("List connectors with provider filter", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors?provider=stripe`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    const allStripe = j.items.every((c) => c.provider === "stripe");
    if (!allStripe) throw new Error("Filter not applied");
  });

  // Test 5: Search by name
  await test("Search connectors by name", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors?search=Stripe`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (j.items.length === 0) throw new Error("No results");
  });

  // Test 6: Update connector
  await test("Update connector", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/${connectorId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        name: "Updated Stripe Account",
        status: "inactive",
        settings: { apiKey: "sk_test_99999" },
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (j.item.name !== "Updated Stripe Account") throw new Error("Name not updated");
    if (j.item.status !== "inactive") throw new Error("Status not updated");
  });

  // Test 7: Test connector (sync validation)
  await test("Test connector connection", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/${connectorId}/test`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    // Mock provider should succeed
    if (j.provider !== "stripe") throw new Error("Wrong provider in response");
  });

  // Test 8: Create additional connectors for bulk operations
  let connectorId2, connectorId3;
  await test("Create second connector (Plaid)", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: "plaid",
        name: "Test Plaid Account",
        settings: { clientId: "test_client" },
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    connectorId2 = j.item.id;
    createdConnectors.push(connectorId2);
  });

  await test("Create third connector (Xero)", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: "xero",
        name: "Test Xero Account",
        settings: { clientId: "xero_client" },
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    connectorId3 = j.item.id;
    createdConnectors.push(connectorId3);
  });

  // Test 9: Bulk status update
  await test("Bulk activate connectors", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/bulk/update`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ids: [connectorId, connectorId2],
        action: "status",
        status: "active",
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (j.updated !== 2) throw new Error(`Expected 2 updated, got ${j.updated}`);
  });

  // Test 10: Export to JSON
  await test("Export connectors as JSON", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/export?format=json`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (!Array.isArray(j)) throw new Error("JSON export not array");
    if (j.length === 0) throw new Error("Empty export");
  });

  // Test 11: Export to CSV
  await test("Export connectors as CSV", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/export?format=csv`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    const csv = await res.text();
    if (!csv.includes("ID,Provider,Name,Status")) throw new Error("Invalid CSV header");
  });

  // Test 12: Delete single connector
  await test("Delete single connector", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/${connectorId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (!j.success) throw new Error("Delete not successful");
  });

  // Test 13: Bulk delete
  await test("Bulk delete connectors", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/bulk/update`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ids: [connectorId2, connectorId3],
        action: "delete",
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const j = await res.json();
    if (j.deleted !== 2) throw new Error(`Expected 2 deleted, got ${j.deleted}`);
  });

  // Test 14: Verify deletion
  await test("Verify connectors deleted", async () => {
    const res = await fetch(`${baseURL}/api/integrations/connectors/${connectorId2}`, { headers });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  console.log("\n✅ All E2E tests passed!");
  console.log("\nNext steps:");
  console.log("1. Test UI at http://localhost:3000/integrations/connectors");
  console.log("2. Verify filtering works (provider, status, search)");
  console.log("3. Test bulk select/deselect functionality");
  console.log("4. Verify pagination works with >10 connectors");
  console.log("5. Test connector test endpoint in UI");
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
