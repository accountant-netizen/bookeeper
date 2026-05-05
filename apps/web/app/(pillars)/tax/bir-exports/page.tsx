"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function BirExportsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const end = today.toISOString().split("T")[0];
    authorizedFetch(`/api/tax/bir-exports?companyId=${companyId}&startDate=${start}&endDate=${end}`)
      .then((r) => r.json())
      .then((j) => setItems([j]))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>BIR Exports</h2>
      <table>
        <thead><tr><th>Period</th><th>Output Tax</th><th>Withholding</th><th>Net Due</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item, index) => <tr key={index}><td>{item.periodStart} → {item.periodEnd}</td><td>{item.outputTax}</td><td>{item.withholdingTax}</td><td>{item.netTaxDue}</td></tr>) : <TableEmptyState description="Generate a filing period to see export totals here." />}</tbody>
      </table>
    </div>
  );
}
