import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Category,
  type CategorySummary,
  type Expense,
  PaymentMode,
} from "../backend";
import { useActor } from "./useActor";

export type { Expense };

export function useAllExpenses() {
  const { actor, isFetching } = useActor();
  return useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllExpenses();
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
      return actor.getTotalPaidAmount();
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
      const receiptUrlCandid: [] | [string] =
        data.receiptUrl != null ? [data.receiptUrl] : [];
      return actor.addExpense(
        data.date,
        data.category,
        data.amount,
        data.description,
        data.paymentMode,
        data.paidAmount,
        receiptUrlCandid,
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
    mutationFn: async (data: {
      id: bigint;
      partial: {
        date?: bigint | null;
        category?: Category | null;
        amount?: number | null;
        description?: string | null;
        paymentMode?: PaymentMode | null;
        paidAmount?: number | null;
        receiptUrl?: string | null;
      };
    }) => {
      if (!actor) throw new Error("Not connected");
      const p = data.partial;
      return actor.editExpense(data.id, {
        date: p.date != null ? p.date : undefined,
        description: p.description != null ? p.description : undefined,
        paymentMode: p.paymentMode != null ? p.paymentMode : undefined,
        category: p.category != null ? p.category : undefined,
        amount: p.amount != null ? p.amount : undefined,
        paidAmount: p.paidAmount != null ? p.paidAmount : undefined,
        receiptUrl: p.receiptUrl != null ? p.receiptUrl : undefined,
      });
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
