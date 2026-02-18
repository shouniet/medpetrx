"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Edit3 } from "lucide-react";
import api from "@/lib/api";
import type { Document as PetDocument } from "@/lib/types";

type Decision = "approved" | "edited" | "rejected";

interface ReviewItem {
  decision: Decision;
  data: Record<string, unknown>;
}

const confidenceBadge = (c: number) => {
  if (c >= 0.8) return "bg-green-100 text-green-700";
  if (c >= 0.5) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
};

function ItemCard({ item, category, onChange }: {
  item: Record<string, unknown>;
  category: string;
  onChange: (decision: Decision, data: Record<string, unknown>) => void;
}) {
  const [decision, setDecision] = useState<Decision>("approved");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ ...item });
  const confidence = (item.confidence as number) || 0;

  const handleDecision = (d: Decision) => {
    setDecision(d);
    onChange(d, d === "edited" ? editData : item);
    if (d === "edited") setEditing(true);
    else setEditing(false);
  };

  const primaryLabel = category === "medications" ? item.drug_name : category === "vaccines" ? item.name : category === "allergies" ? item.substance_name : item.condition_name;

  return (
    <div className={`border rounded-xl p-4 ${decision === "rejected" ? "opacity-40 border-gray-200" : decision === "approved" ? "border-green-200 bg-green-50/30" : "border-blue-200 bg-blue-50/30"}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{String(primaryLabel || "")}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceBadge(confidence)}`}>
              {Math.round(confidence * 100)}% confident
            </span>
          </div>
          {Object.entries(item).filter(([k]) => k !== "confidence" && k !== (category === "medications" ? "drug_name" : category === "vaccines" ? "name" : category === "allergies" ? "substance_name" : "condition_name")).map(([k, v]) => v ? (
            <p key={k} className="text-xs text-gray-500 mt-0.5"><span className="capitalize">{k.replace(/_/g, " ")}</span>: {String(v)}</p>
          ) : null)}
        </div>
        <div className="flex gap-1 ml-3 shrink-0">
          <button onClick={() => handleDecision("approved")} title="Approve" className={`p-1 rounded-lg transition-colors ${decision === "approved" ? "bg-green-100 text-green-600" : "text-gray-300 hover:text-green-500"}`}><CheckCircle size={18} /></button>
          <button onClick={() => handleDecision("edited")} title="Edit" className={`p-1 rounded-lg transition-colors ${decision === "edited" ? "bg-blue-100 text-blue-600" : "text-gray-300 hover:text-blue-500"}`}><Edit3 size={18} /></button>
          <button onClick={() => handleDecision("rejected")} title="Reject" className={`p-1 rounded-lg transition-colors ${decision === "rejected" ? "bg-red-100 text-red-500" : "text-gray-300 hover:text-red-400"}`}><XCircle size={18} /></button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Object.entries(editData).filter(([k]) => k !== "confidence" && k !== "is_active").map(([k, v]) => (
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-0.5 capitalize">{k.replace(/_/g, " ")}</label>
              <input value={String(v || "")} onChange={(e) => setEditData((d) => { const updated = { ...d, [k]: e.target.value }; onChange("edited", updated); return updated; })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const { petId, docId } = useParams();
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, ReviewItem[]>>({ medications: [], vaccines: [], allergies: [], problems: [] });
  const [activeTab, setActiveTab] = useState("medications");

  const { data: doc, isLoading } = useQuery<PetDocument>({
    queryKey: ["document", docId],
    queryFn: async () => {
      const r = await api.get(`/documents/${docId}`);
      const d = r.data as PetDocument;
      if (d.extracted_data) {
        const ed = d.extracted_data as Record<string, unknown[]>;
        setDecisions({
          medications: (ed.medications || []).map((item) => ({ decision: "approved" as Decision, data: item as Record<string, unknown> })),
          vaccines: (ed.vaccines || []).map((item) => ({ decision: "approved" as Decision, data: item as Record<string, unknown> })),
          allergies: (ed.allergies || []).map((item) => ({ decision: "approved" as Decision, data: item as Record<string, unknown> })),
          problems: (ed.problems || []).map((item) => ({ decision: "approved" as Decision, data: item as Record<string, unknown> })),
        });
      }
      return d;
    },
  });

  const confirm = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post(`/pets/${petId}/documents/${docId}/confirm`, payload).then((r) => r.data),
    onSuccess: (data) => {
      const total = data.medications_saved + data.vaccines_saved + data.allergies_saved + data.problems_saved;
      toast.success(`Saved ${total} records!`);
      if (data.allergy_warnings?.length > 0) {
        toast.error(`⚠️ Allergy warning for: ${data.allergy_warnings[0].drug_name}`);
      }
      router.push(`/pets/${petId}/medications`);
    },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  const handleConfirm = () => {
    const payload = {
      medications: decisions.medications.map((r) => ({ decision: r.decision, ...r.data })),
      vaccines: decisions.vaccines.map((r) => ({ decision: r.decision, ...r.data })),
      allergies: decisions.allergies.map((r) => ({ decision: r.decision, ...r.data })),
      problems: decisions.problems.map((r) => ({ decision: r.decision, ...r.data })),
    };
    confirm.mutate(payload);
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading extracted data...</div>;
  if (!doc?.extracted_data) return <div className="p-8 text-center text-gray-400">No extracted data available.</div>;

  const tabs = ["medications", "vaccines", "allergies", "problems"];
  const ed = doc.extracted_data as Record<string, unknown[]>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Review Extracted Data</h2>
          <p className="text-sm text-gray-500 mt-0.5">{doc.filename}</p>
        </div>
        <button onClick={handleConfirm} disabled={confirm.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {confirm.isPending ? "Saving..." : "Confirm All & Save"}
        </button>
      </div>

      <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 mb-5">
        Review each item below. <strong>Green</strong> = approved. Click <Edit3 size={12} className="inline" /> to edit values. Click <XCircle size={12} className="inline" /> to reject items you don&apos;t want saved.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-900"}`}>
            {tab} ({(ed[tab] || []).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(ed[activeTab] || []).length === 0 && (
          <p className="text-center text-gray-400 py-8">No {activeTab} found in this document.</p>
        )}
        {decisions[activeTab]?.map((item, i) => (
          <ItemCard
            key={i}
            item={item.data}
            category={activeTab}
            onChange={(decision, data) => {
              setDecisions((d) => {
                const updated = [...d[activeTab]];
                updated[i] = { decision, data };
                return { ...d, [activeTab]: updated };
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
