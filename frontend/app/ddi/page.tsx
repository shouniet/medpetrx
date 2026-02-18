"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Zap, AlertCircle, CheckCircle, Users } from "lucide-react";
import api from "@/lib/api";
import type { Pet } from "@/lib/types";
import Sidebar from "@/components/layout/Sidebar";

export default function DDIPage() {
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [results, setResults] = useState<{ drugs_checked: string[]; interactions: Record<string, unknown>[]; disclaimer: string } | null>(null);

  const { data: pets } = useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: () => api.get("/pets/").then((r) => r.data),
  });

  const check = useMutation({
    mutationFn: () =>
      api.post(`/pets/${selectedPetId}/medications/check-interactions`, { drug_names: null }).then((r) => r.data),
    onSuccess: (data) => {
      setResults(data);
      if (data.drugs_checked.length === 0) {
        toast.error("No active medications found for this pet.");
      }
    },
    onError: () => toast.error("Failed to check interactions"),
  });

  const checkAll = useMutation({
    mutationFn: () =>
      api.post("/medications/check-interactions-all-pets", {}).then((r) => r.data),
    onSuccess: (data) => {
      setResults(data);
      if (data.drugs_checked.length === 0) {
        toast.error("No active medications found across any of your pets.");
      }
    },
    onError: () => toast.error("Failed to check interactions"),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="text-indigo-600" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">Drug Interaction Checker</h1>
          </div>
          <p className="text-gray-500 text-sm mb-6">Check active medications for potential drug–drug interactions using OpenFDA data.</p>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-5">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Pet</label>
                <select
                  value={selectedPetId}
                  onChange={(e) => { setSelectedPetId(e.target.value); setResults(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a pet...</option>
                  {pets?.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => check.mutate()}
                disabled={!selectedPetId || check.isPending}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {check.isPending ? "Checking..." : "Check Pet"}
              </button>
              {(pets?.length ?? 0) > 1 && (
                <button
                  onClick={() => { setSelectedPetId(""); checkAll.mutate(); }}
                  disabled={checkAll.isPending}
                  className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <Users size={15} />
                  {checkAll.isPending ? "Checking..." : "Check All Pets"}
                </button>
              )}
            </div>
            {(pets?.length ?? 0) > 1 && (
              <p className="text-xs text-gray-400 mt-2">
                &quot;Check All Pets&quot; scans active medications across all your pets for household interactions.
              </p>
            )}
          </div>

          {results && (
            <div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Drugs Checked ({results.drugs_checked.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {results.drugs_checked.map((d, i) => (
                    <span key={i} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">{d}</span>
                  ))}
                  {results.drugs_checked.length === 0 && <p className="text-gray-400 text-sm">No active medications found.</p>}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {results.interactions.map((item, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {(item.found as boolean) ? <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" /> : <CheckCircle size={18} className="text-gray-300 mt-0.5 shrink-0" />}
                      <div>
                        <p className="font-semibold text-gray-900">{String(item.drug)}</p>
                        {(item.found as boolean) && item.interactions_text ? (
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{String(item.interactions_text).slice(0, 400)}{(item.interactions_text as string).length > 400 ? "..." : ""}</p>
                        ) : (
                          <p className="text-sm text-gray-400 mt-0.5">{String(item.note || "No interaction data found in OpenFDA")}</p>
                        )}
                        {(item.found as boolean) && <p className="text-xs text-gray-400 mt-1">Source: {String(item.source)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-800">{results.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
