import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  BarChart2,
  Download,
  LayoutDashboard,
  Menu,
  Receipt,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Analytics from "./components/Analytics";
import Dashboard from "./components/Dashboard";
import ExpenseModal from "./components/ExpenseModal";
import Expenses from "./components/Expenses";
import {
  Category,
  PaymentMode,
  useAddExpense,
  useAllExpenses,
} from "./hooks/useQueries";

type Tab = "dashboard" | "expenses" | "analytics";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
];

const SAMPLE_EXPENSES = [
  {
    date: "2026-01-15",
    category: Category.salary,
    amount: 45000,
    description: "Designer Salary - January",
    paymentMode: PaymentMode.bank,
    paidAmount: 45000,
  },
  {
    date: "2026-01-18",
    category: Category.development,
    amount: 22000,
    description: "React Native Developer Tools License",
    paymentMode: PaymentMode.upi,
    paidAmount: 22000,
  },
  {
    date: "2026-02-03",
    category: Category.marketing,
    amount: 8500,
    description: "Google Ads Campaign - Q1",
    paymentMode: PaymentMode.bank,
    paidAmount: 5000,
  },
  {
    date: "2026-02-10",
    category: Category.vendorCost,
    amount: 12000,
    description: "AWS Cloud Hosting - Q1 2026",
    paymentMode: PaymentMode.upi,
    paidAmount: 12000,
  },
  {
    date: "2026-02-20",
    category: Category.development,
    amount: 15000,
    description: "Figma Pro Team Subscription",
    paymentMode: PaymentMode.upi,
    paidAmount: 0,
  },
  {
    date: "2026-03-01",
    category: Category.officeExpense,
    amount: 3500,
    description: "Office Supplies & Stationery",
    paymentMode: PaymentMode.cash,
    paidAmount: 3500,
  },
  {
    date: "2026-03-05",
    category: Category.marketing,
    amount: 6800,
    description: "LinkedIn Premium - Team Plan",
    paymentMode: PaymentMode.upi,
    paidAmount: 3400,
  },
  {
    date: "2026-03-10",
    category: Category.miscellaneous,
    amount: 2200,
    description: "Team Lunch - Product Planning",
    paymentMode: PaymentMode.cash,
    paidAmount: 2200,
  },
];

function useSeedData() {
  const { data: expenses, isLoading } = useAllExpenses();
  const addMutation = useAddExpense();
  const [seeded, setSeeded] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mutation functions are stable references
  useEffect(() => {
    if (isLoading || seeded || expenses === undefined) return;
    if (expenses.length === 0) {
      setSeeded(true);
      Promise.all(
        SAMPLE_EXPENSES.map((e) =>
          addMutation.mutateAsync({
            date: BigInt(new Date(e.date).getTime()),
            category: e.category,
            amount: e.amount,
            description: e.description,
            paymentMode: e.paymentMode,
            paidAmount: e.paidAmount,
            receiptUrl: null,
          }),
        ),
      ).catch(() => {
        /* silent */
      });
    }
  }, [expenses, isLoading, seeded]);
}

function exportToCSV(expenses: ReturnType<typeof useAllExpenses>["data"]) {
  if (!expenses || expenses.length === 0) {
    toast.error("No data to export");
    return;
  }
  const CATEGORY_LABELS: Record<string, string> = {
    development: "Development",
    marketing: "Marketing",
    vendorCost: "Vendor Cost",
    salary: "Salary",
    officeExpense: "Office Expense",
    miscellaneous: "Miscellaneous",
  };
  const PAYMENT_LABELS: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank: "Bank",
  };
  const header = [
    "Date",
    "Description",
    "Category",
    "Amount (INR)",
    "Paid (INR)",
    "Remaining (INR)",
    "Payment Mode",
  ];
  const rows = expenses.map((e) => {
    const paid = (e as any).paidAmount ?? 0;
    return [
      new Date(Number(e.date)).toLocaleDateString("en-IN"),
      `"${e.description.replace(/"/g, '""')}"`,
      CATEGORY_LABELS[e.category] || e.category,
      e.amount,
      paid,
      Math.max(0, e.amount - paid),
      PAYMENT_LABELS[e.paymentMode] || e.paymentMode,
    ];
  });
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zentrue-expenses-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exported successfully");
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: expenses } = useAllExpenses();

  useSeedData();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-xs">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                Z
              </div>
              <span className="font-bold text-base tracking-tight">
                Zentrue
              </span>
            </div>

            {/* Desktop Nav */}
            <nav
              className="hidden sm:flex items-center gap-1"
              data-ocid="nav.panel"
            >
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  data-ocid={`nav.${id}.tab`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                data-ocid="nav.toggle"
              >
                {mobileNavOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex"
                onClick={() => exportToCSV(expenses)}
                data-ocid="nav.secondary_button"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export
              </Button>
              <Button
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="hidden sm:flex"
                data-ocid="nav.primary_button"
              >
                + Add Expense
              </Button>
            </div>
          </div>

          {/* Mobile nav dropdown */}
          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden sm:hidden border-t border-border"
              >
                <div className="py-2 flex flex-col gap-1">
                  {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => {
                        setActiveTab(id);
                        setMobileNavOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                      data-ocid={`nav.${id}.tab`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                  <div className="px-1 pt-1 pb-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        exportToCSV(expenses);
                        setMobileNavOpen(false);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1.5" /> Export
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setAddModalOpen(true);
                        setMobileNavOpen(false);
                      }}
                    >
                      + Add Expense
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-[1100px] mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Dashboard
                  onAddExpense={() => setAddModalOpen(true)}
                  onExport={() => exportToCSV(expenses)}
                />
              </motion.div>
            )}
            {activeTab === "expenses" && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Expenses />
              </motion.div>
            )}
            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Analytics />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            &copy; {new Date().getFullYear()} Zentrue. All rights reserved.
          </span>
          <span>
            Built with &#10084;&#65039; using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              caffeine.ai
            </a>
          </span>
        </div>
      </footer>

      <ExpenseModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
