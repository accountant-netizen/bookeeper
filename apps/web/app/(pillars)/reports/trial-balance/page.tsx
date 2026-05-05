"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

type Item = {
  accountId: string;
  code: string;
  name: string;
  accountType: string | null;
  opening: string;
  periodDebit: string;
  periodCredit: string;
  periodBalance: string;
  closing: string;
};

export default function TrialBalancePage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authorizedFetch(`/api/reports/trial-balance?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [companyId, authorizedFetch]);

  return (
    <div>
      <h2>Trial Balance</h2>
      {loading ? <p>Loading…</p> : null}
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Opening</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Closing</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((it) => (
            <tr key={it.accountId}>
              <td>{it.code}</td>
              <td>{it.name}</td>
              <td style={{ textAlign: "right" }}>{it.opening}</td>
              <td style={{ textAlign: "right" }}>{it.periodDebit}</td>
              <td style={{ textAlign: "right" }}>{it.periodCredit}</td>
              <td style={{ textAlign: "right" }}>{it.closing}</td>
            </tr>
          )) : !loading ? <TableEmptyState description="Run a period close or post balances to populate the trial balance." /> : null}
        </tbody>
      </table>
    </div>
  );
}
