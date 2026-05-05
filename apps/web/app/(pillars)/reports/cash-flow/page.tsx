"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";

export default function CashFlowPage() {
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
    authorizedFetch(`/api/reports/cash-flow?companyId=${companyId}&startDate=${start}&endDate=${end}`)
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

  const cashAccounts = Array.isArray(data?.cashAccounts) ? data.cashAccounts : [];
  const hasRows = !!data;

  return (
    <section className="panel">
      <h2>Cash Flow</h2>
      <div className="metricRow">
        <article className="metricCard">
          <p className="label">Opening</p>
          <p className="value">{data?.opening ?? "0.00"}</p>
        </article>
        <article className="metricCard">
          <p className="label">Net Change</p>
          <p className="value">{data?.netChange ?? "0.00"}</p>
        </article>
        <article className="metricCard">
          <p className="label">Closing</p>
          <p className="value">{data?.closing ?? "0.00"}</p>
        </article>
      </div>
      {loading ? <p>Loading…</p> : null}
      {hasRows ? (
        <div className="reportGrid">
          <div className="reportSection">
            <h3>Period Overview</h3>
            <p className="subtleNote">{data?.startDate ?? "-"} to {data?.endDate ?? "-"}</p>
            <table>
              <thead>
                <tr>
                  <th>Measure</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Inflows</td><td style={{ textAlign: "right" }}>{data?.inflows ?? "0.00"}</td></tr>
                <tr><td>Outflows</td><td style={{ textAlign: "right" }}>{data?.outflows ?? "0.00"}</td></tr>
                <tr><td>Net change</td><td style={{ textAlign: "right" }}>{data?.netChange ?? "0.00"}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="reportSection">
            <h3>Cash Accounts</h3>
            {cashAccounts.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {cashAccounts.map((c: any) => (
                    <tr key={c.accountId}><td>{c.code}</td><td>{c.name}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="subtleNote">No cash accounts matched in the selected period.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="moduleCard" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>No cash flow summary yet</h3>
          <p style={{ marginBottom: 0 }}>
            Select a company with bank activity and posted transactions to generate a cash flow picture.
          </p>
        </div>
      )}
    </section>
  );
}
