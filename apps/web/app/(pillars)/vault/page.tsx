"use client";

import { useEffect, useMemo, useState } from "react";
import { useShell } from "../shell-context";
import { TableEmptyState } from "../table-empty-state";

type VaultItem = {
  id: string;
  source: "document" | "tax_export" | "payroll_filing";
  title: string;
  category: string;
  mimeType: string | null;
  status: string;
  createdAt: string;
  downloadUrl: string;
};

export default function VaultPage() {
  const { companyId, authorizedFetch, status } = useShell();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [filename, setFilename] = useState("");
  const [category, setCategory] = useState("document");
  const [mimeType, setMimeType] = useState("application/octet-stream");
  const [contentBase64, setContentBase64] = useState("");
  const [plainTextContent, setPlainTextContent] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    fetchItems();
  }, [companyId, sourceFilter]);

  async function fetchItems() {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId,
        source: sourceFilter,
        ...(search.trim() && { search: search.trim() }),
      });
      const res = await authorizedFetch(`/api/vault?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load vault items");
      }
      setItems(json.items || []);
    } catch (error) {
      console.error(error);
      setItems([]);
    }
    setLoading(false);
  }

  async function handleUpload() {
    if (!companyId) return;
    const preparedBase64 = contentBase64 || toBase64(plainTextContent);
    const uploadFilename = filename.trim()
      || (plainTextContent ? `vault-note-${new Date().toISOString().replace(/[:.]/g, "-")}.txt` : "");
    const uploadMimeType = contentBase64 ? mimeType : "text/plain";

    if (!preparedBase64) {
      alert("Please upload a file or paste text content.");
      return;
    }
    if (!uploadFilename) {
      alert("Unable to detect a file name. Please select a file or enter text.");
      return;
    }

    setUploading(true);
    try {
      const res = await authorizedFetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          filename: uploadFilename,
          category,
          mimeType: uploadMimeType,
          contentBase64: preparedBase64,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload into vault");
      }

      setFilename("");
      setContentBase64("");
      setPlainTextContent("");
      alert("Item saved to vault.");
      fetchItems();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Upload failed");
    }
    setUploading(false);
  }

  async function handleDelete(item: VaultItem) {
    if (!(item.source === "document" || item.source === "tax_export")) {
      alert("This item type cannot be deleted from the vault yet.");
      return;
    }
    if (!confirm(`Delete ${item.title}?`)) return;

    try {
      const res = await authorizedFetch(`/api/vault?source=${item.source}&id=${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Delete failed");
      }
      fetchItems();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Delete failed");
    }
  }

  async function handleDownload(item: VaultItem) {
    try {
      const res = await authorizedFetch(item.downloadUrl);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Download failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const fallbackName = `${item.title.replace(/\s+/g, "-")}`;
      const filenameFromHeader = disposition.split("filename=")[1]?.replace(/"/g, "").trim();
      const downloadName = filenameFromHeader || fallbackName;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Download failed");
    }
  }

  function onPickFile(file: File | null) {
    if (!file) return;
    setFilename(file.name);
    setMimeType(file.type || "application/octet-stream");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] ?? "" : "";
      setContentBase64(base64);
      setPlainTextContent("");
    };
    reader.readAsDataURL(file);
  }

  function toBase64(value: string) {
    if (!value) return "";
    try {
      return btoa(unescape(encodeURIComponent(value)));
    } catch {
      return "";
    }
  }

  function sourceLabel(source: VaultItem["source"]) {
    if (source === "tax_export") return "Tax Export";
    if (source === "payroll_filing") return "Payroll Filing";
    return "Document";
  }

  function statusTone(statusValue: string) {
    const status = statusValue.toLowerCase();
    if (status.includes("completed") || status.includes("stored") || status.includes("filed")) return "ok";
    if (status.includes("failed") || status.includes("error")) return "warn";
    return "neutral";
  }

  const stats = useMemo(() => {
    return {
      total: items.length,
      documents: items.filter((item) => item.source === "document").length,
      taxExports: items.filter((item) => item.source === "tax_export").length,
      payrollFilings: items.filter((item) => item.source === "payroll_filing").length,
    };
  }, [items]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  return (
    <section className="panel">
      <div className="pageTitle" style={{ marginBottom: "0.85rem" }}>
        <div>
          <h2>Reports & Tax Vault</h2>
        </div>
        <div
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            padding: "0.45rem 0.8rem",
            background: "rgba(32, 180, 134, 0.12)",
            color: "#0f766e",
            fontSize: "0.85rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </div>
      </div>

      <div className="moduleGrid">
        <article className="moduleCard">
          <h3>Total Items</h3>
          <p style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>{stats.total}</p>
        </article>
        <article className="moduleCard">
          <h3>Documents</h3>
          <p style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>{stats.documents}</p>
        </article>
        <article className="moduleCard">
          <h3>Tax / Payroll</h3>
          <p style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>
            {stats.taxExports + stats.payrollFilings}
          </p>
        </article>
      </div>

      <div className="panel panel--soft" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Add Item</h3>
        <div className="formGrid" style={{ gap: "1rem", marginBottom: "1rem" }}>
          <div className="group">
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="document">Document</option>
                <option value="report">Report</option>
                <option value="tax">Tax</option>
                <option value="payroll">Payroll</option>
              </select>
            </label>
          </div>
          <div className="group">
            <label>Upload File
              <input
              type="file"
              onChange={(event) => onPickFile(event.target.files?.[0] || null)}
            />
            </label>
          </div>
          <div className="group" style={{ minWidth: 260, gridColumn: '1 / -1' }}>
            <label>
              Or Paste Text Content
              <textarea
                value={plainTextContent}
                onChange={(event) => setPlainTextContent(event.target.value)}
                placeholder="Paste text to store as a vault note"
                style={{ minHeight: 84 }}
              />
            </label>
          </div>
        </div>
        <div className="row" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={handleUpload} disabled={uploading} className="primary">
            {uploading ? "Saving..." : "Save to Vault"}
          </button>
          <button
            className="ghost"
            onClick={() => {
              setFilename("");
              setMimeType("application/octet-stream");
              setContentBase64("");
              setPlainTextContent("");
            }}
            disabled={uploading}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div className="toolbar">
          <div className="group">
            <label>Source</label>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="document">Documents</option>
              <option value="tax_export">Tax Exports</option>
              <option value="payroll_filing">Payroll Filings</option>
            </select>
          </div>
          <div className="group">
            <label>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find by title/category"
            />
          </div>
          <button className="ghost" onClick={fetchItems} disabled={loading}>
            Refresh
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Source</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => (
                <tr key={`${item.source}-${item.id}`}>
                  <td>{item.title}</td>
                  <td>
                    <span className="chip source">{sourceLabel(item.source)}</span>
                  </td>
                  <td>{item.category}</td>
                  <td>
                    <span className={`chip ${statusTone(item.status)}`}>{item.status}</span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="row" style={{ margin: 0 }}>
                      <button className="secondary" onClick={() => handleDownload(item)}>
                        Download
                      </button>
                      {(item.source === "document" || item.source === "tax_export") && (
                        <button className="danger" onClick={() => handleDelete(item)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : !loading ? (
              <TableEmptyState description="No vault items yet. Upload a file or generate tax/report artifacts to populate this store." />
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
