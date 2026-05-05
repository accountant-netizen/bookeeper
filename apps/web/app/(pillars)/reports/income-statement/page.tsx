"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";

export default function IncomeStatementPage() {
  const { companyId, authorizedFetch } = useShell();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    // default to month-to-date
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const end = today.toISOString().split("T")[0];
    setLoading(true);
    authorizedFetch(`/api/reports/income-statement?companyId=${companyId}&startDate=${start}&endDate=${end}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) {
          setData(null);
          return;
        }
        setData(j);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [companyId, authorizedFetch]);

  const revenueAccounts = Array.isArray(data?.revenueAccounts) ? data.revenueAccounts : [];
  const expenseAccounts = Array.isArray(data?.expenseAccounts) ? data.expenseAccounts : [];
  const netProfit = data?.totals?.netProfit ?? "0.00";
  const hasRows = revenueAccounts.length > 0 || expenseAccounts.length > 0;

  const revenueTotal = revenueAccounts
    .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
    .toFixed(2);
  const expenseTotal = expenseAccounts
    .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
    .toFixed(2);

  return (
    <section className="panel">
      <h2>Income Statement</h2>
      <div className="metricRow">
        <article className="metricCard">
          <p className="label">Revenue</p>
          <p className="value">{revenueTotal}</p>
        </article>
        <article className="metricCard">
          <p className="label">Expenses</p>
          <p className="value">{expenseTotal}</p>
        </article>
        <article className="metricCard">
          <p className="label">Net Profit</p>
          <p className="value">{netProfit}</p>
        </article>
      </div>
      {loading ? <p>Loading…</p> : null}
      {hasRows ? (
        <div className="reportGrid">
          <div className="reportSection">
          <h3>Revenue</h3>
          <table>
            <thead><tr><th>Code</th><th>Name</th><th style={{textAlign:"right"}}>Amount</th></tr></thead>
            <tbody>
              {revenueAccounts.map((r: any) => (
                <tr key={r.accountId}><td>{r.code}</td><td>{r.name}</td><td style={{textAlign:"right"}}>{r.amount}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="reportSection">
          <h3>Expenses</h3>
          <table>
            <thead><tr><th>Code</th><th>Name</th><th style={{textAlign:"right"}}>Amount</th></tr></thead>
            <tbody>
              {expenseAccounts.map((r: any) => (
                <tr key={r.accountId}><td>{r.code}</td><td>{r.name}</td><td style={{textAlign:"right"}}>{r.amount}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="subtleNote">Net profit is computed as revenue less expenses for the selected period.</p>
        </div>
      ) : (
        <div className="moduleCard" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>No income statement yet</h3>
          <p style={{ marginBottom: 0 }}>
            Post revenue and expense activity for the selected period to populate this view.
          </p>
        </div>
      )}
    </section>
  );
}
