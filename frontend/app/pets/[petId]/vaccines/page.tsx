"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import api from "@/lib/api";
import type { Vaccine } from "@/lib/types";

export default function VaccinesPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date_given: "", clinic: "", lot_number: "", next_due_date: "" });

  const { data: vaccines, isLoading } = useQuery<Vaccine[]>({
    queryKey: ["vaccines", petId],
    queryFn: () => api.get(`/pets/${petId}/vaccines/`).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/pets/${petId}/vaccines/`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vaccines", petId] }); setShowForm(false); setForm({ name: "", date_given: "", clinic: "", lot_number: "", next_due_date: "" }); toast.success("Vaccine added!"); },
    onError: () => toast.error("Failed to save"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/vaccines/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vaccines", petId] }); toast.success("Removed"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { name: form.name };
    if (form.date_given) payload.date_given = form.date_given;
    if (form.clinic) payload.clinic = form.clinic;
    if (form.lot_number) payload.lot_number = form.lot_number;
    if (form.next_due_date) payload.next_due_date = form.next_due_date;
    create.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Vaccines</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={15} /> Add Vaccine
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex justify-between mb-3"><h3 className="font-semibold">New Vaccine</h3><button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button></div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[["name","Vaccine Name *",true],["date_given","Date Given",false,"date"],["clinic","Clinic"],["lot_number","Lot Number"],["next_due_date","Next Due Date",false,"date"]].map(([k,l,req,t]) => (
              <div key={k as string}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l as string}</label>
                <input type={(t as string)||"text"} required={!!req} value={form[k as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [k as string]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
            <div className="md:col-span-2 flex gap-3"><button type="submit" disabled={create.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{create.isPending ? "Saving..." : "Save"}</button><button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button></div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      <div className="space-y-3">
        {vaccines?.map((v) => (
          <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-900">{v.name}</p>
              {v.date_given && <p className="text-sm text-gray-500">Given: {v.date_given.split("T")[0]}</p>}
              {v.next_due_date && <p className="text-sm text-amber-600">Due: {v.next_due_date.split("T")[0]}</p>}
              {v.clinic && <p className="text-xs text-gray-400">{v.clinic}</p>}
            </div>
            <button onClick={() => { if (confirm("Remove?")) remove.mutate(v.id); }} className="text-gray-300 hover:text-red-400"><X size={16} /></button>
          </div>
        ))}
        {vaccines?.length === 0 && !isLoading && <p className="text-center text-gray-400 py-8">No vaccines recorded yet.</p>}
      </div>
    </div>
  );
}
