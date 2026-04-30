"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { Lock, Code, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function MemberTaskPage() {
  const supabase = createClient();
  const [otp, setOtp] = useState("");
  const [taskActive, setTaskActive] = useState(false);
  const [taskData, setTaskData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); setLoading(false); return; }

      // Get user's society
      const { data: profile } = await supabase
        .from("users")
        .select("society_id")
        .eq("id", user.id)
        .single();

      if (!profile?.society_id) { setError("You are not assigned to a society."); setLoading(false); return; }

      const { data: task } = await supabase
        .from("tasks")
        .select("*, event:events(name, society_id, booking_enabled)")
        .eq("otp", otp)
        .single();

      if (!task) { setError("Invalid OTP. Please try again."); setLoading(false); return; }

      // Check expiry
      if (task.otp_expires_at && new Date(task.otp_expires_at) < new Date()) {
        setError("This OTP has expired."); setLoading(false); return;
      }

      // Check society isolation
      if (task.event?.society_id !== profile.society_id) {
        setError("This task is not available for your society."); setLoading(false); return;
      }

      // Check booking requirement
      const { data: booking } = await supabase
        .from("event_bookings")
        .select("id")
        .eq("event_id", task.event_id)
        .eq("user_id", user.id)
        .single();

      if (!booking) {
        setError("You have not booked this event. Please book it first from Book Events.");
        setLoading(false);
        return;
      }

      setTaskData(task);
      setTaskActive(true);
    } catch {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // Tab lock: prevent navigation/close during active task
  useEffect(() => {
    if (!taskActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Your task is in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    // Push state to prevent back navigation
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast.warning("You cannot navigate away until the task is completed.");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [taskActive]);

  async function submitTask() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !taskData) return;

      // Calculate score
      let score = 0;
      const questions = taskData.questions || [];
      for (const q of questions) {
        if (answers[q.id] && q.correct_answer !== undefined) {
          if (answers[q.id] === String(q.correct_answer)) {
            score += q.points || 10;
          }
        }
      }

      // If no correct answers defined, give full marks for completion
      if (questions.every((q: any) => q.correct_answer === undefined)) {
        score = questions.length * 10;
      }

      const { error } = await supabase.from("task_submissions").insert({
        task_id: taskData.id,
        user_id: user.id,
        answers: Object.entries(answers).map(([qId, ans]) => ({ question_id: qId, answer: ans })),
        score,
        completed: true,
      });

      if (error) throw error;
      setCompleted(true);
      setTaskActive(false);
      toast.success(`Task completed! Score: ${score}`);
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  // Full-screen task lock
  if (taskActive && taskData) {
    const questions = taskData.questions || [];

    return (
      <div className="fixed inset-0 z-50 bg-navy flex flex-col p-6 md:p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Code className="text-[#00bfff]" />
            {taskData.type === "coding" ? "Live Coding Challenge" : "MCQ Assessment"}
            <span className="text-sm text-gray-400 ml-2">— {taskData.event?.name}</span>
          </h2>
          <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-lg font-mono text-sm">
            <AlertTriangle className="w-4 h-4" /> DO NOT CLOSE THIS TAB
          </div>
        </div>

        <div className="flex-1 space-y-6 max-w-3xl mx-auto w-full">
          {taskData.type === "coding" ? (
            <div className="space-y-4">
              <h3 className="text-xl font-medium">Problem Statement:</h3>
              {questions.map((q: any, i: number) => (
                <div key={q.id || i} className="space-y-3">
                  <p className="text-gray-300 font-mono bg-black/50 p-4 rounded-lg">{q.text}</p>
                  <textarea
                    rows={12}
                    className="w-full bg-[#0a1628] border border-white/10 rounded-lg p-4 font-mono text-green-400 focus:outline-none focus:border-[#00bfff] text-sm"
                    placeholder="Write your solution here..."
                    value={answers[q.id || `q${i}`] || ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id || `q${i}`]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {questions.map((q: any, qIdx: number) => (
                <div key={q.id || qIdx} className="glass-card p-5">
                  <h3 className="text-lg font-medium mb-4">Q{qIdx + 1}: {q.text}</h3>
                  <div className="space-y-2">
                    {(q.options || ["Option A", "Option B", "Option C", "Option D"]).map((opt: string, oIdx: number) => (
                      <label key={oIdx} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        answers[q.id || `q${qIdx}`] === String(oIdx) ? "bg-[#00629B]/20 border-[#00bfff]/40 text-[#00bfff]" : "border-white/10 hover:bg-white/5"
                      }`}>
                        <input
                          type="radio"
                          name={`q-${q.id || qIdx}`}
                          value={String(oIdx)}
                          checked={answers[q.id || `q${qIdx}`] === String(oIdx)}
                          onChange={e => setAnswers(prev => ({ ...prev, [q.id || `q${qIdx}`]: e.target.value }))}
                          className="accent-[#00bfff] w-4 h-4"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end max-w-3xl mx-auto w-full">
          <button onClick={submitTask} disabled={loading} className="btn-primary px-8 py-4 text-lg">
            {loading ? "Submitting..." : "Submit Assessment"}
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-slide-up">
        <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
        <h2 className="text-4xl font-heading tracking-wide mb-2">Task Completed!</h2>
        <p className="text-gray-400 max-w-md">Your responses have been recorded and your activity points will be updated shortly by the event manager.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] max-w-md mx-auto text-center space-y-6">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2 border border-white/10 shadow-lg shadow-[#00bfff]/5">
        <Lock className="w-8 h-8 text-[#00bfff]" />
      </div>
      <div>
        <h1 className="text-3xl font-heading tracking-wide mb-2">Secure Task Gateway</h1>
        <p className="text-gray-400">Enter the 6-digit OTP provided by the event coordinator to unlock your task.</p>
      </div>
      <form onSubmit={verifyOtp} className="w-full space-y-4">
        <input
          type="text"
          required
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="0 0 0 0 0 0"
          className="w-full px-4 py-4 rounded-xl bg-black/40 border border-white/20 text-center text-3xl font-mono tracking-[1em] focus:border-[#00bfff] outline-none transition-colors shadow-inner placeholder:text-gray-600"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading || otp.length < 6} className="w-full py-4 btn-primary text-lg">
          {loading ? "Verifying..." : "Unlock Task"}
        </button>
      </form>
    </div>
  );
}
