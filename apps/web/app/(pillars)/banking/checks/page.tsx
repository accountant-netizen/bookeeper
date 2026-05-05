"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function ChecksPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    authorizedFetch(`/api/banking/checks?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>Checks</h2>
      <table>
        <thead><tr><th>No.</th><th>Payee</th><th>Amount</th><th>Issue Date</th><th>Status</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.check_no}</td><td>{item.payee}</td><td>{item.amount}</td><td>{item.issue_date}</td><td>{item.status}</td></tr>) : <TableEmptyState description="Issued checks will show up here after they are recorded." />}</tbody>
      </table>
    </div>
  );
}
