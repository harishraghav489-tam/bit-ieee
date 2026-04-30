"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { Upload, Bell, Calendar, MapPin, Clock, User, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function UpdatePage() {
  const [activeTab, setActiveTab] = useState("requests");

  return (
    <div className="space-y-6 animate-slide-up max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-heading tracking-wide mb-2 text-[var(--text-primary)]">Update Center</h1>
        <p className="text-[var(--text-muted)]">Manage event requests, bulk update activity points, and broadcast announcements.</p>
      </div>

      <div className="flex space-x-2 border-b border-[var(--border)] pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === "requests" ? "bg-[var(--accent-primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}
        >
          Event Requests
        </button>
        <button
          onClick={() => setActiveTab("points")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === "points" ? "bg-[var(--accent-primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}
        >
          Activity Points (Bulk)
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === "announcements" ? "bg-[var(--accent-primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}
        >
          Announcements
        </button>
      </div>

      <div className="mt-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-[0_4px_20px_var(--shadow)]">
        {activeTab === "requests" && <EventRequestsForm />}
        {activeTab === "points" && <ActivityPointsForm />}
        {activeTab === "announcements" && <AnnouncementForm />}
      </div>
    </div>
  );
}

function EventRequestsForm() {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [conflictOverride, setConflictOverride] = useState<{ id: string, venue: string } | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*, society:societies(abbreviation)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  }

  const checkVenueConflict = async (eventDate: string, startTime: string, endTime: string, venue: string, excludeId: string) => {
    if (!venue || !eventDate) return null;
    
    // Convert times to simple comparable numbers if possible or let DB do it. We'll fetch all approved on that date and venue.
    const { data: conflicts } = await supabase
      .from("events")
      .select("id, name, title, start_time, end_time")
      .eq("status", "approved")
      .eq("event_date", eventDate)
      .eq("venue", venue)
      .neq("id", excludeId);

    if (!conflicts || conflicts.length === 0) return null;

    // Check time overlap
    for (const c of conflicts) {
      if (c.start_time && c.end_time && startTime && endTime) {
        if ((startTime < c.end_time && endTime > c.start_time)) {
          return c; // Conflict found
        }
      } else {
        return c; // If times not specified, assume conflict on the same day/venue
      }
    }
    return null;
  };

  const handleApprove = async (event: any, force = false, newVenue = "") => {
    const finalVenue = newVenue || event.venue;

    if (!force) {
      const conflict = await checkVenueConflict(event.event_date || event.date, event.start_time, event.end_time, finalVenue, event.id);
      if (conflict) {
        toast.error(`⚠️ Venue Conflict: ${conflict.title || conflict.name} is booked at ${finalVenue} from ${conflict.start_time} to ${conflict.end_time}.`);
        setConflictOverride({ id: event.id, venue: finalVenue });
        return;
      }
    }

    const { error } = await supabase.from("events").update({
      status: "approved",
      venue: finalVenue,
      max_capacity: 70
    }).eq("id", event.id);

    if (error) { toast.error(error.message); return; }

    toast.success("Event approved successfully.");
    setConflictOverride(null);
    fetchEvents();
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error("Please provide a reason for rejection."); return; }

    const { error } = await supabase.from("events").update({
      status: "rejected",
      admin_notes: rejectReason
    }).eq("id", id);

    if (error) { toast.error(error.message); return; }

    toast.success("Event rejected.");
    setRejectingId(null);
    setRejectReason("");
    fetchEvents();
  };

  if (loading) return <div className="animate-pulse h-32 bg-[var(--bg-secondary)] rounded-xl" />;
  if (events.length === 0) return (
    <div className="text-center py-10">
      <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto mb-4 opacity-80" />
      <h3 className="text-xl font-medium text-[var(--text-primary)]">All Caught Up!</h3>
      <p className="text-[var(--text-muted)] mt-2">There are no pending event requests to review.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-medium text-[var(--text-primary)] mb-4">Pending Event Requests</h3>
      <div className="grid gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="bg-[var(--warning)]/10 text-[var(--warning)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--warning)]/20 inline-block mb-2">
                  {event.society?.abbreviation || "IEEE"}
                </span>
                <h4 className="text-xl font-bold text-[var(--text-primary)]">{event.title || event.name}</h4>
              </div>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {new Date(event.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[var(--accent-primary)]" /> {(event.event_date || event.date) ? new Date(event.event_date || event.date).toLocaleDateString() : "—"}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--accent-primary)]" /> {event.start_time ? `${event.start_time} - ${event.end_time}` : "—"}</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--accent-primary)]" /> {event.venue || "—"}</div>
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-[var(--accent-primary)]" /> {event.organizer_name || "—"} ({event.organizer_department || "—"})</div>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-6 whitespace-pre-wrap">{event.detailed_description || event.short_description || event.description}</p>

            {conflictOverride?.id === event.id ? (
              <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-4 rounded-lg mb-4 space-y-3">
                <p className="text-sm text-[var(--danger)] font-bold">Venue Conflict Detected!</p>
                <input 
                  type="text" 
                  value={conflictOverride!.venue} 
                  onChange={e => setConflictOverride({...conflictOverride!, venue: e.target.value})}
                  className="w-full px-3 py-2 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
                  placeholder="Change Venue"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(event, true, conflictOverride!.venue)} className="bg-[var(--danger)] text-white px-4 py-2 rounded-md text-sm font-bold hover:opacity-90">Force Approve</button>
                  <button onClick={() => setConflictOverride(null)} className="bg-[var(--bg-secondary)] text-[var(--text-primary)] px-4 py-2 rounded-md text-sm border border-[var(--border)]">Cancel</button>
                </div>
              </div>
            ) : rejectingId === event.id ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-lg mb-4 space-y-3">
                <textarea 
                  value={rejectReason} 
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (sent to organiser)..."
                  className="w-full px-3 py-2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm resize-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">Cancel</button>
                  <button onClick={() => handleReject(event.id)} className="px-4 py-2 bg-[var(--danger)] text-white rounded-md text-sm font-bold hover:opacity-90">Confirm Reject</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 border-t border-[var(--border)] pt-4">
                <button onClick={() => handleApprove(event)} className="flex-1 bg-[var(--success)] text-white py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex justify-center items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => setRejectingId(event.id)} className="flex-1 bg-[var(--bg-card)] text-[var(--danger)] border border-[var(--danger)]/30 py-2 rounded-lg font-bold text-sm hover:bg-[var(--danger)]/10 transition-colors flex justify-center items-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityPointsForm() {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      let updated = 0;
      let errors = 0;
      for (const row of rows) {
        const eventName = row["Event Name"] || row["event_name"] || "";
        const organiserEmail = row["Organiser Email"] || row["Email"] || row["email"] || "";
        const points = parseInt(row["Activity Points"] || row["Points"] || "0");
        const organisedBy = row["Organised By"] || row["organised_by"] || "";
        const date = row["Date"] || row["date"] || null;

        if (!eventName || !points) { errors++; continue; }

        const { data: event } = await supabase.from("events").select("id, name").ilike("name", eventName).limit(1).single();
        if (!event) { errors++; continue; }

        const { data: bookings } = await supabase.from("event_bookings").select("user_id").eq("event_id", event.id);
        if (!bookings || bookings.length === 0) { errors++; continue; }

        const dateStr = date ? new Date(date).toISOString() : new Date().toISOString();
        for (const booking of bookings) {
          await supabase.from("activity_points").insert({
            user_id: booking.user_id, event_id: event.id, points, event_name: event.name, organised_by: organisedBy, organiser_email: organiserEmail, date: dateStr,
          });
          updated++;
        }
      }

      toast.success(`Activity points allocated to ${updated} attendees across ${rows.length} events`);
      if (errors > 0) toast.warning(`${errors} rows had errors (event not found or no attendees)`);
      setFile(null);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally { setLoading(false); }
  }

  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const points = parseInt(fd.get("points") as string);

    const { data: user } = await supabase.from("users").select("id").eq("email", email).single();
    if (!user) { toast.error("User not found"); return; }

    const { error } = await supabase.from("activity_points").insert({
      user_id: user.id, points, event_name: fd.get("event_name"), organised_by: fd.get("organised_by"), date: new Date().toISOString(),
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Points allocated successfully");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]">
        <Upload className="w-5 h-5 text-[var(--accent-primary)]" /> Bulk Allocate Points
      </h3>
      <p className="text-sm text-[var(--text-muted)]">
        Upload an Excel file with columns: <span className="text-[var(--text-primary)]">Event Name, Organised By, Organiser Email, Date, Points</span>
      </p>

      <label className="block border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
        <Upload className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">{file ? file.name : "Click to upload"}</p>
        <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>

      <div className="flex justify-between items-center">
        <button onClick={() => setShowManual(!showManual)} className="text-sm text-[var(--accent-primary)] hover:underline">
          {showManual ? "Hide manual form" : "Single-person manual update"}
        </button>
        <button onClick={handleUpload} disabled={loading || !file} className="bg-[var(--accent-primary)] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? "Processing..." : "Process Upload"}
        </button>
      </div>

      {showManual && (
        <form onSubmit={handleManualSubmit} className="space-y-4 border-t border-[var(--border)] pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">User Email *</label>
              <input name="email" required className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]" placeholder="user@bitsathy.ac.in" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Points *</label>
              <input name="points" type="number" required className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]" placeholder="10" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Event Name</label>
              <input name="event_name" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]" placeholder="Event name" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Organised By</label>
              <input name="organised_by" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]" placeholder="Organiser name" />
            </div>
          </div>
          <button type="submit" className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] px-4 py-2 rounded-lg text-sm hover:bg-[var(--border)]">Allocate Points</button>
        </form>
      )}
    </div>
  );
}

function AnnouncementForm() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("notifications").insert({
        title: fd.get("title"), message: fd.get("content"), type: "announcement", sent_by: user?.id, recipient_role: "all",
      });

      if (error) throw error;
      toast.success("Announcement broadcasted to all users!");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-xl font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]"><Bell className="w-5 h-5 text-[var(--accent-primary)]" /> Global Announcement</h3>
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Title *</label>
        <input name="title" required className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]" placeholder="e.g. Upcoming Hackathon" />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Message *</label>
        <textarea name="content" required rows={4} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] resize-none" placeholder="Type your announcement..." />
      </div>
      <button type="submit" disabled={loading} className="bg-[var(--accent-primary)] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
        {loading ? "Broadcasting..." : "Send Announcement"}
      </button>
    </form>
  );
}
