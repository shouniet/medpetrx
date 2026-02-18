"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X, Activity, TrendingUp, Edit2 } from "lucide-react";
import api from "@/lib/api";
import type { Vital } from "@/lib/types";

const emptyForm = {
  recorded_date: new Date().toISOString().slice(0, 10),
  weight_lbs: "", temperature_f: "", heart_rate_bpm: "", respiratory_rate: "", notes: "",
};

export default function VitalsPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vitals, isLoading } = useQuery<Vital[]>({
    queryKey: ["vitals", petId],
    queryFn: () => api.get(`/pets/${petId}/vitals`).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editId
        ? api.put(`/pets/${petId}/vitals/${editId}`, data).then((r) => r.data)
        : api.post(`/pets/${petId}/vitals`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitals", petId] });
      closeForm();
      toast.success(editId ? "Vitals updated!" : "Vitals recorded!");
    },
    onError: () => toast.error("Failed to save"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/vitals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitals", petId] });
      toast.success("Removed");
    },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

  const startEdit = (v: Vital) => {
    setForm({
      recorded_date: v.recorded_date?.slice(0, 10) ?? "",
      weight_lbs: v.weight_lbs?.toString() ?? "",
      temperature_f: v.temperature_f?.toString() ?? "",
      heart_rate_bpm: v.heart_rate_bpm?.toString() ?? "",
      respiratory_rate: v.respiratory_rate?.toString() ?? "",
      notes: v.notes ?? "",
    });
    setEditId(v.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    if (form.recorded_date) payload.recorded_date = form.recorded_date;
    if (form.weight_lbs) payload.weight_lbs = parseFloat(form.weight_lbs);
    if (form.temperature_f) payload.temperature_f = parseFloat(form.temperature_f);
    if (form.heart_rate_bpm) payload.heart_rate_bpm = parseInt(form.heart_rate_bpm);
    if (form.respiratory_rate) payload.respiratory_rate = parseInt(form.respiratory_rate);
    if (form.notes) payload.notes = form.notes;
    save.mutate(payload);
  };

  // Simple weight chart data
  const weightData = vitals
    ?.filter((v) => v.weight_lbs != null)
    .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime())
    ?? [];

  const maxWeight = Math.max(...weightData.map((v) => v.weight_lbs!), 1);
  const minWeight = Math.min(...weightData.map((v) => v.weight_lbs!), 0);
  const range = maxWeight - minWeight || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-600" size={22} />
          <h2 className="text-xl font-bold text-gray-900">Weight & Vitals</h2>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={15} /> Record Vitals
        </button>
      </div>

      {/* Weight Trend Chart */}
      {weightData.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">Weight Trend (lbs)</h3>
          </div>
          <div className="relative h-40">
            <svg viewBox={`0 0 ${Math.max(weightData.length * 60, 300)} 160`} className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                <line key={pct} x1="0" y1={10 + (1 - pct) * 130} x2="100%" y2={10 + (1 - pct) * 130} stroke="#f3f4f6" strokeWidth="1" />
              ))}
              {/* Line */}
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinejoin="round"
                points={weightData.map((v, i) => {
                  const x = 30 + i * ((Math.max(weightData.length * 60, 300) - 60) / Math.max(weightData.length - 1, 1));
                  const y = 10 + (1 - (v.weight_lbs! - minWeight) / range) * 130;
                  return `${x},${y}`;
                }).join(" ")}
              />
              {/* Points */}
              {weightData.map((v, i) => {
                const x = 30 + i * ((Math.max(weightData.length * 60, 300) - 60) / Math.max(weightData.length - 1, 1));
                const y = 10 + (1 - (v.weight_lbs! - minWeight) / range) * 130;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#6366f1" />
                    <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#6366f1" fontWeight="600">{v.weight_lbs}</text>
                    <text x={x} y={155} textAnchor="middle" fontSize="8" fill="#9ca3af">{new Date(v.recorded_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold">{editId ? "Edit Vitals" : "Record Vitals"}</h3>
            <button onClick={closeForm}><X size={18} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" required value={form.recorded_date} onChange={(e) => setForm((f) => ({ ...f, recorded_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Weight (lbs)</label>
              <input type="number" step="0.1" value={form.weight_lbs} onChange={(e) => setForm((f) => ({ ...f, weight_lbs: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 45.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temperature (&deg;F)</label>
              <input type="number" step="0.1" value={form.temperature_f} onChange={(e) => setForm((f) => ({ ...f, temperature_f: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 101.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Heart Rate (bpm)</label>
              <input type="number" value={form.heart_rate_bpm} onChange={(e) => setForm((f) => ({ ...f, heart_rate_bpm: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 80" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Respiratory Rate</label>
              <input type="number" value={form.respiratory_rate} onChange={(e) => setForm((f) => ({ ...f, respiratory_rate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="breaths/min" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" disabled={save.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{save.isPending ? "Saving..." : "Save"}</button>
              <button type="button" onClick={closeForm} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {/* Vitals List */}
      <div className="space-y-3">
        {vitals?.map((v) => (
          <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{new Date(v.recorded_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                <div className="flex flex-wrap gap-4 mt-2">
                  {v.weight_lbs != null && (
                    <div className="text-sm">
                      <span className="text-gray-400">Weight:</span>{" "}
                      <span className="font-medium text-gray-800">{v.weight_lbs} lbs</span>
                      {v.weight_kg != null && <span className="text-gray-400 text-xs ml-1">({v.weight_kg} kg)</span>}
                    </div>
                  )}
                  {v.temperature_f != null && (
                    <div className="text-sm">
                      <span className="text-gray-400">Temp:</span>{" "}
                      <span className={`font-medium ${v.temperature_f > 103 ? "text-red-600" : "text-gray-800"}`}>{v.temperature_f}&deg;F</span>
                    </div>
                  )}
                  {v.heart_rate_bpm != null && (
                    <div className="text-sm">
                      <span className="text-gray-400">HR:</span>{" "}
                      <span className="font-medium text-gray-800">{v.heart_rate_bpm} bpm</span>
                    </div>
                  )}
                  {v.respiratory_rate != null && (
                    <div className="text-sm">
                      <span className="text-gray-400">RR:</span>{" "}
                      <span className="font-medium text-gray-800">{v.respiratory_rate}/min</span>
                    </div>
                  )}
                </div>
                {v.notes && <p className="text-xs text-gray-400 mt-1 italic">{v.notes}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(v)} className="text-gray-300 hover:text-indigo-500"><Edit2 size={15} /></button>
                <button onClick={() => { if (confirm("Remove?")) remove.mutate(v.id); }} className="text-gray-300 hover:text-red-400"><X size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        {vitals?.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 py-8">No vitals recorded yet.</p>
        )}
      </div>
    </div>
  );
}
