import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Expense as BaseExpense,
  type ExpensePartial as BaseExpensePartial,
  Category,
  type CategorySummary,
  PaymentMode,
} from "../backend";
import { useActor } from "./useActor";

// Extended types to include new fields from updated backend
export interface Expense extends BaseExpense {
  paidAmount: number;
  receiptUrl: string | null;
}

export interface ExpensePartial extends BaseExpensePartial {
  paidAmount?: number;
  receiptUrl?: string | null;
}

export function useAllExpenses() {
  const { actor, isFetching } = useActor();
  return useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!actor) return [];
      const data = await actor.getAllExpenses();
      return data as unknown as Expense[];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCategorySummary() {
  const { actor, isFetching } = useActor();
  return useQuery<CategorySummary[]>({
    queryKey: ["categorySummary"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCategorySummary();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTotalAmount() {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["totalAmount"],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getTotalAmount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTotalPaidAmount() {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["totalPaidAmount"],
    queryFn: async () => {
      if (!actor) return 0;
      const a = actor as any;
      if (typeof a.getTotalPaidAmount === "function") {
        return a.getTotalPaidAmount();
      }
      return 0;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      date: bigint;
      category: Category;
      amount: number;
      description: string;
      paymentMode: PaymentMode;
      paidAmount: number;
      receiptUrl: string | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      const a = actor as any;
      return a.addExpense(
        data.date,
        data.category,
        data.amount,
        data.description,
        data.paymentMode,
        data.paidAmount,
        data.receiptUrl,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["categorySummary"] });
      queryClient.invalidateQueries({ queryKey: ["totalAmount"] });
      queryClient.invalidateQueries({ queryKey: ["totalPaidAmount"] });
    },
  });
}

export function useEditExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: bigint; partial: ExpensePartial }) => {
      if (!actor) throw new Error("Not connected");
      return actor.editExpense(data.id, data.partial as BaseExpensePartial);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["categorySummary"] });
      queryClient.invalidateQueries({ queryKey: ["totalAmount"] });
      queryClient.invalidateQueries({ queryKey: ["totalPaidAmount"] });
    },
  });
}

export function useDeleteExpense() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["categorySummary"] });
      queryClient.invalidateQueries({ queryKey: ["totalAmount"] });
      queryClient.invalidateQueries({ queryKey: ["totalPaidAmount"] });
    },
  });
}

export { Category, PaymentMode };
export type { CategorySummary };
