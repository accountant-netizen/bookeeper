"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function JobsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    authorizedFetch(`/api/automation/jobs?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>Job Queue</h2>
      <table>
        <thead><tr><th>Job</th><th>Status</th><th>Run After</th><th>Attempts</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.job_type}</td><td>{item.status}</td><td>{item.run_after}</td><td>{item.attempts}</td></tr>) : <TableEmptyState description="Queued jobs will appear here once background work starts." />}</tbody>
      </table>
    </div>
  );
}
