"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function BankStatementsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    authorizedFetch(`/api/banking/statements?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>Bank Statements</h2>
      <table>
        <thead><tr><th>Name</th><th>Period</th><th>Status</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.statement_name}</td><td>{item.statement_start_date} → {item.statement_end_date}</td><td>{item.status}</td></tr>) : <TableEmptyState description="Imported statements will appear here once they are available." />}</tbody>
      </table>
    </div>
  );
}
