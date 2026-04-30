"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getRoleLabel, getRoleColor, type UserRole, type UserProfile } from "@/lib/types";
import {
  LayoutDashboard, Users, UserPlus, Activity, Bell, CheckSquare,
  CalendarDays, FileText, Megaphone, LogOut, Table,
  ChevronLeft, ChevronRight, Zap, Settings, BookOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
  { href: "/admin/society", icon: <Users className="w-5 h-5" />, label: "Society" },
  { href: "/admin/manage", icon: <UserPlus className="w-5 h-5" />, label: "Manage" },
  { href: "/admin/update", icon: <Activity className="w-5 h-5" />, label: "Update" },
  { href: "/admin/notifications", icon: <Bell className="w-5 h-5" />, label: "Notifications" },
  { href: "/admin/tasks", icon: <CheckSquare className="w-5 h-5" />, label: "Task Panel" },
  { href: "/admin/spreadsheets", icon: <Table className="w-5 h-5" />, label: "Spreadsheets" },
];

const repNav: NavItem[] = [
  { href: "/rep/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
  { href: "/rep/posts", icon: <Megaphone className="w-5 h-5" />, label: "Society Posts" },
  { href: "/rep/notifications", icon: <Bell className="w-5 h-5" />, label: "Send Notification" },
];

const leadershipNav: NavItem[] = [
  { href: "/leadership/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
  { href: "/leadership/society", icon: <Users className="w-5 h-5" />, label: "Society" },
  { href: "/leadership/event", icon: <CalendarDays className="w-5 h-5" />, label: "Event" },
  { href: "/leadership/bookings", icon: <BookOpen className="w-5 h-5" />, label: "Book Events" },
  { href: "/leadership/update", icon: <FileText className="w-5 h-5" />, label: "Resume Builder" },
  { href: "/leadership/task", icon: <CheckSquare className="w-5 h-5" />, label: "Task" },
];

const memberNav: NavItem[] = [
  { href: "/member/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
  { href: "/member/activity", icon: <Activity className="w-5 h-5" />, label: "Activity" },
  { href: "/member/bookings", icon: <BookOpen className="w-5 h-5" />, label: "Book Events" },
  { href: "/member/society", icon: <Users className="w-5 h-5" />, label: "Society Status" },
  { href: "/member/task", icon: <CheckSquare className="w-5 h-5" />, label: "Task" },
];

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin_primary": return adminNav;
    case "student_rep": return repNav;
    case "leadership":
    case "event_manager": return leadershipNav;
    case "membership": return memberNav;
    default: return memberNav;
  }
}

function getRoleTitle(role: UserRole): string {
  switch (role) {
    case "admin_primary": return "Admin Panel";
    case "student_rep": return "Student Rep";
    case "leadership": return "Leadership";
    case "event_manager": return "Event Manager";
    case "membership": return "Member Portal";
    default: return "Portal";
  }
}

export default function Sidebar({ user }: { user: UserProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = getNavItems(user.role);

  useEffect(() => {
    // Fetch unread notifications count
    async function fetchUnread() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false)
        .or(`recipient_id.eq.${user.id},society_id.eq.${user.society_id},recipient_role.eq.${user.role}`);
      setUnreadCount(count || 0);
    }
    fetchUnread();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      }, () => {
        fetchUnread();
        toast.info("New notification received");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id, user.society_id, user.role]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className={cn(
      "bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col transition-all duration-300 shrink-0 shadow-sm",
      collapsed ? "w-[68px]" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00629B] to-[#00bfff] flex items-center justify-center shrink-0 shadow-md shadow-[#00bfff]/15">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wide text-[var(--accent-primary)] truncate">{getRoleTitle(user.role)}</h2>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">IEEE HUB</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-link",
                isActive && "active",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn(isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>{item.icon}</span>
              {!collapsed && <span className="truncate text-[var(--text-secondary)] font-medium">{item.label}</span>}
              {!collapsed && item.label === "Notifications" && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-2 mb-2 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User Section */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00629B] to-[#00bfff] flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {(user.name || user.email)?.[0]?.toUpperCase() || "?"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-[var(--text-primary)]">{user.name || "User"}</p>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-semibold border", getRoleColor(user.role))}>
                {getRoleLabel(user.role)}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
