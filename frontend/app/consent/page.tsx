"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function ConsentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);

  const allChecked = checked1 && checked2 && checked3;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.post("/auth/consent");
      toast.success("Welcome to MedPetRx!");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to save consent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-700">Before You Begin</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Please review and agree to the following before using MedPetRx.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked1}
              onChange={(e) => setChecked1(e.target.checked)}
              className="mt-1 h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">
              <strong>Data Storage Consent:</strong> I agree that my pet&apos;s health data will be
              stored securely by MedPetRx. I can revoke access and delete my data at any time from
              Settings.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked2}
              onChange={(e) => setChecked2(e.target.checked)}
              className="mt-1 h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">
              <strong>Not a Veterinary Provider:</strong> I understand that MedPetRx is a
              pet owner tool and is not operated by a licensed veterinary provider. All
              information is for reference only and is not medical advice.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked3}
              onChange={(e) => setChecked3(e.target.checked)}
              className="mt-1 h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">
              <strong>Revocable Sharing:</strong> I understand that any records I share can be
              revoked at any time, and that all access is logged for my security.
            </span>
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={!allChecked || loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving..." : "I Agree — Enter MedPetRx"}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          By agreeing, you accept the MedPetRx Terms and Consent Agreement.
        </p>
      </div>
    </div>
  );
}
