"use client";

import { useEffect, useMemo, useState } from "react";
import { useShell } from "../shell-context";
import Select from "react-select";

type PostingResponse = {
  success: boolean;
  entryId?: string;
  error?: string;
};

type ApSupplierResponse = {
  item?: {
    id: string;
    code: string;
    name: string;
  };
  error?: string;
};

type ApBillResponse = {
  success?: boolean;
  billId?: string;
  journalEntryId?: string;
  totalAmount?: string;
  error?: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
};

type Supplier = {
  id: string;
  code: string;
  name: string;
};

type LineItem = {
  id: string;
  description: string;
  accountId: string;
  debit: string;
  credit: string;
};

export default function TransactionsPage() {
  const { companyId, authorizedFetch, setStatus } = useShell();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [referenceNo, setReferenceNo] = useState(`JV-${Date.now()}`);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState<LineItem[]>([
    { id: "1", description: "Sample debit", accountId: "", debit: "1000.00", credit: "0.00" },
    { id: "2", description: "Sample credit", accountId: "", debit: "0.00", credit: "1000.00" }
  ]);
  const [postingResult, setPostingResult] = useState("");

  // AP states
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [billNo, setBillNo] = useState(`BILL-${Date.now()}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [apAccountId, setApAccountId] = useState("");
  const [billLines, setBillLines] = useState<LineItem[]>([
    { id: "1", description: "Sample AP expense", accountId: "", debit: "", credit: "" }
  ]);
  const [withholdingTaxAmount, setWithholdingTaxAmount] = useState("0.00");
  const [billResult, setBillResult] = useState("");

  useEffect(() => {
    if (!companyId) return;
    fetchAccounts();
    fetchSuppliers();
  }, [companyId]);

  const fetchAccounts = async () => {
    const res = await authorizedFetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.items || []);
    }
  };

  const fetchSuppliers = async () => {
    const res = await authorizedFetch("/api/ap/suppliers");
    if (res.ok) {
      const data = await res.json();
      setSuppliers(data.items || []);
    }
  };

  const debitTotal = useMemo(() => {
    return lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  }, [lines]);

  const creditTotal = useMemo(() => {
    return lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  }, [lines]);

  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;

  const accountOptions = useMemo(() =>
    accounts.map(account => ({
      value: account.id,
      label: `${account.code} - ${account.name}`
    })), [accounts]);

  const accountSelectMenuTarget = typeof document !== "undefined" ? document.body : null;
  const accountSelectProps = {
    className: "appSelect",
    classNamePrefix: "appSelect",
    options: accountOptions,
    isClearable: true,
    menuPortalTarget: accountSelectMenuTarget,
    menuPosition: "fixed" as const,
    styles: {
      menuPortal: (base: any) => ({
        ...base,
        zIndex: 9999
      })
    }
  };

  const supplierOptions = useMemo(() =>
    suppliers.map(supplier => ({
      value: supplier.id,
      label: `${supplier.code} - ${supplier.name}`
    })), [suppliers]);

  const updateLine = (id: string, field: keyof LineItem, value: string) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        // Clear the opposite field when entering debit or credit
        if (field === "debit" && value) {
          updated.credit = "";
        } else if (field === "credit" && value) {
          updated.debit = "";
        }
        return updated;
      }
      return line;
    }));
  };

  const addLine = () => {
    const newId = (lines.length + 1).toString();
    setLines([...lines, { id: newId, description: "", accountId: "", debit: "0.00", credit: "0.00" }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const postEntry = async () => {
    if (!companyId || lines.some(line => !line.accountId)) {
      setPostingResult("Set company ID and select accounts for all lines.");
      return;
    }

    setStatus("Posting journal entry...");
    const payload = {
      companyId,
      referenceNo,
      entryDate,
      lines: lines.map(({ description, accountId, debit, credit }) => ({
        accountId,
        description,
        debit,
        credit
      }))
    };

    const res = await authorizedFetch("/api/posting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const json = (await res.json()) as PostingResponse;
    if (!res.ok) {
      setPostingResult(`Error ${res.status}: ${JSON.stringify(json)}`);
      setStatus("Posting failed.");
      return;
    }

    setPostingResult(JSON.stringify(json, null, 2));
    setStatus("Journal entry posted.");
  };

  const createBill = async () => {
    if (!companyId || !selectedSupplierId || !expenseAccountId || !apAccountId) {
      setBillResult("Set company ID, supplier, expense account, and AP account.");
      return;
    }

    setStatus("Creating bill and posting journal...");
    const res = await authorizedFetch("/api/ap/bills", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyId,
        supplierId: selectedSupplierId,
        billNo,
        billDate,
        expenseAccountId,
        apAccountId,
        withholdingTaxAmount,
        lines: billLines.map(({ description, accountId, debit, credit }) => ({
          description,
          qty: "1", // Assuming qty 1 for simplicity
          unitCost: debit || "0" // AP bills are typically debits to expense accounts
        }))
      })
    });

    const json = (await res.json()) as ApBillResponse;
    if (!res.ok) {
      setBillResult(`Error ${res.status}: ${JSON.stringify(json)}`);
      setStatus("Bill create failed.");
      return;
    }

    setBillResult(JSON.stringify(json, null, 2));
    setStatus("Bill created and posted.");
  };

  return (
    <div className="libraryContainer">
      <section className="panel">
        <h2>Transaction Hub</h2>

        {/* Manual Journal Entry */}
        <div className="actionCard">
          <h3>Manual Journal Entry</h3>
          <div className="formGrid">
            <label>
              Reference No
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </label>
            <label>
              Date
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </label>
          </div>

          <table className="lineItems">
            <thead>
              <tr>
                <th>Description</th>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <Select
                      {...accountSelectProps}
                      value={accountOptions.find(option => option.value === line.accountId) || null}
                      onChange={(selected) => updateLine(line.id, "accountId", selected?.value || "")}
                      placeholder="Select Account"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => removeLine(line.id)} className="ghost">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button type="button" onClick={addLine} className="primary">Add Line</button>
          </div>

          <div className="totalDisplay">
            <div className="balanceInfo">
              <strong className={isBalanced ? "status-balanced" : "status-unbalanced"}>
                {isBalanced ? "Balanced" : `Out of balance by ₱${Math.abs(debitTotal - creditTotal).toFixed(2)}`} | Debit ₱{debitTotal.toFixed(2)} / Credit ₱{creditTotal.toFixed(2)}
              </strong>
            </div>
            <button type="button" disabled={!isBalanced} onClick={postEntry} className="primary">
              Post Entry
            </button>
          </div>
          {postingResult && (
            <div className="resultBox">
              <pre>{postingResult}</pre>
            </div>
          )}
        </div>

        {/* AP Bills */}
        <div className="actionCard">
          <h3>Accounts Payable</h3>
          <div className="formGrid">
            <label>
              Supplier
              <Select
                className="appSelect"
                classNamePrefix="appSelect"
                options={supplierOptions}
                value={supplierOptions.find(option => option.value === selectedSupplierId) || null}
                onChange={(selected) => setSelectedSupplierId(selected?.value || "")}
                placeholder="Select Supplier"
                isClearable
              />
            </label>
            <label>
              Bill No
              <input value={billNo} onChange={(e) => setBillNo(e.target.value)} />
            </label>
            <label>
              Date
              <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </label>
            <label>
              Expense Account
              <Select
                className="appSelect"
                classNamePrefix="appSelect"
                options={accountOptions}
                value={accountOptions.find(option => option.value === expenseAccountId) || null}
                onChange={(selected) => setExpenseAccountId(selected?.value || "")}
                placeholder="Select Account"
                isClearable
              />
            </label>
            <label>
              AP Account
              <Select
                className="appSelect"
                classNamePrefix="appSelect"
                options={accountOptions}
                value={accountOptions.find(option => option.value === apAccountId) || null}
                onChange={(selected) => setApAccountId(selected?.value || "")}
                placeholder="Select Account"
                isClearable
              />
            </label>
            <label>
              Withholding Tax
              <input
                type="number"
                step="0.01"
                value={withholdingTaxAmount}
                onChange={(e) => setWithholdingTaxAmount(e.target.value)}
              />
            </label>
          </div>

          <table className="lineItems">
            <thead>
              <tr>
                <th>Description</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {billLines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <input
                      value={line.description}
                      onChange={(e) => setBillLines(billLines.map(l => l.id === line.id ? { ...l, description: e.target.value } : l))}
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <Select
                      {...accountSelectProps}
                      value={accountOptions.find(option => option.value === line.accountId) || null}
                      onChange={(selected) => setBillLines(billLines.map(l => l.id === line.id ? { ...l, accountId: selected?.value || "" } : l))}
                      placeholder="Select Account"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={line.debit || line.credit}
                      onChange={(e) => setBillLines(billLines.map(l => l.id === line.id ? { ...l, debit: e.target.value, credit: "" } : l))}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => setBillLines(billLines.filter(l => l.id !== line.id))} className="ghost">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button type="button" onClick={() => setBillLines([...billLines, { id: (billLines.length + 1).toString(), description: "", accountId: "", debit: "", credit: "" }])} className="primary">
              Add Line
            </button>
          </div>

          <div className="row">
            <button onClick={createBill} type="button" className="primary">
              Create Bill + Auto Post
            </button>
          </div>
          {billResult && (
            <div className="resultBox">
              <pre>{billResult}</pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
