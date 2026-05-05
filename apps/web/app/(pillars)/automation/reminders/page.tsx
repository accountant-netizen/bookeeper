"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function RemindersPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    authorizedFetch(`/api/automation/reminders?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>Reminders</h2>
      <table>
        <thead><tr><th>Title</th><th>Reminder Date</th><th>Due Date</th><th>Status</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.title}</td><td>{item.reminder_date}</td><td>{item.due_date}</td><td>{item.status}</td></tr>) : <TableEmptyState description="Scheduled reminders will appear here once they are created." />}</tbody>
      </table>
    </div>
  );
}
