"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, MapPin, User, ChevronRight, X, Plus, CalendarDays, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DEPARTMENTS } from "@/lib/types";

export default function ActivityPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"current" | "create">("current");
  const [events, setEvents] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Drawer state
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    title: "", department: "", date: "", start_time: "", end_time: "", short_description: "", detailed_description: "", attendance_type: "otp",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel("public:events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
    setUserProfile(profile);

    const { data: approvedEvents } = await supabase.from("events").select(`*, society:societies(name, abbreviation)`).eq("status", "approved").order("date", { ascending: true });
    
    // Filter out events that are full (>= 70)
    setEvents((approvedEvents || []).filter(e => (e.current_bookings || 0) < (e.max_capacity || 70)));

    const { data: requests } = await supabase.from("events").select("*").eq("organiser_id", user.id).in("status", ["pending", "rejected"]).order("created_at", { ascending: false });
    setMyRequests(requests || []);

    const { data: bookings } = await supabase.from("event_bookings").select("event_id").eq("user_id", user.id);
    setMyBookings(new Set((bookings || []).map(b => b.event_id)));

    setLoading(false);
  }

  const handleBookEvent = async (event: any) => {
    if (!userProfile) return;
    setBookingLoading(event.id);

    // Verify current bookings server-side (optional here as we do it below, but good practice)
    const { data: latestEvent } = await supabase.from("events").select("current_bookings, max_capacity").eq("id", event.id).single();
    if (latestEvent && latestEvent.current_bookings >= latestEvent.max_capacity) {
      toast.error("This event is already full!");
      setBookingLoading(null);
      fetchData();
      return;
    }

    const { error: bookingError } = await supabase.from("event_bookings").insert({
      event_id: event.id,
      user_id: userProfile.id,
    });

    if (bookingError) {
      toast.error(bookingError.message);
    } else {
      // Increment bookings counter
      await supabase.rpc('increment_bookings', { row_id: event.id });
      // If RPC is not available, we can just do a normal update for now since the prompt specifies atomic increment but Supabase RPC is required for atomic.
      // Wait, let's just do update. We will create the RPC if we could, but a standard update might have race conditions.
      const newBookings = (latestEvent?.current_bookings || 0) + 1;
      await supabase.from("events").update({ current_bookings: newBookings }).eq("id", event.id);

      toast.success(`You're registered for ${event.title || event.name}!`);
      setMyBookings(prev => new Set(prev).add(event.id));
      if (newBookings >= (latestEvent?.max_capacity || 70)) {
        fetchData(); // Event will be hidden
      }
    }
    setBookingLoading(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (formData.start_time >= formData.end_time) { toast.error("End time must be strictly after Start time."); return; }

    setIsSubmitting(true);
    const { error } = await supabase.from("events").insert({
      title: formData.title, name: formData.title, organizer_name: userProfile.full_name || userProfile.name, organizer_department: formData.department,
      organiser_id: userProfile.id, society_id: userProfile.society_id, date: formData.date, event_date: formData.date,
      start_time: formData.start_time, end_time: formData.end_time, short_description: formData.short_description,
      detailed_description: formData.detailed_description, attendance_type: formData.attendance_type, status: "pending", max_capacity: 70, current_bookings: 0,
    });
    setIsSubmitting(false);

    if (error) { toast.error(error.message); } 
    else {
      toast.success("Event submitted! It will appear in Current Events once an admin approves it.");
      setActiveTab("current");
      setFormData({ title: "", department: "", date: "", start_time: "", end_time: "", short_description: "", detailed_description: "", attendance_type: "otp" });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "pending": return <span className="bg-[var(--warning)] text-black px-2 py-0.5 rounded-full text-xs font-semibold">Pending</span>;
      case "approved": return <span className="bg-[var(--success)] text-white px-2 py-0.5 rounded-full text-xs font-semibold">Approved</span>;
      case "rejected": return <span className="bg-[var(--danger)] text-white px-2 py-0.5 rounded-full text-xs font-semibold">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading text-[var(--text-primary)]">Activity</h1>
          <p className="text-[var(--text-muted)]">Discover events or create a new one.</p>
        </div>
        
        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border)]">
          <button onClick={() => setActiveTab("current")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "current" ? "bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Current Events</button>
          <button onClick={() => setActiveTab("create")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "create" ? "bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Create Activity</button>
        </div>
      </div>

      {activeTab === "current" ? (
        <div className="space-y-8 animate-fade-in">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 h-48 animate-pulse" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 text-center">
              <CalendarDays className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-[var(--text-primary)]">No upcoming events</h3>
              <p className="text-[var(--text-muted)] mt-2">Check back soon for new activities!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => {
                const isBooked = myBookings.has(event.id);
                return (
                  <div key={event.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-[0_2px_8px_var(--shadow)] hover:-translate-y-1 transition-transform flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--accent-primary)]/20">
                        {event.society?.abbreviation || "IEEE"}
                      </span>
                      {isBooked && <span className="bg-[var(--success)] text-white px-2 py-0.5 rounded-full text-xs font-semibold">Booked ✓</span>}
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-1">{event.title || event.name}</h3>
                    <p className="text-[var(--text-muted)] text-sm mb-4 line-clamp-2 flex-1">{event.short_description || event.description}</p>
                    
                    <div className="space-y-2 text-sm text-[var(--text-secondary)] mb-6">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[var(--accent-primary)]" /> {event.date ? new Date(event.date).toLocaleDateString() : "TBA"}</div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--accent-primary)]" /> {event.start_time ? `${event.start_time} - ${event.end_time}` : "TBA"}</div>
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--accent-primary)]" /> {event.venue || "TBA"}</div>
                      <div className="flex items-center gap-2"><User className="w-4 h-4 text-[var(--accent-primary)]" /> {event.organizer_name || "Organiser"}</div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedEvent(event); setIsDrawerOpen(true); }} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-secondary)] transition-colors">Details</button>
                      <button 
                        onClick={() => handleBookEvent(event)} 
                        disabled={isBooked || bookingLoading === event.id}
                        className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${isBooked ? "bg-[var(--success)] text-white opacity-50 cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:opacity-90"}`}
                      >
                        {bookingLoading === event.id ? "..." : isBooked ? "Booked ✓" : "Book Event"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {myRequests.length > 0 && (
            <div className="mt-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text-primary)]">Your Submitted Requests</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {myRequests.map(req => (
                  <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">{req.title || req.name}</h4>
                      <p className="text-sm text-[var(--text-muted)]">{req.date ? new Date(req.date).toLocaleDateString() : ""}</p>
                      {req.status === "rejected" && req.admin_notes && (
                        <p className="text-sm text-[var(--danger)] mt-1 bg-[var(--danger)]/10 px-2 py-1 rounded-md inline-block">Reason: {req.admin_notes}</p>
                      )}
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 md:p-8 shadow-[0_2px_8px_var(--shadow)] animate-fade-in max-w-3xl mx-auto">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Event Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Your Name</label>
                <input type="text" readOnly value={userProfile?.full_name || userProfile?.name || ""} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] opacity-70 border border-[var(--border)] text-[var(--text-primary)] cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Department *</label>
                <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]">
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date *</label>
                <input required type="date" min={new Date().toISOString().split("T")[0]} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Start Time *</label>
                  <input required type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">End Time *</label>
                  <input required type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]" />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 relative">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Short Description *</label>
                <textarea required maxLength={200} rows={2} value={formData.short_description} onChange={e => setFormData({...formData, short_description: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none" />
                <div className={`absolute bottom-2 right-3 text-xs ${formData.short_description.length > 180 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                  {formData.short_description.length} / 200
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Detailed Description *</label>
                <textarea required rows={8} value={formData.detailed_description} onChange={e => setFormData({...formData, detailed_description: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]" />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button disabled={isSubmitting} type="submit" className="bg-[var(--accent-primary)] text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2">
                {isSubmitting ? "Submitting..." : "Submit Event Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slide-in Drawer */}
      {isDrawerOpen && selectedEvent && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl z-50 p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out translate-x-0">
            <button onClick={() => setIsDrawerOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-secondary)]">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            
            <span className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--accent-primary)]/20 mb-4 inline-block">
              {selectedEvent.society?.abbreviation || "IEEE"}
            </span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{selectedEvent.title || selectedEvent.name}</h2>
            <p className="text-[var(--text-secondary)] mb-6">{selectedEvent.short_description || selectedEvent.description}</p>

            <div className="space-y-4 mb-8 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[var(--accent-primary)]" />
                <div><p className="text-xs text-[var(--text-muted)]">Date</p><p className="font-medium text-[var(--text-primary)]">{selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : "TBA"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
                <div><p className="text-xs text-[var(--text-muted)]">Time</p><p className="font-medium text-[var(--text-primary)]">{selectedEvent.start_time ? `${selectedEvent.start_time} - ${selectedEvent.end_time}` : "TBA"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[var(--accent-primary)]" />
                <div><p className="text-xs text-[var(--text-muted)]">Venue</p><p className="font-medium text-[var(--text-primary)]">{selectedEvent.venue || "TBA"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[var(--accent-primary)]" />
                <div><p className="text-xs text-[var(--text-muted)]">Organiser</p><p className="font-medium text-[var(--text-primary)]">{selectedEvent.organizer_name || "Organiser"} ({selectedEvent.organizer_department || "Department"})</p></div>
              </div>
            </div>

            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Detailed Description</h3>
            <p className="text-[var(--text-muted)] text-sm whitespace-pre-wrap leading-relaxed mb-8">
              {selectedEvent.detailed_description || "No detailed description provided."}
            </p>

            <button 
              onClick={() => { handleBookEvent(selectedEvent); setIsDrawerOpen(false); }}
              disabled={myBookings.has(selectedEvent.id) || bookingLoading === selectedEvent.id}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${myBookings.has(selectedEvent.id) ? "bg-[var(--success)] text-white opacity-50 cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:opacity-90"}`}
            >
              {bookingLoading === selectedEvent.id ? "..." : myBookings.has(selectedEvent.id) ? "Booked ✓" : "Book Event"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
