"use client";
import React, { useEffect, useState } from "react";

export default function MatchRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("{\"description_contains\":\"\"}");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    try {
      const r = await fetch(`/api/banking/match-rules`);
      const j = await r.json();
      setRules(j.items || []);
    } catch (e) { console.error(e); }
  }

  async function createRule() {
    setLoading(true);
    try {
      const parsed = JSON.parse(pattern || "{}");
      const r = await fetch(`/api/banking/match-rules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, pattern: parsed }) });
      const j = await r.json();
      if (j.id) {
        setName(""); setPattern("{\"description_contains\":\"\"}");
        fetchRules();
      } else {
        alert(j.error || 'Create failed');
      }
    } catch (e) { console.error(e); alert('Invalid pattern JSON'); }
    setLoading(false);
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete rule?')) return;
    setLoading(true);
    try {
      await fetch(`/api/banking/match-rules/${id}`, { method: 'DELETE' });
      fetchRules();
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Match Rules</h2>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Rule name" value={name} onChange={e=>setName(e.target.value)} />
        <textarea rows={4} cols={60} value={pattern} onChange={e=>setPattern(e.target.value)} style={{ display: 'block', marginTop: 8 }} />
        <div style={{ marginTop: 8 }}>
          <button onClick={createRule} disabled={loading}>Create Rule</button>
        </div>
      </div>

      <h3>Existing Rules</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Name</th><th>Pattern</th><th>Priority</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{r.name}</td>
              <td><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.pattern)}</pre></td>
              <td>{r.priority}</td>
              <td><button onClick={() => deleteRule(r.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
