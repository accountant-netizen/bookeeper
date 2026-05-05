"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function BankAccountsPage() {
  const { companyId, authorizedFetch, setStatus } = useShell();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", name: "", bankName: "", accountNumber: "", openingBalance: "0" });

  function fetchItems() {
    if (!companyId) return;
    authorizedFetch(`/api/banking/accounts?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }

  useEffect(() => {
    fetchItems();
  }, [companyId]);

  function createItem(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Creating bank account...");
    authorizedFetch(`/api/banking/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        code: form.code,
        name: form.name,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        openingBalance: parseFloat(form.openingBalance || "0")
      })
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || `Unexpected error ${r.status}`);
        setForm({ code: "", name: "", bankName: "", accountNumber: "", openingBalance: "0" });
        fetchItems();
        setStatus("Bank account created.");
      })
      .catch((error) => setStatus(`Bank account create failed: ${error instanceof Error ? error.message : "Unknown error"}`));
  }

  return (
    <div>
      <h2>Bank Accounts</h2>
      <form onSubmit={createItem} style={{ marginBottom: 12 }}>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Bank Name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
        <input placeholder="Account Number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
        <input placeholder="Opening Balance" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
        <button type="submit">Create</button>
      </form>
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Bank</th><th style={{textAlign:"right"}}>Balance</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.bank_name}</td><td style={{textAlign:"right"}}>{item.current_balance}</td></tr>) : <TableEmptyState description="Create a bank account to start tracking balances." />}</tbody>
      </table>
    </div>
  );
}
