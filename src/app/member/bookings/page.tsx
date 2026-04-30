"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Calendar, MapPin, Clock, CheckCircle, XCircle } from "lucide-react";

export default function MyBookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch only my bookings with event details
    const { data } = await supabase
      .from("event_bookings")
      .select(`
        id, attended_start, attended_end,
        event:events(id, title, name, date, event_date, start_time, end_time, venue, status)
      `)
      .eq("user_id", user.id)
      .order("booked_at", { ascending: false });

    setBookings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const isLiveNow = (event: any) => {
    if (!event.date && !event.event_date) return false;
    if (!event.start_time || !event.end_time) return false;
    
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const eventDateStr = (event.event_date || event.date).split("T")[0];
    
    if (eventDateStr !== today) return false;
    
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
    return currentTime >= event.start_time && currentTime <= event.end_time;
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-heading tracking-wide mb-2 text-[var(--text-primary)]">My Bookings</h1>
        <p className="text-[var(--text-muted)]">Track your registered events and attendance status.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-48 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] animate-pulse" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-[var(--text-primary)]">No Bookings Found</h3>
          <p className="text-sm text-[var(--text-muted)] mt-2">You haven't booked any events yet. Check out Current Events to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => {
            const ev = booking.event;
            const title = ev.title || ev.name;
            const live = isLiveNow(ev);
            
            return (
              <div key={booking.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-[0_2px_8px_var(--shadow)] relative overflow-hidden">
                {live && (
                  <div className="absolute top-0 right-0 bg-[var(--success)] text-white px-3 py-1 text-xs font-bold rounded-bl-xl shadow-sm animate-pulse">
                    Live Now
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 pr-16">{title}</h3>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-[var(--accent-primary)]" /> {(ev.event_date || ev.date) ? new Date(ev.event_date || ev.date).toLocaleDateString() : "TBA"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-[var(--accent-primary)]" /> {ev.start_time ? `${ev.start_time} - ${ev.end_time}` : "TBA"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-[var(--accent-primary)]" /> {ev.venue || "TBA"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-[var(--bg-secondary)] px-4 py-2 rounded-lg border border-[var(--border)] shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Start</span>
                      {booking.attended_start ? <CheckCircle className="w-5 h-5 text-[var(--success)]" /> : <XCircle className="w-5 h-5 text-[var(--danger)]" />}
                    </div>
                    <div className="w-px h-8 bg-[var(--border)]" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">End</span>
                      {booking.attended_end ? <CheckCircle className="w-5 h-5 text-[var(--success)]" /> : <XCircle className="w-5 h-5 text-[var(--danger)]" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
