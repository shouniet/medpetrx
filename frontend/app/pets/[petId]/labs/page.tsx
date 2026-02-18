"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, X, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { Lab, LabType, LabTemplateField } from "@/lib/types";
import { LAB_TYPE_LABELS, LAB_TEMPLATES } from "@/lib/types";

const LAB_TYPES: LabType[] = ["chemistry", "electrolytes", "cbc", "nsaid_screen", "urinalysis", "thyroid", "other"];

export default function LabsPage() {
  const { petId } = useParams();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("");

  const { data: labs, isLoading } = useQuery<Lab[]>({
    queryKey: ["labs", petId, filterType],
    queryFn: () => {
      const params = filterType ? `?lab_type=${filterType}` : "";
      return api.get(`/pets/${petId}/labs${params}`).then((r) => r.data);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pets/${petId}/labs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labs", petId] });
      toast.success("Lab removed");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Labs</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={15} /> Add Lab Result
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Lab Types</option>
          {LAB_TYPES.map((t) => (
            <option key={t} value={t}>
              {LAB_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* New lab form */}
      {showForm && (
        <NewLabForm
          petId={petId as string}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["labs", petId] });
            setShowForm(false);
          }}
        />
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {labs?.map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            expanded={expandedId === lab.id}
            onToggle={() => setExpandedId(expandedId === lab.id ? null : lab.id)}
            onDelete={() => {
              if (confirm("Remove this lab result?")) remove.mutate(lab.id);
            }}
          />
        ))}
        {labs?.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 py-8">No lab results recorded yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── Lab Card ───────────────────────────────────────────── */
function LabCard({
  lab,
  expanded,
  onToggle,
  onDelete,
}: {
  lab: Lab;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const template = LAB_TEMPLATES[lab.lab_type] as LabTemplateField[] | undefined;
  const results = lab.results || {};
  const filledCount = Object.values(results).filter((v) => v !== "" && v != null).length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <FlaskConical size={18} className="text-indigo-500 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900">
              {LAB_TYPE_LABELS[lab.lab_type] || lab.lab_type}
            </p>
            {lab.lab_date && (
              <p className="text-sm text-gray-500">{lab.lab_date.split("T")[0]}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {lab.clinic && (
                <span className="text-xs text-gray-400">{lab.clinic}</span>
              )}
              {lab.veterinarian && (
                <span className="text-xs text-gray-400">• Dr. {lab.veterinarian}</span>
              )}
              <span className="text-xs text-indigo-500 font-medium">
                {filledCount} value{filledCount !== 1 ? "s" : ""} recorded
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-300 hover:text-red-400"
          >
            <X size={16} />
          </button>
          {expanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {/* Results Grid */}
          {template && template.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {template.map((field) => {
                const val = results[field.key];
                if (!val && val !== "0") return null;
                return (
                  <div
                    key={field.key}
                    className="bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <p className="text-xs text-gray-500">{field.label}</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {val}{" "}
                      {field.unit && (
                        <span className="text-xs text-gray-400 font-normal">
                          {field.unit}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            /* For "other" lab type or unrecognised, show raw key-value */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(results).map(([k, v]) =>
                v ? (
                  <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">{k.replace(/_/g, " ")}</p>
                    <p className="font-semibold text-gray-900 text-sm">{v}</p>
                  </div>
                ) : null,
              )}
            </div>
          )}

          {lab.notes && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-gray-700">
              <span className="font-medium text-amber-700">Notes: </span>
              {lab.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── New Lab Form ───────────────────────────────────────── */
function NewLabForm({
  petId,
  onClose,
  onSaved,
}: {
  petId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [labType, setLabType] = useState<LabType>("chemistry");
  const [labDate, setLabDate] = useState("");
  const [veterinarian, setVeterinarian] = useState("");
  const [clinic, setClinic] = useState("");
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const template = LAB_TEMPLATES[labType] as LabTemplateField[] | undefined;

  const setResult = (key: string, value: string) =>
    setResults((prev) => ({ ...prev, [key]: value }));

  const addCustomField = () =>
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);

  const updateCustomField = (idx: number, field: "key" | "value", value: string) =>
    setCustomFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)),
    );

  const removeCustomField = (idx: number) =>
    setCustomFields((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Merge template results + custom fields
    const allResults: Record<string, string> = { ...results };
    for (const cf of customFields) {
      if (cf.key.trim() && cf.value.trim()) {
        allResults[cf.key.trim().toLowerCase().replace(/\s+/g, "_")] = cf.value.trim();
      }
    }

    // Remove empty values
    const cleanResults: Record<string, string> = {};
    for (const [k, v] of Object.entries(allResults)) {
      if (v && v.trim()) cleanResults[k] = v.trim();
    }

    try {
      await api.post(`/pets/${petId}/labs`, {
        lab_type: labType,
        lab_date: labDate || null,
        veterinarian: veterinarian || null,
        clinic: clinic || null,
        results: Object.keys(cleanResults).length > 0 ? cleanResults : null,
        notes: notes || null,
      });
      toast.success("Lab result saved!");
      onSaved();
    } catch {
      toast.error("Failed to save lab result");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">New Lab Result</h3>
        <button onClick={onClose}>
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Lab Type <span className="text-red-500">*</span>
            </label>
            <select
              value={labType}
              onChange={(e) => {
                setLabType(e.target.value as LabType);
                setResults({});
                setCustomFields([]);
              }}
              className={inputCls}
            >
              {LAB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LAB_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={labDate} onChange={(e) => setLabDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Veterinarian</label>
            <input type="text" value={veterinarian} onChange={(e) => setVeterinarian(e.target.value)} className={inputCls} placeholder="Dr. Smith" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Clinic</label>
            <input type="text" value={clinic} onChange={(e) => setClinic(e.target.value)} className={inputCls} placeholder="Happy Paws Vet" />
          </div>
        </div>

        {/* Template fields */}
        {template && template.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {LAB_TYPE_LABELS[labType]} Values
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {template.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-gray-600 mb-1">
                    {field.label}
                    {field.unit && (
                      <span className="text-gray-400 ml-1">({field.unit})</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={results[field.key] || ""}
                    onChange={(e) => setResult(field.key, e.target.value)}
                    className={inputCls}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom fields (always available) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {labType === "other" ? "Values" : "Additional Values"}
            </p>
            <button
              type="button"
              onClick={addCustomField}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add Field
            </button>
          </div>
          {customFields.map((cf, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={cf.key}
                onChange={(e) => updateCustomField(idx, "key", e.target.value)}
                className={`${inputCls} flex-1`}
                placeholder="Test name"
              />
              <input
                type="text"
                value={cf.value}
                onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                className={`${inputCls} flex-1`}
                placeholder="Value"
              />
              <button
                type="button"
                onClick={() => removeCustomField(idx)}
                className="text-gray-300 hover:text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="Any additional notes from the vet..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Lab Result"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
