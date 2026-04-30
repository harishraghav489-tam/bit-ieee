"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { KeyRound, ClipboardList, FileCheck, Upload, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function LeadershipTaskPage() {
  const [activeTab, setActiveTab] = useState("otp");

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-4xl font-heading tracking-wide mb-2">Task Management</h1>
        <p className="text-gray-400">Generate OTPs, manage task sessions, verify scores, and attend events.</p>
      </div>

      <div className="flex space-x-2 border-b border-white/10 pb-4 overflow-x-auto">
        {[
          { id: "otp", icon: <KeyRound className="w-4 h-4" />, label: "OTP Manager" },
          { id: "manager", icon: <ClipboardList className="w-4 h-4" />, label: "Task Manager" },
          { id: "verify", icon: <FileCheck className="w-4 h-4" />, label: "My Task" },
          { id: "attend", icon: <UserCheck className="w-4 h-4" />, label: "Task Attend" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? "bg-[#00629B] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 glass-card p-6 max-w-3xl">
        {activeTab === "otp" && <OTPManager />}
        {activeTab === "manager" && <TaskManager />}
        {activeTab === "verify" && <TaskVerify />}
        {activeTab === "attend" && <TaskAttend />}
      </div>
    </div>
  );
}

function OTPManager() {
  const supabase = createClient();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("events").select("id, name").eq("organiser_id", user.id).eq("status", "approved");
      setEvents(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  async function generateOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const eventId = fd.get("eventId") as string;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const { data: { user } } = await supabase.auth.getUser();
    // Upsert task with OTP
    const { data: existing } = await supabase.from("tasks").select("id").eq("event_id", eventId).single();
    
    if (existing) {
      await supabase.from("tasks").update({ otp, otp_expires_at: new Date(Date.now() + 3600000).toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("tasks").insert({
        event_id: eventId, type: "mcq", otp,
        otp_expires_at: new Date(Date.now() + 3600000).toISOString(),
        created_by: user?.id,
      });
    }
    setGeneratedOtp(otp);
    toast.success("OTP Generated!");
  }

  if (loading) return <p className="text-gray-400">Loading events...</p>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-medium">Generate Task OTP</h3>
      {events.length === 0 ? (
        <p className="text-amber-400 bg-amber-400/10 p-4 rounded-lg border border-amber-400/20">No approved events. Request one first.</p>
      ) : (
        <form onSubmit={generateOtp} className="space-y-4">
          <select name="eventId" required className="input-field">
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <button type="submit" className="btn-primary">Generate OTP</button>
        </form>
      )}
      {generatedOtp && (
        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <p className="text-sm text-green-400 mb-2">OTP Generated!</p>
          <p className="text-4xl font-mono tracking-[0.5em] text-white">{generatedOtp}</p>
          <p className="text-xs text-gray-500 mt-4">Valid for 1 hour. Share with attendees.</p>
        </div>
      )}
    </div>
  );
}

function TaskManager() {
  const supabase = createClient();
  const [otpValid, setOtpValid] = useState(false);
  const [otp, setOtp] = useState("");

  async function validateOtp(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.from("tasks").select("id").eq("otp", otp).single();
    if (data) { setOtpValid(true); toast.success("OTP validated!"); }
    else toast.error("Invalid OTP");
  }

  if (!otpValid) {
    return (
      <form onSubmit={validateOtp} className="space-y-4">
        <h3 className="text-xl font-medium">Task Context Lock</h3>
        <p className="text-gray-400 text-sm">Enter the event OTP to access the task manager.</p>
        <input value={otp} onChange={e => setOtp(e.target.value)} required placeholder="Enter 6-digit OTP" className="input-field font-mono tracking-widest text-center uppercase" />
        <button type="submit" className="btn-primary w-full">Validate OTP</button>
      </form>
    );
  }

  return (
    <form className="space-y-5">
      <h3 className="text-xl font-medium">Task Details</h3>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Task Venue *</label>
        <input required className="input-field" placeholder="e.g. Main Auditorium" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Photo Proof</label>
        <label className="block border-2 border-dashed border-white/15 rounded-xl p-6 text-center cursor-pointer hover:bg-white/[0.02]">
          <Upload className="w-6 h-6 mx-auto text-gray-500 mb-2" />
          <p className="text-sm text-gray-400">Upload photo proof</p>
          <input type="file" accept="image/*" className="hidden" />
        </label>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Students Attended</label>
        <input type="number" className="input-field" placeholder="0" />
      </div>
      <button type="submit" className="btn-primary w-full" onClick={(e) => { e.preventDefault(); toast.success("Task details saved!"); }}>Save Details</button>
    </form>
  );
}

function TaskVerify() {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Get events by this leader, then task submissions
      const { data: events } = await supabase.from("events").select("id").eq("organiser_id", user.id);
      if (events && events.length > 0) {
        const eventIds = events.map(e => e.id);
        const { data: tasks } = await supabase.from("tasks").select("id").in("event_id", eventIds);
        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map(t => t.id);
          const { data: subs } = await supabase.from("task_submissions").select("*, user:users(name, email)").in("task_id", taskIds);
          setSubmissions(subs || []);
        }
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-medium">Attendee Mark Sheet</h3>
      <div className="overflow-x-auto border border-white/5 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] border-b border-white/5">
            <tr>
              <th className="text-left py-3 px-4 text-gray-400">Name</th>
              <th className="text-left py-3 px-4 text-gray-400">Email</th>
              <th className="text-center py-3 px-4 text-gray-400">Status</th>
              <th className="text-right py-3 px-4 text-gray-400">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-500">Loading...</td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-500">No submissions yet.</td></tr>
            ) : submissions.map(s => (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 text-white font-medium">{s.user?.name || "—"}</td>
                <td className="py-3 px-4 text-gray-400">{s.user?.email || "—"}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.completed ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {s.completed ? "Done" : "In Progress"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-bold text-[#00bfff]">{s.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskAttend() {
  const supabase = createClient();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [attended, setAttended] = useState(false);
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");

  async function handleAttend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); setLoading(false); return; }

      // Validate OTP and get event
      const { data: task } = await supabase
        .from("tasks")
        .select("id, event_id, event:events(name)")
        .eq("otp", otp)
        .single();

      if (!task) { setError("Invalid OTP."); setLoading(false); return; }

      // Check if already booked
      const { data: existingBooking } = await supabase
        .from("event_bookings")
        .select("id")
        .eq("event_id", task.event_id)
        .eq("user_id", user.id)
        .single();

      if (existingBooking) {
        setError("You have already booked/attended this event.");
        setLoading(false);
        return;
      }

      // Book the event for this leader
      const { error: bookingErr } = await supabase.from("event_bookings").insert({
        event_id: task.event_id,
        user_id: user.id,
      });

      if (bookingErr) {
        if (bookingErr.code === "23505") {
          setError("Already attending this event.");
        } else {
          setError("Failed to mark attendance.");
        }
        setLoading(false);
        return;
      }

      const eventName = Array.isArray(task.event) ? task.event[0]?.name : (task.event as any)?.name;
      setEventName(eventName || "Unknown Event");
      setAttended(true);
      toast.success("Attendance marked successfully!");
    } catch {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (attended) {
    return (
      <div className="space-y-4 text-center py-8">
        <UserCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white">Attendance Marked!</h3>
        <p className="text-gray-400">You are now registered for &quot;<span className="text-[#00bfff]">{eventName}</span>&quot;</p>
        <button onClick={() => { setAttended(false); setOtp(""); }} className="btn-secondary mt-4">Attend Another Event</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-medium flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-[#00bfff]" /> Attend Another Leader&apos;s Event
      </h3>
      <p className="text-sm text-gray-400">Enter the OTP shared by the event organiser to mark your attendance.</p>
      <form onSubmit={handleAttend} className="space-y-4">
        <input
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          maxLength={6}
          placeholder="Enter 6-digit OTP"
          className="input-field font-mono tracking-widest text-center uppercase text-lg"
        />
        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full">
          {loading ? "Verifying..." : "Mark Attendance"}
        </button>
      </form>
    </div>
  );
}
