"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";

type TaxFiling = {
  id: string;
  filing_type: string;
  period_start: string;
  period_end: string;
  employee_count: number;
  gross_pay: number;
  tax_withheld: number;
  status: string;
  created_at: string;
};

export default function PayrollTaxFilingsPage() {
  const { companyId, authorizedFetch } = useShell();
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [selected, setSelected] = useState<TaxFiling | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    periodStart: "",
    periodEnd: "",
    jurisdiction: "PH",
    filingType: "monthly",
  });

  useEffect(() => {
    if (!companyId) return;
    fetchFilings();
  }, [companyId]);

  async function fetchFilings() {
    setLoading(true);
    try {
      const r = await authorizedFetch(`/api/payroll/tax-filings?companyId=${companyId}`);
      const j = await r.json();
      setFilings(j.items || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateFiling() {
    if (!formData.periodStart || !formData.periodEnd) {
      alert("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      const r = await authorizedFetch("/api/payroll/tax-filings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          filingType: formData.filingType,
          status: "draft",
        }),
      });
      const j = await r.json();
      if (j.item) {
        alert(`Filing created successfully`);
        fetchFilings();
        setFormData({ periodStart: "", periodEnd: "", jurisdiction: "PH", filingType: "monthly" });
      } else {
        alert(j.error || "Failed to create filing");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating filing");
    }
    setLoading(false);
  }

  async function exportFiling(filingId: string) {
    try {
      const r = await authorizedFetch(`/api/payroll/tax-filings/${filingId}/export?jurisdiction=${formData.jurisdiction}`);
      if (r.ok) {
        const blob = await r.blob();
        const filename = r.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") || `filing_${filingId}.txt`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Failed to export filing");
      }
    } catch (e) {
      console.error(e);
      alert("Error exporting filing");
    }
  }

  async function updateStatus(filingId: string, status: string) {
    setLoading(true);
    try {
      const r = await authorizedFetch("/api/payroll/tax-filings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filingId, status }),
      });
      const j = await r.json();
      if (j.success) {
        fetchFilings();
      } else {
        alert(j.error || "Failed to update status");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating status");
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Payroll Tax Filings</h1>

      {/* Generate Filing Form */}
      <div style={{ border: "1px solid #ddd", padding: 16, marginBottom: 24, borderRadius: 4 }}>
        <h3>Generate New Filing</h3>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <label>Period Start:</label>
            <input
              type="date"
              value={formData.periodStart}
              onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
            />
          </div>
          <div>
            <label>Period End:</label>
            <input
              type="date"
              value={formData.periodEnd}
              onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
            />
          </div>
          <div>
            <label>Jurisdiction:</label>
            <select value={formData.jurisdiction} onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}>
              <option value="PH">Philippines (BIR)</option>
              <option value="US">USA (IRS)</option>
              <option value="UK">UK (HMRC)</option>
              <option value="AU">Australia (ATO)</option>
            </select>
          </div>
          <div>
            <label>Filing Type:</label>
            <select value={formData.filingType} onChange={(e) => setFormData({ ...formData, filingType: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <button onClick={generateFiling} disabled={loading}>
          Generate Filing
        </button>
      </div>

      {/* Filings List */}
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h3>Filings ({filings.length})</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Type</th>
                <th style={{ textAlign: "left", padding: 8 }}>Period</th>
                <th style={{ textAlign: "left", padding: 8 }}>Employees</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filings.map((filing) => (
                <tr
                  key={filing.id}
                  onClick={() => setSelected(filing)}
                  style={{
                    cursor: "pointer",
                    background: selected?.id === filing.id ? "#f0f0f0" : "white",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td style={{ padding: 8 }}>{filing.filing_type}</td>
                  <td style={{ padding: 8 }}>
                    {new Date(filing.period_start).toLocaleDateString()} to {new Date(filing.period_end).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 8 }}>{filing.employee_count}</td>
                  <td style={{ padding: 8, color: filing.status === "filed" ? "green" : "blue" }}>{filing.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Filing Details */}
        <div style={{ width: 400, borderLeft: "1px solid #ddd", paddingLeft: 12 }}>
          <h3>Filing Details</h3>
          {!selected && <p>Select a filing to view details</p>}
          {selected && (
            <div>
              <p>
                <strong>ID:</strong> {selected.id.substring(0, 8)}...
              </p>
              <p>
                <strong>Type:</strong> {selected.filing_type}
              </p>
              <p>
                <strong>Period:</strong> {new Date(selected.period_start).toLocaleDateString()} to{" "}
                {new Date(selected.period_end).toLocaleDateString()}
              </p>
              <p>
                <strong>Employees:</strong> {selected.employee_count}
              </p>
              <p>
                <strong>Gross Pay:</strong> ${selected.gross_pay.toFixed(2)}
              </p>
              <p>
                <strong>Tax Withheld:</strong> ${selected.tax_withheld.toFixed(2)}
              </p>
              <p>
                <strong>Status:</strong> <span style={{ color: selected.status === "filed" ? "green" : "blue" }}>{selected.status}</span>
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => exportFiling(selected.id)} disabled={loading}>
                  Export Filing
                </button>
                {selected.status === "draft" && (
                  <button onClick={() => updateStatus(selected.id, "filed")} disabled={loading}>
                    Mark as Filed
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
