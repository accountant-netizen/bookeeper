"use client";
import React, { useState, useEffect } from "react";
import { TableEmptyState } from "../../table-empty-state";

export default function BankImportsPage() {
  const [fileContent, setFileContent] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [importId, setImportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imports, setImports] = useState<any[]>([]);

  useEffect(() => {
    fetchImports();
  }, []);

  async function fetchImports() {
    try {
      const res = await fetch(`/api/banking/statements/imports`);
      const j = await res.json();
      setImports(j.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const text = await f.text();
    setFileContent(text);
  }

  async function upload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/banking/statements/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fileContent, format: "csv", name: "upload.csv" })
      });
      const j = await res.json();
      if (j.importId) {
        setImportId(j.importId);
        // fetch preview by re-parsing locally for speed
        const res = await fetch(`/api/banking/statements/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: fileContent }),
        });

        const preview = await res.json().catch(() => ({ parsed: [] }));
        setParsed(preview.parsed || []);
      } else if (j.parsed) {
        setParsed(j.parsed || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function runMatch() {
    if (!importId) return alert("Upload first to get importId");
    setLoading(true);
    try {
      const r = await fetch(`/api/banking/statements/${importId}/match`, { method: "POST" });
      const j = await r.json();
      alert(`Matched ${j.result?.matched || 0} lines`);
    } catch (e) {
      console.error(e);
      alert("Match failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Bank Statement Imports</h2>
      <p>Upload a CSV bank statement to preview and run matching.</p>
      <input type="file" accept=".csv" onChange={handleFile} />
      <div style={{ marginTop: 8 }}>
        <button onClick={upload} disabled={loading || !fileContent}>Upload</button>
        <button onClick={runMatch} disabled={loading || !importId} style={{ marginLeft: 8 }}>Run Match</button>
      </div>

        <h3 style={{ marginTop: 16 }}>Previous Imports</h3>
        <div style={{ border: "1px solid #ddd", padding: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Imported At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {imports.length > 0 ? imports.map((imp) => (
                <tr key={imp.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{imp.name}</td>
                  <td>{new Date(imp.imported_at).toLocaleString()}</td>
                  <td>
                    <button onClick={async () => {
                      // fetch lines
                      const r = await fetch(`/api/banking/statements/imports/${imp.id}/lines`);
                      const j = await r.json();
                      setParsed(j.items || []);
                      setImportId(imp.id);
                    }}>View</button>
                    <button onClick={async () => {
                      setLoading(true);
                      await fetch(`/api/banking/statements/${imp.id}/match`, { method: "POST" });
                      await fetchImports();
                      setLoading(false);
                    }} style={{ marginLeft: 8 }}>Run Match</button>
                  </td>
                </tr>
              )) : <TableEmptyState description="Import a statement to see past uploads here." />}
            </tbody>
          </table>
        </div>

      <h3 style={{ marginTop: 16 }}>Preview ({parsed.length})</h3>
      <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid #ddd", padding: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Date</th>
              <th style={{ textAlign: "left" }}>Description</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {parsed.length > 0 ? parsed.map((p, i) => (
              <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                <td>{p.txn_date || ""}</td>
                <td>{p.description}</td>
                <td style={{ textAlign: "right" }}>{p.amount?.toFixed ? p.amount.toFixed(2) : p.amount}</td>
              </tr>
            )) : <TableEmptyState description="Upload a CSV to preview matched lines here." />}
          </tbody>
        </table>
      </div>
    </div>
  );
}
