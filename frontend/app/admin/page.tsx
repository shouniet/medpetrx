"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Users,
  PawPrint,
  Pill,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Shield,
  ArrowLeft,
  Camera,
} from "lucide-react";
import api from "@/lib/api";
import type { User, Pet, Medication, CommonMedication } from "@/lib/types";

/* ─── tiny helpers ───────────────────────────────────────────── */
type Tab = "users" | "pets" | "medications" | "common-meds";

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [authorised, setAuthorised] = useState(false);

  /* ── guard: redirect non-admins ── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (!data.is_admin) {
          toast.error("Admin access required");
          router.replace("/dashboard");
        } else {
          setAuthorised(true);
        }
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  if (!authorised)
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Checking permissions…</p>
      </div>
    );

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "pets", label: "Pets", icon: PawPrint },
    { key: "medications", label: "Medications", icon: Pill },
    { key: "common-meds", label: "Common Meds", icon: BookOpen },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="text-indigo-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 border border-gray-300 hover:border-indigo-300 rounded-lg px-4 py-2 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {tab === "users" && <UsersPanel />}
      {tab === "pets" && <PetsPanel />}
      {tab === "medications" && <MedicationsPanel />}
      {tab === "common-meds" && <CommonMedsPanel />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   USERS PANEL
   ═══════════════════════════════════════════════════════════════ */
