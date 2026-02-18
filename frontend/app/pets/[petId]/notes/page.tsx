"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X, StickyNote, Edit2, Filter } from "lucide-react";
import api from "@/lib/api";
import type { ActivityNote, NoteCategory, NOTE_CATEGORY_LABELS } from "@/lib/types";

const CATEGORIES: { value: NoteCategory; label: string; color: string }[] = [
  { value: "general", label: "General", color: "bg-gray-100 text-gray-700" },
  { value: "behavior", label: "Behavior", color: "bg-purple-50 text-purple-700" },
  { value: "diet", label: "Diet", color: "bg-green-50 text-green-700" },
  { value: "symptom", label: "Symptom", color: "bg-red-50 text-red-700" },
  { value: "exercise", label: "Exercise", color: "bg-blue-50 text-blue-700" },
];

const categoryColor = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.color ?? "bg-gray-100 text-gray-700";

const emptyForm = {
  note_date: new Date().toISOString().slice(0, 10),
  category: "general" as NoteCategory,
  title: "",
  body: "",
};

export default function NotesPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<"all" | NoteCategory>("all");

  const { data: notes, isLoading } = useQuery<ActivityNote[]>({
    queryKey: ["notes", petId],
    queryFn: () => api.get(`/pets/${petId}/notes`).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editId
        ? api.put(`/pets/${petId}/notes/${editId}`, data).then((r) => r.data)
        : api.post(`/pets/${petId}/notes`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", petId] });
      closeForm();
      toast.success(editId ? "Note updated!" : "Note added!");
    },
    onError: () => toast.error("Failed to save"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", petId] });
      toast.success("Removed");
    },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

  const startEdit = (n: ActivityNote) => {
    setForm({
      note_date: n.note_date?.slice(0, 10) ?? "",
      category: n.category,
      title: n.title,
      body: n.body ?? "",
    });
    setEditId(n.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      title: form.title,
      category: form.category,
    };
    if (form.note_date) payload.note_date = form.note_date;
    if (form.body) payload.body = form.body;
    save.mutate(payload);
  };

  const filtered = notes?.filter((n) => filter === "all" || n.category === filter) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <StickyNote className="text-indigo-600" size={22} />
          <h2 className="text-xl font-bold text-gray-900">Notes & Activity Log</h2>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={15} /> Add Note
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        {[{ value: "all" as const, label: "All" }, ...CATEGORIES].map((c) => (
          <button key={c.value} onClick={() => setFilter(c.value as typeof filter)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === c.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold">{editId ? "Edit Note" : "New Note"}</h3>
            <button onClick={closeForm}><X size={18} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={form.note_date} onChange={(e) => setForm((f) => ({ ...f, note_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as NoteCategory }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Morning walk — limping" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Details</label>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Write details here..." />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" disabled={save.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{save.isPending ? "Saving..." : "Save"}</button>
              <button type="button" onClick={closeForm} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.map((n) => (
          <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(n.category)}`}>{n.category}</span>
                  <span className="text-xs text-gray-400">{new Date(n.note_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <p className="font-semibold text-gray-900">{n.title}</p>
                {n.body && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{n.body}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(n)} className="text-gray-300 hover:text-indigo-500"><Edit2 size={15} /></button>
                <button onClick={() => { if (confirm("Remove?")) remove.mutate(n.id); }} className="text-gray-300 hover:text-red-400"><X size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 py-8">No notes yet. Start logging your pet&apos;s activities!</p>
        )}
      </div>
    </div>
  );
}
