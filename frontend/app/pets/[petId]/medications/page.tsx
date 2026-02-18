"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Plus,
  AlertTriangle,
  X,
  Search,
  Pill,
  ChevronRight,
  PenLine,
  ArrowLeft,
} from "lucide-react";
import api from "@/lib/api";
import type { Medication, AllergyBrief, CommonMedication, Pet } from "@/lib/types";

type AddStep = "closed" | "pick" | "form";

export default function MedicationsPage() {
  const { petId } = useParams();
  const qc = useQueryClient();

  const [addStep, setAddStep] = useState<AddStep>("closed");
  const [pickSearch, setPickSearch] = useState("");
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyBrief[]>([]);
  const [pendingForm, setPendingForm] = useState<Record<string, string> | null>(null);
  const [form, setForm] = useState({
    drug_name: "", strength: "", directions: "", indication: "",
    start_date: "", stop_date: "", prescriber: "", pharmacy: "",
    refill_reminder_date: "", is_active: "true",
  });

  // Fetch the pet so we can filter by species
  const { data: pet } = useQuery<Pet>({
    queryKey: ["pet", petId],
    queryFn: () => api.get(`/pets/${petId}`).then((r) => r.data),
  });

  const { data: meds, isLoading } = useQuery<Medication[]>({
    queryKey: ["medications", petId],
    queryFn: () => api.get(`/pets/${petId}/medications/`).then((r) => r.data),
  });

  // Fetch common meds, filtered by search + species
  const petSpecies = pet?.species?.toLowerCase() ?? "";
  const { data: commonMedsData } = useQuery<{ medications: CommonMedication[]; total: number }>({
    queryKey: ["common-medications", pickSearch, petSpecies],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (pickSearch) params.set("search", pickSearch);
      if (petSpecies && (petSpecies === "dog" || petSpecies === "cat")) {
        params.set("species", petSpecies);
      }
      const { data } = await api.get(`/common-medications?${params.toString()}`);
      return data;
    },
    enabled: addStep === "pick",
  });
  const commonMeds = commonMedsData?.medications ?? [];

  const createMed = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/pets/${petId}/medications/`, data).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["medications", petId] });
      closeAdd();
      if (data.allergy_warnings?.length > 0) {
        toast.error(`Saved! ⚠️ Allergy warning: ${data.allergy_warnings[0].substance_name}`);
      } else {
        toast.success("Medication added!");
      }
    },
    onError: () => toast.error("Failed to save medication"),
  });

  const deleteMed = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/medications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications", petId] });
      toast.success("Removed");
    },
  });

  const resetForm = () => setForm({ drug_name: "", strength: "", directions: "", indication: "", start_date: "", stop_date: "", prescriber: "", pharmacy: "", refill_reminder_date: "", is_active: "true" });

  const closeAdd = () => {
    setAddStep("closed");
    setPickSearch("");
    resetForm();
  };

  /** User picks a common med — pre-fill the form and go to form step */
  const selectCommonMed = (med: CommonMedication) => {
    setForm({
      drug_name: med.drug_name,
      strength: "",
      directions: med.typical_dose,
      indication: med.common_indications,
      start_date: "",
      stop_date: "",
      prescriber: "",
      pharmacy: "",
      refill_reminder_date: "",
      is_active: "true",
    });
    setAddStep("form");
  };

  /** User wants to enter a custom med */
  const startCustom = () => {
    resetForm();
    setAddStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/pets/${petId}/medications/check-allergies`, { drug_name: form.drug_name });
      if (data.allergy_matches?.length > 0) {
        setAllergyWarnings(data.allergy_matches);
        setPendingForm({ ...form });
        return;
      }
    } catch { /* proceed */ }
    submitMedication(form);
  };

  const submitMedication = (f: Record<string, string>) => {
    const payload: Record<string, unknown> = { drug_name: f.drug_name, is_active: f.is_active === "true" };
    if (f.strength) payload.strength = f.strength;
    if (f.directions) payload.directions = f.directions;
    if (f.indication) payload.indication = f.indication;
    if (f.start_date) payload.start_date = f.start_date;
    if (f.stop_date) payload.stop_date = f.stop_date;
    if (f.prescriber) payload.prescriber = f.prescriber;
    if (f.pharmacy) payload.pharmacy = f.pharmacy;
    if (f.refill_reminder_date) payload.refill_reminder_date = f.refill_reminder_date;
    createMed.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Medications</h2>
        {addStep === "closed" && (
          <button
            onClick={() => setAddStep("pick")}
            className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={15} /> Add Medication
          </button>
        )}
      </div>

      {/* ── Allergy warning modal ───────────────────────────── */}
      {allergyWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={22} />
              <h3 className="text-lg font-bold">Allergy Warning</h3>
            </div>
            <p className="text-gray-700 mb-3">This pet has a known drug allergy that may conflict:</p>
            {allergyWarnings.map((w, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="font-medium text-red-800">{w.substance_name}</p>
                {w.severity && <p className="text-sm text-red-600">Severity: {w.severity}</p>}
                {w.reaction_desc && <p className="text-sm text-red-600">{w.reaction_desc}</p>}
              </div>
            ))}
            <p className="text-sm text-gray-500 mb-4">Do you want to save this medication anyway?</p>
            <div className="flex gap-3">
              <button onClick={() => { if (pendingForm) submitMedication(pendingForm); setAllergyWarnings([]); setPendingForm(null); }} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                Save Anyway
              </button>
              <button onClick={() => { setAllergyWarnings([]); setPendingForm(null); }} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Pick from common medications ────────────── */}
      {addStep === "pick" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Choose a Medication</h3>
            <button onClick={closeAdd}>
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search medications..."
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>
            {petSpecies && (
              <p className="text-xs text-gray-400 mt-1.5">
                Showing medications for <span className="font-medium capitalize">{petSpecies}s</span>
              </p>
            )}
          </div>

          {/* Common meds list */}
          <div className="max-h-80 overflow-y-auto px-2 py-2">
            {commonMeds.map((med) => (
              <button
                key={med.drug_name}
                type="button"
                onClick={() => selectCommonMed(med)}
                className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-indigo-50 transition-colors group"
              >
                <Pill className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {med.drug_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {med.drug_class} — {med.common_indications}
                  </p>
                  {med.common_side_effects.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {med.common_side_effects.slice(0, 3).map((se) => (
                        <span key={se} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
                          {se}
                        </span>
                      ))}
                      {med.common_side_effects.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">
                          +{med.common_side_effects.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 flex-shrink-0" />
              </button>
            ))}

            {commonMeds.length === 0 && pickSearch && (
              <p className="text-center text-gray-400 text-sm py-6">
                No common medications match &quot;{pickSearch}&quot;
              </p>
            )}
          </div>

          {/* Custom entry option */}
          <div className="border-t border-gray-100 px-5 py-3">
            <button
              type="button"
              onClick={startCustom}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <PenLine className="h-4 w-4" />
              Enter a custom medication instead
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Fill in details form ────────────────────── */}
      {addStep === "form" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setAddStep("pick"); setPickSearch(""); }}
                className="text-gray-400 hover:text-gray-600"
                title="Back to list"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="font-semibold text-gray-900">Medication Details</h3>
            </div>
            <button onClick={closeAdd}>
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* Pre-filled indicator */}
          {form.drug_name && (
            <div className="flex items-center gap-2 mb-4 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <Pill className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-indigo-700 font-medium">{form.drug_name}</span>
              <span className="text-xs text-indigo-400">— review & edit the details below</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ["drug_name", "Drug Name *", true],
              ["strength", "Strength (e.g. 5mg)"],
              ["directions", "Directions (SIG)"],
              ["indication", "Indication"],
              ["start_date", "Start Date", false, "date"],
              ["stop_date", "Stop Date", false, "date"],
              ["prescriber", "Prescriber"],
              ["pharmacy", "Pharmacy"],
              ["refill_reminder_date", "Refill Reminder", false, "date"],
            ].map(([key, label, req, type]) => (
              <div key={key as string}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label as string}</label>
                <input
                  type={(type as string) || "text"}
                  required={!!req}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key as string]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div className="md:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={createMed.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {createMed.isPending ? "Saving..." : "Save Medication"}
              </button>
              <button type="button" onClick={closeAdd} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Medication list ─────────────────────────────────── */}
      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {meds?.map((med) => (
          <div key={med.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{med.drug_name}</h3>
                  {med.strength && <span className="text-sm text-gray-500">{med.strength}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${med.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {med.is_active ? "Active" : "Past"}
                  </span>
                </div>
                {med.directions && <p className="text-sm text-gray-600 mt-1">{med.directions}</p>}
                {med.indication && <p className="text-xs text-gray-400 mt-0.5">For: {med.indication}</p>}
              </div>
              <button onClick={() => { if (confirm("Remove this medication?")) deleteMed.mutate(med.id); }} className="text-gray-300 hover:text-red-400 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
        {meds?.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 py-8">No medications recorded yet.</p>
        )}
      </div>
    </div>
  );
}
