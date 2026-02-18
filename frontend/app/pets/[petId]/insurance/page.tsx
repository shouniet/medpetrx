"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Insurance, COVERAGE_TYPE_LABELS, CoverageType } from "@/lib/types";
import toast from "react-hot-toast";
import { Shield, ShieldOff, Save, Loader2, Edit2, X } from "lucide-react";

export default function InsurancePage() {
  const { petId } = useParams();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    has_insurance: false,
    provider_name: "",
    policy_number: "",
    group_number: "",
    phone: "",
    coverage_type: "" as string,
    deductible: "",
    co_pay_percent: "",
    annual_limit: "",
    effective_date: "",
    expiration_date: "",
    notes: "",
  });

  const { data: insurance, isLoading } = useQuery<Insurance | null>({
    queryKey: ["insurance", petId],
    queryFn: async () => {
      const { data } = await api.get(`/pets/${petId}/insurance`);
      return data;
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (insurance) {
      setForm({
        has_insurance: insurance.has_insurance,
        provider_name: insurance.provider_name ?? "",
        policy_number: insurance.policy_number ?? "",
        group_number: insurance.group_number ?? "",
        phone: insurance.phone ?? "",
        coverage_type: insurance.coverage_type ?? "",
        deductible: insurance.deductible?.toString() ?? "",
        co_pay_percent: insurance.co_pay_percent?.toString() ?? "",
        annual_limit: insurance.annual_limit?.toString() ?? "",
        effective_date: insurance.effective_date
          ? insurance.effective_date.split("T")[0]
          : "",
        expiration_date: insurance.expiration_date
          ? insurance.expiration_date.split("T")[0]
          : "",
        notes: insurance.notes ?? "",
      });
    }
  }, [insurance]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        has_insurance: form.has_insurance,
        provider_name: form.provider_name || null,
        policy_number: form.policy_number || null,
        group_number: form.group_number || null,
        phone: form.phone || null,
        coverage_type: form.coverage_type || null,
        deductible: form.deductible ? parseFloat(form.deductible) : null,
        co_pay_percent: form.co_pay_percent
          ? parseFloat(form.co_pay_percent)
          : null,
        annual_limit: form.annual_limit
          ? parseFloat(form.annual_limit)
          : null,
        effective_date: form.effective_date || null,
        expiration_date: form.expiration_date || null,
        notes: form.notes || null,
      };
      const { data } = await api.put(`/pets/${petId}/insurance`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance", petId] });
      toast.success("Insurance saved");
      setEditing(false);
    },
    onError: () => toast.error("Failed to save insurance"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleCancel = () => {
    // Reset form to current data
    if (insurance) {
      setForm({
        has_insurance: insurance.has_insurance,
        provider_name: insurance.provider_name ?? "",
        policy_number: insurance.policy_number ?? "",
        group_number: insurance.group_number ?? "",
        phone: insurance.phone ?? "",
        coverage_type: insurance.coverage_type ?? "",
        deductible: insurance.deductible?.toString() ?? "",
        co_pay_percent: insurance.co_pay_percent?.toString() ?? "",
        annual_limit: insurance.annual_limit?.toString() ?? "",
        effective_date: insurance.effective_date
          ? insurance.effective_date.split("T")[0]
          : "",
        expiration_date: insurance.expiration_date
          ? insurance.expiration_date.split("T")[0]
          : "",
        notes: insurance.notes ?? "",
      });
    } else {
      setForm({
        has_insurance: false,
        provider_name: "",
        policy_number: "",
        group_number: "",
        phone: "",
        coverage_type: "",
        deductible: "",
        co_pay_percent: "",
        annual_limit: "",
        effective_date: "",
        expiration_date: "",
        notes: "",
      });
    }
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasRecord = insurance !== null && insurance !== undefined;
  const isInsured = hasRecord && insurance.has_insurance;

  // View mode (not editing)
  if (!editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Insurance</h1>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Edit2 className="h-4 w-4" />
            {hasRecord ? "Edit" : "Add Insurance"}
          </button>
        </div>

        {!hasRecord ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <ShieldOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No insurance information on file</p>
            <p className="text-gray-400 text-sm mt-1">
              Click &quot;Add Insurance&quot; to enter details or mark as uninsured
            </p>
          </div>
        ) : !isInsured ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <ShieldOff className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-700 text-lg font-medium">No Insurance</p>
            <p className="text-gray-400 text-sm mt-1">
              This pet is marked as having no insurance coverage
            </p>
            {insurance.notes && (
              <p className="text-gray-500 text-sm mt-4 italic">{insurance.notes}</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {/* Status header */}
            <div className="p-6 flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {insurance.provider_name || "Insurance Active"}
                </p>
                <p className="text-sm text-green-600 font-medium">Insured</p>
              </div>
            </div>

            {/* Policy details */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Detail label="Policy Number" value={insurance.policy_number} />
              <Detail label="Group Number" value={insurance.group_number} />
              <Detail label="Phone" value={insurance.phone} />
              <Detail
                label="Coverage Type"
                value={
                  insurance.coverage_type
                    ? COVERAGE_TYPE_LABELS[insurance.coverage_type as CoverageType] ??
                      insurance.coverage_type
                    : null
                }
              />
              <Detail
                label="Deductible"
                value={
                  insurance.deductible != null
                    ? `$${Number(insurance.deductible).toFixed(2)}`
                    : null
                }
              />
              <Detail
                label="Co-Pay"
                value={
                  insurance.co_pay_percent != null
                    ? `${Number(insurance.co_pay_percent)}%`
                    : null
                }
              />
              <Detail
                label="Annual Limit"
                value={
                  insurance.annual_limit != null
                    ? `$${Number(insurance.annual_limit).toLocaleString()}`
                    : null
                }
              />
              <Detail
                label="Effective Date"
                value={
                  insurance.effective_date
                    ? new Date(insurance.effective_date).toLocaleDateString()
                    : null
                }
              />
              <Detail
                label="Expiration Date"
                value={
                  insurance.expiration_date
                    ? new Date(insurance.expiration_date).toLocaleDateString()
                    : null
                }
              />
            </div>

            {/* Notes */}
            {insurance.notes && (
              <div className="p-6">
                <p className="text-sm text-gray-500 font-medium mb-1">Notes</p>
                <p className="text-gray-700">{insurance.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Insurance</h1>
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6"
      >
        {/* Insurance toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.has_insurance}
              onChange={(e) =>
                setForm({ ...form, has_insurance: e.target.checked })
              }
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-900">
            {form.has_insurance ? "Has Insurance" : "No Insurance"}
          </span>
        </div>

        {form.has_insurance && (
          <>
            {/* Provider info */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Provider Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={form.provider_name}
                    onChange={(e) =>
                      setForm({ ...form, provider_name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Trupanion, Nationwide"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Insurance company phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    value={form.policy_number}
                    onChange={(e) =>
                      setForm({ ...form, policy_number: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Policy #"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Number
                  </label>
                  <input
                    type="text"
                    value={form.group_number}
                    onChange={(e) =>
                      setForm({ ...form, group_number: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Group #"
                  />
                </div>
              </div>
            </div>

            {/* Coverage details */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Coverage Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coverage Type
                  </label>
                  <select
                    value={form.coverage_type}
                    onChange={(e) =>
                      setForm({ ...form, coverage_type: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select type</option>
                    {Object.entries(COVERAGE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deductible ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.deductible}
                    onChange={(e) =>
                      setForm({ ...form, deductible: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Co-Pay (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={form.co_pay_percent}
                    onChange={(e) =>
                      setForm({ ...form, co_pay_percent: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. 20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Limit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.annual_limit}
                    onChange={(e) =>
                      setForm({ ...form, annual_limit: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={form.effective_date}
                    onChange={(e) =>
                      setForm({ ...form, effective_date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={form.expiration_date}
                    onChange={(e) =>
                      setForm({ ...form, expiration_date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div className="border-t border-gray-100 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Insurance
          </button>
        </div>
      </form>
    </div>
  );
}

/* Small helper for the view mode */
function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  );
}
