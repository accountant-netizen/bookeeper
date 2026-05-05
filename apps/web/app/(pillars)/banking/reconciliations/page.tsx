"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function ReconciliationsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    authorizedFetch(`/api/banking/reconciliations?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>Reconciliations</h2>
      <table>
        <thead><tr><th>Period</th><th>Statement</th><th>Book</th><th>Diff</th><th>Status</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.statement_start_date} → {item.statement_end_date}</td><td>{item.statement_balance}</td><td>{item.book_balance}</td><td>{item.difference}</td><td>{item.status}</td></tr>) : <TableEmptyState description="Reconciliation results will appear here after statements are matched." />}</tbody>
      </table>
    </div>
  );
}
