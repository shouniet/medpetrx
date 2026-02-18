"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import api from "@/lib/api";
import type { Problem } from "@/lib/types";

export default function ProblemsPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ condition_name: "", onset_date: "", notes: "", is_active: "true" });

  const { data: problems, isLoading } = useQuery<Problem[]>({
    queryKey: ["problems", petId],
    queryFn: () => api.get(`/pets/${petId}/problems/`).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/pets/${petId}/problems/`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["problems", petId] }); setShowForm(false); setForm({ condition_name: "", onset_date: "", notes: "", is_active: "true" }); toast.success("Problem added!"); },
    onError: () => toast.error("Failed to save"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/problems/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["problems", petId] }); toast.success("Removed"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { condition_name: form.condition_name, is_active: form.is_active === "true" };
    if (form.onset_date) payload.onset_date = form.onset_date;
    if (form.notes) payload.notes = form.notes;
    create.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Problems List</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"><Plus size={15} /> Add Problem</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex justify-between mb-3"><h3 className="font-semibold">New Problem</h3><button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button></div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Condition Name *</label>
              <input required value={form.condition_name} onChange={(e) => setForm((f) => ({ ...f, condition_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Atopy, CKD, IVDD" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="true">Active</option><option value="false">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Onset Date</label>
              <input type="date" value={form.onset_date} onChange={(e) => setForm((f) => ({ ...f, onset_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2 flex gap-3"><button type="submit" disabled={create.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{create.isPending ? "Saving..." : "Save"}</button><button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button></div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      <div className="space-y-3">
        {problems?.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{p.condition_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>{p.is_active ? "Active" : "Resolved"}</span>
              </div>
              {p.onset_date && <p className="text-xs text-gray-400 mt-0.5">Since: {p.onset_date.split("T")[0]}</p>}
              {p.notes && <p className="text-sm text-gray-600 mt-1">{p.notes}</p>}
            </div>
            <button onClick={() => { if (confirm("Remove?")) remove.mutate(p.id); }} className="text-gray-300 hover:text-red-400"><X size={16} /></button>
          </div>
        ))}
        {problems?.length === 0 && !isLoading && <p className="text-center text-gray-400 py-8">No problems recorded yet.</p>}
      </div>
    </div>
  );
}
