"use client";

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PawPrint, Plus, AlertTriangle, Clock, Pill, Calendar, FileDown, Camera } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import type { Pet, DashboardSummary } from "@/lib/types";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: pets, isLoading } = useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: () => api.get("/pets/").then((r) => r.data),
  });

  const handleImageUpload = async (petId: number, file: File) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Please select a JPEG, PNG, WebP, or GIF image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/pets/${petId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      queryClient.invalidateQueries({ queryKey: ["pet", String(petId)] });
      toast.success("Photo updated!");
    } catch {
      toast.error("Failed to upload photo");
    }
  };

  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get("/dashboard/summary").then((r) => r.data),
  });

  const overdueCount = summary?.overdue_vaccines?.length ?? 0;
  const upcomingVaxCount = summary?.upcoming_vaccines?.length ?? 0;
  const refillCount = summary?.refill_reminders?.length ?? 0;
  const apptCount = summary?.upcoming_appointments?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your pets&apos; health records</p>
        </div>
        <Link
          href="/pets/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Pet
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (overdueCount + upcomingVaxCount + refillCount + apptCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Overdue Vaccines */}
          {overdueCount > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-red-500" />
                <h3 className="font-semibold text-red-700 text-sm">Overdue Vaccines</h3>
              </div>
              <p className="text-2xl font-bold text-red-600 mb-1">{overdueCount}</p>
              <ul className="space-y-1">
                {summary.overdue_vaccines.slice(0, 3).map((v) => (
                  <li key={v.id} className="text-xs text-red-600">
                    <Link href={`/pets/${v.pet_id}/vaccines`} className="hover:underline">
                      {v.pet_name}: {v.name} — due {new Date(v.next_due_date).toLocaleDateString()}
                    </Link>
                  </li>
                ))}
                {overdueCount > 3 && <li className="text-xs text-red-400">+{overdueCount - 3} more</li>}
              </ul>
            </div>
          )}

          {/* Upcoming Vaccines */}
          {upcomingVaxCount > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-amber-500" />
                <h3 className="font-semibold text-amber-700 text-sm">Vaccines Due Soon</h3>
              </div>
              <p className="text-2xl font-bold text-amber-600 mb-1">{upcomingVaxCount}</p>
              <ul className="space-y-1">
                {summary.upcoming_vaccines.slice(0, 3).map((v) => (
                  <li key={v.id} className="text-xs text-amber-600">
                    <Link href={`/pets/${v.pet_id}/vaccines`} className="hover:underline">
                      {v.pet_name}: {v.name} — {new Date(v.next_due_date).toLocaleDateString()}
                    </Link>
                  </li>
                ))}
                {upcomingVaxCount > 3 && <li className="text-xs text-amber-400">+{upcomingVaxCount - 3} more</li>}
              </ul>
            </div>
          )}

          {/* Refill Reminders */}
          {refillCount > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Pill size={18} className="text-purple-500" />
                <h3 className="font-semibold text-purple-700 text-sm">Refills Needed</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600 mb-1">{refillCount}</p>
              <ul className="space-y-1">
                {summary.refill_reminders.slice(0, 3).map((m) => (
                  <li key={m.id} className="text-xs text-purple-600">
                    <Link href={`/pets/${m.pet_id}/medications`} className="hover:underline">
                      {m.pet_name}: {m.drug_name} — {new Date(m.refill_reminder_date).toLocaleDateString()}
                    </Link>
                  </li>
                ))}
                {refillCount > 3 && <li className="text-xs text-purple-400">+{refillCount - 3} more</li>}
              </ul>
            </div>
          )}

          {/* Upcoming Appointments */}
          {apptCount > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-blue-500" />
                <h3 className="font-semibold text-blue-700 text-sm">Upcoming Appts</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-1">{apptCount}</p>
              <ul className="space-y-1">
                {summary.upcoming_appointments.slice(0, 3).map((a) => (
                  <li key={a.id} className="text-xs text-blue-600">
                    <Link href={`/pets/${a.pet_id}/appointments`} className="hover:underline">
                      {a.pet_name}: {a.title} — {new Date(a.appointment_date).toLocaleDateString()}
                    </Link>
                  </li>
                ))}
                {apptCount > 3 && <li className="text-xs text-blue-400">+{apptCount - 3} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-400">Loading your pets...</div>
      )}

      {!isLoading && pets?.length === 0 && (
        <div className="text-center py-16">
          <PawPrint size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-600">No pets yet</h2>
          <p className="text-gray-400 text-sm mt-1">Add your first pet to get started.</p>
          <Link
            href="/pets/new"
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Pet
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pets?.map((pet) => (
          <div
            key={pet.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                onClick={() => fileInputRefs.current[pet.id]?.click()}
                className="relative w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer group"
                title="Click to upload photo"
              >
                {pet.image_url ? (
                  <img src={`/api${pet.image_url}`} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <PawPrint className="text-indigo-600" size={22} />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
              <input
                ref={(el) => { fileInputRefs.current[pet.id] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(pet.id, file);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{pet.name}</h3>
                <p className="text-sm text-gray-500">
                  {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/pets/${pet.id}/medications`} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">Medications</Link>
              <Link href={`/pets/${pet.id}/vaccines`} className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition-colors">Vaccines</Link>
              <Link href={`/pets/${pet.id}/vitals`} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">Vitals</Link>
              <Link href={`/pets/${pet.id}/appointments`} className="text-xs bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full hover:bg-cyan-100 transition-colors">Appointments</Link>
              <Link href={`/pets/${pet.id}/allergies`} className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full hover:bg-red-100 transition-colors">Allergies</Link>
              <Link href={`/pets/${pet.id}/emergency`} className="text-xs bg-orange-50 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">Emergency</Link>
            </div>
            {/* Export button */}
            <div className="mt-3 pt-3 border-t border-gray-50">
              <button
                onClick={async () => {
                  try {
                    const res = await api.get(`/pets/${pet.id}/export/pdf`, { responseType: "blob" });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${pet.name}_medical_record.txt`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch { /* ignore */ }
                }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <FileDown size={13} /> Export Medical Record
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
