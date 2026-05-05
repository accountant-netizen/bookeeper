"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function RecurringTransactionsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    authorizedFetch(`/api/automation/recurring-transactions?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>Recurring Transactions</h2>
      <table>
        <thead><tr><th>Name</th><th>Template</th><th>Frequency</th><th>Next Run</th><th>Status</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.template_type}</td><td>{item.frequency}</td><td>{item.next_run_date}</td><td>{item.is_active ? "Active" : "Inactive"}</td></tr>) : <TableEmptyState description="Recurring transaction rules will show up here." />}</tbody>
      </table>
    </div>
  );
}
