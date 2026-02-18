"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import type { Allergy } from "@/lib/types";

const severityColor = { Mild: "bg-yellow-100 text-yellow-700", Moderate: "bg-orange-100 text-orange-700", Severe: "bg-red-100 text-red-700" };

export default function AllergiesPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ allergy_type: "Drug", substance_name: "", reaction_desc: "", severity: "", date_noticed: "", vet_verified: "false" });

  const { data: allergies, isLoading } = useQuery<Allergy[]>({
    queryKey: ["allergies", petId],
    queryFn: () => api.get(`/pets/${petId}/allergies/`).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/pets/${petId}/allergies/`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allergies", petId] }); setShowForm(false); setForm({ allergy_type: "Drug", substance_name: "", reaction_desc: "", severity: "", date_noticed: "", vet_verified: "false" }); toast.success("Allergy added!"); },
    onError: () => toast.error("Failed to save"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/allergies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["allergies", petId] }); toast.success("Removed"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { allergy_type: form.allergy_type, substance_name: form.substance_name, vet_verified: form.vet_verified === "true" };
    if (form.reaction_desc) payload.reaction_desc = form.reaction_desc;
    if (form.severity) payload.severity = form.severity;
    if (form.date_noticed) payload.date_noticed = form.date_noticed;
    create.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Allergies & ADRs</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"><Plus size={15} /> Add Allergy</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex justify-between mb-3"><h3 className="font-semibold">New Allergy / ADR</h3><button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button></div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={form.allergy_type} onChange={(e) => setForm((f) => ({ ...f, allergy_type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Drug</option><option>Food</option><option>Environmental</option><option>Vaccine</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Substance Name *</label>
              <input required value={form.substance_name} onChange={(e) => setForm((f) => ({ ...f, substance_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Penicillin" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
              <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Unknown</option><option>Mild</option><option>Moderate</option><option>Severe</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date Noticed</label>
              <input type="date" value={form.date_noticed} onChange={(e) => setForm((f) => ({ ...f, date_noticed: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Reaction Description</label>
              <textarea value={form.reaction_desc} onChange={(e) => setForm((f) => ({ ...f, reaction_desc: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2 flex gap-3"><button type="submit" disabled={create.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{create.isPending ? "Saving..." : "Save"}</button><button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button></div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      <div className="space-y-3">
        {allergies?.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex justify-between items-start">
            <div className="flex items-start gap-3">
              <ShieldAlert size={18} className="text-red-400 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{a.substance_name}</p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.allergy_type}</span>
                  {a.severity && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor[a.severity] || "bg-gray-100 text-gray-600"}`}>{a.severity}</span>}
                </div>
                {a.reaction_desc && <p className="text-sm text-gray-600 mt-0.5">{a.reaction_desc}</p>}
                {a.vet_verified && <p className="text-xs text-green-600 mt-0.5">✓ Vet verified</p>}
              </div>
            </div>
            <button onClick={() => { if (confirm("Remove?")) remove.mutate(a.id); }} className="text-gray-300 hover:text-red-400"><X size={16} /></button>
          </div>
        ))}
        {allergies?.length === 0 && !isLoading && <p className="text-center text-gray-400 py-8">No allergies recorded yet.</p>}
      </div>
    </div>
  );
}
