"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { QrCode, Link2, Trash2, Plus } from "lucide-react";
import api from "@/lib/api";
import type { EmergencyShare } from "@/lib/types";

export default function EmergencyPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [form, setForm] = useState({ access_type: "link", expires_hours: "24" });

  const { data: shares, isLoading } = useQuery<EmergencyShare[]>({
    queryKey: ["emergency-shares", petId],
    queryFn: () => api.get(`/pets/${petId}/emergency/shares`).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/pets/${petId}/emergency/share`, data).then((r) => r.data),
    onSuccess: (data: EmergencyShare) => {
      qc.invalidateQueries({ queryKey: ["emergency-shares", petId] });
      setShowCreate(false);
      if (data.qr_code) setQrData(data.qr_code);
      toast.success("Emergency share created!");
      // Copy to clipboard
      navigator.clipboard.writeText(data.url).catch(() => {});
    },
    onError: () => toast.error("Failed to create share"),
  });

  const revoke = useMutation({
    mutationFn: (shareId: number) => api.delete(`/pets/${petId}/emergency/shares/${shareId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["emergency-shares", petId] }); toast.success("Share revoked"); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Emergency Access</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
          <Plus size={15} /> Generate Share Link
        </button>
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5">
        <p className="text-sm text-orange-800">
          <strong>Emergency Mode:</strong> Generate a time-limited link or QR code that any veterinarian can use to view your pet&apos;s emergency summary — no login required. All access is logged. Share links are revocable at any time.
        </p>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <h3 className="font-semibold mb-3">Create Emergency Share</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Share Type</label>
              <select value={form.access_type} onChange={(e) => setForm((f) => ({ ...f, access_type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="link">Link Only</option>
                <option value="qr">Link + QR Code</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expires In</label>
              <select value={form.expires_hours} onChange={(e) => setForm((f) => ({ ...f, expires_hours: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="72">72 hours</option>
                <option value="168">1 week</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => create.mutate({ access_type: form.access_type, expires_hours: parseInt(form.expires_hours) })} disabled={create.isPending} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {create.isPending ? "Creating..." : "Create Share"}
            </button>
            <button onClick={() => setShowCreate(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* QR code display */}
      {qrData && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 text-center shadow-sm">
          <h3 className="font-semibold mb-3">QR Code</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrData} alt="Emergency QR Code" className="mx-auto w-48 h-48" />
          <p className="text-xs text-gray-400 mt-2">Print or screenshot this code for your pet&apos;s records.</p>
          <button onClick={() => setQrData(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {shares?.map((share, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {share.access_type === "qr" ? <QrCode size={16} className="text-gray-400" /> : <Link2 size={16} className="text-gray-400" />}
                <span className="text-sm font-medium text-gray-700 capitalize">{share.access_type} share</span>
              </div>
              <p className="text-xs text-gray-400">Expires: {new Date(share.expires_at).toLocaleString()}</p>
              <button onClick={() => { navigator.clipboard.writeText(share.url); toast.success("Link copied!"); }} className="text-xs text-indigo-600 hover:underline mt-1">Copy Link</button>
            </div>
            <button onClick={() => { if (confirm("Revoke this share link?")) revoke.mutate(i); }} className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {shares?.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 py-8">No active emergency shares.</p>
        )}
      </div>
    </div>
  );
}
