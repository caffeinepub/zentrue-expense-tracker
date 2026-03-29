import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HttpAgent } from "@icp-sdk/core/agent";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadConfig } from "../config";
import {
  Category,
  PaymentMode,
  useAddExpense,
  useEditExpense,
} from "../hooks/useQueries";
import type { Expense } from "../hooks/useQueries";
import {
  ALL_CATEGORIES,
  ALL_PAYMENT_MODES,
  CATEGORY_LABELS,
  PAYMENT_MODE_LABELS,
  bigIntToDateStr,
  dateStrToBigInt,
} from "../lib/expenseHelpers";
import { StorageClient } from "../utils/StorageClient";

interface ExpenseModalProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
}

async function uploadReceipt(file: File): Promise<string> {
  const config = await loadConfig();
  const agent = new HttpAgent({ host: config.backend_host });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch(() => {});
  }
  const storageClient = new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { hash } = await storageClient.putFile(bytes);
  return storageClient.getDirectURL(hash);
}

// Extract string from Candid optional [] | [string]
function fromCandidOpt(opt: [] | [string] | undefined | null): string | null {
  if (!opt || opt.length === 0) return null;
  return opt[0];
}

export default function ExpenseModal({
  open,
  onClose,
  expense,
}: ExpenseModalProps) {
  const isEdit = !!expense;
  const addMutation = useAddExpense();
  const editMutation = useEditExpense();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<Category>(Category.development);
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.upi);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetting form on open/expense change is intentional
  useEffect(() => {
    if (expense) {
      setDate(bigIntToDateStr(expense.date));
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setPaidAmount(String(expense.paidAmount ?? 0));
      setDescription(expense.description);
      setPaymentMode(expense.paymentMode);
      setExistingReceiptUrl(fromCandidOpt(expense.receiptUrl));
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setCategory(Category.development);
      setAmount("");
      setPaidAmount("0");
      setDescription("");
      setPaymentMode(PaymentMode.upi);
      setExistingReceiptUrl(null);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
  }, [expense, open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setReceiptFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    } else {
      setReceiptPreview(null);
    }
  }

  function clearReceipt() {
    setReceiptFile(null);
    setReceiptPreview(null);
    setExistingReceiptUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isPending = addMutation.isPending || editMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number.parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const paidNum = Number.parseFloat(paidAmount) || 0;
    if (paidNum < 0) {
      toast.error("Paid amount cannot be negative");
      return;
    }
    if (paidNum > amountNum) {
      toast.error("Paid amount cannot exceed total amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    // Upload receipt if new file selected
    let finalReceiptUrl: string | null = existingReceiptUrl;
    if (receiptFile) {
      try {
        finalReceiptUrl = await uploadReceipt(receiptFile);
      } catch {
        toast.error("Failed to upload receipt. Please try again.");
        return;
      }
    }

    try {
      if (isEdit && expense) {
        await editMutation.mutateAsync({
          id: expense.id,
          partial: {
            date: dateStrToBigInt(date),
            category,
            amount: amountNum,
            description: description.trim(),
            paymentMode,
            paidAmount: paidNum,
            receiptUrl: finalReceiptUrl,
          },
        });
        toast.success("Expense updated successfully");
      } else {
        await addMutation.mutateAsync({
          date: dateStrToBigInt(date),
          category,
          amount: amountNum,
          description: description.trim(),
          paymentMode,
          paidAmount: paidNum,
          receiptUrl: finalReceiptUrl,
        });
        toast.success("Expense added successfully");
      }
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const thumbnailUrl = receiptPreview ?? existingReceiptUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" data-ocid="expense.modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                data-ocid="expense.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (&#8377;)</Label>
              <Input
                id="exp-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
                data-ocid="expense.input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-paid">Paid Amount (&#8377;)</Label>
              <Input
                id="exp-paid"
                type="number"
                placeholder="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                min="0"
                step="0.01"
                data-ocid="expense.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remaining (&#8377;)</Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm font-medium">
                {amount
                  ? Math.max(
                      0,
                      Number.parseFloat(amount) -
                        (Number.parseFloat(paidAmount) || 0),
                    ).toFixed(2)
                  : "0.00"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
            >
              <SelectTrigger data-ocid="expense.select">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select
              value={paymentMode}
              onValueChange={(v) => setPaymentMode(v as PaymentMode)}
            >
              <SelectTrigger data-ocid="expense.select">
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                {ALL_PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Description</Label>
            <Textarea
              id="exp-desc"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              required
              data-ocid="expense.textarea"
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-1.5">
            <Label>Receipt / Screenshot (optional)</Label>
            {thumbnailUrl ? (
              <div className="relative w-24 h-24 rounded-lg border border-border overflow-hidden group">
                <img
                  src={thumbnailUrl}
                  alt="Receipt preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearReceipt}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Remove receipt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded text-foreground font-medium">
                    Replace
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary text-sm"
                data-ocid="expense.upload_button"
              >
                <ImagePlus className="w-4 h-4" />
                Upload receipt or screenshot
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="expense.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-ocid="expense.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