function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      String(u.id).includes(search)
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user? This will also delete all their pets and data.")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div>
      {/* toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          New User
        </button>
      </div>

      {/* table */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Admin</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Consent</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <Badge color="bg-purple-100 text-purple-700">Admin</Badge>
                    ) : (
                      <Badge color="bg-gray-100 text-gray-500">User</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.consent_accepted ? (
                      <Badge color="bg-green-100 text-green-700">Yes</Badge>
                    ) : (
                      <Badge color="bg-yellow-100 text-yellow-700">No</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* modals */}
      {creating && (
        <UserFormModal onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <UserFormModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ─── User Form Modal ────────────────────────────────────────── */
function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(user?.is_admin || false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const payload: Record<string, any> = { email, phone: phone || null, is_admin: isAdmin };
        if (password) payload.password = password;
        await api.put(`/admin/users/${user!.id}`, payload);
        toast.success("User updated");
      } else {
        await api.post("/admin/users", { email, password, phone: phone || null });
        toast.success("User created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit User" : "New User"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
          />
        </Field>
        <Field label={isEdit ? "New Password (leave blank to keep)" : "Password"}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            {...(!isEdit && { required: true, minLength: 8 })}
            className="input"
          />
        </Field>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            Administrator
          </label>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PETS PANEL
   ═══════════════════════════════════════════════════════════════ */
function PetsPanel() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Pet | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [petsRes, usersRes] = await Promise.all([
        api.get("/admin/pets"),
        api.get("/admin/users"),
      ]);
      setPets(petsRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error("Failed to load pets");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const ownerMap = Object.fromEntries(users.map((u) => [u.id, u.email]));

  const filtered = pets.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.species.toLowerCase().includes(search.toLowerCase()) ||
      (ownerMap[p.owner_id] || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this pet and all associated records?")) return;
    try {
      await api.delete(`/admin/pets/${id}`);
      toast.success("Pet deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pets…"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          New Pet
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Photo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Species</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Breed</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Microchip</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{p.id}</td>
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                      {p.image_url ? (
                        <img src={`/api${p.image_url}`} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <PawPrint className="text-indigo-600" size={14} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.species}</td>
                  <td className="px-4 py-3 text-gray-600">{p.breed || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{ownerMap[p.owner_id] || p.owner_id}</td>
                  <td className="px-4 py-3 text-gray-600">{p.microchip_num || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setEditing(p)}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No pets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <PetFormModal users={users} onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <PetFormModal
          pet={editing}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ─── Pet Form Modal ─────────────────────────────────────────── */
function PetFormModal({
  pet,
  users,
  onClose,
  onSaved,
}: {
  pet?: Pet;
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!pet;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(pet?.name || "");
  const [species, setSpecies] = useState(pet?.species || "");
  const [breed, setBreed] = useState(pet?.breed || "");
  const [sex, setSex] = useState(pet?.sex || "");
  const [ownerId, setOwnerId] = useState(pet?.owner_id?.toString() || "");
  const [microchip, setMicrochip] = useState(pet?.microchip_num || "");
  const [insurance, setInsurance] = useState(pet?.insurance || "");
  const [dob, setDob] = useState(pet?.dob ? pet.dob.split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(pet?.image_url ? `/api${pet.image_url}` : null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview && !imagePreview.startsWith("/api")) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name,
        species,
        breed: breed || null,
        sex: sex || null,
        microchip_num: microchip || null,
        insurance: insurance || null,
        dob: dob || null,
      };
      if (isEdit) {
        await api.put(`/admin/pets/${pet!.id}`, payload);
        // Upload image if a new file was selected
        if (imageFile) {
          const formData = new FormData();
          formData.append("file", imageFile);
          await api.post(`/admin/pets/${pet!.id}/image`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else if (!imagePreview && pet?.image_url) {
          // User removed the image
          await api.delete(`/admin/pets/${pet!.id}/image`);
        }
        toast.success("Pet updated");
      } else {
        const { data: newPet } = await api.post(`/admin/pets?owner_id=${ownerId}`, payload);
        if (imageFile) {
          const formData = new FormData();
          formData.append("file", imageFile);
          await api.post(`/admin/pets/${newPet.id}/image`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        toast.success("Pet created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Pet" : "New Pet"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pet Photo */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Pet Photo</label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors overflow-hidden group"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-gray-400" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={14} className="text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                {imagePreview ? "Change photo" : "Upload photo"}
              </button>
              {imagePreview && (
                <button type="button" onClick={removeImage} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                  <X size={12} /> Remove
                </button>
              )}
              <p className="text-[10px] text-gray-400">JPEG, PNG, WebP, GIF. Max 5 MB.</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageSelect} className="hidden" />
          </div>
        </div>

        {!isEdit && (
          <Field label="Owner">
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              required
              className="input"
            >
              <option value="">Select owner…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} (#{u.id})
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
          </Field>
          <Field label="Species">
            <input value={species} onChange={(e) => setSpecies(e.target.value)} required className="input" />
          </Field>
          <Field label="Breed">
            <input value={breed} onChange={(e) => setBreed(e.target.value)} className="input" />
          </Field>
          <Field label="Sex">
            <select value={sex} onChange={(e) => setSex(e.target.value)} className="input">
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Male (Neutered)">Male (Neutered)</option>
              <option value="Female (Spayed)">Female (Spayed)</option>
            </select>
          </Field>
          <Field label="Date of Birth">
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="input" />
          </Field>
          <Field label="Microchip #">
            <input value={microchip} onChange={(e) => setMicrochip(e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Insurance">
          <input value={insurance} onChange={(e) => setInsurance(e.target.value)} className="input" />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MEDICATIONS PANEL
   ═══════════════════════════════════════════════════════════════ */
function MedicationsPanel() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Medication | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [medsRes, petsRes] = await Promise.all([
        api.get("/admin/medications"),
        api.get("/admin/pets"),
      ]);
      setMeds(medsRes.data);
      setPets(petsRes.data);
    } catch {
      toast.error("Failed to load medications");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const petMap = Object.fromEntries(pets.map((p) => [p.id, p.name]));

  const filtered = meds.filter(
    (m) =>
      m.drug_name.toLowerCase().includes(search.toLowerCase()) ||
      (petMap[m.pet_id] || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this medication?")) return;
    try {
      await api.delete(`/admin/medications/${id}`);
      toast.success("Medication deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medications…"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          New Medication
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Drug Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Strength</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Pet</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Prescriber</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Active</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{m.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.drug_name}</td>
                  <td className="px-4 py-3 text-gray-600">{m.strength || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{petMap[m.pet_id] || m.pet_id}</td>
                  <td className="px-4 py-3 text-gray-600">{m.prescriber || "—"}</td>
                  <td className="px-4 py-3">
                    {m.is_active ? (
                      <Badge color="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge color="bg-gray-100 text-gray-500">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setEditing(m)}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No medications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <MedFormModal pets={pets} onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <MedFormModal
          med={editing}
          pets={pets}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ─── Medication Form Modal ──────────────────────────────────── */
function MedFormModal({
  med,
  pets,
  onClose,
  onSaved,
}: {
  med?: Medication;
  pets: Pet[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!med;
  const [drugName, setDrugName] = useState(med?.drug_name || "");
  const [strength, setStrength] = useState(med?.strength || "");
  const [directions, setDirections] = useState(med?.directions || "");
  const [indication, setIndication] = useState(med?.indication || "");
  const [prescriber, setPrescriber] = useState(med?.prescriber || "");
  const [pharmacy, setPharmacy] = useState(med?.pharmacy || "");
  const [isActive, setIsActive] = useState(med?.is_active ?? true);
  const [petId, setPetId] = useState(med?.pet_id?.toString() || "");
  const [startDate, setStartDate] = useState(med?.start_date ? med.start_date.split("T")[0] : "");
  const [stopDate, setStopDate] = useState(med?.stop_date ? med.stop_date.split("T")[0] : "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        drug_name: drugName,
        strength: strength || null,
        directions: directions || null,
        indication: indication || null,
        prescriber: prescriber || null,
        pharmacy: pharmacy || null,
        is_active: isActive,
        start_date: startDate || null,
        stop_date: stopDate || null,
      };
      if (isEdit) {
        await api.put(`/admin/medications/${med!.id}`, payload);
        toast.success("Medication updated");
      } else {
        await api.post(`/admin/medications?pet_id=${petId}`, payload);
        toast.success("Medication created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Medication" : "New Medication"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <Field label="Pet">
            <select value={petId} onChange={(e) => setPetId(e.target.value)} required className="input">
              <option value="">Select pet…</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.species} (#{p.id})
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Drug Name">
            <input value={drugName} onChange={(e) => setDrugName(e.target.value)} required className="input" />
          </Field>
          <Field label="Strength">
            <input value={strength} onChange={(e) => setStrength(e.target.value)} className="input" />
          </Field>
          <Field label="Prescriber">
            <input value={prescriber} onChange={(e) => setPrescriber(e.target.value)} className="input" />
          </Field>
          <Field label="Pharmacy">
            <input value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} className="input" />
          </Field>
          <Field label="Start Date">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </Field>
          <Field label="Stop Date">
            <input type="date" value={stopDate} onChange={(e) => setStopDate(e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Directions">
          <textarea value={directions} onChange={(e) => setDirections(e.target.value)} className="input" rows={2} />
        </Field>
        <Field label="Indication">
          <textarea value={indication} onChange={(e) => setIndication(e.target.value)} className="input" rows={2} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          Active
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMMON MEDS PANEL
   ═══════════════════════════════════════════════════════════════ */
function CommonMedsPanel() {
  const [meds, setMeds] = useState<CommonMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CommonMedication | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/common-medications/admin/all");
      setMeds(data);
    } catch {
      toast.error("Failed to load common medications");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = meds.filter(
    (m) =>
      m.drug_name.toLowerCase().includes(search.toLowerCase()) ||
      m.drug_class.toLowerCase().includes(search.toLowerCase()) ||
      m.common_indications.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this common medication reference?")) return;
    try {
      await api.delete(`/common-medications/${id}`);
      toast.success("Common medication deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search common medications…"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          New Common Medication
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Drug Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Class</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Species</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Side Effects</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{m.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.drug_name}</td>
                  <td className="px-4 py-3 text-gray-600">{m.drug_class}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {m.species.map((s) => (
                        <Badge
                          key={s}
                          color={
                            s === "dog"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-pink-100 text-pink-700"
                          }
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.route || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                    {m.common_side_effects.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setEditing(m)}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No common medications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CommonMedFormModal onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editing && (
        <CommonMedFormModal
          med={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ─── Common Medication Form Modal ───────────────────────────── */
function CommonMedFormModal({
  med,
  onClose,
  onSaved,
}: {
  med?: CommonMedication;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!med;
  const [drugName, setDrugName] = useState(med?.drug_name || "");
  const [drugClass, setDrugClass] = useState(med?.drug_class || "");
  const [species, setSpecies] = useState<string[]>(med?.species || []);
  const [indications, setIndications] = useState(med?.common_indications || "");
  const [typicalDose, setTypicalDose] = useState(med?.typical_dose || "");
  const [route, setRoute] = useState(med?.route || "");
  const [sideEffects, setSideEffects] = useState<string[]>(
    med?.common_side_effects?.length ? med.common_side_effects : [""]
  );
  const [warnings, setWarnings] = useState(med?.warnings || "");
  const [saving, setSaving] = useState(false);

  const toggleSpecies = (s: string) => {
    setSpecies((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const addSideEffect = () => setSideEffects((prev) => [...prev, ""]);
  const removeSideEffect = (idx: number) =>
    setSideEffects((prev) => prev.filter((_, i) => i !== idx));
  const updateSideEffect = (idx: number, val: string) =>
    setSideEffects((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (species.length === 0) {
      toast.error("Select at least one species");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        drug_name: drugName,
        drug_class: drugClass,
        species,
        common_indications: indications,
        typical_dose: typicalDose || null,
        route: route || null,
        common_side_effects: sideEffects.filter((s) => s.trim()),
        warnings: warnings || null,
      };
      if (isEdit) {
        await api.put(`/common-medications/${med!.id}`, payload);
        toast.success("Common medication updated");
      } else {
        await api.post("/common-medications", payload);
        toast.success("Common medication created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Common Medication" : "New Common Medication"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Drug Name">
            <input
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label="Drug Class">
            <input
              value={drugClass}
              onChange={(e) => setDrugClass(e.target.value)}
              required
              className="input"
            />
          </Field>
        </div>

        {/* Species checkboxes */}
        <Field label="Species">
          <div className="flex gap-4 mt-1">
            {["dog", "cat"].map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={species.includes(s)}
                  onChange={() => toggleSpecies(s)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Common Indications">
          <textarea
            value={indications}
            onChange={(e) => setIndications(e.target.value)}
            required
            className="input"
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Typical Dose">
            <input
              value={typicalDose}
              onChange={(e) => setTypicalDose(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Route">
            <input
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        {/* Dynamic side effects list */}
        <Field label="Side Effects">
          <div className="space-y-2">
            {sideEffects.map((se, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={se}
                  onChange={(e) => updateSideEffect(idx, e.target.value)}
                  placeholder={`Side effect #${idx + 1}`}
                  className="input flex-1"
                />
                {sideEffects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSideEffect(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addSideEffect}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus size={14} />
              Add side effect
            </button>
          </div>
        </Field>

        <Field label="Warnings">
          <textarea
            value={warnings}
            onChange={(e) => setWarnings(e.target.value)}
            className="input"
            rows={3}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
