"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../shell-context";
import { TableEmptyState } from "../table-empty-state";

export default function DocumentsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId) return;
    authorizedFetch(`/api/documents?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, [companyId]);

  return (
    <div>
      <h2>Documents</h2>
      <table>
        <thead><tr><th>Filename</th><th>Type</th><th>OCR</th><th>Entity</th></tr></thead>
        <tbody>{items.length > 0 ? items.map((item) => <tr key={item.id}><td>{item.filename}</td><td>{item.mime_type}</td><td>{item.ocr_status}</td><td>{item.related_entity_type}</td></tr>) : <TableEmptyState description="Upload or import documents to see them listed here." />}</tbody>
      </table>
    </div>
  );
}
