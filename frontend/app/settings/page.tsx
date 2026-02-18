"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Shield, Key, Eye, Trash2 } from "lucide-react";
import api from "@/lib/api";
import type { User } from "@/lib/types";
import Sidebar from "@/components/layout/Sidebar";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [showAccessLog, setShowAccessLog] = useState(false);
  const [accessLog, setAccessLog] = useState<Record<string, unknown>[]>([]);

  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data),
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPass) { toast.error("Passwords do not match"); return; }
    setChangingPass(true);
    // Password change would need a dedicated endpoint — placeholder for now
    toast.success("Password change coming soon — endpoint to be added.");
    setChangingPass(false);
    setNewPassword(""); setConfirmPass("");
  };

  const handleLoadAccessLog = async () => {
    try {
      const { data } = await api.get("/auth/access-log");
      setAccessLog(data);
      setShowAccessLog(true);
    } catch {
      // Endpoint not yet implemented — show placeholder
      setAccessLog([{ action: "Feature coming soon", timestamp: new Date().toISOString() }]);
      setShowAccessLog(true);
    }
  };

  const handleDeleteAccount = () => {
    if (!confirm("Are you sure? This will permanently delete your account and all pet records. This cannot be undone.")) return;
    toast.error("Account deletion: please contact support.");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

          {/* Account Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Key size={18} /> Account</h2>
            <div className="space-y-1 text-sm text-gray-600">
              {(user?.first_name || user?.last_name) && (
                <p><span className="text-gray-400">Name:</span> {[user?.first_name, user?.last_name].filter(Boolean).join(" ")}</p>
              )}
              <p><span className="text-gray-400">Email:</span> {user?.email}</p>
              {user?.phone && <p><span className="text-gray-400">Phone:</span> {user.phone}</p>}
              {user?.address_line1 && (
                <p>
                  <span className="text-gray-400">Address:</span>{" "}
                  {[user.address_line1, user.address_line2].filter(Boolean).join(", ")}
                  {user.city || user.state || user.zip_code
                    ? `, ${[user.city, user.state, user.zip_code].filter(Boolean).join(", ")}`
                    : ""}
                </p>
              )}
              {user?.secondary_contact_name && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Secondary Contact</p>
                  <p>{user.secondary_contact_name}{user.secondary_contact_relation ? ` (${user.secondary_contact_relation})` : ""}</p>
                  {user.secondary_contact_phone && <p>{user.secondary_contact_phone}</p>}
                </div>
              )}
              {user?.consent_date && <p className="mt-2"><span className="text-gray-400">Consent accepted:</span> {new Date(user.consent_date as unknown as string || "").toLocaleDateString()}</p>}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="password" placeholder="Confirm new password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" disabled={changingPass} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{changingPass ? "Updating..." : "Update Password"}</button>
            </form>
          </div>

          {/* Consent */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Shield size={18} /> Privacy & Consent</h2>
            <p className="text-sm text-gray-600 mb-3">
              {user?.consent_accepted ? "✓ You have accepted the MedPetRx Terms and Consent Agreement." : "Consent not yet accepted."}
            </p>
            <button onClick={handleLoadAccessLog} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"><Eye size={15} /> View Access Log</button>
          </div>

          {showAccessLog && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
              <h3 className="font-semibold text-gray-800 mb-3">Access Log</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {accessLog.map((entry, i) => (
                  <div key={i} className="text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                    <span className="font-medium">{String(entry.action)}</span>
                    {entry.resource_type ? <span className="text-gray-400"> · {String(entry.resource_type)}</span> : null}
                    <span className="text-gray-400 float-right">{new Date(String(entry.timestamp)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
            <h2 className="font-semibold text-red-700 mb-3 flex items-center gap-2"><Trash2 size={18} /> Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-3">Permanently delete your account and all associated pet records.</p>
            <button onClick={handleDeleteAccount} className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">Delete Account</button>
          </div>
        </div>
      </main>
    </div>
  );
}
