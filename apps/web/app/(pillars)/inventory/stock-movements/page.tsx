"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

type Product = { id: string; code: string; name: string };

export default function StockMovementsPage() {
  const { companyId, authorizedFetch, setStatus } = useShell();
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ productId: "", movementType: "in", quantity: "0", referenceNo: "", notes: "" });

  function fetchMovements() {
    setLoading(true);
    Promise.all([
      authorizedFetch(`/api/inventory/stock-movements?companyId=${companyId}`),
      authorizedFetch(`/api/inventory/products?companyId=${companyId}`)
    ])
      .then(async ([movementsRes, productsRes]) => {
        const movementsJson = await movementsRes.json();
        const productsJson = await productsRes.json();
        setItems(movementsJson.items || []);
        setProducts(productsJson.items || []);
      })
      .catch(() => {
        setItems([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchMovements(); }, []);

  function createMovement(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Recording stock movement...");
    authorizedFetch(`/api/inventory/stock-movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.productId,
        movementType: form.movementType,
        quantity: parseFloat(form.quantity || "0"),
        referenceNo: form.referenceNo,
        notes: form.notes
      })
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(json.error || `Unexpected error ${r.status}`);
        }
        setForm({ productId: "", movementType: "in", quantity: "0", referenceNo: "", notes: "" });
        fetchMovements();
        setStatus("Stock movement recorded.");
      })
      .catch((error) => {
        setStatus(`Stock movement create failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      });
  }

  return (
    <div>
      <h2>Stock Movements</h2>
      <form onSubmit={createMovement} style={{ marginBottom: 12 }}>
        <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.code} - {product.name}
            </option>
          ))}
        </select>
        <select value={form.movementType} onChange={(e) => setForm({ ...form, movementType: e.target.value })}>
          <option value="in">In</option>
          <option value="out">Out</option>
        </select>
        <input placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input placeholder="Ref" value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} />
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit">Record</button>
      </form>

      {loading ? <p>Loading…</p> : null}
      <table>
        <thead><tr><th>Product</th><th>Type</th><th style={{textAlign:"right"}}>Qty</th><th>Ref</th><th>When</th></tr></thead>
        <tbody>
          {items.length > 0 ? items.map((m) => (
            <tr key={m.id}>
              <td>{products.find((product) => product.id === m.product_id)?.code || m.product_id}</td>
              <td>{m.movement_type}</td>
              <td style={{ textAlign: "right" }}>{m.quantity}</td>
              <td>{m.reference_no}</td>
              <td>{m.created_at}</td>
            </tr>
          )) : !loading ? <TableEmptyState description="Stock movement history will appear here after you record transactions." /> : null}
        </tbody>
      </table>
    </div>
  );
}
