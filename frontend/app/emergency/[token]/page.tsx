"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Pill, Activity, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

interface EmergencySummary {
  pet_name: string;
  species: string;
  breed: string | null;
  active_medications: { drug_name: string; strength: string | null; directions: string | null; indication: string | null }[];
  allergies: { substance_name: string; allergy_type: string; severity: string | null; reaction_desc: string | null }[];
  active_problems: { condition_name: string; notes: string | null }[];
  disclaimer: string;
  generated_at: string;
}

const severityColor: Record<string, string> = {
  Severe: "bg-red-100 text-red-700 border-red-200",
  Moderate: "bg-orange-100 text-orange-700 border-orange-200",
  Mild: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function PublicEmergencyPage() {
  const { token } = useParams();

  const { data, isLoading, error } = useQuery<EmergencySummary>({
    queryKey: ["emergency", token],
    queryFn: () => api.get(`/emergency/${token}`).then((r) => r.data),
    retry: false,
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <p className="text-red-600 font-medium">Loading emergency record...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertTriangle size={48} className="mx-auto text-red-400 mb-3" />
        <h1 className="text-xl font-bold text-gray-800">Link Not Found or Expired</h1>
        <p className="text-gray-500 mt-2 text-sm">This emergency share link has expired or been revoked by the pet owner.</p>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="min-h-screen bg-red-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-red-600 text-white rounded-2xl p-6 mb-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={24} />
            <span className="text-sm font-medium uppercase tracking-wide">Emergency Medical Record</span>
          </div>
          <h1 className="text-3xl font-bold">{data.pet_name}</h1>
          <p className="text-red-100 mt-1">{data.species}{data.breed ? ` · ${data.breed}` : ""}</p>
          <p className="text-red-200 text-xs mt-2">Generated: {new Date(data.generated_at).toLocaleString()}</p>
        </div>

        {/* Allergies — shown first for ER priority */}
        {data.allergies.length > 0 && (
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border-2 border-red-200">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="text-red-600" size={20} />
              <h2 className="font-bold text-red-700 text-lg">ALLERGIES & ADRs</h2>
            </div>
            <div className="space-y-2">
              {data.allergies.map((a, i) => (
                <div key={i} className={`border rounded-xl px-4 py-3 ${severityColor[a.severity || ""] || "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{a.substance_name}</p>
                    <div className="flex gap-2">
                      <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">{a.allergy_type}</span>
                      {a.severity && <span className="text-xs font-bold">{a.severity}</span>}
                    </div>
                  </div>
                  {a.reaction_desc && <p className="text-sm mt-0.5 opacity-80">{a.reaction_desc}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Medications */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="text-blue-600" size={20} />
            <h2 className="font-bold text-gray-800 text-lg">Active Medications</h2>
          </div>
          {data.active_medications.length === 0 ? (
            <p className="text-gray-400 text-sm">No active medications on record.</p>
          ) : (
            <div className="space-y-2">
              {data.active_medications.map((m, i) => (
                <div key={i} className="bg-blue-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{m.drug_name}</p>
                    {m.strength && <span className="text-sm text-gray-500">{m.strength}</span>}
                  </div>
                  {m.directions && <p className="text-sm text-gray-600 mt-0.5">{m.directions}</p>}
                  {m.indication && <p className="text-xs text-gray-400">For: {m.indication}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Problems */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="text-purple-600" size={20} />
            <h2 className="font-bold text-gray-800 text-lg">Active Problems</h2>
          </div>
          {data.active_problems.length === 0 ? (
            <p className="text-gray-400 text-sm">No active problems on record.</p>
          ) : (
            <div className="space-y-2">
              {data.active_problems.map((p, i) => (
                <div key={i} className="bg-purple-50 rounded-xl px-4 py-3">
                  <p className="font-semibold text-gray-900">{p.condition_name}</p>
                  {p.notes && <p className="text-sm text-gray-600 mt-0.5">{p.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500">{data.disclaimer}</p>
          <p className="text-xs text-gray-400 mt-1">This record was shared by the pet owner via MedPetRx.</p>
        </div>
      </div>
    </div>
  );
}
