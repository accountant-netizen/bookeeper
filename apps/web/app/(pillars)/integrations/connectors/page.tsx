"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";

type Connector = {
  id: string;
  provider: string;
  name: string;
  status: string;
  settings: any;
  created_at: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const SUPPORTED_PROVIDERS = [
  { value: "stripe", label: "Stripe" },
  { value: "plaid", label: "Plaid" },
  { value: "xero", label: "Xero" },
  { value: "quickbooks", label: "QuickBooks" },
  { value: "mock", label: "Mock (Testing)" },
];

export default function ConnectorsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ provider: "", status: "", search: "" });
  const [selected, setSelected] = useState<Connector | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({
    provider: "",
    name: "",
    settings: "",
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    fetchConnectors();
  }, [companyId, pagination.page, filters]);

  async function fetchConnectors() {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        ...(filters.provider && { provider: filters.provider }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });
      const res = await authorizedFetch(`/api/integrations/connectors?${params}`);
      const j = await res.json();
      setConnectors(j.items || []);
      setPagination(j.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 });
      setSelectAll(false);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      alert("Failed to fetch connectors");
    }
    setLoading(false);
  }

  async function createConnector() {
    try {
      const res = await authorizedFetch("/api/integrations/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formData.provider,
          name: formData.name,
          settings: formData.settings ? JSON.parse(formData.settings) : {},
        }),
      });
      const j = await res.json();
      if (j.item) {
        alert("Connector created successfully");
        setFormData({ provider: "", name: "", settings: "" });
        setShowForm(false);
        setPagination({ ...pagination, page: 1 });
        fetchConnectors();
      } else {
        alert(j.error || "Failed to create connector");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating connector");
    }
  }

  async function updateConnector() {
    if (!selected) return;
    try {
      const res = await authorizedFetch(`/api/integrations/connectors/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          status: formData.provider,
          settings: formData.settings ? JSON.parse(formData.settings) : {},
        }),
      });
      const j = await res.json();
      if (j.item) {
        alert("Connector updated successfully");
        setFormData({ provider: "", name: "", settings: "" });
        setShowForm(false);
        fetchConnectors();
      } else {
        alert(j.error || "Failed to update connector");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating connector");
    }
  }

  async function deleteConnector(id: string) {
    if (!confirm("Are you sure you want to delete this connector?")) return;
    setLoading(true);
    try {
      const res = await authorizedFetch(`/api/integrations/connectors/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        alert("Connector deleted");
        fetchConnectors();
      } else {
        alert(j.error || "Failed to delete connector");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting connector");
    }
    setLoading(false);
  }

  async function testConnector(id: string) {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await authorizedFetch(`/api/integrations/connectors/${id}/test`, { method: "POST" });
      const j = await res.json();
      setTestResult(j);
    } catch (e) {
      console.error(e);
      setTestResult({ success: false, message: "Network error" });
    }
    setTestLoading(false);
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) {
      alert("Please select connectors to delete");
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} connector(s)?`)) return;

    setLoading(true);
    try {
      const res = await authorizedFetch("/api/integrations/connectors/bulk/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "delete" }),
      });
      const j = await res.json();
      if (j.success) {
        alert(`Deleted ${j.deleted} connector(s)`);
        fetchConnectors();
      } else {
        alert(j.error || "Failed to delete connectors");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting connectors");
    }
    setLoading(false);
  }

  async function bulkStatusUpdate(newStatus: string) {
    if (selectedIds.size === 0) {
      alert("Please select connectors");
      return;
    }

    setLoading(true);
    try {
      const res = await authorizedFetch("/api/integrations/connectors/bulk/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "status", status: newStatus }),
      });
      const j = await res.json();
      if (j.success) {
        alert(`Updated ${j.updated} connector(s) to ${newStatus}`);
        fetchConnectors();
      } else {
        alert(j.error || "Failed to update connectors");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating connectors");
    }
    setLoading(false);
  }

  async function exportConnectors(format: "json" | "csv") {
    const params = new URLSearchParams({
      format,
      ...(filters.provider && { provider: filters.provider }),
      ...(filters.status && { status: filters.status }),
    });
    const res = await authorizedFetch(`/api/integrations/connectors/export?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const filename = res.headers
        .get("content-disposition")
        ?.split("filename=")[1]
        ?.replace(/"/g, "") || `connectors.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert("Failed to export");
    }
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(connectors.map((c) => c.id)));
      setSelectAll(true);
    }
  }

  function toggleSelect(id: string) {
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    setSelectedIds(newIds);
    setSelectAll(newIds.size === connectors.length && connectors.length > 0);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Connector Management</h1>

      {/* Filters & Actions */}
      <div style={{ marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label>Provider:</label>
          <select value={filters.provider} onChange={(e) => setFilters({ ...filters, provider: e.target.value })}>
            <option value="">All</option>
            {SUPPORTED_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label>Search:</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search connectors..."
          />
        </div>
        <button onClick={() => setShowForm(true)}>Add Connector</button>
        {selectedIds.size > 0 && (
          <>
            <button onClick={bulkDelete} style={{ background: "red", color: "white" }}>
              Delete Selected ({selectedIds.size})
            </button>
            <select onChange={(e) => e.target.value && bulkStatusUpdate(e.target.value)}>
              <option value="">Bulk Status Update</option>
              <option value="active">Set Active</option>
              <option value="inactive">Set Inactive</option>
            </select>
          </>
        )}
        <button onClick={() => exportConnectors("json")}>Export JSON</button>
        <button onClick={() => exportConnectors("csv")}>Export CSV</button>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: 8, textAlign: "left" }}>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
            </th>
            <th style={{ padding: 8, textAlign: "left" }}>Provider</th>
            <th style={{ padding: 8, textAlign: "left" }}>Name</th>
            <th style={{ padding: 8, textAlign: "left" }}>Status</th>
            <th style={{ padding: 8, textAlign: "left" }}>Created</th>
            <th style={{ padding: 8, textAlign: "left" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {connectors.length > 0 ? (
            connectors.map((connector) => (
              <tr key={connector.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(connector.id)}
                    onChange={() => toggleSelect(connector.id)}
                  />
                </td>
                <td style={{ padding: 8 }}>{connector.provider}</td>
                <td style={{ padding: 8 }}>{connector.name}</td>
                <td style={{ padding: 8 }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: connector.status === "active" ? "green" : "gray",
                      color: "white",
                    }}
                  >
                    {connector.status}
                  </span>
                </td>
                <td style={{ padding: 8 }}>{new Date(connector.created_at).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => {
                      setSelected(connector);
                      setFormData({
                        provider: connector.provider,
                        name: connector.name,
                        settings: JSON.stringify(connector.settings, null, 2),
                      });
                      setFormMode("edit");
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button onClick={() => testConnector(connector.id)} disabled={testLoading}>
                    Test
                  </button>
                  <button
                    onClick={() => deleteConnector(connector.id)}
                    style={{ background: "red", color: "white", marginLeft: 8 }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : !loading ? (
            <tr>
              <td colSpan={6} style={{ padding: 24, textAlign: "center" }}>
                No connectors found. <button onClick={() => setShowForm(true)}>Add one</button>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 8 }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            Next
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ background: "white", padding: 24, borderRadius: 8, width: 400 }}>
            <h2>{formMode === "create" ? "Create Connector" : "Edit Connector"}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (formMode === "create") createConnector();
                else updateConnector();
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <label>Provider:</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  required
                >
                  <option value="">Select Provider</option>
                  {SUPPORTED_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Settings (JSON):</label>
                <textarea
                  value={formData.settings}
                  onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                  rows={6}
                  placeholder='{"apiKey": "your-key"}'
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">{formMode === "create" ? "Create" : "Update"}</button>
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div style={{ marginTop: 24, padding: 12, background: testResult.success ? "lightgreen" : "lightcoral" }}>
          <h3>Test Result</h3>
          <pre>{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
          <input
            type="text"
            placeholder="Connector name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <button onClick={() => setFilters({ provider: "", status: "", search: "" })}>Clear Filters</button>
        <button onClick={() => { setShowForm(true); setFormMode("create"); setFormData({ provider: "", name: "", settings: "" }); }}>
          + New Connector
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#f0f0f0",
            borderRadius: 4,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>{selectedIds.size} selected</span>
          <button onClick={() => bulkStatusUpdate("active")}>Activate</button>
          <button onClick={() => bulkStatusUpdate("inactive")}>Deactivate</button>
          <button onClick={bulkDelete} style={{ background: "#ff4444", color: "white" }}>
            Delete
          </button>
          <span style={{ marginLeft: "auto" }}>
            <button onClick={() => exportConnectors("json")}>Export JSON</button>
            <button onClick={() => exportConnectors("csv")} style={{ marginLeft: 8 }}>
              Export CSV
            </button>
          </span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{formMode === "create" ? "Create Connector" : "Edit Connector"}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {formMode === "create" ? (
                <div>
                  <label>Provider:</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  >
                    <option value="">Select provider...</option>
                    {SUPPORTED_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label>Status:</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div>
                <label>Name:</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Stripe Account"
                />
              </div>
              <div>
                <label>Settings (JSON):</label>
                <textarea
                  value={formData.settings}
                  onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                  placeholder='{"apiKey": "..."}'
                  style={{ minHeight: 100 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowForm(false)}>Cancel</button>
                <button
                  onClick={formMode === "create" ? createConnector : updateConnector}
                  style={{ background: "#4444ff", color: "white" }}
                >
                  {formMode === "create" ? "Create" : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connectors Table */}
      <div style={{ marginBottom: 24, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: 8 }}>
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              </th>
              <th style={{ textAlign: "left", padding: 8 }}>Provider</th>
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", padding: 8 }}>Created</th>
              <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {connectors.map((connector) => (
              <tr
                key={connector.id}
                style={{
                  borderBottom: "1px solid #eee",
                  background: selected?.id === connector.id ? "#f9f9f9" : "white",
                }}
                onClick={() => setSelected(connector)}
              >
                <td style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(connector.id)}
                    onChange={() => toggleSelect(connector.id)}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  {SUPPORTED_PROVIDERS.find((p) => p.value === connector.provider)?.label || connector.provider}
                </td>
                <td style={{ padding: 8 }}>{connector.name}</td>
                <td
                  style={{
                    padding: 8,
                    color: connector.status === "active" ? "green" : "gray",
                  }}
                >
                  {connector.status}
                </td>
                <td style={{ padding: 8 }}>{new Date(connector.created_at).toLocaleDateString()}</td>
                <td style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setFormMode("edit");
                      setFormData({
                        provider: connector.status,
                        name: connector.name,
                        settings: JSON.stringify(connector.settings || {}),
                      });
                      setShowForm(true);
                    }}
                    style={{ fontSize: 12, padding: "4px 8px" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => testConnector(connector.id)}
                    disabled={testLoading}
                    style={{ fontSize: 12, padding: "4px 8px", marginLeft: 4 }}
                  >
                    Test
                  </button>
                  <button
                    onClick={() => deleteConnector(connector.id)}
                    disabled={loading}
                    style={{ fontSize: 12, padding: "4px 8px", marginLeft: 4, background: "#ff6666", color: "white" }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        <button
          onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
          disabled={pagination.page === 1}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
        </span>
        <button
          onClick={() => setPagination({ ...pagination, page: Math.min(pagination.totalPages, pagination.page + 1) })}
          disabled={pagination.page === pagination.totalPages}
        >
          Next
        </button>
      </div>

      {/* Details & Test Result */}
      {selected && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 16,
            borderRadius: 4,
            marginBottom: 24,
          }}
        >
          <h3>Connector Details</h3>
          <p>
            <strong>ID:</strong> {selected.id.substring(0, 8)}...
          </p>
          <p>
            <strong>Provider:</strong> {SUPPORTED_PROVIDERS.find((p) => p.value === selected.provider)?.label || selected.provider}
          </p>
          <p>
            <strong>Name:</strong> {selected.name}
          </p>
          <p>
            <strong>Status:</strong> {selected.status}
          </p>
          <p>
            <strong>Created:</strong> {new Date(selected.created_at).toLocaleString()}
          </p>
          {testResult && (
            <div style={{ marginTop: 16, padding: 12, background: testResult.success ? "#e8f5e9" : "#ffebee", borderRadius: 4 }}>
              <p>
                <strong>Test Result:</strong> {testResult.success ? "✓ Success" : "✗ Failed"}
              </p>
              <p>{testResult.message}</p>
              {testResult.itemsProcessed !== undefined && <p>Items processed: {testResult.itemsProcessed}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
