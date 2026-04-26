export type UserRole = "admin" | "accountant" | "auditor" | "staff";

export type TenantScope = {
  companyId: string;
  branchId?: string;
};

export type Money = {
  amount: string;
  currencyCode: "PHP";
};

export type AuthUser = {
  id: string;
  role: UserRole;
  companyId: string;
  branchId?: string;
};

export type Company = {
  id: string;
  name: string;
};

export type JournalLineInput = {
  accountId: string;
  description?: string;
  debit: string;
  credit: string;
};

export type PostJournalEntryRequest = {
  companyId: string;
  branchId?: string;
  referenceNo?: string;
  entryDate: string;
  lines: JournalLineInput[];
};

export type PostJournalEntryResponse = {
  success: boolean;
  entryId?: string;
  error?: string;
};

export type DashboardMetrics = {
  companyId: string;
  totalSalesToday: string;
  totalSalesMonth: string;
  totalSalesYear: string;
  totalExpensesToday: string;
  netProfitMonth: string;
  cashBalance: string;
  currencyCode: "PHP";
};
