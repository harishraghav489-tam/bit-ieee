"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Award, Activity, X } from "lucide-react";
import { toast } from "sonner";

export default function MemberDashboard() {
  const supabase = createClient();
  const [points, setPoints] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { data: userProfile } = await supabase.from("users").select("*").eq("email", user.email.toLowerCase()).single();
      setProfile(userProfile);
      setTotalPoints(userProfile?.activity_points || 0);

      // Welcome Flow
      if (userProfile) {
        const lastLogin = userProfile.last_login;
        if (!lastLogin) {
          setIsFirstTime(true);
        }
        setShowWelcome(true);

        // Update last_login
        await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("id", userProfile.id);

        // Auto dismiss
        setTimeout(() => setShowWelcome(false), 5000);
      }

      const { data: pts } = await supabase.from("activity_points").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setPoints(pts || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="space-y-8 animate-slide-up max-w-4xl mx-auto">
      {showWelcome && profile && (
        <div 
          onClick={() => setShowWelcome(false)}
          className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 shadow-md ${
            isFirstTime 
              ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-light)] text-white" 
              : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">
                {isFirstTime ? `Welcome to IEEE Hub, ${profile.full_name || profile.name}! 🎉` : `Welcome back, ${profile.full_name || profile.name}! 👋`}
              </h2>
              {isFirstTime && <p className="text-sm opacity-90 mt-1">We're excited to have you here. Explore events and track your activity!</p>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowWelcome(false); }} className="p-1 opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-4xl font-heading tracking-wide mb-2 text-[var(--text-primary)]">Member Dashboard</h1>
        <p className="text-[var(--text-muted)]">Track your activity points and event history.</p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 flex items-center gap-6 shadow-[0_4px_20px_var(--shadow)]">
        <div className="w-16 h-16 bg-[var(--accent-primary)] rounded-2xl flex items-center justify-center shadow-lg">
          <Award className="w-8 h-8 text-white" />
        </div>
        <div>
          <p className="text-[var(--text-muted)] font-medium">Total Activity Points</p>
          <p className="text-5xl font-bold text-[var(--text-primary)]">{loading ? "—" : totalPoints}</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-[0_4px_20px_var(--shadow)]">
        <h2 className="text-xl font-medium mb-6 flex items-center gap-2 text-[var(--text-primary)]"><Activity className="w-5 h-5 text-[var(--accent-primary)]" /> Points Breakdown</h2>
        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-[var(--bg-secondary)] rounded"></div>
                <div className="h-4 bg-[var(--bg-secondary)] rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]">
            <Activity className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-muted)]">No activity points yet. Attend events to earn!</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Event</th>
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Organised By</th>
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-[var(--text-secondary)] font-medium">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {points.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{p.event_name || "—"}</td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{p.organised_by || "—"}</td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{p.date ? new Date(p.date).toLocaleDateString() : "—"}</td>
                    <td className="py-3 px-4 text-right font-bold text-[var(--success)]">+{p.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Attendance Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-[0_4px_20px_var(--shadow)]">
        <h2 className="text-xl font-medium mb-6 text-[var(--text-primary)]">Mark Attendance</h2>
        <p className="text-[var(--text-muted)] mb-6">Enter the OTP provided by the event organiser to mark your attendance.</p>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          const target = e.target as typeof e.target & { startOtp: { value: string }, endOtp: { value: string } };
          const start = target.startOtp.value.trim();
          const end = target.endOtp.value.trim();

          if (!start && !end) {
            toast.error("Please enter at least one OTP");
            return;
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          let successCount = 0;
          let failCount = 0;

          const submitOtp = async (code: string, type: 'start'|'end') => {
            // Check OTP validity
            const { data: otp } = await supabase.from("otps").select("*").eq("otp_code", code).eq("otp_type", type).eq("is_active", true).single();
            if (!otp || new Date() > new Date(otp.expires_at)) {
              toast.error(`Invalid or expired ${type.toUpperCase()} OTP`);
              failCount++;
              return;
            }

            // Record attendance
            const { error: attError } = await supabase.from("attendance").insert({
              event_id: otp.event_id, member_id: user.id, otp_type: type,
            });

            if (attError) {
              if (attError.code === "23505") toast.info(`You already marked ${type.toUpperCase()} attendance`);
              else { toast.error(`Failed to mark ${type.toUpperCase()} attendance`); failCount++; }
              return;
            }

            // Update bookings
            const updateField = type === 'start' ? { attended_start: true } : { attended_end: true };
            await supabase.from("event_bookings").update(updateField).eq("event_id", otp.event_id).eq("user_id", user.id);

            // Give points (example: 10 per attendance type)
            await supabase.from("activity_points").insert({
              user_id: user.id, event_id: otp.event_id, points: 10,
              event_name: "Attendance Marked", organised_by: "System"
            });

            successCount++;
          };

          if (start) await submitOtp(start, 'start');
          if (end) await submitOtp(end, 'end');

          if (successCount > 0) {
            toast.success(`Successfully marked ${successCount} attendance record(s)!`);
            target.startOtp.value = "";
            target.endOtp.value = "";
            window.location.reload(); // Quick refresh to update points
          }
        }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Start OTP</label>
            <input name="startOtp" type="text" placeholder="Enter Start OTP" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] uppercase" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">End OTP</label>
            <input name="endOtp" type="text" placeholder="Enter End OTP" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] uppercase" />
          </div>
          <div className="md:col-span-2 pt-2">
            <button type="submit" className="w-full md:w-auto px-8 py-2.5 bg-[var(--accent-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md">
              Submit Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
