"use client";
import React, { useEffect, useState } from "react";
import { TableEmptyState } from "../../table-empty-state";

type OCRJob = {
  id: string;
  document_id: string;
  engine: string;
  status: string;
  attempts: number;
  last_error?: string;
  created_at: string;
  payload?: any;
};

type Document = {
  id: string;
  filename: string;
  ocr_status: string;
};

export default function OCRJobsPage() {
  const [jobs, setJobs] = useState<OCRJob[]>([]);
  const [selected, setSelected] = useState<OCRJob | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/ocr/jobs');
      const j = await res.json();
      setJobs(j.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function viewJob(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/ocr/jobs/${id}`);
      const j = await res.json();
      setSelected(j.item || null);
      
      // Fetch linked document if job found
      if (j.item?.document_id) {
        const docRes = await fetch(`/api/documents/${j.item.document_id}`);
        const docJson = await docRes.json();
        setDocument(docJson.item || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function rerunJob(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/ocr/jobs/${id}/rerun`, { method: 'POST' });
      const j = await res.json();
      if (j.success) {
        alert('Job re-queued for processing');
        fetchJobs();
      } else {
        alert(j.error || 'Failed to rerun job');
      }
    } catch (e) { console.error(e); alert('Error rerunning job'); }
    setLoading(false);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>OCR Jobs</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <button onClick={fetchJobs} disabled={loading}>Refresh</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>ID</th><th>Status</th><th>Engine</th><th>Attempts</th><th>Created</th></tr>
            </thead>
            <tbody>
                {jobs.length > 0 ? jobs.map(j => (
                <tr key={j.id} style={{ borderTop: '1px solid #eee', cursor: 'pointer' }} onClick={() => viewJob(j.id)}>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.id}</td>
                  <td>{j.status}</td>
                  <td>{j.engine}</td>
                  <td>{j.attempts}</td>
                  <td>{new Date(j.created_at).toLocaleString()}</td>
                </tr>
                )) : !loading ? <TableEmptyState description="OCR processing jobs will appear here when documents are queued." /> : null}
            </tbody>
          </table>
        </div>
        <div style={{ width: 480, borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
          <h3>Job Details</h3>
          {!selected && <p>Select a job to view details</p>}
          {selected && (
            <div>
              <p><strong>ID:</strong> {selected.id}</p>
              <p><strong>Document:</strong> {document?.filename || selected.document_id}</p>
              <p><strong>Doc Status:</strong> {document?.ocr_status || 'loading...'}</p>
              <p><strong>Status:</strong> <span style={{ color: selected.status === 'succeeded' ? 'green' : selected.status === 'failed' ? 'red' : 'blue' }}>{selected.status}</span></p>
              <p><strong>Engine:</strong> {selected.engine}</p>
              <p><strong>Attempts:</strong> {selected.attempts}</p>
              {selected.last_error && <p style={{ color: 'red' }}><strong>Error:</strong> {selected.last_error}</p>}
              <div style={{ marginTop: 12 }}>
                {selected.status === 'failed' && (
                  <button onClick={() => rerunJob(selected.id)} disabled={loading}>Re-run Job</button>
                )}
              </div>
              <h4>Extracted Text</h4>
              <pre style={{ maxHeight: 400, overflow: 'auto', background: '#fafafa', padding: 8 }}>{selected.payload?.extractedText || '(none)'}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
