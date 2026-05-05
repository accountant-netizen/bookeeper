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

  const [filters, setFilters] = useState({
    provider: "",
    status: "",
    search: "",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  const [selected, setSelected] = useState<Connector | null>(null);

  const [formData, setFormData] = useState({
    provider: "",
    name: "",
    status: "active",
    settings: "",
  });

  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    fetchConnectors();
  }, [companyId, pagination.page, filters]);

  async function fetchConnectors() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        ...(filters.provider && { provider: filters.provider }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const res = await authorizedFetch(
        `/api/integrations/connectors?${params}`
      );
      const j = await res.json();

      setConnectors(j.items || []);
      setPagination(j.pagination);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch {
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
          status: formData.status,
          settings: formData.settings
            ? JSON.parse(formData.settings)
            : {},
        }),
      });

      const j = await res.json();
      if (j.item) {
        setShowForm(false);
        fetchConnectors();
      } else alert(j.error);
    } catch {
      alert("Error creating connector");
    }
  }

  async function updateConnector() {
    if (!selected) return;

    try {
      const res = await authorizedFetch(
        `/api/integrations/connectors/${selected.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            status: formData.status,
            settings: formData.settings
              ? JSON.parse(formData.settings)
              : {},
          }),
        }
      );

      const j = await res.json();
      if (j.item) {
        setShowForm(false);
        fetchConnectors();
      } else alert(j.error);
    } catch {
      alert("Error updating connector");
    }
  }

  async function deleteConnector(id: string) {
    if (!confirm("Delete this connector?")) return;

    await authorizedFetch(`/api/integrations/connectors/${id}`, {
      method: "DELETE",
    });

    fetchConnectors();
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;

    await authorizedFetch(
      "/api/integrations/connectors/bulk/update",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: "delete",
        }),
      }
    );

    fetchConnectors();
  }

  async function bulkStatusUpdate(status: string) {
    await authorizedFetch(
      "/api/integrations/connectors/bulk/update",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: "status",
          status,
        }),
      }
    );

    fetchConnectors();
  }

  async function testConnector(id: string) {
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await authorizedFetch(
        `/api/integrations/connectors/${id}/test`,
        { method: "POST" }
      );
      setTestResult(await res.json());
    } catch {
      setTestResult({ success: false });
    }

    setTestLoading(false);
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(connectors.map((c) => c.id)));
    }
    setSelectAll(!selectAll);
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Connector Management</h1>

      {/* Filters */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <select
          value={filters.provider}
          onChange={(e) =>
            setFilters({ ...filters, provider: e.target.value })
          }
        >
          <option value="">All Providers</option>
          {SUPPORTED_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) =>
            setFilters({ ...filters, search: e.target.value })
          }
        />

        <button onClick={() => setShowForm(true)}>+ Add</button>
      </div>

      {/* Table */}
      <table width="100%">
        <thead>
          <tr>
            <th>
              <input checked={selectAll} onChange={toggleSelectAll} type="checkbox" />
            </th>
            <th>Provider</th>
            <th>Name</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {connectors.map((c) => (
            <tr key={c.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                />
              </td>
              <td>{c.provider}</td>
              <td>{c.name}</td>
              <td>{c.status}</td>
              <td>
                <button
                  onClick={() => {
                    setSelected(c);
                    setFormMode("edit");
                    setFormData({
                      provider: c.provider,
                      name: c.name,
                      status: c.status,
                      settings: JSON.stringify(c.settings),
                    });
                    setShowForm(true);
                  }}
                >
                  Edit
                </button>

                <button onClick={() => testConnector(c.id)}>Test</button>

                <button onClick={() => deleteConnector(c.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {showForm && (
        <div className="modal">
          <div className="card">
            <h2>{formMode === "create" ? "Create" : "Edit"}</h2>

            {formMode === "create" && (
              <select
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
              >
                <option value="">Select Provider</option>
                {SUPPORTED_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}

            <input
              placeholder="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <textarea
              value={formData.settings}
              onChange={(e) =>
                setFormData({ ...formData, settings: e.target.value })
              }
            />

            <button
              onClick={
                formMode === "create"
                  ? createConnector
                  : updateConnector
              }
            >
              Save
            </button>

            <button onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {testResult && <pre>{JSON.stringify(testResult, null, 2)}</pre>}
    </div>
  );
}