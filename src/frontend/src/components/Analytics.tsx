import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
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
import type { Category, PaymentMode } from "../backend";
import { useAllExpenses, useCategorySummary } from "../hooks/useQueries";
import type { Expense } from "../hooks/useQueries";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PAYMENT_MODE_COLORS,
  PAYMENT_MODE_LABELS,
  formatCurrency,
} from "../lib/expenseHelpers";

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
    .map(([name, amount]) => ({ name, amount }));
}

export default function Analytics() {
  const { data: expenses = [], isLoading: expLoading } = useAllExpenses();
  const { data: categorySummary = [], isLoading: catLoading } =
    useCategorySummary();

  const isLoading = expLoading || catLoading;

  const categoryBarData = useMemo(() => {
    return categorySummary
      .map((s) => ({
        name: CATEGORY_LABELS[s.category],
        amount: s.totalAmount,
        color: CATEGORY_COLORS[s.category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categorySummary]);

  const monthlyData = useMemo(() => getMonthlyData(expenses), [expenses]);

  const paymentData = useMemo(() => {
    const map: Partial<Record<PaymentMode, number>> = {};
    for (const e of expenses) {
      map[e.paymentMode] = (map[e.paymentMode] || 0) + e.amount;
    }
    return Object.entries(map).map(([mode, amt]) => ({
      name: PAYMENT_MODE_LABELS[mode as PaymentMode],
      value: amt as number,
      color: PAYMENT_MODE_COLORS[mode as PaymentMode],
    }));
  }, [expenses]);

  const topCategory = categoryBarData[0];
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  // Find category key from label for color lookup
  const topCategoryColor = topCategory
    ? CATEGORY_COLORS[
        Object.keys(CATEGORY_COLORS).find(
          (k) => CATEGORY_LABELS[k as Category] === topCategory.name,
        ) as Category
      ]
    : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Visual breakdown of your Zentrue expenses
        </p>
      </motion.div>

      {/* Insight cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Entries
            </p>
            <p className="text-2xl font-bold mt-0.5">{expenses.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Spent
            </p>
            <p className="text-2xl font-bold mt-0.5">
              {formatCurrency(totalAll)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Top Category
            </p>
            <p
              className="text-2xl font-bold mt-0.5"
              style={{ color: topCategoryColor }}
            >
              {topCategory ? topCategory.name : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Avg per Entry
            </p>
            <p className="text-2xl font-bold mt-0.5">
              {expenses.length > 0
                ? formatCurrency(Math.round(totalAll / expenses.length))
                : "—"}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : categoryBarData.length === 0 ? (
              <div
                className="h-64 flex items-center justify-center"
                data-ocid="analytics.empty_state"
              >
                <p className="text-muted-foreground text-sm">
                  No data to display
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={categoryBarData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#F3F4F6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
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
                    formatter={(val: number) => [formatCurrency(val), "Amount"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                    }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {categoryBarData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Trend + Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Monthly Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : monthlyData.length === 0 ? (
                <div
                  className="h-52 flex items-center justify-center"
                  data-ocid="analytics.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    No data to display
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={208}>
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Payment Mode Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : paymentData.length === 0 ? (
                <div
                  className="h-52 flex items-center justify-center"
                  data-ocid="analytics.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    No data to display
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={208}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentData.map((entry) => (
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
                      formatter={(v) => (
                        <span style={{ fontSize: 12 }}>{v}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
