"use client";

import { useEffect, useMemo, useState } from "react";
import { useShell } from "../shell-context";

type DashboardResponse = {
  companyId: string;
  totalSalesToday: string;
  totalSalesMonth: string;
  totalSalesYear: string;
  totalExpensesToday: string;
  netProfitMonth: string;
  cashBalance: string;
  currencyCode: "PHP";
};

export default function DashboardPage() {
  const { authorizedFetch, setStatus, companyId } = useShell();
  const [dashboardResult, setDashboardResult] = useState("");

  const dashboardMetrics = useMemo(() => {
    try {
      return dashboardResult ? (JSON.parse(dashboardResult) as DashboardResponse) : null;
    } catch {
      return null;
    }
  }, [dashboardResult]);

  const fetchDashboard = async () => {
    setStatus("Loading dashboard...");
    const res = await authorizedFetch("/api/dashboard");
    const json = await res.json();
    if (!res.ok) {
      setDashboardResult(`Error ${res.status}: ${JSON.stringify(json)}`);
      setStatus("Dashboard load failed.");
      return;
    }
    setDashboardResult(JSON.stringify(json as DashboardResponse, null, 2));
    setStatus("Dashboard refreshed.");
  };

  useEffect(() => {
    if (companyId) {
      setDashboardResult(""); // Clear previous data
      fetchDashboard();
    }
  }, [companyId]);

  return (
    <section className="panel">
      <div className="row spaceBetween">
        <h2>Dashboard</h2>
        <button onClick={fetchDashboard} type="button" className="primary">
          Refresh KPIs
        </button>
      </div>
      <div className="kpiGrid">
        <article className="kpiCard">
          <span>Cash on Hand</span>
          <strong>{dashboardMetrics ? `PHP ${dashboardMetrics.cashBalance}` : "--"}</strong>
        </article>
        <article className="kpiCard">
          <span>Receivables (Today Sales)</span>
          <strong>{dashboardMetrics ? `PHP ${dashboardMetrics.totalSalesToday}` : "--"}</strong>
        </article>
        <article className="kpiCard">
          <span>Expenses Today</span>
          <strong>{dashboardMetrics ? `PHP ${dashboardMetrics.totalExpensesToday}` : "--"}</strong>
        </article>
        <article className="kpiCard">
          <span>Net Profit Month</span>
          <strong>{dashboardMetrics ? `PHP ${dashboardMetrics.netProfitMonth}` : "--"}</strong>
        </article>
      </div>
    </section>
  );
}
