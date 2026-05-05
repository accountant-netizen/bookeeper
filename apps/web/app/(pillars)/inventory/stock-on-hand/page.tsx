"use client";
import React, { useEffect, useState } from "react";
import { TableEmptyState } from "../../table-empty-state";

export default function StockOnHandPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inventory/stock-on-hand`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2>Stock On Hand</h2>
      {loading ? <p>Loading…</p> : null}
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th style={{ textAlign: "right" }}>On Hand</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((item) => (
            <tr key={item.productId}>
              <td>{item.code}</td>
              <td>{item.name}</td>
              <td style={{ textAlign: "right" }}>{item.onHand}</td>
            </tr>
          )) : !loading ? <TableEmptyState description="Stock will appear here after inventory movements are recorded." /> : null}
        </tbody>
      </table>
    </div>
  );
}
