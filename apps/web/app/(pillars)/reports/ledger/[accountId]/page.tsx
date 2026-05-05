"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useShell } from "../../../shell-context";
import { TableEmptyState } from "../../../table-empty-state";

export default function LedgerPage() {
  const { accountId } = useParams() as { accountId?: string };
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId || !companyId) return;
    setLoading(true);
    authorizedFetch(`/api/reports/ledger/${accountId}?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [accountId, companyId, authorizedFetch]);

  return (
    <div>
      <h2>Ledger</h2>
      {loading ? <p>Loading…</p> : null}
      <table>
        <thead>
          <tr><th>Date</th><th>Ref</th><th>Description</th><th style={{textAlign:"right"}}>Debit</th><th style={{textAlign:"right"}}>Credit</th><th style={{textAlign:"right"}}>Running</th></tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((it) => (
            <tr key={it.lineId}>
              <td>{it.entryDate}</td>
              <td>{it.referenceNo}</td>
              <td>{it.description}</td>
              <td style={{textAlign:"right"}}>{it.debit}</td>
              <td style={{textAlign:"right"}}>{it.credit}</td>
              <td style={{textAlign:"right"}}>{it.runningBalance}</td>
            </tr>
          )) : !loading ? <TableEmptyState description="Post transactions to see ledger activity for this account." /> : null}
        </tbody>
      </table>
    </div>
  );
}
