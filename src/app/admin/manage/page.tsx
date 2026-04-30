"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Users, Upload, CheckCircle, AlertCircle, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Society { id: string; name: string; abbreviation: string; }

export default function ManagePage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("society");
  const [societies, setSocieties] = useState<Society[]>([]);

  useEffect(() => {
    async function init() {
      const { data: socs } = await supabase.from("societies").select("id, name, abbreviation").order("name");
      if (socs) setSocieties(socs);
    }
    init();
  }, []);

  const tabs = [
    { id: "society", label: "Add Society" },
    { id: "directory", label: "Member Directory" },
    { id: "rep", label: "Student Rep" },
    { id: "members", label: "Bulk Members" },
    { id: "leadership", label: "Bulk Leadership" },
    { id: "event_manager", label: "Event Manager" },
  ];

  return (
    <div className="space-y-6 animate-slide-up max-w-6xl mx-auto">
      <div>
        <h1 className="text-4xl font-heading tracking-wide mb-2 text-[var(--text-primary)]">Manage Portal</h1>
        <p className="text-[var(--text-muted)]">Add societies and manage users in bulk.</p>
      </div>

      <div className="flex space-x-2 border-b border-[var(--border)] pb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id ? "bg-[var(--accent-primary)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-[0_4px_20px_var(--shadow)]">
        {activeTab === "society" && <AddSocietyForm supabase={supabase} />}
        {activeTab === "directory" && <MemberDirectory supabase={supabase} />}
        {activeTab === "rep" && <AddUserForm supabase={supabase} role="student_rep" societies={societies} />}
        {activeTab === "members" && <BulkUploadForm supabase={supabase} type="membership" societies={societies} />}
        {activeTab === "leadership" && <BulkUploadForm supabase={supabase} type="leadership" societies={societies} />}
        {activeTab === "event_manager" && <AddUserForm supabase={supabase} role="event_manager" societies={societies} />}
      </div>
    </div>
  );
}

