"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface AdminStats {
  total_enterprises: number;
  companies_with_financials: number;
  admin_records: number;
  financial_rows: number;
  total_users: number;
  admin_users: number;
  total_favourites: number;
  total_feedback: number;
  db_size: string;
}

interface UserRow {
  email: string;
  role: string;
  created_at: string;
  favourites_count: number;
  feedback_count: number;
}

interface FeedbackRow {
  id: number;
  type: string;
  page: string | null;
  description: string;
  user_email: string | null;
  created_at: string;
}

async function adminFetch<T>(path: string): Promise<T> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 403) throw new Error("Admin access required");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export default function AdminPanel() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminFetch<AdminStats>("/api/admin/stats"),
      adminFetch<UserRow[]>("/api/admin/users"),
      adminFetch<FeedbackRow[]>("/api/admin/feedback"),
    ])
      .then(([s, u, f]) => {
        setStats(s);
        setUsers(u);
        setFeedback(f);
      })
      .catch((err) => {
        setError(err.message);
        if (err.message === "Not authenticated") router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-1">Platform overview and user management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Enterprises", value: stats?.total_enterprises },
          { label: "With Financials", value: stats?.companies_with_financials },
          { label: "Users", value: stats?.total_users },
          { label: "Feedback", value: stats?.total_feedback },
          { label: "DB Size", value: stats?.db_size },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-white">
            <CardContent className="pt-5 pb-4 text-center">
              {loading ? (
                <Skeleton className="h-8 w-20 mx-auto" />
              ) : (
                <div className="text-2xl font-bold text-slate-900">
                  {typeof kpi.value === "number"
                    ? kpi.value.toLocaleString()
                    : kpi.value || "—"}
                </div>
              )}
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">
                {kpi.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 border-l-2 border-indigo-600 pl-2 mb-4">
          Users
        </h2>
        <Card className="bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Favourites</TableHead>
                <TableHead className="text-right">Feedback</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : users.map((u) => (
                    <TableRow key={u.email}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "admin" ? "default" : "secondary"}
                          className={
                            u.role === "admin"
                              ? "bg-indigo-100 text-indigo-700"
                              : ""
                          }
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{u.favourites_count}</TableCell>
                      <TableCell className="text-right">{u.feedback_count}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Feedback */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 border-l-2 border-indigo-600 pl-2 mb-4">
          Feedback ({feedback.length})
        </h2>
        <Card className="bg-white">
          {feedback.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No feedback yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Badge
                        variant={f.type === "bug" ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {f.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {f.description}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {f.page || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {f.user_email || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(f.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
