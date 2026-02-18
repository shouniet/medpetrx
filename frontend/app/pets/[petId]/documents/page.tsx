"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, FileText, CheckCircle, XCircle, Loader, Eye } from "lucide-react";
import api from "@/lib/api";
import type { Document } from "@/lib/types";

const statusIcon = {
  pending: <Loader size={16} className="text-gray-400 animate-spin" />,
  processing: <Loader size={16} className="text-blue-500 animate-spin" />,
  completed: <CheckCircle size={16} className="text-green-500" />,
  failed: <XCircle size={16} className="text-red-400" />,
};

export default function DocumentsPage() {
  const { petId } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pollingDocId, setPollingDocId] = useState<number | null>(null);

  const { data: docs, isLoading } = useQuery<Document[]>({
    queryKey: ["documents", petId],
    queryFn: () => api.get(`/pets/${petId}/documents`).then((r) => r.data),
    refetchInterval: pollingDocId ? 3000 : false,
  });

  // Stop polling when completed/failed
  useEffect(() => {
    if (!pollingDocId || !docs) return;
    const doc = docs.find((d) => d.id === pollingDocId);
    if (doc && (doc.extraction_status === "completed" || doc.extraction_status === "failed")) {
      setPollingDocId(null);
      if (doc.extraction_status === "completed") {
        toast.success("Document processed! Review extracted data.");
        router.push(`/pets/${petId}/documents/${doc.id}/review`);
      } else {
        toast.error("Extraction failed. You can still view the document.");
      }
    }
  }, [docs, pollingDocId, petId, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post(`/pets/${petId}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      qc.invalidateQueries({ queryKey: ["documents", petId] });
      setPollingDocId(data.id);
      toast.success("Uploaded! Extracting medical data...");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Documents</h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {uploading ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
        <p className="text-sm text-indigo-700">
          <strong>Smart Record Parser:</strong> Upload a PDF, JPG, or PNG of a discharge note, prescription, lab report, or vaccine certificate. AI will automatically extract medications, vaccines, allergies, and problems for your review.
        </p>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      <div className="space-y-3">
        {docs?.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 text-sm">{doc.filename}</p>
                <p className="text-xs text-gray-400">{new Date(doc.upload_date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {statusIcon[doc.extraction_status]}
              <span className="text-xs text-gray-500 capitalize">{doc.extraction_status}</span>
              {doc.extraction_status === "completed" && (
                <button
                  onClick={() => router.push(`/pets/${petId}/documents/${doc.id}/review`)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  <Eye size={14} /> Review
                </button>
              )}
            </div>
          </div>
        ))}
        {docs?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Upload size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No documents uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