function MemberDirectory({ supabase }: { supabase: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase.from("users").select("*, society:societies(abbreviation)").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(users.map(u => u.id)));
    else setSelectedIds(new Set());
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleChangeRole = async (newRole: string) => {
    if (selectedIds.size === 0 || !newRole) return;
    setIsProcessing(true);
    
    const { error } = await supabase.from("users").update({ role: newRole }).in("id", Array.from(selectedIds));
    setIsProcessing(false);

    if (error) { toast.error(error.message); return; }
    toast.success(`Role updated to ${newRole} for ${selectedIds.size} users`);
    setSelectedIds(new Set());
    fetchUsers();
  };

  const handleDeleteMembers = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} members? This action cannot be undone.`)) return;
    
    setIsProcessing(true);
    
    // Note: We only delete from public.users as deleting from auth.users requires service role key
    const { error } = await supabase.from("users").delete().in("id", Array.from(selectedIds));
    setIsProcessing(false);

    if (error) { toast.error(error.message); return; }
    toast.success(`${selectedIds.size} users deleted successfully`);
    setSelectedIds(new Set());
    fetchUsers();
  };

  if (loading) return <div className="animate-pulse h-64 bg-[var(--bg-secondary)] rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h3 className="text-xl font-medium text-[var(--text-primary)]">Member Directory ({users.length})</h3>
        
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-[var(--bg-secondary)] px-4 py-2 rounded-lg border border-[var(--border)]">
            <span className="text-sm font-medium text-[var(--text-primary)]">{selectedIds.size} selected</span>
            <div className="w-px h-6 bg-[var(--border)]" />
            <select 
              onChange={(e) => { handleChangeRole(e.target.value); e.target.value = ""; }}
              disabled={isProcessing}
              className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded px-2 py-1 focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="">Change Role...</option>
              <option value="admin_primary">Admin</option>
              <option value="leadership">Leadership</option>
              <option value="membership">Member</option>
              <option value="student_rep">Student Rep</option>
              <option value="event_manager">Event Manager</option>
            </select>
            <button 
              onClick={handleDeleteMembers}
              disabled={isProcessing}
              className="flex items-center gap-1 text-[var(--danger)] hover:bg-[var(--danger)]/10 px-2 py-1 rounded transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
            <tr>
              <th className="py-3 px-4 text-left w-12">
                <input 
                  type="checkbox" 
                  checked={users.length > 0 && selectedIds.size === users.length}
                  onChange={handleSelectAll}
                  className="rounded border-[var(--border)] bg-[var(--bg-card)] checked:bg-[var(--accent-primary)]"
                />
              </th>
              <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Name</th>
              <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Email</th>
              <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Role</th>
              <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Society</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="py-3 px-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(u.id)}
                    onChange={() => handleSelect(u.id)}
                    className="rounded border-[var(--border)] bg-[var(--bg-card)] checked:bg-[var(--accent-primary)]"
                  />
                </td>
                <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{u.full_name || u.name || "—"}</td>
                <td className="py-3 px-4 text-[var(--text-muted)]">{u.email}</td>
                <td className="py-3 px-4">
                  <span className="bg-[var(--bg-secondary)] text-[var(--text-primary)] px-2 py-1 rounded text-xs border border-[var(--border)]">
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--text-muted)]">{u.society?.abbreviation || "—"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddSocietyForm({ supabase }: { supabase: any }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase.from("societies").insert({
        name: fd.get("name"), abbreviation: fd.get("abbreviation"), department: fd.get("department"), total_members: parseInt(fd.get("total_members") as string) || 0,
      });
      if (error) throw error;
      toast.success("Society added successfully!");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) { toast.error(err.message || "Failed to add society"); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-xl font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]"><Plus className="w-5 h-5 text-[var(--accent-primary)]" /> Add New Society</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Society Name *</label>
          <input name="name" required className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="e.g. Computer Society" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Abbreviation</label>
          <input name="abbreviation" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="e.g. CS" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Department</label>
          <input name="department" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="e.g. CSE" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Number of Members</label>
          <input name="total_members" type="number" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="0" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="bg-[var(--accent-primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
        {loading ? "Adding..." : "Add Society"}
      </button>
    </form>
  );
}

function AddUserForm({ supabase, role, societies }: { supabase: any; role: string; societies: Society[] }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;

    if (!email.endsWith("@bitsathy.ac.in")) { toast.error("Only @bitsathy.ac.in emails allowed"); setLoading(false); return; }

    try {
      const { error } = await supabase.from("users").upsert({
        email, name: fd.get("name"), role, society_id: fd.get("society_id") || null, department: fd.get("department") || null, mobile: fd.get("mobile") || null, primary_skills: fd.get("primary_skills") || null, secondary_skills: fd.get("secondary_skills") || null,
      }, { onConflict: "email" });

      if (error) throw error;
      toast.success(`${role.replace("_", " ")} added successfully!`);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) { toast.error(err.message || "Failed to add user"); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-xl font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]">
        <Users className="w-5 h-5 text-[var(--accent-primary)]" /> Add {role.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Name *</label>
          <input name="name" required className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email *</label>
          <input name="email" type="email" required className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="user@bitsathy.ac.in" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Department</label>
          <input name="department" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="e.g. CSE" />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Mobile</label>
          <input name="mobile" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="+91..." />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Society *</label>
          <select name="society_id" required className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none">
            <option value="">Select society</option>
            {societies.map(s => <option key={s.id} value={s.id}>{s.abbreviation} — {s.name}</option>)}
          </select>
        </div>
        {(role === "leadership" || role === "event_manager") && (
          <>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Primary Skills</label>
              <input name="primary_skills" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="e.g. Python, ML" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Secondary Skills</label>
              <input name="secondary_skills" className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none" placeholder="e.g. Web Dev, IoT" />
            </div>
          </>
        )}
      </div>
      <button type="submit" disabled={loading} className="bg-[var(--accent-primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
        {loading ? "Adding..." : "Add User"}
      </button>
    </form>
  );
}

function BulkUploadForm({ supabase, type, societies }: { supabase: any; type: string; societies: Society[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  async function handleUpload() {
    if (!file) { toast.error("Please select a file"); return; }
    setLoading(true); setResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) { toast.error("Empty spreadsheet"); setLoading(false); return; }

      const societyMap = new Map(societies.map(s => [s.name.toLowerCase(), s.id]));
      societies.forEach(s => { if (s.abbreviation) societyMap.set(s.abbreviation.toLowerCase(), s.id); });

      let success = 0; const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row["Name"] || row["name"];
        const email = row["Gmail"] || row["Email"] || row["email"] || row["gmail"];
        const dept = row["Department"] || row["department"] || "";
        const societyName = row["Respective Society"] || row["Society"] || row["society"] || "";

        if (!name || !email) { errors.push(`Row ${i + 2}: Missing name or email`); continue; }
        if (!email.endsWith("@bitsathy.ac.in")) { errors.push(`Row ${i + 2}: Invalid domain — ${email}`); continue; }

        const societyId = societyMap.get(societyName.toLowerCase()) || null;

        const userData: any = { email, name, role: type, society_id: societyId, department: dept };
        if (type === "leadership") {
          userData.primary_skills = row["Primary Skills"] || row["primary_skills"] || "";
          userData.secondary_skills = row["Secondary Skills"] || row["secondary_skills"] || "";
        }

        const { error } = await supabase.from("users").upsert(userData, { onConflict: "email" });
        if (error) errors.push(`Row ${i + 2}: ${error.message}`); else success++;
      }

      setResults({ success, failed: errors.length, errors });
      if (success > 0) toast.success(`Successfully imported ${success} users`);
      if (errors.length > 0) toast.warning(`${errors.length} rows had errors`);
      setFile(null);
    } catch (err: any) { toast.error(err.message || "Upload failed"); } finally { setLoading(false); }
  }

  const expectedColumns = type === "membership" ? "Name, Department, Gmail, Respective Society" : "Name, Department, Gmail, Respective Society, Primary Skills, Secondary Skills";

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-medium mb-4 flex items-center gap-2 text-[var(--text-primary)]">
        <Upload className="w-5 h-5 text-[var(--accent-primary)]" /> Bulk Add {type === "membership" ? "Members" : "Leadership"}
      </h3>
      <p className="text-sm text-[var(--text-muted)]">
        Upload an Excel file (.xlsx) with columns: <span className="text-[var(--text-primary)] font-medium">{expectedColumns}</span>
      </p>

      <label className="block border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
        <Upload className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">{file ? file.name : "Click to upload or drag and drop"}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">.xlsx files only</p>
        <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>

      <div className="flex justify-end">
        <button onClick={handleUpload} disabled={loading || !file} className="bg-[var(--accent-primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? "Processing..." : "Process Upload"}
        </button>
      </div>

      {results && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-[var(--success)] text-sm">
              <CheckCircle className="w-4 h-4" /> {results.success} imported
            </div>
            {results.failed > 0 && (
              <div className="flex items-center gap-2 text-[var(--danger)] text-sm">
                <AlertCircle className="w-4 h-4" /> {results.failed} failed
              </div>
            )}
          </div>
          {results.errors.length > 0 && (
            <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg p-3 max-h-40 overflow-y-auto">
              {results.errors.map((err, i) => <p key={i} className="text-[var(--danger)] text-xs">{err}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
