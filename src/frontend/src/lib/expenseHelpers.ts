import { Category, PaymentMode } from "../backend";

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.development]: "Development",
  [Category.marketing]: "Marketing",
  [Category.vendorCost]: "Vendor Cost",
  [Category.salary]: "Salary",
  [Category.officeExpense]: "Office Expense",
  [Category.miscellaneous]: "Miscellaneous",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  [PaymentMode.cash]: "Cash",
  [PaymentMode.upi]: "UPI",
  [PaymentMode.bank]: "Bank",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.development]: "#2F6FE4",
  [Category.marketing]: "#10B981",
  [Category.vendorCost]: "#F59E0B",
  [Category.salary]: "#8B5CF6",
  [Category.officeExpense]: "#EF4444",
  [Category.miscellaneous]: "#6B7280",
};

export const PAYMENT_MODE_COLORS: Record<PaymentMode, string> = {
  [PaymentMode.cash]: "#10B981",
  [PaymentMode.upi]: "#2F6FE4",
  [PaymentMode.bank]: "#8B5CF6",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateBigint: bigint): string {
  return new Date(Number(dateBigint)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dateStrToBigInt(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime());
}

export function bigIntToDateStr(dateBigint: bigint): string {
  return new Date(Number(dateBigint)).toISOString().split("T")[0];
}

export function getTodayBigInt(): bigint {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return BigInt(now.getTime());
}

export function getMonthStartBigInt(): bigint {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return BigInt(now.getTime());
}

export function getWeekStartBigInt(): bigint {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  now.setDate(diff);
  now.setHours(0, 0, 0, 0);
  return BigInt(now.getTime());
}

export const ALL_CATEGORIES = Object.values(Category);
export const ALL_PAYMENT_MODES = Object.values(PaymentMode);
