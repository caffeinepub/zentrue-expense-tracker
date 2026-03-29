import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Filter,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Category,
  PaymentMode,
  useAllExpenses,
  useDeleteExpense,
} from "../hooks/useQueries";
import type { Expense } from "../hooks/useQueries";
import {
  ALL_CATEGORIES,
  ALL_PAYMENT_MODES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PAYMENT_MODE_COLORS,
  PAYMENT_MODE_LABELS,
  formatCurrency,
  formatDate,
} from "../lib/expenseHelpers";
import ExpenseModal from "./ExpenseModal";

export default function Expenses() {
  const { data: expenses = [], isLoading } = useAllExpenses();
  const deleteMutation = useDeleteExpense();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (
          search &&
          !e.description.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        if (filterCategory !== "all" && e.category !== filterCategory)
          return false;
        if (filterPayment !== "all" && e.paymentMode !== filterPayment)
          return false;
        if (filterDateFrom) {
          const from = BigInt(new Date(filterDateFrom).getTime());
          if (e.date < from) return false;
        }
        if (filterDateTo) {
          const to = BigInt(new Date(filterDateTo).getTime() + 86400000);
          if (e.date > to) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.date) - Number(a.date));
  }, [
    expenses,
    search,
    filterCategory,
    filterPayment,
    filterDateFrom,
    filterDateTo,
  ]);

  function handleEdit(exp: Expense) {
    setEditingExpense(exp);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingExpense(null);
    setModalOpen(true);
  }

  async function handleDelete(id: bigint) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setDeleteTarget(null);
    }
  }

  const hasFilters =
    search ||
    filterCategory !== "all" ||
    filterPayment !== "all" ||
    filterDateFrom ||
    filterDateTo;

  return (
    <div className="space-y-4 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} of {expenses.length} entries
          </p>
        </div>
        <Button onClick={handleAdd} data-ocid="expenses.primary_button">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Expense
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                  data-ocid="expenses.search_input"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 h-9" data-ocid="expenses.select">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-36 h-9" data-ocid="expenses.select">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {ALL_PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {PAYMENT_MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-36 h-9"
                data-ocid="expenses.input"
              />
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-36 h-9"
                data-ocid="expenses.input"
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterCategory("all");
                    setFilterPayment("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                  className="h-9 text-muted-foreground hover:text-foreground"
                  data-ocid="expenses.secondary_button"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                  <Skeleton key={k} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="py-16 text-center"
                data-ocid="expenses.empty_state"
              >
                <p className="text-muted-foreground text-sm">
                  No expenses found.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={handleAdd}
                >
                  Add your first expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Category
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Amount
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Paid
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Remaining
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Mode
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((exp, i) => {
                      const paid = exp.paidAmount ?? 0;
                      const remaining = Math.max(0, exp.amount - paid);
                      const isFullyPaid = paid >= exp.amount;
                      const isPartial = paid > 0 && paid < exp.amount;

                      return (
                        <tr
                          key={String(exp.id)}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          data-ocid={`expenses.item.${i + 1}`}
                        >
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-3 px-4 font-medium max-w-xs truncate">
                            {exp.description}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: `${CATEGORY_COLORS[exp.category]}18`,
                                color: CATEGORY_COLORS[exp.category],
                              }}
                            >
                              {CATEGORY_LABELS[exp.category]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                            <span
                              className={
                                isFullyPaid
                                  ? "text-emerald-600"
                                  : isPartial
                                    ? "text-amber-500"
                                    : "text-muted-foreground"
                              }
                            >
                              {formatCurrency(paid)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                            {isFullyPaid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Paid
                              </span>
                            ) : (
                              <span className="text-red-500">
                                {formatCurrency(remaining)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                color: PAYMENT_MODE_COLORS[exp.paymentMode],
                              }}
                            >
                              {PAYMENT_MODE_LABELS[exp.paymentMode]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {exp.receiptUrl && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                  onClick={() =>
                                    window.open(exp.receiptUrl!, "_blank")
                                  }
                                  title="View receipt"
                                  data-ocid={`expenses.secondary_button.${i + 1}`}
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => handleEdit(exp)}
                                data-ocid={`expenses.edit_button.${i + 1}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTarget(exp.id)}
                                data-ocid={`expenses.delete_button.${i + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ExpenseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="expenses.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The expense will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="expenses.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget !== null && handleDelete(deleteTarget)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="expenses.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
