"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X, Edit2, Star, Building2, Phone, Mail, Globe, Search, MapPin, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { VetProvider, VetClinicRef } from "@/lib/types";
import Sidebar from "@/components/layout/Sidebar";

const emptyForm = {
  clinic_name: "", veterinarian_name: "", phone: "", email: "",
  address: "", website: "", specialty: "", notes: "", is_primary: false,
};

export default function VetProvidersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Lookup panel state
  const [showLookup, setShowLookup] = useState(false);
  const [lookupSearch, setLookupSearch] = useState("");
  const [lookupCity, setLookupCity] = useState("");
  const [lookupSpecialty, setLookupSpecialty] = useState("");
  const [lookupEmergency, setLookupEmergency] = useState(false);

  const { data: providers, isLoading } = useQuery<VetProvider[]>({
    queryKey: ["vet-providers"],
    queryFn: () => api.get("/vet-providers").then((r) => r.data),
  });

  // Fetch lookup data
  const { data: lookupData } = useQuery<{ clinics: VetClinicRef[]; total: number }>({
    queryKey: ["vet-clinic-refs", lookupSearch, lookupCity, lookupSpecialty, lookupEmergency],
    queryFn: () => {
      const params = new URLSearchParams();
      if (lookupSearch) params.set("search", lookupSearch);
      if (lookupCity) params.set("city", lookupCity);
      if (lookupSpecialty) params.set("specialty", lookupSpecialty);
      if (lookupEmergency) params.set("is_emergency", "true");
      return api.get(`/vet-clinic-refs?${params.toString()}`).then((r) => r.data);
    },
    enabled: showLookup,
  });

  const { data: citiesData } = useQuery<{ cities: string[] }>({
    queryKey: ["vet-clinic-ref-cities"],
    queryFn: () => api.get("/vet-clinic-refs/cities").then((r) => r.data),
    enabled: showLookup,
  });

  const { data: specialtiesData } = useQuery<{ specialties: string[] }>({
    queryKey: ["vet-clinic-ref-specialties"],
    queryFn: () => api.get("/vet-clinic-refs/specialties").then((r) => r.data),
    enabled: showLookup,
  });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editId
        ? api.put(`/vet-providers/${editId}`, data).then((r) => r.data)
        : api.post("/vet-providers", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vet-providers"] });
      closeForm();
      toast.success(editId ? "Provider updated!" : "Provider added!");
    },
    onError: () => toast.error("Failed to save"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/vet-providers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vet-providers"] });
      toast.success("Removed");
    },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm); };

  const startEdit = (p: VetProvider) => {
    setForm({
      clinic_name: p.clinic_name, veterinarian_name: p.veterinarian_name ?? "",
      phone: p.phone ?? "", email: p.email ?? "", address: p.address ?? "",
      website: p.website ?? "", specialty: p.specialty ?? "", notes: p.notes ?? "",
      is_primary: p.is_primary,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const addFromLookup = (clinic: VetClinicRef) => {
    setForm({
      clinic_name: clinic.clinic_name,
      veterinarian_name: clinic.veterinarian_name ?? "",
      phone: clinic.phone ?? "",
      email: clinic.email ?? "",
      address: clinic.address ?? "",
      website: clinic.website ?? "",
      specialty: clinic.specialty ?? "",
      notes: "",
      is_primary: false,
    });
    setEditId(null);
    setShowForm(true);
    setShowLookup(false);
    toast.success(`Pre-filled from ${clinic.clinic_name}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      clinic_name: form.clinic_name,
      is_primary: form.is_primary,
    };
    if (form.veterinarian_name) payload.veterinarian_name = form.veterinarian_name;
    if (form.phone) payload.phone = form.phone;
    if (form.email) payload.email = form.email;
    if (form.address) payload.address = form.address;
    if (form.website) payload.website = form.website;
    if (form.specialty) payload.specialty = form.specialty;
    if (form.notes) payload.notes = form.notes;
    save.mutate(payload);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Building2 className="text-indigo-600" size={24} />
                <h1 className="text-2xl font-bold text-gray-900">My Vet Providers</h1>
              </div>
              <p className="text-gray-500 text-sm">Keep track of your pet&apos;s veterinary clinics and doctors.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLookup(!showLookup)}
                className="flex items-center gap-2 border border-indigo-200 text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100"
              >
                <Search size={15} /> Browse MA Clinics
              </button>
              <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                <Plus size={16} /> Add Provider
              </button>
            </div>
          </div>

          {/* ── MA Clinic Lookup Panel ──────────────────────── */}
          {showLookup && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-indigo-100 p-5 mb-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Massachusetts Vet Clinic Directory</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {lookupData?.total ?? 0} clinics
                  </span>
                </div>
                <button onClick={() => setShowLookup(false)}><X size={18} className="text-gray-400" /></button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clinics..."
                      value={lookupSearch}
                      onChange={(e) => setLookupSearch(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
                <select
                  value={lookupCity}
                  onChange={(e) => setLookupCity(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Cities</option>
                  {citiesData?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={lookupSpecialty}
                  onChange={(e) => setLookupSpecialty(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Specialties</option>
                  {specialtiesData?.specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lookupEmergency}
                    onChange={(e) => setLookupEmergency(e.target.checked)}
                    className="rounded border-gray-300 text-red-500 focus:ring-red-400"
                  />
                  <AlertTriangle size={14} className="text-red-500" /> Emergency / 24-hour clinics only
                </label>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {lookupData?.clinics.map((clinic) => (
                  <div key={clinic.id} className="bg-white rounded-lg border border-gray-100 p-3 flex justify-between items-start hover:border-indigo-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{clinic.clinic_name}</p>
                        {clinic.is_emergency && (
                          <span className="shrink-0 bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">24h</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{clinic.address}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {clinic.phone && <span className="text-xs text-gray-400">{clinic.phone}</span>}
                        {clinic.specialty && <span className="text-xs text-indigo-500">{clinic.specialty}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => addFromLookup(clinic)}
                      className="shrink-0 ml-3 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700"
                    >
                      <Plus size={12} className="inline -mt-0.5 mr-1" />Add
                    </button>
                  </div>
                ))}
                {lookupData?.clinics.length === 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">No clinics match your filters.</p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5 shadow-sm">
              <div className="flex justify-between mb-3">
                <h3 className="font-semibold">{editId ? "Edit Provider" : "New Provider"}</h3>
                <button onClick={closeForm}><X size={18} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Clinic Name *</label>
                  <input type="text" required value={form.clinic_name} onChange={(e) => setForm((f) => ({ ...f, clinic_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Veterinarian Name</label>
                  <input type="text" value={form.veterinarian_name} onChange={(e) => setForm((f) => ({ ...f, veterinarian_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                  <input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Specialty</label>
                  <input type="text" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Dermatology, Oncology" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_primary} onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    Primary Veterinarian
                  </label>
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" disabled={save.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{save.isPending ? "Saving..." : "Save"}</button>
                  <button type="button" onClick={closeForm} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

          {/* Provider Cards */}
          <div className="space-y-4">
            {providers?.map((p) => (
              <ProviderCard key={p.id} p={p} onEdit={startEdit} onDelete={(id) => { if (confirm("Remove this provider?")) remove.mutate(id); }} />
            ))}
            {providers?.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No vet providers added yet.</p>
                <p className="text-gray-400 text-sm mt-1">Browse the MA clinic directory above or add one manually.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProviderCard({ p, onEdit, onDelete }: { p: VetProvider; onEdit: (p: VetProvider) => void; onDelete: (id: number) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-lg">{p.clinic_name}</h3>
            {p.is_primary && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                <Star size={12} /> Primary
              </span>
            )}
          </div>
          {p.veterinarian_name && <p className="text-sm text-gray-600">Dr. {p.veterinarian_name}</p>}
          {p.specialty && <p className="text-xs text-indigo-500 mt-0.5">{p.specialty}</p>}

          <div className="flex flex-wrap gap-4 mt-3">
            {p.phone && (
              <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600">
                <Phone size={14} /> {p.phone}
              </a>
            )}
            {p.email && (
              <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600">
                <Mail size={14} /> {p.email}
              </a>
            )}
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600">
                <Globe size={14} /> Website
              </a>
            )}
          </div>
          {p.address && <p className="text-xs text-gray-400 mt-2">{p.address}</p>}
          {p.notes && <p className="text-xs text-gray-400 mt-1 italic">{p.notes}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onEdit(p)} className="text-gray-300 hover:text-indigo-500"><Edit2 size={15} /></button>
          <button onClick={() => onDelete(p.id)} className="text-gray-300 hover:text-red-400"><X size={16} /></button>
        </div>
      </div>
    </div>
  );
}
