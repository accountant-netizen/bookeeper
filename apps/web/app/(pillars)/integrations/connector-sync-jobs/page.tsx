"use client";
import React, { useEffect, useState } from "react";

type ConnectorSyncJob = {
  id: string;
  connector_config_id: string;
  job_name: string;
  payload: any;
  status: string;
  attempts: number;
  last_error?: string;
  created_at: string;
};

type ConnectorConfig = {
  id: string;
  provider: string;
  name: string;
  status: string;
};

export default function ConnectorSyncJobsPage() {
  const [jobs, setJobs] = useState<ConnectorSyncJob[]>([]);
  const [selected, setSelected] = useState<ConnectorSyncJob | null>(null);
  const [connector, setConnector] = useState<ConnectorConfig | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/connectors/sync/jobs");
      const j = await res.json();
      setJobs(j.items || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function viewJob(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/connectors/sync/jobs/${id}`);
      const j = await res.json();
      setSelected(j.item || null);

      // Fetch connector config if job found
      if (j.item?.connector_config_id) {
        const configRes = await fetch(`/api/integrations/connectors/${j.item.connector_config_id}`);
        const configJson = await configRes.json();
        setConnector(configJson.item || null);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function rerunJob(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/connectors/sync/jobs/${id}`, { method: "POST" });
      const j = await res.json();
      if (j.success) {
        alert("Job re-queued for processing");
        fetchJobs();
      } else {
        alert(j.error || "Failed to rerun job");
      }
    } catch (e) {
      console.error(e);
      alert("Error rerunning job");
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Connector Sync Jobs</h1>

      <div style={{ marginBottom: 16 }}>
        <button onClick={fetchJobs} disabled={loading}>
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h3>Jobs ({jobs.length})</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Job Name</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                <th style={{ textAlign: "left", padding: 8 }}>Attempts</th>
                <th style={{ textAlign: "left", padding: 8 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length > 0 ? jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => viewJob(job.id)}
                  style={{
                    cursor: "pointer",
                    background: selected?.id === job.id ? "#f0f0f0" : "white",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td style={{ padding: 8 }}>{job.job_name}</td>
                  <td
                    style={{
                      padding: 8,
                      color:
                        job.status === "succeeded"
                          ? "green"
                          : job.status === "failed"
                          ? "red"
                          : "blue",
                    }}
                  >
                    {job.status}
                  </td>
                  <td style={{ padding: 8 }}>{job.attempts}</td>
                  <td style={{ padding: 8 }}>{new Date(job.created_at).toLocaleString()}</td>
                </tr>
              )) : !loading ? <TableEmptyState description="Connector sync jobs will appear here when connectors are processed." /> : null}
            </tbody>
          </table>
        </div>

        <div style={{ width: 480, borderLeft: "1px solid #ddd", paddingLeft: 12 }}>
          <h3>Job Details</h3>
          {!selected && <p>Select a job to view details</p>}
          {selected && (
            <div>
              <p>
                <strong>ID:</strong> {selected.id}
              </p>
              <p>
                <strong>Connector:</strong> {connector?.provider || selected.connector_config_id} ({connector?.name})
              </p>
              <p>
                <strong>Connector Status:</strong> {connector?.status || "loading..."}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color:
                      selected.status === "succeeded"
                        ? "green"
                        : selected.status === "failed"
                        ? "red"
                        : "blue",
                  }}
                >
                  {selected.status}
                </span>
              </p>
              <p>
                <strong>Attempts:</strong> {selected.attempts}
              </p>
              {selected.last_error && (
                <p style={{ color: "red" }}>
                  <strong>Error:</strong> {selected.last_error}
                </p>
              )}
              <div style={{ marginTop: 12 }}>
                {selected.status === "failed" && (
                  <button onClick={() => rerunJob(selected.id)} disabled={loading}>
                    Re-run Job
                  </button>
                )}
              </div>
              <h4>Payload</h4>
              <pre
                style={{
                  maxHeight: 300,
                  overflow: "auto",
                  background: "#fafafa",
                  padding: 8,
                }}
              >
                {JSON.stringify(selected.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
