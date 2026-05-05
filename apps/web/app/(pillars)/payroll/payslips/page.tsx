"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

type Employee = { id: string; employee_no: string; first_name: string; last_name: string };

export default function PayslipsPage() {
  const { companyId, authorizedFetch, setStatus } = useShell();
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    payDate: "",
    grossPay: "0",
    deductions: "0",
    taxWithheld: "0",
    status: "draft",
    notes: ""
  });

  function fetchPayslips() {
    setLoading(true);
    Promise.all([
      authorizedFetch(`/api/payroll/payslips?companyId=${companyId}`),
      authorizedFetch(`/api/payroll/employees?companyId=${companyId}`)
    ])
      .then(async ([payslipsRes, employeesRes]) => {
        const payslipsJson = await payslipsRes.json();
        const employeesJson = await employeesRes.json();
        setItems(payslipsJson.items || []);
        setEmployees(employeesJson.items || []);
      })
      .catch(() => {
        setItems([]);
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPayslips();
  }, [companyId]);

  function createPayslip(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) {
      setStatus("Select a company first.");
      return;
    }

    setStatus("Creating payslip...");
    authorizedFetch(`/api/payroll/payslips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        employeeId: form.employeeId,
        payPeriodStart: form.payPeriodStart,
        payPeriodEnd: form.payPeriodEnd,
        payDate: form.payDate,
        grossPay: parseFloat(form.grossPay || "0"),
        deductions: parseFloat(form.deductions || "0"),
        taxWithheld: parseFloat(form.taxWithheld || "0"),
        status: form.status,
        notes: form.notes
      })
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(json.error || `Unexpected error ${r.status}`);
        }
        setForm({
          employeeId: "",
          payPeriodStart: "",
          payPeriodEnd: "",
          payDate: "",
          grossPay: "0",
          deductions: "0",
          taxWithheld: "0",
          status: "draft",
          notes: ""
        });
        fetchPayslips();
        setStatus("Payslip created.");
      })
      .catch((error) => {
        setStatus(`Payslip create failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      });
  }

  return (
    <div>
      <h2>Payslips</h2>
      <form onSubmit={createPayslip} style={{ marginBottom: 12 }}>
        <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
          <option value="">Select employee</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.employee_no} - {employee.first_name} {employee.last_name}
            </option>
          ))}
        </select>
        <input type="date" value={form.payPeriodStart} onChange={(e) => setForm({ ...form, payPeriodStart: e.target.value })} required />
        <input type="date" value={form.payPeriodEnd} onChange={(e) => setForm({ ...form, payPeriodEnd: e.target.value })} required />
        <input type="date" value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} required />
        <input placeholder="Gross Pay" value={form.grossPay} onChange={(e) => setForm({ ...form, grossPay: e.target.value })} />
        <input placeholder="Deductions" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
        <input placeholder="Tax Withheld" value={form.taxWithheld} onChange={(e) => setForm({ ...form, taxWithheld: e.target.value })} />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="paid">Paid</option>
        </select>
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit">Create</button>
      </form>
      {loading ? <p>Loading…</p> : null}
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Period</th>
            <th>Pay Date</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Net Pay</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((item) => (
            <tr key={item.id}>
              <td>{employees.find((employee) => employee.id === item.employee_id)?.employee_no || item.employee_id}</td>
              <td>{item.pay_period_start} → {item.pay_period_end}</td>
              <td>{item.pay_date}</td>
              <td>{item.status}</td>
              <td style={{ textAlign: "right" }}>{item.net_pay}</td>
            </tr>
          )) : !loading ? <TableEmptyState description="Create a payslip to see payroll history here." /> : null}
        </tbody>
      </table>
    </div>
  );
}
