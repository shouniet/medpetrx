"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X, Calendar, Clock, CheckCircle2, XCircle, Edit2, Building2 } from "lucide-react";
import api from "@/lib/api";
import type { Appointment, AppointmentStatus, VetProvider } from "@/lib/types";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_ICONS: Record<AppointmentStatus, typeof Clock> = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const emptyForm = {
  title: "", appointment_date: "", vet_provider_id: "" as string,
  clinic: "", veterinarian: "",
  reason: "", notes: "", status: "scheduled" as AppointmentStatus,
};

export default function AppointmentsPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", petId],
    queryFn: () => api.get(`/pets/${petId}/appointments`).then((r) => r.data),
  });

  const { data: vets } = useQuery<VetProvider[]>({
    queryKey: ["vet-providers"],
    queryFn: () => api.get("/vet-providers").then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editId
        ? api.put(`/pets/${petId}/appointments/${editId}`, data).then((r) => r.data)
        : api.post(`/pets/${petId}/appointments`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments", petId] });
      closeForm();
      toast.success(editId ? "Appointment updated!" : "Appointment added!");
    },
    onError: () => toast.error("Failed to save"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/appointments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments", petId] });
      toast.success("Removed");
    },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

  const startEdit = (a: Appointment) => {
    setForm({
      title: a.title, appointment_date: a.appointment_date?.slice(0, 16) ?? "",
      vet_provider_id: a.vet_provider_id ? String(a.vet_provider_id) : "",
      clinic: a.clinic ?? "", veterinarian: a.veterinarian ?? "",
      reason: a.reason ?? "", notes: a.notes ?? "", status: a.status,
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleVetSelect = (vetIdStr: string) => {
    if (vetIdStr === "") {
      setForm((f) => ({ ...f, vet_provider_id: "", clinic: "", veterinarian: "" }));
      return;
    }
    const vet = vets?.find((v) => String(v.id) === vetIdStr);
    if (vet) {
      setForm((f) => ({
        ...f,
        vet_provider_id: vetIdStr,
        clinic: vet.clinic_name,
        veterinarian: vet.veterinarian_name ?? "",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { title: form.title, status: form.status };
    if (form.appointment_date) payload.appointment_date = form.appointment_date;
    if (form.vet_provider_id) payload.vet_provider_id = Number(form.vet_provider_id);
    if (form.clinic) payload.clinic = form.clinic;
    if (form.veterinarian) payload.veterinarian = form.veterinarian;
    if (form.reason) payload.reason = form.reason;
    if (form.notes) payload.notes = form.notes;
    save.mutate(payload);
  };

  const filtered = appointments?.filter((a) => filter === "all" || a.status === filter) ?? [];
  const upcoming = filtered.filter((a) => a.status === "scheduled" && new Date(a.appointment_date) >= new Date());
  const past = filtered.filter((a) => !(a.status === "scheduled" && new Date(a.appointment_date) >= new Date()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-indigo-600" size={22} />
          <h2 className="text-xl font-bold text-gray-900">Appointments</h2>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={15} /> Add Appointment
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "scheduled", "completed", "cancelled"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold">{editId ? "Edit Appointment" : "New Appointment"}</h3>
            <button onClick={closeForm}><X size={18} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Annual Checkup" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time *</label>
              <input type="datetime-local" required value={form.appointment_date} onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Vet Provider Dropdown */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Building2 size={12} className="inline mr-1 -mt-0.5" />
                Select Clinic (from My Vets)
              </label>
              <select
                value={form.vet_provider_id}
                onChange={(e) => handleVetSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select a saved vet clinic or enter manually below —</option>
                {vets?.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.clinic_name}{v.veterinarian_name ? ` — Dr. ${v.veterinarian_name}` : ""}{v.is_primary ? " ★" : ""}
                  </option>
                ))}
              </select>
              {vets?.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  No vets saved yet. Add clinics in <span className="font-medium">My Vets</span> from the sidebar.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Clinic</label>
              <input type="text" value={form.clinic} onChange={(e) => setForm((f) => ({ ...f, clinic: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Auto-filled from vet or type manually" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Veterinarian</label>
              <input type="text" value={form.veterinarian} onChange={(e) => setForm((f) => ({ ...f, veterinarian: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Auto-filled from vet or type manually" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AppointmentStatus }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <input type="text" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={save.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{save.isPending ? "Saving..." : "Save"}</button>
              <button type="button" onClick={closeForm} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming</h3>
          <div className="space-y-3">
            {upcoming.map((a) => <AppointmentCard key={a.id} a={a} onEdit={startEdit} onDelete={(id) => { if (confirm("Remove this appointment?")) remove.mutate(id); }} />)}
          </div>
        </div>
      )}

      {/* Past / Other */}
      {past.length > 0 && (
        <div>
          {upcoming.length > 0 && <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Past & Other</h3>}
          <div className="space-y-3">
            {past.map((a) => <AppointmentCard key={a.id} a={a} onEdit={startEdit} onDelete={(id) => { if (confirm("Remove this appointment?")) remove.mutate(id); }} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <p className="text-center text-gray-400 py-8">No appointments recorded yet.</p>
      )}
    </div>
  );
}

function AppointmentCard({ a, onEdit, onDelete }: { a: Appointment; onEdit: (a: Appointment) => void; onDelete: (id: number) => void }) {
  const StatusIcon = STATUS_ICONS[a.status];
  const dt = new Date(a.appointment_date);
  const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="mt-0.5">
            <StatusIcon size={18} className={a.status === "scheduled" ? "text-blue-500" : a.status === "completed" ? "text-green-500" : "text-gray-400"} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{a.title}</p>
            <p className="text-sm text-gray-500">{dateStr} at {timeStr}</p>
            {a.clinic && (
              <p className="text-xs text-gray-400 mt-0.5">
                {a.vet_provider && <Building2 size={11} className="inline mr-1 -mt-0.5 text-indigo-400" />}
                {a.clinic}{a.veterinarian ? ` — Dr. ${a.veterinarian}` : ""}
              </p>
            )}
            {a.reason && <p className="text-xs text-gray-500 mt-1">{a.reason}</p>}
            {a.notes && <p className="text-xs text-gray-400 mt-1 italic">{a.notes}</p>}
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status]}`}>{a.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(a)} className="text-gray-300 hover:text-indigo-500"><Edit2 size={15} /></button>
          <button onClick={() => onDelete(a.id)} className="text-gray-300 hover:text-red-400"><X size={16} /></button>
        </div>
      </div>
    </div>
  );
}
