"use client";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, Activity, Trophy, Zap, Globe } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function HomeContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[var(--bg-main)]">
      {/* Error Alert Banner */}
      {error && (
        <div className="relative z-[100] bg-red-500/10 border-b border-red-500/20 py-3 px-6 text-center animate-in fade-in slide-in-from-top duration-500">
          <p className="text-sm font-medium text-red-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {error === 'unauthorized_domain' 
              ? "Only @bitsathy.ac.in email addresses are allowed to access this portal." 
              : "Authentication failed. Please try again."}
          </p>
        </div>
      )}
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-[#00629B]/20 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00bfff]/12 blur-[180px]" />
        <div className="absolute top-[40%] right-[20%] w-[25%] h-[25%] rounded-full bg-[#004d7a]/15 blur-[120px]" />
      </div>

      {/* Subtle Grid Pattern Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.03] opacity-10"
        style={{
          backgroundImage: `linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00629B] to-[#00bfff] flex items-center justify-center shadow-lg shadow-[#00bfff]/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-[var(--text-primary)]">BIT IEEE HUB</h2>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">BITS Sathy</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-muted)]">
          <Link href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</Link>
          <Link href="#societies" className="hover:text-[var(--text-primary)] transition-colors">Societies</Link>
          <Link href="/login" className="px-5 py-2.5 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--border)] border border-[var(--border)] backdrop-blur-md transition-all text-[var(--text-primary)] hover:-translate-y-0.5 shadow-sm">
            Sign In
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center mt-8 md:mt-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00629B]/10 border border-[#00629B]/20 text-[#00629B] dark:text-[#00bfff] text-xs font-semibold mb-8 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#00bfff] animate-pulse" />
          Official BITS Sathy IEEE Portal
        </div>
        
        <h1 className="font-heading text-6xl md:text-8xl lg:text-9xl leading-none mb-6 tracking-wide text-[var(--text-primary)]">
          Empower Your <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00bfff] via-[#00629B] to-[#00bfff]">
            Engineering Journey
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-[var(--text-muted)] mb-12 leading-relaxed">
          The ultimate platform for BITS Sathy students to manage societies, track activity points, 
          build dynamic resumes, and engage in exclusive IEEE events.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#00629B] to-[#00bfff] rounded-full font-bold text-white shadow-lg shadow-[#00bfff]/25 hover:shadow-[#00bfff]/40 transition-all hover:-translate-y-1"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#features"
            className="flex items-center gap-2 px-8 py-4 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all bg-[var(--bg-card)] shadow-sm"
          >
            Explore Features
          </Link>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-20 py-6 px-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_var(--shadow)] max-w-3xl w-full">
          <StatItem value="12" label="IEEE Societies" />
          <StatItem value="500+" label="Active Members" />
          <StatItem value="100+" label="Events Annually" />
          <StatItem value="24/7" label="Portal Access" />
        </div>

        {/* Features Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 max-w-6xl w-full text-left">
          <FeatureCard 
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Role-Based Access"
            description="Secure environment tailored for Members, Leaders, Reps, and Admins."
          />
          <FeatureCard 
            icon={<Activity className="w-6 h-6" />}
            title="Activity Points"
            description="Earn and track points by attending events, workshops, and tasks."
          />
          <FeatureCard 
            icon={<Users className="w-6 h-6" />}
            title="12 Societies"
            description="Manage and engage with 12 specialized IEEE technical societies."
          />
          <FeatureCard 
            icon={<Trophy className="w-6 h-6" />}
            title="Auto-Resume"
            description="Your achievements automatically build a professional resume."
          />
        </div>

        {/* Societies Section */}
        <div id="societies" className="mt-32 max-w-6xl w-full">
          <h2 className="text-4xl md:text-5xl font-heading tracking-wide text-center mb-4 text-[var(--text-primary)]">
            IEEE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00bfff] to-[#00629B]">Societies</span>
          </h2>
          <p className="text-[var(--text-muted)] text-center mb-12 max-w-xl mx-auto">
            Join any of our specialized technical societies and contribute to cutting-edge engineering communities.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {societies.map((society, index) => (
              <div 
                key={index}
                className="bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 text-center group transition-colors shadow-sm"
              >
                <div className="w-10 h-10 mx-auto rounded-lg bg-[#00629B]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Globe className="w-5 h-5 text-[#00629B] dark:text-[#00bfff]" />
                </div>
                <p className="font-bold text-sm text-[var(--text-primary)]">{society.abbr}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-tight">{society.name}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-[var(--border)] mt-32 text-center text-[var(--text-muted)] text-sm bg-[var(--bg-card)]">
        <p>&copy; {new Date().getFullYear()} BITS Sathy IEEE Student Branch. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
        <div className="w-8 h-8 border-4 border-[#00629B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 group transition-colors shadow-sm">
      <div className="w-12 h-12 rounded-lg bg-[#00629B]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-[#00629B] dark:text-[#00bfff]">
        {icon}
      </div>
      <h3 className="text-xl font-heading tracking-wide mb-2 text-[var(--text-primary)]">{title}</h3>
      <p className="text-[var(--text-muted)] text-sm leading-relaxed">{description}</p>
    </div>
  );
}

const societies = [
  { abbr: "EMBS", name: "Engineering in Medicine & Biology" },
  { abbr: "PES", name: "Power and Energy" },
  { abbr: "OES", name: "Oceanic Engineering" },
  { abbr: "RAS", name: "Robotics & Automation" },
  { abbr: "CIS", name: "Computational Intelligence" },
  { abbr: "CS", name: "Computer Society" },
  { abbr: "PELS", name: "Power Electronics" },
  { abbr: "CASS", name: "Circuits & Systems" },
  { abbr: "EDS", name: "Electron Devices" },
  { abbr: "CSS", name: "Control Systems" },
  { abbr: "ITSS", name: "Intelligent Transportation" },
  { abbr: "WIE", name: "Women in Engineering" },
];
