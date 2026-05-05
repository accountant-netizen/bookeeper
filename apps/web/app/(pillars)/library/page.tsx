"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { useShell } from "../shell-context";

type Customer = {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  credit_terms_days?: number | null;
  is_active?: boolean;
};

type Account = {
  id: string;
  code: string;
  name: string;
  account_type?: string | null;
  is_active?: boolean;
};

type Supplier = {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  withholding_tax_rate?: number | string | null;
  payment_terms_days?: number | null;
  is_active?: boolean;
};

type ArCustomerResponse = {
  item?: {
    id: string;
    code: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    credit_terms_days?: number | null;
    is_active?: boolean;
  };
  error?: string;
};

type ApSupplierResponse = {
  item?: {
    id: string;
    code: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    withholding_tax_rate?: number | string | null;
    payment_terms_days?: number | null;
    is_active?: boolean;
  };
  error?: string;
};

type AccountResponse = {
  item?: {
    id: string;
    code: string;
    name: string;
    account_type?: string | null;
    is_active?: boolean;
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
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCreditTermsDays, setCustomerCreditTermsDays] = useState("30");
  const [customerIsActive, setCustomerIsActive] = useState(true);
  const [customerResult, setCustomerResult] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierWithholdingTaxRate, setSupplierWithholdingTaxRate] = useState("0");
  const [supplierPaymentTermsDays, setSupplierPaymentTermsDays] = useState("30");
  const [supplierIsActive, setSupplierIsActive] = useState(true);
  const [supplierResult, setSupplierResult] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("general");
  const [accountIsActive, setAccountIsActive] = useState(true);
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

    const creditTermsDaysValue = Number.parseInt(customerCreditTermsDays || "30", 10);
    if (Number.isNaN(creditTermsDaysValue) || creditTermsDaysValue < 0) {
      setCustomerResult("Credit terms days must be a non-negative number.");
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
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        creditTermsDays: creditTermsDaysValue,
        isActive: customerIsActive
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
    setCustomers((current) =>
      json.item
        ? [
            {
              id: json.item.id,
              code: json.item.code,
              name: json.item.name,
              email: json.item.email,
              phone: json.item.phone,
              credit_terms_days: json.item.credit_terms_days,
              is_active: json.item.is_active
            },
            ...current
          ]
        : current
    );
    setCustomerCode("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerCreditTermsDays("30");
    setCustomerIsActive(true);
  };

  const createSupplier = async () => {
    if (!companyId || !supplierCode || !supplierName) {
      setSupplierResult("Set company ID, supplier code, and supplier name.");
      return;
    }

    const withholdingTaxRateValue = Number.parseFloat(supplierWithholdingTaxRate || "0");
    const paymentTermsDaysValue = Number.parseInt(supplierPaymentTermsDays || "30", 10);

    if (Number.isNaN(withholdingTaxRateValue) || withholdingTaxRateValue < 0) {
      setSupplierResult("Withholding tax rate must be a non-negative number.");
      return;
    }

    if (Number.isNaN(paymentTermsDaysValue) || paymentTermsDaysValue < 0) {
      setSupplierResult("Payment terms days must be a non-negative number.");
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
        name: supplierName,
        email: supplierEmail,
        phone: supplierPhone,
        withholdingTaxRate: supplierWithholdingTaxRate,
        paymentTermsDays: paymentTermsDaysValue,
        isActive: supplierIsActive
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
    setSuppliers((current) =>
      json.item
        ? [
            {
              id: json.item.id,
              code: json.item.code,
              name: json.item.name,
              email: json.item.email,
              phone: json.item.phone,
              withholding_tax_rate: json.item.withholding_tax_rate,
              payment_terms_days: json.item.payment_terms_days,
              is_active: json.item.is_active
            },
            ...current
          ]
        : current
    );
    setSupplierCode("");
    setSupplierName("");
    setSupplierEmail("");
    setSupplierPhone("");
    setSupplierWithholdingTaxRate("0");
    setSupplierPaymentTermsDays("30");
    setSupplierIsActive(true);
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
        name: accountName,
        accountType,
        isActive: accountIsActive
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
    setAccountType("general");
    setAccountIsActive(true);
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
            <label>
              Customer Email
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="billing@acmetrading.com"
              />
            </label>
            <label>
              Customer Phone
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+63 912 345 6789"
              />
            </label>
            <label>
              Credit Terms Days
              <input
                type="number"
                min="0"
                step="1"
                value={customerCreditTermsDays}
                onChange={(e) => setCustomerCreditTermsDays(e.target.value)}
                placeholder="30"
              />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={customerIsActive}
                onChange={(e) => setCustomerIsActive(e.target.checked)}
              />
              Active Customer
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
            <label>
              Supplier Email
              <input
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                placeholder="billing@abcsupplies.com"
              />
            </label>
            <label>
              Supplier Phone
              <input
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="+63 912 345 6789"
              />
            </label>
            <label>
              Withholding Tax Rate
              <input
                type="number"
                min="0"
                step="0.0001"
                value={supplierWithholdingTaxRate}
                onChange={(e) => setSupplierWithholdingTaxRate(e.target.value)}
                placeholder="0.0000"
              />
            </label>
            <label>
              Payment Terms Days
              <input
                type="number"
                min="0"
                step="1"
                value={supplierPaymentTermsDays}
                onChange={(e) => setSupplierPaymentTermsDays(e.target.value)}
                placeholder="30"
              />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={supplierIsActive}
                onChange={(e) => setSupplierIsActive(e.target.checked)}
              />
              Active Supplier
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
            <label>
              Account Type
              <input
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                placeholder="general"
              />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={accountIsActive}
                onChange={(e) => setAccountIsActive(e.target.checked)}
              />
              Active Account
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
