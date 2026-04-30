"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Activity, Award, CalendarDays, Key, Users, CheckCircle, XCircle, X } from "lucide-react";
import { toast } from "sonner";

export default function LeadershipDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState<"activity" | "attendance">("activity");
  const [events, setEvents] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [activeOtps, setActiveOtps] = useState<{ start: string | null, end: string | null }>({ start: null, end: null });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      
      const { data: profile } = await supabase.from("users").select("activity_points").eq("email", user.email.toLowerCase()).single();
      setTotalPoints(profile?.activity_points || 0);

      const [eventsRes, pointsRes] = await Promise.all([
        supabase.from("events").select("*, society:societies(abbreviation)").eq("organiser_id", user.id).order("created_at", { ascending: false }),
        supabase.from("activity_points").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      setEvents(eventsRes.data || []);
      setPoints(pointsRes.data || []);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  // Handle Event Selection for Drawer
  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    setIsDrawerOpen(true);
    fetchAttendeesAndOtps(event.id);
  };

  const fetchAttendeesAndOtps = async (eventId: string) => {
    // Fetch bookings/attendance
    const { data: bookingsData } = await supabase
      .from("event_bookings")
      .select(`
        id, attended_start, attended_end,
        user:users(id, name, email)
      `)
      .eq("event_id", eventId);
    
    setAttendees(bookingsData || []);

    // Fetch active OTPs
    const { data: otpsData } = await supabase
      .from("otps")
      .select("*")
      .eq("event_id", eventId)
      .eq("is_active", true);

    const startOtp = otpsData?.find(o => o.otp_type === "start")?.otp_code || null;
    const endOtp = otpsData?.find(o => o.otp_type === "end")?.otp_code || null;
    setActiveOtps({ start: startOtp, end: endOtp });
  };

  // Realtime subscription for attendance
  useEffect(() => {
    if (!selectedEvent?.id) return;

    const channel = supabase
      .channel(`attendance_${selectedEvent.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_bookings', filter: `event_id=eq.${selectedEvent.id}` },
        (payload) => {
          setAttendees((current) => 
            current.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedEvent, supabase]);

  const generateOtp = async (type: 'start' | 'end') => {
    setGeneratingOtp(true);
    try {
      const res = await fetch('/api/otp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEvent.id, otp_type: type, expires_in: 60 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActiveOtps(prev => ({ ...prev, [type]: data.otp.otp_code }));
      toast.success(`${type.toUpperCase()} OTP generated successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate OTP");
    } finally {
      setGeneratingOtp(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-5xl mx-auto relative">
      <div>
        <h1 className="text-4xl font-heading tracking-wide mb-2 text-[var(--text-primary)]">Leadership Dashboard</h1>
        <p className="text-[var(--text-muted)]">Track your conducted events and earned activity points.</p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 flex items-center gap-6 shadow-sm">
        <div className="w-16 h-16 bg-[var(--accent-primary)]/20 rounded-2xl flex items-center justify-center border border-[var(--accent-primary)]/30">
          <Award className="w-8 h-8 text-[var(--accent-primary)]" />
        </div>
        <div>
          <p className="text-[var(--text-secondary)] font-medium">Your Total Activity Points</p>
          <p className="text-5xl font-bold text-[var(--text-primary)]">{loading ? "—" : totalPoints}</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-[var(--border)] pb-4">
        <button onClick={() => setTab("activity")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "activity" ? "bg-[var(--accent-primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}>
          Personal Activity
        </button>
        <button onClick={() => setTab("attendance")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "attendance" ? "bg-[var(--accent-primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}>
          Attendance Points
        </button>
      </div>

      {tab === "activity" ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]"><CalendarDays className="w-5 h-5 text-[var(--accent-primary)]" /> Events You Conducted</h3>
          {events.length === 0 ? (
            <p className="text-[var(--text-muted)]">No events conducted yet.</p>
          ) : (
            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">Event</th>
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">Type</th>
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">Date</th>
                    <th className="text-center py-3 px-4 text-[var(--text-secondary)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {events.map(ev => (
                    <tr key={ev.id} onClick={() => ev.status === 'approved' ? handleEventClick(ev) : null} className={`hover:bg-[var(--bg-secondary)] transition-colors ${ev.status === 'approved' ? 'cursor-pointer' : ''}`}>
                      <td className="py-3 px-4 text-[var(--text-primary)] font-medium">
                        {ev.name || ev.title}
                        {ev.status === 'approved' && <span className="ml-2 text-[10px] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-full">Manage</span>}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{ev.event_type || "—"}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{(ev.date || ev.event_date) ? new Date(ev.date || ev.event_date).toLocaleDateString() : "TBD"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ev.status === "approved" ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" : ev.status === "rejected" ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20" : "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"}`}>
                          {ev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]"><Activity className="w-5 h-5 text-[var(--accent-primary)]" /> Points Breakdown</h3>
          {points.length === 0 ? (
            <p className="text-[var(--text-muted)]">No activity points record yet.</p>
          ) : (
            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">Event</th>
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">Organised By</th>
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">Date</th>
                    <th className="text-right py-3 px-4 text-[var(--text-secondary)]">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {points.map(p => (
                    <tr key={p.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{p.event_name || "—"}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{p.organised_by || "—"}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{p.date ? new Date(p.date).toLocaleDateString() : "—"}</td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--accent-primary)]">+{p.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Realtime Attendance & OTP Drawer */}
      {isDrawerOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsDrawerOpen(false)}>
          <div className="w-full max-w-md bg-[var(--bg-main)] h-full shadow-2xl border-l border-[var(--border)] flex flex-col animate-slide-left">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--bg-main)] z-10">
              <div>
                <h2 className="text-2xl font-heading text-[var(--text-primary)] truncate max-w-[300px]">{selectedEvent.name || selectedEvent.title}</h2>
                <p className="text-sm text-[var(--text-muted)]">Attendance & OTP Management</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-[var(--bg-secondary)] hover:bg-[var(--border)] rounded-full transition-colors">
                <X className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* OTP Generation Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2">
                  <Key className="w-5 h-5 text-[var(--accent-primary)]" /> Generate Passcodes
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Start OTP */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-center space-y-3">
                    <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Start OTP</p>
                    {activeOtps.start ? (
                      <div className="text-3xl font-mono font-bold tracking-widest text-[var(--success)]">{activeOtps.start}</div>
                    ) : (
                      <div className="text-lg text-[var(--text-muted)] font-mono">---</div>
                    )}
                    <button 
                      onClick={() => generateOtp('start')} 
                      disabled={generatingOtp}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      {activeOtps.start ? "Regenerate" : "Generate"}
                    </button>
                  </div>

                  {/* End OTP */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-center space-y-3">
                    <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">End OTP</p>
                    {activeOtps.end ? (
                      <div className="text-3xl font-mono font-bold tracking-widest text-[var(--success)]">{activeOtps.end}</div>
                    ) : (
                      <div className="text-lg text-[var(--text-muted)] font-mono">---</div>
                    )}
                    <button 
                      onClick={() => generateOtp('end')} 
                      disabled={generatingOtp}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      {activeOtps.end ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] text-center mt-2">OTPs are valid for 60 minutes. Generating a new one invalidates the old one.</p>
              </div>

              {/* Realtime Attendance List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="flex items-center gap-2"><Users className="w-5 h-5 text-[var(--accent-primary)]" /> Live Attendance</span>
                  <span className="text-sm font-normal bg-[var(--bg-secondary)] px-2 py-1 rounded-md">{attendees.length} Booked</span>
                </h3>

                {attendees.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-center py-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">No one has booked this event yet.</p>
                ) : (
                  <div className="space-y-3">
                    {attendees.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{a.user?.name || "Unknown User"}</p>
                          <p className="text-xs text-[var(--text-muted)]">{a.user?.email || "No email"}</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Start</span>
                            {a.attended_start ? <CheckCircle className="w-5 h-5 text-[var(--success)]" /> : <XCircle className="w-5 h-5 text-[var(--danger)]/50" />}
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase mb-1">End</span>
                            {a.attended_end ? <CheckCircle className="w-5 h-5 text-[var(--success)]" /> : <XCircle className="w-5 h-5 text-[var(--danger)]/50" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
