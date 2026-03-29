import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  IndianRupee,
  Plus,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category } from "../backend";
import {
  useAllExpenses,
  useTotalAmount,
  useTotalPaidAmount,
} from "../hooks/useQueries";
import type { Expense } from "../hooks/useQueries";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  formatCurrency,
  formatDate,
  getMonthStartBigInt,
  getTodayBigInt,
  getWeekStartBigInt,
} from "../lib/expenseHelpers";

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  loading,
  delay,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  loading: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="shadow-card hover:shadow-card-hover transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                {title}
              </p>
              {loading ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {value}
                </p>
              )}
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getMonthlyData(expenses: Expense[]) {
  const map: Record<string, number> = {};
  for (const exp of expenses) {
    const d = new Date(Number(exp.date));
    const key = d.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    map[key] = (map[key] || 0) + exp.amount;
  }
  return Object.entries(map)
    .sort(([a], [b]) => {
      const [aM, aY] = a.split(" ");
      const [bM, bY] = b.split(" ");
      if (aY !== bY) return aY.localeCompare(bY);
      return MONTHS.indexOf(aM) - MONTHS.indexOf(bM);
    })
    .slice(-6)
    .map(([name, amount]) => ({ name, amount }));
}

export default function Dashboard({
  onAddExpense,
  onExport,
}: { onAddExpense: () => void; onExport: () => void }) {
  const { data: expenses = [], isLoading: expLoading } = useAllExpenses();
  const { data: totalAmount = 0, isLoading: totalLoading } = useTotalAmount();
  const { data: totalPaidAmount = 0, isLoading: paidLoading } =
    useTotalPaidAmount();

  const todayStart = useMemo(() => getTodayBigInt(), []);
  const monthStart = useMemo(() => getMonthStartBigInt(), []);
  const weekStart = useMemo(() => getWeekStartBigInt(), []);

  const todayTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= todayStart)
        .reduce((s, e) => s + e.amount, 0),
    [expenses, todayStart],
  );
  const monthTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= monthStart)
        .reduce((s, e) => s + e.amount, 0),
    [expenses, monthStart],
  );
  const weekTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= weekStart)
        .reduce((s, e) => s + e.amount, 0),
    [expenses, weekStart],
  );

  const totalRemaining = totalAmount - totalPaidAmount;

  const categoryData = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
    return Object.entries(map).map(([cat, amt]) => ({
      name: CATEGORY_LABELS[cat as Category],
      value: amt as number,
      color: CATEGORY_COLORS[cat as Category],
    }));
  }, [expenses]);

  const monthlyData = useMemo(() => getMonthlyData(expenses), [expenses]);
  const recentExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) => Number(b.date) - Number(a.date)).slice(0, 5),
    [expenses],
  );

  const isLoading = expLoading || totalLoading || paidLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here's your Zentrue expense overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            data-ocid="dashboard.secondary_button"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={onAddExpense}
            data-ocid="dashboard.primary_button"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Expense
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards - Row 1: Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Expenses"
          value={formatCurrency(totalAmount)}
          icon={IndianRupee}
          color="#2F6FE4"
          loading={isLoading}
          delay={0.05}
        />
        <KPICard
          title="Total Paid"
          value={formatCurrency(totalPaidAmount)}
          icon={CheckCircle}
          color="#10B981"
          loading={isLoading}
          delay={0.1}
        />
        <KPICard
          title="Total Remaining"
          value={formatCurrency(Math.max(0, totalRemaining))}
          icon={AlertCircle}
          color="#EF4444"
          loading={isLoading}
          delay={0.15}
        />
        <KPICard
          title="This Month"
          value={formatCurrency(monthTotal)}
          icon={Calendar}
          color="#8B5CF6"
          loading={isLoading}
          delay={0.2}
        />
        <KPICard
          title="This Week"
          value={formatCurrency(weekTotal)}
          icon={TrendingUp}
          color="#F59E0B"
          loading={isLoading}
          delay={0.25}
        />
        <KPICard
          title="Today's Spend"
          value={formatCurrency(todayTotal)}
          icon={Clock}
          color="#EC4899"
          loading={isLoading}
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
        >
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : categoryData.length === 0 ? (
                <div
                  className="h-56 flex items-center justify-center"
                  data-ocid="dashboard.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    No expenses yet
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), ""]}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #E5E7EB",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 12 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.4 }}
        >
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Monthly Spending Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : monthlyData.length === 0 ? (
                <div
                  className="h-56 flex items-center justify-center"
                  data-ocid="dashboard.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    No data to display
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={monthlyData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: number) => [
                        formatCurrency(val),
                        "Amount",
                      ]}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #E5E7EB",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#2F6FE4"
                      strokeWidth={2.5}
                      dot={{ fill: "#2F6FE4", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Expenses */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
      >
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {["s1", "s2", "s3"].map((k) => (
                  <Skeleton key={k} className="h-10 w-full" />
                ))}
              </div>
            ) : recentExpenses.length === 0 ? (
              <div
                className="py-10 text-center"
                data-ocid="dashboard.empty_state"
              >
                <p className="text-muted-foreground text-sm">
                  No expenses recorded yet.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={onAddExpense}
                >
                  Add your first expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left py-3 px-5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Date
                      </th>
                      <th className="text-left py-3 px-5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Description
                      </th>
                      <th className="text-left py-3 px-5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Category
                      </th>
                      <th className="text-right py-3 px-5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Amount
                      </th>
                      <th className="text-right py-3 px-5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                        Remaining
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExpenses.map((exp, i) => {
                      const paid = exp.paidAmount ?? 0;
                      const remaining = Math.max(0, exp.amount - paid);
                      const isFullyPaid = paid >= exp.amount;
                      return (
                        <tr
                          key={String(exp.id)}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          data-ocid={`dashboard.item.${i + 1}`}
                        >
                          <td className="py-3 px-5 text-muted-foreground">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-3 px-5 font-medium">
                            {exp.description}
                          </td>
                          <td className="py-3 px-5">
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium"
                              style={{
                                backgroundColor: `${CATEGORY_COLORS[exp.category]}18`,
                                color: CATEGORY_COLORS[exp.category],
                                borderColor: `${CATEGORY_COLORS[exp.category]}30`,
                              }}
                            >
                              {CATEGORY_LABELS[exp.category]}
                            </Badge>
                          </td>
                          <td className="py-3 px-5 text-right font-semibold">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="py-3 px-5 text-right font-semibold">
                            {isFullyPaid ? (
                              <span className="text-emerald-600 text-xs font-medium">
                                ✓ Paid
                              </span>
                            ) : (
                              <span className="text-red-500">
                                {formatCurrency(remaining)}
                              </span>
                            )}
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
    </div>
  );
}
