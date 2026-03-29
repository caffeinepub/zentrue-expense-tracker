import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export type Date_ = bigint;
export interface CategorySummary {
    totalAmount: Amount;
    category: Category;
}
export type ExpenseId = bigint;
export interface ExpensePartial {
    date?: Date_;
    description?: string;
    paymentMode?: PaymentMode;
    category?: Category;
    amount?: Amount;
    paidAmount?: Amount;
    receiptUrl?: string;
}
export interface Expense {
    id: ExpenseId;
    date: Date_;
    createdAt: Time;
    description: string;
    paymentMode: PaymentMode;
    category: Category;
    amount: Amount;
    paidAmount: Amount;
    receiptUrl: string | null;
}
export type Amount = number;
export interface UserProfile {
    name: string;
}
export enum Category {
    salary = "salary",
    miscellaneous = "miscellaneous",
    marketing = "marketing",
    development = "development",
    officeExpense = "officeExpense",
    vendorCost = "vendorCost"
}
export enum PaymentMode {
    upi = "upi",
    bank = "bank",
    cash = "cash"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addExpense(date: Date_, category: Category, amount: Amount, description: string, paymentMode: PaymentMode, paidAmount: Amount, receiptUrl: string | null): Promise<ExpenseId>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteExpense(id: ExpenseId): Promise<void>;
    editExpense(id: ExpenseId, partial: ExpensePartial): Promise<Expense>;
    getAllExpenses(): Promise<Array<Expense>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCategorySummary(): Promise<Array<CategorySummary>>;
    getExpense(id: ExpenseId): Promise<Expense>;
    getExpensesByCategory(category: Category): Promise<Array<Expense>>;
    getExpensesByDateRange(startDate: Date_, endDate: Date_): Promise<Array<Expense>>;
    getExpensesByPaymentMode(paymentMode: PaymentMode): Promise<Array<Expense>>;
    getTotalAmount(): Promise<Amount>;
    getTotalPaidAmount(): Promise<Amount>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
