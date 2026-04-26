"use client";

import { invariant, postingRules } from "@accountant/accounting-core";
import { useShell } from "../shell-context";

export default function VaultPage() {
  const { shortToken, status } = useShell();

  return (
    <section className="panel">
      <h2>Vault (Reports & Tax)</h2>
    </section>
  );
}
