"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PawPrint, Plus, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import type { Pet } from "@/lib/types";
import Sidebar from "@/components/layout/Sidebar";

export default function PetsPage() {
  const { data: pets, isLoading } = useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: () => api.get("/pets/").then((r) => r.data),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Pets</h1>
          <Link
            href="/pets/new"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} /> Add Pet
          </Link>
        </div>

        {isLoading && <p className="text-gray-400">Loading...</p>}

        <div className="space-y-3">
          {pets?.map((pet) => (
            <Link
              key={pet.id}
              href={`/pets/${pet.id}/medications`}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {pet.image_url ? (
                    <img src={`/api${pet.image_url}`} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <PawPrint className="text-indigo-600" size={18} />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{pet.name}</p>
                  <p className="text-sm text-gray-500">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
