"use client";
import React, { useEffect, useState } from "react";
import { useShell } from "../../shell-context";
import { TableEmptyState } from "../../table-empty-state";

export default function EmployeesPage() {
  const { companyId, authorizedFetch, setStatus } = useShell();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employeeNo: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    jobTitle: "",
    hireDate: "",
    baseSalary: "0",
    payFrequency: "monthly"
  });

  function fetchEmployees() {
    setLoading(true);
    authorizedFetch(`/api/payroll/employees?companyId=${companyId}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchEmployees();
  }, [companyId]);

  function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) {
      setStatus("Select a company first.");
      return;
    }

    setStatus("Creating employee...");
    authorizedFetch(`/api/payroll/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        employeeNo: form.employeeNo,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        department: form.department,
        jobTitle: form.jobTitle,
        hireDate: form.hireDate || null,
        baseSalary: parseFloat(form.baseSalary || "0"),
        payFrequency: form.payFrequency
      })
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(json.error || `Unexpected error ${r.status}`);
        }
        setForm({
          employeeNo: "",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          department: "",
          jobTitle: "",
          hireDate: "",
          baseSalary: "0",
          payFrequency: "monthly"
        });
        fetchEmployees();
        setStatus("Employee created.");
      })
      .catch((error) => {
        setStatus(`Employee create failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      });
  }

  return (
    <div>
      <h2>Employees</h2>
      <form onSubmit={createEmployee} style={{ marginBottom: 12 }}>
        <input placeholder="Employee No" value={form.employeeNo} onChange={(e) => setForm({ ...form, employeeNo: e.target.value })} required />
        <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
        <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input placeholder="Job Title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
        <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
        <input placeholder="Base Salary" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
        <select value={form.payFrequency} onChange={(e) => setForm({ ...form, payFrequency: e.target.value })}>
          <option value="monthly">Monthly</option>
          <option value="semi-monthly">Semi-monthly</option>
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
        <button type="submit">Create</button>
      </form>
      {loading ? <p>Loading…</p> : null}
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Name</th>
            <th>Department</th>
            <th>Job Title</th>
            <th style={{ textAlign: "right" }}>Base Salary</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((item) => (
            <tr key={item.id}>
              <td>{item.employee_no}</td>
              <td>{item.first_name} {item.last_name}</td>
              <td>{item.department}</td>
              <td>{item.job_title}</td>
              <td style={{ textAlign: "right" }}>{item.base_salary}</td>
            </tr>
          )) : !loading ? <TableEmptyState description="Add an employee to start building payroll records." /> : null}
        </tbody>
      </table>
    </div>
  );
}
