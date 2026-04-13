"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboard, type DashboardKPIs } from "@/lib/api";
import { fmtNumber } from "@/lib/format";
import {
  Building2,
  BarChart3,
  FileText,
  Users,
  Calendar,
  Search,
  Building,
  BarChart,
  UserSearch,
} from "lucide-react";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

const KPI_META = [
  { key: "enterprise_count" as const, label: "Active Enterprises", icon: Building2 },
  { key: "financial_count" as const, label: "Companies with Financials", icon: BarChart3 },
  { key: "filing_count" as const, label: "Filings Loaded", icon: FileText },
  { key: "admin_count" as const, label: "Administrators Indexed", icon: Users },
];

const QUICK_ACCESS = [
  { href: "/screener", title: "Screener", desc: "Filter by sector, revenue, EBITDA, FTE, region", icon: Search },
  { href: "/company", title: "Company", desc: "Search by name or CBE -- financials, structure, filings", icon: Building },
  { href: "/stats", title: "Stats", desc: "Sector benchmarks, margins, leverage, geography", icon: BarChart },
  { href: "/people", title: "People", desc: "Find administrators and shareholders by name", icon: UserSearch },
];

const PROVINCES = [
  { name: "Antwerpen", code: "1", color: "bg-indigo-600", count: "320K+" },
  { name: "Oost-Vlaanderen", code: "9", color: "bg-indigo-500", count: "240K+" },
  { name: "West-Vlaanderen", code: "8", color: "bg-indigo-500", count: "210K+" },
  { name: "Vlaams-Brabant", code: "3", color: "bg-indigo-400", count: "180K+" },
  { name: "Limburg", code: "35", color: "bg-indigo-300", count: "130K+" },
  { name: "Brussel", code: "1", color: "bg-indigo-700", count: "280K+" },
  { name: "Hainaut", code: "7", color: "bg-indigo-400", count: "170K+" },
  { name: "Liège", code: "4", color: "bg-indigo-400", count: "160K+" },
  { name: "Namur", code: "5", color: "bg-indigo-200", count: "70K+" },
  { name: "Luxembourg", code: "6", color: "bg-indigo-200", count: "45K+" },
  { name: "Brabant Wallon", code: "13", color: "bg-indigo-200", count: "60K+" },
];

/* Layout rows representing Belgium's geography roughly north-to-south */
const MAP_ROWS = [
  ["West-Vlaanderen", "Oost-Vlaanderen", "Antwerpen", "Limburg"],
  ["Brabant Wallon", "Brussel", "Vlaams-Brabant"],
  ["Hainaut", "Namur", "Liège", "Luxembourg"],
];

export default function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Spacer */}
      <div />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {KPI_META.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className="bg-white">
              <CardContent className="pt-5 pb-4 text-center">
                {loading ? (
                  <><Skeleton className="h-8 w-24 mx-auto mb-2" /><Skeleton className="h-3 w-20 mx-auto" /></>
                ) : (
                  <>
                    <Icon className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{kpis ? fmtNumber(kpis[kpi.key]) : "—"}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">{kpi.label}</div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
        <Card className="bg-white">
          <CardContent className="pt-5 pb-4 text-center">
            {loading ? (
              <><Skeleton className="h-8 w-24 mx-auto mb-2" /><Skeleton className="h-3 w-20 mx-auto" /></>
            ) : (
              <>
                <Calendar className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">{kpis?.snapshot_date || "—"}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">Snapshot Date</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 border-l-2 border-indigo-600 pl-2 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-indigo-600 h-full">
                  <CardContent className="pt-4 pb-4">
                    <h3 className="font-semibold text-slate-900">
                      <Icon className="w-4 h-4 inline mr-2" />
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Province Heatmap */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 border-l-2 border-indigo-600 pl-2 mb-4">Company Density by Province</h2>
        <div className="space-y-3">
          {MAP_ROWS.map((row, ri) => (
            <div key={ri} className={`grid gap-3 ${row.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
              {row.map((name) => {
                const prov = PROVINCES.find((p) => p.name === name)!;
                return (
                  <Link key={prov.name} href={`/screener?zipcode=${prov.code}`}>
                    <div className={`${prov.color} rounded-lg p-4 text-white hover:opacity-90 transition-opacity cursor-pointer`}>
                      <div className="font-semibold text-sm">{prov.name}</div>
                      <div className="text-xl font-bold mt-1">{prov.count}</div>
                      <div className="text-[10px] uppercase tracking-wide opacity-75 mt-0.5">companies</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
