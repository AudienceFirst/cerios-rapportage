"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { MRRDataPoint } from "@/lib/types";

const GOAL_LINE = 1600;

const COLORS = {
  closedDeals: "#2563eb", // Solid blue
  openDeals: "#7dd3fc", // Lighter blue
};

interface MRRChartProps {
  data: MRRDataPoint[];
  loading?: boolean;
  error?: string | null;
}

export function MRRChart({ data, loading, error }: MRRChartProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[320px] rounded-lg bg-red-50 border border-red-100">
        <p className="text-red-700 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading from HubSpot…</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <p className="text-slate-500 text-sm">No MRR data for this period.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: d.month,
  }));

  const maxValue = Math.max(...data.map((d) => d.total), GOAL_LINE);
  const yDomainMax = Math.ceil(maxValue * 1.15 / 5000) * 5000; // Round up, ensure goal is visible

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="w-full h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 24, left: 16, bottom: 48 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            angle={-40}
            textAnchor="end"
            height={56}
          />
          <YAxis
            domain={[0, yDomainMax]}
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            width={58}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgb(0 0 0 / 0.08)",
              padding: "8px 12px",
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number) => [formatCurrency(value), ""]}
            labelFormatter={(label, payload) => {
              if (payload?.[0]) {
                const total = (payload[0].payload as MRRDataPoint).total;
                return `${label} · ${formatCurrency(total)}`;
              }
              return label;
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 12 }}
            iconType="square"
            iconSize={10}
            formatter={(value) => (
              <span className="text-xs font-medium text-slate-600">
                {value === "Closed Deals" ? "Closed" : "Open"}
              </span>
            )}
          />
          <ReferenceLine
            y={GOAL_LINE}
            stroke="#16a34a"
            strokeWidth={2}
            strokeDasharray="6 4"
            label={{
              value: `Goal: ${formatCurrency(GOAL_LINE)}`,
              position: "insideTopRight",
              fontSize: 11,
              fontWeight: 600,
              fill: "#16a34a",
            }}
          />
          <Bar
            dataKey="closedDeals"
            stackId="mrr"
            fill={COLORS.closedDeals}
            name="Closed Deals"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="openDeals"
            stackId="mrr"
            fill={COLORS.openDeals}
            name="Open Deals"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
