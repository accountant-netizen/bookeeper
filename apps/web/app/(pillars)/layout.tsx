"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Select from "react-select";
import { ShellProvider, shellSignOut, useShell } from "./shell-context";
import type { Company } from "@accountant/shared-types";

type PillarLayoutProps = {
  children: ReactNode;
};

function ShellFrame({ children }: PillarLayoutProps) {
  const pathname = usePathname();
  const { session, companyId, setCompanyId, authorizedFetch } = useShell();
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await authorizedFetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      }
    };

    if (session) {
      fetchCompanies();
    }
  }, [session, authorizedFetch]);

  const selectedCompany = companies.find(c => c.id === companyId);

  return (
    <div className="appShell">
      <aside className="sideNav">
        <h2>Accounting</h2>
        <p className="muted">Main Pages</p>
        <nav>
          <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
            Command Center
          </Link>
          <Link
            href="/transactions"
            className={pathname === "/transactions" ? "active" : ""}
          >
            Transaction Hub
          </Link>
          <Link href="/vault" className={pathname === "/vault" ? "active" : ""}>
            Vault
          </Link>
          <Link href="/library" className={pathname === "/library" ? "active" : ""}>
            Library
          </Link>
          <p className="muted">Reports</p>
          <Link href="/reports/trial-balance" className={pathname === "/reports/trial-balance" ? "active" : ""}>
            Trial Balance
          </Link>
          <Link href="/reports/balance-sheet" className={pathname === "/reports/balance-sheet" ? "active" : ""}>
            Balance Sheet
          </Link>
          <Link href="/reports/income-statement" className={pathname === "/reports/income-statement" ? "active" : ""}>
            Income Statement
          </Link>
          <Link href="/reports/cash-flow" className={pathname === "/reports/cash-flow" ? "active" : ""}>
            Cash Flow
          </Link>
          <p className="muted">Inventory</p>
          <Link href="/inventory/products" className={pathname === "/inventory/products" ? "active" : ""}>
            Products
          </Link>
          <Link href="/inventory/stock-movements" className={pathname === "/inventory/stock-movements" ? "active" : ""}>
            Stock Movements
          </Link>
          <Link href="/inventory/stock-on-hand" className={pathname === "/inventory/stock-on-hand" ? "active" : ""}>
            Stock On Hand
          </Link>
          <p className="muted">Payroll</p>
          <Link href="/payroll/employees" className={pathname === "/payroll/employees" ? "active" : ""}>
            Employees
          </Link>
          <Link href="/payroll/payslips" className={pathname === "/payroll/payslips" ? "active" : ""}>
            Payslips
          </Link>
          <p className="muted">Banking</p>
          <Link href="/banking/accounts" className={pathname === "/banking/accounts" ? "active" : ""}>
            Bank Accounts
          </Link>
          <Link href="/banking/statements" className={pathname === "/banking/statements" ? "active" : ""}>
            Statements
          </Link>
          <Link href="/banking/reconciliations" className={pathname === "/banking/reconciliations" ? "active" : ""}>
            Reconciliations
          </Link>
          <Link href="/banking/checks" className={pathname === "/banking/checks" ? "active" : ""}>
            Checks
          </Link>
          <p className="muted">Tax</p>
          <Link href="/tax/bir-exports" className={pathname === "/tax/bir-exports" ? "active" : ""}>
            BIR Exports
          </Link>
          <Link href="/payroll/tax-filings" className={pathname === "/payroll/tax-filings" ? "active" : ""}>
            Payroll Tax Filings
          </Link>
          <p className="muted">Automation</p>
          <Link href="/automation/recurring-transactions" className={pathname === "/automation/recurring-transactions" ? "active" : ""}>
            Recurring
          </Link>
          <Link href="/automation/reminders" className={pathname === "/automation/reminders" ? "active" : ""}>
            Reminders
          </Link>
          <Link href="/automation/jobs" className={pathname === "/automation/jobs" ? "active" : ""}>
            Job Queue
          </Link>
          <p className="muted">Documents</p>
          <Link href="/documents" className={pathname === "/documents" ? "active" : ""}>
            Documents
          </Link>
          <p className="muted">Integrations</p>
          <Link href="/integrations/connectors" className={pathname === "/integrations/connectors" ? "active" : ""}>
            Connectors
          </Link>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topBar">
          <div>
            <h1>Accountant Platform</h1>
            <p>{session.user.email}</p>
          </div>
          <div className="topActions">
            <label>
              Organization
              <Select
                value={selectedCompany ? { value: selectedCompany.id, label: selectedCompany.name } : null}
                onChange={(option) => option && setCompanyId(option.value)}
                options={companies.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select organization"
                className="appSelect"
                classNamePrefix="appSelect"
                isLoading={companies.length === 0}
              />
            </label>
            <button
              onClick={async () => {
                await shellSignOut();
              }}
              type="button"
              className="ghost"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="pageStack">
          {children}
        </div>
      </main>

      <nav className="mobileTabs" aria-label="Mobile Navigation">
        <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
          Dashboard
        </Link>
        <Link href="/transactions" className={pathname === "/transactions" ? "active" : ""}>
          Sales
        </Link>
        <Link href="/reports/trial-balance" className={pathname === "/reports/trial-balance" ? "active" : ""}>
          Reports
        </Link>
        <Link href="/inventory/products" className={pathname === "/inventory/products" ? "active" : ""}>
          Inventory
        </Link>
        <Link href="/payroll/employees" className={pathname === "/payroll/employees" ? "active" : ""}>
          Payroll
        </Link>
        <Link href="/banking/accounts" className={pathname === "/banking/accounts" ? "active" : ""}>
          Banking
        </Link>
      </nav>
    </div>
  );
}

export default function PillarLayout({ children }: PillarLayoutProps) {
  return (
    <ShellProvider>
      <ShellFrame>{children}</ShellFrame>
    </ShellProvider>
  );
}
