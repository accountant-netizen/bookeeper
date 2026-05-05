"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";

export default function BalanceSheetPage() {
  const { companyId, authorizedFetch } = useShell();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authorizedFetch(`/api/reports/balance-sheet?companyId=${companyId}`)
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

  const assets = Array.isArray(data?.assets) ? data.assets : [];
  const liabilities = Array.isArray(data?.liabilities) ? data.liabilities : [];
  const equity = Array.isArray(data?.equity) ? data.equity : [];
  const hasRows = assets.length > 0 || liabilities.length > 0 || equity.length > 0;

  const totals = {
    assets: data?.totals?.assets ?? "0.00",
    liabilities: data?.totals?.liabilities ?? "0.00",
    equity: data?.totals?.equity ?? "0.00",
  };

  return (
    <section className="panel">
      <h2>Balance Sheet</h2>
      <div className="metricRow">
        <article className="metricCard">
          <p className="label">Total Assets</p>
          <p className="value">{totals.assets}</p>
        </article>
        <article className="metricCard">
          <p className="label">Total Liabilities</p>
          <p className="value">{totals.liabilities}</p>
        </article>
        <article className="metricCard">
          <p className="label">Total Equity</p>
          <p className="value">{totals.equity}</p>
        </article>
      </div>
      {loading ? <p>Loading…</p> : null}
      {hasRows ? (
        <div className="reportGrid">
          <div className="reportSection">
          <h3>Assets</h3>
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th style={{textAlign:"right"}}>Balance</th></tr>
            </thead>
            <tbody>
              {assets.map((a: any) => (
                <tr key={a.accountId}><td>{a.code}</td><td>{a.name}</td><td style={{textAlign:"right"}}>{a.balance}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="reportSection">
          <h3>Liabilities</h3>
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th style={{textAlign:"right"}}>Balance</th></tr>
            </thead>
            <tbody>
              {liabilities.map((a: any) => (
                <tr key={a.accountId}><td>{a.code}</td><td>{a.name}</td><td style={{textAlign:"right"}}>{a.balance}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
          {equity.length > 0 ? (
            <div className="reportSection">
              <h3>Equity</h3>
              <table>
                <thead>
                  <tr><th>Code</th><th>Name</th><th style={{textAlign:"right"}}>Balance</th></tr>
                </thead>
                <tbody>
                  {equity.map((a: any) => (
                    <tr key={a.accountId}><td>{a.code}</td><td>{a.name}</td><td style={{textAlign:"right"}}>{a.balance}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="moduleCard" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>No balance sheet yet</h3>
          <p style={{ marginBottom: 0 }}>
            Load a company with posted balances to see assets and liabilities rendered here.
          </p>
        </div>
      )}
    </section>
  );
}
