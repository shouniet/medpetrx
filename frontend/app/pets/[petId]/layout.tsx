"use client";

import { useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PawPrint, Camera } from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "@/components/layout/Sidebar";
import api from "@/lib/api";
import type { Pet } from "@/lib/types";

const petTabs = [
  { key: "medications", label: "Medications" },
  { key: "vaccines", label: "Vaccines" },
  { key: "labs", label: "Labs" },
  { key: "allergies", label: "Allergies" },
  { key: "problems", label: "Problems" },
  { key: "vitals", label: "Vitals" },
  { key: "appointments", label: "Appointments" },
  { key: "notes", label: "Notes" },
  { key: "insurance", label: "Insurance" },
  { key: "documents", label: "Documents" },
  { key: "emergency", label: "Emergency" },
];

export default function PetLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const petId = params.petId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: pet } = useQuery<Pet>({
    queryKey: ["pet", petId],
    queryFn: () => api.get(`/pets/${petId}`).then((r) => r.data),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      queryClient.invalidateQueries({ queryKey: ["pet", petId] });
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      toast.success("Photo updated!");
    } catch {
      toast.error("Failed to upload photo");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Pet name header */}
        <div className="bg-white px-6 pt-4 pb-0 border-b-0">
          <div className="flex items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer group"
              title="Click to change photo"
            >
              {pet?.image_url ? (
                <img src={`/api${pet.image_url}`} alt={pet.name} className="w-full h-full object-cover" />
              ) : (
                <PawPrint className="text-indigo-600" size={18} />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={14} className="text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{pet?.name ?? "Loading..."}</h1>
              {pet && (
                <p className="text-xs text-gray-500">
                  {pet.species}{pet.breed ? ` · ${pet.breed}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Pet sub-nav */}
        <div className="bg-white border-b border-gray-200 px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {petTabs.map(({ key, label }) => {
              const href = `/pets/${petId}/${key}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={key}
                  href={href}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    active
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
