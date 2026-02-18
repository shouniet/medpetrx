"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CommonMedication } from "@/lib/types";
import Sidebar from "@/components/layout/Sidebar";
import {
  Search,
  Pill,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Dog,
  Cat,
  Loader2,
  Filter,
} from "lucide-react";

export default function MedicationsReferencePage() {
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{
    medications: CommonMedication[];
    total: number;
  }>({
    queryKey: ["common-medications", search, speciesFilter, classFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (speciesFilter) params.set("species", speciesFilter);
      if (classFilter) params.set("drug_class", classFilter);
      const { data } = await api.get(
        `/common-medications?${params.toString()}`
      );
      return data;
    },
  });

  const { data: classesData } = useQuery<{ drug_classes: string[] }>({
    queryKey: ["common-medications-classes"],
    queryFn: () =>
      api.get("/common-medications/drug-classes").then((r) => r.data),
  });

  const meds = data?.medications ?? [];
  const drugClasses = classesData?.drug_classes ?? [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pill className="h-6 w-6 text-indigo-600" />
              Common Pet Medications
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Reference guide with dosing, indications, and side effects
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, class, indication, or side effect..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Species filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
                <select
                  value={speciesFilter}
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Species</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                </select>

                {/* Class filter */}
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 max-w-[200px]"
                >
                  <option value="">All Classes</option>
                  {drugClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {data && (
              <p className="text-xs text-gray-400 mt-2">
                Showing {meds.length} medication{meds.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          )}

          {/* No results */}
          {!isLoading && meds.length === 0 && (
            <div className="text-center py-16">
              <Pill className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No medications match your search.</p>
            </div>
          )}

          {/* Medication cards */}
          <div className="space-y-3">
            {meds.map((med, idx) => {
              const isExpanded = expandedIdx === idx;
              return (
                <div
                  key={med.drug_name}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all"
                >
                  {/* Header (clickable) */}
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {med.drug_name}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                          {med.drug_class}
                        </span>
                        {/* Species badges */}
                        <div className="flex gap-1">
                          {med.species.includes("dog") && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                              <Dog className="h-3 w-3" /> Dog
                            </span>
                          )}
                          {med.species.includes("cat") && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                              <Cat className="h-3 w-3" /> Cat
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {med.common_indications}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0 ml-3" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 ml-3" />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 pb-5">
                      {/* Indications */}
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Common Indications
                        </h4>
                        <p className="text-sm text-gray-700">
                          {med.common_indications}
                        </p>
                      </div>

                      {/* Dosing & Route */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Typical Dose
                          </h4>
                          <p className="text-sm text-gray-700">
                            {med.typical_dose}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Route
                          </h4>
                          <p className="text-sm text-gray-700">{med.route}</p>
                        </div>
                      </div>

                      {/* Side effects */}
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Common Side Effects
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {med.common_side_effects.map((se) => (
                            <span
                              key={se}
                              className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg"
                            >
                              {se}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Warnings */}
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                              Warnings & Precautions
                            </h4>
                            <p className="text-sm text-amber-900">
                              {med.warnings}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <div className="mt-8 text-center text-xs text-gray-400 pb-6">
            <p>
              This reference is for informational purposes only. Always consult
              your veterinarian before administering any medication. Dosages and
              indications may vary based on your pet&apos;s specific condition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
