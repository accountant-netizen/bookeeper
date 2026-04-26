"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Select from "react-select";
import { ShellProvider, shellSignOut, useShell, useShellSafe } from "./shell-context";
import type { Company } from "@accountant/shared-types";

export const dynamic = 'force-dynamic';

type PillarLayoutProps = {
  children: ReactNode;
};

function ShellFrame({ children }: PillarLayoutProps) {
  const pathname = usePathname();
  const shell = useShellSafe();
  
  // If there's no shell context (e.g., during prerendering), just render children
  if (!shell) {
    return <>{children}</>;
  }
  
  const { session, companyId, setCompanyId, authorizedFetch } = shell;
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

        {children}
      </main>

      <nav className="mobileTabs" aria-label="Mobile Navigation">
        <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
          Dashboard
        </Link>
        <Link href="/transactions" className={pathname === "/transactions" ? "active" : ""}>
          Sales
        </Link>
        <Link href="/transactions" className={pathname === "/transactions" ? "active" : ""}>
          Expenses
        </Link>
        <Link href="/library" className={pathname === "/library" ? "active" : ""}>
          More
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
