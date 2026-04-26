"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { useShell } from "../shell-context";

type Customer = {
  id: string;
  code: string;
  name: string;
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

type ArCustomerResponse = {
  item?: {
    id: string;
    code: string;
    name: string;
  };
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

type AccountResponse = {
  item?: {
    id: string;
    code: string;
    name: string;
  };
  error?: string;
};

type ArInvoiceResponse = {
  success?: boolean;
  invoiceId?: string;
  journalEntryId?: string;
  totalAmount?: string;
  error?: string;
};

export default function LibraryPage() {
  const { companyId, authorizedFetch, setStatus } = useShell();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerResult, setCustomerResult] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierResult, setSupplierResult] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountResult, setAccountResult] = useState("");
  const [invoiceCustomerId, setInvoiceCustomerId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [arAccountId, setArAccountId] = useState("");
  const [salesAccountId, setSalesAccountId] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("Sample AR sale");
  const [invoiceQty, setInvoiceQty] = useState("1");
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState("1000.00");
  const [invoiceResult, setInvoiceResult] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      try {
        // Fetch customers
        const customersRes = await authorizedFetch(`/api/ar/customers?companyId=${companyId}`);
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData.items || []);
        }

        // Fetch suppliers
        const suppliersRes = await authorizedFetch(`/api/ap/suppliers?companyId=${companyId}`);
        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData.items || []);
        }

        // Fetch accounts
        const accountsRes = await authorizedFetch("/api/accounts");
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          setAccounts(accountsData.items || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, [companyId, authorizedFetch]);

  const customerOptions = customers.map(customer => ({
    value: customer.id,
    label: `${customer.code} - ${customer.name}`
  }));

  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: `${account.code} - ${account.name}`
  }));

  const totalAmount = parseFloat(invoiceQty) * parseFloat(invoiceUnitPrice) || 0;

  const createCustomer = async () => {
    if (!companyId || !customerCode || !customerName) {
      setCustomerResult("Set company ID, customer code, and customer name.");
      return;
    }

    setStatus("Creating customer...");
    const res = await authorizedFetch("/api/ar/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyId,
        code: customerCode,
        name: customerName
      })
    });

    const json = (await res.json()) as ArCustomerResponse;
    if (!res.ok) {
      setCustomerResult(json.error ? `Unable to create customer: ${json.error}` : `Unexpected error ${res.status}.`);
      setStatus("Customer create failed.");
      return;
    }

    if (json.item?.id) {
      setInvoiceCustomerId(json.item.id);
    }

    setCustomerResult(`Customer created successfully: ${json.item?.code ?? "(unknown code)"} — ${json.item?.name ?? "(unknown name)"}`);
    setStatus("Customer created.");
  };

  const createSupplier = async () => {
    if (!companyId || !supplierCode || !supplierName) {
      setSupplierResult("Set company ID, supplier code, and supplier name.");
      return;
    }

    setStatus("Creating supplier...");
    const res = await authorizedFetch("/api/ap/suppliers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyId,
        code: supplierCode,
        name: supplierName
      })
    });

    const json = (await res.json()) as ApSupplierResponse;
    if (!res.ok) {
      setSupplierResult(json.error ? `Unable to create supplier: ${json.error}` : `Unexpected error ${res.status}.`);
      setStatus("Supplier create failed.");
      return;
    }

    setSupplierResult(`Supplier created successfully: ${json.item?.code ?? "(unknown code)"} — ${json.item?.name ?? "(unknown name)"}`);
    setStatus("Supplier created.");
  };

  const createAccount = async () => {
    if (!companyId || !accountCode || !accountName) {
      setAccountResult("Set company ID, account code, and account name.");
      return;
    }

    setStatus("Creating account...");
    const res = await authorizedFetch("/api/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyId,
        code: accountCode,
        name: accountName
      })
    });

    const json = (await res.json()) as { item?: Account; error?: string };
    if (!res.ok) {
      setAccountResult(json.error ? `Unable to create account: ${json.error}` : `Unexpected error ${res.status}.`);
      setStatus("Account create failed.");
      return;
    }

    // Refresh accounts list
    const refreshRes = await authorizedFetch("/api/accounts");
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      setAccounts(refreshData.items || []);
    }

    setAccountResult(`Account created successfully: ${json.item?.code ?? "(unknown code)"} — ${json.item?.name ?? "(unknown name)"}`);
    setStatus("Account created.");
    // Clear form
    setAccountCode("");
    setAccountName("");
  };

  const createInvoice = async () => {
    if (!companyId || !invoiceCustomerId || !invoiceNo || !arAccountId || !salesAccountId) {
      setInvoiceResult(
        "Set company ID, customer ID, invoice no, AR account ID, and Sales account ID."
      );
      return;
    }

    setStatus("Creating invoice and posting journal...");
    const res = await authorizedFetch("/api/ar/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        companyId,
        customerId: invoiceCustomerId,
        invoiceNo,
        invoiceDate: new Date().toISOString().split("T")[0],
        arAccountId,
        salesAccountId,
        lines: [
          {
            description: invoiceDescription,
            qty: invoiceQty,
            unitPrice: invoiceUnitPrice
          }
        ]
      })
    });

    const json = (await res.json()) as ArInvoiceResponse;
    if (!res.ok) {
      setInvoiceResult(json.error ? `Unable to create invoice: ${json.error}` : `Unexpected error ${res.status}.`);
      setStatus("Invoice create failed.");
      return;
    }

    setInvoiceResult(
      `Invoice created and posted successfully.` +
      (json.invoiceId ? ` Invoice ID: ${json.invoiceId}.` : "") +
      (json.journalEntryId ? ` Journal Entry ID: ${json.journalEntryId}.` : "") +
      (json.totalAmount ? ` Total: PHP ${json.totalAmount}.` : "")
    );
    setStatus("Invoice created and posted.");
  };

  return (
    <div className="libraryContainer">
      <section className="panel">
        <h2>Library (Master Data) - AR & AP</h2>

        {/* Customer Creation Section */}
        <div className="actionCard">
          <h3>Create New Customer</h3>
          <div className="formGrid">
            <label>
              Customer Code
              <input
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="CUST-001"
              />
            </label>
            <label>
              Customer Name
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Acme Trading"
              />
            </label>
          </div>
          <div className="row">
            <button onClick={createCustomer} type="button" className="primary">
              Create Customer
            </button>
          </div>
          {customerResult && (
            <div className="resultBox">
              <pre>{customerResult}</pre>
            </div>
          )}
        </div>

        {/* Supplier Creation Section */}
        <div className="actionCard">
          <h3>Create New Supplier</h3>
          <div className="formGrid">
            <label>
              Supplier Code
              <input
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                placeholder="SUP-001"
              />
            </label>
            <label>
              Supplier Name
              <input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="ABC Office Supplies"
              />
            </label>
          </div>
          <div className="row">
            <button onClick={createSupplier} type="button" className="primary">
              Create Supplier
            </button>
          </div>
          {supplierResult && (
            <div className="resultBox">
              <pre>{supplierResult}</pre>
            </div>
          )}
        </div>

        {/* Account Creation Section */}
        <div className="actionCard">
          <h3>Create Chart of Accounts</h3>
          <div className="formGrid">
            <label>
              Account Code
              <input
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="1010"
              />
            </label>
            <label>
              Account Name
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Cash"
              />
            </label>
          </div>
          <div className="row">
            <button onClick={createAccount} type="button" className="primary">
              Create Account
            </button>
          </div>
          {accountResult && (
            <div className="resultBox">
              <pre>{accountResult}</pre>
            </div>
          )}
        </div>

        {/* Invoice Creation Section */}
        <div className="actionCard">
          <h3>Create Sales Invoice</h3>
          <div className="formGrid">
            <label>
              Customer
              <Select
                className="appSelect"
                classNamePrefix="appSelect"
                options={customerOptions}
                value={customerOptions.find(opt => opt.value === invoiceCustomerId) || null}
                onChange={(option) => setInvoiceCustomerId(option?.value || "")}
                placeholder="Select customer..."
                isClearable
              />
            </label>
            <label>
              Invoice Number
              <input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="SI-0001"
              />
            </label>
            <label>
              AR Account
              <Select
                className="appSelect"
                classNamePrefix="appSelect"
                options={accountOptions}
                value={accountOptions.find(opt => opt.value === arAccountId) || null}
                onChange={(option) => setArAccountId(option?.value || "")}
                placeholder="Select AR account..."
                isClearable
              />
            </label>
            <label>
              Sales Account
              <Select
                className="appSelect"
                classNamePrefix="appSelect"
                options={accountOptions}
                value={accountOptions.find(opt => opt.value === salesAccountId) || null}
                onChange={(option) => setSalesAccountId(option?.value || "")}
                placeholder="Select sales account..."
                isClearable
              />
            </label>
            <label>
              Description
              <input
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                placeholder="Consulting service"
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                value={invoiceQty}
                onChange={(e) => setInvoiceQty(e.target.value)}
                min="0"
                step="0.01"
              />
            </label>
            <label>
              Unit Price
              <input
                type="number"
                value={invoiceUnitPrice}
                onChange={(e) => setInvoiceUnitPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </label>
            <div className="totalDisplay">
              <strong>Total: ${totalAmount.toFixed(2)}</strong>
            </div>
          </div>
          <div className="row">
            <button onClick={createInvoice} type="button" className="primary">
              Create Invoice + Auto Post
            </button>
          </div>
          {invoiceResult && (
            <div className="resultBox">
              <pre>{invoiceResult}</pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
