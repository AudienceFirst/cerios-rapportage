"use client";

import { useState, useEffect, useCallback } from "react";
import { MRRChart } from "@/components/MRRChart";
import { BusinessUnitSelector } from "@/components/BusinessUnitSelector";
import type { BusinessUnit } from "@/lib/types";
import type { MRRDataPoint } from "@/lib/types";

export default function Home() {
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit>("testmonitor");
  const [data, setData] = useState<MRRDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMRR = useCallback(async (unit: BusinessUnit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mrr?businessUnit=${encodeURIComponent(unit)}`
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch MRR data");
      }

      setData(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMRR(businessUnit);
  }, [businessUnit, fetchMRR]);

  const latestMonth = data.length > 0 ? data[data.length - 1] : null;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-5 py-8 md:px-8 md:py-10">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Monthly Recurring Revenue
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            MRR by Business Unit · HubSpot CRM
          </p>
        </header>

        {/* Business Unit + Summary */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <BusinessUnitSelector
            value={businessUnit}
            onChange={setBusinessUnit}
            disabled={loading}
          />
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-slate-500">Latest</p>
              <p className="font-semibold text-slate-900">
                {latestMonth ? formatCurrency(latestMonth.total) : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Goal</p>
              <p className="font-semibold text-emerald-600">$1,600</p>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="bg-white rounded-lg border border-slate-200 px-5 py-6 md:px-6">
          <MRRChart data={data} loading={loading} error={error} />
        </section>

        <footer className="mt-8 text-center text-[11px] text-slate-400">
          HubSpot dashboard · Refreshes on load
        </footer>
      </div>
    </main>
  );
}
