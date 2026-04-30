"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Users, ChevronDown, ChevronUp, CalendarDays, Award, TrendingUp } from "lucide-react";
import type { Society, UserProfile, Event } from "@/lib/types";

interface SocietyDetail extends Society {
  users?: UserProfile[];
  events?: Event[];
}

export default function AdminSocietyPage() {
  const supabase = createClient();
  const [societies, setSocieties] = useState<SocietyDetail[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSocieties() {
      const { data } = await supabase.from("societies").select("*").order("name");
      
      if (data) {
        const enriched = await Promise.all(data.map(async (s) => {
          const { count } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("society_id", s.id);
          return { ...s, total_members: count || 0 };
        }));
        setSocieties(enriched);
      }
      setLoading(false);
    }
    fetchSocieties();
  }, []);

  async function toggleExpand(societyId: string) {
    if (expanded === societyId) { setExpanded(null); return; }

    const [usersRes, eventsRes] = await Promise.all([
      supabase.from("users").select("*").eq("society_id", societyId).in("role", ["leadership", "event_manager", "student_rep"]).order("activity_points", { ascending: false }),
      supabase.from("events").select("*").eq("society_id", societyId).order("created_at", { ascending: false }).limit(10),
    ]);

    setSocieties(prev => prev.map(s => s.id === societyId ? { ...s, users: usersRes.data || [], events: eventsRes.data || [] } : s));
    setExpanded(societyId);
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-10 w-48 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
      {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-up max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-heading tracking-wide mb-2 text-[var(--text-primary)]">Societies</h1>
        <p className="text-[var(--text-muted)]">Manage all {societies.length} IEEE societies and their leadership.</p>
      </div>

      <div className="grid gap-4">
        {societies.map(society => (
          <div key={society.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-[0_4px_20px_var(--shadow)]">
            <button
              onClick={() => toggleExpand(society.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-[var(--bg-secondary)] transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{society.abbreviation || society.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{society.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-[var(--text-muted)]">Members</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{society.total_members}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-[var(--text-muted)]">Dept</p>
                  <p className="text-lg font-bold text-[var(--accent-primary)]">{society.department || "—"}</p>
                </div>
                {expanded === society.id ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
              </div>
            </button>

            {expanded === society.id && (
              <div className="border-t border-[var(--border)] p-5 space-y-6 bg-[var(--bg-secondary)]">
                {/* Leadership */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Leadership ({society.users?.length || 0})
                  </h4>
                  {society.users && society.users.length > 0 ? (
                    <div className="overflow-x-auto bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                          <tr>
                            <th className="text-left py-2 px-4 text-[var(--text-secondary)] font-medium">Name</th>
                            <th className="text-left py-2 px-4 text-[var(--text-secondary)] font-medium">Role</th>
                            <th className="text-left py-2 px-4 text-[var(--text-secondary)] font-medium">Skills</th>
                            <th className="text-right py-2 px-4 text-[var(--text-secondary)] font-medium">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {society.users.map(u => (
                            <tr key={u.id} className="hover:bg-[var(--bg-secondary)]">
                              <td className="py-2.5 px-4 font-medium text-[var(--text-primary)]">{u.name || u.email}</td>
                              <td className="py-2.5 px-4 text-[var(--text-secondary)] capitalize">{u.role.replace("_", " ")}</td>
                              <td className="py-2.5 px-4 text-[var(--text-secondary)]">{u.primary_skills || "—"}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-[var(--accent-primary)]">{u.activity_points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[var(--text-muted)] text-sm">No leadership assigned yet.</p>
                  )}
                </div>

                {/* Events */}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> Recent Events ({society.events?.length || 0})
                  </h4>
                  {society.events && society.events.length > 0 ? (
                    <div className="grid gap-2">
                      {society.events.map(e => (
                        <div key={e.id} className="flex items-center justify-between py-3 px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-sm">{e.name}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">{e.event_type} • {e.date ? new Date(e.date).toLocaleDateString() : "TBD"}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                            e.status === "approved" ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" :
                            e.status === "rejected" ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20" :
                            "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"
                          }`}>
                            {e.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--text-muted)] text-sm">No events recorded yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
