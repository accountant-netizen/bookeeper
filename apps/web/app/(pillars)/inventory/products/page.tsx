"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

type Product = { id: string; code: string; name: string; cost: string; price: string; is_active: boolean };

export default function ProductsPage() {
  const { companyId, authorizedFetch, setStatus } = useShell();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", cost: "0", price: "0" });

  function fetchProducts() {
    setLoading(true);
    authorizedFetch(`/api/inventory/products?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Creating product...");
    authorizedFetch(`/api/inventory/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        name: form.name,
        cost: parseFloat(form.cost || "0"),
        price: parseFloat(form.price || "0")
      })
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(json.error || `Unexpected error ${r.status}`);
        }
        setForm({ code: "", name: "", cost: "0", price: "0" });
        fetchProducts();
        setStatus("Product created.");
      })
      .catch((error) => {
        setStatus(`Product create failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      });
  }

  return (
    <div>
      <h2>Products</h2>
      <form onSubmit={createProduct} style={{ marginBottom: 12 }}>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        <input placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <button type="submit">Create</button>
      </form>

      {loading ? <p>Loading…</p> : null}
      <table>
        <thead><tr><th>Code</th><th>Name</th><th style={{textAlign:"right"}}>Cost</th><th style={{textAlign:"right"}}>Price</th></tr></thead>
        <tbody>
          {items.length > 0 ? items.map((p) => (
            <tr key={p.id}><td>{p.code}</td><td>{p.name}</td><td style={{textAlign:"right"}}>{p.cost}</td><td style={{textAlign:"right"}}>{p.price}</td></tr>
          )) : !loading ? <TableEmptyState description="Create your first inventory item to populate this table." /> : null}
        </tbody>
      </table>
    </div>
  );
}
